// Authenticated document verification workspace — /app/verify
// Extends the public /verify experience with richer private context for signed-in users.
// LEGAL CONSTRAINTS:
//   - Never claim a real verification lookup occurred.
//   - Never claim a file was uploaded, hashed, or stored.
//   - Never claim cryptographic proof exists.
//   - Do not equate found record with matching file.
//   - Do not equate matching file with legal validity.
//   - Do not equate electronic signing with notarization.
//   - Burgundy (#67023B) is reserved for eNotary only — never used here.

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import { usePlatform } from "../../context/PlatformContext";
import { PageHeader } from "../../components/platform";
import { verificationService } from "../../services/mock/verification.service";
import { DEMO_VERIFICATION_IDS } from "../../data/mock/verification";
import { VER_ID_RE } from "../../services/public";
import type {
  VerificationRecord,
  FileSelectionSummary,
  VerificationHistoryItem,
  TransactionRecordStatus,
  FileMatchStatus,
} from "../../models/verification";
import {
  TRANSACTION_RECORD_STATUS_LABELS,
  TRANSACTION_RECORD_STATUS_GUIDANCE,
  FILE_MATCH_STATUS_LABELS,
  parseVerificationSource,
} from "../../models/verification";

// ── Design tokens ─────────────────────────────────────────────────────────────

const GF   = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";

// ── Status palette helpers ────────────────────────────────────────────────────

