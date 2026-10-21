// Step 6 of the client's room ("Finalized for eNotary"): the client has finalized the document, the notary states the
// notarial act and the fee, the client approves them (and pays a fee to the notary's QR), and the notary then seals.
//
// The same facts as before, set out as one console: a strip with the time, the room and the two people, and where step 6
// stands; the call and the chat; the document and the client's address; and the card for what the client does next.
// Nothing here is new behaviour: every line is read from the session the server sends, and every button is one the room
// already had.
//
// It arranges itself by the space it has: three columns on a wide screen, two on a tablet, and one on a phone, where the
// step's card comes straight after the call so the next thing to do is never far down the page.

import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, CheckCircle2, Clock, FileText, Hourglass, Info, Lock, ShieldCheck } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import { formatPesos, realEnotaryInvitationsService, type Invitation } from "../../../../services/real/enotary-invitations.service";
import { realEnotarySessionsService, type RoomMessage, type Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { ClientPaymentPanel } from "../payments/ClientPaymentPanel";
import { stampLabel } from "../requests/expiry";
import { Chat } from "./room-bits";
import type { RoomConnection } from "./useRoomConnection";

type Act = (name: string, work: () => Promise<Session>) => Promise<void>;

/** The console's look, shared by the client's step 6 and the notary's. */
export const CONSOLE_CSS = `
  .s6 { display: grid; gap: 16px; min-width: 0; }
  .s6-strip { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 18px; padding: 12px 16px; background: ${E.paper}; border: 1px solid ${E.line}; border-radius: 16px; box-shadow: 0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -28px rgba(10,26,43,0.3); }
  .s6-pills, .s6-people { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .s6-pill { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 12px; border-radius: 999px; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .s6-pill.live { background: #FFF1F1; border: 1px solid #F3C9C6; color: #B42318; font-variant-numeric: tabular-nums; font-size: 13px; font-weight: 800; }
  .s6-pill.live i { width: 8px; height: 8px; border-radius: 999px; background: #E5484D; box-shadow: 0 0 0 4px rgba(229,72,77,0.18); }
  .s6-pill.sky { background: ${E.skyWash}; border: 1px solid ${E.skyLine}; color: ${E.skyDeep}; }
  .s6-pill.ok { background: ${E.okWash}; border: 1px solid #B7E3CA; color: ${E.ok}; }
  .s6-pill.wait { background: #FFF6DD; border: 1px solid #EBD9A6; color: #7A5200; }
  .s6-person { display: inline-flex; align-items: center; gap: 10px; padding: 5px 14px 5px 5px; border-radius: 999px; border: 1px solid ${E.line}; background: #FBFCFE; min-width: 0; }
  .s6-ava { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; font-family: ${SERIF}; font-weight: 700; font-size: 14px; }
  .s6-ava.notary { background: ${E.maroonWash}; color: ${E.maroon}; border: 1px solid ${E.maroonLine}; }
  .s6-ava.client { background: ${E.skyWash}; color: ${E.skyDeep}; border: 1px solid ${E.skyLine}; }
  .s6-person b { display: block; font-size: 13.5px; overflow-wrap: anywhere; }
  .s6-person small { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: ${E.quiet}; font-weight: 600; }
  .s6-dot { width: 7px; height: 7px; border-radius: 999px; background: #22A55A; flex: 0 0 auto; }
  .s6-dot.off { background: #C9A227; }
  .s6-track { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: 11.5px; font-weight: 700; color: ${E.quiet}; }
  .s6-track li { display: inline-flex; align-items: center; gap: 6px; }
  .s6-track li + li::before { content: ""; width: 10px; height: 1.5px; background: #C9D4E0; }
  .s6-track span { display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 999px; border: 1px solid ${E.line}; background: #FFFFFF; white-space: nowrap; }
  .s6-track .done span { color: ${E.ok}; border-color: #B7E3CA; background: ${E.okWash}; }
  .s6-track .now span { color: #FFFFFF; border-color: ${E.sky}; background: ${E.sky}; }

  .s6-cols { display: grid; gap: 18px; align-items: start; min-width: 0; }
  .s6-cols.wide { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.05fr); }
  .s6-cols.medium { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
  .s6-cols.narrow { grid-template-columns: minmax(0, 1fr); }
  .s6-col { display: grid; gap: 16px; min-width: 0; align-content: start; }
  .s6-card { background: ${E.paper}; border: 1px solid ${E.line}; border-radius: 16px; box-shadow: 0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -28px rgba(10,26,43,0.3); min-width: 0; box-sizing: border-box; }
  .s6-card > * { box-sizing: border-box; }
  .s6-h { margin: 0; font-family: ${SERIF}; font-weight: 700; color: ${E.navy}; }
  .s6-small-h { margin: 0; font-size: 14.5px; font-weight: 800; color: ${E.navy}; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px 10px; }
  .s6-small-h span { font-size: 11.5px; font-weight: 700; color: ${E.quiet}; }

  .s6-doc { padding: 16px; display: grid; gap: 12px; }
  .s6-badge-ok { justify-self: start; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: ${E.okWash}; color: ${E.ok}; font-size: 12px; font-weight: 800; }
  .s6-meta { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: #F7FAFD; border: 1px solid ${E.line}; min-width: 0; }
  .s6-meta-ic { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: ${E.maroonWash}; color: ${E.maroon}; }
  .s6-meta b { display: block; font-size: 13.5px; overflow-wrap: anywhere; }
  .s6-meta small { display: block; color: ${E.quiet}; font-size: 12px; margin-top: 1px; }
  .s6-meta code { display: block; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: ${E.quiet}; margin-top: 3px; word-break: break-all; }

  .s6-chat { padding: 14px 16px; display: grid; gap: 10px; }

  .s6-act { padding: 18px; border-top: 4px solid ${E.sky}; display: grid; gap: 12px; }
  .s6-act-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  .s6-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: ${E.skyDeep}; display: inline-flex; align-items: center; gap: 7px; }
  .s6-wait { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: #FFF3D6; color: #7A5200; font-size: 12px; font-weight: 800; white-space: nowrap; }
  .s6-act h3 { margin: 0; font-family: ${SERIF}; font-weight: 700; color: ${E.navy}; font-size: 21px; line-height: 1.22; overflow-wrap: anywhere; }
  .s6-act p { margin: 0; font-size: 14px; line-height: 1.6; color: ${E.text}; }
  .s6-rows { margin: 0; }
  .s6-rows div { display: grid; grid-template-columns: minmax(96px, 128px) 1fr; gap: 10px; padding: 8px 0; border-top: 1px solid ${E.line}; font-size: 13.5px; }
  .s6-rows div:first-child { border-top: 0; }
  .s6-rows dt { color: ${E.quiet}; font-weight: 700; }
  .s6-rows dd { margin: 0; font-weight: 600; color: ${E.ink}; overflow-wrap: anywhere; }
  .s6-fee { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; background: #F7FAFD; border: 1px solid ${E.line}; }
  .s6-fee span { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${E.quiet}; }
  .s6-fee b { font-family: ${SERIF}; font-size: clamp(24px, 6vw, 30px); color: ${E.navy}; }
  .s6-consent { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; background: ${E.skyWash}; border: 1px solid ${E.skyLine}; font-size: 13.5px; font-weight: 600; color: ${E.ink}; line-height: 1.5; }
  .s6-hint { display: flex; align-items: flex-start; gap: 6px; font-size: 12.5px; color: ${E.quiet}; }
  .s6-hint svg { flex: 0 0 auto; margin-top: 2px; }
  .s6-approve { width: 100%; min-height: 50px; border: 0; border-radius: 12px; background: linear-gradient(110deg, #0563A6 0%, #0A84D6 100%); color: #FFFFFF; font: 800 15px 'Geist', sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 8px 16px; cursor: pointer; box-shadow: 0 12px 24px -14px rgba(5,99,166,0.9); text-align: center; }
  .s6-approve:hover { filter: brightness(1.05); }
  .s6-approve:focus-visible { outline: 3px solid rgba(10,132,214,0.45); outline-offset: 2px; }
  .s6-approve:disabled { opacity: 0.6; cursor: not-allowed; }
  .s6-next { padding: 12px 12px 4px; border-radius: 12px; background: #FBFCFE; border: 1px solid ${E.line}; }
  .s6-next p.t { margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${E.quiet}; }
  .s6-next ol { list-style: none; margin: 0; padding: 0; }
  .s6-next li { display: flex; gap: 10px; align-items: center; padding: 0 0 10px; font-size: 13px; color: ${E.text}; line-height: 1.45; }
  .s6-next li span { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center; font-size: 11px; font-weight: 800; border: 1.5px solid ${E.skyLine}; color: ${E.skyDeep}; background: #FFFFFF; }
  .s6-note { display: flex; gap: 9px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; background: ${E.skyWash}; border: 1px solid ${E.skyLine}; font-size: 13.5px; color: ${E.text}; line-height: 1.55; }

  .s6.notary .s6-track .now span { border-color: ${E.maroon}; background: ${E.maroon}; }
  .s6.notary .s6-act { border-top-color: ${E.maroon}; }
  .s6.notary .s6-eyebrow { color: ${E.maroon}; }
  @media (max-width: 520px) {
    .s6-strip { padding: 12px; }
    .s6-person { flex: 1 1 100%; }
    .s6-act { padding: 16px 14px; }
    .s6-act h3 { font-size: 19px; }
  }
`;

const initialsOf = (name: string): string => {
  const words = name.replace(/\([^)]*\)/g, " ").replace(/^\s*atty\.?\s+/i, "").split(/\s+/).filter(word => word !== "");
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1]?.[0] ?? "" : "")).toUpperCase() || "?";
};

