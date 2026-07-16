// /app/settings/notifications — Personal notification preferences.
// Frontend-only. No real notifications are sent or scheduled.
// Transactional and promotional preferences are clearly separated.

import React, { useEffect, useState } from "react";
import { SettingsPage, SSection, SField, BTN_PRIMARY, BTN_SECONDARY, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockNotificationSettingsService } from "../../../services/mock/settings.service";
import type { NotificationPreferences, NotificationCategoryPreference, NotificationChannel, NotificationFrequency } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";

const FREQ_OPTIONS: { value: NotificationFrequency; label: string }[] = [
  { value: "immediately",  label: "Immediately" },
  { value: "daily-digest", label: "Daily Digest" },
  { value: "weekly-digest",label: "Weekly Digest" },
  { value: "off",          label: "Off" },
];

function Toggle({ on, onToggle, disabled, label }: { on: boolean; onToggle: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={onToggle} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", width: 40, height: 22, borderRadius: 999,
        background: on ? AZURE : "#CBD5E1", cursor: disabled ? "not-allowed" : "pointer",
        padding: 2, border: "none", transition: "background 0.2s", opacity: disabled ? 0.5 : 1, flexShrink: 0 }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#FFFFFF", transform: on ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s" }} />
    </button>
  );
}

function CategoryRow({ cat, onChange }: {
  cat: NotificationCategoryPreference;
  onChange: (updated: Partial<NotificationCategoryPreference>) => void;
}) {
  const toggleChannel = (ch: NotificationChannel) => {
    if (cat.required && ch === "email") return; // required notices keep email
    onChange({ channels: { ...cat.channels, [ch]: !cat.channels[ch] } });
  };

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid #F0F2F5" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{cat.label}</span>
            {cat.required && <span style={{ ...GF, fontSize: 11, color: AZURE, background: "#EBF5FB", padding: "1px 6px", borderRadius: 999 }}>Required</span>}
            {cat.isMarketing && <span style={{ ...GF, fontSize: 11, color: SLATE, background: "#F1F5F9", padding: "1px 6px", borderRadius: 999 }}>Marketing</span>}
          </div>
          <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3 }}>{cat.description}</div>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          {(["in-app", "email", "sms"] as NotificationChannel[]).map(ch => (
            <div key={ch} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ ...GF, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {ch === "in-app" ? "In-App" : ch === "email" ? "Email" : "SMS"}
              </span>
              <Toggle
                on={cat.channels[ch]}
                onToggle={() => toggleChannel(ch)}
                disabled={ch === "sms" || (cat.required && ch === "email" && cat.channels.email)}
                label={`${ch} for ${cat.label}`}
              />
              {ch === "sms" && <span style={{ ...GF, fontSize: 9, color: SLATE }}>Planned</span>}
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
            <span style={{ ...GF, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em" }}>Frequency</span>
            <select
              value={cat.frequency}
              onChange={e => onChange({ frequency: e.target.value as NotificationFrequency })}
              disabled={cat.required}
              aria-label={`Frequency for ${cat.label}`}
              style={{ ...GF, fontSize: 12, padding: "5px 8px", border: "1.5px solid #D1D9E0", borderRadius: 6, background: "#FFFFFF", cursor: cat.required ? "not-allowed" : "pointer" }}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const [prefs, setPrefs]   = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    mockNotificationSettingsService.getPersonalNotificationPreferences().then(p => { setPrefs(p); setLoading(false); });
  }, []);

  const updateCategory = (categoryId: string, changes: Partial<NotificationCategoryPreference>) => {
    if (!prefs) return;
    setPrefs(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map(c => c.categoryId === categoryId ? { ...c, ...changes } : c),
      };
    });
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefs) return;
    setSaving(true);
    await mockNotificationSettingsService.updatePersonalNotificationPreferences({ categories: prefs.categories, quietHours: prefs.quietHours });
    setSaving(false);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <SettingsPage title="Notification Preferences" breadcrumb="Notifications"><Skeleton h={200} mb={16} /><Skeleton h={160} /></SettingsPage>;

  const transactional = prefs?.categories.filter(c => !c.isMarketing) ?? [];
  const marketing     = prefs?.categories.filter(c => c.isMarketing) ?? [];

  return (
    <SettingsPage title="Notification Preferences" breadcrumb="Notifications">
      {DEMO_NOTICE}
      <form onSubmit={handleSave} noValidate>
        <SSection title="Transactional Notifications">
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 12px" }}>
            Notifications related to document requests, account security, and billing. Required notices cannot be fully disabled.
          </p>
          {transactional.map(c => (
            <CategoryRow key={c.categoryId} cat={c} onChange={changes => updateCategory(c.categoryId, changes)} />
          ))}
        </SSection>

        <SSection title="Marketing & Product Communications">
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 12px" }}>
            Optional product updates and promotional content. You may opt out at any time.
          </p>
          {marketing.map(c => (
            <CategoryRow key={c.categoryId} cat={c} onChange={changes => updateCategory(c.categoryId, changes)} />
          ))}
        </SSection>

        {/* Quiet hours */}
        {prefs && (
          <SSection title="Quiet Hours">
            <SField label="Enable quiet hours" help="Suppress non-urgent notifications during specified hours.">
              <Toggle on={prefs.quietHours.enabled}
                onToggle={() => { setPrefs(prev => prev ? { ...prev, quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled } } : prev); setDirty(true); setSaved(false); }}
                label="Enable quiet hours" />
              <span style={{ ...GF, fontSize: 12, color: SLATE, marginLeft: 10 }}>{prefs.quietHours.enabled ? "Enabled" : "Disabled"}</span>
            </SField>

            {prefs.quietHours.enabled && (
              <>
                <SField label="Start time">
                  <input type="time" value={prefs.quietHours.startTime}
                    onChange={e => { setPrefs(prev => prev ? { ...prev, quietHours: { ...prev.quietHours, startTime: e.target.value } } : prev); setDirty(true); }}
                    style={{ ...GF, fontSize: 13, padding: "8px 10px", border: "1.5px solid #D1D9E0", borderRadius: 8, cursor: "pointer" }} />
                </SField>
                <SField label="End time">
                  <input type="time" value={prefs.quietHours.endTime}
                    onChange={e => { setPrefs(prev => prev ? { ...prev, quietHours: { ...prev.quietHours, endTime: e.target.value } } : prev); setDirty(true); }}
                    style={{ ...GF, fontSize: 13, padding: "8px 10px", border: "1.5px solid #D1D9E0", borderRadius: 8, cursor: "pointer" }} />
                </SField>
                <SField label="Allow urgent notices" help="Security and critical account notices override quiet hours.">
                  <Toggle on={prefs.quietHours.allowUrgent}
                    onToggle={() => { setPrefs(prev => prev ? { ...prev, quietHours: { ...prev.quietHours, allowUrgent: !prev.quietHours.allowUrgent } } : prev); setDirty(true); }}
                    label="Allow urgent notices during quiet hours" />
                </SField>
              </>
            )}

            <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "8px 0 0", fontStyle: "italic" }}>
              Quiet hours are a frontend preference. No real notification delivery is suppressed by this demonstration.
            </p>
          </SSection>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={!dirty || saving} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "none", borderRadius: 8, background: dirty ? AZURE : "#E2E8F0", color: dirty ? "#FFFFFF" : SLATE, cursor: dirty ? "pointer" : "not-allowed" }}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {dirty && !saving && <button type="button" onClick={() => { setDirty(false); location.reload(); }} style={BTN_SECONDARY}>Discard</button>}
          {saved && <span role="status" style={{ ...GF, fontSize: 13, color: "#16A34A" }}>Preferences retained for this session. No notifications were sent.</span>}
        </div>
      </form>
    </SettingsPage>
  );
}
