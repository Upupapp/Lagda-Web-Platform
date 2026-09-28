// /app/settings/preferences — time zone, formats, appearance and default view.
//
// With a backend: read from GET /me (its `preferences` block) and saved with
// PATCH /me/preferences, sending only what changed; the page then shows what
// the backend stored. Demo build: kept in memory for the visit.
//
// Only preferences the backend stores are offered. Language and theme are
// saved, and the help text says plainly that the interface is English and
// light for now.

import React, { useEffect, useMemo, useState } from "react";
import { Globe2, CalendarClock, Palette, LayoutList, Save, Undo2 } from "lucide-react";
import { SettingsActions } from "./SettingsActions";
import { SettingsPage, SSection, SField, BTN_PRIMARY, BTN_SECONDARY, Skeleton, SET, INPUT_STYLE } from "./SettingsShell";
import { preferencesData, IS_LIVE, type PreferenceValues } from "./settings-data";
import type { PreferencesUpdate } from "../../../services/real/account-settings.service";
import { ApiError } from "../../../services/api-client";

const GF = { fontFamily: SET.FONT };
const SELECT_STYLE: React.CSSProperties = { ...INPUT_STYLE, cursor: "pointer" };

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino" },
];

const TIMEZONES = [
  { value: "Asia/Manila", label: "(UTC+8) Manila, Philippines" },
  { value: "Asia/Singapore", label: "(UTC+8) Singapore" },
  { value: "Asia/Hong_Kong", label: "(UTC+8) Hong Kong" },
  { value: "Asia/Tokyo", label: "(UTC+9) Tokyo, Japan" },
  { value: "Asia/Dubai", label: "(UTC+4) Dubai, UAE" },
  { value: "Europe/London", label: "(UTC+0) London, UK" },
  { value: "America/New_York", label: "(UTC-5) New York, USA" },
  { value: "America/Los_Angeles", label: "(UTC-8) Los Angeles, USA" },
  { value: "UTC", label: "(UTC+0) Coordinated Universal Time" },
];

const DATE_FORMATS: { value: PreferenceValues["dateFormat"]; label: string }[] = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY — 09/27/2026" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY — 27/09/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD — 2026-09-27" },
];

const TIME_FORMATS: { value: PreferenceValues["timeFormat"]; label: string }[] = [
  { value: "12h", label: "12-hour — 3:45 PM" },
  { value: "24h", label: "24-hour — 15:45" },
];

const NUMBER_FORMATS: { value: PreferenceValues["numberFormat"]; label: string }[] = [
  { value: "comma-dot", label: "1,234.56" },
  { value: "dot-comma", label: "1.234,56" },
  { value: "space-dot", label: "1 234.56" },
];

