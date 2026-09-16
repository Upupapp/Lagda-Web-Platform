// Step: Confirmation — field-placement summary before sender submits the preparation.
// Command 19 handoff to Command 20.
//
// MANDATORY DISCLOSURE: This page explicitly states that no signing request has been
// created and no document has been sent. This is a frontend-only demonstration.
// No PDF modification, no real email delivery, no eNotary involvement.
// Burgundy (#67023B) is NEVER used here — it is eNotary-only.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import { FieldEditorProvider, useFieldEditor } from "../../../context/FieldEditorContext";
import { FIELD_TYPE_LABELS, FIELD_TYPE_ICONS } from "../../../models/field-editor";
import type { FieldDefinition } from "../../../models/field-editor";
import type { PrepParticipant } from "../../../models/prepare";
import { Z } from "../../../utils/z-index";
import { mockDocumentService } from "../../../services/mock/document.service";
import { mapPreparationDraftToDocumentListItem } from "../../../services/prepare/draft-to-document";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { ApiError } from "../../../services/api-client";
import { realSigningRequestService } from "../../../services/real/signing-request.service";
import { realPreparationService } from "../../../services/real/preparation.service";
import { fromBackendField } from "../../../services/prepare/field-sync";
import { computeSendReadiness, buildActionUrl } from "../../../services/prepare/send-readiness";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";

