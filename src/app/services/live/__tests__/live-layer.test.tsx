// The live layer: topics (one signal per kind of data, relayed to the other
// tabs), the heartbeat (one timer for the whole app) and the live query (one
// held copy per key, fresh for its ttl, stale-while-revalidate, forgotten on
// sign-out and workspace switch).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import { announce, onTopic, changes, resetTopics } from "../topics";
import { onHeartbeat, pulse, resetHeartbeat, HEARTBEAT_MS, HEARTBEAT_GAP_MS } from "../heartbeat";
import {
  useLiveQuery, readLive, peekLive, primeLive, invalidateLive, clearLiveCache, resetLiveCache, LIST_TTL_MS,
} from "../live-query";
import { runSignOutCleanup, runWorkspaceSwitchCleanup } from "../../session-lifecycle";

/** A BroadcastChannel for one process: every open channel of a name hears every post. */
class FakeChannel {
  static open = new Map<string, Set<FakeChannel>>();
  onmessage: ((e: { data: unknown }) => void) | null = null;
  constructor(readonly name: string) {
    let set = FakeChannel.open.get(name);
    if (set === undefined) { set = new Set(); FakeChannel.open.set(name, set); }
    set.add(this);
  }
  postMessage(data: unknown) {
    for (const other of FakeChannel.open.get(this.name) ?? []) if (other !== this) other.onmessage?.({ data });
  }
  close() { FakeChannel.open.get(this.name)?.delete(this); }
}

beforeEach(() => {
  FakeChannel.open.clear();
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  resetTopics();
  resetHeartbeat();
  resetLiveCache();
});
afterEach(() => { vi.useRealTimers(); });

