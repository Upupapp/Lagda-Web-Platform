// The processing service.
//
// The behaviours under test are the ones that go wrong in production rather
// than in review: the modal that never lifts because the work threw, the one
// that flickers for a single frame, and the one that four concurrent uploads
// fight over.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProcessingProvider, useProcessing, buildSteps } from "../processing.service";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

/** Drives the service from inside the provider. */
function Harness({ onReady }: { onReady: (api: ReturnType<typeof useProcessing>) => void }) {
  const api = useProcessing();
  onReady(api);
  return <p>the page behind the modal</p>;
}

function mount() {
  let api!: ReturnType<typeof useProcessing>;
  render(
    <ProcessingProvider>
      <Harness onReady={next => { api = next; }} />
    </ProcessingProvider>,
  );
  return () => api;
}

const APPEAR = 180;
const MIN_DISPLAY = 450;

describe("run", () => {
  it("shows the modal for work that takes longer than the appear delay", async () => {
    const api = mount();
    let release!: () => void;
    const work = new Promise<void>(resolve => { release = resolve; });

    act(() => { void api().run({ message: "Uploading" }, () => work); });
    expect(screen.queryByRole("alertdialog")).toBeNull();

    act(() => { vi.advanceTimersByTime(APPEAR); });

    expect(screen.getByRole("alertdialog", { name: "Uploading" })).toBeTruthy();
    act(() => { release(); });
  });

  it("never shows anything for work that finishes quickly", async () => {
    const api = mount();

    await act(async () => { await api().run({ message: "Saving" }, async () => "done"); });
    await act(async () => { vi.advanceTimersByTime(APPEAR * 3); });

    // A dialog flashed for one frame is noise, not feedback.
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("returns the work's value", async () => {
    const api = mount();
    let result: string | undefined;

    await act(async () => { result = await api().run({ message: "x" }, async () => "the value"); });

    expect(result).toBe("the value");
  });

  it("takes the modal down when the work THROWS", async () => {
    // This is the bug the whole API exists to prevent: a modal that is not
    // dismissible, left up by an error path, is an application the user has
    // to reload.
    const api = mount();
    let release!: (e: Error) => void;
    const work = new Promise<never>((_, reject) => { release = reject; });

    let caught: unknown;
    act(() => { void api().run({ message: "Sending" }, () => work).catch((e: unknown) => { caught = e; }); });
    act(() => { vi.advanceTimersByTime(APPEAR); });
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await act(async () => { release(new Error("network died")); });
    await act(async () => { vi.advanceTimersByTime(MIN_DISPLAY + 1000); });

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(caught).toBeInstanceOf(Error);
  });

  it("re-throws so the caller still handles its own errors", async () => {
    const api = mount();
    await expect(
      act(async () => api().run({ message: "x" }, async () => { throw new Error("boom"); })),
    ).rejects.toThrow("boom");
  });

  it("stays up long enough to be read once it has appeared", async () => {
    const api = mount();
    let release!: () => void;
    const work = new Promise<void>(resolve => { release = resolve; });

    act(() => { void api().run({ message: "Working" }, () => work); });
    act(() => { vi.advanceTimersByTime(APPEAR); });
    await act(async () => { release(); });

    // Finished immediately after appearing — but it must not vanish in the
    // same breath, or the user cannot tell what happened.
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await act(async () => { vi.advanceTimersByTime(MIN_DISPLAY + 1000); });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("concurrent work", () => {
  it("lifts when the LAST operation finishes, not the first", async () => {
    // Dropping four files fires four runs. A boolean would clear on the first
    // one to land and leave three still uploading behind a dead page.
    const api = mount();
    let releaseA!: () => void;
    let releaseB!: () => void;
    const a = new Promise<void>(r => { releaseA = r; });
    const b = new Promise<void>(r => { releaseB = r; });

    act(() => {
      void api().run({ message: "Uploading one" }, () => a);
      void api().run({ message: "Uploading two" }, () => b);
    });
    act(() => { vi.advanceTimersByTime(APPEAR); });
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await act(async () => { releaseA(); });
    await act(async () => { vi.advanceTimersByTime(MIN_DISPLAY + 500); });
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await act(async () => { releaseB(); });
    await act(async () => { vi.advanceTimersByTime(MIN_DISPLAY + 1000); });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("progress narration", () => {
  it("lets the work update the message while it runs", async () => {
    const api = mount();
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });

    act(() => {
      void api().run({ message: "Creating" }, async ({ update }) => {
        await gate;
        update({ message: "Delivering" });
      });
    });
    act(() => { vi.advanceTimersByTime(APPEAR); });
    expect(screen.getByText("Creating")).toBeTruthy();

    await act(async () => { release(); });

    expect(screen.getByText("Delivering")).toBeTruthy();
  });
});

describe("outside the provider", () => {
  it("still performs the work instead of throwing", async () => {
    // A component rendered in a unit test has no provider above it. It must
    // not break just because it reports progress.
    let api!: ReturnType<typeof useProcessing>;
    render(<Harness onReady={next => { api = next; }} />);

    let result: string | undefined;
    await act(async () => { result = await api.run({ message: "x" }, async () => "worked"); });

    expect(result).toBe("worked");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("buildSteps", () => {
  const stages = [
    { id: "one", label: "First" },
    { id: "two", label: "Second" },
    { id: "three", label: "Third" },
  ];

  it("marks everything before the active stage as done", () => {
    expect(buildSteps(stages, "two").map(s => s.state)).toEqual(["done", "active", "pending"]);
  });

  it("marks nothing done at the first stage", () => {
    expect(buildSteps(stages, "one").map(s => s.state)).toEqual(["active", "pending", "pending"]);
  });

  it("leaves every stage pending for an id it does not know", () => {
    expect(buildSteps(stages, "nope").map(s => s.state)).toEqual(["pending", "pending", "pending"]);
  });

  it("keeps the labels", () => {
    expect(buildSteps(stages, "one").map(s => s.label)).toEqual(["First", "Second", "Third"]);
  });
});