function recordStatusStyle(s: TransactionRecordStatus): { bg: string; border: string; text: string; dot: string } {
  switch (s) {
    case "record-found-completed":
      return { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", dot: "#16A34A" };
    case "record-found-in-progress":
      return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", dot: "#2563EB" };
    case "record-found-draft":
      return { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", dot: "#94A3B8" };
    case "record-found-archived":
      return { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", dot: "#94A3B8" };
    case "record-found-cancelled":
      return { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", dot: "#D97706" };
    case "record-found-expired":
      return { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", dot: "#EA580C" };
    case "record-found-declined":
      return { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C", dot: "#DC2626" };
    case "record-found-voided":
      return { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C", dot: "#DC2626" };
    case "record-restricted":
      return { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", dot: "#D97706" };
    case "record-unavailable":
      return { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", dot: "#EA580C" };
    case "record-not-found":
    default:
      return { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", dot: "#94A3B8" };
  }
}

function fileMatchStyle(s: FileMatchStatus): { bg: string; border: string; text: string; dot: string } {
  switch (s) {
    case "match":
      return { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", dot: "#16A34A" };
    case "mismatch":
      return { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C", dot: "#DC2626" };
    case "comparison-unavailable":
    case "unsupported-file":
    case "file-too-large":
    case "file-invalid":
    case "comparison-error":
      return { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", dot: "#EA580C" };
    case "file-not-provided":
    case "not-evaluated":
    default:
      return { bg: "#F8FAFC", border: "#E2E8F0", text: "#64748B", dot: "#94A3B8" };
  }
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const VFY_STYLES = `
.vfy-card {
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 16px;
}
.vfy-card:last-child { margin-bottom: 0; }
.vfy-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748B;
  margin: 0 0 4px;
}
.vfy-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid;
}
.vfy-btn-primary {
  background: #0078D4;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.vfy-btn-primary:hover:not(:disabled) { background: #0066B2; }
.vfy-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.vfy-btn-secondary {
  background: #fff;
  color: #334155;
  border: 1.5px solid #CBD5E1;
  border-radius: 7px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.vfy-btn-secondary:hover { border-color: #94A3B8; background: #F8FAFC; }
.vfy-input {
  border: 1.5px solid #CBD5E1;
  border-radius: 7px;
  padding: 10px 14px;
  font-size: 15px;
  width: 100%;
  box-sizing: border-box;
  font-family: 'Geist', sans-serif;
  color: #0F172A;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
}
.vfy-input:focus { border-color: #0078D4; box-shadow: 0 0 0 3px rgba(0,120,212,0.1); }
.vfy-input.error { border-color: #DC2626; }
.vfy-notice {
  background: #F0F7FF;
  border: 1.5px solid #BAD7F5;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12.5px;
  color: #1E4070;
  line-height: 1.5;
}
.vfy-notice-warn {
  background: #FFFBEB;
  border: 1.5px solid #FDE68A;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12.5px;
  color: #7C2D12;
  line-height: 1.5;
}
.vfy-demo-chip {
  display: inline-block;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 11.5px;
  color: #0078D4;
  cursor: pointer;
  font-family: 'Geist Mono', monospace;
  font-weight: 600;
  transition: background 0.1s, border-color 0.1s;
  white-space: nowrap;
}
.vfy-demo-chip:hover { background: #E0EFFE; border-color: #93C5FD; }
.vfy-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #07111F;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.vfy-field-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.vfy-field {
  min-width: 140px;
}
.vfy-field dt {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94A3B8;
  margin: 0 0 3px;
}
.vfy-field dd {
  font-size: 13.5px;
  color: #1E293B;
  margin: 0;
  font-weight: 500;
}
.vfy-action-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: #0078D4;
  text-decoration: none;
  padding: 5px 10px;
  border: 1px solid #BFDBFE;
  border-radius: 6px;
  background: #EFF6FF;
  transition: background 0.1s, border-color 0.1s;
}
.vfy-action-link:hover { background: #DBEAFE; border-color: #93C5FD; }
.vfy-history-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #F1F5F9;
}
.vfy-history-row:last-child { border-bottom: none; }
.vfy-spinner {
  width: 22px; height: 22px;
  border: 2.5px solid rgba(0,120,212,0.2);
  border-top-color: #0078D4;
  border-radius: 50%;
  animation: vfy-spin 0.75s linear infinite;
}
@keyframes vfy-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .vfy-spinner { animation: none; border-top-color: #0078D4; }
}
@media (max-width: 640px) {
  .vfy-card { padding: 16px; }
  .vfy-field-row { gap: 16px; }
}
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status, palette }: {
  status: string;
  palette: { bg: string; border: string; text: string; dot: string };
}) {
  return (
    <span
      className="vfy-status-pill"
      style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.text }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: palette.dot, display: "inline-block", flexShrink: 0 }} />
      {status}
    </span>
  );
}

function HistoryStatusDot({ s }: { s: TransactionRecordStatus }) {
  const c = recordStatusStyle(s).dot;
  return <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0, marginTop: 4 }} />;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  return (
    <>
      <button
        type="button"
        className="vfy-btn-secondary"
        onClick={handleCopy}
        aria-label={copied ? "Copied to clipboard" : label}
        style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6 }}
      >
        {copied ? "Copied" : "Copy ID"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Verification ID copied to clipboard." : ""}
      </span>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function VerifyPage() {
  const { hasPermission } = usePlatform();
  const canVerify = hasPermission("verify_documents");

  const [searchParams, setSearchParams] = useSearchParams();

  // Pre-populate from query params (e.g. from Evidence tab or Dashboard)
  const initialId = searchParams.get("verificationId") ?? "";
  const sourceParam = parseVerificationSource(searchParams.get("source"));
  const txnIdParam = searchParams.get("transactionId") ?? undefined;

  const [idInput, setIdInput] = useState(initialId);
  const [inputError, setInputError] = useState<string | null>(null);

  // Lookup state
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // File comparison state
  const [selectedFile, setSelectedFile] = useState<FileSelectionSummary | null>(null);
  const [fileMatchOverride, setFileMatchOverride] = useState<FileMatchStatus | null>(null);
  const [fileCompareState, setFileCompareState] = useState<"idle" | "running" | "done">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [demoOpen, setDemoOpen] = useState(false);
  const [copiedAnnounce, setCopiedAnnounce] = useState("");

  // Load history on mount
  useEffect(() => {
    verificationService.getVerificationHistory({ limit: 5 }).then(r => setHistory(r.items));
  }, []);

  // Auto-trigger if we arrive with a pre-populated ID from a link
  useEffect(() => {
    if (initialId && VER_ID_RE.test(initialId.trim().toUpperCase())) {
      performLookup(initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performLookup = useCallback(async (id: string) => {
    const normalized = id.trim().toUpperCase().replace(/\s+/g, "");
    setLookupState("loading");
    setRecord(null);
    setLookupError(null);
    setFileMatchOverride(null);
    setSelectedFile(null);
    setFileCompareState("idle");

    const result = await verificationService.lookupVerificationRecord({
      verificationId: normalized,
      sourceContext: { source: sourceParam, transactionId: txnIdParam },
    });

    if (result.error && result.error.code === "invalid-id-format") {
      setInputError(result.error.message);
      setLookupState("idle");
      return;
    }

    if (result.error) {
      setLookupError(result.error.message);
      setLookupState("error");
      return;
    }

    setRecord(result.record);
    setLookupState("done");

    // Sync the verified ID back into the URL (without page reload)
    setSearchParams(p => {
      const next = new URLSearchParams(p);
      next.set("verificationId", normalized);
      return next;
    }, { replace: true });
  }, [sourceParam, txnIdParam, setSearchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInputError(null);
    const trimmed = idInput.trim();
    if (!trimmed) {
      setInputError("Please enter a Verification ID.");
      return;
    }
    if (!VER_ID_RE.test(trimmed.toUpperCase())) {
      setInputError("The ID entered does not match the expected format (e.g. LAGDA-VER-2026-004821).");
      return;
    }
    performLookup(trimmed);
  }

  function handleReset() {
    setIdInput("");
    setInputError(null);
    setLookupState("idle");
    setRecord(null);
    setLookupError(null);
    setSelectedFile(null);
    setFileMatchOverride(null);
    setFileCompareState("idle");
    setSearchParams({}, { replace: true });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setSelectedFile(null); return; }

    setSelectedFile({
      fileName: file.name,
      fileSizeBytes: file.size,
      fileType: file.type,
      selectionTimestamp: new Date().toISOString(),
      demonstrationOnly: true,
    });
    setFileMatchOverride(null);
    setFileCompareState("idle");

    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }

  async function handleCompare() {
    if (!selectedFile || !record) return;
    setFileCompareState("running");

    const result = await verificationService.compareSelectedFile({
      verificationId: record.verificationId,
      fileName: selectedFile.fileName,
      fileSizeBytes: selectedFile.fileSizeBytes,
      fileType: selectedFile.fileType,
    });

    setFileMatchOverride(result.fileMatchStatus);
    setFileCompareState("done");
  }

  function handleDemoIdClick(id: string) {
    setIdInput(id);
    setInputError(null);
    performLookup(id);
  }

  // Effective file match: override from comparison run, else from record
  const effectiveFileMatch: FileMatchStatus =
    fileMatchOverride ?? record?.fileMatchStatus ?? "file-not-provided";

  // ── Source context banner ─────────────────────────────────────────────────
  const showSourceBanner = sourceParam === "transaction" && txnIdParam;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...GF, color: NAVY, maxWidth: 800, margin: "0 auto" }}>
      <style>{VFY_STYLES}</style>

      <PageHeader
        compact
        title="Verify a Document"
        breadcrumbs={[
          { label: "Dashboard", to: "/app/dashboard" },
          { label: "Verify a Document" },
        ]}
      />

      {/* Source context banner */}
      {showSourceBanner && (
        <div className="vfy-notice" style={{ marginBottom: 16 }}>
          <strong>Navigated from a transaction.</strong>{" "}
          The Verification ID below was pre-populated from{" "}
          <Link to={`/app/documents/${txnIdParam}`} style={{ color: AZURE, fontWeight: 600 }}>
            that transaction's record
          </Link>
          . You can also enter any Verification ID manually.
        </div>
      )}

      {/* Permission gate */}
      {!canVerify && (
        <div className="vfy-notice-warn" role="alert" style={{ marginBottom: 16 }}>
          <strong>Verification access required.</strong>{" "}
          Your current role does not include document verification permission. Contact your workspace administrator to request access.
        </div>
      )}

      {/* ── Input form ── */}
      <div className="vfy-card">
        <p className="vfy-section-title">Enter a Verification ID</p>
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 14px", lineHeight: 1.5 }}>
          Enter the Verification ID found on a LAGDA-signed document to look up its signing record.
          This is a frontend demonstration — no real lookup is performed.
        </p>

        <form onSubmit={handleSubmit} noValidate aria-label="Verification ID lookup">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 300px" }}>
              <label htmlFor="vfy-id-input" style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Verification ID
              </label>
              <input
                id="vfy-id-input"
                type="text"
                className={`vfy-input${inputError ? " error" : ""}`}
                value={idInput}
                onChange={e => { setIdInput(e.target.value); setInputError(null); }}
                placeholder="LAGDA-VER-2026-XXXXXX"
                aria-describedby={inputError ? "vfy-id-error" : "vfy-id-hint"}
                aria-invalid={!!inputError}
                disabled={!canVerify || lookupState === "loading"}
                autoComplete="off"
                spellCheck={false}
              />
              {inputError ? (
                <p id="vfy-id-error" role="alert" style={{ color: "#DC2626", fontSize: 12, margin: "4px 0 0", ...GF }}>
                  {inputError}
                </p>
              ) : (
                <p id="vfy-id-hint" style={{ color: "#64748B", fontSize: 12, margin: "4px 0 0", ...GF }}>
                  Format: LAGDA-VER-YYYY-XXXXXX
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingBottom: 22, flexShrink: 0 }}>
              <button
                type="submit"
                className="vfy-btn-primary"
                disabled={!canVerify || lookupState === "loading" || !idInput.trim()}
                aria-describedby="vfy-demo-notice"
              >
                {lookupState === "loading" ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="vfy-spinner" aria-hidden />
                    Checking…
                  </span>
                ) : "Look Up Record"}
              </button>

              {(lookupState !== "idle" || idInput) && (
                <button
                  type="button"
                  className="vfy-btn-secondary"
                  onClick={handleReset}
                  aria-label="Clear verification lookup and start over"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Demo IDs */}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setDemoOpen(o => !o)}
            aria-expanded={demoOpen}
            aria-controls="vfy-demo-ids"
            style={{ ...GF, background: "none", border: "none", color: AZURE, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 5 }}
          >
            <span aria-hidden style={{ display: "inline-block", transform: demoOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", fontSize: 10 }}>▶</span>
            {demoOpen ? "Hide" : "Show"} demonstration Verification IDs
          </button>

          {demoOpen && (
            <div id="vfy-demo-ids" style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DEMO_VERIFICATION_IDS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  className="vfy-demo-chip"
                  onClick={() => handleDemoIdClick(d.id)}
                  title={d.scenario}
                  aria-label={`Use demo ID ${d.id} — ${d.label}`}
                >
                  {d.id}
                  <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 400, color: "#64748B", marginLeft: 4 }}>
                    — {d.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {lookupState === "loading" && (
        <div className="vfy-card" role="status" aria-label="Checking verification record" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="vfy-spinner" aria-hidden />
          <span style={{ fontSize: 14, color: "#475569" }}>Looking up signing record in this demonstration…</span>
        </div>
      )}

      {/* ── Error state ── */}
      {lookupState === "error" && lookupError && (
        <div className="vfy-card" role="alert" style={{ borderColor: "#FECACA" }}>
          <p style={{ fontWeight: 700, color: "#B91C1C", margin: "0 0 6px" }}>Verification Unavailable</p>
          <p style={{ fontSize: 13.5, color: "#7F1D1D", margin: 0 }}>{lookupError}</p>
        </div>
      )}

      {/* ── Result ── */}
      {lookupState === "done" && record && (
        <>
          {/* Transaction record status panel */}
          <div className="vfy-card" aria-label="Transaction record status">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div>
                <p className="vfy-label">Transaction Record Status</p>
                <StatusPill
                  status={TRANSACTION_RECORD_STATUS_LABELS[record.transactionRecordStatus]}
                  palette={recordStatusStyle(record.transactionRecordStatus)}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <code style={{ fontSize: 12.5, color: "#475569", background: "#F1F5F9", padding: "3px 8px", borderRadius: 5, fontFamily: "'Geist Mono', monospace" }}>
                  {record.verificationId}
                </code>
                <CopyButton text={record.verificationId} label={`Copy Verification ID ${record.verificationId}`} />
              </div>
            </div>

            {/* Document summary */}
            {record.documentDescription && record.transactionRecordStatus !== "record-not-found" && record.transactionRecordStatus !== "record-unavailable" && (
              <dl className="vfy-field-row" style={{ marginBottom: 14 }}>
                {record.documentDescription && (
                  <div className="vfy-field" style={{ flex: "2 1 200px" }}>
                    <dt>Document</dt>
                    <dd>{record.documentDescription}</dd>
                  </div>
                )}
                {record.workspaceName && (
                  <div className="vfy-field">
                    <dt>Workspace</dt>
                    <dd>{record.workspaceName}</dd>
                  </div>
                )}
                {record.completedAt && (
                  <div className="vfy-field">
                    <dt>Completed</dt>
                    <dd>{record.completedAt}</dd>
                  </div>
                )}
                {record.evidenceAvailability.participantCount > 0 && (
                  <div className="vfy-field">
                    <dt>Participants</dt>
                    <dd>{record.evidenceAvailability.participantCount}</dd>
                  </div>
                )}
              </dl>
            )}

            {/* Guidance text */}
            <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 16px", lineHeight: 1.6, borderLeft: `3px solid ${recordStatusStyle(record.transactionRecordStatus).border}`, paddingLeft: 12 }}>
              {TRANSACTION_RECORD_STATUS_GUIDANCE[record.transactionRecordStatus]}
            </p>

            {/* Authenticated links to the transaction */}
            {record.canLinkToTransaction && record.associatedTransactionId && (
              <div>
                <p className="vfy-label" style={{ marginBottom: 8 }}>Associated Transaction</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    to={`/app/documents/${record.associatedTransactionId}`}
                    className="vfy-action-link"
                    aria-label="Open transaction overview"
                  >
                    Overview
                  </Link>
                  <Link
                    to={`/app/documents/${record.associatedTransactionId}/participants`}
                    className="vfy-action-link"
                    aria-label="View participants"
                  >
                    Participants
                  </Link>
                  <Link
                    to={`/app/documents/${record.associatedTransactionId}/activity`}
                    className="vfy-action-link"
                    aria-label="View activity log"
                  >
                    Activity
                  </Link>
                  <Link
                    to={`/app/documents/${record.associatedTransactionId}/evidence`}
                    className="vfy-action-link"
                    aria-label="View evidence"
                  >
                    Evidence
                  </Link>
                </div>
                <p style={{ fontSize: 11.5, color: "#64748B", margin: "8px 0 0" }}>
                  These links are available because this verification record is associated with a transaction in your workspace.
                </p>
              </div>
            )}

            {/* Public verify link */}
            <div style={{ marginTop: record.canLinkToTransaction ? 14 : 0, paddingTop: record.canLinkToTransaction ? 14 : 0, borderTop: record.canLinkToTransaction ? "1px solid #F1F5F9" : "none" }}>
              <a
                href={`/verify?id=${encodeURIComponent(record.verificationId)}`}
                className="vfy-action-link"
                style={{ fontSize: 12 }}
                aria-label="Open public verification page for this ID"
                target="_blank"
                rel="noopener noreferrer"
              >
                ↗ View public record
              </a>
              <span style={{ fontSize: 11.5, color: "#94A3B8", marginLeft: 8 }}>
                Publicly verifiable: {record.publiclyVerifiable ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {/* ── File match status panel ── */}
          <div className="vfy-card" aria-label="File comparison status">
            <p className="vfy-section-title" style={{ marginBottom: 6 }}>File Comparison <span style={{ fontWeight: 400, color: "#64748B", fontSize: 12 }}>(optional, simulated)</span></p>

            <div className="vfy-notice" style={{ marginBottom: 14, fontSize: 12 }}>
              <strong>Demonstration notice:</strong> File comparison is simulated in this frontend demonstration.
              The selected file is not uploaded, hashed, or stored. A simulated result is returned
              based on the filename and the fixture scenario.
            </div>

            <div style={{ marginBottom: 14 }}>
              <p className="vfy-label">File Match Status</p>
              <StatusPill
                status={FILE_MATCH_STATUS_LABELS[effectiveFileMatch]}
                palette={fileMatchStyle(effectiveFileMatch)}
              />
            </div>

            {/* File selection */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                aria-label="Select a PDF or Word document for simulated comparison (file is not uploaded)"
                style={{ display: "none" }}
                id="vfy-file-input"
              />
              <label
                htmlFor="vfy-file-input"
                className="vfy-btn-secondary"
                style={{ cursor: "pointer", display: "inline-block" }}
                aria-describedby="vfy-file-notice"
              >
                {selectedFile ? "Change file" : "Select a file"}
              </label>

              {selectedFile && (
                <>
                  <span style={{ fontSize: 13, color: "#475569" }}>
                    {selectedFile.fileName}{" "}
                    <span style={{ color: "#94A3B8" }}>({(selectedFile.fileSizeBytes / 1024).toFixed(0)} KB)</span>
                  </span>
                  <button
                    type="button"
                    className="vfy-btn-primary"
                    onClick={handleCompare}
                    disabled={fileCompareState === "running" || !record || record.transactionRecordStatus === "record-unavailable"}
                  >
                    {fileCompareState === "running" ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="vfy-spinner" aria-hidden />
                        Simulating…
                      </span>
                    ) : "Run Simulated Comparison"}
                  </button>
                  <button
                    type="button"
                    className="vfy-btn-secondary"
                    onClick={() => { setSelectedFile(null); setFileMatchOverride(null); setFileCompareState("idle"); }}
                    aria-label="Remove selected file"
                    style={{ padding: "5px 10px", fontSize: 12 }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            <p id="vfy-file-notice" style={{ fontSize: 11.5, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
              Accepted: PDF, DOC, DOCX. Max 20 MB for this demonstration.
              The selected file remains in this browser session for the frontend demonstration and is not uploaded or stored.
            </p>

            {/* File match guidance */}
            {fileCompareState === "done" && fileMatchOverride && (
              <div style={{ marginTop: 12 }}>
                {fileMatchOverride === "match" && (
                  <div className="vfy-notice" style={{ fontSize: 12, background: "#F0FDF4", borderColor: "#BBF7D0", color: "#14532D" }}>
                    <strong>Simulated match.</strong> In this frontend demonstration, the selected file produced a simulated match result.
                    This is not a real cryptographic comparison and does not confirm that the file is identical to the signed document.
                    This does not establish legal validity.
                  </div>
                )}
                {fileMatchOverride === "mismatch" && (
                  <div className="vfy-notice-warn" style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#7F1D1D" }}>
                    <strong>Simulated mismatch.</strong> In this frontend demonstration, the selected file produced a simulated mismatch result.
                    The document you selected may differ from the one associated with this signing record.
                    This is not a real cryptographic comparison.
                  </div>
                )}
                {(fileMatchOverride === "unsupported-file") && (
                  <div className="vfy-notice-warn">
                    <strong>Unsupported file type.</strong> Only PDF and Word documents are supported for simulated comparison in this demonstration.
                  </div>
                )}
                {fileMatchOverride === "file-too-large" && (
                  <div className="vfy-notice-warn">
                    <strong>File too large.</strong> The selected file exceeds the 20 MB limit for this demonstration.
                  </div>
                )}
                {fileMatchOverride === "comparison-unavailable" && (
                  <div className="vfy-notice-warn">
                    <strong>Comparison unavailable.</strong> Simulated comparison is not available for this record scenario.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Evidence availability summary ── */}
          {record.evidenceAvailability.hasAuditEvents && record.canLinkToTransaction && record.associatedTransactionId && (
            <div className="vfy-card">
              <p className="vfy-section-title">Evidence Summary</p>
              <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 12px", lineHeight: 1.5 }}>
                This record has associated evidence available in the signing workspace.
                Evidence includes audit events, device summaries, and timestamps captured during the signing process.
                Evidence is available to authorized workspace members and designated verifiers only.
              </p>
              <dl style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: 0 }}>
                <div>
                  <dt style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Audit Events</dt>
                  <dd style={{ fontSize: 13.5, color: "#1E293B", fontWeight: 500, margin: 0 }}>{record.evidenceAvailability.hasAuditEvents ? "Available" : "None"}</dd>
                </div>
                <div>
                  <dt style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Device Summary</dt>
                  <dd style={{ fontSize: 13.5, color: "#1E293B", fontWeight: 500, margin: 0 }}>{record.evidenceAvailability.hasDeviceSummary ? "Available" : "None"}</dd>
                </div>
                <div>
                  <dt style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Timestamps</dt>
                  <dd style={{ fontSize: 13.5, color: "#1E293B", fontWeight: 500, margin: 0 }}>{record.evidenceAvailability.hasTimestamps ? "Available" : "None"}</dd>
                </div>
                {record.evidenceAvailability.restrictedToVerifiers && (
                  <div>
                    <dt style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Access</dt>
                    <dd style={{ fontSize: 13.5, color: "#B45309", fontWeight: 500, margin: 0 }}>Verifiers only</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* ── Legal notices ── */}
          <div className="vfy-notice" style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Important — Verification Limitations</p>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>A found signing record does not confirm the legal validity of the document.</li>
              <li>A simulated file match does not confirm the file is cryptographically identical to the signed document.</li>
              <li>Electronic signing through LAGDA is not the same as notarization.</li>
              <li>Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction.</li>
              <li>All results in this view are part of a frontend demonstration only.</li>
            </ul>
          </div>
        </>
      )}

      {/* ── Recent checks ── */}
      {history.length > 0 && (
        <div className="vfy-card">
          <p className="vfy-section-title">Recent Verification Checks</p>
          <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 12px" }}>
            Demonstration history — not persisted across sessions.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }} role="list" aria-label="Recent verification checks">
            {history.map(item => (
              <li key={item.id} className="vfy-history-row">
                <HistoryStatusDot s={item.transactionRecordStatus} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#1E293B", marginBottom: 2 }}>
                    {item.documentDescription}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleDemoIdClick(item.verificationId)}
                      style={{ ...GF, background: "none", border: "none", color: AZURE, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "'Geist Mono', monospace" }}
                      aria-label={`Look up ${item.verificationId} again`}
                    >
                      {item.verificationId}
                    </button>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{item.checkedAt}</span>
                    {item.workspaceName && (
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{item.workspaceName}</span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    ...GF,
                    fontSize: 11,
                    fontWeight: 600,
                    color: recordStatusStyle(item.transactionRecordStatus).text,
                    background: recordStatusStyle(item.transactionRecordStatus).bg,
                    border: `1px solid ${recordStatusStyle(item.transactionRecordStatus).border}`,
                    borderRadius: 5,
                    padding: "2px 7px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {item.transactionRecordStatus === "record-found-completed" ? "Completed" :
                   item.transactionRecordStatus === "record-found-in-progress" ? "In Progress" :
                   item.transactionRecordStatus === "record-found-cancelled" ? "Cancelled" :
                   item.transactionRecordStatus === "record-found-archived" ? "Archived" :
                   item.transactionRecordStatus === "record-not-found" ? "Not Found" :
                   "Other"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Private vs public data explainer ── */}
      <div className="vfy-card" style={{ background: "#F8FAFC" }}>
        <p className="vfy-section-title">About This Verification View</p>
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px", lineHeight: 1.6 }}>
          As a signed-in workspace member, this view shows additional context beyond what is available
          on the public verification page at <a href="/verify" style={{ color: AZURE }}>/verify</a>:
        </p>
        <ul style={{ fontSize: 13, color: "#475569", margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Links to the associated transaction in your workspace (if applicable)</li>
          <li>Evidence availability summary (audit events, device summary, timestamps)</li>
          <li>Participant count and file count from the signing record</li>
          <li>Simulated file comparison for PDF and Word documents</li>
        </ul>
        <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "10px 0 0", lineHeight: 1.5 }}>
          All results in this page are part of a frontend demonstration. No real data is fetched,
          no files are uploaded, and no records are persisted in this session.
        </p>
      </div>

      <span role="status" aria-live="polite" className="sr-only">{copiedAnnounce}</span>
      <style>{`.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }`}</style>
    </div>
  );
}
