// Small pieces of the room: a private PDF shown from a fetched blob, a download
// helper, the two video tiles and the chat. Presentational; the page decides.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Download, ExternalLink, Mic, MicOff, Send, Video, VideoOff } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import type { RoomMessage, SessionRole } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { fieldStyle, linkButton } from "../onramp-ui";
import type { RoomConnection } from "./useRoomConnection";

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
}

/** A private PDF, fetched with the session's cookie and shown from memory. `key` changes when the file does. */
export function PdfView({ load, fileKey, name, height = 460 }: { load: () => Promise<Blob>; fileKey: string; name: string; height?: number }) {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error" } | { kind: "ready"; url: string; blob: Blob }>({ kind: "loading" });
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    setState({ kind: "loading" });
    loader.current().then(blob => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setState({ kind: "ready", url, blob });
    }).catch(() => { if (alive) setState({ kind: "error" }); });
    return () => { alive = false; if (url !== null) URL.revokeObjectURL(url); };
  }, [fileKey]);

  if (state.kind === "loading") return <p role="status" style={{ ...GF, fontSize: 14, color: E.quiet }}>Loading the document…</p>;
  if (state.kind === "error") return <p role="alert" style={{ ...GF, fontSize: 14, color: "#B0182B" }}>The document could not be loaded. Reload the page to try again.</p>;
  return (
    <div data-testid="pdf-view">
      <iframe title={`Document: ${name}`} src={state.url} style={{ width: "100%", height, border: `1px solid ${E.line}`, borderRadius: 8, background: E.wash }} />
      <p style={{ ...GF, display: "flex", gap: 10, flexWrap: "wrap", margin: "8px 0 0" }}>
        <a href={state.url} target="_blank" rel="noopener noreferrer" style={{ ...linkButton("secondary"), minHeight: 44 }}>
          <ExternalLink size={16} aria-hidden /> Open in a new tab
        </a>
        <button type="button" onClick={() => { saveBlob(state.blob, name); }} style={{ ...linkButton("secondary"), cursor: "pointer" }}>
          <Download size={16} aria-hidden /> Download
        </button>
      </p>
    </div>
  );
}

function Tile({ stream, label, muted, off }: { stream: MediaStream | null; label: string; muted: boolean; off?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current !== null) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div style={{ position: "relative", background: "#0B1F44", borderRadius: 12, overflow: "hidden", aspectRatio: "4 / 3", minWidth: 0 }}>
      <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: stream === null || off === true ? "none" : "block" }} />
      {(stream === null || off === true) && (
        <div style={{ ...GF, position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBDDF5", fontSize: 14, padding: 12, textAlign: "center" }}>
          {stream === null ? "Waiting…" : "Camera is off"}
        </div>
      )}
      <span style={{ ...GF, position: "absolute", left: 8, bottom: 8, padding: "2px 9px", borderRadius: 999, background: "rgba(11,31,68,0.78)", color: "#FFFFFF", fontSize: 12.5, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

const LINK_WORDS: Record<RoomConnection["link"], string> = {
  idle: "Not connected.", waiting: "Waiting for the other person to join the video…", connecting: "Connecting the video…",
  connected: "Connected.", failed: "The video could not connect.", closed: "Disconnected.",
};

export function VideoPane({ connection, partnerLabel }: { connection: RoomConnection; partnerLabel: string }) {
  const { media, link, local, remote, micOn, camOn } = connection;
  return (
    <div data-testid="video-pane">
      {media === "denied" && (
        <p role="alert" data-testid="media-denied" style={{ ...GF, fontSize: 14, color: "#8A3B12", margin: "0 0 10px" }}>
          The camera or microphone is blocked. Allow them in your browser&rsquo;s address bar and reload. You can still use the chat and the document.
        </p>
      )}
      {media === "unsupported" && (
        <p role="alert" data-testid="media-unsupported" style={{ ...GF, fontSize: 14, color: "#8A3B12", margin: "0 0 10px" }}>
          This browser cannot do video calls here. Use a current Chrome, Edge, Firefox or Safari. You can still use the chat and the document.
        </p>
      )}
      <div className="room-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        <Tile stream={remote} label={partnerLabel} muted={false} />
        <Tile stream={local} label="You" muted off={!camOn} />
      </div>
      <p data-testid="link-state" role="status" style={{ ...GF, margin: "8px 0", fontSize: 13.5, color: link === "failed" ? "#B0182B" : E.quiet }}>
        {media === "ready" || media === "denied" ? LINK_WORDS[link] : ""}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { connection.toggleMic(); }} aria-pressed={!micOn} disabled={local === null} style={{ ...linkButton("secondary"), cursor: "pointer" }}>
          {micOn ? <Mic size={16} aria-hidden /> : <MicOff size={16} aria-hidden />} {micOn ? "Mute" : "Unmute"}
        </button>
        <button type="button" onClick={() => { connection.toggleCam(); }} aria-pressed={!camOn} disabled={local === null} style={{ ...linkButton("secondary"), cursor: "pointer" }}>
          {camOn ? <Video size={16} aria-hidden /> : <VideoOff size={16} aria-hidden />} {camOn ? "Camera off" : "Camera on"}
        </button>
        {link === "failed" && (
          <button type="button" onClick={() => { connection.retry(); }} style={{ ...linkButton("primary"), cursor: "pointer" }}>Try the video again</button>
        )}
      </div>
    </div>
  );
}

export function Chat({
  messages, me, onSend, disabled,
}: { messages: readonly RoomMessage[]; me: SessionRole; onSend: (body: string) => Promise<void>; disabled: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "nearest" }); }, [messages.length]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (body === "" || busy) return;
    setBusy(true);
    try { await onSend(body); setText(""); } finally { setBusy(false); }
  };
  return (
    <div data-testid="chat">
      <div role="log" aria-label="Chat" style={{ ...GF, maxHeight: 260, overflowY: "auto", padding: 10, border: `1px solid ${E.line}`, borderRadius: 10, background: E.wash, marginBottom: 8 }}>
        {messages.length === 0 && <p style={{ margin: 0, fontSize: 13.5, color: E.quiet }}>No messages yet. Only you and the other person can read this chat.</p>}
        {messages.map(message => (
          <p key={message.id} style={{ margin: "0 0 6px", fontSize: 14, textAlign: message.role === me ? "right" : "left" }}>
            <span style={{ display: "inline-block", maxWidth: "85%", padding: "6px 10px", borderRadius: 10, background: message.role === me ? E.skyWash : "#FFFFFF", border: `1px solid ${message.role === me ? E.skyLine : E.line}`, wordBreak: "break-word", textAlign: "left" }}>
              {message.body}
            </span>
          </p>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={event => { void submit(event); }} style={{ display: "flex", gap: 8 }}>
        <input
          aria-label="Message" value={text} maxLength={1000} disabled={disabled} placeholder="Write a message"
          onChange={event => { setText(event.target.value); }} style={{ ...fieldStyle(), flex: 1, minWidth: 0 }}
        />
        <button type="submit" disabled={disabled || busy || text.trim() === ""} style={{ ...linkButton("primary"), cursor: "pointer" }}>
          <Send size={16} aria-hidden /> Send
        </button>
      </form>
    </div>
  );
}
