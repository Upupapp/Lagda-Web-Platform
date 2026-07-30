// Signing Workflow — shared design tokens and stylesheet.
//
// Uses the established LAGDA palette only:
//   Azure    #0078D4  active primary actions, current stage
//   Navy     #07111F  platform structure and headings
//   Light Azure       selected and current-stage surfaces
//   Slate / Cool Gray supporting information
//   Success  #166534  completed direction
//   Warning  #92400E  attention
//   Error    #991B1B  blocked, rejected, unavailable
//   Gold     #C9960C  sparingly, for significant stage emphasis only
//
// Burgundy (#67023B) is eNotary-only and never appears here.
// The official LAGDA logo is never used as a stage icon, participant icon,
// completion check, drag handle, progress marker, or button content.

export const GF = { fontFamily: "'Geist', 'Inter', system-ui, sans-serif" } as const;

export const WF = {
  navy:    "#07111F",
  azure:   "#0078D4",
  azureDeep: "#005EA2",
  azureSoft: "#F0F9FF",
  azureBorder: "#BAE6FD",
  gold:    "#C9960C",
  slate9:  "#0F172A",
  slate7:  "#334155",
  slate6:  "#475569",
  slate5:  "#64748B",
  slate4:  "#94A3B8",
  slate3:  "#CBD5E1",
  slate2:  "#E2E8F0",
  slate1:  "#F1F5F9",
  slate0:  "#F8FAFC",
  white:   "#FFFFFF",
  successText:   "#166534",
  successBg:     "#F0FDF4",
  successBorder: "#BBF7D0",
  warnText:      "#92400E",
  warnBg:        "#FFFBEB",
  warnBorder:    "#FDE68A",
  errorText:     "#991B1B",
  errorBg:       "#FEF2F2",
  errorBorder:   "#FECACA",
} as const;

/** Semantic tone bundles. Never the only signal — always paired with text. */
export interface Tone { bg: string; text: string; border: string }

export const TONES: Record<
  "neutral" | "muted" | "azure" | "success" | "warning" | "error" | "gold",
  Tone
> = {
  neutral: { bg: WF.slate0,    text: WF.slate6,       border: WF.slate2 },
  muted:   { bg: WF.slate1,    text: WF.slate5,       border: WF.slate2 },
  azure:   { bg: WF.azureSoft, text: "#0369A1",       border: WF.azureBorder },
  success: { bg: WF.successBg, text: WF.successText,  border: WF.successBorder },
  warning: { bg: WF.warnBg,    text: WF.warnText,     border: WF.warnBorder },
  error:   { bg: WF.errorBg,   text: WF.errorText,    border: WF.errorBorder },
  gold:    { bg: "#FEFCE8",    text: "#854D0E",       border: "#FDE68A" },
};

/**
 * Motion: 120–220ms, transform/opacity only, always disabled under
 * prefers-reduced-motion. No continuous pulsing, no confetti, no logo animation,
 * and no endless motion that would imply a live backend connection.
 */
