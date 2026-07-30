// Signing Workflow — document preview panel.
//
// This is a workflow-context view of the existing deterministic document preview
// fixtures. It deliberately does NOT introduce a competing document viewer: there is
// no PDF parsing, no file fetch, and no rendered document content beyond the page
// scaffold the rest of the demonstration already uses.
//
// It never shows:
//   filled field values · signature images · initials images · signature strokes
//   Evidence · authentication details · another participant's private values
//
// It shows only safe field descriptors: field type, page number, and who owns them.

import { ChevronLeft, ChevronRight, FileText, RefreshCw, X } from "lucide-react";
import { GF, TONES, WF } from "./WorkflowStyles";
import { WorkflowPill } from "./WorkflowPrimitives";
import type {
  StageAssignedFieldRef,
  WorkflowDocumentPreviewContext,
} from "../../models/signing-workflow";
import { FIELD_TYPE_LABELS } from "../../models/field-editor";

export interface WorkflowDocumentPreviewProps {
  preview:       WorkflowDocumentPreviewContext | null;
  loading:       boolean;
  documentTitle: string;
  /** Plain-language description of what the preview is currently scoped to. */
  contextLabel:  string;
  selectedParticipantName: string | null;
  onPageChange:  (page: number) => void;
  onRetry:       () => void;
  onOpenFieldPlacement?: () => void;
  /** Rendered as a full-screen sheet on mobile when provided. */
  onClose?:      () => void;
}

