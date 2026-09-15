// REAL recipient signing ceremony — P2. Deliberately a fresh, self-contained
// flow rather than a rewrite of the mock RecipientContext state machine:
// that mock models steps (auth-challenge OTP, approver/reviewer decisions,
// signature-library adoption) with NO backend counterpart. This page uses
// only what packages/api/src/signing-access-routes.ts and
// signing-ceremony-routes.ts actually implement today (see
// services/real/signing-access.service.ts and signing-submission.service.ts).
//
// SECURITY: this page NEVER imports PlatformContext, api-client's
// apiRequest, or anything from the sender/workspace realm. All calls go
// through recipient-api-client.ts, which reads the SEPARATE
// `lagda_signing_csrf` cookie — see that file's header. A recipient here has
// no LAGDA session and none is required.
//
// BOUNDARY (P2 §17): stops at a backend-confirmed submission. Never claims
// "completed" or shows a final/sealed document — that state does not exist
// in the backend yet (see the P1.5/master-audit findings on the unwired
// completion pipeline).

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  realSigningAccessService, type CeremonyView, type CeremonyField,
} from "../../services/real/signing-access.service";
import {
  realSigningSubmissionService, type SubmittedFieldValue, type SigningDeclineReason,
} from "../../services/real/signing-submission.service";
import { ApiError } from "../../services/api-client";
import { DECLINE_REASON_CATEGORIES } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";

type Phase = "loading" | "unavailable" | "consent" | "ceremony" | "submitted" | "declined" | "decline-form";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...GF, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100dvh - 102px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 560, width: "100%", background: WHITE, borderRadius: 14, border: "1px solid #E3E8EF", padding: "36px 32px" }}>
        {children}
      </div>
    </div>
  );
}

