// The page every step of one eNotary request is shown in, for the client and for the notary: a hero with the
// request's title, the steps as one joined bar, the other person's card on the left with the facts of the
// request, the step's own panels on the right. The audit trail is kept out of the way: a button at the bottom right
// opens it as a panel in the middle of the page.
//
// It follows the eNotary pages of 13 October (client side and attorney side, wide and narrow): the same parts
// in the same order. Presentational only: what a page says and does is the page's.

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft, Banknote, ClipboardList, Clock, FileText, Hash, MapPin, ScrollText, ShieldCheck, Stamp, X, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { GF } from "../../../components/system/design-system";
import { Z } from "../../../utils/z-index";
import { PersonAvatar, brandGradient } from "../contacts/contacts-ui";
import { useCounterpart } from "./useCounterpart";
import { E, EnotaryRail, EnotarySeal, SERIF, type EnotaryTone } from "./EnotaryChrome";

/** The client's eight steps, in the order of the pages. */
export const CLIENT_STEPS = [
  { id: "lawyer", label: "Lawyer selected" }, { id: "identity", label: "Verify your identity" },
  { id: "joins", label: "Lawyer joins" }, { id: "call", label: "Video call" },
  { id: "document", label: "Your document" }, { id: "finalized", label: "Finalized for eNotary" },
  { id: "notarized", label: "Notarized" }, { id: "copy", label: "Certified True Copy" },
] as const;

/** The notary's eight steps, in the order of the pages. */
export const NOTARY_STEPS = [
  { id: "received", label: "Request received" }, { id: "verified", label: "Client verified" },
  { id: "accept", label: "You accept" }, { id: "call", label: "Video call" },
  { id: "document", label: "Client's document" }, { id: "fee", label: "Act and fee" },
  { id: "notarized", label: "Notarized" }, { id: "copy", label: "Certified True Copy" },
] as const;

export type ClientStepId = (typeof CLIENT_STEPS)[number]["id"];
export type NotaryStepId = (typeof NOTARY_STEPS)[number]["id"];

const CASE_STYLES = `
  .eno-case-hero { position: relative; overflow: hidden; background: linear-gradient(180deg, #E6F1FB 0%, #F1F7FD 100%); border-bottom: 1px solid ${E.line}; }
  .eno-case-hero.is-attorney { background: linear-gradient(110deg, #7E1229 0%, #951A33 48%, #A81E36 100%); border-bottom: 3px solid #C9A24A; }
  .eno-case-hero.is-attorney::before, .eno-case-hero.is-attorney::after { content: ""; position: absolute; border-radius: 50%; pointer-events: none; }
  .eno-case-hero.is-attorney::before { width: 520px; height: 520px; right: -120px; top: -230px; border: 46px solid rgba(255,255,255,0.06); }
  .eno-case-hero.is-attorney::after { width: 300px; height: 300px; right: 60px; top: -150px; border: 2px solid rgba(255,255,255,0.08); }
  .eno-case-hero.is-attorney .eno-back { color: #FFFFFF !important; opacity: 0.9; }
  .eno-case-hero.is-attorney .eno-back:hover { opacity: 1; text-decoration: underline !important; }
  .eno-case-hero-in { position: relative; margin: 0 auto; padding: clamp(18px, 3vw, 28px) clamp(14px, 4vw, 28px) clamp(16px, 3vw, 26px); box-sizing: border-box; max-width: 1180px; }
  .eno-case-body { margin: 0 auto; padding: clamp(14px, 3vw, 22px) clamp(10px, 4vw, 28px) 56px; box-sizing: border-box; max-width: 1180px; }
  .eno-case-grid { display: grid; grid-template-columns: minmax(250px, 330px) minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (max-width: 860px) { .eno-case-grid { grid-template-columns: minmax(0, 1fr); } }
  .eno-split { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (max-width: 960px) { .eno-split { grid-template-columns: minmax(0, 1fr); } }
  .eno-case-card { animation: eno-in 260ms ease both; }
  .eno-party-seal { position: absolute; right: 14px; top: 10px; width: 84px; }
  .eno-party-seal svg { width: 84px; height: auto; display: block; }
`;

export interface PartyRow { readonly label: string; readonly value: ReactNode; readonly mono?: boolean; readonly testId?: string; readonly icon?: ComponentType<LucideProps>; readonly good?: boolean }

