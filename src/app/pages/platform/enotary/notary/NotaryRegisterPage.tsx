// /app/enotary/register — the Notary Book: every document the notary notarized in LAGDA eNotary, in the order of its
// entry, with Doc. No., Page No., Book No., series, the date and time, the client (their place and the kind of ID LAGDA
// verified), the document and its kind, the act, the fee, where the certified copy is, and the notary's remarks.
//
// The server writes the book when a notary seals a document; this page only reads it, filters it, and exports it: a
// spreadsheet of a year, and a month as the report to the Clerk of Court for the notary to read, sign and submit.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Download, FileText, Search } from "lucide-react";
import { ActionButton, GF, Notice, useViewport } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { formatPesos } from "../../../../services/real/enotary-invitations.service";
import { describeSessionError, realEnotarySessionsService, type NotaryRegister, type RegisterEntry } from "../../../../services/real/enotary-sessions.service";
import { withProcess } from "../../../../config/process-screens";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryCaseFrame } from "../CaseFrame";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, bodyText, fieldStyle, hintStyle, labelStyle, markSessionsOffered } from "../onramp-ui";
import { saveBlob } from "../room/room-bits";
import { copyWords } from "./NotaryDeskPage";

type Loaded = { kind: "loading" } | { kind: "error" } | { kind: "off" } | { kind: "ready"; register: NotaryRegister };

const dayLabel = (iso: string): string => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Manila" });
const timeLabel = (iso: string): string => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
const feeLabel = (centavos: number | null): string => (centavos === null ? "" : centavos === 0 ? "No fee" : `PHP ${formatPesos(centavos)}`);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const present = (...parts: (string | null | undefined)[]): string => parts.filter((part): part is string => part !== null && part !== undefined && part !== "").join(" · ");

/** Where the entry's certified copy stands, in words; the tracking number follows when the notary typed one. */
function copyLine(entry: RegisterEntry): { words: string; tracking: string | null } {
  if (entry.copy === null) return { words: "None asked for", tracking: null };
  const words = copyWords(entry.copy);
  return { words: words === "Notarized" ? "None asked for" : words, tracking: entry.copy.trackingNo };
}

const matches = (entry: RegisterEntry, query: string): boolean => {
  if (query === "") return true;
  const haystack = [entry.clientName, entry.documentName, entry.reference ?? "", entry.actLabel, entry.clientAddress ?? "", entry.clientPlace ?? "", entry.documentKindLabel ?? "", String(entry.docNo)].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(part => part !== "").every(part => haystack.includes(part));
};

/** The month before this one, in Philippine time: the report a notary usually prepares. */
function previousMonth(now: Date): { year: number; month: number } {
  const manila = new Date(now.getTime() + 8 * 3_600_000);
  const month = manila.getUTCMonth();
  return month === 0 ? { year: manila.getUTCFullYear() - 1, month: 12 } : { year: manila.getUTCFullYear(), month };
}

