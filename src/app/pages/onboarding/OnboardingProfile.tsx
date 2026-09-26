// C13 — Onboarding step 1 of 4: Profile.
//
// Required: full name, display name, time zone. Optional (behind "More
// details"): job title, department, sender name, date and time format.
//
// With a real backend, Continue SAVES before moving on:
//   PATCH /me/profile      { fullName, displayName, jobTitle, department, preferredSenderName }
//   PATCH /me/preferences  { timezone, dateFormat, timeFormat }
// and then re-reads the session so every screen shows the saved name. A
// failure keeps the person on this step with the server's message. In the
// demo build the answers live in the onboarding draft only.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, UserRound } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform, announceProfileChanged } from "../../context/PlatformContext";
import {
  OnboardingLayout,
  OnboardingCard,
  OnboardingActions,
} from "../../layouts/OnboardingLayout";
import type { DateFormatPreference, ProfileDraft, TimeFormatPreference } from "../../models/auth";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { ApiError } from "../../services/api-client";
import { realAccountSettingsService } from "../../services/real/account-settings.service";
import { Field, FieldGroup, Notice, RadioCard } from "./onboarding-ui";
import {
  describedBy, inputStyle, GF, AZURE, NAME_MAX, DATE_FORMATS, TIME_FORMATS, FIELD_IDS,
  listTimeZones, validateProfile, zoneLabel, orNull, type ProfileErrors, type ProfileField,
} from "./onboarding-form";

