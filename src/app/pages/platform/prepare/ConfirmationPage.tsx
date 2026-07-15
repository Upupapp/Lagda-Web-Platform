// Step: Confirmation — field-placement summary before sender submits the preparation.
// Command 19 handoff to Command 20.
//
// MANDATORY DISCLOSURE: This page explicitly states that no signing request has been
// created and no document has been sent. This is a frontend-only demonstration.
// No PDF modification, no real email delivery, no eNotary involvement.
// Burgundy (#67023B) is NEVER used here — it is eNotary-only.

import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import { FieldEditorProvider, useFieldEditor } from "../../../context/FieldEditorContext";
import { FIELD_TYPE_LABELS, FIELD_TYPE_ICONS } from "../../../models/field-editor";
import type { PrepParticipant } from "../../../models/prepare";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";

// ── Inner component (needs FieldEditorContext) ────────────────────────────────
function ConfirmationPageInner({ participants }: { participants: PrepParticipant[] }) {
  const navigate = useNavigate();
  const { draft, setStep } = usePrepare();
  const {
    initialize, fields, documents, runValidation, validation,
  } = useFieldEditor();

  useEffect(() => {
    setStep(null);
    if (draft) initialize(draft.id, draft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  useEffect(() => {
    if (draft && fields.length >= 0) runValidation(draft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, fields.length]);

  const summary = useMemo(() => {
    const byType: Record<string, number> = {};
    fields.forEach(f => { byType[f.type] = (byType[f.type] ?? 0) + 1; });
    const byDoc = documents.map(doc => ({
      name:  doc.displayName,
      count: fields.filter(f => f.documentId === doc.id).length,
    }));
    const byPax = participants.map(p => ({
      name:   p.name,
      role:   p.role,
      count:  fields.filter(f => f.participantId === p.id).length,
    }));
    return { byType, byDoc, byPax, total: fields.length };
  }, [fields, documents, participants]);

  if (!draft) {
    return (
      <div style={{ ...GF, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F5F7FA" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>No Active Draft</h1>
          <p style={{ fontSize: 13, color: SILVER, margin: "0 0 20px" }}>Return to the Prepare workflow to set up your document.</p>
          <a href="/app/prepare" style={{ ...GF, color: AZURE, fontSize: 13, fontWeight: 600, display: "inline-block" }}>← Go to Prepare</a>
        </div>
      </div>
    );
  }

  const hasErrors    = (validation?.errors.length ?? 0) > 0;
  const canProceed   = !hasErrors;
  const draftTitle   = draft.details.title || "Untitled Document";
  const participantCount = draft.participants.length;

  return (
    <div style={{
      position:  "fixed",
      inset:     0,
      zIndex:    50,
      overflow:  "auto",
      background: "#F5F7FA",
    }}>
      <div style={{
        maxWidth:  640,
        margin:    "0 auto",
        padding:   "40px 20px 80px",
      }}>
        {/* Back */}
        <button
          onClick={() => navigate("/app/prepare/fields")}
          style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: AZURE, fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 24, display: "flex", alignItems: "center", gap: 4 }}
        >
          ← Back to Field Placement
        </button>

        {/* Title */}
        <h1 style={{ ...GF, fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
          Review your document preparation
        </h1>
        <p style={{ ...GF, fontSize: 14, color: SILVER, margin: "0 0 32px" }}>
          Review the summary below before completing this workflow. This is a demonstration — no document will be sent.
        </p>

        {/* MANDATORY DISCLOSURE */}
        <div style={{
          padding:      "14px 18px",
          borderRadius: 10,
          background:   "#EBF4FC",
          border:       "1px solid #C8E1F5",
          marginBottom: 28,
        }}>
          <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: AZURE, marginBottom: 4 }}>
            Frontend Demonstration
          </div>
          <p style={{ ...GF, fontSize: 12, color: "#2C5F8A", margin: 0, lineHeight: 1.6 }}>
            No signing request has been created. No document has been sent to any participant.
            No PDF has been modified. This preparation workflow is a demonstration of the LAGDA eSignature interface only.
            No participant will receive an invitation, OTP, or email as a result of this workflow.
          </p>
        </div>

        {/* Validation summary */}
        {validation && (
          <div style={{
            padding:      "12px 18px",
            borderRadius: 10,
            background:   validation.isValid ? "#F0FAF4" : "#FFF5F5",
            border:       `1px solid ${validation.isValid ? "#A8D5B5" : "#F5C6CB"}`,
            marginBottom: 24,
          }}>
            <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: validation.isValid ? "#2E7D32" : "#C0392B" }}>
              {validation.isValid
                ? "Field placement is valid"
                : `${validation.errors.length} validation error${validation.errors.length !== 1 ? "s" : ""} found`
              }
            </div>
            {!validation.isValid && (
              <>
                <ul style={{ ...GF, fontSize: 12, color: "#C0392B", margin: "8px 0 0", paddingLeft: 18 }}>
                  {validation.errors.slice(0, 5).map(e => (
                    <li key={e.id}>{e.message}</li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/app/prepare/fields")}
                  style={{ ...GF, marginTop: 10, fontSize: 12, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  Return to editor to fix →
                </button>
              </>
            )}
          </div>
        )}

        {/* Document summary */}
        <section aria-label="Document summary" style={{ marginBottom: 24 }}>
          <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>Documents</h2>
          {summary.byDoc.map(d => (
            <div key={d.name} style={{
              ...GF,
              display:      "flex",
              justifyContent: "space-between",
              padding:      "10px 14px",
              background:   WHITE,
              borderRadius: 8,
              border:       "1px solid #E3E8EF",
              marginBottom: 6,
              fontSize:     13,
              color:        NAVY,
            }}>
              <span>📄 {d.name}</span>
              <span style={{ color: SILVER, fontWeight: 600 }}>{d.count} field{d.count !== 1 ? "s" : ""}</span>
            </div>
          ))}
          {summary.byDoc.length === 0 && (
            <p style={{ ...GF, fontSize: 13, color: SILVER }}>No documents in this draft.</p>
          )}
        </section>

        {/* Participants */}
        <section aria-label="Participants" style={{ marginBottom: 24 }}>
          <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>
            Participants ({participantCount})
          </h2>
          {summary.byPax.map(p => (
            <div key={p.name + p.role} style={{
              ...GF,
              display:      "flex",
              justifyContent: "space-between",
              alignItems:   "center",
              padding:      "10px 14px",
              background:   WHITE,
              borderRadius: 8,
              border:       "1px solid #E3E8EF",
              marginBottom: 6,
              fontSize:     13,
            }}>
              <div>
                <span style={{ fontWeight: 600, color: NAVY }}>{p.name}</span>
                <span style={{ color: SILVER, marginLeft: 8, fontSize: 12 }}>({p.role})</span>
              </div>
              <span style={{ color: SILVER, fontWeight: 600 }}>{p.count} field{p.count !== 1 ? "s" : ""}</span>
            </div>
          ))}
          {participantCount === 0 && (
            <p style={{ ...GF, fontSize: 13, color: SILVER }}>No participants added.</p>
          )}
        </section>

        {/* Field type breakdown */}
        <section aria-label="Field type breakdown" style={{ marginBottom: 32 }}>
          <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>
            Fields ({summary.total} total)
          </h2>
          {Object.entries(summary.byType).length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {Object.entries(summary.byType).map(([type, count]) => (
                <div key={type} style={{
                  ...GF,
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  padding:      "8px 12px",
                  background:   WHITE,
                  borderRadius: 7,
                  border:       "1px solid #E3E8EF",
                  fontSize:     12,
                  color:        NAVY,
                }}>
                  <span aria-hidden="true">{FIELD_TYPE_ICONS[type as keyof typeof FIELD_TYPE_ICONS] ?? "□"}</span>
                  <span>{FIELD_TYPE_LABELS[type as keyof typeof FIELD_TYPE_LABELS] ?? type}</span>
                  <span style={{ color: SILVER, fontWeight: 700, marginLeft: "auto" }}>×{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ ...GF, fontSize: 13, color: SILVER }}>No fields placed.</p>
          )}
        </section>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/app/prepare/fields")}
            style={{ ...GF, padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D9E0", background: WHITE, color: NAVY, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            ← Edit Fields
          </button>
          <button
            disabled={!canProceed}
            onClick={() => {
              // No signing request is created. This marks the end of the demonstration.
              navigate("/app/documents");
            }}
            aria-disabled={!canProceed}
            style={{
              ...GF,
              padding:      "10px 28px",
              borderRadius: 8,
              border:       "none",
              background:   canProceed ? AZURE : "#8AB8D8",
              color:        WHITE,
              fontSize:     14,
              fontWeight:   700,
              cursor:       canProceed ? "pointer" : "not-allowed",
              opacity:      canProceed ? 1 : 0.75,
            }}
          >
            Complete Preparation Workflow
          </button>
        </div>

        {!canProceed && (
          <p style={{ ...GF, fontSize: 12, color: "#C0392B", marginTop: 10 }}>
            Resolve all validation errors before completing the workflow.
          </p>
        )}

        {/* Legal footer */}
        <footer style={{ marginTop: 48, padding: "14px 0", borderTop: "1px solid #E3E8EF" }}>
          <p style={{ ...GF, fontSize: 11, color: SILVER, lineHeight: 1.7, margin: 0 }}>
            This is a frontend demonstration workflow. No document has been uploaded, parsed, stored, signed,
            or sent. No signing request exists. No participant will receive any invitation, OTP, or email.
            LAGDA does not make claims of being "Supreme Court approved", "tamper-proof", "blockchain verified",
            or "guaranteed legally valid" for any document prepared through this demonstration.
            eNotary services are a separate product stream and are not part of this workflow.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function ConfirmationPage() {
  const { draft } = usePrepare();
  const participants = draft?.participants ?? [];

  return (
    <FieldEditorProvider participants={participants.map(p => ({ id: p.id, name: p.name, role: p.role }))}>
      <ConfirmationPageInner participants={participants} />
    </FieldEditorProvider>
  );
}
