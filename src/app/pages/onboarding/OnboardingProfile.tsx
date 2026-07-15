// C13 — Onboarding step 1: Profile.
// Collects displayName, jobTitle, timeZone.
// Pre-populated from pendingUser.displayName set during sign-in/create-account.

import { useState } from "react";
import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import { OnboardingLayout, OnboardingCard, OnboardingActions } from "../../layouts/OnboardingLayout";

const GF = { fontFamily: "'Geist', sans-serif" };

const PH_TIMEZONES = [
  "Asia/Manila",
] as const;

// Representative subset of IANA timezones for display
const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Asia/Manila",     label: "(UTC+8:00) Philippine Standard Time" },
  { value: "Asia/Singapore",  label: "(UTC+8:00) Singapore Standard Time" },
  { value: "Asia/Hong_Kong",  label: "(UTC+8:00) Hong Kong Time" },
  { value: "Asia/Tokyo",      label: "(UTC+9:00) Japan Standard Time" },
  { value: "Australia/Sydney",label: "(UTC+10:00) Australian Eastern Time" },
  { value: "Europe/London",   label: "(UTC+0:00) Greenwich Mean Time" },
  { value: "Europe/Paris",    label: "(UTC+1:00) Central European Time" },
  { value: "America/New_York",label: "(UTC-5:00) Eastern Time" },
  { value: "America/Chicago", label: "(UTC-6:00) Central Time" },
  { value: "America/Denver",  label: "(UTC-7:00) Mountain Time" },
  { value: "America/Los_Angeles", label: "(UTC-8:00) Pacific Time" },
  { value: "America/Sao_Paulo",   label: "(UTC-3:00) Brasília Time" },
  { value: "UTC",             label: "(UTC+0:00) Coordinated Universal Time" },
];

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, color: "white",
  fontFamily: "'Geist', sans-serif", fontSize: 15,
  padding: "12px 14px", outline: "none",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block", color: "#94A3B8",
  fontFamily: "'Geist', sans-serif", fontSize: 12, fontWeight: 600, marginBottom: 6,
};

export function OnboardingProfile() {
  const navigate = useNavigate();
  const { draft, updateProfile, markStepDone } = useOnboarding();
  const [errors, setErrors] = useState<{ displayName?: string }>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!draft.profile.displayName.trim()) e.displayName = "Your name is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;
    markStepDone("profile");
    navigate("/onboarding/use-case");
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="Tell us about yourself"
        description="This information will appear on documents you send and within your workspace."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Display name */}
          <div>
            <label htmlFor="ob-name" style={LABEL_STYLE}>
              Full name <span aria-hidden style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              id="ob-name"
              type="text"
              value={draft.profile.displayName}
              onChange={(e) => { updateProfile({ displayName: e.target.value }); if (errors.displayName) setErrors({}); }}
              autoComplete="name"
              aria-required
              aria-invalid={!!errors.displayName}
              aria-describedby={errors.displayName ? "ob-name-err" : undefined}
              placeholder="Ana Reyes"
              style={{ ...INPUT_STYLE, borderColor: errors.displayName ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)" }}
            />
            {errors.displayName && <p id="ob-name-err" role="alert" style={{ color: "#EF4444", ...GF, fontSize: 12, margin: "5px 0 0" }}>{errors.displayName}</p>}
          </div>

          {/* Job title */}
          <div>
            <label htmlFor="ob-title" style={LABEL_STYLE}>
              Job title <span style={{ color: "#334155", ...GF, fontSize: 11, fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="ob-title"
              type="text"
              value={draft.profile.jobTitle}
              onChange={(e) => updateProfile({ jobTitle: e.target.value })}
              autoComplete="organization-title"
              placeholder="Senior Associate"
              style={INPUT_STYLE}
            />
          </div>

          {/* Time zone */}
          <div>
            <label htmlFor="ob-tz" style={LABEL_STYLE}>
              Time zone
            </label>
            <select
              id="ob-tz"
              value={draft.profile.timeZone}
              onChange={(e) => updateProfile({ timeZone: e.target.value })}
              style={{ ...INPUT_STYLE, appearance: "none", cursor: "pointer" }}
            >
              {TIMEZONE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value} style={{ background: "#07111F" }}>{label}</option>
              ))}
            </select>
            <p style={{ color: "#334155", ...GF, fontSize: 11, margin: "5px 0 0" }}>
              Used to calculate document expiry times and notification schedules.
            </p>
          </div>
        </div>

        <OnboardingActions
          showBack={false}
          onContinue={handleContinue}
          continueLabel="Continue"
        />
      </OnboardingCard>
    </OnboardingLayout>
  );
}