/** The icon a fact is shown with, from its label when the page names none. */
function rowIcon(row: PartyRow): ComponentType<LucideProps> {
  if (row.icon !== undefined) return row.icon;
  const label = row.label.toLowerCase();
  if (/place|city|where/.test(label)) return MapPin;
  if (/reference|number|no\./.test(label)) return Hash;
  if (/identity|verified|id\b/.test(label)) return ShieldCheck;
  if (/fee|paid|amount/.test(label)) return Banknote;
  if (/received|sent|date|time|answered/.test(label)) return Clock;
  return FileText;
}

export const initialsOf = (name: string): string => {
  const words = name.replace(/\([^)]*\)/g, " ").replace(/^\s*atty\.?\s+/i, "").split(/\s+/).filter(word => word !== "");
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1]?.[0] ?? "" : "")).toUpperCase() || "?";
};

/** Opens the audit trail's panel; a card's "Audit trail" link uses it. Does nothing outside a case frame. */
const OpenTrail = createContext<() => void>(() => undefined);

/** The other person's card: who they are, where the request stands, and its facts. */
export function PartyCard({ name, role, tone, status, rows, auditCount, invitationId, verifiedName = false }: {
  name: string; role: string; tone: EnotaryTone; status: { label: string; tone: "wait" | "ok" | "info" | "end" };
  rows: readonly PartyRow[]; auditCount: number | null;
  /** The request, so the card can show the person's own photo and banner colour. */
  invitationId?: string | undefined;
  /** The name is the one LAGDA's identity check read from the person's valid ID: the card says so under it. */
  verifiedName?: boolean;
}) {
  const look = useCounterpart(invitationId);
  const maroon = tone === "attorney";
  const openTrail = useContext(OpenTrail);
  const pill: Record<string, CSSProperties> = {
    wait: { background: "#FFF3D6", color: "#7A5200" }, ok: { background: E.okWash, color: E.ok },
    info: { background: E.skyWash, color: E.skyDeep }, end: { background: E.wash, color: E.quiet },
  };
  return (
    <aside className="eno-case-card" data-testid="party-card" aria-label={`${name}, ${role}`}
      style={{ ...GF, background: E.paper, border: `1px solid ${E.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -22px rgba(10,26,43,0.3)" }}>
      <div style={{ position: "relative", height: 112, background: look.brandColor !== null ? brandGradient(look.brandColor) : maroon ? E.crimson : "linear-gradient(120deg, #0563A6 0%, #0A84D6 60%, #5BB0EA 100%)" }} data-testid="party-banner">
        {maroon && <div className="eno-party-seal" aria-hidden="true"><EnotarySeal idPrefix="party-seal" /></div>}
      </div>
      <div style={{ position: "relative", zIndex: 1, marginTop: -52, display: "flex", justifyContent: "center" }}>
        {look.avatarUrl !== undefined ? (
          <div data-testid="party-photo"><PersonAvatar name={name} avatarUrl={look.avatarUrl} size={104} ring /></div>
        ) : (
          <div aria-hidden="true" style={{ width: 104, height: 104, borderRadius: 22, background: maroon ? E.maroonWash : E.skyWash, border: "5px solid #FFFFFF", boxShadow: "0 6px 18px rgba(10,26,43,0.18)", display: "grid", placeItems: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 38, color: maroon ? E.maroon : E.skyDeep }}>
            {initialsOf(name)}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 20px 20px", textAlign: "center" }}>
        <h2 data-testid="party-name" style={{ margin: 0, fontFamily: SERIF, fontSize: 21, color: E.navy, overflowWrap: "anywhere" }}>{name}</h2>
        {verifiedName && (
          <p data-testid="party-name-verified" style={{ margin: "7px 0 0", display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: E.okWash, color: E.ok, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.02em" }}>
            <ShieldCheck size={13} aria-hidden /> Name on valid ID &middot; Verified by LAGDA
          </p>
        )}
        <p style={{ margin: verifiedName ? "8px 0 0" : "6px 0 0", fontSize: 13, color: E.quiet, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}><Stamp size={13} aria-hidden color={maroon ? "#B08A3E" : E.skyDeep} /> {role}</p>
        <div style={{ width: "62%", height: 1, background: E.line, margin: "14px auto 14px" }} />
        <span data-testid="party-status" style={{ ...pill[status.tone], display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: "currentColor" }} />{status.label}
        </span>
      </div>
      <dl style={{ margin: 0, padding: 0, textAlign: "left" }}>
        {rows.map(row => {
          const Icon = rowIcon(row);
          return (
            <div key={row.label} data-testid={row.testId} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "13px 20px", borderTop: `1px solid ${E.line}`, background: "#FCFDFE" }}>
              <span aria-hidden="true" style={{ flex: "0 0 auto", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: maroon ? "#F6EFDF" : E.skyWash, color: maroon ? "#9A7A3A" : E.skyDeep }}><Icon size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <dt style={{ fontSize: 11, color: E.quiet, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{row.label}</dt>
                <dd style={{ margin: "3px 0 0", fontSize: 14.5, fontWeight: 700, color: row.good === true ? E.ok : E.ink, overflowWrap: "anywhere", fontFamily: row.mono === true ? "ui-monospace, Menlo, Consolas, monospace" : undefined }}>{row.value}</dd>
              </div>
            </div>
          );
        })}
      </dl>
      {auditCount !== null && (
        <button type="button" onClick={openTrail} data-testid="party-audit"
          style={{ ...GF, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", border: 0, background: E.navy, color: "#FFFFFF", cursor: "pointer", fontSize: 14.5, fontWeight: 700, textAlign: "left" }}>
          <ScrollText size={17} aria-hidden /> <span style={{ flex: 1 }}>View Audit Trail</span>
          <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.16)", borderRadius: 999, padding: "3px 10px" }}>{auditCount} {auditCount === 1 ? "entry" : "entries"}</span>
        </button>
      )}
    </aside>
  );
}

/** The audit trail, hidden until asked for: a button at the bottom right of the window, and the trail as a panel in the middle. */
function TrailToggle({ open, onOpen, onClose, children }: { open: boolean; onOpen: () => void; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); };
  }, [open, onClose]);
  return (
    <>
      <style>{`@media (max-width: 860px) { .eno-trail-fab { width: 48px; padding: 0 !important; justify-content: center; } .eno-trail-fab span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); } }`}</style>
      <button type="button" onClick={onOpen} data-testid="audit-toggle" aria-haspopup="dialog" aria-expanded={open} aria-label="Audit trail" className="eno-trail-fab"
        style={{ ...GF, position: "fixed", right: "clamp(12px, 3vw, 24px)", bottom: "clamp(12px, 3vw, 24px)", zIndex: Z.sticky, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 46, padding: "0 18px", borderRadius: 999, border: `1px solid ${E.navy}`, background: E.navy, color: "#FFFFFF", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 10px 26px -10px rgba(10,26,43,0.55)" }}>
        <ClipboardList size={18} aria-hidden /> <span>Audit trail</span>
      </button>
      {open && (
        <div data-testid="audit-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
          style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "grid", placeItems: "center", padding: "clamp(10px, 3vw, 24px)", background: "rgba(10,26,43,0.5)" }}>
          <div ref={panel} role="dialog" aria-modal="true" aria-label="Audit trail" tabIndex={-1}
            style={{ position: "relative", width: "min(720px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", borderRadius: 16, background: E.paper, boxShadow: "0 30px 80px -20px rgba(10,26,43,0.6)", outline: "none" }}>
            <button type="button" onClick={onClose} aria-label="Close the audit trail" data-testid="audit-close"
              style={{ position: "absolute", right: 10, top: 10, zIndex: 1, width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${E.line}`, background: "#FFFFFF", color: E.navy, cursor: "pointer" }}>
              <X size={18} aria-hidden />
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

