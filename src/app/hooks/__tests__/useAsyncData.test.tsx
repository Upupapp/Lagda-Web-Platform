// useAsyncData — the failure path especially.
//
// The defect this hook exists to prevent is silent: a rejected load leaves the
// component's loading branch permanently on screen, nothing throws where an
// error boundary can catch it, and the promise rejection is unhandled. It is
// invisible in normal use because the mock services do not reject. So the only
// way to know the failure branch works is to force it.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useAsyncData } from "../useAsyncData";

beforeEach(() => {
  // The hook logs failures through the redacting logger. Silence it here so a
  // deliberate rejection does not read as a broken test run.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("useAsyncData", () => {
  it("starts loading and reaches ready with the data", async () => {
    const { result } = renderHook(() => useAsyncData(() => Promise.resolve(42), [], "answer"));

    expect(result.current.status).toBe("loading");
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBe(42);
  });

  it("reaches full-error instead of hanging when the load rejects", async () => {
    const { result } = renderHook(() =>
      useAsyncData(() => Promise.reject(new Error("backend down")), [], "answer"),
    );

    await waitFor(() => expect(result.current.status).toBe("full-error"));
    // The whole point: it did NOT stay on "loading".
    expect(result.current.status).not.toBe("loading");
    expect(result.current.data).toBeNull();
  });

  it("recovers when retry succeeds after a failure", async () => {
    let shouldFail = true;
    const load = vi.fn(() =>
      shouldFail ? Promise.reject(new Error("nope")) : Promise.resolve("ok"),
    );

    const { result } = renderHook(() => useAsyncData(load, [], "thing"));
    await waitFor(() => expect(result.current.status).toBe("full-error"));

    shouldFail = false;
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("re-runs when a dependency changes", async () => {
    const load = vi.fn((id: number) => Promise.resolve(`item-${id}`));
    const { result, rerender } = renderHook(
      ({ id }) => useAsyncData(() => load(id), [id], "item"),
      { initialProps: { id: 1 } },
    );

    await waitFor(() => expect(result.current.data).toBe("item-1"));

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe("item-2"));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not restart when only the loader's identity changes", async () => {
    // Callers pass an inline arrow, so the function is new every render. If the
    // effect depended on it, every render would refetch — an infinite loop.
    const load = vi.fn(() => Promise.resolve("stable"));
    const { result, rerender } = renderHook(() => useAsyncData(() => load(), [], "thing"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender();
    rerender();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("ignores a stale response from a superseded dependency", async () => {
    // The race that makes a filtered list briefly show the previous filter's
    // results: the first request resolves AFTER the second.
    const resolvers: Array<(v: string) => void> = [];
    const load = (id: number) =>
      new Promise<string>(resolve => { resolvers[id] = resolve; });

    const { result, rerender } = renderHook(
      ({ id }) => useAsyncData(() => load(id), [id], "item"),
      { initialProps: { id: 0 } },
    );

    rerender({ id: 1 });

    // The superseded request now comes back last.
    await act(async () => {
      resolvers[1]?.("second");
      resolvers[0]?.("FIRST — STALE");
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBe("second");
  });
});
