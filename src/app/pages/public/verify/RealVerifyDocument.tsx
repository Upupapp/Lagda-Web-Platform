// The REAL public verification page (BACKEND-42 lookup + OD-135 email-gated
// document view). Rendered instead of `VerifyDocument`'s demonstration body
// whenever `USE_REAL_BACKEND` is on — see that file's branch at the bottom.
//
// Two independent steps, matching the backend's own two independent routes:
//   1. Verification ID -> GET lookup -> completion metadata (no document).
//   2. Participant email -> POST access, then POST document -> the PDF itself.
// Step 2 never runs automatically from step 1 succeeding: seeing that a
// transaction completed is not the same claim as being a participant on it,
// and the backend re-checks the email on every document fetch rather than
// minting a token step 1 could hand to step 2 (see the routes' own header).

import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router";
import {
  lookupVerification, requestParticipantAccess, fetchParticipantDocument,
  type RealVerificationRecord,
} from "../../../services/real/public-verification.service";
import { VerificationQRCode } from "../../../components/verification/VerificationQRCode";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";
const NAVY = "#07111F";

type LookupState = "idle" | "loading" | "found" | "not-found" | "error";
type AccessState = "idle" | "checking" | "granted" | "denied" | "error";
type DocumentState = "idle" | "loading" | "ready" | "denied" | "error";