/** One page of a request. `party` is the card on the left; `children` are the step's panels on the right. */
export function EnotaryCaseFrame({ tone, eyebrow, reference, title, lead, steps, current, back, party, children, trail }: {
  tone: EnotaryTone; eyebrow: string; reference?: string | null; title: string; lead?: ReactNode;
  steps?: readonly { readonly id: string; readonly label: string }[]; current?: string;
  back?: { to: string; label: string }; party?: ReactNode; children: ReactNode; trail?: ReactNode;
}) {
  const [trailOpen, setTrailOpen] = useState(false);
  return (
    <OpenTrail.Provider value={() => { setTrailOpen(true); }}>
    <div className="eno-page" style={GF}>
      <style>{CASE_STYLES}</style>
      <div className={tone === "attorney" ? "eno-case-hero is-attorney" : "eno-case-hero"}>
        <div className="eno-case-hero-in">
          {back !== undefined && (
            <p style={{ margin: "0 0 10px" }}>
              <Link to={back.to} className="eno-back" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, color: E.navy, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                <ArrowLeft size={16} aria-hidden /> {back.label}
              </Link>
            </p>
          )}
          <p data-testid="case-eyebrow" style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: tone === "attorney" ? "#F3D9A4" : "#4A9DDB", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {tone === "attorney" && <Stamp size={15} aria-hidden color="#E9C27A" />}{eyebrow}{reference !== undefined && reference !== null && <> <span aria-hidden="true">&bull;</span> <span style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: "0.08em" }}>{reference}</span></>}
          </p>
          <h1 data-testid="case-title" style={{ margin: 0, fontFamily: SERIF, fontWeight: 700, color: tone === "attorney" ? "#FFFFFF" : E.navy, letterSpacing: "-0.015em", fontSize: "clamp(26px, 5.4vw, 42px)", textShadow: tone === "attorney" ? "0 1px 2px rgba(0,0,0,0.18)" : undefined, lineHeight: 1.12, overflowWrap: "anywhere" }}>{title}</h1>
          {lead !== undefined && <p style={{ margin: "12px 0 0", fontSize: "clamp(14px, 3.6vw, 16px)", color: tone === "attorney" ? "rgba(255,255,255,0.9)" : E.quiet, lineHeight: 1.55, maxWidth: "62ch" }}>{lead}</p>}
          {steps !== undefined && current !== undefined && <div style={{ marginTop: 20 }}><EnotaryRail steps={steps} current={current} label="Steps of this request" /></div>}
        </div>
      </div>
      <div className="eno-case-body">
        {party === undefined ? (
          <div style={{ minWidth: 0, display: "grid", gap: 16 }}>{children}</div>
        ) : (
          <div className="eno-case-grid">
            {party}
            <div style={{ minWidth: 0, display: "grid", gap: 16 }}>{children}</div>
          </div>
        )}
      </div>
      {trail !== undefined && (
        <TrailToggle open={trailOpen} onOpen={() => { setTrailOpen(true); }} onClose={() => { setTrailOpen(false); }}>{trail}</TrailToggle>
      )}
    </div>
    </OpenTrail.Provider>
  );
}

