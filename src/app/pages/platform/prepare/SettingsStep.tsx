// Step 5 of 7: Settings — invitation, reminders, expiration, and completion settings.
// PRIVACY: invitation messages are stored only in React context, never persisted.
// No invitations are sent from this frontend demonstration.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.

import React, { useEffect, useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";
import { usePrepare } from "../../../context/PrepareContext";
import {
  DEFAULT_PREP_SETTINGS,
} from "../../../models/prepare";
import type { PrepSettings } from "../../../models/prepare";
import { StepBanner, StepTwoColumn, RailCard, StepIssueList } from "../../../components/prepare/StepBanner";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY }}>{title}</div>
      {subtitle && <div style={{ ...GF, fontSize: 12, color: SILVER, marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        ...GF,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        cursor: "pointer",
        paddingBottom: 12,
        borderBottom: "1px solid #F0F2F5",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: SILVER, marginTop: 2, lineHeight: 1.5 }}>{description}</div>}
      </div>
      {/* No onClick here — this div sits inside <label htmlFor={id}>, so a
          click anywhere in the label already toggles the checkbox natively
          via the browser's own label association. Adding a manual onClick
          on top of that fired onChange twice per click (once from here,
          once from the native label→checkbox forward), which is what made
          the switch feel unresponsive — the second call could undo the
          first. The checkbox is the single source of truth; this div is
          purely the visual track. */}
      <div
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: checked ? AZURE : "#D1D9E0",
          flexShrink: 0,
          position: "relative",
          transition: "background 0.15s",
          cursor: "pointer",
        }}
      >
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
        <div
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.15s",
          }}
        />
      </div>
    </label>
  );
}

function NumberInput({
  id,
  label,
  value,
  min,
  max,
  unit,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <label htmlFor={id} style={{ ...GF, fontSize: 13, color: disabled ? SILVER : NAVY, fontWeight: 500, minWidth: 180 }}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        style={{
          ...GF,
          width: 70,
          padding: "6px 10px",
          borderRadius: 7,
          border: "1px solid #D1D9E0",
          background: disabled ? "#F5F7FA" : "#FFFFFF",
          color: disabled ? SILVER : NAVY,
          fontSize: 13,
          textAlign: "right",
        }}
      />
      <span style={{ ...GF, fontSize: 12, color: SILVER }}>{unit}</span>
    </div>
  );
}

// ── Main step ─────────────────────────────────────────────────────────────────

