// /app/contacts/import — Import readiness demonstration.
// Shows 7 fictional preview rows covering all import statuses. No real file upload, no real import.
// Demonstrates what a CSV import review would look like before launching live file-upload infra.
// Frontend-only demonstration. No real persistence.
// Burgundy never used. eNotary never referenced.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactImportRow, ContactImportPreview } from "../../../models/contacts";
import { CONTACT_IMPORT_ROW_STATUS_LABELS } from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

function RowStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string }> = {
    "valid-new":          { bg: "#DCFCE7", color: "#166534" },
    "duplicate":          { bg: "#FEF3C7", color: "#92400E" },
    "invalid-email":      { bg: "#FEE2E2", color: "#991B1B" },
    "missing-name":       { bg: "#FEE2E2", color: "#991B1B" },
    "invalid-scope":      { bg: "#FEF3C7", color: "#92400E" },
    "unknown-tag":        { bg: "#FEF3C7", color: "#92400E" },
    "excluded":           { bg: "#F1F5F9", color: "#475569" },
    "duplicate_override": { bg: "#E0F2FE", color: "#0369A1" },
  };
  const c = configs[status] ?? { bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ ...GM, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: c.bg, color: c.color }}>
      {CONTACT_IMPORT_ROW_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function SummaryBubble({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ textAlign: "center", background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "14px 20px", minWidth: 90 }}>
      <p style={{ ...GM, fontSize: 24, fontWeight: 700, color, margin: "0 0 2px" }}>{count}</p>
      <p style={{ ...GF, fontSize: 11, color: SLATE, margin: 0 }}>{label}</p>
    </div>
  );
}

function RowActionButton({ label, onClick, variant = "default" }: { label: string; onClick: () => void; variant?: "default" | "danger" | "primary" }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { color: SLATE, border: "1.5px solid #D1D9E0", background: "#FFFFFF" },
    danger:  { color: "#DC2626", border: "1.5px solid #FECACA", background: "#FEF2F2" },
    primary: { color: AZURE, border: `1.5px solid ${AZURE}`, background: LIGHT },
  };
  return (
    <button onClick={onClick}
      style={{ ...GF, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7, cursor: "pointer", ...styles[variant] }}>
      {label}
    </button>
  );
}

