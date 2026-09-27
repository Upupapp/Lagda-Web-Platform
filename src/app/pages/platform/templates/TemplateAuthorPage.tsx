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
// the page-count strip, for writing rather than fiddling.
//
// ── LAGDA Chatbot ──────────────────────────────────────────────────────────
//
// The old "Start from a purpose" bar is gone; its ready-made documents and
// the detailed starter drafts now live inside the LAGDA Chatbot (see
// `author/chatbot/`), a rule-based writing assistant that asks a few
// questions and then types the draft into this editor. Its conversation is
// kept while the page is open and deleted when it writes, on save, and on
// leaving — the page warns before the last two.
//
// ── Autosave (real mode) ───────────────────────────────────────────────────
//
// The draft saves itself (`author/autosave.ts` has the rules): debounced
// while typing, at least every 30s during a long burst, when the page is
// hidden, and right after the chatbot finishes typing a draft. The header
// pill says where it stands. Generate & Save is still the FINISH action — it
// renders the PDF and places the field anchors; autosave only keeps the words
// safe. The leave prompts fire only when something would actually be lost: a
// save still pending or failed, or (as before) a chatbot conversation.
//
// A refresh restores the draft from the server. Nothing is kept in
// localStorage/sessionStorage — document text is private.

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate, useBlocker, useLocation } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import {
  ChevronLeft, AlertCircle, Info, Save, CheckCircle2, FileText,
  SlidersHorizontal, X, Maximize2, Minimize2, FastForward, CloudOff, Loader2, RefreshCw,
} from "lucide-react";
import { TemplateProvider, useTemplates, useActiveTemplateLoader } from "../../../context/TemplateContext";
import { buildSignInUrl } from "../../../utils/authReturnPath";
import { useTemplateAutosave } from "./author/useTemplateAutosave";
import { formatSavedTime, type AutosaveState } from "./author/autosave";
import { usePlatform } from "../../../context/PlatformContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { ConfirmDialog, useConfirm, type ConfirmRequest } from "../../../components/platform/ConfirmDialog";
import { useProcessing } from "../../../services/processing.service";
import {
  generateTemplateDocument, saveResolvedFieldAnchors, realTemplatesAvailable, updateTemplate,
} from "../../../services/templates-source";
import type { DocumentTemplate, TemplateRolePlaceholder } from "../../../models/templates";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";
import { Z } from "../../../utils/z-index";
import { flowDocumentExtensions } from "./author/extensions";
import { flowDocumentToJSON, jsonToFlowDocument } from "./author/converter";
import { RibbonToolbar } from "./author/RibbonToolbar";
import { ChatToggle } from "./author/chatbot/ChatToggle";
import { OrbitLoader } from "./author/chatbot/chatbot-ui";
import { CHATBOT_CSS, BOT_IMAGE, OPENING_BOT_IMAGE, useReducedMotion } from "./author/chatbot/chatbot-theme";
import { useChatSession } from "./author/chatbot/chat-store";
import type { EngineContext, WritePlan } from "./author/chatbot/engine";
import { hasUserTurns } from "./author/chatbot/session";
import { useDraftTypewriter } from "./author/chatbot/useDraftTypewriter";

// The chatbot's engine and knowledge base load when the chat is first opened,
// not with the editor.
const ChatPanel = lazy(() => import("./author/chatbot/ChatPanel").then(m => ({ default: m.ChatPanel })));

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
/** The chatbot's side panel on a desktop, and on a tablet. */
const PANEL_W = 380;
const PANEL_W_MEDIUM = 340;
const DONE_TOAST_MS = 6500;

export const LEAVE_WARNING = "Leaving this page will delete your conversation with LAGDA Chatbot.";
export const SAVE_WARNING = "Saving will finish this template and delete your conversation with LAGDA Chatbot.";
export const DRAFT_DONE = "Draft written. Review and edit anything you like.";
export const UNSAVED_LEAVE_WARNING = "Your latest changes haven't been saved yet. If you leave now, they may be lost.";
export const CONFLICT_MESSAGE = "This template changed in another tab";