function formatCompletedAt(epochMs: number): string {
  try {
    return new Date(epochMs).toLocaleString(undefined, {
      dateStyle: "long", timeStyle: "short",
    });
  } catch {
    return new Date(epochMs).toISOString();
  }
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
      <span style={{ color: "#64748B", ...GF, fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ color: NAVY, ...(mono ? GM : GF), fontSize: 13, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function RecordPanel({ record }: { record: RealVerificationRecord }) {
  const shareUrl = `${window.location.origin}/verify?id=${encodeURIComponent(record.verificationId)}`;
  return (
    <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: "20px 22px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 280px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ color: "#22C55E", fontSize: 20, fontWeight: 700, flexShrink: 0 }} aria-hidden>✓</span>
          <div>
            <p style={{ color: "#15803D", ...GM, fontSize: 11, fontWeight: 700, margin: "0 0 2px", letterSpacing: "0.08em" }}>VERIFICATION STATUS</p>
            <p style={{ color: "#15803D", ...GF, fontSize: 18, fontWeight: 900, margin: 0 }}>Verified — Completed</p>
          </div>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Verification ID" value={record.verificationId} mono />
          <Row label="Completed" value={formatCompletedAt(record.completedAt)} />
          <Row label="Participants" value={String(record.participantCount)} />
          <Row label="Final document digest (SHA-256)" value={record.finalDocument.digest} mono />
          <Row label="Seal" value={record.seal.description} />
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "center" }}>
        <p style={{ color: "#64748B", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 8px", letterSpacing: "0.08em" }}>SCAN TO VERIFY</p>
        <VerificationQRCode url={shareUrl} size={128} />
      </div>
    </div>
  );
}

function AccessPanel({ verificationId }: { verificationId: string }) {
  const [email, setEmail] = useState("");
  const [accessState, setAccessState] = useState<AccessState>("idle");
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState<string | null>(null);
  const [docState, setDocState] = useState<DocumentState>("idle");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setAccessState("checking");
    setDocumentTitle(null);
    setRecipientType(null);
    setDocState("idle");
    const result = await requestParticipantAccess(verificationId, trimmed);
    if (result.kind === "granted") {
      setAccessState("granted");
      setDocumentTitle(result.documentTitle);
      setRecipientType(result.recipientType);
    } else if (result.kind === "denied") {
      setAccessState("denied");
    } else {
      setAccessState("error");
    }
  }

  async function handleViewDocument() {
    setDocState("loading");
    const result = await fetchParticipantDocument(verificationId, email.trim());
    if (result.kind === "ok") {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(result.blob);
      objectUrlRef.current = url;
      setDocState("ready");
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (result.kind === "denied") {
      setDocState("denied");
    } else {
      setDocState("error");
    }
  }

  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
      <p style={{ color: NAVY, ...GF, fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>View the signed document</p>
      <p style={{ color: "#64748B", ...GF, fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.6 }}>
        Enter the email address you were a participant with on this transaction. No password is required —
        the address itself is the proof, the same way your completed-copy email works.
      </p>

      {accessState !== "granted" && (
        <form onSubmit={handleVerifyEmail} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <label htmlFor="rv-email" style={{ display: "block", color: "#334155", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
              Your email address
            </label>
            <input id="rv-email" type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setAccessState("idle"); }}
              placeholder="you@example.com" required
              style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, color: NAVY, ...GF, fontSize: 14, padding: "11px 14px", outline: "none" }} />
          </div>
          <div style={{ paddingTop: 22 }}>
            <button type="submit" disabled={accessState === "checking" || !email.trim()}
              style={{ background: accessState === "checking" ? "rgba(0,120,212,0.5)" : AZURE, color: "white", ...GF, fontSize: 13, fontWeight: 700, padding: "11px 18px", borderRadius: 8, border: "none", cursor: accessState === "checking" ? "not-allowed" : "pointer", minHeight: 44 }}>
              {accessState === "checking" ? "Checking…" : "Verify & Continue"}
            </button>
          </div>
        </form>
      )}

      {accessState === "denied" && (
        <p role="alert" style={{ color: "#DC2626", ...GF, fontSize: 13, margin: "12px 0 0" }}>
          That email doesn't match a participant on this document. Check the address you were sent this transaction at and try again.
        </p>
      )}
      {accessState === "error" && (
        <p role="alert" style={{ color: "#DC2626", ...GF, fontSize: 13, margin: "12px 0 0" }}>
          A network error occurred. Please try again.
        </p>
      )}

      {accessState === "granted" && (
        <div>
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
            <p style={{ color: "#15803D", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>Access granted</p>
            <p style={{ color: "#334155", ...GF, fontSize: 13, margin: 0 }}>
              {documentTitle} — you are recorded as the {recipientType} on this transaction.
            </p>
          </div>
          <button type="button" onClick={handleViewDocument} disabled={docState === "loading"}
            style={{ background: docState === "loading" ? "rgba(0,120,212,0.5)" : AZURE, color: "white", ...GF, fontSize: 13, fontWeight: 700, padding: "11px 18px", borderRadius: 8, border: "none", cursor: docState === "loading" ? "not-allowed" : "pointer", minHeight: 44 }}>
            {docState === "loading" ? "Loading document…" : "View Document"}
          </button>
          {docState === "denied" && (
            <p role="alert" style={{ color: "#DC2626", ...GF, fontSize: 13, margin: "10px 0 0" }}>
              We couldn't confirm your access just now. Try verifying again.
            </p>
          )}
          {docState === "error" && (
            <p role="alert" style={{ color: "#DC2626", ...GF, fontSize: 13, margin: "10px 0 0" }}>
              A network error occurred while loading the document. Please try again.
            </p>
          )}
          {docState === "ready" && (
            <p style={{ color: "#64748B", ...GF, fontSize: 12, margin: "10px 0 0" }}>
              The document opened in a new tab. If it was blocked, allow pop-ups for this site and try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RealVerifyDocument() {
  const [params] = useSearchParams();
  const idFromUrl = params.get("id") ?? "";
  const [idInput, setIdInput] = useState(idFromUrl);
  const [idError, setIdError] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [record, setRecord] = useState<RealVerificationRecord | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function runLookup(id: string) {
    const trimmed = id.trim();
    if (!trimmed) { setIdError("Verification ID is required"); return; }
    setIdError(null);
    setLookupState("loading");
    setRecord(null);
    const result = await lookupVerification(trimmed);
    if (result.kind === "found") {
      setRecord(result.record);
      setLookupState("found");
      setTimeout(() => resultRef.current?.focus(), 50);
    } else if (result.kind === "not-found") {
      setLookupState("not-found");
    } else {
      setLookupState("error");
    }
  }

  useEffect(() => {
    if (idFromUrl) void runLookup(idFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runLookup(idInput);
  }

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", color: NAVY, ...GF }}>
      <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: AZURE, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>DOCUMENT VERIFICATION</p>
          <h1 style={{ color: NAVY, ...GF, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
            Verify a LAGDA Document
          </h1>
          <p style={{ color: "#334155", ...GF, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
            Enter a Verification ID to check the status of a LAGDA-signed transaction and, if you were a participant, view the completed document.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
        <form onSubmit={handleSubmit} noValidate aria-label="Document verification form" style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
          <div>
            <label htmlFor="rv-id" style={{ display: "block", color: "#334155", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
              Verification ID <span aria-hidden style={{ color: "#DC2626" }}>*</span>
            </label>
            <input id="rv-id" type="text" value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="Verification ID"
              aria-invalid={!!idError}
              style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: `1px solid ${idError ? "rgba(220,38,38,0.4)" : "rgba(0,0,0,0.14)"}`, borderRadius: 8, color: NAVY, ...GM, fontSize: 14, padding: "12px 14px", outline: "none" }} />
            {idError && <p role="alert" style={{ color: "#DC2626", ...GF, fontSize: 12, margin: "4px 0 0" }}>{idError}</p>}
          </div>
          <button type="submit" disabled={lookupState === "loading"}
            style={{ background: lookupState === "loading" ? "rgba(0,120,212,0.5)" : AZURE, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", borderRadius: 8, border: "none", cursor: lookupState === "loading" ? "not-allowed" : "pointer", minHeight: 48 }}>
            {lookupState === "loading" ? "Checking…" : "Check Verification Record"}
          </button>
        </form>

        {lookupState === "not-found" && (
          <div role="alert" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
            <p style={{ color: "#DC2626", ...GF, fontSize: 13, margin: 0 }}>
              No matching, completed LAGDA verification record was found for this ID. Check that you entered it correctly.
            </p>
          </div>
        )}
        {lookupState === "error" && (
          <div role="alert" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
            <p style={{ color: "#DC2626", ...GF, fontSize: 13, margin: 0 }}>A network error occurred. Please try again.</p>
          </div>
        )}

        {lookupState === "found" && record && (
          <div ref={resultRef} tabIndex={-1} style={{ outline: "none" }}>
            <RecordPanel record={record} />
            <AccessPanel verificationId={record.verificationId} />
          </div>
        )}

        <div style={{ background: "#f8fafb", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ color: "#64748B", ...GF, fontSize: 11, lineHeight: 1.6, margin: 0 }}>
            Public verification shows completion status only. Viewing the document itself requires proving you were a participant by email.
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link to="/resources/document-verification-guide" style={{ color: AZURE, ...GF, fontSize: 13, textDecoration: "none" }}>Read the Verification Guide →</Link>
          <Link to="/contact?category=verification" style={{ color: "#64748B", ...GF, fontSize: 13, textDecoration: "none" }}>Contact Support</Link>
        </div>
      </div>
    </div>
  );
}