const clock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${String(h)}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
};

const pesos = (centavos: number) => `PHP ${formatPesos(centavos)}`;

/** How wide the console may be: three columns, two, or one. */
export type ConsoleWidth = "wide" | "medium" | "narrow";
const WIDE = "(min-width: 1180px)";
const MEDIUM = "(min-width: 760px)";

export function useConsoleWidth(): ConsoleWidth {
  const read = (): ConsoleWidth => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "wide";
    return window.matchMedia(WIDE).matches ? "wide" : window.matchMedia(MEDIUM).matches ? "medium" : "narrow";
  };
  const [width, setWidth] = useState<ConsoleWidth>(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const lists = [window.matchMedia(WIDE), window.matchMedia(MEDIUM)];
    const changed = () => { setWidth(read()); };
    lists.forEach(list => { list.addEventListener("change", changed); });
    return () => { lists.forEach(list => { list.removeEventListener("change", changed); }); };
  }, []);
  return width;
}

/** Where step 6 stands, from the session: the act and fee stated, approved, paid, confirmed, notarized. */
export function stepSixStages(s: Session): { readonly label: string; readonly state: "done" | "now" | "todo" }[] {
  const statement = s.statement ?? null;
  const payment = s.payment ?? null;
  const noFee = (statement !== null && statement.feeCentavos === 0) || payment?.status === "waived";
  const stages: { label: string; reached: boolean }[] = [
    { label: "Act and fee stated", reached: statement !== null },
    { label: "You approve", reached: statement?.approvedAt != null },
    ...(noFee ? [] : [
      { label: "You pay", reached: payment !== null && (payment.status === "proof" || payment.status === "confirmed") },
      { label: "Notary confirms", reached: payment?.status === "confirmed" },
    ]),
    { label: "Notarized", reached: s.status === "notarized" },
  ];
  const firstOpen = stages.findIndex(stage => !stage.reached);
  return stages.map((stage, i) => ({ label: stage.label, state: stage.reached ? "done" : i === firstOpen ? "now" : "todo" }));
}

