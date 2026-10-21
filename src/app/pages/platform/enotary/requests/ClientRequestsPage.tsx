// /app/enotary/requests — the client's Notarial Request History: every request they made to a notary, newest first, with
// its number, what they asked for, where it stands (and, while open, how long it has left), and the invoice of a request
// with a fee. They can find one by what they remember of it, and filter by where it stands with the four counts at the
// top.
//
// A crimson hero with the way back to the LAGDA dashboard; under it the four counts, which are also the filters; then
// one card per request: the notary, its number, office and when it was sent, where it stands as four small steps, and the
// invoice when there is a fee. The page's shell (its header and footer) is the eNotary layout's, unchanged.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, Clock, Download, Eye, FileText, List, MapPin, Scale, Search, Send, Stamp, X, type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import { GF } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  formatPesos, invitationIsOpen, realEnotaryInvitationsService, type Invitation, type InvitationStatus,
} from "../../../../services/real/enotary-invitations.service";
import { realEnotarySessionsService, saveBlobAs } from "../../../../services/real/enotary-sessions.service";
import { ENOTARY_DIRECTORY_PATH } from "../../../../config/enotary-directory";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, linkButton, statusLabel, useNow } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryTone, stampLabel } from "./expiry";

const MAROON_HERO = "linear-gradient(110deg, #6E0F24 0%, #84152E 48%, #9A1B36 100%)";