export function OnboardingProfile() {
  const navigate = useNavigate();
  const platform = usePlatform();
  const { draft, progress, updateProfile, markStepDone } = useOnboarding();
  const p = draft.profile;
  const zones = listTimeZones();
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Prefill from the account, once. Only EMPTY fields are filled, so neither
  // a slow response nor a revisit ever overwrites what the person typed.
  const draftRef = useRef(p);
  draftRef.current = p;
  const progressRef = useRef(progress.profile);
  const platformUserRef = useRef(platform.user);
  useEffect(() => {
    let cancelled = false;
    function fillEmpty(source: Partial<Record<keyof ProfileDraft, string>>) {
      const cur = draftRef.current;
      const patch: Partial<ProfileDraft> = {};
      (Object.keys(source) as (keyof ProfileDraft)[]).forEach((key) => {
        const value = source[key];
        if (!value) return;
        if (key === "timeZone") {
          // The default is the browser's zone, never blank — so an account's
          // own saved zone wins until this step has been saved once.
          if (!progressRef.current && zones.includes(value)) patch.timeZone = value;
          return;
        }
        if (cur[key] === "") (patch as Record<string, string>)[key] = value;
      });
      const fullName = patch.fullName ?? cur.fullName;
      const displayName = patch.displayName ?? cur.displayName;
      if (displayName && fullName && displayName !== fullName) patch.displayNameEdited = true;
      if (Object.keys(patch).length > 0) updateProfile(patch);
    }
    function fromPlatformUser() {
      const u = platformUserRef.current;
      if (!u) return;
      fillEmpty({
        fullName: u.fullName ?? u.displayName,
        displayName: u.displayName,
        jobTitle: u.jobTitle ?? "",
        department: u.department ?? "",
      });
    }
    if (!USE_REAL_BACKEND) {
      fromPlatformUser();
      return;
    }
    realAccountSettingsService.getAccount().then((me) => {
      if (cancelled) return;
      fillEmpty({
        fullName: me.profile.fullName ?? "",
        displayName: me.profile.displayName,
        jobTitle: me.profile.jobTitle ?? "",
        department: me.profile.department ?? "",
        preferredSenderName: me.profile.preferredSenderName ?? "",
        timeZone: me.preferences?.timezone ?? "",
        dateFormat: me.preferences?.dateFormat ?? "",
        timeFormat: me.preferences?.timeFormat ?? "",
      });
    }).catch(() => {
      if (!cancelled) fromPlatformUser();
    });
    return () => { cancelled = true; };
    // Once per visit — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearError(field: ProfileField) {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function setFullName(value: string) {
    updateProfile(p.displayNameEdited ? { fullName: value } : { fullName: value, displayName: value });
    clearError("fullName");
    if (!p.displayNameEdited) clearError("displayName");
  }

  async function handleContinue() {
    if (saving) return;
    const found = validateProfile(p, zones);
    setErrors(found);
    setServerError(null);
    const first = (Object.keys(FIELD_IDS) as ProfileField[]).find((k) => found[k]);
    if (first) {
      if (first === "jobTitle" || first === "department" || first === "preferredSenderName") setMoreOpen(true);
      setTimeout(() => document.getElementById(FIELD_IDS[first])?.focus(), 0);
      return;
    }

    const trimmed = {
      fullName: p.fullName.trim(),
      displayName: p.displayName.trim(),
      jobTitle: p.jobTitle.trim(),
      department: p.department.trim(),
      preferredSenderName: p.preferredSenderName.trim(),
    };

    if (USE_REAL_BACKEND) {
      setSaving(true);
      try {
        await realAccountSettingsService.updateUserProfile({
          fullName: trimmed.fullName,
          displayName: trimmed.displayName,
          jobTitle: orNull(trimmed.jobTitle),
          department: orNull(trimmed.department),
          preferredSenderName: orNull(trimmed.preferredSenderName),
        });
        await realAccountSettingsService.updatePreferences({
          timezone: p.timeZone,
          dateFormat: p.dateFormat === "" ? null : p.dateFormat,
          timeFormat: p.timeFormat === "" ? null : p.timeFormat,
        });
      } catch (err) {
        setSaving(false);
        if (err instanceof ApiError) {
          // Field-level details, when the backend names the field.
          const fieldErrors: ProfileErrors = {};
          for (const d of err.body?.details ?? []) {
            const key = d.field === "timezone" ? "timeZone" : d.field;
            if (key && key in FIELD_IDS) fieldErrors[key as ProfileField] = d.message;
          }
          if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
          setServerError(err.message);
        } else {
          setServerError("We couldn't save your profile. Please try again.");
        }
        return;
      }
      // Every screen that shows the name reads it from the session.
      await platform.refreshSessionFromBackend();
      announceProfileChanged();
      setSaving(false);
    }

    updateProfile(trimmed);
    markStepDone("profile");
    void navigate("/onboarding/workspace");
  }

  const optionalCount = [p.jobTitle, p.department, p.preferredSenderName, p.dateFormat, p.timeFormat]
    .filter((v) => v.trim() !== "").length;

  return (
    <OnboardingLayout>
      <OnboardingCard
        icon={UserRound}
        title="Tell us about you"
        description="This is how you'll appear on documents you send and sign."
      >
        <FieldGroup>
          {serverError && <Notice tone="error">{serverError}</Notice>}

          <Field id={FIELD_IDS.fullName} label="Full name" required error={errors.fullName}>
            <input
              id={FIELD_IDS.fullName}
              type="text"
              value={p.fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              maxLength={NAME_MAX}
              aria-required
              aria-invalid={!!errors.fullName}
              aria-describedby={describedBy(FIELD_IDS.fullName, errors.fullName)}
              placeholder="Ana Reyes"
              style={inputStyle(!!errors.fullName)}
            />
          </Field>

          <Field
            id={FIELD_IDS.displayName}
            label="Display name"
            required
            error={errors.displayName}
            hint="Shown in the app and to people you work with."
          >
            <input
              id={FIELD_IDS.displayName}
              type="text"
              value={p.displayName}
              onChange={(e) => {
                updateProfile({ displayName: e.target.value, displayNameEdited: true });
                clearError("displayName");
              }}
              autoComplete="nickname"
              maxLength={NAME_MAX}
              aria-required
              aria-invalid={!!errors.displayName}
              aria-describedby={describedBy(FIELD_IDS.displayName, errors.displayName, true)}
              placeholder="Ana"
              style={inputStyle(!!errors.displayName)}
            />
          </Field>

          <Field
            id={FIELD_IDS.timeZone}
            label="Time zone"
            required
            error={errors.timeZone}
            hint="Used for document deadlines, expiry times and timestamps."
          >
            <select
              id={FIELD_IDS.timeZone}
              value={p.timeZone}
              onChange={(e) => { updateProfile({ timeZone: e.target.value }); clearError("timeZone"); }}
              aria-required
              aria-invalid={!!errors.timeZone}
              aria-describedby={describedBy(FIELD_IDS.timeZone, errors.timeZone, true)}
              style={{ ...inputStyle(!!errors.timeZone), cursor: "pointer" }}
            >
              {!zones.includes(p.timeZone) && <option value="">Choose a time zone</option>}
              {zones.map((z) => (
                <option key={z} value={z}>{zoneLabel(z)}</option>
              ))}
            </select>
          </Field>

          {/* Optional details — collapsed so the required three are the
              whole first impression. */}
          <div style={{ borderTop: "1px solid #E3E8EF", paddingTop: 6 }}>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="ob-more-details"
              onClick={() => setMoreOpen((o) => !o)}
              style={{
                ...GF, width: "100%", minHeight: 44, padding: "8px 0",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                background: "none", border: "none", cursor: "pointer",
                color: AZURE, fontSize: 15, fontWeight: 700, textAlign: "left",
              }}
            >
              <span>
                More details (optional)
                {optionalCount > 0 && !moreOpen && (
                  <span style={{ color: "#64748B", fontWeight: 500 }}> · {optionalCount} filled in</span>
                )}
              </span>
              <ChevronDown
                size={18}
                aria-hidden
                style={{ transform: moreOpen ? "rotate(180deg)" : undefined, flexShrink: 0 }}
              />
            </button>

            {moreOpen && (
              <div id="ob-more-details" style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 10 }}>
                <Field id={FIELD_IDS.jobTitle} label="Job title" optional error={errors.jobTitle}>
                  <input
                    id={FIELD_IDS.jobTitle}
                    type="text"
                    value={p.jobTitle}
                    onChange={(e) => { updateProfile({ jobTitle: e.target.value }); clearError("jobTitle"); }}
                    autoComplete="organization-title"
                    maxLength={NAME_MAX}
                    placeholder="Senior Associate"
                    style={inputStyle(!!errors.jobTitle)}
                  />
                </Field>
                <Field id={FIELD_IDS.department} label="Department" optional error={errors.department}>
                  <input
                    id={FIELD_IDS.department}
                    type="text"
                    value={p.department}
                    onChange={(e) => { updateProfile({ department: e.target.value }); clearError("department"); }}
                    maxLength={NAME_MAX}
                    placeholder="Corporate Law"
                    style={inputStyle(!!errors.department)}
                  />
                </Field>
                <Field
                  id={FIELD_IDS.preferredSenderName}
                  label="Name on sent emails"
                  optional
                  error={errors.preferredSenderName}
                  hint="What recipients see as the sender. Leave blank to use your full name."
                >
                  <input
                    id={FIELD_IDS.preferredSenderName}
                    type="text"
                    value={p.preferredSenderName}
                    onChange={(e) => { updateProfile({ preferredSenderName: e.target.value }); clearError("preferredSenderName"); }}
                    maxLength={NAME_MAX}
                    aria-describedby={describedBy(FIELD_IDS.preferredSenderName, errors.preferredSenderName, true)}
                    placeholder={p.fullName.trim() || "Ana Reyes"}
                    style={inputStyle(!!errors.preferredSenderName)}
                  />
                </Field>

                <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
                  <legend style={{ ...GF, color: "#334155", fontSize: 13, fontWeight: 600, marginBottom: 6, padding: 0 }}>
                    Date format
                  </legend>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {DATE_FORMATS.map((f) => (
                      <div key={f.value} style={{ flex: "1 1 140px" }}>
                        <RadioCard
                          compact
                          name="ob-date-format"
                          value={f.value}
                          checked={p.dateFormat === f.value}
                          onChange={(v) => updateProfile({ dateFormat: v as DateFormatPreference })}
                          title={f.label}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
                  <legend style={{ ...GF, color: "#334155", fontSize: 13, fontWeight: 600, marginBottom: 6, padding: 0 }}>
                    Time format
                  </legend>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TIME_FORMATS.map((f) => (
                      <div key={f.value} style={{ flex: "1 1 140px" }}>
                        <RadioCard
                          compact
                          name="ob-time-format"
                          value={f.value}
                          checked={p.timeFormat === f.value}
                          onChange={(v) => updateProfile({ timeFormat: v as TimeFormatPreference })}
                          title={f.label}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </div>
        </FieldGroup>

        <OnboardingActions
          showBack={false}
          onContinue={() => { void handleContinue(); }}
          submitting={saving}
          continueLabel="Continue"
        />
      </OnboardingCard>
    </OnboardingLayout>
  );
}
