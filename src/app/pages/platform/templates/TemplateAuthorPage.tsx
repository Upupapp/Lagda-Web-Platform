// /app/templates/:templateId/author — Author a document from scratch (071).
//
// The alternative to uploading a file, and the ONLY way a template gets a
// document now — Templates never accept an upload (see
// `services/templates-source.ts`'s own header). A real rich-text editor
// (TipTap) over a flowing-document model: paragraphs, headings, numbered
// clauses, and inline "field anchor" placeholders for where a signature,
// date or initials will render — the same alternative-to-Word framing the
// feature was built for. Inline styles only. No Burgundy.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import { ChevronLeft, AlertCircle, Info, Save, CheckCircle2, FileText } from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { usePlatform } from "../../../context/PlatformContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { useProcessing } from "../../../services/processing.service";
import {
  generateTemplateDocument, saveResolvedFieldAnchors, realTemplatesAvailable,
} from "../../../services/templates-source";
import type { DocumentTemplate } from "../../../models/templates";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { flowDocumentExtensions } from "./author/extensions";
import { flowDocumentToJSON, jsonToFlowDocument } from "./author/converter";
import { RibbonToolbar } from "./author/RibbonToolbar";
import { STARTER_TEMPLATES } from "./author/starterTemplates";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF     = { fontFamily: "'Geist', sans-serif" };
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SILVER = "#64748B";
const BGCANVAS = "#DFE3E8";
const PAGE_W = 720;

const EDITOR_CSS = `
.flow-doc-editor .ProseMirror {
  outline: none;
  min-height: 960px;
  padding: 72px 64px;
  color: ${NAVY};
  font-family: 'Times New Roman', Times, serif;
  font-size: 11pt;
  line-height: 1.5;
}
.flow-doc-editor .ProseMirror p { margin: 0 0 8pt; }
.flow-doc-editor .ProseMirror h1 { font-size: 20pt; font-weight: 700; margin: 0 0 10pt; }
.flow-doc-editor .ProseMirror h2 { font-size: 16pt; font-weight: 700; margin: 0 0 10pt; }
.flow-doc-editor .ProseMirror h3 { font-size: 13pt; font-weight: 700; margin: 0 0 10pt; }
.flow-doc-editor .ProseMirror ol { padding-left: 24px; margin: 0 0 8pt; }
.flow-doc-editor .ProseMirror li { margin-bottom: 4pt; }
.flow-doc-editor .ProseMirror .flow-page-break {
  margin: 16px 0; padding: 4px 0; text-align: center; font-size: 10px;
  color: ${SILVER}; border-top: 2px dashed #CBD5E1; border-bottom: 2px dashed #CBD5E1;
  user-select: none;
}
.flow-doc-editor .ProseMirror .flow-variable-ref {
  background: #EEF2FF; color: #4338CA; border-radius: 3px; padding: 1px 3px; font-style: italic;
}
.flow-doc-editor .ProseMirror .flow-field-anchor {
  background: #ECFDF5; color: #047857; border-radius: 3px; padding: 1px 3px;
  text-decoration: underline; text-decoration-style: dotted;
}
`;