const STYLES = `
  .rh { font-family: 'Geist', sans-serif; background: ${E.ground}; }
  .rh-hero { background: ${MAROON_HERO}; color: #FFFFFF; position: relative; overflow: hidden; }
  .rh-hero::after { content: ""; position: absolute; width: 460px; height: 460px; right: -140px; top: -220px; border-radius: 50%; border: 40px solid rgba(255,255,255,0.05); pointer-events: none; }
  .rh-hero-in { position: relative; max-width: 1180px; margin: 0 auto; padding: 22px clamp(14px, 4vw, 28px) 74px; box-sizing: border-box; }
  .rh-back { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.55); color: #FFFFFF; text-decoration: none; font-size: 13.5px; font-weight: 700; transition: background 140ms ease; }
  .rh-back:hover { background: rgba(255,255,255,0.12); }
  .rh-back:focus-visible { outline: 3px solid #F3D9A4; outline-offset: 2px; }
  .rh-title-row { display: flex; gap: 16px; align-items: center; margin-top: 18px; }
  .rh-mark { flex: 0 0 auto; width: 60px; height: 60px; border-radius: 999px; display: grid; place-items: center; border: 2px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.1); box-shadow: inset 0 0 0 4px rgba(255,255,255,0.06); }
  .rh-eyebrow { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; color: rgba(255,255,255,0.85); }
  .rh-h1 { margin: 2px 0 0; font-family: ${SERIF}; font-weight: 700; font-size: clamp(28px, 5.4vw, 40px); line-height: 1.1; letter-spacing: -0.01em; }
  .rh-lead { margin: 8px 0 0; max-width: 62ch; font-size: clamp(14px, 3.6vw, 15.5px); line-height: 1.55; color: rgba(255,255,255,0.9); }
  .rh-body { max-width: 1180px; margin: 0 auto; padding: 0 clamp(14px, 4vw, 28px) 56px; box-sizing: border-box; }
  .rh-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: -40px; position: relative; z-index: 1; }
  .rh-stat { display: flex; align-items: center; gap: 12px; padding: 14px 14px; border-radius: 14px; border: 1px solid ${E.line}; background: #FFFFFF; box-shadow: 0 1px 2px rgba(10,26,43,0.05), 0 14px 30px -20px rgba(10,26,43,0.4); cursor: pointer; text-align: left; font: inherit; color: ${E.ink}; transition: border-color 140ms ease, transform 100ms ease; }
  .rh-stat:hover { border-color: ${E.maroonLine}; transform: translateY(-1px); }
  .rh-stat:focus-visible { outline: 3px solid rgba(140,29,63,0.35); outline-offset: 2px; }
  .rh-stat[aria-pressed="true"] { border-color: ${E.maroon}; box-shadow: 0 0 0 3px rgba(140,29,63,0.12), 0 14px 30px -20px rgba(10,26,43,0.4); }
  .rh-stat-ic { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; background: ${E.maroonWash}; color: ${E.maroon}; }
  .rh-stat b { display: block; font-size: 22px; line-height: 1.1; font-weight: 700; }
  .rh-stat small { display: block; font-size: 12.5px; color: ${E.quiet}; margin-top: 2px; }
  .rh-tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 26px 0 14px; }
  .rh-tools h2 { margin: 0; font-family: ${SERIF}; font-weight: 700; font-size: 21px; color: ${E.navy}; }
  .rh-search { position: relative; flex: 0 1 300px; min-width: 220px; }
  .rh-search input { width: 100%; box-sizing: border-box; min-height: 44px; padding: 0 14px 0 38px; border-radius: 12px; border: 1.5px solid #C9D4E0; background: #FFFFFF; font: inherit; font-size: 14px; color: ${E.ink}; }
  .rh-search input:focus { outline: 3px solid rgba(140,29,63,0.2); border-color: ${E.maroon}; }
  .rh-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .rh-card { position: relative; border-radius: 16px; background: #FFFFFF; border: 1px solid ${E.line}; box-shadow: 0 1px 2px rgba(10,26,43,0.05), 0 18px 40px -30px rgba(10,26,43,0.4); overflow: hidden; }
  .rh-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); }
  .rh-link { display: block; padding: 18px 18px 16px 22px; color: inherit; text-decoration: none; }
  .rh-link:hover .rh-go { background: ${E.maroonWash}; border-color: ${E.maroonLine}; color: ${E.maroon}; }
  .rh-link:focus-visible { outline: 3px solid rgba(140,29,63,0.35); outline-offset: -3px; border-radius: 16px; }
  .rh-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; align-items: start; }
  .rh-ava { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; font-family: ${SERIF}; font-weight: 700; font-size: 16px; color: #FFFFFF; background: var(--ava); }
  .rh-name { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
  .rh-name strong { font-family: ${SERIF}; font-weight: 700; font-size: 19px; color: ${E.navy}; overflow-wrap: anywhere; }
  .rh-test { display: inline-flex; align-items: center; padding: 1px 9px; border-radius: 999px; border: 1px solid ${E.maroon}; color: ${E.maroon}; font-size: 11.5px; font-weight: 700; }
  .rh-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin-top: 6px; font-size: 13px; color: ${E.quiet}; }
  .rh-meta span { display: inline-flex; align-items: center; gap: 5px; }
  .rh-ref { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; font-weight: 700; color: ${E.ink}; background: ${E.wash}; border: 1px solid ${E.line}; border-radius: 6px; padding: 2px 8px; }
  .rh-asked { margin: 6px 0 0; font-size: 13px; color: ${E.text}; }
  .rh-right { display: flex; align-items: center; gap: 8px; }
  .rh-pill { display: inline-flex; align-items: center; gap: 5px; min-height: 28px; padding: 0 11px; border-radius: 999px; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .rh-go { width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; border: 1px solid ${E.line}; color: ${E.navy}; background: #FFFFFF; transition: background 140ms ease, color 140ms ease; }
  .rh-clock { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; }
  .rh-steps { list-style: none; margin: 16px 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .rh-steps li { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; font-size: 12px; color: ${E.quiet}; }
  .rh-steps li + li::before { content: ""; position: absolute; top: 12px; right: 50%; width: 100%; height: 2px; background: #D7DFE8; z-index: 0; }
  .rh-steps li.done + li::before, .rh-steps li.done + li.now::before, .rh-steps li.done + li.end::before { background: ${E.maroon}; }
  .rh-steps li.end + li::before { background: #D7DFE8; }
  .rh-dot { position: relative; z-index: 1; width: 26px; height: 26px; border-radius: 999px; display: grid; place-items: center; background: #FFFFFF; border: 1.5px solid #C9D4E0; color: ${E.faint}; }
  .rh-steps .done .rh-dot { background: ${E.maroon}; border-color: ${E.maroon}; color: #FFFFFF; }
  .rh-steps .now .rh-dot { border-color: ${E.maroon}; color: ${E.maroon}; box-shadow: 0 0 0 4px rgba(140,29,63,0.12); }
  .rh-steps .end .rh-dot { background: #5D6B7A; border-color: #5D6B7A; color: #FFFFFF; }
  .rh-steps .done, .rh-steps .end { color: ${E.ink}; font-weight: 600; }
  .rh-steps .now { color: ${E.maroon}; font-weight: 600; }
  .rh-invoice { margin: 0 18px 0 22px; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid ${E.line}; background: linear-gradient(90deg, #FFFFFF 0%, #FBF5F7 100%); }
  .rh-inv-what { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .rh-inv-ic { flex: 0 0 auto; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; border: 1px solid ${E.line}; background: #FFFFFF; color: ${E.quiet}; }
  .rh-inv-what small, .rh-inv-amt small { display: block; font-size: 11.5px; color: ${E.quiet}; }
  .rh-inv-what b { display: block; font-size: 14px; color: ${E.ink}; }
  .rh-inv-amt { text-align: right; padding: 0 6px 0 14px; border-left: 1px dashed #D7DFE8; }
  .rh-inv-amt b { display: block; font-family: ${SERIF}; font-weight: 700; font-size: 22px; color: ${E.maroon}; white-space: nowrap; }
  .rh-inv-btns { display: flex; gap: 8px; }
  .rh-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; border: 1px solid #C9D4E0; background: #FFFFFF; color: ${E.ink}; white-space: nowrap; }
  .rh-btn.main { background: ${E.maroon}; border-color: ${E.maroon}; color: #FFFFFF; }
  .rh-btn:hover { filter: brightness(0.97); }
  .rh-btn:disabled { opacity: 0.6; cursor: default; }
  .rh-btn:focus-visible { outline: 3px solid rgba(140,29,63,0.35); outline-offset: 2px; }
  .rh-foot { margin: 8px 18px 14px 22px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${E.quiet}; }
  .rh-none { margin: 0; padding: 18px; border: 1px dashed ${E.line}; border-radius: 12px; text-align: center; font-size: 14px; color: ${E.text}; background: #FFFFFF; }
  .rh-empty { padding: 22px; border-radius: 16px; border: 1px solid ${E.line}; background: #FFFFFF; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  @media (max-width: 860px) {
    .rh-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .rh-invoice { grid-template-columns: minmax(0, 1fr) auto; }
    .rh-inv-btns { grid-column: 1 / -1; }
    .rh-inv-btns .rh-btn { flex: 1 1 0; }
  }
  @media (max-width: 560px) {
    .rh-title-row { align-items: flex-start; }
    .rh-search { flex: 1 1 100%; min-width: 0; }
    .rh-mark { width: 48px; height: 48px; }
    .rh-head { grid-template-columns: auto minmax(0, 1fr); }
    .rh-right { grid-column: 1 / -1; justify-content: space-between; }
    .rh-steps li { font-size: 11px; }
    .rh-invoice { grid-template-columns: minmax(0, 1fr); margin: 0 14px 0 18px; }
    .rh-inv-amt { text-align: left; border-left: 0; border-top: 1px dashed #D7DFE8; padding: 10px 0 0; }
    .rh-link { padding: 16px 14px 14px 18px; }
    .rh-foot { margin: 8px 14px 14px 18px; }
  }
  @media (prefers-reduced-motion: reduce) { .rh-stat, .rh-back, .rh-go { transition: none; } .rh-stat:hover { transform: none; } }
`;

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "ready"; invitations: Invitation[]; receivedAt: number };

