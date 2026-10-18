// The peer-to-peer link of the room: two browsers find each other through the
// server's signal box and then carry the video between themselves.
//
// The server only relays small notes (join, offer, answer, candidate, hangup).
// It never sees the video and nothing is recorded. The notary makes the offer;
// the client answers. Either side may reload at any time: a page that starts
// ignores what was said before it came, says "join", and the other side, on
// seeing a new page of its partner, starts the exchange over.
//
// No browser API is named here except through `deps`, so the exchange can be
// tested with plain objects.

import type { IceServer, RoomSignal, SessionRole, SignalKind } from "../../../../services/real/enotary-sessions.service";

export type LinkState = "idle" | "waiting" | "connecting" | "connected" | "failed" | "closed";

export interface PeerLike {
  localDescription: { type: string; sdp?: string } | null;
  remoteDescription: unknown;
  connectionState: string;
  onicecandidate: ((event: { candidate: { toJSON(): unknown } | null }) => void) | null;
  ontrack: ((event: { streams: readonly unknown[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  addTrack(track: unknown, stream: unknown): unknown;
  createOffer(): Promise<{ type: string; sdp?: string }>;
  createAnswer(): Promise<{ type: string; sdp?: string }>;
  setLocalDescription(description: { type: string; sdp?: string }): Promise<void>;
  setRemoteDescription(description: unknown): Promise<void>;
  addIceCandidate(candidate: unknown): Promise<void>;
  close(): void;
}

export interface RoomLinkDeps {
  readonly role: SessionRole;
  readonly connectionId: string;
  readonly iceServers: readonly IceServer[];
  readonly localStream: { getTracks(): readonly unknown[] } | null;
  readonly createPeer: (iceServers: readonly IceServer[]) => PeerLike;
  readonly send: (kind: SignalKind, payload: string) => Promise<void>;
  readonly fetchSignals: (after: number) => Promise<readonly RoomSignal[]>;
  readonly onState: (state: LinkState) => void;
  readonly onRemoteStream: (stream: unknown) => void;
}

const PAGE = 100;

export class RoomLink {
  private peer: PeerLike | null = null;
  private cursor = 0;
  private partnerConnection: string | null = null;
  private pendingCandidates: unknown[] = [];
  private stopped = false;
  private busy = false;

  constructor(private readonly deps: RoomLinkDeps) {}

  /** Skips what was said before this page came, then announces it. */
  async start(): Promise<void> {
    this.deps.onState("waiting");
    for (;;) {
      const page = await this.deps.fetchSignals(this.cursor);
      for (const signal of page) this.cursor = Math.max(this.cursor, signal.seq);
      if (page.length < PAGE) break;
    }
    await this.deps.send("join", "");
  }

  /** One round of the poll: reads new notes and acts on them, in order. */
  async poll(): Promise<void> {
    if (this.stopped || this.busy) return;
    this.busy = true;
    try {
      const page = await this.deps.fetchSignals(this.cursor);
      for (const signal of page) {
        this.cursor = Math.max(this.cursor, signal.seq);
        if (signal.from === this.deps.role) continue;
        await this.handle(signal);
      }
    } finally {
      this.busy = false;
    }
  }

  private async handle(signal: RoomSignal): Promise<void> {
    if (this.stopped) return;
    switch (signal.kind) {
      case "join": {
        // A new page of the partner. The client calls out again so the notary, who offers, sees it.
        const fresh = signal.connectionId !== this.partnerConnection;
        this.partnerConnection = signal.connectionId;
        if (this.deps.role === "notary") await this.offer();
        else if (fresh) { this.closePeer(); await this.deps.send("join", ""); }
        return;
      }
      case "offer": {
        if (this.deps.role !== "client") return;
        this.partnerConnection = signal.connectionId;
        await this.answer(signal.payload);
        return;
      }
      case "answer": {
        if (this.deps.role !== "notary" || signal.connectionId !== this.partnerConnection || this.peer === null) return;
        await this.peer.setRemoteDescription(JSON.parse(signal.payload));
        await this.flushCandidates();
        return;
      }
      case "candidate": {
        if (signal.connectionId !== this.partnerConnection) return;
        const candidate: unknown = JSON.parse(signal.payload);
        if (this.peer === null || this.peer.remoteDescription === null) this.pendingCandidates.push(candidate);
        else await this.peer.addIceCandidate(candidate);
        return;
      }
      case "hangup": {
        if (signal.connectionId !== this.partnerConnection) return;
        this.closePeer();
        this.deps.onState("waiting");
      }
    }
  }

  private makePeer(): PeerLike {
    this.closePeer();
    const peer = this.deps.createPeer(this.deps.iceServers);
    for (const track of this.deps.localStream?.getTracks() ?? []) peer.addTrack(track, this.deps.localStream);
    peer.onicecandidate = event => {
      if (event.candidate !== null) void this.deps.send("candidate", JSON.stringify(event.candidate.toJSON()));
    };
    peer.ontrack = event => { if (event.streams[0] !== undefined) this.deps.onRemoteStream(event.streams[0]); };
    peer.onconnectionstatechange = () => {
      if (this.peer !== peer) return;
      if (peer.connectionState === "connected") this.deps.onState("connected");
      else if (peer.connectionState === "failed") this.deps.onState("failed");
      else if (peer.connectionState === "disconnected") this.deps.onState("connecting");
    };
    this.peer = peer;
    this.pendingCandidates = [];
    return peer;
  }

  private async offer(): Promise<void> {
    const peer = this.makePeer();
    this.deps.onState("connecting");
    const description = await peer.createOffer();
    await peer.setLocalDescription(description);
    await this.deps.send("offer", JSON.stringify(peer.localDescription ?? description));
  }

  private async answer(offerPayload: string): Promise<void> {
    const peer = this.makePeer();
    this.deps.onState("connecting");
    await peer.setRemoteDescription(JSON.parse(offerPayload));
    await this.flushCandidates();
    const description = await peer.createAnswer();
    await peer.setLocalDescription(description);
    await this.deps.send("answer", JSON.stringify(peer.localDescription ?? description));
  }

  private async flushCandidates(): Promise<void> {
    const peer = this.peer;
    if (peer === null) return;
    const waiting = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of waiting) await peer.addIceCandidate(candidate);
  }

  private closePeer(): void {
    if (this.peer === null) return;
    this.peer.onicecandidate = null;
    this.peer.ontrack = null;
    this.peer.onconnectionstatechange = null;
    this.peer.close();
    this.peer = null;
  }

  /** Starts the exchange over from this side (after a failure, or on request). */
  async retry(): Promise<void> {
    if (this.stopped) return;
    if (this.deps.role === "notary") {
      if (this.partnerConnection !== null) await this.offer();
      else await this.deps.send("join", "");
    } else {
      this.closePeer();
      this.deps.onState("waiting");
      await this.deps.send("join", "");
    }
  }

  /** Leaves politely. */
  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.closePeer();
    this.deps.onState("closed");
    try { await this.deps.send("hangup", ""); } catch { /* the page is going away */ }
  }
}
