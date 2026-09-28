// The action row at the foot of a Settings form: its status text on the
// left, its buttons in the BOTTOM-RIGHT, primary last (right-most).
//
// One component so every Settings section reads the same: Profile,
// Preferences, Branding (demo and real), Password and Organization. On a
// phone the buttons stack full-width with the primary last, so the thumb
// finds it at the bottom and nothing is squeezed side by side at 320px.
//
//   ─────────────────────────────────────────────────────────────
//   Profile updated.                      [ Discard ]  [ Save changes ]

import type { ReactNode } from "react";

export function SettingsActions({ status, children, testId = "settings-actions", divider = true }: {
  /** Saved / error / "Unsaved changes." — announced where it is rendered. */
  status?: ReactNode;
  /** The buttons, secondary first and the primary action LAST. */
  children: ReactNode;
  testId?: string;
  /** A hairline above the row (off when the row sits inside a card of its own). */
  divider?: boolean;
}) {
  return (
    <div className={`settings-actions${divider ? " settings-actions--divider" : ""}`} data-testid={testId}>
      <div className="settings-actions-status">{status}</div>
      <div className="settings-actions-buttons">{children}</div>
      <style>{SETTINGS_ACTIONS_STYLES}</style>
    </div>
  );
}

const SETTINGS_ACTIONS_STYLES = `
  .settings-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 12px 16px; margin-top: 8px; min-width: 0; }
  .settings-actions--divider { border-top: 1px solid #E3E8EF; padding-top: 16px; }
  .settings-actions-status { flex: 1 1 220px; min-width: 0; font-family: 'Geist', sans-serif; font-size: 13px; overflow-wrap: anywhere; }
  .settings-actions-status:empty { display: none; }
  .settings-actions-buttons { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; align-items: center; margin-left: auto; min-width: 0; }
  .settings-actions-buttons > * { white-space: nowrap; }
  .settings-actions-buttons > *:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  @media (max-width: 480px) {
    .settings-actions-status { flex-basis: 100%; }
    .settings-actions-buttons { width: 100%; flex-direction: column; align-items: stretch; margin-left: 0; }
    .settings-actions-buttons > * { width: 100%; box-sizing: border-box; }
  }
`;
