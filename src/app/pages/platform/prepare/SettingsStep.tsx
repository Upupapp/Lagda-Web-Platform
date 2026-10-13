// Settings — expiration, and whether participants are emailed the completed
// document. The demo build also shows reminders.
//
// Every control here reaches the server. Five that did not were removed: an
// invitation subject, a personal note, a per-document sender name, "notify me
// when complete" and "create a verification record". The invitation is LAGDA's
// own wording under the sender's profile name, and the sender's completion
// email and the verification record are always produced.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.

import React, { useEffect, useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";
import { usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { todayInManila } from "../../../services/prepare/deadline";
import { stepEyebrow,
  DEFAULT_PREP_SETTINGS, emailsFinalCopy,
} from "../../../models/prepare";
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
  // Wraps, and the label may shrink. A `minWidth: 180` label plus a 70px
  // input and two gaps was ~270px that could not compress — inside a 288px
  // step area at 320px, that overflowed and pushed the unit past the edge.
  // 180px becomes a flex BASIS rather than a floor, so wide screens still
  // line the labels up.
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
      <label htmlFor={id} style={{ ...GF, fontSize: 13, color: disabled ? SILVER : NAVY, fontWeight: 500, flex: "1 1 180px", minWidth: 0 }}>
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
  const { user } = usePlatform();
  const { draft, updateSettings, setStep, validate } = usePrepare();

  useEffect(() => { setStep("settings"); }, [setStep]);

  const settings   = draft?.settings ?? DEFAULT_PREP_SETTINGS;
  const validation = draft ? validate() : null;
  const errors     = validation?.errors.filter(e => e.stepId === "settings") ?? [];
  const warnings   = validation?.warnings.filter(e => e.stepId === "settings") ?? [];

  const updateReminders = useCallback((patch: Partial<typeof settings.reminders>) => {
    updateSettings({ ...settings, reminders: { ...settings.reminders, ...patch } });
  }, [settings, updateSettings]);

  const updateExpiration = useCallback((patch: Partial<typeof settings.expiration>) => {
    updateSettings({ ...settings, expiration: { ...settings.expiration, ...patch } });
  }, [settings, updateSettings]);

  const updateCompletion = useCallback((patch: Partial<typeof settings.completion>) => {
    updateSettings({ ...settings, completion: { ...settings.completion, ...patch } });
  }, [settings, updateSettings]);

  const sendsCopy = emailsFinalCopy(settings);

  // The earliest deadline is today: it runs to the end of the day in Manila.
  const today = todayInManila();

  const main = (
    <div style={{ ...GF, width: "100%" }}>
      {/* Validation */}
      <StepIssueList issues={errors} severity="error" />
      <StepIssueList issues={warnings} severity="warning" />

      {/* Invitation. Nothing to configure: this says whose name is on it. */}
      <div style={{ marginBottom: 32, padding: "20px", borderRadius: 12, border: "1px solid #E3E8EF" }}>
        <SectionHeader
          title="Invitation"
          subtitle={USE_REAL_BACKEND
            ? "Each participant is emailed a private signing link when their turn comes."
            : "Each participant is emailed a private signing link when their turn comes. No invitations are sent in this demonstration."}
        />
        <p data-testid="sender-display-note" style={{ ...GF, fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.55 }}>
          {user?.preferredSenderName
            ? <>Recipients see <strong style={{ color: NAVY }}>{user.preferredSenderName}</strong> as the sender — your profile&apos;s Sender Display name. </>
            : <>Recipients see your profile&apos;s Sender Display name as the sender. </>}
          Change it in Settings › Profile.
        </p>
      </div>

      {/* Reminders — the demo build only. The server sends no reminders, so
          the live app does not offer settings that would do nothing. */}
      {!USE_REAL_BACKEND && (
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
      )}

      {/* Expiration */}
      <div style={{ marginBottom: 32, padding: "20px", borderRadius: 12, border: "1px solid #E3E8EF" }}>
        <SectionHeader
          title="Expiration"
          subtitle="Optional. Close signing on a date you choose. Without one, the document waits until it is signed."
        />
        <div style={{ marginBottom: 14 }}>
          <Toggle
            id="expiration-enabled"
            label="Set an expiration date"
            description="Signing closes at the end of this day, Philippine time. Anyone who has not acted by then can no longer sign."
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
          {/* The server's `shareFinalCopy`. Off withholds the email and its
              download link, nothing else: a participant can still open the
              completed document from their own account. */}
          <Toggle
            id="email-final-copy"
            label="Email participants the completed document"
            description="When everyone has finished, each participant is emailed a link to download the completed document. The link works for 30 days. Viewers are not sent one. Switch this off for a sensitive document: participants can still open it in LAGDA under Records."
            checked={sendsCopy}
            onChange={v => updateCompletion({ emailFinalCopy: v })}
          />
        </div>
      </div>

      {/* Demo notice — the demo build only. The live app does send. */}
      {!USE_REAL_BACKEND && (
        <div style={{ ...GF, padding: "12px 14px", borderRadius: 8, background: "#F5F7FA", border: "1px solid #E3E8EF", fontSize: 12, color: SILVER, lineHeight: 1.6 }}>
          <strong style={{ color: "#4B5E70" }}>Frontend demonstration</strong>
          <br />
          No invitations, reminders, or completion notifications are sent from this demonstration.
        </div>
      )}
    </div>
  );

  const completionFlags: { id: string; label: string; on: boolean }[] = [
    { id: "final-copy", label: "Completed document emailed to participants", on: sendsCopy },
  ];

  const rail = (
    <>
      <RailCard title={USE_REAL_BACKEND ? "Expiration" : "Reminders & expiry"}>
        <div style={{ ...GF, fontSize: 12, color: "#4B5E70", display: "flex", flexDirection: "column", gap: 8 }}>
          {!USE_REAL_BACKEND && <div>
            {settings.reminders.enabled
              ? `First reminder after ${settings.reminders.firstReminderDays} day${settings.reminders.firstReminderDays !== 1 ? "s" : ""}, then every ${settings.reminders.repeatIntervalDays} day${settings.reminders.repeatIntervalDays !== 1 ? "s" : ""}.`
              : "Reminders are disabled."}
          </div>}
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
            <div key={f.id} data-testid={`rail-${f.id}`} style={{ ...GF, fontSize: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
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
  const copySummary = sendsCopy ? "Completed copy emailed" : "Completed copy not emailed";

  return (
    <div style={GF}>
      <StepBanner
        icon={SlidersHorizontal}
        eyebrow={stepEyebrow("settings")}
        title="Settings"
        description={USE_REAL_BACKEND
          ? "Set an optional expiration date, and choose whether participants are emailed the completed document."
          : "Configure when reminders fire, an optional expiration date, and whether participants are emailed the completed document."}
        // The live build has no reminders to summarise.
        meta={USE_REAL_BACKEND ? `${expirySummary} · ${copySummary}` : `${reminderSummary} · ${expirySummary}`}
      />
      <StepTwoColumn main={main} rail={rail} />
    </div>
  );
}