export interface TrailEntry { readonly at: string; readonly sort?: string; readonly text: string; readonly by: "client" | "notary" | "system"; readonly actor: string }

/** Everything that happened to the request, newest first, with a button for the PDF. Entries cannot be edited. */
export function AuditTrailPanel({ entries, reference, onDownload, downloading, tone }: {
  entries: readonly TrailEntry[]; reference: string | null; tone: EnotaryTone;
  onDownload?: () => void; downloading?: boolean;
}) {
  const newest = [...entries].sort((a, b) => (b.sort ?? b.at).localeCompare(a.sort ?? a.at));
  return (
    <section id="audit-trail" data-testid="audit-trail" aria-labelledby="audit-heading"
      style={{ ...GF, padding: "22px clamp(14px, 3vw, 28px)" }}>
      <h2 id="audit-heading" style={{ margin: 0, fontSize: 19, color: E.navy, paddingRight: 44 }}>Audit trail</h2>
      <p style={{ margin: "6px 0 14px", fontSize: 13.5, color: E.quiet }}>
        A complete record of this request, kept by LAGDA eNotary. {tone === "attorney" ? "The client sees the same entries. " : ""}Entries cannot be edited or removed.
      </p>
      <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>
        <strong data-testid="audit-count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</strong>
        {reference !== null && <span style={{ color: E.quiet }}> &middot; Request reference <span style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{reference}</span></span>}
      </p>
      {newest.length === 0 ? (
        <p style={{ margin: 0, padding: 16, border: `1px dashed ${E.line}`, borderRadius: 10, textAlign: "center", color: E.quiet, fontSize: 14 }}>No entries yet. The record starts when a request is sent to a notary.</p>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {newest.map((entry, i) => (
            <li key={`${entry.at}-${String(i)}`} data-testid="audit-entry" style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${E.line}` }}>
              <span aria-hidden="true" style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800,
                background: entry.by === "notary" ? E.maroonWash : E.skyWash, color: entry.by === "notary" ? E.maroon : E.skyDeep, border: `1px solid ${entry.by === "notary" ? E.maroonLine : E.skyLine}` }}>
                {entry.by === "notary" ? "NP" : entry.by === "client" ? "CL" : "SY"}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: SERIF, fontSize: 15.5, color: E.ink }}>{entry.text}</span>
                <small style={{ color: E.quiet, fontSize: 12.5 }}>{entry.at} &middot; {entry.actor}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
      {onDownload !== undefined && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" onClick={onDownload} disabled={downloading === true || entries.length === 0} data-testid="audit-download"
            style={{ ...GF, minHeight: 44, padding: "0 18px", borderRadius: 10, border: `1px solid ${E.skyLine}`, background: "#FFFFFF", color: E.skyDeep, fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: downloading === true ? 0.6 : 1 }}>
            {downloading === true ? "Preparing…" : "Download audit trail (PDF)"}
          </button>
        </div>
      )}
    </section>
  );
}
