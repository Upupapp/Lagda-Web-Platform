// The signature record for one signing request: who signed, and when.
//
// Reads GET /workspaces/:id/signing-requests/:id/signatures — a surface
// separate from the request's own detail route on purpose. That one returns
// the immutable snapshot (who was named, where they sign) and deliberately
// carries no ceremony state; this one answers "how far has it got". Keeping
// them apart is what makes it unambiguous, at every call site, whether you
// are looking at what was agreed or at what has happened since.
//
// Presented as a record rather than a status widget: for a signed document
// the interesting content is evidentiary — the party's name, the address the
// invitation went to, and the exact instant their submission was accepted.

import { useState, useEffect, type CSSProperties } from "react";
import { X, CheckCircle2, Clock, XCircle, MinusCircle, ShieldCheck } from "lucide-react";
import {
  realSigningRequestService,
  type SigningRequestSignatures, type Signatory, type RecipientWorkflowState,
} from "../../services/real/signing-request.service";
import { Z } from "../../utils/z-index";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };

const NAVY   = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const GREEN  = "#059669";
const AMBER  = "#B45309";
const RED    = "#DC2626";
const AZURE  = "#0078D4";

/** Absolute, with the timezone shown — an evidentiary timestamp is useless
 *  as "2 days ago", and ambiguous without an offset. */
function fmtAbsolute(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}

const STATE_PRESENTATION: Record<RecipientWorkflowState, {
  label: string; color: string; icon: typeof CheckCircle2;
}> = {
  signed:   { label: "Signed",       color: GREEN,  icon: CheckCircle2 },
  active:   { label: "Awaiting",     color: AMBER,  icon: Clock },
  // "Not yet their turn" — a real and different thing from "we are waiting
  // on them", which is what `active` means.
  waiting:  { label: "Not yet due",  color: SLATE4, icon: MinusCircle },
  declined: { label: "Declined",     color: RED,    icon: XCircle },
};

/** A single labeled fact. Every field the record shows is named explicitly. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.05em", ...GF }}>
        {label}
      </span>
      <span style={{ fontSize: 12.5, color: NAVY, marginLeft: 6, ...GF, wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

function SignatoryRow({ signatory }: { signatory: Signatory }) {
  const presentation = STATE_PRESENTATION[signatory.state];
  const Icon = presentation.icon;

  return (
    <li style={{ padding: "14px 0", borderBottom: `1px solid #F1F5F9`, listStyle: "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Icon size={17} aria-hidden style={{ color: presentation.color, flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: NAVY, ...GF }}>
              {signatory.name}
            </span>
            <span style={{ fontSize: 10, fontWeight: 400, color: SLATE4, ...GF }}>
              (name in document)
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: presentation.color, ...GF }}>
              {presentation.label}
            </span>
            {!signatory.isRequired && (
              <span style={{ fontSize: 11, color: SLATE4, ...GF }}>optional</span>
            )}
          </div>

          {/* Every remaining field named, per its origin: what the SENDER
              wrote when preparing the document, distinct from the LAGDA
              account the person actually signed in with, if any -- the two
              can differ, and for a legal record that difference is the
              point. */}
          <Detail label="Email in document" value={signatory.email} />
          <Detail label="Company" value={signatory.organization ?? "Not provided"} />

          {(signatory.linkedAccountName !== null || signatory.linkedAccountEmail !== null) && (
            <div style={{
              marginTop: 8, padding: "8px 10px", borderRadius: 8,
              background: "#EFF6FF", border: `1px solid #BFDBFE`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={13} aria-hidden style={{ color: AZURE, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: AZURE, ...GF }}>
                  Signed in with a LAGDA account
                </span>
              </div>
              <Detail label="Account name" value={signatory.linkedAccountName ?? "Not available"} />
              <Detail label="Account email" value={signatory.linkedAccountEmail ?? "Not available"} />
            </div>
          )}

          {/* The evidentiary line. Only ever rendered from a real instant —
              there is no "signed (date unknown)" state to represent. */}
          {signatory.signedAt !== null && (
            <div style={{ fontSize: 12, color: NAVY, marginTop: 6, ...GF }}>
              Signed {fmtAbsolute(signatory.signedAt)}
            </div>
          )}
          {signatory.declinedAt !== null && (
            <div style={{ fontSize: 12, color: RED, marginTop: 6, ...GF }}>
              Declined {fmtAbsolute(signatory.declinedAt)}
              {signatory.declineReason !== null && ` · ${signatory.declineReason.replace(/-/g, " ")}`}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export interface SignatureRecordDialogProps {
  workspaceId: string;
  signingRequestId: string;
  documentTitle: string;
  onClose: () => void;
}

export function SignatureRecordDialog({
  workspaceId, signingRequestId, documentTitle, onClose,
}: SignatureRecordDialogProps) {
  const [data, setData] = useState<SigningRequestSignatures | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    void realSigningRequestService.signatures(workspaceId, signingRequestId)
      .then(result => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [workspaceId, signingRequestId]);

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Signature record for ${documentTitle}`}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(7,17,31,0.55)", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, width: "min(560px, 100%)",
        maxHeight: "min(85vh, 760px)", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, padding: "16px 18px", borderBottom: `1px solid ${SLATE2}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0, ...GF }}>
              Signature record
            </h2>
            <p
              title={documentTitle}
              style={{
                fontSize: 12, color: SLATE6, margin: "3px 0 0", ...GF,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: SLATE4, padding: 2, flexShrink: 0,
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "4px 18px 18px" }}>
          {failed && (
            <p style={{ fontSize: 13, color: SLATE6, padding: "24px 0", ...GF }}>
              This document&apos;s signature record could not be loaded.
            </p>
          )}

          {!failed && data === null && (
            <p style={{ fontSize: 13, color: SLATE4, padding: "24px 0", ...GF }}>
              Loading…
            </p>
          )}

          {data !== null && (
            <>
              <p style={{ fontSize: 13, color: SLATE6, margin: "14px 0 2px", ...GF }}>
                <strong style={{ color: NAVY }}>
                  {data.signedCount} of {data.requiredCount}
                </strong>
                {" "}required {data.requiredCount === 1 ? "signature" : "signatures"} completed
              </p>
              <ul style={{ margin: "8px 0 0", padding: 0 }}>
                {data.signatories.map(signatory => (
                  <SignatoryRow key={signatory.recipientId} signatory={signatory} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
