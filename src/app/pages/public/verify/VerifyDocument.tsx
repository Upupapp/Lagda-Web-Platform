import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import type { DemoVerificationResult, DemoVerificationOutcome, VerificationInputType, FormErrors } from "../../../models/forms";
import { publicVerificationService, VER_ID_RE, conversionTracker } from "../../../services/public";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

type VerifyState = "idle" | "submitting" | "result" | "error";

const OUTCOME_CONFIG: Record<DemoVerificationOutcome, { label: string; color: string; bg: string; icon: string; guidance: string }> = {
  "verified":      { label: "Verified",                    color: "#22C55E", bg: "rgba(34,197,94,0.1)",    icon: "✓", guidance: "The verification record confirms this transaction was completed. If you supplied a file, the file-match status below indicates whether the file matches the original."  },
  "file-mismatch": { label: "File Mismatch",               color: "#F97316", bg: "rgba(249,115,22,0.1)",   icon: "!", guidance: "A matching verification record was found but the file you supplied does not match the original document on record. Contact the document sender if you believe this is an error." },
  "incomplete":    { label: "Transaction Not Complete",     color: "#C9960C", bg: "rgba(201,150,12,0.1)",   icon: "○", guidance: "This transaction has not yet been completed by all participants. Verification of completed status is not available until all signing steps are finished." },
  "cancelled":     { label: "Cancelled",                   color: "#94A3B8", bg: "rgba(100,116,139,0.1)",  icon: "×", guidance: "This transaction was cancelled. No completion verification is available for cancelled transactions." },
  "voided":        { label: "Voided",                      color: "#94A3B8", bg: "rgba(100,116,139,0.1)",  icon: "×", guidance: "This transaction was voided. The document is no longer valid for signing or verification purposes." },
  "no-record":     { label: "No Matching Record",          color: "#ef4444", bg: "rgba(239,68,68,0.1)",    icon: "?", guidance: "No matching verification record was found for this ID. Check that you entered the ID correctly, including the prefix. If the record was recently created, try again in a few moments." },
  "unavailable":   { label: "Service Temporarily Unavailable", color: "#8A9BAE", bg: "rgba(71,85,105,0.1)", icon: "—", guidance: "The verification service is temporarily unavailable. Please try again later or contact support." },
};

const FILE_MATCH_LABELS: Record<string, string> = {
  "matched":       "File matches the original on record",
  "mismatch":      "File does not match the original on record",
  "not-evaluated": "File comparison not performed",
  "n/a":           "Not applicable",
};

const DEMO_VER_IDS = [
  { id: "LAGDA-VER-2026-004821", outcome: "Verified" },
  { id: "LAGDA-VER-2026-003102", outcome: "File Mismatch" },
  { id: "LAGDA-VER-2026-001455", outcome: "Incomplete" },
  { id: "LAGDA-VER-2026-000874", outcome: "Cancelled" },
  { id: "LAGDA-VER-2026-000312", outcome: "Voided" },
];

