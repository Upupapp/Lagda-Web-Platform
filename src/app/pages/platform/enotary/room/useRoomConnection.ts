// The browser side of the room's video: asks for the camera and microphone,
// runs a RoomLink against the server's signal box, and hands the page two
// streams to show. Nothing is recorded and nothing is uploaded.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  realEnotarySessionsService, type IceServer, type SessionRole,
} from "../../../../services/real/enotary-sessions.service";
import { RoomLink, type LinkState, type PeerLike } from "./room-link";

export type MediaState = "asking" | "ready" | "denied" | "unsupported";
export const SIGNAL_POLL_MS = 1500;
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

/** `active`: the room is open and the page wants the video. */
export function useRoomConnection(sessionId: string | null, role: SessionRole | null, active: boolean): RoomConnection {
  const [media, setMedia] = useState<MediaState>("asking");
  const [link, setLink] = useState<LinkState>("idle");
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const linkRef = useRef<RoomLink | null>(null);
  const localRef = useRef<MediaStream | null>(null);

  // The camera and microphone, while the room is wanted.
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || navigator.mediaDevices?.getUserMedia === undefined || typeof RTCPeerConnection === "undefined") {
      setMedia("unsupported");
      return;
    }
    let cancelled = false;
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
  }, [active]);

  // The link, once there are tracks (or the person chose to go on without).
  useEffect(() => {
    if (!active || sessionId === null || role === null) return;
    if (media === "asking" || media === "unsupported") return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const connectionId = newConnectionId();
    void (async () => {
      let iceServers: IceServer[];
      try { iceServers = await realEnotarySessionsService.iceServers(); } catch { iceServers = DEFAULT_ICE; }
      if (stopped) return;
      const roomLink = new RoomLink({
        role, connectionId, iceServers, localStream: localRef.current,
        createPeer: servers => new RTCPeerConnection({ iceServers: servers as RTCIceServer[] }) as unknown as PeerLike,
        send: (kind, payload) => realEnotarySessionsService.signal(sessionId, kind, connectionId, payload),
        fetchSignals: after => realEnotarySessionsService.signals(sessionId, after),
        onState: state => { if (!stopped) setLink(state); },
        onRemoteStream: stream => { if (!stopped) setRemote(stream as MediaStream); },
      });
      linkRef.current = roomLink;
      try { await roomLink.start(); } catch { if (!stopped) setLink("failed"); return; }
      timer = setInterval(() => { void roomLink.poll().catch(() => { /* the next round tries again */ }); }, SIGNAL_POLL_MS);
    })();
    return () => {
      stopped = true;
      if (timer !== undefined) clearInterval(timer);
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
