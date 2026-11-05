// The room's video, made quick to connect: the camera and the network addresses are made ready in the waiting room
// (`warm`) without starting the link; once the room opens the signal box is read every quarter second until the two
// browsers are connected; and a failed link starts over by itself.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const service = vi.hoisted(() => ({
  iceServers: vi.fn(),
  signal: vi.fn(),
  signals: vi.fn(),
}));
vi.mock("../../../../../services/real/enotary-sessions.service", () => ({ realEnotarySessionsService: service }));

import { useRoomConnection, SIGNAL_FAST_MS, SIGNAL_POLL_MS } from "../useRoomConnection";

const stream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
const getUserMedia = vi.fn();

class FakePeer {
  localDescription: { type: string; sdp?: string } | null = null;
  remoteDescription: unknown = null;
  connectionState = "new";
  onicecandidate = null;
  ontrack = null;
  onconnectionstatechange: (() => void) | null = null;
  addTrack() { return null; }
  createOffer() { return Promise.resolve({ type: "offer", sdp: "o" }); }
  createAnswer() { return Promise.resolve({ type: "answer", sdp: "a" }); }
  setLocalDescription(d: { type: string; sdp?: string }) { this.localDescription = d; return Promise.resolve(); }
  setRemoteDescription(d: unknown) { this.remoteDescription = d; return Promise.resolve(); }
  addIceCandidate() { return Promise.resolve(); }
  close() { /* nothing to free */ }
}

beforeEach(() => {
  vi.useFakeTimers();
  service.iceServers.mockReset().mockResolvedValue([{ urls: "stun:example.test" }]);
  service.signal.mockReset().mockResolvedValue(undefined);
  service.signals.mockReset().mockResolvedValue([]);
  getUserMedia.mockReset().mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.stubGlobal("RTCPeerConnection", FakePeer);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useRoomConnection", () => {
  it("makes the camera and the addresses ready in the waiting room, and starts the link only when the room opens", async () => {
    const { result, rerender } = renderHook(({ active, warm }) => useRoomConnection("ses_1", "client", active, warm), {
      initialProps: { active: false, warm: true },
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(service.iceServers).toHaveBeenCalledTimes(1);
    expect(result.current.media).toBe("ready");
    expect(service.signals).not.toHaveBeenCalled();

    rerender({ active: true, warm: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    // The same camera and the addresses already fetched: nothing is asked for twice.
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(service.iceServers).toHaveBeenCalledTimes(1);
    expect(service.signal).toHaveBeenCalledWith("ses_1", "join", expect.any(String), "");
  });

  it("asks for nothing while the room is neither open nor about to open", async () => {
    renderHook(() => useRoomConnection("ses_1", "client", false, false));
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(service.iceServers).not.toHaveBeenCalled();
  });

  it("reads the signal box every quarter second while the browsers are finding each other", async () => {
    renderHook(() => useRoomConnection("ses_1", "client", true, false));
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    const before = service.signals.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(SIGNAL_POLL_MS); });
    const reads = service.signals.mock.calls.length - before;
    // At the old pace there would be one read in this time; now there are several.
    expect(reads).toBeGreaterThanOrEqual(Math.floor(SIGNAL_POLL_MS / SIGNAL_FAST_MS) - 1);
  });

  it("starts a failed link over by itself", async () => {
    const peers: FakePeer[] = [];
    vi.stubGlobal("RTCPeerConnection", class extends FakePeer { constructor() { super(); peers.push(this); } });
    // The notary's page comes, so the client answers an offer: a peer exists.
    let served = false;
    service.signals.mockImplementation((_id: string, after: number) => {
      if (served || after > 0) return Promise.resolve([]);
      served = true;
      return Promise.resolve([{ seq: 1, from: "notary", kind: "offer", connectionId: "n1", payload: JSON.stringify({ type: "offer", sdp: "o" }), at: "" }]);
    });
    const { result } = renderHook(() => useRoomConnection("ses_1", "client", true, false));
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    // start() skipped the offer that was already there; the next one is the partner's new page.
    served = false;
    service.signals.mockImplementation((_id: string, after: number) => Promise.resolve(after >= 2 ? [] : [
      { seq: 2, from: "notary", kind: "offer", connectionId: "n1", payload: JSON.stringify({ type: "offer", sdp: "o" }), at: "" },
    ]));
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    const peer = peers.at(-1)!;
    expect(peer).toBeDefined();
    service.signal.mockClear();
    peer.connectionState = "failed";
    await act(async () => { peer.onconnectionstatechange?.(); await vi.advanceTimersByTimeAsync(10); });
    expect(result.current.link).toBe("failed");
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    // The client calls out again ("join"), which makes the notary offer anew.
    expect(service.signal).toHaveBeenCalledWith("ses_1", "join", expect.any(String), "");
  });
});
