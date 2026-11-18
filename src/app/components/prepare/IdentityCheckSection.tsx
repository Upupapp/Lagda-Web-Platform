import { ON_LIGHT } from "../../utils/on-light";
// Prepare › Authentication › "ID and face verification".
//
// A switch per participant who acts on the document. Rendered only when the
// server says the check is offered to this workspace; the step is otherwise
// exactly as it was.
//
// ── Test mode ──────────────────────────────────────────────────────────────
//
// No provider is connected yet, so every check is simulated. The amber notice
// says so in the sender's own words before they switch anything on, because a
// sender who believes a simulated check identified somebody has been misled
// by this screen.

import type { ReactNode } from "react";
import { AlertTriangle, Check, Loader2, Lock } from "lucide-react";
import type { PrepParticipant } from "../../models/prepare";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../models/prepare";
import {
  IDENTITY_CHECK_OPTION_LABEL, IDENTITY_CHECK_TEST_MODE_NOTICE, IDENTITY_CHECK_HOSTED_EXPLAINER,
  IDENTITY_CHECK_VALID_SENDER_NOTE, IDENTITY_CHECK_NAME_SENDER_NOTE,
  roleCanBeAskedForIdentityCheck,
} from "../../models/identity-check";
import type { IdentityRequirementsControl } from "../../hooks/useIdentityCheckRequirements";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SILVER = ON_LIGHT.muted;
const GOLD = "#C9960C";

function Switch({ checked, disabled, label, onChange }: {
  checked: boolean; disabled: boolean; label: string; onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => { onChange(!checked); }}
      className="idc-switch"
      style={{
        // The tap target is the whole 44px box; the track is drawn inside it.
        minWidth: 52, minHeight: 44, padding: 0, border: "none", background: "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
      }}
    >
      <span aria-hidden className="idc-switch-track" style={{
        position: "relative", width: 40, height: 22, borderRadius: 999,
        background: checked ? AZURE : "#CBD5E1",
      }}>
        <span className="idc-switch-thumb" style={{
          position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18,
          borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 2px rgba(7,17,31,0.25)",
        }} />
      </span>
    </button>
  );
}

function SaveStatus({ control }: { control: IdentityRequirementsControl }) {
  const { saveState } = control;
  const text = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "failed" ? "Not saved" : "";
  const color = saveState === "failed" ? "#B91C1C" : saveState === "saved" ? "#1E7F4F" : SILVER;
  return (
    // Always in the layout, at a fixed size, so the heading row does not move
    // when a save starts or ends.
    <span
      role="status" aria-live="polite" data-testid="identity-check-save-status"
      style={{
        ...GF, display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 5,
        minWidth: 84, minHeight: 20, fontSize: 12, fontWeight: 600, color, flexShrink: 0,
      }}
    >
      {saveState === "saving" && <Loader2 size={13} aria-hidden className="animate-spin" />}
      {saveState === "saved" && <Check size={13} aria-hidden />}
      {text}
    </span>
  );
}

/** Who a switch is for. A Prepare participant is one; so is a recipient of a re-send. */
export type IdentityCheckPerson = Pick<PrepParticipant, "id" | "name" | "email"> & { readonly role: string };

const ROLE_LABELS: Readonly<Record<string, string>> = PREP_PARTICIPANT_ROLE_LABELS;

