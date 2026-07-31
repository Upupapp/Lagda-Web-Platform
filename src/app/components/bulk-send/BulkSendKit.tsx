// Bulk Send — shared styles and presentational primitives (Command 33).
//
// Structured, controlled, review-oriented. Never marketing-campaign styling:
// no email-blast imagery, no confetti, no animated send buttons, no fake delivery
// maps, no live progress, no pulsing counts, no notarial or crypto visuals.
//
// Status is always text. Nothing is communicated by colour or icon alone.

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type {
  BulkSendBatchStatus, BulkSendRecipientRowStatus, BulkSendValidationSeverity,
  BulkSendMappingConfidence, BulkSendProjectionResultStatus, BulkSendDefaultSource,
  BulkSendSavedConfigurationStatus,
} from "../../models/bulk-send";
import {
  BULK_SEND_BATCH_STATUS_LABELS, BULK_SEND_ROW_STATUS_LABELS,
  BULK_SEND_CONFIDENCE_LABELS, BULK_SEND_PROJECTION_RESULT_LABELS,
  BULK_SEND_DEFAULT_SOURCE_LABELS, BULK_SEND_CONFIG_STATUS_LABELS,
} from "../../models/bulk-send";

export const GF = { fontFamily: "'Geist', 'Inter', system-ui, sans-serif" } as const;

export const BS = {
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
  neutral: { bg: BS.slate0, text: BS.slate6, border: BS.slate2 },
  muted:   { bg: BS.slate1, text: BS.slate5, border: BS.slate2 },
  azure:   { bg: BS.azureSoft, text: "#0369A1", border: BS.azureBorder },
  success: { bg: BS.successBg, text: BS.successText, border: BS.successBorder },
  warning: { bg: BS.warnBg, text: BS.warnText, border: BS.warnBorder },
  error:   { bg: BS.errorBg, text: BS.errorText, border: BS.errorBorder },
  gold:    { bg: "#FEFCE8", text: "#854D0E", border: "#FDE68A" },
};