export function RealSigningPage() {
  const { requestId: token } = useParams<{ requestId: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [view, setView] = useState<CeremonyView | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [signatureText, setSignatureText] = useState("");
  const [initialsText, setInitialsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [declineReason, setDeclineReason] = useState<SigningDeclineReason>("not-agree");

  // Same NEW-KEY / RETRY-SAME-KEY / RETIRE-ON-SUCCESS rule as sender Send
  // (ConfirmationPage) — one submission per ceremony, in-memory only.
  const submitKeyRef = useRef<string | null>(null);

  const documentUrlRef = useRef<string | null>(null);
  useEffect(() => {
    documentUrlRef.current = documentUrl;
  }, [documentUrl]);
  useEffect(() => () => {
    if (documentUrlRef.current) URL.revokeObjectURL(documentUrlRef.current);
  }, []);

  const enterCeremony = async () => {
    try {
      const ceremony = await realSigningAccessService.enter();
      applyView(ceremony);
    } catch (err) {
      setErrorMessage(describeError(err));
      setPhase("unavailable");
    }
  };

  const applyView = (ceremony: CeremonyView) => {
    setView(ceremony);
    if (ceremony.consent.required && !ceremony.consent.accepted && ceremony.access.mayAcceptConsent) {
      setPhase("consent");
      return;
    }
    setPhase("ceremony");
    if (ceremony.access.mayViewDocument && !documentUrlRef.current) {
      void realSigningAccessService.documentBlob().then((blob) => {
        const url = URL.createObjectURL(blob);
        setDocumentUrl(url);
      }).catch(() => {
        // Non-fatal — the recipient can still fill/sign assigned fields
        // without an inline preview.
      });
    }
  };

  useEffect(() => {
    if (!token) {
      setErrorMessage("This signing link is missing its access token.");
      setPhase("unavailable");
      return;
    }
    void (async () => {
      try {
        await realSigningAccessService.bootstrap(token);
        await enterCeremony();
      } catch (err) {
        setErrorMessage(describeError(err));
        setPhase("unavailable");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAcceptConsent = async () => {
    if (!view) return;
    try {
      const updated = await realSigningAccessService.acceptConsent(view.consent.requiredVersion);
      applyView(updated);
    } catch (err) {
      setErrorMessage(describeError(err));
    }
  };

  const assignedFields = view?.fields.filter((f) => f.valueAuthority === "RECIPIENT_SUPPLIED") ?? [];
  const needsSignature = assignedFields.some((f) => f.type === "signature");
  const needsInitials  = assignedFields.some((f) => f.type === "initials");

  const buildFieldValues = (): SubmittedFieldValue[] => {
    return assignedFields.map((f): SubmittedFieldValue => {
      if (f.type === "signature") return { kind: "signature", fieldId: f.fieldId };
      if (f.type === "initials")  return { kind: "initials", fieldId: f.fieldId };
      if (f.type === "checkbox")  return { kind: "checkbox", fieldId: f.fieldId, checked: values[f.fieldId] === true };
      return { kind: "text", fieldId: f.fieldId, text: typeof values[f.fieldId] === "string" ? (values[f.fieldId] as string) : "" };
    });
  };

  const missingRequired = assignedFields.filter((f) => {
    if (!f.required) return false;
    if (f.type === "signature") return !signatureText.trim();
    if (f.type === "initials")  return !initialsText.trim();
    if (f.type === "checkbox")  return values[f.fieldId] !== true;
    return !values[f.fieldId] || String(values[f.fieldId]).trim() === "";
  });

  const handleSubmit = async () => {
    if (!view || submitting) return;
    if (missingRequired.length > 0) {
      setErrorMessage(`Complete all required fields first: ${missingRequired.map((f) => f.label).join(", ")}.`);
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      if (!submitKeyRef.current) submitKeyRef.current = crypto.randomUUID();
      await realSigningSubmissionService.submit({
        fieldValues: buildFieldValues(),
        ...(needsSignature ? { signature: { method: "typed" as const, text: signatureText.trim(), styleIndex: 0 } } : {}),
        ...(needsInitials  ? { initials:  { method: "typed" as const, text: initialsText.trim(),  styleIndex: 0 } } : {}),
      }, submitKeyRef.current);
      submitKeyRef.current = null; // confirmed — never reused
      setPhase("submitted");
    } catch (err) {
      setErrorMessage(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    try {
      await realSigningSubmissionService.decline(declineReason);
      setPhase("declined");
    } catch (err) {
      setErrorMessage(describeError(err));
    }
  };

  if (phase === "loading") {
    return <Card><p style={{ ...GF, fontSize: 14, color: SILVER, textAlign: "center", margin: 0 }}>Loading your signing request…</p></Card>;
  }

  if (phase === "unavailable") {
    return (
      <Card>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>This link can't be used</h1>
        <p style={{ ...GF, fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          {errorMessage ?? "This signing link is invalid or has expired. Contact the sender for a new link."}
        </p>
      </Card>
    );
  }

  if (phase === "submitted") {
    return (
      <Card>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>Submitted</h1>
        <p style={{ ...GF, fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Your response was received by the server. The sender will be notified once every required participant
          has completed their part of this signing request.
        </p>
      </Card>
    );
  }

  if (phase === "declined") {
    return (
      <Card>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>Request declined</h1>
        <p style={{ ...GF, fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          You declined this signing request. The sender has been notified.
        </p>
      </Card>
    );
  }

  if (phase === "consent" && view) {
    return (
      <Card>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 12px" }}>Consent required</h1>
        <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 20px", lineHeight: 1.6 }}>
          Before you can view "{view.request.documentTitle}", please confirm you consent to sign and be identified
          electronically for this transaction.
        </p>
        {errorMessage && <p style={{ ...GF, fontSize: 12, color: "#C0392B", margin: "0 0 12px" }}>{errorMessage}</p>}
        <button
          onClick={() => void handleAcceptConsent()}
          style={{ ...GF, padding: "10px 22px", borderRadius: 8, border: "none", background: AZURE, color: WHITE, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          I consent — continue
        </button>
      </Card>
    );
  }

  if (phase === "decline-form" && view) {
    return (
      <Card>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 14px" }}>Decline this request</h1>
        {DECLINE_REASON_CATEGORIES.map((r) => (
          <label key={r.id} style={{ ...GF, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: NAVY, padding: "6px 0", cursor: "pointer" }}>
            <input type="radio" name="decline-reason" checked={declineReason === r.id} onChange={() => setDeclineReason(r.id as SigningDeclineReason)} />
            {r.label}
          </label>
        ))}
        {errorMessage && <p style={{ ...GF, fontSize: 12, color: "#C0392B", margin: "12px 0 0" }}>{errorMessage}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => setPhase("ceremony")} style={{ ...GF, padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D9E0", background: WHITE, color: NAVY, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={() => void handleDecline()} style={{ ...GF, padding: "10px 20px", borderRadius: 8, border: "none", background: "#C0392B", color: WHITE, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Confirm decline
          </button>
        </div>
      </Card>
    );
  }

  if (phase === "ceremony" && view) {
    if (!view.access.mayProceedToInput) {
      return (
        <Card>
          <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>Not yet your turn</h1>
          <p style={{ ...GF, fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
            This request isn't ready for your action yet — an earlier participant may still need to complete their
            part, or the request isn't currently active. Check back later.
          </p>
        </Card>
      );
    }

    return (
      <div style={{ ...GF, maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>{view.request.documentTitle}</h1>
        <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 20px" }}>
          Signing as {view.recipient.name} ({view.recipient.type})
        </p>

        {errorMessage && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FFF5F5", border: "1px solid #F5C6CB", marginBottom: 16, fontSize: 12, color: "#C0392B" }}>
            {errorMessage}
          </div>
        )}

        {documentUrl && (
          <iframe
            title="Document preview"
            src={documentUrl}
            style={{ width: "100%", height: 420, border: "1px solid #E3E8EF", borderRadius: 10, marginBottom: 24 }}
          />
        )}

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>Your fields</h2>
          {assignedFields.length === 0 && (
            <p style={{ ...GF, fontSize: 13, color: SILVER }}>No fields are assigned to you on this document.</p>
          )}
          {needsSignature && (
            <FieldRow label="Signature (required)">
              <input
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Type your full name to sign"
                style={inputStyle}
              />
            </FieldRow>
          )}
          {needsInitials && (
            <FieldRow label="Initials (required)">
              <input
                value={initialsText}
                onChange={(e) => setInitialsText(e.target.value)}
                placeholder="Type your initials"
                style={inputStyle}
              />
            </FieldRow>
          )}
          {assignedFields.filter((f) => f.type !== "signature" && f.type !== "initials").map((f: CeremonyField) => (
            <FieldRow key={f.fieldId} label={`${f.label}${f.required ? " (required)" : ""}`}>
              {f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={values[f.fieldId] === true}
                  onChange={(e) => setValues((v) => ({ ...v, [f.fieldId]: e.target.checked }))}
                />
              ) : (
                <input
                  value={typeof values[f.fieldId] === "string" ? (values[f.fieldId] as string) : ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.fieldId]: e.target.value }))}
                  maxLength={f.maxLength ?? undefined}
                  style={inputStyle}
                />
              )}
            </FieldRow>
          ))}
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{ ...GF, padding: "10px 26px", borderRadius: 8, border: "none", background: submitting ? "#8AB8D8" : AZURE, color: WHITE, fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
          <button
            onClick={() => setPhase("decline-form")}
            style={{ ...GF, padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D9E0", background: WHITE, color: "#C0392B", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ ...GF, display: "block", fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  ...GF, width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #D1D9E0", borderRadius: 7, color: NAVY,
};

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your signing session has ended. Open your signing link again to continue.";
    if (err.status === 403) return "This action could not be verified. Reload the page and try again.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
