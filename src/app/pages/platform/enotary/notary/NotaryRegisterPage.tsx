// /app/enotary/register — the notary's register: every document they notarized in LAGDA eNotary, in the order of
// its entry, with Doc. No., Page No., Book No., series, the client, the act, the fee and where the certified copy is.
//
// The server writes the register when a notary seals a document; this page only reads it. The page and book are
// worked out from the entry number by the server.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { BookOpen } from "lucide-react";
import { GF, useViewport } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { formatPesos } from "../../../../services/real/enotary-invitations.service";
import { realEnotarySessionsService, type NotaryRegister, type RegisterEntry } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryCaseFrame } from "../CaseFrame";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, bodyText, markSessionsOffered } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { copyWords } from "./NotaryDeskPage";

type Loaded = { kind: "loading" } | { kind: "error" } | { kind: "off" } | { kind: "ready"; register: NotaryRegister };

const dayLabel = (iso: string): string => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Manila" });
const feeLabel = (centavos: number | null): string => (centavos === null ? "" : centavos === 0 ? "No fee" : `PHP ${formatPesos(centavos)}`);

/** Where the entry's certified copy stands, in words; the tracking number follows when the notary typed one. */
function copyLine(entry: RegisterEntry): { words: string; tracking: string | null } {
  if (entry.copy === null) return { words: "None asked for", tracking: null };
  const words = copyWords(entry.copy);
  return { words: words === "Notarized" ? "None asked for" : words, tracking: entry.copy.trackingNo };
}

export function NotaryRegisterPage() {
  const { isCompact } = useViewport();
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
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

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); load(); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const { register } = loaded;
  const commission = [
    register.commissionNo !== null ? `Commission No. ${register.commissionNo}` : null,
    register.commissionValidUntil !== null ? `until ${dayLabel(register.commissionValidUntil)}` : null,
  ].filter((part): part is string => part !== null).join(", ");

  return (
    <EnotaryCaseFrame
      tone="attorney" eyebrow={`Notary desk${register.place !== null ? ` • ${register.place}` : ""}`} title="Notarial register"
      lead="Every document you notarized on LAGDA eNotary, in the order of its entry." back={{ to: "/app/enotary/desk", label: "All requests" }}
    >
      <Panel testId="register-panel">
        <h2 style={{ margin: "0 0 4px", fontSize: 19, color: E.navy, display: "flex", alignItems: "center", gap: 8 }}>
          <BookOpen size={20} aria-hidden style={{ color: E.maroon }} /> Notarial register of Atty. {register.notaryName.replace(/^atty\.?\s+/i, "")}
        </h2>
        {(commission !== "" || register.place !== null) && (
          <p data-testid="register-commission" style={{ ...bodyText, fontFamily: SERIF, margin: "0 0 14px" }}>
            {commission}{commission !== "" && register.place !== null ? " · " : ""}{register.place ?? ""}
          </p>
        )}
        {register.entries.length === 0 ? (
          <p data-testid="register-empty" style={{ ...bodyText, margin: 0, padding: 16, border: `1px dashed ${E.line}`, borderRadius: 10, textAlign: "center" }}>
            Nothing is in your register yet. A document is entered here when you seal it.
          </p>
        ) : isCompact ? (
          <ul data-testid="register-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {register.entries.map(entry => {
              const copy = copyLine(entry);
              return (
                <li key={entry.sessionId} data-testid="register-entry" style={{ ...GF, border: `1px solid ${E.line}`, borderRadius: 12, padding: "12px 14px", background: "#FFFFFF" }}>
                  <p style={{ margin: 0, fontFamily: SERIF, fontWeight: 700, color: E.navy }}>Doc. No. {entry.docNo} · Page {entry.pageNo} · Book {entry.bookNo} · Series {entry.series}</p>
                  <Link to={`/app/enotary/desk/${encodeURIComponent(entry.invitationId)}`} style={{ display: "block", margin: "6px 0 0", color: E.maroon, fontWeight: 700, overflowWrap: "anywhere" }}>{entry.documentName}</Link>
                  <p style={{ margin: "6px 0 0", fontSize: 13.5, color: E.text }}>{entry.clientName} · {dayLabel(entry.notarizedAt)}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13.5, color: E.text }}>{entry.actLabel}{entry.feeCentavos === null ? "" : ` · ${feeLabel(entry.feeCentavos)}`}</p>
                  <p data-testid="register-copy" style={{ margin: "2px 0 0", fontSize: 13.5, color: E.quiet }}>
                    Certified true copy: {copy.words}{copy.tracking !== null && <> · <span style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{copy.tracking}</span></>}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table data-testid="register-table" style={{ ...GF, width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <caption style={{ position: "absolute", left: -9999 }}>Notarial register</caption>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: E.quiet, borderBottom: `2px solid ${E.navy}` }}>
                  {["Doc. No.", "Page No.", "Book No.", "Series", "Date", "Client", "Document", "Notarial act", "Fee", "Certified true copy"].map(heading => (
                    <th key={heading} scope="col" style={{ padding: "10px 8px", fontWeight: 700 }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {register.entries.map(entry => {
                  const copy = copyLine(entry);
                  return (
                    <tr key={entry.sessionId} data-testid="register-entry" style={{ borderBottom: `1px solid ${E.line}`, verticalAlign: "top" }}>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.docNo}</td>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.pageNo}</td>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.bookNo}</td>
                      <td style={{ padding: "12px 8px", fontFamily: SERIF, fontWeight: 700 }}>{entry.series}</td>
                      <td style={{ padding: "12px 8px" }}>{dayLabel(entry.notarizedAt)}</td>
                      <td style={{ padding: "12px 8px" }}>{entry.clientName}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <Link to={`/app/enotary/desk/${encodeURIComponent(entry.invitationId)}`} style={{ color: E.maroon, fontWeight: 600, overflowWrap: "anywhere" }}>{entry.documentName}</Link>
                        {entry.reference !== null && <small style={{ display: "block", color: E.quiet, fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{entry.reference}</small>}
                      </td>
                      <td style={{ padding: "12px 8px" }}>{entry.actLabel}</td>
                      <td style={{ padding: "12px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{feeLabel(entry.feeCentavos)}</td>
                      <td data-testid="register-copy" style={{ padding: "12px 8px" }}>
                        {copy.words}
                        {copy.tracking !== null && <small style={{ display: "block", fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{copy.tracking}</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {register.entries.length > 0 && (
          <p style={{ ...bodyText, fontSize: 12.5, color: E.quiet, margin: "12px 0 0" }}>
            Last entry {stampLabel(register.entries[register.entries.length - 1]?.notarizedAt ?? "")}. Entries cannot be edited or removed.
          </p>
        )}
      </Panel>
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}
