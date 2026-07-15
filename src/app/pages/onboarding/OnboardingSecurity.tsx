// C13 — Onboarding step 4: Security preferences.
// MFA opt-in links to /mfa/setup. Login alerts default on.
// Never claims real MFA is enrolled in this step.

import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import { OnboardingLayout, OnboardingCard, OnboardingActions } from "../../layouts/OnboardingLayout";

const GF = { fontFamily: "'Geist', sans-serif" };

function ToggleRow({
  id, label, description, checked, onChange,
  recommended,
}: {
  id: string; label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void;
  recommended?: boolean;
}) {
  return (
    <label htmlFor={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, cursor: "pointer", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600 }}>{label}</span>
          {recommended && <span style={{ background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 20, color: "#38BDF8", fontFamily: "'Geist', sans-serif", fontSize: 10, fontWeight: 700, padding: "1px 8px" }}>Recommended</span>}
        </div>
        <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{description}</p>
      </div>
      <div
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        id={id}
        tabIndex={0}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && onChange(!checked)}
        style={{
          width: 42, height: 24, borderRadius: 12, flexShrink: 0,
          background: checked ? "#0078D4" : "rgba(255,255,255,0.1)",
          position: "relative", cursor: "pointer",
          transition: "background 0.2s",
        }}
        aria-label={label}
      >
        <div style={{
          position: "absolute", top: 3, left: checked ? 21 : 3,
          width: 18, height: 18, borderRadius: "50%", background: "white",
          transition: "left 0.2s",
        }} />
      </div>
    </label>
  );
}

export function OnboardingSecurity() {
  const navigate = useNavigate();
  const { draft, updateSecurity, markStepDone, mfaSetupDone } = useOnboarding();

  function handleBack()     { navigate("/onboarding/workspace"); }
  function handleContinue() {
    markStepDone("security");
    navigate("/onboarding/notifications");
  }

  function handleSetUpMfa() {
    updateSecurity({ mfaEnabled: true });
    navigate("/mfa/setup");
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="Secure your account"
        description="Choose how you want to protect access to your LAGDA account."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Login alerts */}
          <ToggleRow
            id="sec-alerts"
            label="Sign-in alerts"
            description="Receive a notification whenever your account is accessed from a new device or location."
            checked={draft.security.loginAlertsEnabled}
            onChange={(v) => updateSecurity({ loginAlertsEnabled: v })}
            recommended
          />

          {/* MFA */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600 }}>Two-factor authentication</span>
                  <span style={{ background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 20, color: "#38BDF8", ...GF, fontSize: 10, fontWeight: 700, padding: "1px 8px" }}>Recommended</span>
                </div>
                <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  Require a one-time code from an authenticator app each time you sign in.
                </p>
              </div>

              {mfaSetupDone || draft.security.mfaEnabled ? (
                <span style={{ background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.3)", borderRadius: 20, color: "#38BDF8", ...GF, fontSize: 11, fontWeight: 700, padding: "3px 10px", flexShrink: 0 }}>
                  Enabled
                </span>
              ) : (
                <button
                  onClick={handleSetUpMfa}
                  style={{ flexShrink: 0, background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.3)", borderRadius: 8, color: "#38BDF8", ...GF, fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Set up
                </button>
              )}
            </div>
            {!mfaSetupDone && !draft.security.mfaEnabled && (
              <p style={{ color: "#334155", ...GF, fontSize: 11, margin: "10px 0 0" }}>
                You can set up 2FA now or from Account Settings later.
              </p>
            )}
          </div>
        </div>

        <OnboardingActions
          onBack={handleBack}
          onContinue={handleContinue}
          continueLabel="Continue"
        />
      </OnboardingCard>
    </OnboardingLayout>
  );
}