export const WORKFLOW_STYLES = `
  .wf-root { font-family: 'Geist', 'Inter', system-ui, sans-serif; }

  /* ── Buttons ──────────────────────────────────────────────────────────── */
  .wf-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 44px; padding: 10px 16px; border-radius: 8px;
    font-size: 14px; font-weight: 600; line-height: 1.2;
    border: 1px solid transparent; cursor: pointer; text-decoration: none;
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
  }
  .wf-btn:focus-visible { outline: 2px solid ${WF.azure}; outline-offset: 2px; }
  .wf-btn:disabled, .wf-btn[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
  .wf-btn-primary { background: ${WF.azure}; color: #fff; }
  .wf-btn-primary:not(:disabled):hover { background: ${WF.azureDeep}; }
  .wf-btn-secondary { background: ${WF.white}; color: ${WF.slate9}; border-color: ${WF.slate3}; }
  .wf-btn-secondary:not(:disabled):hover { background: ${WF.slate0}; border-color: ${WF.slate4}; }
  .wf-btn-ghost { background: transparent; color: ${WF.slate6}; }
  .wf-btn-ghost:not(:disabled):hover { background: ${WF.slate1}; color: ${WF.slate9}; }
  .wf-btn-danger { background: ${WF.errorBg}; color: ${WF.errorText}; border-color: ${WF.errorBorder}; }
  .wf-btn-danger:not(:disabled):hover { background: #FEE2E2; }
  .wf-btn-sm { min-height: 36px; padding: 7px 12px; font-size: 13px; }

  /* Icon-only controls keep a 44px target and always carry an accessible name. */
  .wf-icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 8px;
    background: transparent; border: 1px solid ${WF.slate2}; color: ${WF.slate6};
    cursor: pointer; transition: background-color 160ms ease, color 160ms ease;
  }
  .wf-icon-btn:not(:disabled):hover { background: ${WF.slate1}; color: ${WF.slate9}; }
  .wf-icon-btn:focus-visible { outline: 2px solid ${WF.azure}; outline-offset: 2px; }
  .wf-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Inputs ───────────────────────────────────────────────────────────── */
  .wf-input, .wf-select, .wf-textarea {
    width: 100%; min-height: 44px; padding: 10px 12px;
    border: 1.5px solid ${WF.slate3}; border-radius: 8px;
    font-family: inherit; font-size: 14px; color: ${WF.slate9}; background: ${WF.white};
    transition: border-color 160ms ease;
  }
  .wf-textarea { min-height: 88px; resize: vertical; }
  .wf-input:focus, .wf-select:focus, .wf-textarea:focus {
    outline: 2px solid ${WF.azure}; outline-offset: 1px; border-color: ${WF.azure};
  }
  .wf-input[aria-invalid="true"] { border-color: ${WF.errorText}; }

  /* ── Cards and surfaces ───────────────────────────────────────────────── */
  .wf-card { background: ${WF.white}; border: 1px solid ${WF.slate2}; border-radius: 12px; }
  .wf-panel { background: ${WF.white}; border: 1px solid ${WF.slate2}; border-radius: 12px; padding: 20px; }

  /* ── Kanban board ─────────────────────────────────────────────────────── */
  /* Only this region scrolls horizontally. The page itself never does. */
  .wf-board-scroll {
    display: flex; gap: 0; align-items: stretch;
    overflow-x: auto; overflow-y: visible;
    padding: 4px 4px 16px; margin: 0 -4px;
    scroll-snap-type: x proximity;
  }
  .wf-board-scroll:focus-visible { outline: 2px solid ${WF.azure}; outline-offset: 2px; border-radius: 8px; }
  .wf-column {
    flex: 0 0 300px; width: 300px; scroll-snap-align: start;
    background: ${WF.slate0}; border: 1px solid ${WF.slate2}; border-radius: 12px;
    display: flex; flex-direction: column;
    transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
  }
  .wf-column-current { border-color: ${WF.azureBorder}; background: ${WF.azureSoft}; }
  .wf-column-drop-target { border-color: ${WF.azure}; border-style: dashed; }
  .wf-column-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; flex: 1; }

  /* The "Then" connector between stage columns. Text, not just an arrow. */
  .wf-connector {
    flex: 0 0 auto; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 4px;
    padding: 0 10px; align-self: center; color: ${WF.slate4};
  }
  .wf-connector-line { width: 20px; height: 2px; background: ${WF.azureBorder}; border-radius: 2px; }
  .wf-connector-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }

  /* ── Participant cards ────────────────────────────────────────────────── */
  .wf-pcard {
    width: 100%; text-align: left; background: ${WF.white};
    border: 1px solid ${WF.slate2}; border-radius: 10px; padding: 12px;
    cursor: pointer; font-family: inherit;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }
  .wf-pcard:hover { border-color: ${WF.slate3}; }
  .wf-pcard:focus-visible { outline: 2px solid ${WF.azure}; outline-offset: 2px; }
  .wf-pcard-selected { border-color: ${WF.azure}; box-shadow: 0 0 0 1px ${WF.azure}; }
  .wf-pcard-dragging { opacity: 0.55; transform: scale(0.98); }
  .wf-pcard-placeholder {
    border: 1.5px dashed ${WF.azure}; border-radius: 10px; background: ${WF.azureSoft};
    min-height: 56px;
  }

  /* ── Progress ─────────────────────────────────────────────────────────── */
  .wf-progress-track { height: 6px; background: ${WF.slate2}; border-radius: 3px; overflow: hidden; }
  .wf-progress-fill { height: 100%; background: ${WF.azure}; border-radius: 3px; transition: width 200ms ease; }
  .wf-progress-fill-done { background: ${WF.successText}; }

  /* ── Tables ───────────────────────────────────────────────────────────── */
  .wf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .wf-table th {
    text-align: left; padding: 10px 12px; font-weight: 700; color: ${WF.slate6};
    border-bottom: 1px solid ${WF.slate2}; white-space: nowrap; font-size: 12px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .wf-table td { padding: 12px; border-bottom: 1px solid ${WF.slate1}; color: ${WF.slate7}; vertical-align: top; }
  .wf-table tr:last-child td { border-bottom: none; }

  /* ── Layout ───────────────────────────────────────────────────────────── */
  .wf-split { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
  .wf-stack { display: flex; flex-direction: column; gap: 16px; }
  .wf-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  /* Sticky mobile action bar never covers content — pages add bottom padding. */
  .wf-mobile-actionbar { display: none; }

  /* ── Skip / announce ──────────────────────────────────────────────────── */
  .wf-visually-hidden {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }

  /* ── Entrance motion (one-shot, never looping) ────────────────────────── */
  @keyframes wf-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .wf-enter { animation: wf-rise 180ms ease-out both; }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .wf-split { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 860px) {
    /* Mobile uses stacked stages, not a shrunken horizontal canvas. */
    .wf-board-scroll { flex-direction: column; overflow-x: visible; gap: 0; }
    .wf-column { flex: 1 1 auto; width: 100%; }
    .wf-connector { flex-direction: row; padding: 8px 0; }
    .wf-connector-line { width: 2px; height: 16px; }
    .wf-mobile-actionbar {
      display: flex; gap: 10px; position: sticky; bottom: 0; z-index: 20;
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
      background: ${WF.white}; border-top: 1px solid ${WF.slate2};
      margin: 16px -16px -16px;
    }
    .wf-desktop-only { display: none !important; }
  }
  @media (min-width: 861px) {
    .wf-mobile-only { display: none !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .wf-btn, .wf-icon-btn, .wf-input, .wf-select, .wf-textarea,
    .wf-column, .wf-pcard, .wf-progress-fill { transition: none !important; }
    .wf-enter { animation: none !important; }
    .wf-pcard-dragging { transform: none; }
  }
`;
