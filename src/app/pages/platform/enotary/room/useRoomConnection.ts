// The browser side of the room's video: asks for the camera and microphone,
// runs a RoomLink against the server's signal box, and hands the page two
// streams to show. Nothing is recorded and nothing is uploaded.
//
// Made quick to connect: the camera starts while the person waits for the room
// to open (`warm`), the network addresses are fetched alongside it, the signal
// box is read every quarter second while the two browsers are finding each other
// (and straight after a note is sent), and a dropped link tries again by itself.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  realEnotarySessionsService, type IceServer, type SessionRole,
} from "../../../../services/real/enotary-sessions.service";
import { RoomLink, type LinkState, type PeerLike } from "./room-link";

export type MediaState = "asking" | "ready" | "denied" | "unsupported";
/** How often the signal box is read once the video is up. */
export const SIGNAL_POLL_MS = 1500;
/** How often it is read while the two browsers are finding each other. */
export const SIGNAL_FAST_MS = 250;
/** A note just sent: the answer is looked for this soon. */
export const AFTER_SEND_MS = 120;
/** A failed link tries again after this long, up to RETRY_LIMIT times in a row. */
export const RETRY_AFTER_MS = 1200;
export const RETRY_LIMIT = 3;
export const DEFAULT_ICE: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export interface RoomConnection {
  media: MediaState;
  link: LinkState;
  local: MediaStream | null;
  remote: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  toggleMic(): void;
  toggleCam(): void;
  retry(): void;
}

function newConnectionId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * `active`: the room is open and the page wants the video. `warm`: the room is about to open (the waiting room), so
 * the camera and the network addresses are made ready beforehand; the link itself starts only once `active`.
 */
export function useRoomConnection(sessionId: string | null, role: SessionRole | null, active: boolean, warm = false): RoomConnection {
  const [media, setMedia] = useState<MediaState>("asking");
  const [link, setLink] = useState<LinkState>("idle");
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const linkRef = useRef<RoomLink | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  // The network addresses, fetched once per session as soon as the room is wanted.
  const iceRef = useRef<{ sessionId: string | null; servers: Promise<IceServer[]> } | null>(null);
  const wanted = active || warm;

  // The camera and microphone, and the network addresses, while the room is wanted or about to open.
  useEffect(() => {
    if (!wanted) return;
    if (typeof navigator === "undefined" || navigator.mediaDevices?.getUserMedia === undefined || typeof RTCPeerConnection === "undefined") {
      setMedia("unsupported");
      return;
    }
    let cancelled = false;
    if (iceRef.current?.sessionId !== sessionId) iceRef.current = { sessionId, servers: realEnotarySessionsService.iceServers().catch(() => DEFAULT_ICE) };
    setMedia("asking");
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      if (cancelled) { stream.getTracks().forEach(track => { track.stop(); }); return; }
      localRef.current = stream;
      setLocal(stream);
      setMedia("ready");
    }).catch(() => { if (!cancelled) setMedia("denied"); });
    return () => {
      cancelled = true;
      localRef.current?.getTracks().forEach(track => { track.stop(); });
      localRef.current = null;
      setLocal(null);
    };
  }, [wanted, sessionId]);

  // The link, once the room is open and there are tracks (or the person chose to go on without).
  useEffect(() => {
    if (!active || sessionId === null || role === null) return;
    if (media === "asking" || media === "unsupported") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let state: LinkState = "idle";
    let fastUntil = 0;
    let failures = 0;
    const connectionId = newConnectionId();

    // The next read of the signal box: soon while finding each other or just after a note was sent, calmly once connected.
    const schedule = (delay: number) => {
      if (stopped) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        const current = linkRef.current;
        if (stopped || current === null) return;
        void current.poll().catch(() => { /* the next round tries again */ }).finally(() => {
          schedule(state !== "connected" || Date.now() < fastUntil ? SIGNAL_FAST_MS : SIGNAL_POLL_MS);
        });
      }, delay);
    };

    void (async () => {
      const iceServers = await (iceRef.current?.sessionId === sessionId ? iceRef.current.servers : realEnotarySessionsService.iceServers().catch(() => DEFAULT_ICE));
      if (stopped) return;
      const roomLink = new RoomLink({
        role, connectionId, iceServers, localStream: localRef.current,
        createPeer: servers => new RTCPeerConnection({ iceServers: servers as RTCIceServer[] }) as unknown as PeerLike,
        send: async (kind, payload) => {
          await realEnotarySessionsService.signal(sessionId, kind, connectionId, payload);
          // The partner answers quickly: look for it straight away, then keep looking fast for a moment.
          fastUntil = Date.now() + 3000;
          schedule(AFTER_SEND_MS);
        },
        fetchSignals: after => realEnotarySessionsService.signals(sessionId, after),
        onState: next => {
          if (stopped) return;
          state = next;
          setLink(next);
          if (next === "connected") failures = 0;
          // A failed link starts over by itself a few times before the person is asked.
          if (next === "failed" && failures < RETRY_LIMIT) {
            failures += 1;
            setTimeout(() => { if (!stopped) void linkRef.current?.retry(); }, RETRY_AFTER_MS);
          }
        },
        onRemoteStream: stream => { if (!stopped) setRemote(stream as MediaStream); },
      });
      linkRef.current = roomLink;
      try { await roomLink.start(); } catch { if (!stopped) setLink("failed"); return; }
      schedule(0);
    })();
    return () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      const current = linkRef.current;
      linkRef.current = null;
      if (current !== null) void current.stop();
      setRemote(null);
      setLink("idle");
    };
  }, [active, sessionId, role, media]);

  const toggle = useCallback((kind: "audio" | "video") => {
    const stream = localRef.current;
    if (stream === null) return;
    const tracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
    const next = !(tracks[0]?.enabled ?? true);
    tracks.forEach(track => { track.enabled = next; });
    if (kind === "audio") setMicOn(next); else setCamOn(next);
  }, []);

  return {
    media, link, local, remote, micOn, camOn,
    toggleMic: () => { toggle("audio"); },
    toggleCam: () => { toggle("video"); },
    retry: () => { void linkRef.current?.retry(); },
  };
}