/** Where the notary's step 6 stands: the act and fee stated, the client's approval, the payment (when there is a fee), the seal. */
export function notaryStepSixStages(s: Session): { readonly label: string; readonly state: "done" | "now" | "todo" }[] {
  const statement = s.statement ?? null;
  const payment = s.payment ?? null;
  const noFee = (statement !== null && statement.feeCentavos === 0) || payment?.status === "waived";
  const stages: { label: string; reached: boolean }[] = [
    { label: "State", reached: statement !== null },
    { label: "Client approves", reached: statement?.approvedAt != null },
    ...(noFee ? [] : [{ label: "Payment", reached: payment?.status === "confirmed" }]),
    { label: "Seal", reached: s.status === "notarized" },
  ];
  const firstOpen = stages.findIndex(stage => !stage.reached);
  return stages.map((stage, i) => ({ label: stage.label, state: stage.reached ? "done" : i === firstOpen ? "now" : "todo" }));
}

/** The strip at the top of the console: the time, the room, the video, both people, and where step 6 stands. */
export function SessionStrip({ s, connection, partner }: { s: Session; connection: RoomConnection; partner: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => { clearInterval(timer); };
  }, []);
  const opened = s.openedAt === null ? null : Date.parse(s.openedAt);
  const link = connection.link;
  const video = link === "connected" ? { tone: "ok", text: "Video connected" }
    : link === "failed" ? { tone: "wait", text: "Video not connected" }
      : link === "connecting" ? { tone: "sky", text: "Connecting the video…" }
        : { tone: "wait", text: "Waiting for the video" };
  const verified = s.clientIdentity?.verified === true;
  const notary = s.role === "notary";
  const stages = notary ? notaryStepSixStages(s) : stepSixStages(s);
  const partnerHere = notary ? s.presence.client : s.presence.notary;
  return (
    <section className="s6-strip" aria-label="The session" data-testid="s6-strip">
      <div className="s6-pills">
        {opened !== null && <span className="s6-pill live" data-testid="s6-time"><i aria-hidden="true" />{clock((now - opened) / 1000)}</span>}
        <span className="s6-pill sky"><Lock size={13} aria-hidden /> Private room</span>
        <span className={`s6-pill ${video.tone}`} data-testid="s6-video">{video.text}</span>
      </div>
      <div className="s6-people">
        <span className="s6-person" data-testid="s6-partner">
          <span className={`s6-ava ${notary ? "client" : "notary"}`} aria-hidden="true">{initialsOf(partner)}</span>
          <span><b>{partner}</b><small><span className={`s6-dot${partnerHere ? "" : " off"}`} aria-hidden="true" />
            {notary ? `Client${verified ? " · Identity verified by LAGDA" : ""}` : "Notary public"} · {partnerHere ? "Joined" : "Not here yet"}</small></span>
        </span>
        <span className="s6-person" data-testid="s6-self">
          <span className={`s6-ava ${notary ? "notary" : "client"}`} aria-hidden="true">{initialsOf(notary ? s.notaryName : s.clientName)}</span>
          <span><b>You</b><small><span className="s6-dot" aria-hidden="true" />{notary ? "Notary public · In the room" : `Client${verified ? " · Identity verified by LAGDA" : ""}`}</small></span>
        </span>
      </div>
      <ol className="s6-track" aria-label="Where step 6 stands" data-testid="s6-track">
        {stages.map(stage => (
          <li key={stage.label} className={stage.state === "todo" ? undefined : stage.state} {...(stage.state === "now" ? { "aria-current": "step" as const } : {})}>
            <span>{stage.state === "done" && <CheckCircle2 size={12} aria-hidden />}{stage.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DocumentCard({ s, viewer }: { s: Session; viewer: ReactNode }) {
  const doc = s.document;
  return (
    <section className="s6-card s6-doc" data-testid="document-panel" aria-labelledby="s6-doc-h">
      <h2 id="s6-doc-h" className="s6-h" style={{ fontSize: 19 }}>Document for notarization</h2>
      {s.finalizedAt != null && <span className="s6-badge-ok" data-testid="s6-finalized"><CheckCircle2 size={13} aria-hidden /> Finalized by you · {stampLabel(s.finalizedAt)}</span>}
      {doc !== null && (
        <div className="s6-meta" data-testid="document-info">
          <span className="s6-meta-ic" aria-hidden="true"><FileText size={17} /></span>
          <span style={{ minWidth: 0 }}>
            <b>{doc.name}</b>
            <small>{(doc.size / 1024).toFixed(0)} KB · added {stampLabel(doc.addedAt)}</small>
            <code>SHA-256 {doc.sha256}</code>
          </span>
        </div>
      )}
      {viewer}
    </section>
  );
}

export function ChatCard({ s, partner, messages, onSend }: { s: Session; partner: string; messages: readonly RoomMessage[]; onSend: (body: string) => Promise<void> }) {
  return (
    <section className="s6-card s6-chat" data-testid="chat-panel" aria-labelledby="s6-chat-h">
      <h3 id="s6-chat-h" className="s6-small-h">Chat with {partner}<span>{messages.length} {messages.length === 1 ? "message" : "messages"}</span></h3>
      <Chat messages={[...messages]} me={s.role} disabled={false} onSend={onSend} />
    </section>
  );
}

/** The card for what the client does in step 6, in the order the server's facts allow. */
export function StepSixCard({ s, busy, act, onChanged, partner }: { s: Session; busy: string | null; act: Act; onChanged: () => void; partner: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const statement = s.statement ?? null;
  const payment = s.payment ?? null;
  const owes = payment !== null && (payment.status === "awaiting" || payment.status === "proof" || payment.status === "not_received");
  // The payment panel reads the request, so the card fetches it only while a fee is owed.
  useEffect(() => {
    if (!owes) return;
    let alive = true;
    void realEnotaryInvitationsService.get(s.invitationId).then(found => { if (alive && found !== null) setInvitation(found); }, () => undefined);
    return () => { alive = false; };
  }, [owes, s.invitationId, s.status, payment?.status]);

  const top = (badge: ReactNode) => (
    <div className="s6-act-top">
      <span className="s6-eyebrow"><BadgeCheck size={14} aria-hidden /> Step 6 · Finalized</span>
      {badge}
    </div>
  );

  if (statement === null) {
    return (
      <section className="s6-card s6-act" data-testid="finalized-panel" aria-labelledby="s6-act-h">
        {top(<span className="s6-wait"><Hourglass size={12} aria-hidden /> The notary is reviewing</span>)}
        <h3 id="s6-act-h">Finalized: the notary is reviewing</h3>
        <p>{partner} confirms who you are on the call, then states the notarial act and the fee. You are not charged before you approve it.</p>
      </section>
    );
  }

  if (statement.approvedAt === null) {
    const free = statement.feeCentavos === 0;
    return (
      <section className="s6-card s6-act" data-testid="approve-panel" aria-labelledby="s6-act-h">
        {top(<span className="s6-wait"><Clock size={12} aria-hidden /> Needs your approval</span>)}
        <h3 id="s6-act-h">{partner} confirmed the notarial act and the fee</h3>
        <dl className="s6-rows">
          <div><dt>Notary</dt><dd>{partner}</dd></div>
          {s.document !== null && <div><dt>Document</dt><dd>{s.document.name}</dd></div>}
          <div><dt>Notarial act</dt><dd>{statement.actTypeLabel}</dd></div>
          <div><dt>Note from the notary</dt><dd>{statement.note}</dd></div>
        </dl>
        <div className="s6-fee"><span>Fee</span><b data-testid="stated-fee">{free ? "No fee" : pesos(statement.feeCentavos)}</b></div>
        <div className="s6-consent" data-testid="consent-text"><ShieldCheck size={18} aria-hidden style={{ flex: "0 0 auto", color: E.skyDeep, marginTop: 1 }} /><span>{s.consent.text}</span></div>
        <p className="s6-hint"><Info size={14} aria-hidden /> You pay only when you approve. The notary completes the notarization after that.</p>
        <button type="button" className="s6-approve" disabled={busy !== null} onClick={() => { void act("approve", () => realEnotarySessionsService.approve(s.id)); }}>
          <ShieldCheck size={17} aria-hidden />{busy === "approve" ? "Approving…" : free ? "Approve" : `Approve and pay ${pesos(statement.feeCentavos)}`}
        </button>
        <div className="s6-next" data-testid="s6-next">
          <p className="t">After you approve</p>
          <ol>
            {free ? (
              <li><span>1</span>There is nothing to pay. The notary applies the seal, and you are told here.</li>
            ) : (
              <>
                <li><span>1</span>Pay {pesos(statement.feeCentavos)} to the notary&rsquo;s GCash QR.</li>
                <li><span>2</span>Send the reference number and a screenshot of your receipt.</li>
                <li><span>3</span>The notary confirms the payment from their own GCash.</li>
                <li><span>4</span>The notary applies the seal, and you are told here.</li>
              </>
            )}
          </ol>
        </div>
      </section>
    );
  }

  if (payment !== null && payment.status !== "confirmed" && payment.status !== "waived") {
    return invitation !== null && invitation.payment !== null && invitation.payment !== undefined
      ? <ClientPaymentPanel invitation={invitation} payment={invitation.payment} onChanged={next => { setInvitation(next); onChanged(); }} />
      : <section className="s6-card s6-act" data-testid="payment-loading"><p>Opening the payment…</p></section>;
  }

  return (
    <section className="s6-card s6-act" data-testid="approved-panel" aria-labelledby="s6-act-h">
      {top(<span className="s6-badge-ok"><CheckCircle2 size={12} aria-hidden /> {payment !== null && payment.status === "confirmed" ? "Payment received" : "Approved"}</span>)}
      <h3 id="s6-act-h">{payment !== null && payment.status === "confirmed" ? "Payment received" : "Approved"}</h3>
      <p data-testid="approved-note">
        {statement.feeCentavos === 0 ? "No fee for this request. " : `The notary confirmed your payment of ${pesos(statement.feeCentavos)}. `}
        The notary completes the notarization next. You are told here as soon as it is done.
      </p>
    </section>
  );
}

/** The whole of step 6 for the client, laid out for the space it has. */
export function ClientStepSix({ s, partner, connection, call, viewer, address, messages, onSend, busy, act, onChanged }: {
  s: Session; partner: string; connection: RoomConnection; call: ReactNode;
  /** The document's viewer, given the height that suits the layout. */
  viewer: (height: number) => ReactNode; address: ReactNode;
  messages: readonly RoomMessage[]; onSend: (body: string) => Promise<void>; busy: string | null; act: Act; onChanged: () => void;
}) {
  const width = useConsoleWidth();
  const video = <div key="video" data-testid="video-panel">{call}</div>;
  const chat = <ChatCard key="chat" s={s} partner={partner} messages={messages} onSend={onSend} />;
  const doc = <DocumentCard key="doc" s={s} viewer={viewer(width === "narrow" ? 380 : 470)} />;
  const where = <div key="address">{address}</div>;
  const step = <StepSixCard key="step" s={s} busy={busy} act={act} onChanged={onChanged} partner={partner} />;
  const columns: ReactNode[][] = width === "wide" ? [[video, chat], [doc, where], [step]]
    : width === "medium" ? [[video, chat, where], [step, doc]]
      : [[video, step, where, doc, chat]];
  return (
    <div className="s6" data-testid="client-step-six" data-width={width} style={GF}>
      <style>{CONSOLE_CSS}</style>
      <SessionStrip s={s} connection={connection} partner={partner} />
      <div className={`s6-cols ${width}`}>
        {columns.map((column, i) => <div key={i} className="s6-col">{column}</div>)}
      </div>
    </div>
  );
}
