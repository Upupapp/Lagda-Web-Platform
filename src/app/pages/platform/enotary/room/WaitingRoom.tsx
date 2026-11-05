// The waiting room: step 3 of the notary's room page ("You accept"), and the client's matching view, while the session
// is preparing and the room is not open yet.
//
// One formal card: where the session stands (a readiness checklist read from the server's session), the steps the
// session goes through once the room opens, and the card's own actions: "Open the room" for the notary and "Call off
// the session" for either side. The checklist informs; it does not hold the room shut. The server lets the notary open
// the room without a document (the client may bring it on the call), and refuses the act itself until everything the
// act needs is in.
//
// The camera is made ready here, before the room opens (useRoomConnection's `warm`), so the call starts at once; the
// camera check shows the person their own picture, which is also why the camera's light is on.
//
// Presentational: the page owns the session, the calls and the confirmation.

import { useEffect, useRef } from "react";
import { Camera, CameraOff, CheckCircle2, CircleDashed, DoorOpen, LocateFixed, MapPin, ShieldCheck, FileText, UserRound, XCircle } from "lucide-react";
import { ActionButton, ActionRow, GF } from "../../../../components/system/design-system";
import { formatClientAddress, type Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { stampLabel } from "../requests/expiry";
import type { MediaState } from "./useRoomConnection";

const WAIT_STYLES = `
  .eno-wait { animation: eno-in 260ms ease both; }
  .eno-wait-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
  .eno-wait-grid > section + section { border-left: 1px solid ${E.line}; }
  @media (max-width: 820px) {
    .eno-wait-grid { grid-template-columns: minmax(0, 1fr); }
    .eno-wait-grid > section + section { border-left: 0; border-top: 1px solid ${E.line}; }
  }
  .eno-wait-actions { display: flex; flex-direction: row-reverse; justify-content: flex-start; align-items: stretch; gap: 10px; margin-top: 20px; }
  .eno-wait-action { flex: 0 0 auto; display: flex; }
  .eno-cam { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 14px; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid ${E.line}; }
  .eno-cam-frame { position: relative; width: 112px; aspect-ratio: 4 / 3; border-radius: 10px; overflow: hidden; background: #0B1B2E; display: grid; place-items: center; color: #8FA6BF; }
  .eno-cam-frame video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
  @media (max-width: 640px) {
    .eno-wait-action { flex: 1 1 0; min-width: 0; }
    .eno-wait-action button { white-space: normal !important; text-align: center; line-height: 1.25; padding: 6px 10px !important; }
    .eno-wait-action button svg { display: none; }
  }
`;

export interface ReadinessItem {
  readonly key: "present" | "document" | "identity" | "address" | "location";
  readonly label: string;
  readonly done: boolean;
  readonly detail: string;
}

/** What the waiting room checks, in the order the session needs it, each read from the session the server sent. */
export function readinessOf(s: Session, isClient: boolean): readonly ReadinessItem[] {
  const identity = s.clientIdentity;
  const address = s.clientAddress ?? null;
  const client = isClient ? "You" : s.clientName;
  return [
    {
      key: "present", label: "Client present", done: s.presence.client,
      detail: s.presence.client ? `${client} ${isClient ? "are" : "is"} in the waiting room.` : `${isClient ? "You are" : `${s.clientName} is`} not in the waiting room yet.`,
    },
    {
      key: "document", label: "Document added", done: s.document !== null,
      detail: s.document !== null ? `${s.document.name}, added ${stampLabel(s.document.addedAt)}.`
        : isClient ? "Add it below, or bring it on the call." : "The client may add it now or on the call.",
    },
    {
      key: "identity", label: "Identity verified by LAGDA", done: identity?.verified === true,
      detail: identity?.verified === true
        ? `ID and face checked when the request was made${identity.idType !== null ? ` (${identity.idType})` : ""}.`
        : "LAGDA has no identity check on this request.",
    },
    {
      key: "address", label: "Client's address given", done: address !== null,
      detail: address !== null ? formatClientAddress(address)
        : isClient ? "Type where you are during the notarization, below." : "The client types it in the room. It is needed before you record the act.",
    },
    // 128. Where the server checks locations: both parties within the Philippines (Rule III).
    ...(s.location?.required === true ? [locationItem(s, isClient)] : []),
  ];
}

function locationItem(s: Session, isClient: boolean): ReadinessItem {
  const mine = s.location?.[isClient ? "client" : "notary"] ?? null;
  const theirs = s.location?.[isClient ? "notary" : "client"] ?? null;
  const other = isClient ? "The notary" : s.clientName;
  const done = mine?.outcome === "within" && theirs?.outcome === "within";
  const detail = done ? `Both of you are within the Philippines: you in ${mine.place ?? "the Philippines"}, ${isClient ? "the notary" : s.clientName} in ${theirs.place ?? "the Philippines"}.`
    : mine === null ? "Share your location below: every party must be in the Philippines."
      : mine.outcome !== "within" ? `Your location check did not pass: ${mine.words.charAt(0).toLowerCase()}${mine.words.slice(1)}.`
        : theirs === null ? `${other} has not shared their location yet.` : `${other}'s location check did not pass.`;
  return { key: "location", label: "Both in the Philippines", done, detail };
}

const NOTARY_STEPS: readonly { title: string; text: string }[] = [
  { title: "Open the room", text: "The video call starts and the client is told." },
  { title: "Confirm the client's identity", text: "Compare their valid ID with the person on the call." },
  { title: "The client finalizes the document", text: "After that it cannot be replaced." },
  { title: "State the notarial act and your fee", text: "The client approves it, and pays a fee to your QR." },
  { title: "Apply your seal", text: "The document is sealed and entered in your notarial register." },
];

const CLIENT_STEPS: readonly { title: string; text: string }[] = [
  { title: "The notary opens the room", text: "This page moves on by itself, and the video call starts." },
  { title: "The notary confirms who you are", text: "Have your valid ID with you." },
  { title: "You finalize the document", text: "After that it cannot be replaced." },
  { title: "You approve the notarial act and the fee", text: "You are not charged before you approve." },
  { title: "The notary applies the seal", text: "You preview and download the notarized document." },
];

const ITEM_ICON: Record<ReadinessItem["key"], typeof UserRound> = {
  present: UserRound, document: FileText, identity: ShieldCheck, address: MapPin, location: LocateFixed,
};

/** The person's own picture before the call, and whether the camera and microphone are ready. */
function CameraCheck({ media, local }: { media: MediaState; local: MediaStream | null }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (el !== null && el.srcObject !== local) el.srcObject = local;
  }, [local]);
  const ready = media === "ready" && local !== null;
  const words = ready ? { title: "Your camera and microphone are ready", text: "The call starts the moment the room opens." }
    : media === "denied" ? { title: "Camera or microphone not allowed", text: "Allow them in your browser's address bar, then reload this page. The notary must see and hear you." }
      : media === "unsupported" ? { title: "This browser cannot make the call", text: "Use a recent Chrome, Edge, Safari or Firefox." }
        : { title: "Getting your camera ready…", text: "Your browser may ask to use the camera and microphone. Allow both." };
  return (
    <div className="eno-cam" data-testid="camera-check" data-ready={ready ? "yes" : "no"}>
      <div className="eno-cam-frame">
        {ready ? <video ref={video} autoPlay playsInline muted aria-label="Your camera" /> : media === "denied" || media === "unsupported" ? <CameraOff size={22} aria-hidden /> : <Camera size={22} aria-hidden />}
      </div>
      <div style={{ minWidth: 0 }} role="status">
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: ready ? E.ok : E.ink }}>{words.title}</span>
        <span style={{ display: "block", marginTop: 2, fontSize: 13, color: E.quiet, lineHeight: 1.5 }}>{words.text}</span>
      </div>
    </div>
  );
}

