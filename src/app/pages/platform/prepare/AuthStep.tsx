// Step 4 of 7: Authentication — set the default auth method and per-participant overrides.
// PRIVACY: no OTP codes, passwords, or tokens are shown, collected, or logged here.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.

import React, { useEffect } from "react";
import { usePrepare } from "../../../context/PrepareContext";
import {
  PREP_AUTH_METHODS,
  getAuthMethodConfig,
  isAuthMethodAvailableForParticipant,
  PREP_PARTICIPANT_ROLE_LABELS,
  DEFAULT_AUTH_CONFIG,
} from "../../../models/prepare";
import type { PrepAuthMethodId, PrepParticipant } from "../../../models/prepare";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

function availabilityBadge(avail: string): { text: string; color: string; bg: string } | null {
  switch (avail) {
    case "plan-dependent":
      return { text: "Plan", color: GOLD, bg: "#FEF9EC" };
    case "enterprise":
      return { text: "Enterprise", color: "#6C4BA8", bg: "#F0EEF8" };
    case "planned":
      return { text: "Coming soon", color: SILVER, bg: "#F5F7FA" };
    default:
      return null;
  }
}

function MethodCard({
  methodId,
  selected,
  disabled,
  disabledReason,
  name,
  onChange,
}: {
  methodId: PrepAuthMethodId;
  selected: boolean;
  disabled: boolean;
  disabledReason?: string;
  name: string;
  onChange: (id: PrepAuthMethodId) => void;
}) {
  const config = getAuthMethodConfig(methodId);
  const badge  = availabilityBadge(config.availability);

  return (
    <label
      style={{
        ...GF,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        border: `1px solid ${selected ? AZURE : disabled ? "#E3E8EF" : "#D1D9E0"}`,
        background: selected ? "#EBF4FC" : disabled ? "#F9FAFB" : "#FFFFFF",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="radio"
        name={name}
        value={methodId}
        checked={selected}
        disabled={disabled}
        onChange={() => !disabled && onChange(methodId)}
        style={{ accentColor: AZURE, marginTop: 3, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: selected ? 700 : 500, color: NAVY }}>
            {config.label}
          </span>
          {badge && (
            <span
              style={{
                ...GF,
                fontSize: 11,
                fontWeight: 700,
                background: badge.bg,
                color: badge.color,
                padding: "2px 7px",
                borderRadius: 20,
              }}
            >
              {badge.text}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#4B5E70", lineHeight: 1.5 }}>
          {config.description}
        </div>
        {disabledReason && (
          <div style={{ fontSize: 11, color: GOLD, marginTop: 4 }}>{disabledReason}</div>
        )}
        {config.planNote && !disabled && (
          <div style={{ fontSize: 11, color: SILVER, marginTop: 4 }}>{config.planNote}</div>
        )}
      </div>
    </label>
  );
}

function ParticipantAuthRow({
  participant,
  defaultMethod,
  override,
  onOverrideChange,
}: {
  participant: PrepParticipant;
  defaultMethod: PrepAuthMethodId;
  override: PrepAuthMethodId | null;
  onOverrideChange: (paxId: string, method: PrepAuthMethodId | null) => void;
}) {
  const effectiveMethod = override ?? defaultMethod;

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        border: "1px solid #E3E8EF",
        background: "#FAFBFC",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{participant.name}</div>
          <div style={{ ...GF, fontSize: 11, color: SILVER }}>
            {PREP_PARTICIPANT_ROLE_LABELS[participant.role]} · {participant.email}
          </div>
        </div>
        {override && (
          <button
            onClick={() => onOverrideChange(participant.id, null)}
            style={{
              ...GF,
              fontSize: 11,
              fontWeight: 600,
              color: AZURE,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            Reset to default
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PREP_AUTH_METHODS.map(m => {
          const { available, reason } = isAuthMethodAvailableForParticipant(m.id, participant);
          const isSelected = effectiveMethod === m.id;
          const isDefault  = !override && m.id === defaultMethod;

          return (
            <button
              key={m.id}
              onClick={() => available && onOverrideChange(participant.id, m.id)}
              disabled={!available}
              aria-pressed={isSelected}
              style={{
                ...GF,
                padding: "5px 12px",
                borderRadius: 20,
                border: `1px solid ${isSelected ? AZURE : "#D1D9E0"}`,
                background: isSelected ? (isDefault ? "#EBF4FC" : "#D0EAFF") : "#FFFFFF",
                color: isSelected ? AZURE : available ? NAVY : "#B0BEC5",
                fontSize: 11,
                fontWeight: isSelected ? 700 : 500,
                cursor: available ? "pointer" : "not-allowed",
                position: "relative",
              }}
              title={reason}
            >
              {m.label}
              {isDefault && !override && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: AZURE,
                    color: "#FFFFFF",
                    fontSize: 8,
                    fontWeight: 800,
                    borderRadius: 20,
                    padding: "1px 4px",
                  }}
                >
                  DEFAULT
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main step ─────────────────────────────────────────────────────────────────

export function AuthStep() {
  const { draft, updateAuth, setStep, validate } = usePrepare();

  useEffect(() => { setStep("authentication"); }, [setStep]);

  const auth         = draft?.auth ?? DEFAULT_AUTH_CONFIG;
  const participants = draft?.participants ?? [];
  const validation   = draft ? validate() : null;
  const authErrors   = validation?.errors.filter(e => e.stepId === "authentication") ?? [];
  const authWarnings = validation?.warnings.filter(e => e.stepId === "authentication") ?? [];

  const handleDefaultChange = (method: PrepAuthMethodId) => {
    updateAuth({ ...auth, defaultMethod: method });
  };

  const handleOverrideChange = (paxId: string, method: PrepAuthMethodId | null) => {
    const next = { ...auth.perParticipant };
    if (method === null) {
      delete next[paxId];
    } else {
      next[paxId] = method;
    }
    updateAuth({ ...auth, perParticipant: next });
  };

  const hasParticipants = participants.length > 0;

  return (
    <div style={{ ...GF, maxWidth: 620 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
          Authentication
        </h2>
        <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Choose how participants verify their identity before accessing the document.
          Set a default for all participants, then override individually if needed.
        </p>
      </div>

      {/* Validation */}
      {authErrors.length > 0 && (
        <ul aria-live="polite" style={{ ...GF, listStyle: "none", margin: "0 0 16px", padding: "10px 14px", borderRadius: 8, border: "1px solid #F5C6CB", background: "#FFF5F5", fontSize: 13, color: "#C0392B" }}>
          {authErrors.map(e => <li key={e.id}>• {e.message}</li>)}
        </ul>
      )}
      {authWarnings.length > 0 && (
        <ul style={{ ...GF, listStyle: "none", margin: "0 0 16px", padding: "10px 14px", borderRadius: 8, border: "1px solid #F0D07A", background: "#FEF9EC", fontSize: 13, color: GOLD }}>
          {authWarnings.map(e => <li key={e.id}>• {e.message}</li>)}
        </ul>
      )}

      {/* Default method */}
      <fieldset style={{ border: "none", margin: "0 0 32px", padding: 0 }}>
        <legend style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
          Default authentication method
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PREP_AUTH_METHODS.map(m => {
            const unavail = m.availability === "planned" || m.availability === "enterprise";
            return (
              <MethodCard
                key={m.id}
                methodId={m.id}
                selected={auth.defaultMethod === m.id}
                disabled={unavail}
                disabledReason={unavail ? m.planNote : undefined}
                name="default-auth"
                onChange={handleDefaultChange}
              />
            );
          })}
        </div>
      </fieldset>

      {/* Per-participant overrides */}
      {hasParticipants && (
        <div>
          <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
            Per-participant authentication
          </div>
          <div style={{ ...GF, fontSize: 12, color: SILVER, marginBottom: 12 }}>
            Override the default method for individual participants. Overrides are marked with a
            darker highlight; the default is shown with a "DEFAULT" badge.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {participants.map(p => (
              <ParticipantAuthRow
                key={p.id}
                participant={p}
                defaultMethod={auth.defaultMethod}
                override={auth.perParticipant[p.id] ?? null}
                onOverrideChange={handleOverrideChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Privacy notice */}
      <div style={{ ...GF, marginTop: 32, padding: "12px 14px", borderRadius: 8, background: "#F5F7FA", border: "1px solid #E3E8EF", fontSize: 12, color: SILVER, lineHeight: 1.6 }}>
        <strong style={{ color: "#4B5E70" }}>Privacy notice</strong>
        <br />
        Authentication method selections are stored only in this browser session. No OTP codes,
        passwords, or tokens are generated, transmitted, or logged in this frontend demonstration.
        Authentication selection alone does not confirm a participant's identity or legal capacity.
      </div>
    </div>
  );
}
