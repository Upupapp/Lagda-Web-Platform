import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMinimumSplash } from "../useMinimumSplash";

describe("useMinimumSplash", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("holds for the minimum even when ready at once, then exits and is removed", () => {
    const { result } = renderHook(() => useMinimumSplash(true, 1500, 240));
    act(() => { vi.advanceTimersByTime(1499); });
    expect(result.current).toBe("showing");
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe("exiting");
    act(() => { vi.advanceTimersByTime(240); });
    expect(result.current).toBe("gone");
  });

  it("waits past the minimum while not ready", () => {
    const { result, rerender } = renderHook(({ ready }) => useMinimumSplash(ready, 1500, 240),
      { initialProps: { ready: false } });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("showing");
    rerender({ ready: true });
    act(() => { vi.advanceTimersByTime(240); });
    expect(result.current).toBe("gone");
  });
});
