// /app/settings/preferences — Personal language, locale, timezone, appearance preferences.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { SettingsPage, SSection, SField, BTN_PRIMARY, BTN_SECONDARY, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockAccountSettingsService } from "../../../services/mock/settings.service";
import type { UserPreferences, AppearanceMode, DateFormatPref, TimeFormatPref } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";

const SELECT_STYLE: React.CSSProperties = {
  ...GF, fontSize: 13, padding: "9px 12px",
  border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF",
  width: "100%", cursor: "pointer",
};

const LANGUAGES = [
  { value: "en",    label: "English" },
  { value: "fil",   label: "Filipino" },
  { value: "es",    label: "Español" },
  { value: "zh",    label: "中文" },
];

const TIMEZONES = [
  { value: "Asia/Manila",           label: "(UTC+8) Manila, Philippines" },
  { value: "Asia/Singapore",        label: "(UTC+8) Singapore" },
  { value: "Asia/Tokyo",            label: "(UTC+9) Tokyo, Japan" },
  { value: "Asia/Shanghai",         label: "(UTC+8) Shanghai, China" },
  { value: "America/New_York",      label: "(UTC-5) New York, USA" },
  { value: "America/Los_Angeles",   label: "(UTC-8) Los Angeles, USA" },
  { value: "Europe/London",         label: "(UTC+0) London, UK" },
  { value: "Europe/Paris",          label: "(UTC+1) Paris, France" },
  { value: "UTC",                   label: "(UTC+0) Universal Time" },
];

const DATE_FORMATS: { value: DateFormatPref; label: string }[] = [
  { value: "DD/MM/YYYY",  label: "DD/MM/YYYY (e.g. 16/07/2026)" },
  { value: "MM/DD/YYYY",  label: "MM/DD/YYYY (e.g. 07/16/2026)" },
  { value: "YYYY-MM-DD",  label: "YYYY-MM-DD (e.g. 2026-07-16)" },
];

const TIME_FORMATS: { value: TimeFormatPref; label: string }[] = [
  { value: "12h", label: "12-hour (e.g. 3:45 PM)" },
  { value: "24h", label: "24-hour (e.g. 15:45)" },
];

const APPEARANCES: { value: AppearanceMode; label: string }[] = [
  { value: "system", label: "Follow system" },
  { value: "light",  label: "Light" },
  { value: "dark",   label: "Dark" },
];

function formatDateExample(fmt: DateFormatPref): string {
  const d = new Date(2026, 6, 16);
  if (fmt === "DD/MM/YYYY") return "16/07/2026";
  if (fmt === "MM/DD/YYYY") return "07/16/2026";
  return "2026-07-16";
}

export function PreferencesPage() {
  const [prefs, setPrefs]   = useState<UserPreferences | null>(null);
  const [form, setForm]     = useState<Partial<UserPreferences>>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    mockAccountSettingsService.getUserPreferences().then(p => {
      setPrefs(p);
      setForm({ ...p });
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updated = await mockAccountSettingsService.updateUserPreferences(form as UserPreferences);
    setPrefs(updated);
    setDirty(false);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDiscard = () => {
    if (prefs) { setForm({ ...prefs }); setDirty(false); }
  };

  if (loading) return <SettingsPage title="Preferences" breadcrumb="Preferences"><Skeleton h={200} mb={16} /><Skeleton h={160} /></SettingsPage>;

  return (
    <SettingsPage title="Preferences" breadcrumb="Preferences">
      {DEMO_NOTICE}
      <form onSubmit={handleSave} noValidate>
        <SSection title="Language & Region">
          <SField label="Language" help="Interface language.">
            <select value={form.language ?? "en"} onChange={e => update("language", e.target.value)} style={SELECT_STYLE} aria-label="Language">
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </SField>
          <SField label="Time zone" help="Used for date and time display across the platform.">
            <select value={form.timezone ?? "Asia/Manila"} onChange={e => update("timezone", e.target.value)} style={SELECT_STYLE} aria-label="Time zone">
              {TIMEZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </SField>
          <SField label="Date format" help={`Preview: ${formatDateExample((form.dateFormat ?? "DD/MM/YYYY"))}`}>
            <select value={form.dateFormat ?? "DD/MM/YYYY"} onChange={e => update("dateFormat", e.target.value as DateFormatPref)} style={SELECT_STYLE} aria-label="Date format">
              {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </SField>
          <SField label="Time format">
            <select value={form.timeFormat ?? "12h"} onChange={e => update("timeFormat", e.target.value as TimeFormatPref)} style={SELECT_STYLE} aria-label="Time format">
              {TIME_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </SField>
        </SSection>

        <SSection title="Appearance">
          <SField label="Theme" help="Applies to this frontend demonstration. Follows system preference by default.">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {APPEARANCES.map(a => (
                <label key={a.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", ...GF, fontSize: 13, color: NAVY }}>
                  <input type="radio" name="appearance" value={a.value} checked={form.appearance === a.value} onChange={() => update("appearance", a.value)} style={{ accentColor: AZURE }} />
                  {a.label}
                </label>
              ))}
            </div>
          </SField>

          <SField label="Interface density">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["comfortable", "compact"] as const).map(d => (
                <label key={d} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", ...GF, fontSize: 13, color: NAVY }}>
                  <input type="radio" name="density" value={d} checked={form.density === d} onChange={() => update("density", d)} style={{ accentColor: AZURE }} />
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </label>
              ))}
            </div>
          </SField>

          <SField label="Reduce motion" help="Controls transitions and animations. 'Follow system' respects prefers-reduced-motion.">
            <select value={form.reduceMotion ?? "system"} onChange={e => update("reduceMotion", e.target.value as UserPreferences["reduceMotion"])} style={{ ...SELECT_STYLE, width: "auto", minWidth: 180 }} aria-label="Reduce motion">
              <option value="system">Follow system</option>
              <option value="on">Always reduce</option>
              <option value="off">No reduction</option>
            </select>
          </SField>
        </SSection>

        <SSection title="Default Views">
          <SField label="Documents list view">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["table", "grid"] as const).map(v => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", ...GF, fontSize: 13, color: NAVY }}>
                  <input type="radio" name="defaultDocumentView" value={v} checked={form.defaultDocumentView === v} onChange={() => update("defaultDocumentView", v)} style={{ accentColor: AZURE }} />
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
          </SField>
          <SField label="Templates view">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["table", "grid"] as const).map(v => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", ...GF, fontSize: 13, color: NAVY }}>
                  <input type="radio" name="defaultTemplateView" value={v} checked={form.defaultTemplateView === v} onChange={() => update("defaultTemplateView", v)} style={{ accentColor: AZURE }} />
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
          </SField>
          <SField label="Contacts view">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["table", "grid"] as const).map(v => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", ...GF, fontSize: 13, color: NAVY }}>
                  <input type="radio" name="defaultContactView" value={v} checked={form.defaultContactView === v} onChange={() => update("defaultContactView", v)} style={{ accentColor: AZURE }} />
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
          </SField>
        </SSection>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={!dirty || saving} style={{ ...BTN_PRIMARY, opacity: (!dirty || saving) ? 0.6 : 1, cursor: (!dirty || saving) ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {dirty && !saving && <button type="button" onClick={handleDiscard} style={BTN_SECONDARY}>Discard</button>}
          {saved && <span role="status" style={{ ...GF, fontSize: 13, color: "#16A34A" }}>Preferences retained for this session.</span>}
        </div>
      </form>
    </SettingsPage>
  );
}
