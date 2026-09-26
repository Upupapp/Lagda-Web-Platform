// /app/templates/:templateId/author — Author a document from scratch (071).
//
// The alternative to uploading a file, and the ONLY way a template gets a
// document now — Templates never accept an upload (see
// `services/templates-source.ts`'s own header). A real rich-text editor
// (TipTap) over a flowing-document model: paragraphs, headings, numbered
// clauses, and inline "field anchor" placeholders for where a signature,
// date or initials will render — the same alternative-to-Word framing the
// feature was built for. Inline styles only. No Burgundy.
//
// ── The layout, and what a phone forced ────────────────────────────────────
//
// The first cut put the breadcrumb, the unsaved-changes pill, the error text
// and "Generate & Save" in ONE 52px row. On a phone that row has ~340px to
// spend and wants ~520px, so the pieces ran into each other and the error
// message was clipped at 340px even on a desktop.
//
// Three structural fixes, rather than shrinking type until it fit:
//
//   THE ACTION LEFT THE HEADER. "Generate & Save" is a floating action at the
//   bottom-right — the single most important control on the page, in the
//   corner a thumb already rests on, and no longer competing for header width.
//
//   STATUS GOT ITS OWN ROW on a phone. Unsaved/saved/error are announcements,
//   not navigation; giving them their own strip means they can never collide
//   with the title and an error can wrap to as many lines as it needs.
//
//   THE RIBBON BECAME SUMMONABLE on a phone. Fourteen controls wrapped to
//   three rows ate half the viewport before a word was typed, so it collapses
//   behind a toggle at the top-left and the document keeps the screen.
//
// Plus a focus mode: the document maximizes to fill the viewport, dropping
// the page-count strip and the starter bar, for writing rather than fiddling.

import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import {
  ChevronLeft, AlertCircle, Info, Save, CheckCircle2, FileText,
  SlidersHorizontal, X, Maximize2, Minimize2,
} from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { usePlatform } from "../../../context/PlatformContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { useProcessing } from "../../../services/processing.service";
import {
  generateTemplateDocument, saveResolvedFieldAnchors, realTemplatesAvailable,
} from "../../../services/templates-source";
import type { DocumentTemplate } from "../../../models/templates";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";
import { Z } from "../../../utils/z-index";
import { flowDocumentExtensions } from "./author/extensions";
import { flowDocumentToJSON, jsonToFlowDocument } from "./author/converter";
import { RibbonToolbar } from "./author/RibbonToolbar";
import { STARTER_TEMPLATES, type StarterTemplate } from "./author/starterTemplates";
import { PurposePicker } from "./author/PurposePicker";
import {
  readyMadeTypingFrame, readyMadeTypingLength, type ReadyMadeTemplate,
} from "../../../services/ready-made-templates";

/** Roughly how long the typed reveal takes, however long the text. */
const TYPING_FRAMES = 45;
const TYPING_FRAME_MS = 22;

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF     = { fontFamily: "'Geist', sans-serif" };
const AZURE  = "#0078D4";
const NAVY   = "#07111F";
const SILVER = "#64748B";
const BGCANVAS = "#DFE3E8";
const HAIRLINE = "1px solid rgba(0,0,0,0.08)";
const PAGE_W = 720;
/** Focus mode earns a wider measure — the chrome around it is gone. */
const PAGE_W_MAX = 860;