interface PillTone { fg: string; bg: string; border: string }
const TONE_NEUTRAL: PillTone = { fg: "#334155", bg: "#F1F5F9", border: "#E2E8F0" };
const TONE_OK: PillTone = { fg: "#065F46", bg: "#D1FAE5", border: "#A7F3D0" };
const TONE_WARN: PillTone = { fg: "#92400E", bg: "#FEF3C7", border: "#FDE68A" };
const TONE_BAD: PillTone = { fg: "#991B1B", bg: "#FEE2E2", border: "#FECACA" };

type StatusPill = PillTone & { text: string; kind: "saving" | "saved" | "warn" | "bad" };

/** The header pill for the autosave, or null when there is nothing to say. */
function autosavePill(state: AutosaveState): StatusPill | null {
  switch (state.status) {
    case "pending":
    case "saving":
      return { text: "Saving…", kind: "saving", ...TONE_NEUTRAL };
    case "error":
      return { text: "Couldn't save — retrying", kind: "warn", ...TONE_WARN };
    case "offline":
      return { text: "Offline — will save when you reconnect", kind: "warn", ...TONE_WARN };
    case "conflict":
      return { text: "Not saved — changed in another tab", kind: "bad", ...TONE_BAD };
    case "idle":
    case "saved": {
      const at = formatSavedTime(state.savedAt);
      return at === null ? null : { text: `All changes saved · ${at}`, kind: "saved", ...TONE_OK };
    }
  }
}

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
  overflow-wrap: anywhere;
}
.flow-doc-editor .ProseMirror p { margin: 0 0 8pt; }
.flow-doc-editor .ProseMirror h1 { font-size: 20pt; font-weight: 700; margin: 0 0 10pt; }
.flow-doc-editor .ProseMirror h2 { font-size: 16pt; font-weight: 700; margin: 0 0 10pt; }
.flow-doc-editor .ProseMirror h3 { font-size: 13pt; font-weight: 700; margin: 0 0 10pt; }
.flow-doc-editor .ProseMirror ol { padding-left: 24px; margin: 0 0 8pt; list-style: decimal outside; }
.flow-doc-editor .ProseMirror ol ol { list-style-type: lower-alpha; }
.flow-doc-editor .ProseMirror ol ol ol { list-style-type: lower-roman; }
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
.flow-doc-editor .ProseMirror[contenteditable="false"] { cursor: default; }
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