function ImportLibrary() {
  const { state, asyncLoadImportPreview } = useContacts();
  const [rowOverrides, setRowOverrides] = useState<Record<number, "included" | "excluded">>({});

  useEffect(() => { void asyncLoadImportPreview(); }, [asyncLoadImportPreview]);

  const preview: ContactImportPreview | null = state.importPreview;

  const getEffectiveStatus = (row: ContactImportRow): string => {
    const ov = rowOverrides[row.rowNumber];
    if (ov === "excluded") return "excluded";
    if (ov === "included" && row.status === "duplicate") return "duplicate_override";
    return row.status;
  };

  const isInvalidStatus = (s: string) => ["invalid-email", "missing-name", "invalid-scope"].includes(s);

  const effectiveCounts = preview ? {
    valid:     preview.rows.filter(r => ["valid-new", "duplicate_override"].includes(getEffectiveStatus(r))).length,
    duplicate: preview.rows.filter(r => getEffectiveStatus(r) === "duplicate").length,
    excluded:  preview.rows.filter(r => getEffectiveStatus(r) === "excluded").length,
    invalid:   preview.rows.filter(r => isInvalidStatus(getEffectiveStatus(r))).length,
  } : { valid: 0, duplicate: 0, excluded: 0, invalid: 0 };

  if (state.importLoading || !preview) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div aria-busy="true" style={{ maxWidth: 860, margin: "0 auto" }}>
          {[60, 120, 300].map((h, i) => <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      {/* Header */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/contacts" style={{ color: AZURE, textDecoration: "none" }}>Contacts</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Import Preview</li>
          </ol>
        </nav>
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Import Contacts</h1>
        <p style={{ ...GF, fontSize: 13, color: SLATE, marginTop: 4, maxWidth: 560 }}>
          This demonstration shows how a CSV import review would work. Review each row before committing. No data is actually uploaded or stored.
        </p>
      </header>

      <div style={{ maxWidth: 920, margin: "24px auto 0", padding: "0 24px" }}>
        {/* Demo notice */}
        <div style={{ background: LIGHT, border: `1.5px solid ${AZURE}30`, borderRadius: 10, padding: "12px 18px", marginBottom: 18 }}>
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            <strong style={{ color: AZURE }}>Import readiness demonstration</strong> — This screen shows 7 fictional contacts to illustrate what a real CSV import review would look like, including duplicate detection, validation errors, and row-by-row overrides. File upload infrastructure is not yet active.
          </p>
        </div>

        {/* Upload area (visual only) */}
        <div style={{ background: "#FFFFFF", border: "2px dashed #D1D9E0", borderRadius: 12, padding: "28px 24px", textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📄</p>
          <p style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Drop CSV file here</p>
          <p style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 12 }}>Supports CSV format — Name, Email, Phone, Organization, Title, Scope, Tags</p>
          <button disabled style={{ ...GF, fontSize: 13, color: SILVER, background: "#F8FAFC", border: "1.5px solid #E3E8EF", borderRadius: 8, padding: "8px 18px", cursor: "not-allowed" }}>
            Choose File (not yet active)
          </button>
          <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 8 }}>Max 500 rows per import</p>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <SummaryBubble label="Ready to import" count={effectiveCounts.valid}     color="#166534" />
          <SummaryBubble label="Possible duplicates" count={effectiveCounts.duplicate} color="#92400E" />
          <SummaryBubble label="Invalid"          count={effectiveCounts.invalid}   color="#991B1B" />
          <SummaryBubble label="Excluded"         count={effectiveCounts.excluded}  color={SLATE}   />
        </div>

        {/* Rows */}
        <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0F2F5" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Preview — {preview.rows.length} rows
            </h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...GF, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #E3E8EF" }}>
                  {["#", "Name", "Email", "Organization", "Status / Issues", "Actions"].map(h => (
                    <th key={h} scope="col" style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map(row => {
                  const effectiveStatus = getEffectiveStatus(row);
                  const isDimmed = effectiveStatus === "excluded";
                  return (
                    <tr key={row.rowNumber} style={{ borderBottom: "1px solid #F8FAFC", opacity: isDimmed ? 0.5 : 1 }}>
                      <td style={{ padding: "12px 14px", color: SILVER, ...GM, fontSize: 11 }}>{row.rowNumber}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: NAVY, whiteSpace: "nowrap" }}>{row.name}</td>
                      <td style={{ padding: "12px 14px", color: SLATE, ...GM, fontSize: 11 }}>{row.email}</td>
                      <td style={{ padding: "12px 14px", color: SLATE }}>{row.organization ?? "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ marginBottom: row.issues.length > 0 ? 6 : 0 }}>
                          <RowStatusBadge status={effectiveStatus} />
                        </div>
                        {/* ContactImportIssue carries only field + message — it has no
                            severity of its own, so every issue reads neutrally. The row
                            status badge above is what conveys severity. */}
                        {row.issues.map((issue, i) => (
                          <div key={i} style={{ display: "flex", gap: 4, alignItems: "flex-start", marginBottom: 2 }}>
                            <span style={{ fontSize: 10, marginTop: 1 }}>🔵</span>
                            <span style={{ ...GF, fontSize: 11, color: SLATE }}>{issue.message}</span>
                          </div>
                        ))}
                        {row.matchingContactId && (
                          <Link to={`/app/contacts/${row.matchingContactId}`} style={{ ...GF, fontSize: 11, color: AZURE, display: "block", marginTop: 4 }}>
                            View existing →
                          </Link>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {effectiveStatus !== "excluded" && !isInvalidStatus(effectiveStatus) && (
                            <RowActionButton label="Exclude" variant="danger"
                              onClick={() => setRowOverrides(prev => ({ ...prev, [row.rowNumber]: "excluded" }))} />
                          )}
                          {effectiveStatus === "excluded" && (
                            <RowActionButton label="Include" variant="primary"
                              onClick={() => setRowOverrides(prev => { const n = { ...prev }; delete n[row.rowNumber]; return n; })} />
                          )}
                          {effectiveStatus === "duplicate" && (
                            <RowActionButton label="Import anyway" variant="primary"
                              onClick={() => setRowOverrides(prev => ({ ...prev, [row.rowNumber]: "included" }))} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Commit button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
          <Link to="/app/contacts" style={{ ...GF, fontSize: 13, color: SLATE, textDecoration: "none" }}>Cancel</Link>
          <button disabled style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: SILVER, border: "none", borderRadius: 8, padding: "10px 22px", cursor: "not-allowed" }}>
            Import {effectiveCounts.valid} Contact{effectiveCounts.valid !== 1 ? "s" : ""} (not yet active)
          </button>
        </div>

        {/* Disclaimer */}
        <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 16, textAlign: "center" }}>
          Import data shown is fictional demonstration data. File upload and live import are not yet implemented.
        </p>
      </div>
    </div>
  );
}

export function ContactImportPage() {
  return (
    <ContactProvider>
      <ImportLibrary />
    </ContactProvider>
  );
}