type Filter = "all" | "open" | "notarized" | "closed";

/** Where a request stands for the client, past the invitation's own status: its room and whether it was notarized. */
export function standing(item: Invitation): "open" | "notarized" | "closed" {
  if (item.session?.status === "notarized") return "notarized";
  if (invitationIsOpen(item.status) || (item.status === "accepted" && item.session?.status !== "cancelled")) return "open";
  return "closed";
}

const matches = (item: Invitation, query: string): boolean => {
  if (query === "") return true;
  const haystack = [item.notary.name, item.notary.firm, item.notary.city, item.reference ?? "", item.details?.actWantedLabel ?? "", item.details?.documentLabel ?? ""].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(part => part !== "").every(part => haystack.includes(part));
};

const TEST_MARK = /\s*\(test account\)\s*/i;
const initialsOf = (name: string): string => {
  const words = name.replace(/\([^)]*\)/g, " ").replace(/^\s*atty\.?\s+/i, "").split(/\s+/).filter(word => word !== "");
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1]?.[0] ?? "" : "")).toUpperCase() || "?";
};

export type StepState = "done" | "now" | "end" | "todo";

/** The four small steps of a request: sent, the notary's answer, the session, notarized. */
export function requestSteps(item: Invitation): { readonly label: string; readonly state: StepState; readonly icon: ComponentType<LucideProps> }[] {
  const session = item.session ?? null;
  const notarized = session?.status === "notarized";
  const answer: { label: string; state: StepState; icon: ComponentType<LucideProps> } = (() => {
    switch (item.status) {
      case "awaiting": case "claimed": return { label: "Notary accepts", state: "now", icon: Clock };
      case "accepted": return { label: "Accepted", state: "done", icon: Check };
      case "declined": return { label: "Declined", state: "end", icon: X };
      case "expired": return { label: "Expired", state: "end", icon: X };
      case "revoked": return { label: "Cancelled", state: "end", icon: X };
    }
  })();
  const room: { label: string; state: StepState; icon: ComponentType<LucideProps> } = item.status !== "accepted"
    ? { label: "Session", state: "todo", icon: Clock }
    : notarized ? { label: "Session", state: "done", icon: Check }
      : session === null ? { label: "Awaiting session", state: "now", icon: Clock }
        : session.status === "cancelled" ? { label: "Session called off", state: "end", icon: X }
          : { label: session.status === "live" ? "In session" : "Session ready", state: "now", icon: Clock };
  return [
    { label: "Sent", state: "done", icon: Send },
    answer,
    room,
    { label: "Notarized", state: notarized ? "done" : "todo", icon: Stamp },
  ];
}

