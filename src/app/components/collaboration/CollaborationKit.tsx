// Document Collaboration — shared styles and presentational primitives (Command 34).
//
// Calm, document-review styling. Deliberately NOT a chat product: no bubbles, no
// presence dots, no typing indicators, no "online now", no live cursors, no unread
// pulsing, no notification sounds, no animated send button.
//
// Status is always text. Nothing is communicated by colour or icon alone.
//
// Comment bodies are rendered as plain text through React's normal escaping.
// `dangerouslySetInnerHTML` is never used in this feature.
//
// Burgundy (#67023B) is eNotary-only and never appears here.

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Info, Lock, X } from "lucide-react";
import type {
  CollaborationAnchor,
  CollaborationReviewStatus,
  CollaborationReviewerStatus,
  CollaborationThreadPriority,
  CollaborationThreadStatus,
  CollaborationVisibility,
} from "../../models/collaboration";
import {
  COLLAB_PRIORITY_LABELS,
  COLLAB_REVIEWER_STATUS_LABELS,
  COLLAB_REVIEW_STATUS_LABELS,
  COLLAB_THREAD_STATUS_LABELS,
  COLLAB_VISIBILITY_LABELS,
} from "../../models/collaboration";
import { Z } from "../../utils/z-index";

export const GF = { fontFamily: "'Geist', 'Inter', system-ui, sans-serif" } as const;

export const CO = {
  navy: "#07111F", azure: "#0078D4", azureDeep: "#005EA2",
  azureSoft: "#F0F9FF", azureBorder: "#BAE6FD", gold: "#C9960C",
  slate9: "#0F172A", slate7: "#334155", slate6: "#475569", slate5: "#64748B",
  slate4: "#94A3B8", slate3: "#CBD5E1", slate2: "#E2E8F0", slate1: "#F1F5F9",
  slate0: "#F8FAFC", white: "#FFFFFF",
  successText: "#166534", successBg: "#F0FDF4", successBorder: "#BBF7D0",
  warnText: "#92400E", warnBg: "#FFFBEB", warnBorder: "#FDE68A",
  errorText: "#991B1B", errorBg: "#FEF2F2", errorBorder: "#FECACA",
} as const;

export interface Tone { bg: string; text: string; border: string }

export const TONES: Record<"neutral" | "muted" | "azure" | "success" | "warning" | "error" | "gold", Tone> = {
  neutral: { bg: CO.slate0, text: CO.slate6, border: CO.slate2 },
  muted:   { bg: CO.slate1, text: CO.slate5, border: CO.slate2 },
  azure:   { bg: CO.azureSoft, text: "#0369A1", border: CO.azureBorder },
  success: { bg: CO.successBg, text: CO.successText, border: CO.successBorder },
  warning: { bg: CO.warnBg, text: CO.warnText, border: CO.warnBorder },
  error:   { bg: CO.errorBg, text: CO.errorText, border: CO.errorBorder },
  gold:    { bg: "#FEFCE8", text: "#854D0E", border: "#FDE68A" },
};

export const COLLABORATION_STYLES = `
  .co-root { font-family: 'Geist', 'Inter', system-ui, sans-serif; }

  .co-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 44px; padding: 10px 16px; border-radius: 8px; font-size: 14px;
    font-weight: 600; line-height: 1.2; border: 1px solid transparent; cursor: pointer;
    text-decoration: none; transition: background-color 160ms ease, border-color 160ms ease; }
  .co-btn:focus-visible { outline: 2px solid ${CO.azure}; outline-offset: 2px; }
  .co-btn:disabled, .co-btn[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
  .co-btn-primary { background: ${CO.azure}; color: #fff; }
  .co-btn-primary:not(:disabled):hover { background: ${CO.azureDeep}; }
  .co-btn-secondary { background: ${CO.white}; color: ${CO.slate9}; border-color: ${CO.slate3}; }
  .co-btn-secondary:not(:disabled):hover { background: ${CO.slate0}; }
  .co-btn-ghost { background: transparent; color: ${CO.slate6}; }
  .co-btn-ghost:not(:disabled):hover { background: ${CO.slate1}; color: ${CO.slate9}; }
  .co-btn-danger { background: ${CO.errorBg}; color: ${CO.errorText}; border-color: ${CO.errorBorder}; }
  .co-btn-sm { min-height: 36px; padding: 7px 12px; font-size: 13px; }

  .co-input, .co-select, .co-textarea { width: 100%; min-height: 44px; padding: 10px 12px;
    border: 1.5px solid ${CO.slate3}; border-radius: 8px; font-family: inherit;
    font-size: 14px; color: ${CO.slate9}; background: ${CO.white}; }
  .co-textarea { min-height: 104px; resize: vertical; line-height: 1.6; }
  .co-input:focus, .co-select:focus, .co-textarea:focus { outline: 2px solid ${CO.azure}; outline-offset: 1px; border-color: ${CO.azure}; }
  .co-input[aria-invalid="true"], .co-textarea[aria-invalid="true"] { border-color: ${CO.errorText}; }

  .co-card { background: ${CO.white}; border: 1px solid ${CO.slate2}; border-radius: 12px; }
  .co-panel { background: ${CO.white}; border: 1px solid ${CO.slate2}; border-radius: 12px; padding: 20px; }
  .co-stack { display: flex; flex-direction: column; gap: 16px; }
  .co-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .co-split { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 20px; align-items: start; }

  /* Comment body: plain text, wrapped, never markup. */
  .co-body { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0;
    font-size: 14px; line-height: 1.7; color: ${CO.slate7}; }

  .co-thread-link { display: block; text-decoration: none; color: inherit; border-radius: 10px; }
  .co-thread-link:focus-visible { outline: 2px solid ${CO.azure}; outline-offset: 2px; }
  .co-thread-link:hover .co-thread-title { color: ${CO.azureDeep}; }

  .co-visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

  .co-scroll-x { overflow-x: auto; }

  @media (max-width: 1100px) { .co-split { grid-template-columns: minmax(0,1fr); } }
  @media (max-width: 860px) {
    /* Small controls grow back to a 44px target on touch. */
    .co-btn-sm { min-height: 44px; padding: 10px 14px; }
    .co-desktop-only { display: none !important; }
  }
  @media (min-width: 861px) { .co-mobile-only { display: none !important; } }

  @media (prefers-reduced-motion: reduce) {
    .co-btn, .co-input, .co-select, .co-textarea { transition: none !important; }
  }
`;

