// The call, as the 13 October pages and the eNotary mock show it: a dark card with the time and "Private room", the
// other person large with their name and a Joined chip, the person's own picture small in a corner, and the controls
// underneath (mute, camera, chat, leave) with the last thing said. A Maximise button takes the call to the whole screen
// (the browser's full screen where it allows it), with Speaker and Gallery views, and the chat, the participants and the
// document in a panel beside it.
//
// The video is real (it comes from the room connection) and so is the chat. What the mock simulated and live does not do
// is left out: sharing the screen.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, Grid2x2, Maximize2, MessageSquare, Mic, MicOff, Minimize2, PhoneOff, PictureInPicture2, Users, Video, VideoOff, X, Lock } from "lucide-react";
import type { RoomMessage, Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { Chat } from "./room-bits";
import type { RoomConnection } from "./useRoomConnection";

type Side = "" | "chat" | "people" | "docs";

const clock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${String(h)}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
};

const initialsOf = (name: string): string => {
  const words = name.replace(/\([^)]*\)/g, " ").replace(/^\s*atty\.?\s+/i, "").split(/\s+/).filter(word => word !== "");
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1]?.[0] ?? "" : "")).toUpperCase() || "?";
};

const CSS = `
  .cc { ${"" /* inline */}position: relative; background: #0A1A2B; color: #FFFFFF; border-radius: 16px; padding: 14px; box-sizing: border-box; font-family: 'Geist', sans-serif; }
  .cc-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; min-height: 40px; }
  .cc-title { margin: 0; font-family: ${SERIF}; font-size: 17px; font-weight: 700; flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
  .cc-meta { display: inline-flex; align-items: center; gap: 12px; margin: 0; font-size: 13.5px; font-weight: 600; }
  .cc-live { display: inline-flex; align-items: center; gap: 6px; color: #FFD5DA; }
  .cc-live i { width: 9px; height: 9px; border-radius: 999px; background: #E5484D; display: inline-block; }
  .cc-enc { display: inline-flex; align-items: center; gap: 6px; color: #9FD0F5; }
  .cc-btn { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.06); color: #FFFFFF; font: inherit; font-weight: 700; font-size: 13.5px; cursor: pointer; }
  .cc-btn:hover { background: rgba(255,255,255,0.14); }
  .cc-btn[aria-pressed="true"].cc-seg { background: #FFFFFF; color: #0A1A2B; }
  .cc-stage { position: relative; margin-top: 12px; border-radius: 12px; overflow: hidden; background: #14233A; aspect-ratio: 16 / 10; }
  .cc-stage.gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: transparent; overflow: visible; aspect-ratio: auto; }
  .cc-tile { position: relative; background: #14233A; overflow: hidden; display: grid; place-items: center; min-width: 0; }
  .cc-stage:not(.gallery) .cc-them { position: absolute; inset: 0; }
  .cc-stage.gallery .cc-tile { border-radius: 12px; aspect-ratio: 4 / 3; }
  .cc-stage:not(.gallery) .cc-self { position: absolute; top: 12px; right: 12px; width: min(30%, 190px); aspect-ratio: 4 / 3; border-radius: 10px; border: 2px solid rgba(255,255,255,0.7); box-shadow: 0 6px 18px rgba(0,0,0,0.4); z-index: 2; }
  .cc.max .cc-stage:not(.gallery) .cc-self { top: auto; bottom: 14px; right: 14px; width: min(24%, 240px); }
  .cc-tile video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cc-ava { font-family: ${SERIF}; font-weight: 700; color: #BBDDF5; font-size: clamp(34px, 9vw, 74px); position: relative; z-index: 0; }
  .cc-self .cc-ava { font-size: clamp(20px, 5vw, 34px); }
  .cc-note { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(34px); margin: 0; text-align: center; color: #BBDDF5; font-size: 13.5px; padding: 0 12px; z-index: 1; }
  .cc-name { position: absolute; left: 10px; bottom: 10px; z-index: 2; display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; max-width: calc(100% - 20px); padding: 5px 10px; border-radius: 10px; background: rgba(10,26,43,0.78); font-size: 13px; font-weight: 700; }
  .cc-name small { font-weight: 500; color: #C9D8E8; }
  .cc-chip { display: inline-flex; align-items: center; gap: 5px; padding: 1px 9px; border-radius: 999px; background: #0F7B4F; color: #FFFFFF; font-size: 11.5px; font-weight: 700; }
  .cc-chip.wait { background: #7A5200; }
  .cc-ctl { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
  .cc-c { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 76px; min-height: 62px; padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.08); color: #FFFFFF; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
  .cc-c:hover { background: rgba(255,255,255,0.18); }
  .cc-c.off { background: #FFFFFF; color: #A3141F; }
  .cc-c.on { background: #DCEEFC; color: #0A1A2B; }
  .cc-c.end { background: #C62828; border-color: #C62828; }
  .cc-c:disabled { opacity: 0.5; cursor: not-allowed; }
  .cc-said { margin: 12px 0 0; padding: 9px 12px; border-left: 3px solid #C2185B; border-radius: 6px; background: rgba(255,255,255,0.07); font-size: 13.5px; overflow-wrap: anywhere; }
  .cc-warn { margin: 10px 0 0; padding: 9px 12px; border-radius: 8px; background: #FFF1E6; color: #8A3B12; font-size: 13.5px; }
  .cc.max { position: fixed; inset: 0; z-index: 2000; border-radius: 0; padding: 0; display: flex; flex-direction: column; }
  .cc.max .cc-top { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .cc.max .cc-body { flex: 1 1 auto; min-height: 0; display: flex; gap: 14px; padding: 14px 16px; }
  .cc.max .cc-stage { margin-top: 0; flex: 1 1 auto; min-width: 0; aspect-ratio: auto; height: 100%; }
  .cc.max .cc-stage.gallery { align-content: center; height: auto; align-self: center; width: 100%; }
  .cc.max .cc-foot { padding: 0 16px 14px; }
  .cc-side { flex: 0 0 360px; max-width: 100%; background: #FFFFFF; color: ${E.ink}; border-radius: 12px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  .cc-side-h { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid ${E.line}; }
  .cc-side-h h3 { margin: 0; font-size: 16px; color: ${E.navy}; }
  .cc-side-b { padding: 14px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
  .cc-x { width: 36px; height: 36px; border-radius: 8px; border: 1px solid ${E.line}; background: #FFFFFF; display: grid; place-items: center; cursor: pointer; color: ${E.navy}; }
  .cc-people { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .cc-people li { display: flex; align-items: center; gap: 10px; }
  .cc-people .pa { width: 38px; height: 38px; border-radius: 999px; background: ${E.skyWash}; color: ${E.skyDeep}; display: grid; place-items: center; font-family: ${SERIF}; font-weight: 700; }
  @media (max-width: 820px) {
    .cc.max .cc-body { flex-direction: column; overflow-y: auto; }
    .cc-side { flex: 0 0 auto; max-height: 55dvh; }
    .cc.max .cc-stage { height: auto; aspect-ratio: 4 / 3; flex: 0 0 auto; }
    .cc-c { min-width: 62px; }
    .cc-stage.gallery { grid-template-columns: 1fr; }
  }
  @media (max-width: 520px) { .cc-stage { aspect-ratio: 4 / 3; } .cc-btn span.lbl { display: none; } .cc-self .cc-chip { display: none; } }
`;

