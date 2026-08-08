// The single stacking ladder for the platform.
//
// The repository styles almost everything with inline React styles, so a CSS
// custom property alone cannot be consumed — `zIndex: "var(--lagda-z-modal)"`
// is valid CSS but defeats type-checking and reads poorly at the call site.
// These constants mirror `--lagda-z-*` in `styles/theme.css` exactly; change
// both together.
//
// WHY THIS EXISTS: before it, overlays carried more than twenty different
// hand-picked values between 0 and 10100. Dialogs that do the same job sat at
// 200, 1000, 1300, 2000, 9000 and 9999, a full-screen loader tied with a
// contact dialog at 9999 (so DOM order silently decided the winner), and toasts
// had no value at all. Which overlay covered which was an accident of when the
// page was written.
//
// RULE: never write a numeric `zIndex` in a component. If a new layer is
// genuinely needed, add it here with a comment saying what it must sit above.

export const Z = {
  /** Default flow. */
  base: 0,
  /** Lifted off the page but still in flow — hover cards, focused rows. */
  raised: 10,
  /** In-page sticky toolbars and table headers. Must NOT cover the shell. */
  sticky: 20,
  /** Platform header, sidebar, mobile top bar. Above page content, below menus. */
  shell: 30,
  /** Menus, popovers, comboboxes, tooltips — anything anchored to a trigger. */
  dropdown: 40,
  /** Mobile navigation and side panels. Their scrim uses `drawerScrim`. */
  drawerScrim: 49,
  drawer: 50,
  /** Dialogs, sheets and confirmations. Their scrim uses `modalScrim`. */
  modalScrim: 59,
  modal: 60,
  /** Command palette. Deliberately over a dialog: Ctrl+K is a global escape. */
  palette: 70,
  /** Toasts must outrank a modal, or feedback about the modal is invisible. */
  toast: 80,
  /** Full-screen branded loading sequence. */
  loader: 90,
  /** Skip link — the keyboard escape hatch outranks everything. */
  skipLink: 100,
} as const;

export type ZLayer = keyof typeof Z;
