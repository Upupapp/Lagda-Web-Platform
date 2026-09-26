// C13 — Onboarding step 3 of 4: Security.
//
// Shows the account email and whether it is verified, asks whether to set up
// two-step verification now or later, and asks the person to acknowledge that
// their account signs for them.
//
// "Set it up now" + Continue goes to the existing /mfa/setup flow, which
// returns here when it finishes (or is skipped). Whether MFA is on comes from
// the backend's /me security summary when there is a backend, and from the
// onboarding context's mfaSetupDone / draft either way — so returning from
// /mfa/setup shows "✓ Two-step verification is on" immediately.
//
// Nothing on this step is written to the backend by Continue itself: MFA
// enrollment is saved by /mfa/setup, and the acknowledgement is a gate only.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform } from "../../context/PlatformContext";
import {
  OnboardingLayout,
  OnboardingCard,
  OnboardingActions,
} from "../../layouts/OnboardingLayout";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { realAccountSettingsService } from "../../services/real/account-settings.service";
import { FieldError, FieldGroup, Notice, RadioCard } from "./onboarding-ui";
import { GF, NAVY, AZURE } from "./onboarding-form";

const SESSIONS_SETTINGS_PATH = "/app/settings/security/sessions";

interface AccountSecurity {
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export function OnboardingSecurity() {
  const navigate = useNavigate();
  const platform = usePlatform();
  const { draft, updateSecurity, markStepDone, mfaSetupDone, pendingUser } = useOnboarding();
  const [account, setAccount] = useState<AccountSecurity | null>(null);
  const [choice, setChoice] = useState(draft.security.mfaChoice);
  // The acknowledgement is a GATE ONLY. It is deliberately not stored — not in
  // the draft, not in localStorage, not sent to the backend — so it has to be
  // ticked each time this step is completed.
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState<{ choice?: string; ack?: string }>({});

  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    let cancelled = false;
    realAccountSettingsService.getAccount().then((me) => {
      if (cancelled) return;
      const mfaEnabled = me.security?.mfaEnabled === true;
      setAccount({ email: me.email, emailVerified: me.emailVerified, mfaEnabled });
      if (mfaEnabled) updateSecurity({ mfaEnabled: true });
    }).catch(() => { /* fall back to what the session already knows */ });
    return () => { cancelled = true; };
  }, [updateSecurity]);

  const email = account?.email ?? platform.user?.email ?? pendingUser?.email ?? "";
  // Reaching onboarding at all requires a verified address (sign-in refuses an
  // unverified one), so without a backend answer this is true.
  const emailVerified = account?.emailVerified ?? true;
  const mfaOn = draft.security.mfaEnabled || mfaSetupDone || account?.mfaEnabled === true;

  function handleContinue() {
    const found: typeof errors = {};
    if (!mfaOn && choice === "") found.choice = "Choose whether to set up two-step verification now or later.";
    if (!acknowledged) found.ack = "Please confirm this to continue.";
    setErrors(found);
    if (found.choice || found.ack) return;

    updateSecurity({ mfaChoice: mfaOn ? "now" : choice });
    if (!mfaOn && choice === "now") {
      // /mfa/setup returns to /onboarding/security when done or skipped.
      void navigate("/mfa/setup");
      return;
    }
    markStepDone("security");
    void navigate("/onboarding/review");
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        icon={ShieldCheck}
        title="Protect your account"
        description="Your signature can be legally binding — keep your account yours."
      >
        <FieldGroup>
          <div
            style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
              gap: "6px 12px", padding: "12px 14px", borderRadius: 10,
              background: "#F8FBFF", border: "1px solid #DBEAFE",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ ...GF, margin: 0, fontSize: 12, fontWeight: 600, color: "#64748B" }}>Account email</p>
              <p style={{ ...GF, margin: "2px 0 0", fontSize: 15, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>
                {email || "—"}
              </p>
            </div>
            {emailVerified
              ? <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#1E6B41" }}>✓ Verified</span>
              : <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#7A5A00" }}>Not verified</span>}
          </div>

          {mfaOn ? (
            <Notice tone="success">✓ Two-step verification is on</Notice>
          ) : (
            <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}
              aria-describedby={errors.choice ? "sec-mfa-err" : undefined}>
              <legend style={{ ...GF, color: NAVY, fontSize: 15, fontWeight: 700, marginBottom: 4, padding: 0 }}>
                Two-step verification <span aria-hidden style={{ color: AZURE }}>*</span>
              </legend>
              <p style={{ ...GF, margin: "0 0 10px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                A code from an authenticator app, asked for when you sign in.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <RadioCard
                  name="sec-mfa"
                  value="now"
                  checked={choice === "now"}
                  onChange={() => { setChoice("now"); setErrors((e) => ({ ...e, choice: undefined })); }}
                  title="Set it up now (recommended, about a minute)"
                />
                <RadioCard
                  name="sec-mfa"
                  value="later"
                  checked={choice === "later"}
                  onChange={() => { setChoice("later"); setErrors((e) => ({ ...e, choice: undefined })); }}
                  title="Remind me later in Settings"
                />
              </div>
              {errors.choice && <FieldError id="sec-mfa-err">{errors.choice}</FieldError>}
            </fieldset>
          )}

          <div>
            <label
              style={{
                display: "flex", gap: 12, alignItems: "flex-start", minHeight: 44,
                padding: "10px 14px", borderRadius: 10, cursor: "pointer", boxSizing: "border-box",
                border: `1px solid ${errors.ack ? "#F5C2C0" : "#E2E8F0"}`,
                background: errors.ack ? "#FEF2F2" : "#FFFFFF",
              }}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => { setAcknowledged(e.target.checked); setErrors((x) => ({ ...x, ack: undefined })); }}
                aria-required
                aria-invalid={!!errors.ack}
                aria-describedby={errors.ack ? "sec-ack-err" : undefined}
                style={{ width: 20, height: 20, margin: "1px 0 0", accentColor: AZURE, flexShrink: 0 }}
              />
              <span style={{ ...GF, fontSize: 14, lineHeight: 1.5, color: NAVY }}>
                I'll keep my password private and understand that anyone using my account can sign on my behalf.
              </span>
            </label>
            {errors.ack && <FieldError id="sec-ack-err">{errors.ack}</FieldError>}
          </div>

          <Link
            to={SESSIONS_SETTINGS_PATH}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...GF, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44,
              alignSelf: "flex-start", color: AZURE, fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            Review signed-in devices <ExternalLink size={14} aria-hidden />
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              (opens in a new tab)
            </span>
          </Link>
        </FieldGroup>

        <OnboardingActions
          onBack={() => { void navigate("/onboarding/workspace"); }}
          onContinue={handleContinue}
          continueLabel={!mfaOn && choice === "now" ? "Continue to set up" : "Continue"}
        />
      </OnboardingCard>
    </OnboardingLayout>
  );
}
