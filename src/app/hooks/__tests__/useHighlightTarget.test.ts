// Coverage for the deep-link highlight hook used by Participants/Routing to
// reveal-and-highlight the exact row a Help-panel item points at.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHighlightTarget, htmlHighlightId } from "../useHighlightTarget";

describe("htmlHighlightId", () => {
  it("namespaces the raw id", () => {
    expect(htmlHighlightId("rcp_1")).toBe("prep-highlight-rcp_1");
  });
});

describe("useHighlightTarget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, "", "/");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("highlights nothing when the query param is absent", () => {
    const { result } = renderHook(() => useHighlightTarget("highlightParticipantId"));
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.isHighlighted("rcp_1")).toBe(false);
  });

  it("highlights the id from the query param after the scroll delay, then clears it", () => {
    window.history.replaceState({}, "", "/?highlightParticipantId=rcp_1");
    const { result } = renderHook(() => useHighlightTarget("highlightParticipantId"));

    // Before the deferred timer, nothing is highlighted yet.
    expect(result.current.isHighlighted("rcp_1")).toBe(false);

    act(() => { vi.advanceTimersByTime(60); });
    expect(result.current.isHighlighted("rcp_1")).toBe(true);
    expect(result.current.isHighlighted("other")).toBe(false);

    // After the highlight duration it clears.
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.isHighlighted("rcp_1")).toBe(false);
  });

  it("scrolls the matching element into view when present", () => {
    window.history.replaceState({}, "", "/?highlightGroupId=grp_1");
    const el = document.createElement("div");
    el.id = htmlHighlightId("grp_1");
    const scrollSpy = vi.fn();
    // jsdom has no scrollIntoView by default.
    (el as unknown as { scrollIntoView: () => void }).scrollIntoView = scrollSpy;
    document.body.appendChild(el);

    renderHook(() => useHighlightTarget("highlightGroupId"));
    act(() => { vi.advanceTimersByTime(60); });

    expect(scrollSpy).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