const PILLS: Record<"open" | "accepted" | "notarized" | "closed", { style: CSSProperties; icon: ComponentType<LucideProps> }> = {
  open: { style: { background: E.skyWash, color: E.skyDeep, border: `1px solid ${E.skyLine}` }, icon: Clock },
  accepted: { style: { background: E.maroonWash, color: E.maroon, border: `1px solid ${E.maroonLine}` }, icon: Check },
  notarized: { style: { background: E.okWash, color: E.ok, border: "1px solid #B7E3CA" }, icon: Stamp },
  closed: { style: { background: E.wash, color: E.quiet, border: `1px solid ${E.line}` }, icon: X },
};

function Pill({ status, notarized }: { status: InvitationStatus; notarized: boolean }) {
  const kind = notarized ? "notarized" : status === "accepted" ? "accepted" : status === "awaiting" || status === "claimed" ? "open" : "closed";
  const look = PILLS[kind];
  const Icon = look.icon;
  return (
    <span className="rh-pill" data-testid="status-pill" data-status={status} style={look.style}>
      <Icon size={13} aria-hidden /> {notarized ? "Notarized" : statusLabel(status)}
    </span>
  );
}

export function ClientRequestsPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [filter, setFilter] = useState<Filter>("all");
  const [invoicing, setInvoicing] = useState<string | null>(null);
  const invoice = (item: Invitation, how: "view" | "download") => {
    setInvoicing(`${item.id}:${how}`);
    // A tab opened now, before the file arrives, is not held back by the browser's pop-up blocker.
    const tab = how === "view" ? window.open("", "_blank") : null;
    realEnotarySessionsService.invoicePdf(item.id)
      .then(blob => {
        if (how === "download") { saveBlobAs(blob, `${item.reference ?? "eNotary"}-invoice.pdf`); return; }
        const url = URL.createObjectURL(blob);
        if (tab !== null) tab.location.href = url; else window.open(url, "_blank", "noopener");
        setTimeout(() => { URL.revokeObjectURL(url); }, 60_000);
      })
      .catch(() => { tab?.close(); })
      .finally(() => { setInvoicing(null); });
  };
  const [query, setQuery] = useState("");
  const alive = useRef(true);
  const now = useNow(1000);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    setLoaded(current => (current.kind === "ready" ? current : { kind: "loading" }));
    realEnotaryInvitationsService.list().then(
      list => { if (alive.current) setLoaded(list === null ? { kind: "off" } : { kind: "ready", invitations: list, receivedAt: Date.now() }); },
      () => { if (alive.current) setLoaded({ kind: "error" }); },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  const invitations = useMemo(() => (loaded.kind === "ready" ? loaded.invitations : []), [loaded]);
  const anyOpen = invitations.some(item => invitationIsOpen(item.status));
  useEffect(() => {
    if (!anyOpen) return;
    const timer = setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { clearInterval(timer); };
  }, [anyOpen, load]);

  const counts = useMemo(() => ({
    open: invitations.filter(item => standing(item) === "open").length,
    notarized: invitations.filter(item => standing(item) === "notarized").length,
    closed: invitations.filter(item => standing(item) === "closed").length,
  }), [invitations]);
  const shown = useMemo(
    () => invitations.filter(item => (filter === "all" || standing(item) === filter) && matches(item, query.trim())),
    [invitations, filter, query],
  );

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={load} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const { receivedAt } = loaded;
  const stats: [Filter, string, number, ComponentType<LucideProps>][] = [
    ["all", "Total requests", invitations.length, List], ["open", "In progress", counts.open, Clock],
    ["notarized", "Notarized", counts.notarized, Stamp], ["closed", "Closed", counts.closed, X],
  ];
  return (
    <div className="rh" style={GF}>
      <style>{STYLES}</style>
      <section className="rh-hero">
        <div className="rh-hero-in">
          <Link to="/app/dashboard" className="rh-back" data-testid="history-back"><ArrowLeft size={15} aria-hidden /> Back to LAGDA Dashboard</Link>
          <div className="rh-title-row">
            <span className="rh-mark" aria-hidden="true"><Scale size={26} /></span>
            <div style={{ minWidth: 0 }}>
              <p className="rh-eyebrow">LAGDA eNotary</p>
              <h1 className="rh-h1">Notarial Request History</h1>
              <p className="rh-lead">Every request you made to a notary: what you asked for, where it stands, and the notarized documents you received.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="rh-body">
        {invitations.length > 0 && (
          <div className="rh-stats" role="group" aria-label="Show">
            {stats.map(([key, label, count, Icon]) => (
              <button key={key} type="button" className="rh-stat" aria-pressed={filter === key} data-testid={`filter-${key}`} onClick={() => { setFilter(key); }}>
                <span className="rh-stat-ic" aria-hidden="true"><Icon size={18} /></span>
                <span><b>{count}</b><small>{label}</small></span>
              </button>
            ))}
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="rh-empty" data-testid="requests-empty" style={{ marginTop: -40, position: "relative", zIndex: 1 }}>
            <p style={{ margin: "0 0 12px", fontSize: 14.5, color: E.text, lineHeight: 1.6 }}>You have not asked a notary yet. Find a notary in the Notary Directory and choose Request this notary.</p>
            <a href={ENOTARY_DIRECTORY_PATH} style={linkButton("maroon")}><Search size={16} aria-hidden /> Go to the Notary Directory</a>
          </div>
        ) : (
          <>
            <div className="rh-tools" data-testid="history-tools">
              <h2>Your requests</h2>
              <div className="rh-search">
                <label htmlFor="history-search" className="sr">Find a request</label>
                <Search size={16} aria-hidden style={{ position: "absolute", left: 13, top: 14, color: E.quiet }} />
                <input id="history-search" type="search" value={query} placeholder="Search notary, number or document" autoComplete="off"
                  onChange={event => { setQuery(event.target.value); }} />
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="rh-none" data-testid="history-none">No request matches. Try fewer words, or another filter.</p>
            ) : (
              <ul className="rh-list" data-testid="requests-list">
                {shown.map(item => {
                  const clock = new ExpiryClock();
                  clock.sync(item.secondsLeft, receivedAt);
                  const msLeft = clock.msLeft(now);
                  const open = invitationIsOpen(item.status);
                  const tone = expiryTone(msLeft);
                  const where = standing(item);
                  const notarized = item.session?.status === "notarized";
                  const test = TEST_MARK.test(item.notary.name);
                  const name = item.notary.name.replace(TEST_MARK, " ").trim();
                  const asked = item.details === undefined || item.details === null ? "" : `${item.details.actWantedLabel} · ${item.details.documentLabel}`;
                  const office = [item.notary.firm, item.notary.city].filter(part => part !== "").join(", ");
                  const accent = where === "notarized" ? E.ok : where === "open" ? E.maroon : "#5D6B7A";
                  const fee = item.payment !== null && item.payment !== undefined && item.payment.amountCentavos > 0 ? item.payment : null;
                  return (
                    <li key={item.id} className="rh-card" style={{ ["--accent" as string]: accent }}>
                      <Link to={`/app/enotary/requests/${encodeURIComponent(item.id)}`} className="rh-link" data-testid="request-row">
                        <div className="rh-head">
                          <span className="rh-ava" aria-hidden="true" style={{ ["--ava" as string]: where === "closed" ? "#5D6B7A" : E.navy }}>{initialsOf(name)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="rh-name"><strong>Atty. {name}</strong>{test && <span className="rh-test">Test account</span>}</div>
                            <div className="rh-meta">
                              {item.reference !== undefined && item.reference !== null && <span className="rh-ref">{item.reference}</span>}
                              {office !== "" && <span><MapPin size={13} aria-hidden /> {office}</span>}
                              {item.createdAt !== undefined && <span><CalendarDays size={13} aria-hidden /> Sent {stampLabel(item.createdAt)}</span>}
                              {open && (
                                <span data-testid="row-countdown" data-tone={tone} className="rh-clock"
                                  style={{ color: tone === "red" ? "#B0182B" : tone === "amber" ? "#8A5A00" : E.skyDeep }}>
                                  <Clock size={13} aria-hidden /> {tone === "ended" ? "Expired" : `${countdownText(msLeft)} left`}
                                </span>
                              )}
                            </div>
                            {asked !== "" && <p className="rh-asked">{asked}</p>}
                          </div>
                          <div className="rh-right">
                            <Pill status={item.status} notarized={notarized} />
                            <span className="rh-go" aria-hidden="true"><ChevronRight size={17} /></span>
                          </div>
                        </div>
                        <ol className="rh-steps" aria-label="Where this request stands">
                          {requestSteps(item).map(step => {
                            const Icon = step.icon;
                            return (
                              <li key={step.label} className={step.state === "todo" ? undefined : step.state} {...(step.state === "now" ? { "aria-current": "step" as const } : {})}>
                                <span className="rh-dot" aria-hidden="true"><Icon size={13} /></span>{step.label}
                              </li>
                            );
                          })}
                        </ol>
                      </Link>
                      {fee !== null && (
                        <>
                          <div className="rh-invoice" data-testid="invoice-box">
                            <div className="rh-inv-what">
                              <span className="rh-inv-ic" aria-hidden="true"><FileText size={17} /></span>
                              <span><small>Attached invoice</small><b>Notarial fee</b></span>
                            </div>
                            <div className="rh-inv-amt">
                              <small>{fee.status === "confirmed" ? "Amount paid" : "Amount due"}</small>
                              <b data-testid="invoice-amount">PHP {formatPesos(fee.amountCentavos)}</b>
                            </div>
                            <div className="rh-inv-btns">
                              <button type="button" className="rh-btn" data-testid="invoice-view" disabled={invoicing !== null} onClick={() => { invoice(item, "view"); }}
                                aria-label={`View the invoice of request ${item.reference ?? ""}`}>
                                <Eye size={15} aria-hidden /> {invoicing === `${item.id}:view` ? "Opening…" : "View"}
                              </button>
                              <button type="button" className="rh-btn main" data-testid="invoice-download" disabled={invoicing !== null} onClick={() => { invoice(item, "download"); }}
                                aria-label={`Download the invoice of request ${item.reference ?? ""}`}>
                                <Download size={15} aria-hidden /> {invoicing === `${item.id}:download` ? "Preparing…" : "Download"}
                              </button>
                            </div>
                          </div>
                          <p className="rh-foot"><Scale size={13} aria-hidden /> The fee is paid directly to the notary, who confirms receipt.</p>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        <OnrampNote tone="maroon" />
      </div>
    </div>
  );
}
