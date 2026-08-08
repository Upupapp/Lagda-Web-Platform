// Entry screen for the guided preparation workflow at /app/prepare.
// Shows three paths: Start with Files, Use a Template, Resume a Draft.
// Permission gate: users without prepareFlowEnabled see a plan-upgrade notice.
// Burgundy (#67023B) is NEVER used here. eNotary is NEVER mentioned.

import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import type { ResumableDraftSummary, PreparationStepId } from "../../../models/prepare";
import { PREPARATION_STEPS } from "../../../models/prepare";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)   return `${diffDays} days ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function stepLabel(id: PreparationStepId): string {
  return PREPARATION_STEPS.find(s => s.id === id)?.label ?? id;
}

function DraftCard({ draft, onResume }: { draft: ResumableDraftSummary; onResume: (id: string) => void }) {
  return (
    <div
      style={{
        border: "1px solid #E3E8EF",
        borderRadius: 10,
        padding: "16px 20px",
        background: "#FAFBFC",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...GF,
            fontSize: 14,
            fontWeight: 700,
            color: NAVY,
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {draft.title}
        </div>
        <div style={{ ...GF, fontSize: 12, color: SILVER, marginBottom: 8 }}>
          {formatRelativeDate(draft.updatedAt)} · {draft.fileCount} file{draft.fileCount !== 1 ? "s" : ""}
          {draft.participantCount > 0 && ` · ${draft.participantCount} participant${draft.participantCount !== 1 ? "s" : ""}`}
        </div>
        <div
          style={{
            ...GF,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: GOLD,
            background: "#FEF9EC",
            border: "1px solid #F0D07A",
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          Next: {stepLabel(draft.nextStep)}
        </div>
      </div>
      <button
        onClick={() => onResume(draft.id)}
        style={{
          ...GF,
          padding: "8px 16px",
          borderRadius: 8,
          border: `1px solid ${AZURE}`,
          background: "#FFFFFF",
          color: AZURE,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Resume →
      </button>
    </div>
  );
}

function TemplateCard({
  template,
  onUse,
}: {
  // Mirrors MockTemplateSummary. A template summary carries participant roles and
  // files only — it has no usage history to report.
  template: { id: string; name: string; description: string; roleCount: number; fileCount: number };
  onUse: (id: string) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #E3E8EF",
        borderRadius: 10,
        padding: "16px 20px",
        background: "#FAFBFC",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
          {template.name}
        </div>
        <div style={{ ...GF, fontSize: 12, color: SILVER, marginBottom: 4 }}>
          {template.description}
        </div>
        <div style={{ ...GF, fontSize: 11, color: SILVER }}>
          {template.roleCount} participant{template.roleCount !== 1 ? "s" : ""}
        </div>
      </div>
      <button
        onClick={() => onUse(template.id)}
        style={{
          ...GF,
          padding: "8px 16px",
          borderRadius: 8,
          border: `1px solid ${AZURE}`,
          background: "#FFFFFF",
          color: AZURE,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Use template
      </button>
    </div>
  );
}

export function PrepareEntryPage() {
  const navigate  = useNavigate();
  const { hasFlag } = usePlatform();
  const {
    createDraft,
    loadDraft,
    loadResumableDrafts,
    loadTemplates,
    resumableDrafts,
    templates,
  } = usePrepare();

  const canPrepare = hasFlag("prepareFlowEnabled");

  useEffect(() => {
    if (canPrepare) {
      loadResumableDrafts();
      loadTemplates();
    }
  }, [canPrepare, loadResumableDrafts, loadTemplates]);

  const handleStartNew = async () => {
    const draftId = await createDraft({ source: "new" });
    if (draftId) {
      navigate("/app/prepare/upload");
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    const draftId = await createDraft({ source: "template", templateId });
    if (draftId) {
      navigate("/app/prepare/upload");
    }
  };

  const handleResumeDraft = async (draftId: string) => {
    await loadDraft(draftId);
    navigate("/app/prepare/upload");
  };

  // ── Permission gate ───────────────────────────────────────────────────────

  if (!canPrepare) {
    return (
      <div style={{ ...GF, maxWidth: 540, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }} aria-hidden="true">📄</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
          Prepare Document is not available on your current plan
        </h1>
        <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.7, marginBottom: 28 }}>
          The guided preparation workflow — file selection, participant management, routing,
          authentication, and settings — is available on eligible LAGDA plans. Contact your
          workspace administrator or upgrade to unlock this feature.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            to="/app/documents"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid #D1D9E0`,
              background: "#FFFFFF",
              color: NAVY,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  // ── Entry screen ──────────────────────────────────────────────────────────

  return (
    <div style={{ ...GF, maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
          Prepare a Document
        </h1>
        <p style={{ fontSize: 14, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Set up a new eSignature transaction — add files, participants, routing, and authentication
          before placing signature fields.
        </p>
      </div>

      {/* Primary action */}
      <div
        style={{
          border: `2px solid ${AZURE}`,
          borderRadius: 12,
          padding: "28px 28px 24px",
          marginBottom: 32,
          background: "#F0F7FF",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: AZURE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            📄
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: "0 0 6px" }}>
              Start with files from your computer
            </h2>
            <p style={{ fontSize: 13, color: "#4B5E70", margin: "0 0 16px", lineHeight: 1.6 }}>
              Select one or more PDF or Word documents. No files are uploaded in this frontend
              demonstration — only file metadata is used.
            </p>
            <button
              onClick={handleStartNew}
              style={{
                ...GF,
                padding: "11px 28px",
                borderRadius: 8,
                border: "none",
                background: AZURE,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Start preparation →
            </button>
          </div>
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 14px" }}>
            Use a template
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {templates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Resume drafts */}
      {resumableDrafts.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 14px" }}>
            Resume a draft
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {resumableDrafts.map(d => (
              <DraftCard
                key={d.id}
                draft={d}
                onResume={handleResumeDraft}
              />
            ))}
          </div>
        </section>
      )}

      {/* Footer notice */}
      <div
        style={{
          ...GF,
          fontSize: 12,
          color: SILVER,
          lineHeight: 1.7,
          paddingTop: 24,
          borderTop: "1px solid #E3E8EF",
        }}
      >
        <strong style={{ color: "#4B5E70" }}>About LAGDA eSignature</strong>
        <br />
        This is a frontend demonstration of the LAGDA document preparation workflow. No files are
        uploaded or stored. No invitations are sent. Transactions prepared here exist as in-browser
        drafts only and are not persisted to a server in this demonstration.
      </div>
    </div>
  );
}