// ── Pills ─────────────────────────────────────────────────────────────────────

export function Pill({ label, tone, strong }: { label: string; tone: Tone; strong?: boolean }) {
  return (
    <span style={{
      ...GF, display: "inline-block", fontSize: 12, fontWeight: strong ? 700 : 600,
      padding: "3px 9px", borderRadius: 100, lineHeight: 1.4, whiteSpace: "nowrap",
      background: tone.bg, color: tone.text, border: `1px solid ${tone.border}`,
    }}>{label}</span>
  );
}

export function threadStatusTone(s: CollaborationThreadStatus): Tone {
  switch (s) {
    case "blocking-demonstration": return TONES.error;
    case "needs-attention":        return TONES.warning;
    case "reopened":               return TONES.gold;
    case "resolved":               return TONES.success;
    case "archived":               return TONES.muted;
    case "unavailable":            return TONES.muted;
    default:                       return TONES.azure;
  }
}

export function reviewStatusTone(s: CollaborationReviewStatus): Tone {
  switch (s) {
    case "changes-requested":     return TONES.warning;
    case "ready-for-preparation": return TONES.success;
    case "in-review":             return TONES.azure;
    case "archived":
    case "unavailable":           return TONES.muted;
    default:                      return TONES.neutral;
  }
}

export function reviewerStatusTone(s: CollaborationReviewerStatus): Tone {
  switch (s) {
    case "ready-for-preparation": return TONES.success;
    case "changes-requested":     return TONES.warning;
    case "in-review":             return TONES.azure;
    case "unavailable":           return TONES.error;
    default:                      return TONES.neutral;
  }
}

export function priorityTone(p: CollaborationThreadPriority): Tone {
  if (p === "high-attention") return TONES.error;
  if (p === "attention")      return TONES.warning;
  return TONES.neutral;
}

/**
 * Visibility is the highest-consequence label in this feature, so it is always
 * shown as its own pill and never abbreviated to an icon.
 */
export function visibilityTone(v: CollaborationVisibility): Tone {
  if (v === "participant-visible") return TONES.gold;
  if (v === "personal-draft-note") return TONES.muted;
  return TONES.neutral;
}

export const ThreadStatusPill = ({ status }: { status: CollaborationThreadStatus }) =>
  <Pill label={COLLAB_THREAD_STATUS_LABELS[status]} tone={threadStatusTone(status)} />;

export const ReviewStatusPill = ({ status }: { status: CollaborationReviewStatus }) =>
  <Pill label={COLLAB_REVIEW_STATUS_LABELS[status]} tone={reviewStatusTone(status)} strong />;

export const ReviewerStatusPill = ({ status }: { status: CollaborationReviewerStatus }) =>
  <Pill label={COLLAB_REVIEWER_STATUS_LABELS[status]} tone={reviewerStatusTone(status)} />;

export const PriorityPill = ({ priority }: { priority: CollaborationThreadPriority }) =>
  priority === "normal" ? null : <Pill label={COLLAB_PRIORITY_LABELS[priority]} tone={priorityTone(priority)} />;