// ── Inner component (needs FieldEditorContext) ────────────────────────────────
function ConfirmationPageInner({ participants }: { participants: PrepParticipant[] }) {
  const navigate = useNavigate();
  const { draft, setStep, discardDraft, syncError, multiDocumentSigningGap, setFieldsSnapshot } = usePrepare();
  const { user, currentWorkspace } = usePlatform();
  const {
    initialize, fields, documents, runValidation, validation, loadRealFields,
  } = useFieldEditor();

  // Keeps the cross-step Help panel's readiness calculation current while
  // this page is open — see PrepareContext's fieldsSnapshot doc comment.
  useEffect(() => { setFieldsSnapshot(fields); }, [fields, setFieldsSnapshot]);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Whether to show the readiness banner at all — hidden on first arrival so
  // the page doesn't flash "not ready" before the visitor has done anything,
  // shown from the first Send attempt onward. The banner's CONTENT below is
  // never a stale click-time snapshot — see `readiness`.
  const [hasAttemptedSend, setHasAttemptedSend] = useState(false);

  // Live readiness — recomputed on every render from current draft/fields
  // state, never cached in useState. A stale snapshot here previously meant
  // fixing a field on the Fields step and returning to Review still showed
  // the OLD blocker list until Send was clicked again; this makes the
  // banner (and the "ready to send" state generally) always reflect reality.
  const readiness = useMemo(
    () => (draft ? computeSendReadiness({ draft, multiDocumentSigningGap, syncError, fields }) : null),
    [draft, multiDocumentSigningGap, syncError, fields],
  );

  // NEW LOGICAL OPERATION → NEW KEY. RETRY OF THE SAME AMBIGUOUS OPERATION →
  // SAME KEY. SUCCESS → RETIRE. Same rule PlatformContext.createWorkspace
  // already established for workspace creation (see its own comment) —
  // applied here to both the create and the send call, each with its own
  // key, so a double-click or a retry after a lost response never mints a
  // second signing request or sends the same one twice. In-memory only
  // (lost on a full page reload) — same accepted limitation as the
  // workspace-creation precedent, not a new regression.
  const pendingSendRef = useRef<{
    documentId: string;
    createKey: string;
    signingRequestId: string | null;
    sendKey: string | null;
  } | null>(null);

  useEffect(() => {
    setStep(null);
    if (draft) initialize(draft.id, draft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  // Real-backend field load. initialize() above seeds demo fields in mock
  // mode only (see MockFieldEditorService) — in real mode it starts EMPTY,
  // and unlike FieldsPage this page has no load effect of its own, so it
  // used to render "0 fields placed" and a false "no Signature field" even
  // when the backend genuinely had them (found by browser QA). Each page
  // owns its own FieldEditor instance, so the summary/readiness here must
  // fetch the real fields the same way FieldsPage does, translating them
  // back with their `bf_` ids (so they read as already-saved).
  const realFieldsLoadedRef = useRef(false);
  useEffect(() => {
    if (!USE_REAL_BACKEND || !draft || !currentWorkspace || documents.length === 0) return;
    if (realFieldsLoadedRef.current) return;
    realFieldsLoadedRef.current = true;
    const workspaceId = currentWorkspace.id;
    void (async () => {
      const loaded: FieldDefinition[] = [];
      for (const doc of documents) {
        const backendDocId = draft.files.find((f) => f.id === doc.prepFileId)?.backendDocumentId;
        if (!backendDocId) continue;
        try {
          const prep = await realPreparationService.get(workspaceId, backendDocId);
          const pageIdForNumber = (n: number) => doc.pages.find((p) => p.pageNumber === n)?.id ?? null;
          for (const f of prep.fields) {
            const translated = fromBackendField(f, doc.id, pageIdForNumber);
            if (translated) loaded.push(translated);
          }
        } catch {
          // Non-fatal: the summary just shows what did load; the send call
          // itself is still gated by the backend, never by this view.
        }
      }
      loadRealFields(loaded);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, currentWorkspace?.id, documents.length]);

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

  // REAL SEND — P2. computeSendReadiness() is the single gate: nothing here
  // re-derives its rules. STOPS at a backend-confirmed "sent" signing
  // request; never claims "completed" (unreachable — see P2 mission §17) and
  // never discards the draft until the backend has actually confirmed send.
  const handleRealSend = async () => {
    if (!draft || sending) return;
    const workspaceId = currentWorkspace?.id;
    const documentId = draft.files.find((f) => f.backendDocumentId)?.backendDocumentId;

    setHasAttemptedSend(true);
    if (!readiness || !readiness.ready) {
      setSendError(null);
      return;
    }

    if (!workspaceId || !documentId) {
      setSendError("This document has not finished uploading to the server yet.");
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      let pending = pendingSendRef.current;
      if (!pending || pending.documentId !== documentId) {
        pending = { documentId, createKey: crypto.randomUUID(), signingRequestId: null, sendKey: null };
      }
      pendingSendRef.current = pending;

      let signingRequestId = pending.signingRequestId;
      if (!signingRequestId) {
        const created = await realSigningRequestService.create(workspaceId, documentId, pending.createKey);
        signingRequestId = created.signingRequestId;
        pending.signingRequestId = signingRequestId;
        pendingSendRef.current = pending;
        if (created.state === "draft") {
          await realSigningRequestService.markReadyToSend(workspaceId, signingRequestId);
        }
      }

      if (!pending.sendKey) pending.sendKey = crypto.randomUUID();
      pendingSendRef.current = pending;
      await realSigningRequestService.send(workspaceId, signingRequestId, pending.sendKey);

      // Backend-confirmed. This logical attempt is over — the next Send
      // (a different document, some other time) must never reuse these keys.
      pendingSendRef.current = null;
      await discardDraft();
      void navigate("/app/documents");
    } catch (err) {
      setSendError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong sending this signing request. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

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
  const participantCount = draft.participants.length;

  return (
    <div style={{
      position:  "fixed",
      inset:     0,
      zIndex:    Z.drawer,
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
          {USE_REAL_BACKEND
            ? "Review the summary below before sending this signing request to your participants."
            : "Review the summary below before completing this workflow. This is a demonstration — no document will be sent."}
        </p>

        {/* MANDATORY DISCLOSURE */}
        {USE_REAL_BACKEND ? (
          <div style={{
            padding:      "14px 18px",
            borderRadius: 10,
            background:   "#F0FAF4",
            border:       "1px solid #A8D5B5",
            marginBottom: 28,
          }}>
            <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#2E7D32", marginBottom: 4 }}>
              Real Signing Request
            </div>
            <p style={{ ...GF, fontSize: 12, color: "#2E5E38", margin: 0, lineHeight: 1.6 }}>
              Sending creates a real signing request on the server and queues real invitation delivery to each
              participant. This does not yet confirm the email was delivered, only that the server accepted the
              send — and it stops at "sent"; automatic completion/final-document generation is not part of this
              release yet.
            </p>
          </div>
        ) : (
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
        )}

        {USE_REAL_BACKEND && hasAttemptedSend && (readiness?.blockers.length ?? 0) > 0 && (
          <div style={{
            padding: "12px 18px", borderRadius: 10, background: "#FFF5F5",
            border: "1px solid #F5C6CB", marginBottom: 24,
          }}>
            <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#C0392B", marginBottom: 6 }}>
              This document is not ready to send
            </div>
            <ul style={{ ...GF, fontSize: 12, color: "#C0392B", margin: 0, paddingLeft: 18 }}>
              {readiness!.blockers.map((b, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex", flexWrap: "wrap", alignItems: "center",
                    justifyContent: "space-between", gap: 8, marginBottom: 6,
                  }}
                >
                  <span style={{ flex: "1 1 220px" }}>{b.message}</span>
                  {b.action && (
                    <button
                      type="button"
                      onClick={() => void navigate(buildActionUrl(b.action!))}
                      style={{
                        ...GF, fontSize: 12, fontWeight: 700, color: AZURE,
                        background: "none", border: "none", padding: "2px 0",
                        cursor: "pointer", textDecoration: "underline",
                        whiteSpace: "nowrap", flex: "0 0 auto",
                      }}
                    >
                      {b.action.label} →
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {USE_REAL_BACKEND && sendError && (
          <div style={{
            padding: "12px 18px", borderRadius: 10, background: "#FFF5F5",
            border: "1px solid #F5C6CB", marginBottom: 24, ...GF, fontSize: 13, color: "#C0392B",
          }}>
            {sendError}
          </div>
        )}

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
            disabled={!canProceed || (USE_REAL_BACKEND && sending)}
            onClick={() => {
              if (USE_REAL_BACKEND) {
                void handleRealSend();
                return;
              }
              // No signing request is created — this marks the end of the
              // demonstration, not a real send. The draft still becomes a
              // visible Documents entry (status "draft", same mechanism Bulk
              // Send already uses via addDraftProjections) so it doesn't just
              // vanish, then the in-progress prepare draft itself is cleared.
              mockDocumentService.addDraftProjections([
                mapPreparationDraftToDocumentListItem(draft, user?.displayName ?? "You"),
              ]);
              void discardDraft();
              void navigate("/app/documents");
            }}
            aria-disabled={!canProceed || (USE_REAL_BACKEND && sending)}
            style={{
              ...GF,
              padding:      "10px 28px",
              borderRadius: 8,
              border:       "none",
              background:   (canProceed && !(USE_REAL_BACKEND && sending)) ? AZURE : "#8AB8D8",
              color:        WHITE,
              fontSize:     14,
              fontWeight:   700,
              cursor:       (canProceed && !(USE_REAL_BACKEND && sending)) ? "pointer" : "not-allowed",
              opacity:      (canProceed && !(USE_REAL_BACKEND && sending)) ? 1 : 0.75,
            }}
          >
            {USE_REAL_BACKEND ? (sending ? "Sending…" : "Send Signing Request") : "Complete Preparation Workflow"}
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
            {USE_REAL_BACKEND
              ? 'Sending queues a real invitation to each participant. Completion, final-document generation, and public verification are not part of this release yet. LAGDA does not make claims of being "Supreme Court approved", "tamper-proof", "blockchain verified", or "guaranteed legally valid" for any document sent through this product. eNotary services are a separate product stream and are not part of this workflow.'
              : 'This is a frontend demonstration workflow. No document has been uploaded, parsed, stored, signed, or sent. No signing request exists. No participant will receive any invitation, OTP, or email. LAGDA does not make claims of being "Supreme Court approved", "tamper-proof", "blockchain verified", or "guaranteed legally valid" for any document prepared through this demonstration. eNotary services are a separate product stream and are not part of this workflow.'}
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