function ResultPanel({ result, onReset }: { result: DemoVerificationResult; onReset: () => void }) {
  const cfg = OUTCOME_CONFIG[result.outcome];
  const fileMatchLabel = FILE_MATCH_LABELS[result.fileMatchStatus] ?? result.fileMatchStatus;

  return (
    <div>
      {/* Demo notice — ALWAYS shown */}
      <div style={{ background: "rgba(201,150,12,0.08)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 9, padding: "10px 14px", marginBottom: 20 }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, marginBottom: 3 }}>DEMONSTRATION DATA</p>
        <p style={{ color: "#94a3b8", ...GF, fontSize: 12, margin: 0, lineHeight: 1.55 }}>
          This verification result uses demonstration data and is not connected to a production verification service.
        </p>
      </div>

      <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ color: cfg.color, fontSize: 20, fontWeight: 700, flexShrink: 0 }} aria-hidden>{cfg.icon}</span>
          <div>
            <p style={{ color: cfg.color, ...GM, fontSize: 11, fontWeight: 700, margin: "0 0 2px", letterSpacing: "0.08em" }}>VERIFICATION STATUS</p>
            <p style={{ color: cfg.color, ...GF, fontSize: 18, fontWeight: 900, margin: 0 }}>{cfg.label}</p>
          </div>
        </div>
        <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{cfg.guidance}</p>
      </div>

      {/* Record details — public safe info only */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
        <p style={{ color: "#8A9BAE", ...GM, fontSize: 9, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>VERIFICATION RECORD</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Verification ID" value={result.verificationId} mono />
          <Row label="Document" value={result.documentDescription} />
          <Row label="Transaction status" value={result.transactionStatus} />
          {result.completedAt && <Row label="Completion date" value={result.completedAt} />}
          {result.workspaceName && <Row label="Issuing workspace" value={result.workspaceName} />}
          <Row label="File-match status" value={fileMatchLabel} />
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
        <p style={{ color: "#7C8DA4", ...GF, fontSize: 11, lineHeight: 1.6, margin: 0 }}>
          Public verification shows transaction status and completion date only. Full signer identities, authentication evidence, and audit events are available to authorized workspace members only.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={onReset} style={{ background: AZURE, color: "white", ...GF, fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: 7, border: "none", cursor: "pointer", minHeight: 40 }}>
          Verify another document
        </button>
        <Link to="/resources/document-verification-guide" style={{ background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 7, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", display: "inline-flex", alignItems: "center" }}>
          Verification Guide
        </Link>
      </div>
      <Link to="/contact?category=verification" style={{ color: "#94A3B8", ...GF, fontSize: 13, textDecoration: "none" }}>Report an issue or contact support →</Link>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
      <span style={{ color: "#94A3B8", ...GF, fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "white", ...(mono ? GM : GF), fontSize: 13, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

export function VerifyDocument() {
  const [params] = useSearchParams();
  const idFromUrl = params.get("id") ?? "";
  const [inputType, setInputType] = useState<VerificationInputType>("id");
  const [verificationId, setVerificationId] = useState(idFromUrl.toUpperCase());
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<VerifyState>("idle");
  const [result, setResult] = useState<DemoVerificationResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversionTracker.track({ name: "verification_started" });
  }, []);

  // If a valid demo ID was passed in the URL, show the example
  useEffect(() => {
    if (idFromUrl) {
      setVerificationId(idFromUrl.toUpperCase());
    }
  }, [idFromUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setFileName(null); setFileSize(null); return; }
    // Only record name and size — never read content, never hash, never upload
    setFileName(file.name);
    setFileSize(file.size);
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    const normalized = verificationId.trim().toUpperCase();
    if (!normalized) {
      e.verificationId = "Verification ID is required";
    } else if (!VER_ID_RE.test(normalized)) {
      e.verificationId = "Enter a valid Verification ID (example: LAGDA-VER-2026-004821)";
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }
    setErrors({});
    setServerError(null);
    setState("submitting");
    try {
      const res = await publicVerificationService.verify({
        inputType,
        verificationId: verificationId.trim().toUpperCase(),
        fileName: fileName ?? undefined,
        fileSize: fileSize ?? undefined,
      });
      setResult(res);
      setState("result");
      conversionTracker.track({ name: "verification_demo_completed", demoResultType: res.outcome });
      setTimeout(() => resultRef.current?.focus(), 50);
    } catch {
      setState("error");
      setServerError("A network error occurred. Please try again.");
      setTimeout(() => errorRef.current?.focus(), 50);
    }
  }

  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: "#38BDF8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>DOCUMENT VERIFICATION</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
            Verify a LAGDA Document
          </h1>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
            Enter a Verification ID to check the status of a LAGDA-signed transaction. Completed transactions display a Verification ID on the completion report and signed document.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Demo notice */}
        <div style={{ background: "rgba(201,150,12,0.08)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 9, padding: "10px 14px", marginBottom: 24 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, marginBottom: 3 }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 12, margin: 0, lineHeight: 1.55 }}>
            This page demonstrates how Document Verification will work. Results use demonstration data and are not connected to a production verification service.
          </p>
        </div>

        {state === "result" && result ? (
          <div ref={resultRef} tabIndex={-1} style={{ outline: "none" }}>
            <ResultPanel result={result} onReset={() => { setState("idle"); setResult(null); setVerificationId(""); setFileName(null); setFileSize(null); }} />
          </div>
        ) : (
          <>
            {serverError && (
              <div ref={errorRef} tabIndex={-1} role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 18, outline: "none" }}>
                <p style={{ color: "#ef4444", ...GF, fontSize: 13, margin: 0 }}>{serverError}</p>
                <button onClick={() => { setServerError(null); setState("idle"); }} style={{ color: "#38bdf8", ...GF, fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0" }}>Try again</button>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-label="Document verification form" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Tab selector */}
              <div role="group" aria-label="Verification method">
                <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  {([["id", "Verification ID"], ["file", "Upload File"]] as [VerificationInputType, string][]).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setInputType(v)} role="radio" aria-checked={inputType === v}
                      style={{ flex: 1, padding: "10px", ...GF, fontSize: 13, fontWeight: inputType === v ? 700 : 500, color: inputType === v ? "white" : "#94A3B8", background: inputType === v ? "rgba(0,120,212,0.2)" : "none", border: "none", cursor: "pointer", transition: "background 0.15s", minHeight: 40 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification ID input */}
              <div>
                <label htmlFor="ver-id" style={{ display: "block", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Verification ID <span aria-hidden style={{ color: "#ef4444" }}>*</span>
                </label>
                <p id="ver-id-hint" style={{ color: "#8A9BAE", ...GF, fontSize: 11, marginBottom: 6, lineHeight: 1.4 }}>
                  Format: LAGDA-VER-YYYY-XXXXXX — found on the completion report and signed document.
                </p>
                <input id="ver-id" type="text" value={verificationId}
                  onChange={(e) => setVerificationId(e.target.value.toUpperCase())}
                  placeholder="LAGDA-VER-2026-004821"
                  aria-required aria-invalid={!!errors.verificationId}
                  aria-describedby={["ver-id-hint", errors.verificationId ? "ver-id-err" : ""].filter(Boolean).join(" ")}
                  style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid ${errors.verificationId ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, color: "white", ...GM, fontSize: 14, padding: "12px 14px", outline: "none", letterSpacing: "0.03em" }} />
                {errors.verificationId && <p id="ver-id-err" role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{errors.verificationId}</p>}
              </div>

              {/* PDF file input (concept) — visible when "file" tab selected */}
              {inputType === "file" && (
                <div>
                  <label htmlFor="ver-file" style={{ display: "block", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Upload signed PDF <span style={{ color: "#8A9BAE" }}>(optional — for file comparison)</span>
                  </label>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 9, padding: "18px", textAlign: "center" }}>
                    <input id="ver-file" type="file" accept=".pdf" onChange={handleFileChange}
                      aria-describedby="ver-file-hint"
                      style={{ display: "block", margin: "0 auto", color: "#94a3b8", ...GF, fontSize: 13 }} />
                    <p id="ver-file-hint" style={{ color: "#8A9BAE", ...GF, fontSize: 11, margin: "8px 0 0", lineHeight: 1.5 }}>
                      PDF files only. The file is not uploaded or analyzed in this demonstration.
                    </p>
                  </div>
                  {fileName && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{fileName} ({fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : ""})</span>
                      <button type="button" onClick={() => { setFileName(null); setFileSize(null); }} style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer", ...GF, fontSize: 12, padding: "2px" }} aria-label="Remove file">Remove</button>
                    </div>
                  )}
                  <p style={{ color: "#7C8DA4", ...GF, fontSize: 11, margin: "6px 0 0", lineHeight: 1.5 }}>
                    Production file comparison uses cryptographic hash verification. This demonstration shows the file name and size only — no content is read, analyzed, or uploaded.
                  </p>
                </div>
              )}

              <button type="submit" disabled={state === "submitting"}
                style={{ background: state === "submitting" ? "rgba(0,120,212,0.5)" : AZURE, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", borderRadius: 8, border: "none", cursor: state === "submitting" ? "not-allowed" : "pointer", minHeight: 48, transition: "background 0.15s" }}
                aria-busy={state === "submitting"}>
                {state === "submitting" ? "Checking…" : "Check Verification Record"}
              </button>
            </form>

            {/* Demo examples */}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>DEMONSTRATION IDs — TRY THESE</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DEMO_VER_IDS.map(({ id, outcome }) => (
                  <button key={id} type="button" onClick={() => setVerificationId(id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ color: "white", ...GM, fontSize: 12 }}>{id}</span>
                    <span style={{ color: "#94A3B8", ...GF, fontSize: 11, flexShrink: 0 }}>{outcome}</span>
                  </button>
                ))}
              </div>
              <p style={{ color: "#7C8DA4", ...GF, fontSize: 11, lineHeight: 1.55, margin: "10px 0 0" }}>
                These are fictional demonstration records. Any other ID returns "No Matching Record."
              </p>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link to="/resources/document-verification-guide" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none" }}>Read the Verification Guide →</Link>
              <Link to="/features/document-verification" style={{ color: "#94A3B8", ...GF, fontSize: 13, textDecoration: "none" }}>About Document Verification</Link>
              <Link to="/contact?category=verification" style={{ color: "#94A3B8", ...GF, fontSize: 13, textDecoration: "none" }}>Contact Support</Link>
            </div>
          </>
        )}
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
    </div>
  );
}