export function IdentityCheckSection({
  control, participants, renderNote,
  emptyMessage = "Add participants first, then choose who must pass the check.",
  notEditableMessage = "Upload the document first, then choose who must pass the check.",
}: {
  control: IdentityRequirementsControl;
  participants: readonly IdentityCheckPerson[];
  /**
   * More to say under one person's line: what the sender should know before
   * a re-send, for instance. Prepare passes nothing and reads as it always did.
   */
  renderNote?: (person: IdentityCheckPerson) => ReactNode;
  /** Said when nobody is listed. */
  emptyMessage?: string;
  /** Said when the switches cannot be changed yet. `null`: say nothing. */
  notEditableMessage?: string | null;
}) {
  if (control.status === "off") return null;

  const locked = control.status === "plan-locked";
  const disabled = locked || !control.canEdit;
  const askable = participants.filter(p => roleCanBeAskedForIdentityCheck(p.role));
  const others = participants.filter(p => !roleCanBeAskedForIdentityCheck(p.role));
  const anySigner = askable.some(p => p.role === "signer");
  const anyOn = askable.some(p => control.isRequired(p.email));

  return (
    <section
      aria-labelledby="identity-check-heading" data-testid="identity-check-section"
      style={{
        ...GF, margin: "20px 0 8px", padding: "clamp(14px, 3vw, 18px)", borderRadius: 12,
        border: "1px solid #D1D9E0", background: "#FFFFFF", opacity: locked ? 0.85 : 1,
      }}
    >
      <style>{`
        .idc-switch-track { transition: background 140ms ease; }
        .idc-switch-thumb { transition: left 140ms ease; }
        .idc-switch:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; border-radius: 10px; }
        .idc-link { min-height: 36px; }
        @media (max-width: 560px) { .idc-link { min-height: 44px; } }
        @media (prefers-reduced-motion: reduce) {
          .idc-switch-track, .idc-switch-thumb { transition: none; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h3 id="identity-check-heading" style={{ ...GF, margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>
          {IDENTITY_CHECK_OPTION_LABEL}
        </h3>
        {locked ? (
          <span style={{
            ...GF, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
            background: "#FEF9EC", color: GOLD, padding: "2px 8px", borderRadius: 20,
          }}>
            <Lock size={11} aria-hidden /> Business
          </span>
        ) : <SaveStatus control={control} />}
      </div>

      <p data-testid="identity-check-explainer" style={{ ...GF, fontSize: 13, color: "#475569", lineHeight: 1.55, margin: "6px 0 0" }}>
        {control.flow === "hosted" ? IDENTITY_CHECK_HOSTED_EXPLAINER : (
          <>
            Ask a participant to show an ID and take a selfie before they can open the document.
            This is in addition to their secure invitation link, not instead of it.
          </>
        )}
      </p>

      {/* How long a pass counts. Not where the plan does not include the
          check: there is nothing to pass. */}
      {!locked && (
        <p data-testid="identity-check-valid-note" style={{ ...GF, fontSize: 12.5, color: SILVER, lineHeight: 1.5, margin: "4px 0 0" }}>
          {IDENTITY_CHECK_VALID_SENDER_NOTE}
        </p>
      )}

      {/* The name read from the ID is compared with the name typed for the
          participant. Not where the plan does not include the check. */}
      {!locked && (
        <p data-testid="identity-check-name-note" style={{ ...GF, fontSize: 12.5, color: SILVER, lineHeight: 1.5, margin: "4px 0 0" }}>
          {IDENTITY_CHECK_NAME_SENDER_NOTE}
        </p>
      )}

      {locked && (
        <p data-testid="identity-check-plan-note" style={{ ...GF, fontSize: 12.5, fontWeight: 600, color: GOLD, margin: "10px 0 0" }}>
          Available on the Business plan.
        </p>
      )}

      {control.mode === "test" && (
        <div role="note" data-testid="identity-check-test-notice" style={{
          ...GF, display: "flex", gap: 8, alignItems: "flex-start", margin: "12px 0 0", padding: "10px 12px",
          borderRadius: 9, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E",
          fontSize: 12.5, lineHeight: 1.5,
        }}>
          <AlertTriangle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ minWidth: 0 }}>{IDENTITY_CHECK_TEST_MODE_NOTICE}</span>
        </div>
      )}

      {participants.length === 0 ? (
        <p style={{ ...GF, fontSize: 12.5, color: SILVER, margin: "12px 0 0" }}>
          {emptyMessage}
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", margin: "10px 0 2px" }}>
            <button
              type="button" className="idc-link" disabled={disabled || !anySigner}
              onClick={control.requireAllSigners}
              style={linkStyle(disabled || !anySigner)}
            >
              Require for all signers
            </button>
            <button
              type="button" className="idc-link" disabled={disabled || !anyOn}
              onClick={control.clear}
              style={linkStyle(disabled || !anyOn)}
            >
              Clear
            </button>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {askable.map(p => {
              const on = control.isRequired(p.email);
              return (
                <li key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "6px 0", borderTop: "1px solid #EEF2F6",
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>
                      {p.name || p.email}
                    </div>
                    <div style={{ ...GF, fontSize: 11.5, color: SILVER, overflowWrap: "anywhere" }}>
                      {ROLE_LABELS[p.role] ?? p.role} · {p.email}
                    </div>
                    {on && control.isWaived(p.email) && (
                      <div style={{ ...GF, fontSize: 11.5, color: GOLD, marginTop: 2 }}>
                        You allowed this participant a lighter method. Switch off and on to ask again.
                      </div>
                    )}
                    {renderNote?.(p)}
                  </div>
                  <Switch
                    checked={on} disabled={disabled}
                    label={`Require ${IDENTITY_CHECK_OPTION_LABEL} for ${p.name || p.email}`}
                    onChange={next => { control.setRequired(p.email, next); }}
                  />
                </li>
              );
            })}
            {others.map(p => (
              <li key={p.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "6px 0", minHeight: 44, borderTop: "1px solid #EEF2F6", boxSizing: "border-box",
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#64748B", overflowWrap: "anywhere" }}>
                    {p.name || p.email}
                  </div>
                  <div style={{ ...GF, fontSize: 11.5, color: SILVER, overflowWrap: "anywhere" }}>
                    {ROLE_LABELS[p.role] ?? p.role} · {p.email}
                  </div>
                </div>
                <span style={{ ...GF, fontSize: 11.5, color: SILVER, flexShrink: 0 }}>Not applicable</span>
              </li>
            ))}
          </ul>

          {!locked && !control.canEdit && control.status === "ready" && notEditableMessage !== null && (
            <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "8px 0 0" }}>
              {notEditableMessage}
            </p>
          )}
        </>
      )}

      {control.error !== null && (
        <p role="alert" style={{
          ...GF, margin: "10px 0 0", padding: "9px 12px", borderRadius: 9, background: "#FEF2F2",
          border: "1px solid #FECACA", color: "#7F1D1D", fontSize: 12.5, lineHeight: 1.5,
        }}>
          {control.error}
        </p>
      )}
    </section>
  );
}

function linkStyle(disabled: boolean) {
  return {
    ...GF, background: "none", border: "none", padding: "0 2px", fontSize: 12.5, fontWeight: 600,
    color: disabled ? "#B0BEC5" : AZURE, cursor: disabled ? "not-allowed" : "pointer",
  } as const;
}