describe("topics", () => {
  it("tells this tab's listeners of the topic, and only them", () => {
    const counts = vi.fn(); const plan = vi.fn(); const all = vi.fn();
    onTopic("counts", counts); onTopic("plan", plan); onTopic("*", all);
    announce("counts");
    expect(counts).toHaveBeenCalledTimes(1);
    expect(plan).not.toHaveBeenCalled();
    expect(all).toHaveBeenCalledWith("counts");
  });

  it("reaches the other tabs through one channel; remoteOnly skips this tab", () => {
    const here = vi.fn();
    onTopic("workspace", here);
    // "Another tab": a second channel of the same name, listening.
    const there = vi.fn();
    const other = new FakeChannel("lagda-live");
    other.onmessage = (e) => { there(e.data); };
    announce("workspace", { remoteOnly: true });
    expect(here).not.toHaveBeenCalled();
    expect(there).toHaveBeenCalledWith({ topic: "workspace" });
    // And what the other tab posts is heard here.
    other.postMessage({ topic: "workspace" });
    expect(here).toHaveBeenCalledTimes(1);
    // Rubbish on the channel is ignored.
    other.postMessage("changed");
    other.postMessage({ nope: 1 });
    expect(here).toHaveBeenCalledTimes(1);
  });

  it("changes() announces after the call, succeeded or failed", async () => {
    const heard = vi.fn();
    onTopic("documents", heard);
    await changes("documents", Promise.resolve(1));
    await expect(changes("documents", Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("stops after unsubscribing", () => {
    const heard = vi.fn();
    const off = onTopic("contacts", heard);
    off();
    announce("contacts");
    expect(heard).not.toHaveBeenCalled();
  });
});

describe("heartbeat", () => {
  it("beats every 15 seconds while visible, on focus, and when the tab is shown — once per return", () => {
    vi.useFakeTimers();
    const beat = vi.fn();
    onHeartbeat(beat);
    expect(beat).not.toHaveBeenCalled(); // never at once: the subscriber just read
    vi.advanceTimersByTime(HEARTBEAT_MS);
    expect(beat).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(HEARTBEAT_GAP_MS + 1);
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange")); // arrives with focus: same beat
    expect(beat).toHaveBeenCalledTimes(2);
  });

  it("is one timer however many subscribe, and stops with the last", () => {
    vi.useFakeTimers();
    const a = vi.fn(); const b = vi.fn();
    const offA = onHeartbeat(a); const offB = onHeartbeat(b);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(HEARTBEAT_MS);
    expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(1);
    offA(); offB();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(HEARTBEAT_MS * 3);
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("does not beat while the tab is hidden", () => {
    vi.useFakeTimers();
    const beat = vi.fn();
    onHeartbeat(beat);
    const hidden = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    vi.advanceTimersByTime(HEARTBEAT_MS * 2);
    expect(beat).not.toHaveBeenCalled();
    hidden.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(beat).toHaveBeenCalledTimes(1);
    hidden.mockRestore();
  });

  it("tells a slower subscriber only on beats that far apart", () => {
    vi.useFakeTimers();
    const slow = vi.fn();
    onHeartbeat(slow, { every: 60_000 });
    vi.advanceTimersByTime(HEARTBEAT_MS * 3);
    expect(slow).not.toHaveBeenCalled();
    vi.advanceTimersByTime(HEARTBEAT_MS);
    expect(slow).toHaveBeenCalledTimes(1);
    pulse();
    expect(slow).toHaveBeenCalledTimes(1);
  });
});

describe("readLive", () => {
  it("reads once per key while fresh, and again once the ttl has passed", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    const [a, b] = await Promise.all([readLive("k", fetcher), readLive("k", fetcher)]);
    expect(a).toEqual({ n: 1 }); expect(b).toBe(a);
    expect(fetcher).toHaveBeenCalledTimes(1); // one in flight serves both
    await readLive("k", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1); // fresh
    vi.advanceTimersByTime(LIST_TTL_MS + 1);
    await readLive("k", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2); // stale
    await readLive("k", fetcher, { force: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("keeps the held value when a re-read fails, and reports the error", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("first").mockRejectedValueOnce(new Error("offline"));
    await readLive("k", fetcher);
    await expect(readLive("k", fetcher, { force: true })).resolves.toBe("first");
    expect(peekLive("k")).toMatchObject({ data: "first", error: new Error("offline"), reading: false });
    // Nothing held: the failure is the caller's.
    await expect(readLive("other", () => Promise.reject(new Error("nope")))).rejects.toThrow("nope");
  });

  it("drops a read that lands after the cache was cleared", async () => {
    let resolve: (v: string) => void = () => undefined;
    const slow = readLive("k", () => new Promise<string>(r => { resolve = r; }));
    clearLiveCache();
    resolve("late");
    await slow;
    expect(peekLive("k").data).toBeUndefined();
  });

  it("forgets everything on sign-out and on a workspace switch", async () => {
    await readLive("a", () => Promise.resolve(1));
    runSignOutCleanup();
    expect(peekLive("a").data).toBeUndefined();
    await readLive("b", () => Promise.resolve(2));
    runWorkspaceSwitchCleanup("ws_2");
    expect(peekLive("b").data).toBeUndefined();
  });

  it("invalidateLive marks keys stale without dropping what is shown", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue("v");
    await readLive("documents:ws_1", fetcher);
    invalidateLive("documents:");
    expect(peekLive("documents:ws_1").data).toBe("v");
    await readLive("documents:ws_1", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("useLiveQuery", () => {
  it("shows the held value at once, re-reads on the heartbeat and on its topics", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let n = 0;
    const fetcher = vi.fn(() => Promise.resolve({ n: ++n }));
    const { result, unmount } = renderHook(() => useLiveQuery("list:ws_1", fetcher, { topics: ["documents"] }));
    expect(result.current.loading).toBe(true);
    await waitFor(() => { expect(result.current.data).toEqual({ n: 1 }); });
    expect(result.current.loading).toBe(false);

    // A topic re-reads at once; the old value stays while it does.
    await act(async () => { announce("documents"); await Promise.resolve(); });
    await waitFor(() => { expect(result.current.data).toEqual({ n: 2 }); });

    // The heartbeat re-reads once the ttl has passed.
    await act(async () => { vi.advanceTimersByTime(HEARTBEAT_MS); await Promise.resolve(); });
    await waitFor(() => { expect(result.current.data).toEqual({ n: 3 }); });
    unmount();

    // Mounted again: the held value is there before any read lands.
    primeLive("list:ws_1", { n: 99 });
    const view = renderHook(() => useLiveQuery("list:ws_1", fetcher));
    expect(view.result.current.data).toEqual({ n: 99 });
    expect(view.result.current.loading).toBe(false);
  });

  it("reads nothing for a null key, and switches with the key", async () => {
    const fetcher = vi.fn((k: string) => Promise.resolve(k));
    const { result, rerender } = renderHook(
      ({ key }: { key: string | null }) => useLiveQuery(key, () => fetcher(key ?? ""), { heartbeat: false }),
      { initialProps: { key: null as string | null } },
    );
    expect(result.current.data).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
    rerender({ key: "one" });
    await waitFor(() => { expect(result.current.data).toBe("one"); });
    rerender({ key: "two" });
    await waitFor(() => { expect(result.current.data).toBe("two"); });
    rerender({ key: "one" });
    expect(result.current.data).toBe("one"); // held, no wait
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("refresh() reads again whatever the age; a failed re-read keeps the rows", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(["a"]).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useLiveQuery("k", fetcher, { heartbeat: false }));
    await waitFor(() => { expect(result.current.data).toEqual(["a"]); });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.data).toEqual(["a"]);
    expect(result.current.error).toEqual(new Error("offline"));
    expect(result.current.refreshing).toBe(false);
  });
});