export const BULK_SEND_STYLES = `
  .bs-root { font-family: 'Geist', 'Inter', system-ui, sans-serif; }

  .bs-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 44px; padding: 10px 16px; border-radius: 8px; font-size: 14px;
    font-weight: 600; line-height: 1.2; border: 1px solid transparent; cursor: pointer;
    text-decoration: none; transition: background-color 160ms ease, border-color 160ms ease; }
  .bs-btn:focus-visible { outline: 2px solid ${BS.azure}; outline-offset: 2px; }
  .bs-btn:disabled, .bs-btn[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
  .bs-btn-primary { background: ${BS.azure}; color: #fff; }
  .bs-btn-primary:not(:disabled):hover { background: ${BS.azureDeep}; }
  .bs-btn-secondary { background: ${BS.white}; color: ${BS.slate9}; border-color: ${BS.slate3}; }
  .bs-btn-secondary:not(:disabled):hover { background: ${BS.slate0}; }
  .bs-btn-ghost { background: transparent; color: ${BS.slate6}; }
  .bs-btn-ghost:not(:disabled):hover { background: ${BS.slate1}; color: ${BS.slate9}; }
  .bs-btn-danger { background: ${BS.errorBg}; color: ${BS.errorText}; border-color: ${BS.errorBorder}; }
  .bs-btn-sm { min-height: 36px; padding: 7px 12px; font-size: 13px; }

  .bs-input, .bs-select, .bs-textarea { width: 100%; min-height: 44px; padding: 10px 12px;
    border: 1.5px solid ${BS.slate3}; border-radius: 8px; font-family: inherit;
    font-size: 14px; color: ${BS.slate9}; background: ${BS.white}; }
  .bs-textarea { min-height: 120px; resize: vertical; font-family: 'Geist Mono', monospace; font-size: 13px; }
  .bs-input:focus, .bs-select:focus, .bs-textarea:focus { outline: 2px solid ${BS.azure}; outline-offset: 1px; border-color: ${BS.azure}; }
  .bs-input[aria-invalid="true"] { border-color: ${BS.errorText}; }

  .bs-card { background: ${BS.white}; border: 1px solid ${BS.slate2}; border-radius: 12px; }
  .bs-panel { background: ${BS.white}; border: 1px solid ${BS.slate2}; border-radius: 12px; padding: 20px; }
  .bs-stack { display: flex; flex-direction: column; gap: 16px; }
  .bs-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .bs-split { display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 20px; align-items: start; }

  .bs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .bs-table th { text-align: left; padding: 10px 12px; font-weight: 700; color: ${BS.slate6};
    border-bottom: 1px solid ${BS.slate2}; white-space: nowrap; font-size: 12px;
    text-transform: uppercase; letter-spacing: 0.04em; background: ${BS.slate0}; }
  .bs-table td { padding: 11px 12px; border-bottom: 1px solid ${BS.slate1}; color: ${BS.slate7}; vertical-align: top; }
  .bs-table tr:last-child td { border-bottom: none; }
  .bs-scroll-x { overflow-x: auto; }

  .bs-step-nav { display: flex; gap: 6px; flex-wrap: wrap; }

  .bs-visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

  @media (max-width: 1100px) { .bs-split { grid-template-columns: minmax(0,1fr); } }
  @media (max-width: 860px) {
    .bs-btn-sm { min-height: 44px; padding: 10px 14px; }
    .bs-desktop-only { display: none !important; }
  }
  @media (min-width: 861px) { .bs-mobile-only { display: none !important; } }

  @media (prefers-reduced-motion: reduce) {
    .bs-btn, .bs-input, .bs-select, .bs-textarea { transition: none !important; }
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

export function batchStatusTone(s: BulkSendBatchStatus): Tone {
  switch (s) {
    case "ready-in-demonstration":    return TONES.azure;
    case "draft-projections-created": return TONES.success;
    case "partially-projected":       return TONES.warning;
    case "needs-review":
    case "mapping-required":
    case "validation-required":       return TONES.warning;
    case "invalid":
    case "unavailable":               return TONES.error;
    case "archived":                  return TONES.muted;
    default:                          return TONES.neutral;
  }
}

export function rowStatusTone(s: BulkSendRecipientRowStatus): Tone {
  switch (s) {
    case "ready-in-demonstration":    return TONES.success;
    case "draft-projection-created":  return TONES.success;
    case "warning":
    case "duplicate":                 return TONES.warning;
    case "incomplete":
    case "invalid-mapping":
    case "projection-failed-demonstration": return TONES.error;
    case "restricted":                return TONES.error;
    case "excluded":                  return TONES.muted;
    default:                          return TONES.neutral;
  }
}

export const BatchStatusPill = ({ status }: { status: BulkSendBatchStatus }) =>
  <Pill label={BULK_SEND_BATCH_STATUS_LABELS[status]} tone={batchStatusTone(status)} />;

export const RowStatusPill = ({ status }: { status: BulkSendRecipientRowStatus }) =>
  <Pill label={BULK_SEND_ROW_STATUS_LABELS[status]} tone={rowStatusTone(status)} />;

export const ConfidencePill = ({ c }: { c: BulkSendMappingConfidence }) =>
  <Pill label={BULK_SEND_CONFIDENCE_LABELS[c]}
    tone={c === "exact-header-match" ? TONES.success : c === "known-alias" ? TONES.azure : TONES.warning} />;

export const ResultStatusPill = ({ status }: { status: BulkSendProjectionResultStatus }) =>
  <Pill label={BULK_SEND_PROJECTION_RESULT_LABELS[status]}
    tone={status === "draft-projection-created" ? TONES.success
      : status === "excluded" ? TONES.muted
      : status === "restricted" || status === "projection-failed-demonstration" ? TONES.error
      : TONES.warning} />;

export const SourcePill = ({ source }: { source: BulkSendDefaultSource }) =>
  <Pill label={BULK_SEND_DEFAULT_SOURCE_LABELS[source]}
    tone={source === "user" ? TONES.azure : TONES.neutral} />;

export const ConfigStatusPill = ({ status }: { status: BulkSendSavedConfigurationStatus }) =>
  <Pill label={BULK_SEND_CONFIG_STATUS_LABELS[status]}
    tone={status === "active" ? TONES.success : status === "stale" ? TONES.warning
      : status === "restricted" ? TONES.error : TONES.muted} />;

// ── Notice ────────────────────────────────────────────────────────────────────

export function Notice({ text, tone = TONES.neutral, compact }: { text: string; tone?: Tone; compact?: boolean }) {
  return (
    <div className="bs-card" style={{
      padding: compact ? "10px 12px" : "14px 16px", background: tone.bg, borderColor: tone.border,
      display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      <Info size={16} color={tone.text} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ ...GF, margin: 0, fontSize: compact ? 12 : 13, color: tone.text, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}

export function SectionHeading({ title, description, action, level = 2 }: {
  title: string; description?: string; action?: React.ReactNode; level?: 1 | 2 | 3;
}) {
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <Tag style={{ ...GF, margin: 0, fontSize: level === 1 ? 22 : level === 2 ? 17 : 15, fontWeight: 700, color: BS.navy }}>
          {title}
        </Tag>
        {description && (
          <p style={{ ...GF, margin: "6px 0 0", fontSize: 13, color: BS.slate5, lineHeight: 1.6 }}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Counts strip (also acts as filters) ───────────────────────────────────────

export function CountChip({ label, value, tone, active, onClick }: {
  label: string; value: number; tone: Tone; active?: boolean; onClick?: () => void;
}) {
  const inner = (
    <>
      <span style={{ ...GF, fontSize: 20, fontWeight: 800, color: tone.text, lineHeight: 1 }}>{value}</span>
      <span style={{ ...GF, fontSize: 12, color: BS.slate5, marginTop: 4 }}>{label}</span>
    </>
  );
  const style: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    padding: "12px 14px", borderRadius: 10, minWidth: 104, textAlign: "left",
    background: active ? tone.bg : BS.white,
    border: `1px solid ${active ? tone.border : BS.slate2}`,
    cursor: onClick ? "pointer" : "default", fontFamily: "inherit",
  };
  return onClick
    ? <button type="button" className="bs-count-chip" style={style} onClick={onClick} aria-pressed={!!active}>{inner}</button>
    : <div style={style}>{inner}</div>;
}

// ── Issue list ────────────────────────────────────────────────────────────────

export function IssueList({ issues, title }: {
  issues: { severity: BulkSendValidationSeverity; message: string; suggestedCorrection?: string | null }[];
  title?: string;
}) {
  if (issues.length === 0) {
    return (
      <div className="bs-card" style={{ padding: 14, background: TONES.success.bg, borderColor: TONES.success.border }}>
        <span className="bs-row" style={{ gap: 8 }}>
          <CheckCircle2 size={17} color={TONES.success.text} aria-hidden />
          <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: TONES.success.text }}>
            No issues found.
          </span>
        </span>
      </div>
    );
  }
  const blocking = issues.filter(i => i.severity === "blocking");
  const rest = issues.filter(i => i.severity !== "blocking");

  const group = (list: typeof issues, heading: string, tone: Tone, Icon: typeof XCircle) => (
    <div className="bs-card" style={{ padding: 14, background: tone.bg, borderColor: tone.border }}>
      <span className="bs-row" style={{ gap: 8, marginBottom: 8 }}>
        <Icon size={16} color={tone.text} aria-hidden />
        <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: tone.text }}>{heading} ({list.length})</span>
      </span>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map((i, n) => (
          <li key={n} style={{ ...GF, fontSize: 13, color: tone.text, lineHeight: 1.55 }}>
            {i.message}
            {i.suggestedCorrection && (
              <span style={{ display: "block", fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                {i.suggestedCorrection}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="bs-stack" style={{ gap: 10 }} role="group" aria-label={title ?? "Issues"}>
      {blocking.length > 0 && group(blocking, "Must be fixed", TONES.error, XCircle)}
      {rest.length > 0 && group(rest, "Worth checking", TONES.warning, AlertTriangle)}
    </div>
  );
}

// ── Confirm dialog (never window.confirm) ─────────────────────────────────────

export interface ConfirmRequest {
  title: string; body: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void;
}

export function useBulkSendConfirm() {
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
      const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
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
      style={{ position: "fixed", inset: 0, zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={() => setRequest(null)} aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.42)" }} />
      <div ref={panelRef} className="bs-root" style={{
        position: "relative", background: BS.white, borderRadius: 12, padding: "24px 26px",
        maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(7,17,31,0.18)",
      }}>
        <h2 style={{ ...GF, margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: BS.navy }}>{request.title}</h2>
        <p style={{ ...GF, margin: "0 0 22px", fontSize: 14, color: BS.slate6, lineHeight: 1.65 }}>{request.body}</p>
        <div className="bs-row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="bs-btn bs-btn-secondary" onClick={() => setRequest(null)}>Cancel</button>
          <button ref={confirmRef} type="button"
            className={`bs-btn ${request.destructive ? "bs-btn-danger" : "bs-btn-primary"}`}
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
    announcerNode: <div aria-live="polite" aria-atomic="true" className="bs-visually-hidden">{message}</div>,
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function Skeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <span className="bs-visually-hidden">{label}</span>
      <style>{`@keyframes bs-sk {0%,100%{opacity:1}50%{opacity:.45}}
        @media (prefers-reduced-motion: reduce){.bs-sk{animation:none!important;opacity:.7}}`}</style>
      <div className="bs-stack">
        {[0, 1, 2].map(i => (
          <div key={i} className="bs-sk" aria-hidden style={{
            height: 64, borderRadius: 12, background: BS.slate1,
            animation: "bs-sk 1.4s ease-in-out infinite", animationDelay: `${i * 110}ms`,
          }} />
        ))}
      </div>
    </div>
  );
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
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,0.42)" }} />
      <div ref={panelRef} tabIndex={-1} className="bs-root" style={{
        position: "relative", background: BS.white, width: "min(560px,100%)", height: "100%",
        display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(7,17,31,0.16)",
      }}>
        <header style={{ padding: "16px 20px", borderBottom: `1px solid ${BS.slate2}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <h2 style={{ ...GF, margin: 0, fontSize: 16, fontWeight: 700, color: BS.navy }}>{title}</h2>
          <button type="button" className="bs-btn bs-btn-ghost" onClick={onClose} aria-label="Close"
            style={{ minHeight: 44, width: 44, padding: 0 }}>
            <X size={18} aria-hidden />
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>
        {footer && (
          <footer style={{ padding: "14px 20px calc(14px + env(safe-area-inset-bottom,0px))",
            borderTop: `1px solid ${BS.slate2}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ title, body, actions }: {
  title: string; body: string; actions?: React.ReactNode;
}) {
  return (
    <div className="bs-panel" style={{ textAlign: "center", padding: "40px 24px" }}>
      <h2 style={{ ...GF, margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: BS.navy }}>{title}</h2>
      <p style={{ ...GF, margin: "0 auto 20px", fontSize: 14, color: BS.slate5, lineHeight: 1.65, maxWidth: 460 }}>{body}</p>
      {actions && <div className="bs-row" style={{ gap: 10, justifyContent: "center" }}>{actions}</div>}
    </div>
  );
}