export function WorkflowDocumentPreview({
  preview, loading, documentTitle, contextLabel, selectedParticipantName,
  onPageChange, onRetry, onOpenFieldPlacement, onClose,
}: WorkflowDocumentPreviewProps) {
  return (
    <section className="wf-panel wf-stack" aria-label="Document preview" style={{ gap: 14 }}>
      <div className="wf-row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: WF.navy }}>
          Document Preview
        </h2>
        {onClose && (
          <button type="button" className="wf-icon-btn" onClick={onClose} aria-label="Close document preview">
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      <p style={{ ...GF, margin: 0, fontSize: 13, fontWeight: 600, color: WF.slate7, overflowWrap: "anywhere" }}>
        {documentTitle}
      </p>
      <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
        {contextLabel}
      </p>

      {loading && (
        <div role="status" aria-live="polite" style={{ padding: 24, textAlign: "center" }}>
          <span style={{ ...GF, fontSize: 13, color: WF.slate5 }}>Loading document preview…</span>
        </div>
      )}

      {!loading && preview?.availability === "unavailable" && (
        <div
          className="wf-card"
          style={{ padding: 16, background: TONES.warning.bg, borderColor: TONES.warning.border }}
        >
          <p style={{ ...GF, margin: "0 0 12px", fontSize: 13, color: TONES.warning.text, lineHeight: 1.6 }}>
            {preview.unavailableReason
              ?? "The document preview could not be loaded. Your workflow configuration is unchanged."}
          </p>
          <button type="button" className="wf-btn wf-btn-secondary wf-btn-sm" onClick={onRetry}>
            <RefreshCw size={14} aria-hidden />
            Retry Preview
          </button>
        </div>
      )}

      {!loading && preview?.availability === "available" && (
        <>
          <PreviewCanvas preview={preview} />

          <div className="wf-row" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="wf-icon-btn"
              onClick={() => onPageChange(preview.currentPage - 1)}
              disabled={preview.currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <span
              style={{ ...GF, fontSize: 13, fontWeight: 600, color: WF.slate7 }}
              aria-live="polite"
            >
              Page {preview.currentPage} of {preview.pageCount}
            </span>
            <button
              type="button"
              className="wf-icon-btn"
              onClick={() => onPageChange(preview.currentPage + 1)}
              disabled={preview.currentPage >= preview.pageCount}
              aria-label="Next page"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>

          <FieldContextList
            fields={preview.highlightedFields}
            missing={preview.missingFieldTypes}
            participantName={selectedParticipantName}
            currentPage={preview.currentPage}
          />

          {onOpenFieldPlacement && (
            <button type="button" className="wf-btn wf-btn-secondary wf-btn-sm" onClick={onOpenFieldPlacement}>
              Open Field Placement
            </button>
          )}
        </>
      )}

      <p style={{ ...GF, margin: 0, fontSize: 11, color: WF.slate4, lineHeight: 1.6 }}>
        This preview uses the existing deterministic document fixtures. No document file was
        loaded or parsed, and no field values, signature representations, or evidence are shown.
      </p>
    </section>
  );
}

// ── Page scaffold with safe field markers ─────────────────────────────────────

function PreviewCanvas({ preview }: { preview: WorkflowDocumentPreviewContext }) {
  const onThisPage = preview.highlightedFields.filter(f => f.pageNumber === preview.currentPage);

  return (
    <div
      role="img"
      aria-label={
        onThisPage.length === 0
          ? `Page ${preview.currentPage} of ${preview.pageCount}. No fields for the current selection are on this page.`
          : `Page ${preview.currentPage} of ${preview.pageCount}. ${onThisPage.length} ${onThisPage.length === 1 ? "field" : "fields"} for the current selection are on this page.`
      }
      style={{
        position: "relative", width: "100%", aspectRatio: "1 / 1.414",
        background: WF.white, border: `1px solid ${WF.slate2}`, borderRadius: 8,
        overflow: "hidden", boxShadow: "0 1px 3px rgba(7,17,31,0.06)",
      }}
    >
      {/* Neutral page scaffold — never invented document content. */}
      <div aria-hidden style={{ padding: "12% 10%", display: "flex", flexDirection: "column", gap: "3.2%" }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            style={{
              height: 6, borderRadius: 3, background: WF.slate1,
              width: i % 4 === 3 ? "58%" : i % 3 === 0 ? "92%" : "78%",
            }}
          />
        ))}
      </div>

      {/* Safe field markers: type and ownership only, no values. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, padding: "12% 10%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
        {onThisPage.slice(0, 4).map(field => (
          <div
            key={field.fieldId}
            style={{
              border: `1.5px solid ${WF.azure}`, background: "rgba(0,120,212,0.07)",
              borderRadius: 6, padding: "6px 10px", maxWidth: "62%",
              ...GF, fontSize: 11, fontWeight: 700, color: WF.azure,
            }}
          >
            {FIELD_TYPE_LABELS[field.fieldType]}
          </div>
        ))}
      </div>

      {onThisPage.length === 0 && (
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            background: "rgba(248,250,252,0.86)",
          }}
        >
          <FileText size={26} color={WF.slate4} />
          <span style={{ ...GF, fontSize: 12, color: WF.slate5, textAlign: "center", padding: "0 16px" }}>
            No fields for the current selection on this page
          </span>
        </div>
      )}
    </div>
  );
}

// ── Field context list ────────────────────────────────────────────────────────

function FieldContextList({
  fields, missing, participantName, currentPage,
}: {
  fields: StageAssignedFieldRef[];
  missing: WorkflowDocumentPreviewContext["missingFieldTypes"];
  participantName: string | null;
  currentPage: number;
}) {
  if (fields.length === 0 && missing.length === 0) {
    return (
      <p style={{ ...GF, margin: 0, fontSize: 12, color: WF.slate5, lineHeight: 1.6 }}>
        {participantName
          ? `${participantName} has no fields assigned on this document.`
          : "Select a stage or a person to see the fields that belong to them."}
      </p>
    );
  }

  return (
    <div className="wf-stack" style={{ gap: 8 }}>
      {participantName && (
        <h3 style={{ ...GF, margin: 0, fontSize: 13, fontWeight: 700, color: WF.navy }}>
          Fields for {participantName}
        </h3>
      )}

      {fields.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {fields.map(field => (
            <li key={field.fieldId} className="wf-row" style={{ gap: 8, justifyContent: "space-between" }}>
              <span style={{ ...GF, fontSize: 12, color: WF.slate7, fontWeight: 600 }}>
                {FIELD_TYPE_LABELS[field.fieldType]}
              </span>
              <span style={{ ...GF, fontSize: 11, color: field.pageNumber === currentPage ? WF.azure : WF.slate5, fontWeight: 600 }}>
                Page {field.pageNumber}
                {field.pageNumber === currentPage && " (shown)"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {missing.length > 0 && (
        <div className="wf-row" style={{ gap: 6 }}>
          {missing.map(type => (
            <WorkflowPill
              key={type}
              label={`Missing ${FIELD_TYPE_LABELS[type]} field`}
              tone={TONES.error}
            />
          ))}
        </div>
      )}
    </div>
  );
}