export function WaitingRoom({ session: s, isClient, partner, busy, onOpen, onCallOff, camera }: {
  session: Session; isClient: boolean; partner: string; busy: string | null;
  /** The notary opens the room; absent for the client. */
  onOpen?: () => void;
  onCallOff: () => void;
  /** The camera being made ready before the room opens; absent where no call follows. */
  camera?: { media: MediaState; local: MediaStream | null };
}) {
  const items = readinessOf(s, isClient);
  const ready = items.filter(item => item.done).length;
  const maroon = !isClient;
  const steps = isClient ? CLIENT_STEPS : NOTARY_STEPS;
  const title = isClient ? `Waiting for ${partner} to open the room`
    : s.presence.client ? `${partner} is in the waiting room` : `The session with ${partner}`;
  return (
    <section className="eno-wait" data-testid="waiting-room" aria-labelledby="waiting-room-title"
      style={{ ...GF, background: E.paper, border: `1px solid ${E.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -26px rgba(10,26,43,0.35)" }}>
      <style>{WAIT_STYLES}</style>
      <header style={{ padding: "clamp(16px, 3vw, 22px) clamp(16px, 3vw, 26px)", background: maroon ? E.crimson : "linear-gradient(120deg, #0B1F44 0%, #0563A6 100%)", color: "#FFFFFF", borderBottom: `3px solid ${maroon ? "#C9A24A" : E.sky}` }}>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: maroon ? "#F3D9A4" : "#BBDDF5", display: "flex", alignItems: "center", gap: 8 }}>
          <DoorOpen size={15} aria-hidden /> Waiting room
        </p>
        <h2 id="waiting-room-title" style={{ margin: "8px 0 0", fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(21px, 4.4vw, 27px)", lineHeight: 1.2, overflowWrap: "anywhere" }}>{title}</h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.9)", maxWidth: "64ch" }}>
          {isClient
            ? "Stay on this page. When the notary opens the room, the video call starts here. Only you and the notary are in it, and it is not recorded."
            : "Check where the session stands, then open the room. The call is between your browser and the client's, and it is not recorded."}
        </p>
      </header>

      <div className="eno-wait-grid">
        <section aria-labelledby="readiness-title" style={{ padding: "clamp(16px, 3vw, 22px) clamp(16px, 3vw, 26px)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h3 id="readiness-title" style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: E.quiet }}>Readiness</h3>
            <span data-testid="readiness-count" style={{ fontSize: 12.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: ready === items.length ? E.okWash : "#FFF3D6", color: ready === items.length ? E.ok : "#7A5200" }}>
              {ready} of {items.length} ready
            </span>
          </div>
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
            {items.map((item, i) => {
              const Icon = ITEM_ICON[item.key];
              return (
                <li key={item.key} data-testid={`readiness-${item.key}`} data-done={item.done ? "yes" : "no"}
                  style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid ${E.line}` }}>
                  <span aria-hidden="true" style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: maroon ? E.maroonWash : E.skyWash, color: maroon ? E.maroon : E.skyDeep }}>
                    <Icon size={16} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: E.ink }}>{item.label}</span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 13, color: E.quiet, lineHeight: 1.5, overflowWrap: "anywhere" }}>{item.detail}</span>
                  </span>
                  <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: item.done ? E.ok : "#8A5A00", marginTop: 2 }}>
                    {item.done ? <CheckCircle2 size={17} aria-hidden /> : <CircleDashed size={17} aria-hidden />}
                    <span>{item.done ? "Ready" : "Waiting"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="session-steps-title" style={{ padding: "clamp(16px, 3vw, 22px) clamp(16px, 3vw, 26px)", background: "#FBFCFE" }}>
          {camera !== undefined && <CameraCheck media={camera.media} local={camera.local} />}
          <h3 id="session-steps-title" style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: E.quiet }}>The steps of the session</h3>
          <ol style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
            {steps.map((step, i) => (
              <li key={step.title} style={{ display: "flex", gap: 12, padding: "9px 0" }}>
                <span aria-hidden="true" style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 800, border: `1.5px solid ${maroon ? E.maroonLine : E.skyLine}`, background: "#FFFFFF", color: maroon ? E.maroon : E.skyDeep }}>{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: E.ink }}>{step.title}</span>
                  <span style={{ display: "block", fontSize: 13, color: E.quiet, lineHeight: 1.5 }}>{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer style={{ padding: "4px clamp(16px, 3vw, 26px) clamp(16px, 3vw, 22px)", borderTop: `1px solid ${E.line}` }}>
        <WaitNote isClient={isClient} ready={ready === items.length} />
        {!isClient && onOpen !== undefined ? (
          // The notary's two actions share one row at the right, on a phone too (half the row each). "Open the room"
          // is first for a keyboard and a screen reader, and is shown on the right.
          <div className="eno-wait-actions" data-testid="waiting-actions">
            <div className="eno-wait-action">
              <ActionButton icon={DoorOpen} disabled={busy !== null} onClick={onOpen} full>
                {busy === "open" ? "Opening…" : "Open the room"}
              </ActionButton>
            </div>
            <div className="eno-wait-action">
              <ActionButton kind="secondary" icon={XCircle} disabled={busy !== null} onClick={onCallOff} full>
                {busy === "cancel" ? "Calling off…" : "Call off the session"}
              </ActionButton>
            </div>
          </div>
        ) : (
          <ActionRow align="end">
            <ActionButton kind="secondary" icon={XCircle} disabled={busy !== null} onClick={onCallOff}>
              {busy === "cancel" ? "Calling off…" : "Call off the session"}
            </ActionButton>
          </ActionRow>
        )}
      </footer>
    </section>
  );
}

function WaitNote({ isClient, ready }: { isClient: boolean; ready: boolean }) {
  return (
    <p data-testid="waiting-note" style={{ margin: "14px 0 0", fontSize: 13, color: E.quiet, lineHeight: 1.55 }}>
      {isClient
        ? "Calling off ends the session for both of you, and nothing is notarized."
        : ready
          ? "Everything is in. Open the room when you are ready to meet."
          : "You may open the room before every item is ready: what is missing can be done on the call. The act cannot be recorded until it is."}
    </p>
  );
}