// ── Editor surface ───────────────────────────────────────────────────────────
function AuthorEditorInner({ template }: { template: DocumentTemplate }) {
  usePageMeta();
  const platform = usePlatform();
  const { run } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const isReal = realTemplatesAvailable(workspaceId);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [pageCount, setPageCount] = useState(template.contentPageCount);

  const editor = useEditor({
    extensions: flowDocumentExtensions(),
    content: flowDocumentToJSON(template.content),
    onUpdate: () => setChanged(true),
  });

  const isEmpty = template.content.content.length === 0 && !changed;

  const applyStarter = (build: (typeof STARTER_TEMPLATES)[number]["build"]) => {
    if (!editor) return;
    editor.commands.setContent(flowDocumentToJSON(build(template.placeholders)));
    setChanged(true);
  };

  const handleSave = async () => {
    if (!editor || !isReal || !workspaceId) {
      setSaveError("Open a workspace to author and save a document.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const content = jsonToFlowDocument(editor.getJSON());
      const { template: updated, resolvedAnchors } = await run(
        { message: "Generating your document", detail: "Rendering the content into a PDF." },
        () => generateTemplateDocument(workspaceId, template.id, { content }),
      );
      if (resolvedAnchors.length > 0) {
        await saveResolvedFieldAnchors(workspaceId, template.id, resolvedAnchors);
      }
      setPageCount(updated.contentPageCount);
      setChanged(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error && err.message !== ""
        ? err.message
        : "The document could not be generated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#ffffff", ...GF }}>
      <style>{EDITOR_CSS}</style>

      {/* Top bar */}
      <div style={{ height: 52, background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <Link to={`/app/templates/${template.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: SILVER, ...GF, fontSize: 12, textDecoration: "none" }}>
          <ChevronLeft size={13} />
          {template.name}
        </Link>
        <span style={{ color: "#CBD5E1" }}>/</span>
        <span style={{ color: NAVY, ...GF, fontSize: 12 }}>Author Document</span>
        {changed && (
          <span style={{ ...GF, fontSize: 11, color: SILVER, background: "#F1F5F9", padding: "2px 7px", borderRadius: 99 }}>Unsaved changes</span>
        )}
        <div style={{ flex: 1 }} />
        {saveError !== null && (
          <span style={{ ...GF, fontSize: 11.5, color: "#B91C1C", maxWidth: 340 }}>{saveError}</span>
        )}
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34D399", ...GF, fontSize: 12 }}>
            <CheckCircle2 size={12} />
            Saved
          </div>
        )}
        {isReal && (
          <button
            onClick={() => { void handleSave(); }}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: saving ? "#93C5FD" : AZURE, color: "white", border: "none", borderRadius: 7, ...GF, fontSize: 12, fontWeight: 700, cursor: saving ? "default" : "pointer" }}
          >
            <Save size={13} />
            {saving ? "Generating…" : "Generate & Save"}
          </button>
        )}
      </div>

      {!isReal && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "#FDF8EC", borderBottom: "1px solid #EBD79A", flexShrink: 0 }}>
          <Info size={13} color="#B45309" />
          <span style={{ ...GF, fontSize: 12, color: "#78350F" }}>Open a workspace to author and save a document.</span>
        </div>
      )}

      {/* Page count */}
      <div style={{ background: "#f8fafb", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "6px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <FileText size={13} color={SILVER} />
        <span style={{ ...GF, fontSize: 11, color: SILVER }}>
          {pageCount > 0
            ? `${String(pageCount)} page${pageCount !== 1 ? "s" : ""} in the last generated document`
            : "Not generated yet — pages are computed when you save"}
        </span>
      </div>

      {/* Ribbon */}
      {editor && (
        <RibbonToolbar editor={editor} variables={template.variables} placeholders={template.placeholders} />
      )}

      {isEmpty && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 16px", background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", flexShrink: 0 }}>
          <span style={{ ...GF, fontSize: 12, color: "#1E40AF" }}>Start from a ready-made template:</span>
          {STARTER_TEMPLATES.map(s => (
            <button
              key={s.id}
              type="button"
              title={s.description}
              onClick={() => applyStarter(s.build)}
              style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "white", border: "1px solid #BFDBFE", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Page surface */}
      <div style={{ flex: 1, overflowY: "auto", background: BGCANVAS, display: "flex", justifyContent: "center", padding: "24px 24px 80px" }}>
        <div style={{ width: PAGE_W, background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", flexShrink: 0 }} className="flow-doc-editor">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// ── Root loader ───────────────────────────────────────────────────────────────
function TemplateAuthorInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate } = useTemplates();

  useEffect(() => {
    if (templateId) loadTemplate(templateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const t = state.activeTemplate;

  if (state.activeLoading || (!t && !state.activeError)) {
    return <div style={{ padding: 24, background: "#ffffff", minHeight: "100vh" }}><style>{SKELETON_STYLE}</style><SkeletonBlock height={20} width={200} /></div>;
  }

  if (state.activeError || !t) {
    return (
      <div style={{ padding: 24 }}>
        <AlertCircle size={18} />
        <p style={{ ...GF, fontSize: 14 }}>{state.activeError ?? "Template not found"}</p>
        <Link to="/app/templates" style={{ color: AZURE }}>← Templates</Link>
      </div>
    );
  }

  return <AuthorEditorInner template={t} key={t.id} />;
}

export function TemplateAuthorPage() {
  return (
    <TemplateProvider>
      <TemplateAuthorInner />
    </TemplateProvider>
  );
}