// The editor's own internals are a real stylesheet, so they use real media
// queries: 72px of page margin is right on A4 and absurd on a 360px phone,
// and that is a property of the rendered page, not of the React tree.
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
@media (max-width: 767px) {
  .flow-doc-editor .ProseMirror {
    min-height: 68vh;
    padding: 30px 22px;
    /* 16px is the smallest size iOS will not zoom the viewport for on focus.
       11pt reads as ~14.6px, and the zoom-on-tap it triggered threw the whole
       layout sideways on every tap into the document. */
    font-size: 16px;
  }
  .flow-doc-editor .ProseMirror h1 { font-size: 24px; }
  .flow-doc-editor .ProseMirror h2 { font-size: 20px; }
  .flow-doc-editor .ProseMirror h3 { font-size: 17px; }
  .flow-doc-editor .ProseMirror ol { padding-left: 20px; }
}
`;

/** A header control: 40px on a phone (thumb), 32px on a pointer. */
function IconControl({
  label, onClick, active, large, children,
}: {
  label: string; onClick: () => void; active?: boolean; large: boolean; children: React.ReactNode;
}) {
  const size = large ? 40 : 32;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active ?? false}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, flexShrink: 0,
        borderRadius: 9,
        border: active ? `1px solid ${AZURE}55` : "1px solid #E2E8F0",
        background: active ? `${AZURE}14` : "#FFFFFF",
        color: active ? AZURE : SILVER,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Editor surface ───────────────────────────────────────────────────────────
function AuthorEditorInner({ template }: { template: DocumentTemplate }) {
  usePageMeta();
  const platform = usePlatform();
  const { run } = useProcessing();
  const { isNarrow } = useViewport();
  const workspaceId = platform.currentWorkspace?.id;
  const isReal = realTemplatesAvailable(workspaceId);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [pageCount, setPageCount] = useState(template.contentPageCount);
  // Phone only. On a pointer the ribbon is always up — there is room for it,
  // and hiding a toolbar nobody asked to hide is its own annoyance.
  const [ribbonOpen, setRibbonOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const editor = useEditor({
    extensions: flowDocumentExtensions(),
    content: flowDocumentToJSON(template.content),
    onUpdate: () => setChanged(true),
  });

  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (typingTimer.current) clearInterval(typingTimer.current); }, []);
  const isEmpty = template.content.content.length === 0 && !changed;
  const ribbonVisible = editor !== null && (!isNarrow || ribbonOpen);
  const showStarters = (isEmpty || typing) && !maximized;

  const applyStarter = (starter: StarterTemplate) => {
    if (!editor) return;
    editor.commands.setContent(flowDocumentToJSON(starter.build(template.placeholders)));
    setChanged(true);
  };

  // Written in as if typed, then settles on the full document — signature
  // lines bound to this template's own signer roles where it has them.
  const writeFromPurpose = (source: ReadyMadeTemplate) => {
    if (!editor || typing) return;
    const total = readyMadeTypingLength(source);
    const show = (chars: number) =>
      editor.commands.setContent(flowDocumentToJSON(readyMadeTypingFrame(source, template.placeholders, chars)));
    setChanged(true);
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { show(total); return; }

    const step = Math.max(1, Math.ceil(total / TYPING_FRAMES));
    let written = 0;
    setTyping(true);
    typingTimer.current = setInterval(() => {
      written = Math.min(total, written + step);
      show(written);
      if (written >= total) {
        if (typingTimer.current) clearInterval(typingTimer.current);
        typingTimer.current = null;
        setTyping(false);
      }
    }, TYPING_FRAME_MS);
  };

  const handleSave = async () => {
    if (typing) return;
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

  const statusPill = changed
    ? { text: "Unsaved changes", fg: "#92400E", bg: "#FEF3C7", border: "#FDE68A" }
    : saved
      ? { text: "Saved", fg: "#065F46", bg: "#D1FAE5", border: "#A7F3D0" }
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#ffffff", ...GF, overflow: "hidden" }}>
      <style>{EDITOR_CSS}</style>

      {/* ── Header: navigation and view controls only ───────────────────── */}
      <header style={{
        background: "#ffffff", borderBottom: HAIRLINE, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 10,
        padding: isNarrow ? "8px 12px" : "0 16px",
        minHeight: isNarrow ? 56 : 52,
      }}>
        {/* Upper-LEFT: the ribbon toggle, phone only. */}
        {isNarrow && (
          <IconControl
            label={ribbonOpen ? "Hide formatting toolbar" : "Show formatting toolbar"}
            active={ribbonOpen}
            large
            onClick={() => setRibbonOpen(o => !o)}
          >
            {ribbonOpen ? <X size={17} /> : <SlidersHorizontal size={17} />}
          </IconControl>
        )}

        {/* Title block. `minWidth: 0` is what actually lets the name truncate
            instead of shoving the controls off the right edge. */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <Link
            to={`/app/templates/${template.id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0,
              color: NAVY, ...GF, fontSize: isNarrow ? 13 : 13.5, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} color={SILVER} style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {template.name}
            </span>
          </Link>
          <span style={{ ...GF, fontSize: 10.5, color: SILVER, letterSpacing: "0.02em", paddingLeft: 18 }}>
            Author Document
          </span>
        </div>

        {/* Status, inline on a pointer where there is room for it. */}
        {!isNarrow && statusPill && (
          <span style={{
            ...GF, fontSize: 11, fontWeight: 600, color: statusPill.fg,
            background: statusPill.bg, border: `1px solid ${statusPill.border}`,
            padding: "3px 9px", borderRadius: 99, flexShrink: 0,
          }}>
            {statusPill.text}
          </span>
        )}

        <IconControl
          label={maximized ? "Exit focus mode" : "Maximize the document"}
          active={maximized}
          large={isNarrow}
          onClick={() => setMaximized(m => !m)}
        >
          {maximized ? <Minimize2 size={isNarrow ? 17 : 15} /> : <Maximize2 size={isNarrow ? 17 : 15} />}
        </IconControl>
      </header>

      {/* Status strip — phone only, and only when there is something to say,
          so an empty bar never steals a row from the document. */}
      {isNarrow && statusPill && (
        <div style={{
          flexShrink: 0, padding: "6px 12px", background: statusPill.bg,
          borderBottom: `1px solid ${statusPill.border}`,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {saved && !changed && <CheckCircle2 size={12} color={statusPill.fg} />}
          <span style={{ ...GF, fontSize: 11.5, fontWeight: 600, color: statusPill.fg }}>
            {statusPill.text}
          </span>
        </div>
      )}

      {/* An error is a full-width banner that WRAPS. The old inline version
          was capped at 340px and truncated mid-sentence. */}
      {saveError !== null && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 8,
          padding: "10px 14px", background: "#FEF2F2", borderBottom: "1px solid #FECACA",
        }}>
          <AlertCircle size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ ...GF, fontSize: 12, color: "#B91C1C", lineHeight: 1.5, flex: 1, minWidth: 0 }}>
            {saveError}
          </span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            aria-label="Dismiss the error"
            style={{ border: "none", background: "none", color: "#B91C1C", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!isReal && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#FDF8EC", borderBottom: "1px solid #EBD79A", flexShrink: 0 }}>
          <Info size={13} color="#B45309" style={{ flexShrink: 0 }} />
          <span style={{ ...GF, fontSize: 12, color: "#78350F" }}>Open a workspace to author and save a document.</span>
        </div>
      )}

      {/* Page count — the first thing focus mode drops. */}
      {!maximized && (
        <div style={{ background: "#f8fafb", borderBottom: HAIRLINE, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <FileText size={13} color={SILVER} style={{ flexShrink: 0 }} />
          <span style={{ ...GF, fontSize: 11, color: SILVER }}>
            {pageCount > 0
              ? `${String(pageCount)} page${pageCount !== 1 ? "s" : ""} in the last generated document`
              : isNarrow ? "Pages are computed when you save" : "Not generated yet — pages are computed when you save"}
          </span>
        </div>
      )}

      {/* Ribbon. Capped and scrollable on a phone: wrapped to three rows it
          would otherwise take half the viewport. */}
      {ribbonVisible && editor && (
        <div style={{ flexShrink: 0, maxHeight: isNarrow ? "38vh" : undefined, overflowY: isNarrow ? "auto" : undefined }}>
          <RibbonToolbar
            editor={editor}
            variables={template.variables}
            placeholders={template.placeholders}
            compact={isNarrow}
          />
        </div>
      )}

      {showStarters && (
        <PurposePicker
          compact={isNarrow}
          busy={typing}
          onWrite={writeFromPurpose}
          starters={STARTER_TEMPLATES}
          onStarter={applyStarter}
        />
      )}

      {/* ── The document ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto", background: BGCANVAS,
        // Bottom room for the floating action, plus the phone's home bar.
        padding: isNarrow
          ? "12px 10px calc(104px + env(safe-area-inset-bottom, 0px))"
          : "24px 24px 104px",
      }}>
        <div
          className="flow-doc-editor"
          style={{
            width: "100%",
            maxWidth: maximized ? PAGE_W_MAX : PAGE_W,
            margin: "0 auto",
            background: "white",
            borderRadius: isNarrow ? 8 : 0,
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* ── Generate & Save: the lower-right corner ─────────────────────── */}
      {isReal && (
        <button
          onClick={() => { void handleSave(); }}
          disabled={saving}
          style={{
            position: "fixed",
            right: isNarrow ? 14 : 24,
            bottom: `calc(${isNarrow ? "16px" : "24px"} + env(safe-area-inset-bottom, 0px))`,
            zIndex: Z.sticky,
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: isNarrow ? "13px 18px" : "12px 20px",
            minHeight: 48,
            background: saving ? "#93C5FD" : AZURE,
            color: "white", border: "none", borderRadius: 99,
            ...GF, fontSize: 13, fontWeight: 700,
            boxShadow: "0 6px 20px rgba(0,120,212,0.38)",
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? <Save size={15} /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saving ? "Generating…" : saved ? "Saved" : "Generate & Save"}
        </button>
      )}
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
