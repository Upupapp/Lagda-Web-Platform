// The hint under the title field: "this title is already used here, and it
// will be saved as …", said a moment after the typing pauses.
//
// It must never get in the way: one question per pause, an answer that comes
// back for a title that has since changed is dropped, an older server simply
// means no hint, and the hint goes the moment the title is free.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const titleSuggestion = vi.fn();
vi.mock("../../services/real/document.service", () => ({
  realDocumentService: { titleSuggestion: (...args: unknown[]) => titleSuggestion(...args) as unknown },
}));

import { useTitleSuggestion, TITLE_SUGGESTION_DELAY_MS } from "../useTitleSuggestion";

type Props = { title: string; excludeDocumentId?: string; enabled?: boolean };
const show = (initial: Props) => renderHook(
  (props: Props) => useTitleSuggestion({ workspaceId: "ws_1", ...props }),
  { initialProps: initial },
);

/** Lets the pause pass and the answer land. */
async function settle(ms = TITLE_SUGGESTION_DELAY_MS) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

const taken = (title: string, as: string) => ({ requested: title, title: as, changed: true });
const free = (title: string) => ({ requested: title, title, changed: false });

beforeEach(() => {
  vi.useFakeTimers();
  titleSuggestion.mockImplementation((_ws: string, title: string) => Promise.resolve(free(title)));
});
afterEach(() => { vi.useRealTimers(); });

describe("useTitleSuggestion", () => {
  it("asks once the typing pauses, not on every keystroke", async () => {
    const { rerender } = show({ title: "L" });
    rerender({ title: "Le" });
    rerender({ title: "Lea" });
    await settle(TITLE_SUGGESTION_DELAY_MS - 1);
    expect(titleSuggestion).not.toHaveBeenCalled();
    await settle(1);
    expect(titleSuggestion).toHaveBeenCalledTimes(1);
    expect(titleSuggestion).toHaveBeenCalledWith("ws_1", "Lea", undefined);
  });

  it("says what a taken title will be saved as", async () => {
    titleSuggestion.mockResolvedValue(taken("Lease", "Lease (2)"));
    const { result } = show({ title: "  Lease " });
    expect(result.current).toBeNull();
    await settle();
    expect(result.current).toEqual({ typed: "Lease", title: "Lease (2)" });
  });

  it("leaves the draft's own document out of the comparison", async () => {
    show({ title: "Lease", excludeDocumentId: "doc_1" });
    await settle();
    expect(titleSuggestion).toHaveBeenCalledWith("ws_1", "Lease", "doc_1");
  });

  it("clears the hint when the title is free", async () => {
    titleSuggestion.mockImplementation((_ws: string, title: string) =>
      Promise.resolve(title === "Lease" ? taken("Lease", "Lease (2)") : free(title)));
    const { result, rerender } = show({ title: "Lease" });
    await settle();
    expect(result.current).not.toBeNull();
    rerender({ title: "Lease for Unit 4" });
    // Gone at once: the hint was about a title the field no longer holds.
    expect(result.current).toBeNull();
    await settle();
    expect(result.current).toBeNull();
  });

  it("ignores an answer that arrives after the title changed again", async () => {
    let answerFirst!: (value: unknown) => void;
    titleSuggestion.mockImplementation((_ws: string, title: string) => (title === "Lease"
      ? new Promise(resolve => { answerFirst = resolve; })
      : Promise.resolve(free(title))));
    const { result, rerender } = show({ title: "Lease" });
    await settle();
    rerender({ title: "Lease B" });
    await settle();
    expect(titleSuggestion).toHaveBeenCalledTimes(2);
    // The slow answer for "Lease" lands last, and is about a title that is gone.
    await act(async () => { answerFirst(taken("Lease", "Lease (2)")); await Promise.resolve(); });
    expect(result.current).toBeNull();
    // Typing the old title back asks afresh rather than reusing that answer.
    rerender({ title: "Lease" });
    expect(result.current).toBeNull();
  });

  it("shows nothing on an older server without the route", async () => {
    // The service answers a 404 with null.
    titleSuggestion.mockResolvedValue(null);
    const { result } = show({ title: "Lease" });
    await settle();
    expect(result.current).toBeNull();
  });

  it("shows nothing when the question fails", async () => {
    titleSuggestion.mockRejectedValue(new Error("offline"));
    const { result } = show({ title: "Lease" });
    await settle();
    expect(result.current).toBeNull();
  });

  it("asks nothing for an empty title, or while switched off", async () => {
    const { rerender } = show({ title: "   " });
    await settle();
    rerender({ title: "Lease", enabled: false });
    await settle();
    expect(titleSuggestion).not.toHaveBeenCalled();
  });
});