/** The side panel's place, held while its code arrives. */
function PanelFallback({ width, reduced }: { width: number; reduced: boolean }) {
  return (
    <div aria-hidden style={{ width, flexShrink: 0, height: "100%", borderLeft: HAIRLINE, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <OrbitLoader caption="Getting your assistant ready" reduced={reduced} image={OPENING_BOT_IMAGE} />
    </div>
  );
}

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
function AuthorEditorInner({ template, onReload }: { template: DocumentTemplate; onReload: () => void }) {
  usePageMeta();
  const platform = usePlatform();
  const { run } = useProcessing();
  const { isNarrow, isMedium } = useViewport();
  const reduced = useReducedMotion();
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
  // The template's role slots — the chatbot can add to them, so they are
  // held here rather than read from the (stale) loaded template.
  const [placeholders, setPlaceholders] = useState<TemplateRolePlaceholder[]>(template.placeholders);
  const [contentGenerated, setContentGenerated] = useState<boolean | undefined>(template.contentGenerated);

  // Autosave hears about edits through refs: the editor is created before
  // the autosave (which needs it), and the typewriter's frames are not edits
  // — the finished draft is saved once, when it is done.
  const autosaveChange = useRef<() => void>(() => undefined);
  const typingRef = useRef(false);

  const editor = useEditor({
    extensions: flowDocumentExtensions(),
    content: flowDocumentToJSON(template.content),
    onUpdate: () => {
      setChanged(true);
      if (!typingRef.current) autosaveChange.current();
    },
  });

  const autosave = useTemplateAutosave({
    enabled: isReal,
    editor,
    workspaceId,
    templateId: template.id,
    initialRevision: template.contentRevision,
    initialSavedAt: template.contentSavedAt,
    onSaved: r => setContentGenerated(r.contentGenerated),
  });
  useEffect(() => { autosaveChange.current = autosave.change; }, [autosave.change]);
  const conflict = autosave.state.status === "conflict";

  const [docEmpty, setDocEmpty] = useState(template.content.content.length === 0);
  useEffect(() => {
    if (!editor) return;
    const sync = () => setDocEmpty(editor.isEmpty);
    sync();
    editor.on("update", sync);
    return () => { editor.off("update", sync); };
  }, [editor]);

  // ── LAGDA Chatbot ─────────────────────────────────────────────────────────
  const chat = useChatSession(template.id);
  const hasChat = hasUserTurns(chat.session.messages);
  const [chatOpen, setChatOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [doneNote, setDoneNote] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const typewriter = useDraftTypewriter({ editor, scrollRef, badgeHostRef: pageRef, badgeRef, reduced });
  const typing = typewriter.busy;
  useEffect(() => { typingRef.current = typing; }, [typing]);
  const panelSide = !isNarrow;
  const panelWidth = isMedium ? PANEL_W_MEDIUM : PANEL_W;

  // Leaving the page (Back, or any in-app route) always ends the chat.
  const clearChat = chat.clear;
  useEffect(() => () => clearChat(), [clearChat]);

  // Focus returns to the button that opened the chat.
  useEffect(() => {
    if (wasOpen.current && !chatOpen) toggleRef.current?.focus();
    wasOpen.current = chatOpen;
  }, [chatOpen]);

  // The ribbon is out of reach while the draft is typed.
  useEffect(() => {
    const el = ribbonRef.current;
    if (el) el.inert = typing;
  });

  useEffect(() => {
    if (doneNote === null) return;
    const t = setTimeout(() => setDoneNote(null), DONE_TOAST_MS);
    return () => clearTimeout(t);
  }, [doneNote]);

  // A browser refresh or tab close loses an in-memory chat, or a draft save
  // that has not landed yet: ask first. Nothing to lose, no prompt.
  const unsaved = autosave.unsaved;
  useEffect(() => {
    if (!hasChat && !unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasChat, unsaved]);

  // Back, or any other in-app navigation, with a conversation in progress or
  // changes not yet saved.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    (hasChat || unsaved) && currentLocation.pathname !== nextLocation.pathname);
  const leaving = useRef(false);
  const blockedForChat = useRef(false);
  if (blocker.state !== "blocked") blockedForChat.current = hasChat;

  // Blocked ONLY by a save still on its way: send it now, and when it lands
  // the navigation simply continues — the prompt is for work that would be
  // lost, and a save that succeeds loses nothing.
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const autosaveFlush = autosave.flush;
  const autosaveMark = autosave.change;
  useEffect(() => {
    if (blocker.state !== "blocked" || blockedForChat.current) return;
    let cancelled = false;
    void autosaveFlush().then(ok => {
      if (cancelled || !ok || blockerRef.current.state !== "blocked") return;
      blockerRef.current.proceed?.();
    });
    return () => { cancelled = true; };
  }, [blocker.state, autosaveFlush]);

  const leaveRequest: ConfirmRequest | null = blocker.state !== "blocked"
    ? null
    : blockedForChat.current
      ? {
          title: "Leave this page?",
          body: unsaved ? `${LEAVE_WARNING} ${UNSAVED_LEAVE_WARNING}` : LEAVE_WARNING,
          confirmLabel: "Leave and delete",
          cancelLabel: "Stay",
          destructive: true,
          onConfirm: () => {
            leaving.current = true;
            chat.clear();
            blocker.proceed?.();
          },
        }
      : {
          title: "Leave without saving?",
          body: UNSAVED_LEAVE_WARNING,
          confirmLabel: "Leave anyway",
          cancelLabel: "Stay",
          destructive: true,
          onConfirm: () => {
            leaving.current = true;
            blocker.proceed?.();
          },
        };
  const closeLeave = () => {
    if (!leaving.current && blocker.state === "blocked") blocker.reset?.();
    leaving.current = false;
  };

  const { confirm, confirmDialog } = useConfirm();

  const engineCtx: EngineContext = useMemo(() => ({
    userName: platform.user?.displayName ?? "",
    documentHasContent: !docEmpty,
    canSaveRoles: isReal,
  }), [platform.user?.displayName, docEmpty, isReal]);

  const openChat = () => { setChatOpen(true); setEverOpened(true); setDoneNote(null); };

  // "Yes, write it": the chat is cleared and closed, the page loader plays
  // while the roles are saved, then the draft is typed in.
  const writeDraft = useCallback((plan: WritePlan) => {
    if (!editor) return;
    chat.clear();
    setChatOpen(false);
    let rolesNote: string | null = null;
    const prepare = async () => {
      const [{ buildDraft }, { participantsToPlaceholders }] = await Promise.all([
        import("./author/chatbot/draft"), import("./author/chatbot/participants"),
      ]);
      let slots = placeholders;
      if (plan.participants.length > 0 && plan.docId !== null) {
        if (isReal && workspaceId) {
          try {
            const merged = participantsToPlaceholders(plan.participants, placeholders);
            const updated = await updateTemplate(workspaceId, template.id, {
              name: template.name,
              routingMode: template.routing.mode,
              placeholders: merged,
              notifySenderOnComplete: template.settings.completionCopySender,
              variables: template.variables,
            });
            slots = updated.placeholders;
            setPlaceholders(updated.placeholders);
            rolesNote = `Template roles set up: ${plan.participants.map(p => p.label).join(", ")}.`;
          } catch (err) {
            rolesNote = `The roles could not be saved${err instanceof Error && err.message !== "" ? ` (${err.message})` : ""}. The names are in the document text.`;
          }
        } else {
          rolesNote = "Open a workspace to save the roles. The names are in the document text.";
        }
      }
      return buildDraft(plan, slots);
    };
    // The typed frames are not edits to autosave; the finished draft is.
    typingRef.current = true;
    typewriter.start(prepare, plan.placement, () => {
      typingRef.current = false;
      setChanged(true);
      setDoneNote(rolesNote === null ? DRAFT_DONE : `${DRAFT_DONE} ${rolesNote}`);
      // Saved the moment it is written — a whole draft is too much to leave
      // to the debounce.
      autosaveMark();
      void autosaveFlush();
    });
  }, [editor, chat, placeholders, isReal, workspaceId, template, typewriter, autosaveMark, autosaveFlush]);

  const handleSave = async () => {
    if (typing) return;
    if (!editor || !isReal || !workspaceId) {
      setSaveError("Open a workspace to author and save a document.");
      return;
    }
    if (conflict) {
      setSaveError(`${CONFLICT_MESSAGE}. Reload to get the latest version before saving.`);
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      // The draft first, so the words are safe even if rendering fails. A
      // failed autosave does not stop the finish — the generate carries the
      // same content — but a conflict found here does.
      await autosave.flush();
      if (autosave.getStatus() === "conflict") {
        setSaveError(`${CONFLICT_MESSAGE}. Reload to get the latest version before saving.`);
        return;
      }
      const content = jsonToFlowDocument(editor.getJSON());
      const { template: updated, resolvedAnchors } = await run(
        { message: "Generating your document", detail: "Rendering the content into a PDF." },
        () => generateTemplateDocument(workspaceId, template.id, { content }),
      );
      if (resolvedAnchors.length > 0) {
        await saveResolvedFieldAnchors(workspaceId, template.id, resolvedAnchors);
      }
      autosave.adoptRevision(updated.contentRevision, updated.contentSavedAt);
      setContentGenerated(true);
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

  // Saving finishes the template, and with it the conversation.
  const requestSave = () => {
    if (typing) return;
    if (!hasChat) { chat.clear(); void handleSave(); return; }
    confirm({
      title: "Save and finish?",
      body: SAVE_WARNING,
      confirmLabel: "Save",
      cancelLabel: "Keep chatting",
      onConfirm: () => { chat.clear(); setChatOpen(false); void handleSave(); },
    });
  };

  // Real mode: where the autosave stands. Fixture mode keeps the draft in
  // memory, so its pill is still just "you have changed something".
  const statusPill: StatusPill | null = isReal
    ? autosavePill(autosave.state)
    : changed
      ? { text: "Unsaved changes", kind: "warn", ...TONE_WARN }
      : saved
        ? { text: "Saved", kind: "saved", ...TONE_OK }
        : null;
  const pillIcon = (size: number) => statusPill === null ? null
    : statusPill.kind === "saving" ? <Loader2 size={size} aria-hidden className={reduced ? undefined : "lagda-cb-spin"} />
      : statusPill.kind === "saved" ? <CheckCircle2 size={size} aria-hidden />
        : statusPill.text.startsWith("Offline") ? <CloudOff size={size} aria-hidden />
          : <AlertCircle size={size} aria-hidden />;

  const ribbonVisible = editor !== null && (!isNarrow || ribbonOpen);
  const sidePanelOpen = chatOpen && panelSide;
  const toggleVisible = !chatOpen && !typing;
  const fabBottom = isNarrow ? 16 : 24;
  const toggleBottom = isReal
    ? `calc(${String(fabBottom + 48 + 14)}px + env(safe-area-inset-bottom, 0px))`
    : `calc(${String(fabBottom)}px + env(safe-area-inset-bottom, 0px))`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#ffffff", ...GF, overflow: "hidden" }}>
      <style>{EDITOR_CSS}</style>
      <style>{CHATBOT_CSS}</style>

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
          <span role="status" data-testid="save-status" style={{
            ...GF, fontSize: 11, fontWeight: 600, color: statusPill.fg,
            background: statusPill.bg, border: `1px solid ${statusPill.border}`,
            padding: "3px 9px", borderRadius: 99, flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
          }}>
            {isReal && pillIcon(11)}
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
        <div role="status" data-testid="save-status" style={{
          flexShrink: 0, padding: "6px 12px", background: statusPill.bg,
          borderBottom: `1px solid ${statusPill.border}`,
          display: "flex", alignItems: "center", gap: 6, color: statusPill.fg,
        }}>
          {isReal ? pillIcon(12) : saved && !changed && <CheckCircle2 size={12} color={statusPill.fg} />}
          <span style={{ ...GF, fontSize: 11.5, fontWeight: 600, color: statusPill.fg }}>
            {statusPill.text}
          </span>
        </div>
      )}

      {/* Another tab saved a newer revision: nothing more is sent from here
          until the page is reloaded onto it. */}
      {conflict && (
        <div role="alert" data-testid="save-conflict" style={{
          flexShrink: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
          padding: "10px 14px", background: "#FEF2F2", borderBottom: "1px solid #FECACA",
        }}>
          <AlertCircle size={14} color="#B91C1C" style={{ flexShrink: 0 }} aria-hidden />
          <span style={{ ...GF, fontSize: 12, color: "#991B1B", lineHeight: 1.5, flex: 1, minWidth: 180 }}>
            <strong>{CONFLICT_MESSAGE}.</strong> Reload to get the latest version. Changes made here since then can't be saved.
          </span>
          <button
            type="button"
            onClick={onReload}
            style={{
              ...GF, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
              border: "1px solid #FCA5A5", background: "#FFFFFF", color: "#991B1B", borderRadius: 8,
              fontSize: 12, fontWeight: 700, padding: "6px 12px", minHeight: 32, cursor: "pointer",
            }}
          >
            <RefreshCw size={13} aria-hidden /> Reload
          </button>
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
              ? `${String(pageCount)} page${pageCount !== 1 ? "s" : ""} in the last generated document${
                  isReal && contentGenerated === false ? " · Generate & Save to update it" : ""}`
              : isNarrow ? "Pages are computed when you save" : "Not generated yet — pages are computed when you save"}
          </span>
        </div>
      )}

      {/* Ribbon. Capped and scrollable on a phone: wrapped to three rows it
          would otherwise take half the viewport. */}
      {ribbonVisible && editor && (
        <div
          ref={ribbonRef}
          aria-disabled={typing || undefined}
          style={{
            flexShrink: 0, maxHeight: isNarrow ? "38vh" : undefined, overflowY: isNarrow ? "auto" : undefined,
            opacity: typing ? 0.55 : 1, pointerEvents: typing ? "none" : undefined, transition: "opacity 200ms",
          }}
        >
          <RibbonToolbar
            editor={editor}
            variables={template.variables}
            placeholders={placeholders}
            compact={isNarrow}
          />
        </div>
      )}

      {/* ── The document, and the chatbot's side panel beside it ────────── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex" }}>
          <div
            ref={scrollRef}
            data-testid="author-canvas"
            style={{
              flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", background: BGCANVAS,
              // Bottom room for the floating actions, plus the phone's home bar;
              // right room on a tablet so the chat button never sits on the page.
              padding: isNarrow
                ? "12px 10px calc(170px + env(safe-area-inset-bottom, 0px))"
                : `24px ${isMedium && toggleVisible ? "96px" : "24px"} 104px 24px`,
            }}
          >
            <div
              ref={pageRef}
              className={`flow-doc-editor${typewriter.fading ? " lagda-cb-draft-fade" : ""}`}
              aria-busy={typing || undefined}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: maximized ? PAGE_W_MAX : PAGE_W,
                margin: "0 auto",
                background: "white",
                borderRadius: isNarrow ? 8 : 0,
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              }}
            >
              <EditorContent editor={editor} />
              {typewriter.phase === "typing" && (
                <span
                  ref={badgeRef}
                  aria-hidden
                  data-testid="typing-badge"
                  className={reduced ? undefined : "lagda-cb-bob"}
                  style={{
                    position: "absolute", left: 0, top: 0, opacity: 0,
                    width: 26, height: 26, borderRadius: "50%", background: "#EAF4FF",
                    boxShadow: `0 2px 8px rgba(0,120,212,0.35), 0 0 0 2px #FFFFFF`, pointerEvents: "none",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    transition: "top 90ms ease-out, opacity 150ms",
                  }}
                >
                  <img src={BOT_IMAGE} alt="" width={22} height={22} style={{ width: 22, height: 22, objectFit: "contain" }} />
                </span>
              )}
            </div>
          </div>

          {/* The loader over the page while the draft is prepared. */}
          {typewriter.phase === "loading" && (
            <div data-testid="draft-loader" style={{
              position: "absolute", inset: 0, zIndex: Z.raised, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(223,227,232,0.82)", backdropFilter: "blur(2px)",
            }}>
              <OrbitLoader caption={reduced ? "Writing your draft" : "LAGDA Chatbot is writing your draft"} reduced={reduced} />
            </div>
          )}

          {/* Typing: say so, and offer the way out. */}
          {typing && (
            <div style={{
              position: "absolute", left: 12, right: 12, zIndex: Z.raised, display: "flex", justifyContent: "center", pointerEvents: "none",
              bottom: isNarrow ? "calc(16px + env(safe-area-inset-bottom, 0px))" : 24,
            }}>
            <div style={{
              pointerEvents: "auto", display: "flex", alignItems: "center", gap: 10, maxWidth: "100%",
              background: NAVY, color: "#FFFFFF", borderRadius: 99, padding: "6px 6px 6px 14px",
              boxShadow: "0 8px 24px rgba(7,17,31,0.3)",
            }}>
              <span role="status" style={{ ...GF, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {typewriter.phase === "loading" ? (isNarrow ? "Preparing…" : "Preparing your draft…") : (isNarrow ? "Writing…" : "Writing your draft…")}
              </span>
              <button
                type="button"
                onClick={typewriter.skip}
                style={{
                  ...GF, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                  border: "none", borderRadius: 99, background: "#FFFFFF", color: NAVY,
                  fontSize: 12.5, fontWeight: 700, padding: "7px 12px", minHeight: 34, cursor: "pointer",
                }}
              >
                <FastForward size={13} aria-hidden /> Skip animation
              </button>
            </div>
            </div>
          )}

          {doneNote !== null && (
            <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: Z.raised, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <div role="status" data-testid="draft-done" className="lagda-cb-bubble-in" style={{
              pointerEvents: "auto", maxWidth: "100%", display: "flex", alignItems: "flex-start", gap: 8,
              background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", borderRadius: 12,
              padding: "9px 10px 9px 12px", boxShadow: "0 8px 22px rgba(7,17,31,0.12)",
            }}>
              <CheckCircle2 size={15} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ ...GF, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, minWidth: 0 }}>{doneNote}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setDoneNote(null)}
                style={{ border: "none", background: "none", color: "#065F46", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
            </div>
          )}
        </div>

        {sidePanelOpen && (
          <Suspense fallback={<PanelFallback width={panelWidth} reduced={reduced} />}>
          <ChatPanel
            templateId={template.id}
            variant="side"
            width={panelWidth}
            user={platform.user}
            ctx={engineCtx}
            reduced={reduced}
            onClose={() => setChatOpen(false)}
            onWrite={writeDraft}
          />
          </Suspense>
        )}
      </div>

      {chatOpen && !panelSide && (
        <Suspense fallback={null}>
        <ChatPanel
          templateId={template.id}
          variant="sheet"
          user={platform.user}
          ctx={engineCtx}
          reduced={reduced}
          onClose={() => setChatOpen(false)}
          onWrite={writeDraft}
        />
        </Suspense>
      )}

      {toggleVisible && (
        <ChatToggle
          ref={toggleRef}
          documentEmpty={docEmpty}
          everOpened={everOpened}
          reduced={reduced}
          right={isNarrow ? 14 : 24}
          bottom={toggleBottom}
          onOpen={openChat}
        />
      )}

      {/* ── Generate & Save: the lower-right corner ─────────────────────── */}
      {isReal && (
        <button
          onClick={requestSave}
          disabled={saving || typing}
          style={{
            position: "fixed",
            right: (isNarrow ? 14 : 24) + (sidePanelOpen ? panelWidth : 0),
            bottom: `calc(${String(fabBottom)}px + env(safe-area-inset-bottom, 0px))`,
            zIndex: Z.sticky,
            display: typing && isNarrow ? "none" : "inline-flex", alignItems: "center", gap: 8,
            padding: isNarrow ? "13px 18px" : "12px 20px",
            minHeight: 48,
            background: saving || typing ? "#93C5FD" : AZURE,
            color: "white", border: "none", borderRadius: 99,
            ...GF, fontSize: 13, fontWeight: 700,
            boxShadow: "0 6px 20px rgba(0,120,212,0.38)",
            cursor: saving || typing ? "default" : "pointer",
          }}
        >
          {saving ? <Save size={15} /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saving ? "Generating…" : saved ? "Saved" : "Generate & Save"}
        </button>
      )}

      {confirmDialog}
      <ConfirmDialog request={leaveRequest} onClose={closeLeave} />
    </div>
  );
}

// ── Root loader ───────────────────────────────────────────────────────────────
function TemplateAuthorInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate } = useTemplates();
  const location = useLocation();

  // NOT a plain [templateId] effect: this route sits outside PlatformLayout,
  // so on a refresh it mounts before the session bootstrap has produced a
  // workspace. Reading then asked the fixtures and showed "Template not
  // found", and nothing ever read again once the workspace arrived.
  const scope = useActiveTemplateLoader(templateId);

  const t = state.activeTemplate;

  if (scope.status === "signed-out") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace />;
  }

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

  return (
    <AuthorEditorInner
      template={t}
      key={t.id}
      onReload={() => { if (templateId) loadTemplate(templateId); }}
    />
  );
}

export function TemplateAuthorPage() {
  return (
    <TemplateProvider>
      <TemplateAuthorInner />
    </TemplateProvider>
  );
}