function Tile({ stream, muted, cls, children, off, avatar, note }: {
  stream: MediaStream | null; muted: boolean; cls: string; children?: ReactNode; off: boolean; avatar: string; note?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current !== null) ref.current.srcObject = stream; }, [stream]);
  const showVideo = stream !== null && !off;
  return (
    <div className={`cc-tile ${cls}`}>
      <video ref={ref} autoPlay playsInline muted={muted} aria-hidden={!showVideo} style={{ display: showVideo ? "block" : "none" }} />
      {!showVideo && <span className="cc-ava" aria-hidden="true">{avatar}</span>}
      {!showVideo && note !== undefined && <p className="cc-note">{note}</p>}
      {children}
    </div>
  );
}

export function CallCard({
  session, connection, partnerName, partnerRole, selfIdentityVerified, partnerPresent, messages, onSend, onLeave, document: documentView, children,
}: {
  session: Session; connection: RoomConnection; partnerName: string; partnerRole: string; selfIdentityVerified: boolean; partnerPresent: boolean;
  messages: readonly RoomMessage[]; onSend: (body: string) => Promise<void>; onLeave: () => void; document: ReactNode; children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const minimise = useRef<HTMLButtonElement>(null);
  const [max, setMax] = useState(false);
  const [side, setSide] = useState<Side>("");
  const [view, setView] = useState<"speaker" | "gallery">("speaker");
  const [now, setNow] = useState(() => Date.now());
  const { media, link, local, remote, micOn, camOn } = connection;

  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => { clearInterval(timer); };
  }, []);

  // Full screen where the browser allows it; the fixed layer covers the window where it does not. Leaving full screen
  // by the browser's own means (Esc, F11) brings the page layout back.
  useEffect(() => {
    const element = root.current;
    if (!max || element === null) return;
    document.body.style.overflow = "hidden";
    if (!document.fullscreenElement) { try { void element.requestFullscreen().catch(() => undefined); } catch { /* no full screen here: the fixed layer stays */ } }
    const changed = () => { if (!document.fullscreenElement) setMax(false); };
    const keys = (event: KeyboardEvent) => { if (event.key === "Escape") setMax(false); };
    document.addEventListener("fullscreenchange", changed);
    document.addEventListener("keydown", keys);
    minimise.current?.focus();
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("fullscreenchange", changed);
      document.removeEventListener("keydown", keys);
      if (document.fullscreenElement && typeof document.exitFullscreen === "function") void document.exitFullscreen().catch(() => undefined);
    };
  }, [max]);

  const opened = session.openedAt === null ? null : Date.parse(session.openedAt);
  const elapsed = opened === null ? 0 : (now - opened) / 1000;
  const last = messages.length === 0 ? null : messages[messages.length - 1] ?? null;
  const said = last === null
    ? (partnerPresent ? `${partnerName} is in the room.` : `Waiting for ${partnerName} to join.`)
    : `${last.role === session.role ? "You" : partnerName}: ${last.body}`;
  const open = (next: Side) => { setSide(current => (current === next && max ? "" : next)); setMax(true); };
  const toggleSide = (next: Exclude<Side, "">) => { setSide(current => (current === next ? "" : next)); };
  const selfName = session.role === "client" ? session.clientName : session.notaryName;
  const title = `eNotary session with ${partnerName}`;

  const controls = (
    <div className="cc-ctl" role="toolbar" aria-label="Call controls">
      <button type="button" className={`cc-c${micOn ? "" : " off"}`} onClick={() => { connection.toggleMic(); }} aria-pressed={!micOn} disabled={local === null}>
        {micOn ? <Mic size={20} aria-hidden /> : <MicOff size={20} aria-hidden />}<span>{micOn ? "Mute" : "Unmute"}</span>
      </button>
      <button type="button" className={`cc-c${camOn ? "" : " off"}`} onClick={() => { connection.toggleCam(); }} aria-pressed={!camOn} disabled={local === null}>
        {camOn ? <Video size={20} aria-hidden /> : <VideoOff size={20} aria-hidden />}<span>{camOn ? "Stop video" : "Start video"}</span>
      </button>
      {max && (
        <button type="button" className={`cc-c${side === "people" ? " on" : ""}`} onClick={() => { toggleSide("people"); }} aria-expanded={side === "people"}>
          <Users size={20} aria-hidden /><span>Participants</span>
        </button>
      )}
      <button type="button" className={`cc-c${side === "chat" && max ? " on" : ""}`} data-testid="call-chat" onClick={() => { if (max) toggleSide("chat"); else open("chat"); }} aria-expanded={max && side === "chat"}>
        <MessageSquare size={20} aria-hidden /><span>Chat</span>
      </button>
      {max && (
        <button type="button" className={`cc-c${side === "docs" ? " on" : ""}`} onClick={() => { toggleSide("docs"); }} aria-expanded={side === "docs"}>
          <FileText size={20} aria-hidden /><span>Document</span>
        </button>
      )}
      <button type="button" className="cc-c end" data-testid="call-leave" onClick={onLeave} title="Leave the room. The session stays open and you can come back.">
        <PhoneOff size={20} aria-hidden /><span>Leave</span>
      </button>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div ref={root} className={`cc${max ? " max" : ""}`} data-testid="call-card" data-max={max} {...(max ? { role: "dialog", "aria-modal": true, "aria-label": title } : {})}>
        <div className="cc-top">
          {max && <h2 className="cc-title">{title}</h2>}
          <p className="cc-meta">
            <span className="cc-live"><i aria-hidden="true" /><span data-testid="call-time">{clock(elapsed)}</span></span>
            <span className="cc-enc"><Lock size={14} aria-hidden /> Private room</span>
          </p>
          {!max && <span style={{ flex: 1 }} />}
          {max && (
            <div role="group" aria-label="Layout of the call" style={{ display: "inline-flex", gap: 0 }}>
              <button type="button" className="cc-btn cc-seg" aria-label="Speaker view" aria-pressed={view === "speaker"} onClick={() => { setView("speaker"); }} style={{ borderRadius: "10px 0 0 10px" }}>
                <PictureInPicture2 size={16} aria-hidden /><span className="lbl">Speaker view</span>
              </button>
              <button type="button" className="cc-btn cc-seg" aria-label="Gallery view" aria-pressed={view === "gallery"} onClick={() => { setView("gallery"); }} style={{ borderRadius: "0 10px 10px 0", borderLeft: 0 }}>
                <Grid2x2 size={16} aria-hidden /><span className="lbl">Gallery view</span>
              </button>
            </div>
          )}
          {max ? (
            <button ref={minimise} type="button" className="cc-btn" data-testid="call-minimise" aria-label="Minimise the call" onClick={() => { setMax(false); setSide(""); }}>
              <Minimize2 size={16} aria-hidden /><span className="lbl">Minimise</span>
            </button>
          ) : (
            <button type="button" className="cc-btn" data-testid="call-maximise" aria-label="Maximise the call" onClick={() => { setSide(""); setMax(true); }}>
              <Maximize2 size={16} aria-hidden /><span className="lbl">Maximise</span>
            </button>
          )}
        </div>

        <div className="cc-body">
          <div className={`cc-stage${view === "gallery" ? " gallery" : ""}`} style={max ? undefined : undefined}>
            <Tile stream={remote} muted={false} cls="cc-them" off={false} avatar={initialsOf(partnerName)} note={link === "connecting" ? "Connecting the video…" : partnerPresent ? undefined : "Waiting…"}>
              <span className="cc-name">{partnerName}<small>{partnerRole}</small><span className={`cc-chip${partnerPresent ? "" : " wait"}`}>{partnerPresent ? "Joined" : "Not here yet"}</span></span>
            </Tile>
            <Tile stream={local} muted cls="cc-self" off={!camOn} avatar={initialsOf(selfName)} note={camOn ? undefined : "Camera off"}>
              <span className="cc-name">You{selfIdentityVerified && <span className="cc-chip">Identity verified</span>}{!micOn && <MicOff size={13} aria-label="Microphone off" role="img" />}</span>
            </Tile>
          </div>
          {max && side !== "" && (
            <aside className="cc-side" aria-label={side === "chat" ? "Chat" : side === "people" ? "Participants" : "Document"}>
              <div className="cc-side-h">
                <h3>{side === "chat" ? "Chat" : side === "people" ? "Participants" : "Document for notarization"}</h3>
                <button type="button" className="cc-x" aria-label="Close the panel" onClick={() => { setSide(""); }}><X size={16} aria-hidden /></button>
              </div>
              <div className="cc-side-b">
                {side === "chat" && <Chat messages={messages} me={session.role} disabled={false} onSend={onSend} />}
                {side === "people" && (
                  <ul className="cc-people" data-testid="call-people">
                    <li><span className="pa" aria-hidden="true">{initialsOf(selfName)}</span><span><b>You</b><br /><small style={{ color: E.quiet }}>{session.role === "client" ? "Client" : "Notary public"}{selfIdentityVerified ? " · Identity verified" : ""}</small></span></li>
                    <li><span className="pa" aria-hidden="true">{initialsOf(partnerName)}</span><span><b>{partnerName}</b><br /><small style={{ color: E.quiet }}>{partnerRole} · {partnerPresent ? "In the room" : "Not here yet"}</small></span></li>
                    <li><small style={{ color: E.quiet }}>This room is for the client and the notary only.</small></li>
                  </ul>
                )}
                {side === "docs" && documentView}
              </div>
            </aside>
          )}
        </div>

        <div className="cc-foot">
          {media === "denied" && <p role="alert" data-testid="media-denied" className="cc-warn">The camera or microphone is blocked. Allow them in your browser&rsquo;s address bar and reload. You can still use the chat and the document.</p>}
          {media === "unsupported" && <p role="alert" data-testid="media-unsupported" className="cc-warn">This browser cannot do video calls here. Use a current Chrome, Edge, Firefox or Safari. You can still use the chat and the document.</p>}
          {link === "failed" && (
            <p role="alert" className="cc-warn">The video could not connect. <button type="button" className="cc-btn" style={{ color: "#0A1A2B", background: "#FFFFFF", marginLeft: 6 }} onClick={() => { connection.retry(); }}>Try the video again</button></p>
          )}
          {controls}
          <p className="cc-said" data-testid="call-said" role="status">{said}</p>
          {!max && children}
        </div>
      </div>
    </>
  );
}