export function NotaryRegisterPage() {
  const { isCompact } = useViewport();
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [year, setYear] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [report, setReport] = useState(() => previousMonth(new Date()));
  const [problem, setProblem] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    realEnotarySessionsService.register().then(
      register => { markSessionsOffered(); if (alive.current) setLoaded({ kind: "ready", register }); },
      (error: unknown) => {
        const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : 0;
        if (alive.current) setLoaded(status === 404 ? { kind: "off" } : { kind: "error" });
      },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  const entries = useMemo(() => (loaded.kind === "ready" ? loaded.register.entries : []), [loaded]);
  const years = useMemo(() => [...new Set(entries.map(entry => entry.series))].sort((a, b) => b - a), [entries]);
  const shown = useMemo(() => entries.filter(entry => (year === "all" || entry.series === year) && matches(entry, query.trim())), [entries, year, query]);

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); load(); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const { register } = loaded;
  const commission = [
    register.commissionNo !== null ? `Commission No. ${register.commissionNo}` : null,
    register.commissionValidUntil !== null ? `until ${dayLabel(register.commissionValidUntil)}` : null,
  ].filter((part): part is string => part !== null).join(", ");
  const thisYear = new Date().getFullYear();

  const download = async (work: () => Promise<Blob>, name: string, kind: "enotary-register-export" | "enotary-register-report") => {
    setProblem(null);
    try { saveBlob(await withProcess(kind, "", work), name); } catch (error) { if (alive.current) setProblem(describeSessionError(error)); }
  };

  return (
    <EnotaryCaseFrame
      tone="attorney" eyebrow={`Notary desk${register.place !== null ? ` • ${register.place}` : ""}`} title="Notary Book"
      lead="Every document you notarized on LAGDA eNotary, in the order of its entry. Entries cannot be edited or removed."
      back={{ to: "/app/enotary/desk", label: "All requests" }}
    >
      {problem !== null && <Notice icon={FileText} tone="danger">{problem}</Notice>}
      <Panel testId="register-panel">
        <h2 style={{ margin: "0 0 4px", fontSize: 19, color: E.navy, display: "flex", alignItems: "center", gap: 8 }}>
          <BookOpen size={20} aria-hidden style={{ color: E.maroon }} /> Notarial register of Atty. {register.notaryName.replace(/^atty\.?\s+/i, "")}
        </h2>
        {(commission !== "" || register.place !== null) && (
          <p data-testid="register-commission" style={{ ...bodyText, fontFamily: SERIF, margin: "0 0 14px" }}>
            {commission}{commission !== "" && register.place !== null ? " · " : ""}{register.place ?? ""}
          </p>
        )}

        {entries.length > 0 && (
          <div data-testid="register-tools" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", alignItems: "end", margin: "0 0 16px" }}>
            <div>
              <label htmlFor="book-search" style={labelStyle}>Find an entry</label>
              <div style={{ position: "relative" }}>
                <Search size={16} aria-hidden style={{ position: "absolute", left: 12, top: 14, color: E.quiet }} />
                <input id="book-search" type="search" value={query} placeholder="Client, document or number" autoComplete="off"
                  onChange={event => { setQuery(event.target.value); }} style={{ ...fieldStyle(false), paddingLeft: 36 }} />
              </div>
            </div>
            <div>
              <label htmlFor="book-year" style={labelStyle}>Year</label>
              <select id="book-year" value={String(year)} onChange={event => { setYear(event.target.value === "all" ? "all" : Number(event.target.value)); }} style={{ ...fieldStyle(false), height: 48 }}>
                <option value="all">All years</option>
                {years.map(item => <option key={item} value={item}>Series of {item}</option>)}
              </select>
            </div>
            <div>
              <ActionButton kind="secondary" icon={Download} onClick={() => { void download(() => realEnotarySessionsService.registerCsv(year === "all" ? undefined : year), `notarial-register-${String(year)}.csv`, "enotary-register-export"); }}>
                Export as a spreadsheet
              </ActionButton>
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <p data-testid="register-empty" style={{ ...bodyText, margin: 0, padding: 16, border: `1px dashed ${E.line}`, borderRadius: 10, textAlign: "center" }}>
            Nothing is in your Notary Book yet. A document is entered here when you seal it.
          </p>
        ) : shown.length === 0 ? (
          <p data-testid="register-none" style={{ ...bodyText, margin: 0, padding: 16, border: `1px dashed ${E.line}`, borderRadius: 10, textAlign: "center" }}>
            No entry matches. Try fewer words, or another year.
          </p>
        ) : isCompact ? (
          <ul data-testid="register-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {shown.map(entry => {
              const copy = copyLine(entry);
              const person = present(entry.clientAddress ?? entry.clientPlace, entry.clientIdType);
              return (
                <li key={entry.sessionId} data-testid="register-entry" style={{ ...GF, border: `1px solid ${E.line}`, borderRadius: 12, padding: "12px 14px", background: "#FFFFFF" }}>
                  <p style={{ margin: 0, fontFamily: SERIF, fontWeight: 700, color: E.navy }}>Doc. No. {entry.docNo} · Page {entry.pageNo} · Book {entry.bookNo} · Series {entry.series}</p>
                  <Link to={`/app/enotary/desk/${encodeURIComponent(entry.invitationId)}`} style={{ display: "block", margin: "6px 0 0", color: E.maroon, fontWeight: 700, overflowWrap: "anywhere" }}>{entry.documentName}</Link>
                  {entry.documentKindLabel !== null && entry.documentKindLabel !== undefined && <p style={{ margin: "2px 0 0", fontSize: 13, color: E.quiet }}>{entry.documentKindLabel}</p>}
                  <p style={{ margin: "6px 0 0", fontSize: 13.5, color: E.text }}>{entry.clientName} · {dayLabel(entry.notarizedAt)}, {timeLabel(entry.notarizedAt)}</p>
                  {person !== "" && <p style={{ margin: "2px 0 0", fontSize: 13, color: E.quiet }}>{person}</p>}
                  <p style={{ margin: "2px 0 0", fontSize: 13.5, color: E.text }}>{entry.actLabel}{entry.feeCentavos === null ? "" : ` · ${feeLabel(entry.feeCentavos)}`}</p>
                  <p data-testid="register-copy" style={{ margin: "2px 0 0", fontSize: 13.5, color: E.quiet }}>
                    Certified true copy: {copy.words}{copy.tracking !== null && <> · <span style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{copy.tracking}</span></>}
                  </p>
                  {entry.remarks !== null && entry.remarks !== undefined && <p style={{ margin: "4px 0 0", fontSize: 13, color: E.text }}>Remarks: {entry.remarks}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table data-testid="register-table" style={{ ...GF, width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <caption style={{ position: "absolute", left: -9999 }}>Notary Book</caption>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: E.quiet, borderBottom: `2px solid ${E.navy}` }}>
                  {["Doc. No.", "Page No.", "Book No.", "Series", "Date and time", "Client", "Document", "Notarial act", "Fee", "Certified true copy", "Remarks"].map(heading => (
                    <th key={heading} scope="col" style={{ padding: "10px 8px", fontWeight: 700 }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(entry => {
                  const copy = copyLine(entry);
                  const person = present(entry.clientAddress ?? entry.clientPlace, entry.clientIdType);
                  return (
                    <tr key={entry.sessionId} data-testid="register-entry" style={{ borderBottom: `1px solid ${E.line}`, verticalAlign: "top" }}>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.docNo}</td>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.pageNo}</td>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.bookNo}</td>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.series}</td>
                      <td style={{ padding: "12px 8px" }}>{dayLabel(entry.notarizedAt)}<small style={{ display: "block", color: E.quiet }}>{timeLabel(entry.notarizedAt)}</small></td>
                      <td style={{ padding: "12px 8px" }}>{entry.clientName}{person !== "" && <small style={{ display: "block", color: E.quiet }}>{person}</small>}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <Link to={`/app/enotary/desk/${encodeURIComponent(entry.invitationId)}`} style={{ color: E.maroon, fontWeight: 600, overflowWrap: "anywhere" }}>{entry.documentName}</Link>
                        {entry.documentKindLabel !== null && entry.documentKindLabel !== undefined && <small style={{ display: "block", color: E.quiet }}>{entry.documentKindLabel}</small>}
                        {entry.reference !== null && <small style={{ display: "block", color: E.quiet, fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{entry.reference}</small>}
                      </td>
                      <td style={{ padding: "12px 8px" }}>{entry.actLabel}</td>
                      <td style={{ padding: "12px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{feeLabel(entry.feeCentavos)}</td>
                      <td data-testid="register-copy" style={{ padding: "12px 8px" }}>
                        {copy.words}
                        {copy.tracking !== null && <small style={{ display: "block", fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{copy.tracking}</small>}
                      </td>
                      <td style={{ padding: "12px 8px", color: E.text }}>{entry.remarks ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {entries.length > 0 && (
          <p data-testid="register-count" style={{ ...bodyText, fontSize: 12.5, color: E.quiet, margin: "12px 0 0" }}>
            {shown.length} of {entries.length} {entries.length === 1 ? "entry" : "entries"}. Entries cannot be edited or removed.
          </p>
        )}
      </Panel>

      <Panel testId="report-panel" tone="plain">
        <h2 style={{ margin: "0 0 4px", fontSize: 18, color: E.navy }}>Monthly report to the Clerk of Court</h2>
        <p style={bodyText}>
          LAGDA prepares the month&rsquo;s entries as a report with a cover letter. You read it, sign it and submit it; LAGDA does not send it. A month with no entry
          gets a letter saying you notarized no document.
        </p>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", alignItems: "end" }}>
          <div>
            <label htmlFor="report-month" style={labelStyle}>Month of the report</label>
            <select id="report-month" value={report.month} onChange={event => { setReport({ ...report, month: Number(event.target.value) }); }} style={{ ...fieldStyle(false), height: 48 }}>
              {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="report-year" style={labelStyle}>Year of the report</label>
            <select id="report-year" value={report.year} onChange={event => { setReport({ ...report, year: Number(event.target.value) }); }} style={{ ...fieldStyle(false), height: 48 }}>
              {[thisYear, thisYear - 1, thisYear - 2].map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <ActionButton icon={FileText} onClick={() => { void download(() => realEnotarySessionsService.registerReport(report.year, report.month), `notarial-register-report-${String(report.year)}-${String(report.month).padStart(2, "0")}.pdf`, "enotary-register-report"); }}>
              Prepare the report (PDF)
            </ActionButton>
          </div>
        </div>
        <p style={hintStyle}>The rules ask for it in the first ten days of the following month. Check the exact requirement with your court.</p>
      </Panel>
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}
