// /app/enotary/requests — the client's Notarial Request History: every request they made to a notary, newest first, with
// its number, what they asked for, where it stands (and, while open, how long it has left). They can find one by what
// they remember of it, and filter by where it stands.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Clock, FileDown, Search } from "lucide-react";
import { T, TAP } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  invitationIsOpen, realEnotaryInvitationsService, type Invitation,
} from "../../../../services/real/enotary-invitations.service";
import { realEnotarySessionsService, saveBlobAs } from "../../../../services/real/enotary-sessions.service";
import { ENOTARY_DIRECTORY_PATH } from "../../../../config/enotary-directory";
import { E } from "../EnotaryChrome";
import { EnotaryCaseFrame } from "../CaseFrame";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, StatusPill, bodyText, fieldStyle, labelStyle, linkButton, useNow } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryTone, stampLabel } from "./expiry";

// One request: the notary's name and office read as full lines, and where the request stands sits under them
// on a phone (status and time left side by side) or at the right on a wide screen.
const ROW_STYLES = `
  .req-row { font-family: 'Geist', sans-serif; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px 12px;
    min-height: ${TAP + 16}px; padding: 14px 14px; border-radius: 12px; border: 1px solid ${E.line}; background: #FFFFFF;
    text-decoration: none; color: ${T.ink}; box-sizing: border-box; }
  .req-row:hover { border-color: ${E.skyLine}; background: #FBFDFF; }
  .req-row:focus-visible { outline: 3px solid rgba(10,132,214,0.35); outline-offset: 2px; }
  .req-invoice { margin: 6px 0 0 14px; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid ${E.skyLine}; background: #FFFFFF; color: ${E.skyDeep}; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
  .req-invoice:hover { background: ${E.skyWash}; }
  .req-invoice:disabled { opacity: 0.6; cursor: default; }
  .req-info { grid-column: 1; grid-row: 1; min-width: 0; display: block; }
  .req-name { display: block; font-size: 16px; line-height: 1.3; overflow-wrap: break-word; }
  .req-meta { display: flex; flex-wrap: wrap; gap: 2px 8px; margin-top: 3px; color: ${E.quiet}; font-size: 13px; line-height: 1.4; }
  .req-meta-part + .req-meta-part::before { content: "·"; margin-right: 8px; }
  .req-chevron { grid-column: 2; grid-row: 1; color: ${E.faint}; flex: 0 0 auto; }
  .req-foot { grid-column: 1 / -1; grid-row: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding-top: 10px; border-top: 1px solid #EEF3F8; }
  .req-clock { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; white-space: nowrap; }
  @media (min-width: 640px) {
    .req-row { grid-template-columns: minmax(0, 1fr) auto auto; gap: 14px; }
    .req-foot { grid-column: 2; grid-row: 1; border-top: 0; padding-top: 0; justify-content: flex-end; flex-wrap: nowrap; }
    .req-chevron { grid-column: 3; }
  }
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

export function ClientRequestsPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [filter, setFilter] = useState<Filter>("all");
  const [invoicing, setInvoicing] = useState<string | null>(null);
  const downloadInvoice = (item: Invitation) => {
    setInvoicing(item.id);
    realEnotarySessionsService.invoicePdf(item.id)
      .then(blob => { saveBlobAs(blob, `${item.reference ?? "eNotary"}-invoice.pdf`); })
      .catch(() => undefined)
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
  const chips: [Filter, string, number][] = [["all", "All", invitations.length], ["open", "Open", counts.open], ["notarized", "Notarized", counts.notarized], ["closed", "Closed", counts.closed]];
  return (
    <EnotaryCaseFrame
      tone="client" eyebrow="eNotary" title="Notarial Request History"
      lead="Every request you made to a notary: what you asked for, where it stands, and the notarized documents you received."
    >
      <style>{ROW_STYLES}</style>
      {invitations.length === 0 ? (
        <Panel testId="requests-empty">
          <p style={bodyText}>You have not asked a notary yet. Find a notary in the Notary Directory and choose Request this notary.</p>
          <a href={ENOTARY_DIRECTORY_PATH} style={linkButton()}><Search size={16} aria-hidden /> Go to the Notary Directory</a>
        </Panel>
      ) : (
        <>
          <div data-testid="history-tools" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", alignItems: "end" }}>
            <div>
              <label htmlFor="history-search" style={labelStyle}>Find a request</label>
              <div style={{ position: "relative" }}>
                <Search size={16} aria-hidden style={{ position: "absolute", left: 12, top: 14, color: E.quiet }} />
                <input id="history-search" type="search" value={query} placeholder="Notary, number or document" autoComplete="off"
                  onChange={event => { setQuery(event.target.value); }} style={{ ...fieldStyle(false), paddingLeft: 36 }} />
              </div>
            </div>
            <div role="group" aria-label="Show" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {chips.map(([key, label, count]) => (
                <button key={key} type="button" aria-pressed={filter === key} data-testid={`filter-${key}`} onClick={() => { setFilter(key); }}
                  style={{ minHeight: 44, padding: "0 14px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist', sans-serif",
                    border: `2px solid ${filter === key ? E.skyDeep : E.line}`, background: filter === key ? E.skyWash : "#FFFFFF", color: E.ink }}>
                  {label} <span style={{ color: E.quiet, fontWeight: 600 }}>{count}</span>
                </button>
              ))}
            </div>
          </div>
          {shown.length === 0 ? (
            <p data-testid="history-none" style={{ ...bodyText, padding: 16, border: `1px dashed ${E.line}`, borderRadius: 10, textAlign: "center" }}>No request matches. Try fewer words, or another filter.</p>
          ) : (
            <ul data-testid="requests-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {shown.map(item => {
                const clock = new ExpiryClock();
                clock.sync(item.secondsLeft, receivedAt);
                const msLeft = clock.msLeft(now);
                const open = invitationIsOpen(item.status);
                const tone = expiryTone(msLeft);
                const notarized = item.session?.status === "notarized";
                const asked = item.details === undefined || item.details === null ? "" : `${item.details.actWantedLabel} · ${item.details.documentLabel}`;
                const meta = [
                  item.reference ?? "", asked, [item.notary.firm, item.notary.city].filter(part => part !== "").join(", "),
                  item.createdAt === undefined ? "" : `Sent ${stampLabel(item.createdAt)}`,
                ].filter(part => part !== "");
                return (
                  <li key={item.id}>
                    <Link to={`/app/enotary/requests/${encodeURIComponent(item.id)}`} className="req-row" data-testid="request-row">
                      <span className="req-info">
                        <strong className="req-name">Atty. {item.notary.name}</strong>
                        {meta.length > 0 && (
                          <small className="req-meta">
                            {meta.map((part, i) => (
                              <span key={part} className="req-meta-part" style={i === 0 && part === item.reference ? { fontFamily: "ui-monospace, Menlo, Consolas, monospace", color: E.ink, fontWeight: 700 } : undefined}>{part}</span>
                            ))}
                          </small>
                        )}
                      </span>
                      <span className="req-foot">
                        <StatusPill status={item.status} {...(notarized ? { label: "Notarized" } : {})} />
                        {open && (
                          <small
                            data-testid="row-countdown" data-tone={tone} className="req-clock"
                            style={{ color: tone === "red" ? "#B0182B" : tone === "amber" ? "#8A5A00" : E.skyDeep }}
                          >
                            <Clock size={13} aria-hidden /> {tone === "ended" ? "Expired" : `${countdownText(msLeft)} left`}
                          </small>
                        )}
                      </span>
                      <ChevronRight size={18} aria-hidden className="req-chevron" />
                    </Link>
                    {item.payment !== null && item.payment !== undefined && item.payment.amountCentavos > 0 && (
                      <button type="button" data-testid="invoice-download" className="req-invoice" disabled={invoicing === item.id} onClick={() => { downloadInvoice(item); }}
                        aria-label={`Download the invoice of request ${item.reference ?? ""}`}>
                        <FileDown size={15} aria-hidden /> {invoicing === item.id ? "Preparing…" : `Invoice · PHP ${(item.payment.amountCentavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}