export const VisibilityPill = ({ visibility }: { visibility: CollaborationVisibility }) =>
  <Pill label={COLLAB_VISIBILITY_LABELS[visibility]} tone={visibilityTone(visibility)} />;

// ── Notices ───────────────────────────────────────────────────────────────────

export function Notice({ text, tone = TONES.neutral, compact, icon = true }: {
  text: string; tone?: Tone; compact?: boolean; icon?: boolean;
}) {
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      padding: compact ? "8px 10px" : "12px 14px", borderRadius: 8,
      background: tone.bg, border: `1px solid ${tone.border}`,
    }}>
      {icon && <Info size={compact ? 13 : 15} style={{ color: tone.text, flexShrink: 0, marginTop: 2 }} aria-hidden />}
      <p style={{ ...GF, margin: 0, fontSize: compact ? 12 : 13, lineHeight: 1.6, color: tone.text }}>{text}</p>
    </div>
  );
}

/** Shown wherever a viewer may know a thread exists but may not read it. */
export function RestrictedNotice({ text }: { text: string }) {
  return (
    <div className="co-row" style={{
      gap: 8, padding: "10px 12px", borderRadius: 8,
      background: CO.slate1, border: `1px solid ${CO.slate2}`,
    }}>
      <Lock size={14} style={{ color: CO.slate5, flexShrink: 0 }} aria-hidden />
      <p style={{ ...GF, margin: 0, fontSize: 13, color: CO.slate6, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}

// ── Anchor reference ──────────────────────────────────────────────────────────
//
// A reference, never an annotation. A stale anchor degrades to a labelled,
// non-navigable line — it never breaks the thread and never silently disappears.

export function AnchorReference({ anchor, onNavigate }: {
  anchor: CollaborationAnchor;
  onNavigate?: (destination: string) => void;
}) {
  const navigable = anchor.availability === "available" && !!anchor.destination;
  const label = anchor.pageDirection !== null && anchor.type === "page-direction"
    ? `Page ${anchor.pageDirection}` : anchor.label;

  return (
    <div className="co-row" style={{ gap: 8 }}>
      <span style={{ ...GF, fontSize: 12, fontWeight: 700, color: CO.slate5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Refers to
      </span>
      {navigable && onNavigate ? (
        <button type="button" className="co-btn co-btn-ghost co-btn-sm"
          onClick={() => onNavigate(anchor.destination as string)}
          style={{ padding: "4px 8px", minHeight: 32, color: CO.azureDeep, textDecoration: "underline" }}>
          {label}
        </button>
      ) : (
        <span style={{ ...GF, fontSize: 13, color: CO.slate6 }}>{label}</span>
      )}
      {anchor.availability !== "available" && (
        <Pill label={anchor.availability === "stale" ? "No longer available" : "Restricted"} tone={TONES.muted} />
      )}
      {anchor.unavailableReason && (
        <p style={{ ...GF, margin: 0, fontSize: 12, color: CO.slate5, lineHeight: 1.6, width: "100%" }}>
          {anchor.unavailableReason}
        </p>
      )}
    </div>
  );
}

// ── Headings, chips, empty states ─────────────────────────────────────────────

export function SectionHeading({ title, description, action, level = 2 }: {
  title: string; description?: string; action?: React.ReactNode; level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <div className="co-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: description ? 12 : 10 }}>
      <div style={{ minWidth: 0 }}>
        <Tag style={{ ...GF, margin: 0, fontSize: level === 2 ? 16 : 14, fontWeight: 700, color: CO.navy }}>{title}</Tag>
        {description && (
          <p style={{ ...GF, margin: "5px 0 0", fontSize: 13, color: CO.slate5, lineHeight: 1.65 }}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CountChip({ label, value, tone, active, onClick }: {
  label: string; value: number; tone: Tone; active?: boolean; onClick?: () => void;
}) {
  const content = (
    <>
      <span style={{ ...GF, fontSize: 20, fontWeight: 700, color: tone.text, lineHeight: 1.1 }}>{value}</span>
      <span style={{ ...GF, fontSize: 12, color: CO.slate6, lineHeight: 1.4 }}>{label}</span>
    </>
  );
  const style: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start",
    padding: "12px 14px", borderRadius: 10, minWidth: 116, textAlign: "left",
    background: active ? tone.bg : CO.white,
    border: `1px solid ${active ? tone.border : CO.slate2}`,
  };
  if (!onClick) return <div style={style}>{content}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active}
      style={{ ...style, cursor: "pointer", minHeight: 44 }}>
      {content}
    </button>
  );
}

export function EmptyState({ title, body, actions }: {
  title: string; body: string; actions?: React.ReactNode;
}) {
  return (
    <div className="co-panel" style={{ textAlign: "center", padding: "40px 24px" }}>
      <h2 style={{ ...GF, margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: CO.navy }}>{title}</h2>
      <p style={{ ...GF, margin: "0 auto 20px", fontSize: 14, color: CO.slate5, lineHeight: 1.65, maxWidth: 470 }}>{body}</p>
      {actions && <div className="co-row" style={{ gap: 10, justifyContent: "center" }}>{actions}</div>}
    </div>
  );
}

export function Skeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <span className="co-visually-hidden">{label}</span>
      <style>{`@keyframes co-sk {0%,100%{opacity:1}50%{opacity:.45}}
        @media (prefers-reduced-motion: reduce){.co-sk{animation:none!important;opacity:.7}}`}</style>
      <div className="co-stack">
        {[0, 1, 2].map(i => (
          <div key={i} className="co-sk" aria-hidden style={{
            height: 72, borderRadius: 12, background: CO.slate1,
            animation: "co-sk 1.4s ease-in-out infinite", animationDelay: `${i * 110}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="co-panel" role="alert" style={{ borderColor: CO.errorBorder, background: CO.errorBg }}>
      <div className="co-row" style={{ gap: 10, alignItems: "flex-start" }}>
        <AlertTriangle size={16} style={{ color: CO.errorText, flexShrink: 0, marginTop: 2 }} aria-hidden />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ ...GF, margin: 0, fontSize: 14, color: CO.errorText, lineHeight: 1.6 }}>{message}</p>
          {onRetry && (
            <button type="button" className="co-btn co-btn-secondary co-btn-sm" onClick={onRetry} style={{ marginTop: 12 }}>
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Confirm dialog (never window.confirm) ─────────────────────────────────────

export interface ConfirmRequest {
  title: string; body: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void;
}

export function useCollaborationConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!request) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); setRequest(null); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
      const first = f[0], last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      prevFocus.current?.focus?.();
    };
  }, [request]);

  const dialog = request ? (
    <div role="alertdialog" aria-modal="true" aria-label={request.title}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={() => setRequest(null)} aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.42)" }} />
      <div ref={panelRef} className="co-root" style={{
        position: "relative", background: CO.white, borderRadius: 12, padding: "24px 26px",
        maxWidth: 470, width: "100%", boxShadow: "0 20px 60px rgba(7,17,31,0.18)",
      }}>
        <h2 style={{ ...GF, margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: CO.navy }}>{request.title}</h2>
        <p style={{ ...GF, margin: "0 0 22px", fontSize: 14, color: CO.slate6, lineHeight: 1.65 }}>{request.body}</p>
        <div className="co-row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="co-btn co-btn-secondary" onClick={() => setRequest(null)}>Cancel</button>
          <button ref={confirmRef} type="button"
            className={`co-btn ${request.destructive ? "co-btn-danger" : "co-btn-primary"}`}
            onClick={() => { request.onConfirm(); setRequest(null); }}>
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm: (r: ConfirmRequest) => setRequest(r), confirmDialog: dialog };
}

// ── Live announcer ────────────────────────────────────────────────────────────

export function useAnnouncer() {
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);
  const announce = (text: string) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setMessage("");
    timer.current = window.setTimeout(() => setMessage(text), 60);
  };
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  return {
    announce,
    announcerNode: <div aria-live="polite" aria-atomic="true" className="co-visually-hidden">{message}</div>,
  };
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export function Sheet({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => { prevFocus.current?.focus?.(); };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      const first = f[0], last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.42)" }} />
      <div ref={panelRef} tabIndex={-1} className="co-root" style={{
        position: "relative", background: CO.white, width: "min(560px,100%)", height: "100%",
        display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(7,17,31,0.16)",
      }}>
        <header style={{ padding: "16px 20px", borderBottom: `1px solid ${CO.slate2}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <h2 style={{ ...GF, margin: 0, fontSize: 16, fontWeight: 700, color: CO.navy }}>{title}</h2>
          <button type="button" className="co-btn co-btn-ghost" onClick={onClose} aria-label="Close"
            style={{ minHeight: 44, width: 44, padding: 0 }}>
            <X size={18} aria-hidden />
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>
        {footer && (
          <footer style={{ padding: "14px 20px calc(14px + env(safe-area-inset-bottom,0px))",
            borderTop: `1px solid ${CO.slate2}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// ── Author avatar ─────────────────────────────────────────────────────────────
// Initials only. The LAGDA logo is never used as an avatar, and there is no
// presence dot — this feature has no concept of who is online.

export function AuthorAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
  return (
    <span aria-hidden style={{
      ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: CO.slate1, border: `1px solid ${CO.slate2}`,
      color: CO.slate6, fontSize: Math.round(size * 0.38), fontWeight: 700,
    }}>{initials}</span>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────

export function formatDemonstrationTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
