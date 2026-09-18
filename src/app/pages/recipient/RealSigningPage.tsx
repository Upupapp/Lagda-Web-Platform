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
import {
  SignatureCapture, type SignatureValue,
} from "../../components/recipient/SignatureCapture";
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
  // The ADOPTED representations, not raw text. A signature may now be drawn,
  // typed or uploaded, and the first and last are not text at all — so the
  // ceremony holds what will be submitted rather than what was typed.
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [initials, setInitials] = useState<SignatureValue | null>(null);
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
    if (f.type === "signature") return signature === null;
    if (f.type === "initials")  return initials === null;
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
        // Sent exactly as captured. `missingRequired` above has already
        // refused a null for a required field, so a non-null here is a
        // representation the signer actually adopted.
        ...(needsSignature && signature !== null ? { signature } : {}),
        ...(needsInitials && initials !== null ? { initials } : {}),
      }, submitKeyRef.current);
      submitKeyRef.current = null; // confirmed — never reused
      setPhase("submitted");
    } catch (err) {
      setErrorMessage(describeSubmissionError(err));
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
        {/* Says only what the backend actually does.

            A completion notice was removed from this screen once, because the
            promise was false: `NOTIFICATION_TYPES` had four members and none
            of them was a completion, so no producer existed and no completion
            email was ever sent.

            BACKEND-38 Phase 2 changed that. `SIGNING_COMPLETED` is a real
            notification type with a real producer: the finalization
            transaction that seals the document also writes the intent, and
            transport delivers it to the sender. So the sentence below is
            restored — but hedged exactly as far as the truth requires:

              "once every required participant has completed" — because this
              signer may not be the last one, and nothing is sent until the
              request as a whole finishes and its final seal succeeds;

              "automatically" rather than "has been" — the intent is durable
              and retried, but at this instant the email has not been sent,
              and claiming delivery is the same category of error as the
              original copy.

            The fallback line stays for the same reason: transport can
            ultimately give up, and a signer who needs confirmation should
            know they can ask. */}
        <p style={{ ...GF, fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Your signature was received and recorded. You can close this page — nothing further is
          needed from you. Once every required participant has completed their part, the sender is
          notified automatically. If you need confirmation of the completed document, contact the
          sender directly.
        </p>
      </Card>
    );
  }

  if (phase === "declined") {
    return (
      <Card>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>Request declined</h1>
        {/* "The sender has been notified" is false here, and — unlike the
            submitted screen above — it is STILL false after BACKEND-38
            Phase 2. That phase added `SIGNING_COMPLETED` only. There is no
            decline notification type and no producer, so nothing tells the
            sender this happened.

            The decline IS recorded — it ends the request for everyone and
            revokes every grant — so that is what this says instead. */}
        <p style={{ ...GF, fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Your decline was recorded and this signing request is now closed. If you declined by
          mistake, contact the sender — a new request would have to be sent.
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
            <SignatureCapture
              label="Signature (required)"
              purpose="signature"
              value={signature}
              onChange={setSignature}
              disabled={submitting}
            />
          )}
          {needsInitials && (
            <SignatureCapture
              label="Initials (required)"
              purpose="initials"
              value={initials}
              onChange={setInitials}
              disabled={submitting}
            />
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

/**
 * The submit path's error wording.
 *
 * Separate from `describeError` because one refusal here has a remedy the
 * signer can act on, and the generic envelope message does not mention it.
 *
 * The backend refuses a typed signature its renderer cannot draw — it checks
 * while the signer is still present precisely so this can be said. A name with
 * characters the embedded face has no glyphs for, or one in a script its
 * shaper cannot lay out, is a hard stop for typing and completely fine for
 * drawing. Saying only "could not be accepted" would leave the one group of
 * signers affected by that check with no way forward.
 */
function describeSubmissionError(err: unknown): string {
  if (err instanceof ApiError) {
    const unrenderable = err.body?.details?.find(
      (detail) => detail.code === "signature-unrenderable");
    if (unrenderable) {
      const control = unrenderable.field === "initials" ? "initials" : "signature";
      return `Your typed ${control} can't be drawn into this document. `
        + `Switch to Draw or Upload above, or try a different spelling.`;
    }
  }
  return describeError(err);
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your signing session has ended. Open your signing link again to continue.";
    if (err.status === 403) return "This action could not be verified. Reload the page and try again.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