function RadioRow<T extends string>({ name, value, options, onChange, labelledBy }: {
  name: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; labelledBy?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map(o => {
        const checked = value === o.value;
        return (
          <label key={o.value} style={{
            display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", ...GF, fontSize: 13.5,
            color: checked ? SET.AZURE_TEXT : SET.INK, fontWeight: checked ? 600 : 500,
            border: `1.5px solid ${checked ? SET.AZURE : "#CBD5E1"}`, background: checked ? "#EFF6FD" : "#FFFFFF",
            borderRadius: 8, padding: "8px 12px", minHeight: 40, boxSizing: "border-box",
          }}>
            <input type="radio" name={name} value={o.value} checked={checked} onChange={() => { onChange(o.value); }} style={{ accentColor: SET.AZURE, margin: 0 }} />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export function PreferencesPage() {
  const [saved, setSaved] = useState<PreferenceValues | null>(null);
  const [form, setForm] = useState<PreferenceValues | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    preferencesData.get()
      .then(p => { if (!cancelled) { setSaved(p); setForm(p); } })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  const changes = useMemo<PreferencesUpdate>(() => {
    if (!saved || !form) return {};
    const out: Record<string, string> = {};
    for (const key of Object.keys(form) as (keyof PreferenceValues)[]) {
      if (form[key] !== saved[key]) out[key] = form[key];
    }
    return out;
  }, [saved, form]);
  const dirty = Object.keys(changes).length > 0;

  const update = <K extends keyof PreferenceValues>(key: K, value: PreferenceValues[K]) => {
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setMessage(null);
    try {
      const stored = await preferencesData.save(changes);
      setSaved(stored);
      setForm(stored);
      setMessage({ tone: "ok", text: IS_LIVE ? "Preferences saved." : "Applied for this visit only — not saved to an account." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.message.trim() !== "" ? err.message : "Your preferences could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const heading = { title: "Preferences", breadcrumb: "Preferences", description: "How dates, times and numbers are shown to you, and your default views." };

  if (loadError) return (
    <SettingsPage {...heading}>
      <SSection title="Preferences could not be loaded">
        <button type="button" onClick={() => { location.reload(); }} style={BTN_SECONDARY}>Reload</button>
      </SSection>
    </SettingsPage>
  );
  if (!form) return <SettingsPage {...heading}><Skeleton h={220} mb={16} /><Skeleton h={160} /></SettingsPage>;

  return (
    <SettingsPage {...heading}>
      <form onSubmit={e => { void handleSave(e); }} noValidate>
        <SSection title="Language and region" icon={Globe2}>
          <SField label="Language" htmlFor="pref-language" help="LAGDA is in English for now. Your choice is saved for when other languages are added.">
            <select id="pref-language" value={form.language} onChange={e => { update("language", e.target.value); }} style={SELECT_STYLE}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </SField>
          <SField label="Time zone" htmlFor="pref-timezone" help="Used when showing dates and times to you.">
            <select id="pref-timezone" value={form.timezone} onChange={e => { update("timezone", e.target.value); }} style={SELECT_STYLE}>
              {!TIMEZONES.some(z => z.value === form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
              {TIMEZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </SField>
        </SSection>

        <SSection title="Dates, times and numbers" icon={CalendarClock}>
          <SField label="Date format" htmlFor="pref-date">
            <select id="pref-date" value={form.dateFormat} onChange={e => { update("dateFormat", e.target.value as PreferenceValues["dateFormat"]); }} style={SELECT_STYLE}>
              {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </SField>
          <SField label="Time format" htmlFor="pref-time">
            <select id="pref-time" value={form.timeFormat} onChange={e => { update("timeFormat", e.target.value as PreferenceValues["timeFormat"]); }} style={SELECT_STYLE}>
              {TIME_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </SField>
          <SField label="Number format" htmlFor="pref-number">
            <select id="pref-number" value={form.numberFormat} onChange={e => { update("numberFormat", e.target.value as PreferenceValues["numberFormat"]); }} style={SELECT_STYLE}>
              {NUMBER_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </SField>
        </SSection>

        <SSection title="Appearance" icon={Palette}>
          <SField label="Theme" help="LAGDA uses the light theme for now. Your choice is saved for when other themes are added.">
            <RadioRow name="appearance" value={form.appearance} onChange={v => { update("appearance", v); }}
              options={[{ value: "system", label: "Follow system" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
          </SField>
          <SField label="Density">
            <RadioRow name="density" value={form.density} onChange={v => { update("density", v); }}
              options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} />
          </SField>
        </SSection>

        <SSection title="Default view" icon={LayoutList}>
          <SField label="Documents list" help="How the Documents list opens.">
            <RadioRow name="documentListView" value={form.documentListView} onChange={v => { update("documentListView", v); }}
              options={[{ value: "table", label: "Table" }, { value: "grid", label: "Grid" }]} />
          </SField>
        </SSection>

        <SettingsActions status={<>
          {message && (
            <span role={message.tone === "ok" ? "status" : "alert"} style={{ ...GF, fontSize: 13, color: message.tone === "ok" ? SET.SUCCESS : SET.DANGER }}>
              {message.text}
            </span>
          )}
          {dirty && !saving && !message && <span style={{ ...GF, fontSize: 12.5, color: SET.SLATE }}>Unsaved changes.</span>}
        </>}>
          {dirty && !saving && (
            <button type="button" onClick={() => { setForm(saved); setMessage(null); }} style={BTN_SECONDARY}><Undo2 size={15} aria-hidden /> Discard</button>
          )}
          <button type="submit" disabled={!dirty || saving} style={{ ...BTN_PRIMARY, opacity: !dirty || saving ? 0.6 : 1, cursor: !dirty || saving ? "not-allowed" : "pointer" }}>
            <Save size={15} aria-hidden /> {saving ? "Saving…" : "Save preferences"}
          </button>
        </SettingsActions>
      </form>
    </SettingsPage>
  );
}
