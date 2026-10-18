// The room's peer link: two pages find each other through a signal box and
// agree on a connection, however they come and go.

import { describe, it, expect } from "vitest";
import { RoomLink, type LinkState, type PeerLike } from "../room-link";
import type { RoomSignal, SessionRole, SignalKind } from "../../../../../services/real/enotary-sessions.service";

class FakePeer implements PeerLike {
  static all: FakePeer[] = [];
  localDescription: { type: string; sdp?: string } | null = null;
  remoteDescription: unknown = null;
  connectionState = "new";
  onicecandidate: PeerLike["onicecandidate"] = null;
  ontrack: PeerLike["ontrack"] = null;
  onconnectionstatechange: (() => void) | null = null;
  tracks: unknown[] = [];
  candidates: unknown[] = [];
  closed = false;
  constructor() { FakePeer.all.push(this); }
  addTrack(track: unknown) { this.tracks.push(track); return {}; }
  createOffer() { return Promise.resolve({ type: "offer", sdp: "offer-sdp" }); }
  createAnswer() { return Promise.resolve({ type: "answer", sdp: "answer-sdp" }); }
  setLocalDescription(description: { type: string; sdp?: string }) { this.localDescription = description; return Promise.resolve(); }
  setRemoteDescription(description: unknown) { this.remoteDescription = description; return Promise.resolve(); }
  addIceCandidate(candidate: unknown) { this.candidates.push(candidate); return Promise.resolve(); }
  close() { this.closed = true; }
}

class Box {
  signals: RoomSignal[] = [];
  seq = 0;
  sender(role: SessionRole, connectionId: string) {
    return (kind: SignalKind, payload: string) => {
      this.seq += 1;
      this.signals.push({ seq: this.seq, from: role, kind, connectionId, payload });
      return Promise.resolve();
    };
  }
  fetch = (after: number) => Promise.resolve(this.signals.filter(signal => signal.seq > after));
}

function page(box: Box, role: SessionRole, connectionId: string) {
  const states: LinkState[] = [];
  const remote: unknown[] = [];
  const link = new RoomLink({
    role, connectionId, iceServers: [{ urls: "stun:x" }], localStream: { getTracks: () => ["audio", "video"] },
    createPeer: () => new FakePeer(), send: box.sender(role, connectionId), fetchSignals: box.fetch,
    onState: state => states.push(state), onRemoteStream: stream => remote.push(stream),
  });
  return { link, states, remote };
}

const settle = async (...links: RoomLink[]) => { for (let i = 0; i < 4; i += 1) for (const link of links) await link.poll(); };

describe("the peer link", () => {
  it("has the notary offer and the client answer, whoever came first", async () => {
    for (const clientFirst of [true, false]) {
      FakePeer.all = [];
      const box = new Box();
      const notary = page(box, "notary", "n-conn-0001");
      const client = page(box, "client", "c-conn-0001");
      if (clientFirst) { await client.link.start(); await notary.link.start(); } else { await notary.link.start(); await client.link.start(); }
      await settle(notary.link, client.link);
      const kinds = box.signals.map(signal => `${signal.from}:${signal.kind}`);
      expect(kinds).toContain("notary:offer");
      expect(kinds).toContain("client:answer");
      expect(notary.states).toContain("connecting");
      expect(client.states).toContain("connecting");
      const [notaryPeer, clientPeer] = [FakePeer.all.find(peer => peer.localDescription?.type === "offer"), FakePeer.all.find(peer => peer.localDescription?.type === "answer")];
      expect(notaryPeer?.remoteDescription).toEqual({ type: "answer", sdp: "answer-sdp" });
      expect(clientPeer?.remoteDescription).toEqual({ type: "offer", sdp: "offer-sdp" });
      expect(notaryPeer?.tracks).toEqual(["audio", "video"]);
    }
  });

  it("ignores what was said before the page came", async () => {
    const box = new Box();
    await box.sender("client", "old-client-1")("join", "");
    await box.sender("notary", "old-notary-1")("offer", "{\"type\":\"offer\"}");
    FakePeer.all = [];
    const client = page(box, "client", "c-conn-0002");
    await client.link.start();
    await client.link.poll();
    expect(FakePeer.all).toHaveLength(0);
  });

  it("starts over when the partner reloads", async () => {
    FakePeer.all = [];
    const box = new Box();
    const notary = page(box, "notary", "n-conn-0001");
    const client = page(box, "client", "c-conn-0001");
    await notary.link.start(); await client.link.start();
    await settle(notary.link, client.link);
    const first = FakePeer.all.length;
    // The client reloads: a new page, a new connection id.
    const again = page(box, "client", "c-conn-0002");
    await again.link.start();
    await settle(notary.link, again.link);
    expect(FakePeer.all.length).toBeGreaterThan(first);
    expect(FakePeer.all.find(peer => peer.closed)).toBeDefined();
    expect(box.signals.filter(signal => signal.from === "client" && signal.kind === "answer" && signal.connectionId === "c-conn-0002")).toHaveLength(1);
  });

  it("holds a candidate until the description it belongs to is in, and drops a stranger's", async () => {
    FakePeer.all = [];
    const box = new Box();
    const notary = page(box, "notary", "n-conn-0001");
    await notary.link.start();
    await box.sender("client", "c-conn-0001")("join", "");
    await notary.link.poll();
    const peer = FakePeer.all[0]!;
    await box.sender("client", "c-conn-0001")("candidate", "{\"candidate\":\"a\"}");
    await box.sender("client", "someone-else")("candidate", "{\"candidate\":\"z\"}");
    await notary.link.poll();
    expect(peer.candidates).toEqual([]);
    await box.sender("client", "c-conn-0001")("answer", "{\"type\":\"answer\",\"sdp\":\"s\"}");
    await notary.link.poll();
    expect(peer.candidates).toEqual([{ candidate: "a" }]);
  });

  it("reports a failed connection and goes back to waiting on hangup, and says goodbye on stop", async () => {
    FakePeer.all = [];
    const box = new Box();
    const notary = page(box, "notary", "n-conn-0001");
    const client = page(box, "client", "c-conn-0001");
    await notary.link.start(); await client.link.start();
    await settle(notary.link, client.link);
    const peer = FakePeer.all.find(item => item.localDescription?.type === "offer")!;
    peer.connectionState = "connected"; peer.onconnectionstatechange?.();
    peer.connectionState = "failed"; peer.onconnectionstatechange?.();
    expect(notary.states.slice(-2)).toEqual(["connected", "failed"]);
    await client.link.stop();
    expect(box.signals.at(-1)).toMatchObject({ from: "client", kind: "hangup" });
    await notary.link.poll();
    expect(notary.states.at(-1)).toBe("waiting");
    expect(client.states.at(-1)).toBe("closed");
  });
});