export function SettingsStep() {
  const { draft, updateSettings, setStep, validate } = usePrepare();

  useEffect(() => { setStep("settings"); }, [setStep]);

  const settings   = draft?.settings ?? DEFAULT_PREP_SETTINGS;
  const validation = draft ? validate() : null;
  const errors     = validation?.errors.filter(e => e.stepId === "settings") ?? [];
  const warnings   = validation?.warnings.filter(e => e.stepId === "settings") ?? [];

  const updateInvitation = useCallback((patch: Partial<typeof settings.invitation>) => {
    updateSettings({ ...settings, invitation: { ...settings.invitation, ...patch } });
  }, [settings, updateSettings]);

  const updateReminders = useCallback((patch: Partial<typeof settings.reminders>) => {
    updateSettings({ ...settings, reminders: { ...settings.reminders, ...patch } });
  }, [settings, updateSettings]);

  const updateExpiration = useCallback((patch: Partial<typeof settings.expiration>) => {
    updateSettings({ ...settings, expiration: { ...settings.expiration, ...patch } });
  }, [settings, updateSettings]);

  const updateCompletion = useCallback((patch: Partial<typeof settings.completion>) => {
    updateSettings({ ...settings, completion: { ...settings.completion, ...patch } });
  }, [settings, updateSettings]);

  const today = new Date().toISOString().split("T")[0]!;

  const main = (
    <div style={{ ...GF, width: "100%" }}>
      {/* Validation */}
      <StepIssueList issues={errors} severity="error" />
      <StepIssueList issues={warnings} severity="warning" />

      {/* Invitation */}
      <div style={{ marginBottom: 32, padding: "20px", borderRadius: 12, border: "1px solid #E3E8EF" }}>
        <SectionHeader
          title="Invitation"
          subtitle="Customise the email invitation sent to participants. No invitations are sent in this demonstration."
        />

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="inv-subject" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>
            Subject line
          </label>
          <input
            id="inv-subject"
            type="text"
            value={settings.invitation.subject}
            onChange={e => updateInvitation({ subject: e.target.value })}
            maxLength={200}
            style={{
              ...GF,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid #D1D9E0",
              background: "#FFFFFF",
              fontSize: 13,
              color: NAVY,
              boxSizing: "border-box",
            }}
          />
          <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 3 }}>
            Use {"{title}"} to insert the transaction title.
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="inv-message" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>
            Message <span style={{ color: SILVER, fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="inv-message"
            value={settings.invitation.message}
            onChange={e => updateInvitation({ message: e.target.value })}
            maxLength={2000}
            rows={4}
            placeholder="Add a personal note to participants…"
            style={{
              ...GF,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid #D1D9E0",
              background: "#FFFFFF",
              fontSize: 13,
              color: NAVY,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 3 }}>
            Not stored after this browser session. Not transmitted in this demonstration.
          </div>
        </div>

        <div>
          <label htmlFor="inv-sender" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>
            Sender display name <span style={{ color: SILVER, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="inv-sender"
            type="text"
            value={settings.invitation.senderDisplayName}
            onChange={e => updateInvitation({ senderDisplayName: e.target.value })}
            maxLength={100}
            placeholder="Your name or team name"
            style={{
              ...GF,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid #D1D9E0",
              background: "#FFFFFF",
              fontSize: 13,
              color: NAVY,
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Reminders */}
      <div style={{ marginBottom: 32, padding: "20px", borderRadius: 12, border: "1px solid #E3E8EF" }}>
        <SectionHeader
          title="Reminders"
          subtitle="Automatic reminder emails sent to participants who have not yet acted."
        />
        <div style={{ marginBottom: 14 }}>
          <Toggle
            id="reminders-enabled"
            label="Enable reminders"
            description="Send automatic reminders to participants who have not completed their required actions."
            checked={settings.reminders.enabled}
            onChange={v => updateReminders({ enabled: v })}
          />
        </div>
        <NumberInput
          id="first-reminder"
          label="Send first reminder after"
          value={settings.reminders.firstReminderDays}
          min={1}
          max={30}
          unit="days"
          disabled={!settings.reminders.enabled}
          onChange={v => updateReminders({ firstReminderDays: v })}
        />
        <NumberInput
          id="repeat-interval"
          label="Then repeat every"
          value={settings.reminders.repeatIntervalDays}
          min={1}
          max={30}
          unit="days"
          disabled={!settings.reminders.enabled}
          onChange={v => updateReminders({ repeatIntervalDays: v })}
        />
      </div>

      {/* Expiration */}
      <div style={{ marginBottom: 32, padding: "20px", borderRadius: 12, border: "1px solid #E3E8EF" }}>
        <SectionHeader
          title="Expiration"
          subtitle="Automatically void the transaction if participants do not complete it by a deadline."
        />
        <div style={{ marginBottom: 14 }}>
          <Toggle
            id="expiration-enabled"
            label="Set an expiration date"
            description="The transaction will be voided after the expiration date if not completed."
            checked={settings.expiration.enabled}
            onChange={v => updateExpiration({ enabled: v, expiresAt: v ? settings.expiration.expiresAt : null })}
          />
        </div>
        {settings.expiration.enabled && (
          <div>
            <label htmlFor="expiry-date" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>
              Expiration date <span style={{ color: GOLD }}>*</span>
            </label>
            <input
              id="expiry-date"
              type="date"
              value={settings.expiration.expiresAt ?? ""}
              min={today}
              onChange={e => updateExpiration({ expiresAt: e.target.value || null })}
              style={{
                ...GF,
                padding: "8px 10px",
                borderRadius: 7,
                border: "1px solid #D1D9E0",
                background: "#FFFFFF",
                fontSize: 13,
                color: NAVY,
              }}
            />
          </div>
        )}
      </div>

      {/* Completion */}
      <div style={{ padding: "20px", borderRadius: 12, border: "1px solid #E3E8EF", marginBottom: 32 }}>
        <SectionHeader
          title="Completion"
          subtitle="What happens when all required participants have completed their actions."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Toggle
            id="notify-sender"
            label="Notify me when complete"
            description="Send a completion notification to the transaction sender."
            checked={settings.completion.notifySenderOnComplete}
            onChange={v => updateCompletion({ notifySenderOnComplete: v })}
          />
          <Toggle
            id="copy-participants"
            label="Send completed copy to signers"
            description="Participants who completed required actions receive a copy of the signed document."
            checked={settings.completion.sendCompletionCopyToParticipants}
            onChange={v => updateCompletion({ sendCompletionCopyToParticipants: v })}
          />
          <Toggle
            id="copy-cc"
            label="Send completed copy to copy recipients"
            description="Carbon-copy recipients receive a copy of the signed document upon completion."
            checked={settings.completion.sendCompletionCopyToCCRecipients}
            onChange={v => updateCompletion({ sendCompletionCopyToCCRecipients: v })}
          />
          <Toggle
            id="allow-download"
            label="Allow participant download"
            description="Participants may download the completed document from their access link."
            checked={settings.completion.allowParticipantDownload}
            onChange={v => updateCompletion({ allowParticipantDownload: v })}
          />
          <Toggle
            id="create-verification"
            label="Create a verification record"
            description="A verification record will be created, enabling this transaction to be checked at verify.lagda.ph."
            checked={settings.completion.createVerificationRecord}
            onChange={v => updateCompletion({ createVerificationRecord: v })}
          />
        </div>
      </div>

      {/* Demo notice */}
      <div style={{ ...GF, padding: "12px 14px", borderRadius: 8, background: "#F5F7FA", border: "1px solid #E3E8EF", fontSize: 12, color: SILVER, lineHeight: 1.6 }}>
        <strong style={{ color: "#4B5E70" }}>Frontend demonstration</strong>
        <br />
        No invitations, reminders, or completion notifications are sent from this demonstration.
        Invitation messages entered here are stored only in this browser session.
      </div>
    </div>
  );

  const completionFlags: { label: string; on: boolean }[] = [
    { label: "Notify sender on complete", on: settings.completion.notifySenderOnComplete },
    { label: "Copy to signers", on: settings.completion.sendCompletionCopyToParticipants },
    { label: "Copy to CC recipients", on: settings.completion.sendCompletionCopyToCCRecipients },
    { label: "Participant download allowed", on: settings.completion.allowParticipantDownload },
    { label: "Verification record created", on: settings.completion.createVerificationRecord },
  ];

  const rail = (
    <>
      <RailCard title="Reminders & expiry">
        <div style={{ ...GF, fontSize: 12, color: "#4B5E70", display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            {settings.reminders.enabled
              ? `First reminder after ${settings.reminders.firstReminderDays} day${settings.reminders.firstReminderDays !== 1 ? "s" : ""}, then every ${settings.reminders.repeatIntervalDays} day${settings.reminders.repeatIntervalDays !== 1 ? "s" : ""}.`
              : "Reminders are disabled."}
          </div>
          <div>
            {settings.expiration.enabled && settings.expiration.expiresAt
              ? `Expires ${new Date(settings.expiration.expiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}.`
              : "No expiration date set."}
          </div>
        </div>
      </RailCard>
      <RailCard title="On completion">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {completionFlags.map(f => (
            <div key={f.label} style={{ ...GF, fontSize: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#4B5E70" }}>{f.label}</span>
              <span style={{ fontWeight: 700, color: f.on ? AZURE : SILVER }}>{f.on ? "On" : "Off"}</span>
            </div>
          ))}
        </div>
      </RailCard>
    </>
  );

  const reminderSummary = settings.reminders.enabled
    ? `Reminders every ${settings.reminders.repeatIntervalDays}d`
    : "Reminders off";
  const expirySummary = settings.expiration.enabled && settings.expiration.expiresAt
    ? "Expiration set"
    : "No expiration";

  return (
    <div style={GF}>
      <StepBanner
        icon={SlidersHorizontal}
        eyebrow="Step 5 of 7"
        title="Settings"
        description="Configure how invitations are sent, when reminders fire, and what happens when the transaction completes or expires."
        meta={`${reminderSummary} · ${expirySummary}`}
      />
      <StepTwoColumn main={main} rail={rail} />
    </div>
  );
}
