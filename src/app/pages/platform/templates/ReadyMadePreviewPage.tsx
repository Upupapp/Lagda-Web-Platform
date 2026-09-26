// /app/templates/gallery/:readyId — preview a ready-made template, then copy
// it into the workspace and open it in the author editor.
// Inline styles only. No Burgundy.

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertCircle, ArrowRight, ChevronLeft, GitBranch, PenLine, Users } from "lucide-react";
import {
  findReadyMadeTemplate, readyMadePlaceholders, type ReadyMadeTemplate,
} from "../../../services/ready-made-templates";
import { copyReadyMadeTemplate } from "../../../services/ready-made-create";
import { realTemplatesAvailable } from "../../../services/templates-source";
import { useProcessing } from "../../../services/processing.service";
import { usePlatform } from "../../../context/PlatformContext";
import {
  PREP_PARTICIPANT_ROLE_DESCRIPTIONS, PREP_PARTICIPANT_ROLE_LABELS,
} from "../../../models/prepare";
import { PARTICIPANT_ACCENT_COLORS } from "../../../models/field-editor";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";

const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const NAVY  = "#07111F";
const RED   = "#DC2626";

/** The same content `buildReadyMadeDocument` writes, drawn as a page. */
function DocumentPreview({ template, isNarrow }: { template: ReadyMadeTemplate; isNarrow: boolean }) {
  const signers = readyMadePlaceholders(template).filter(p => p.role === "signer");
  const serif = { fontFamily: "'Times New Roman', Times, serif" };
  return (
    <div style={{ background: "#DFE3E8", borderRadius: 12, padding: isNarrow ? 10 : 24 }}>
      <div
        aria-label="Document preview"
        style={{
          background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", borderRadius: 2,
          maxWidth: 720, margin: "0 auto", padding: isNarrow ? "28px 20px" : "56px 56px",
          color: NAVY, ...serif, minHeight: isNarrow ? undefined : 560, boxSizing: "border-box",
        }}
      >
        <h2 style={{ ...serif, fontSize: isNarrow ? 21 : 24, fontWeight: 700, textAlign: "center", margin: "0 0 16px", lineHeight: 1.25, overflowWrap: "anywhere" }}>
          {template.title}
        </h2>
        <p style={{ ...serif, fontSize: isNarrow ? 15 : 14.5, lineHeight: 1.6, margin: "0 0 12px", overflowWrap: "anywhere" }}>
          {template.body}
        </p>
        {template.preparedBy && (
          <p style={{ ...serif, fontSize: 14, margin: "0 0 12px" }}>
            <strong>Prepared by:</strong> {template.preparedBy}
          </p>
        )}
        {signers.length > 0 && (
          <>
            <h3 style={{ ...serif, fontSize: 17, fontWeight: 700, margin: "24px 0 10px" }}>Signatures</h3>
            {signers.map(s => (
              <div key={s.id} style={{ marginBottom: 14, fontSize: 14 }}>
                <p style={{ ...serif, margin: "0 0 6px", fontWeight: 700 }}>{s.label}:</p>
                <p style={{ ...serif, margin: "0 0 6px" }}>
                  Signature: <span style={{ background: "#ECFDF5", color: "#047857", padding: "1px 4px", borderRadius: 3, textDecoration: "underline dotted" }}>{s.label} Signature</span>
                </p>
                <p style={{ ...serif, margin: 0 }}>
                  Date: <span style={{ background: "#ECFDF5", color: "#047857", padding: "1px 4px", borderRadius: 3, textDecoration: "underline dotted" }}>{s.label} Date</span>
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function ReadyMadePreviewPage() {
  usePageMeta();
  const { readyId } = useParams<{ readyId: string }>();
  const template = findReadyMadeTemplate(readyId);
  const navigate = useNavigate();
  const { isNarrow } = useViewport();
  const platform = usePlatform();
  const { run } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const canUse = realTemplatesAvailable(workspaceId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!template) {
    return (
      <div style={{ padding: isNarrow ? "40px 16px" : "40px 24px", textAlign: "center", ...GF }}>
        <AlertCircle size={32} color={RED} />
        <p style={{ ...GF, fontSize: 14, color: "#0F172A" }}>This ready-made template could not be found.</p>
        <Link to="/app/templates/gallery" style={{ color: AZURE }}>← Ready-made Templates</Link>
      </div>
    );
  }

  const handleUse = async () => {
    setBusy(true);
    setError(null);
    try {
      const { template: created } = await run(
        { message: "Creating your template", detail: "Saving the roles and generating the document." },
        () => copyReadyMadeTemplate(workspaceId, template),
      );
      void navigate(`/app/templates/${created.id}/author`);
    } catch (err) {
      setError(err instanceof Error && err.message !== ""
        ? err.message
        : "The template could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const useButton = (
    <button
      type="button"
      onClick={() => { void handleUse(); }}
      disabled={!canUse || busy}
      style={{
        ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        width: isNarrow ? "100%" : undefined, padding: isNarrow ? "13px 18px" : "10px 18px",
        background: canUse ? AZURE : "#94A3B8", color: "white", border: "none", borderRadius: 8,
        fontSize: 13, fontWeight: 700, cursor: canUse && !busy ? "pointer" : "not-allowed",
      }}
    >
      <PenLine size={14} /> {busy ? "Creating…" : "Use this template"} <ArrowRight size={14} />
    </button>
  );

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: isNarrow ? "16px 16px" : "20px 24px" }}>
        <Link to="/app/templates/gallery" style={{ ...GF, fontSize: 12, color: "#64748B", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <ChevronLeft size={13} /> Ready-made Templates
        </Link>
        <div style={{
          display: "flex", flexDirection: isNarrow ? "column" : "row",
          alignItems: isNarrow ? "stretch" : "flex-start", justifyContent: "space-between", gap: isNarrow ? 12 : 16,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...GF, fontSize: 11, fontWeight: 700, color: AZURE, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {template.category}
            </p>
            <h1 style={{ ...GF, fontSize: isNarrow ? 19 : 22, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>
              {template.title}
            </h1>
            <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>{template.documentType}</p>
          </div>
          {useButton}
        </div>
        {!canUse && (
          <p role="note" style={{ ...GF, fontSize: 12.5, color: "#64748B", margin: "12px 0 0", lineHeight: 1.55 }}>
            Open a workspace to use this template. You can still preview it here.
          </p>
        )}
        {error && (
          <p role="alert" style={{ ...GF, fontSize: 12.5, color: RED, margin: "12px 0 0", lineHeight: 1.55 }}>{error}</p>
        )}
      </div>

      <div style={{
        padding: isNarrow ? 16 : "20px 24px 40px",
        display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1fr) 320px", gap: 20, alignItems: "start",
      }}>
        <DocumentPreview template={template} isNarrow={isNarrow} />

        <aside style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", minWidth: 0 }}>
          <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={13} /> Roles
          </h2>
          <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 5 }}>
            <GitBranch size={12} /> Sequential — in this order. Editable after you use it.
          </p>
          {template.preparedBy && (
            <div style={{ ...GF, fontSize: 12, color: "#475569", background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
              <strong style={{ color: "#0F172A" }}>{template.preparedBy}</strong> — you, as the sender who prepares it
            </div>
          )}
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {template.roles.map((r, i) => (
              <li key={`${String(r.routingStep)}-${r.label}`} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{
                  ...GF, width: 22, height: 22, borderRadius: "50%", flexShrink: 0, fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "white",
                  background: PARTICIPANT_ACCENT_COLORS[i % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE,
                }}>
                  {r.routingStep}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#0F172A", overflowWrap: "anywhere" }}>{r.label}</div>
                  <div style={{ ...GF, fontSize: 11.5, color: "#64748B", lineHeight: 1.45 }}>
                    <strong style={{ fontWeight: 600 }}>{PREP_PARTICIPANT_ROLE_LABELS[r.role]}</strong>
                    {" — "}{PREP_PARTICIPANT_ROLE_DESCRIPTIONS[r.role]}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
