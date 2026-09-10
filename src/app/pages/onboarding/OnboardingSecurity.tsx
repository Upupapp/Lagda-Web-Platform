// C13 — Onboarding step 4: Security preferences.
// MFA opt-in links to /mfa/setup. Login alerts default on.
// Never claims real MFA is enrolled in this step.

import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import {
  OnboardingLayout,
  OnboardingCard,
  OnboardingActions,
} from "../../layouts/OnboardingLayout";

const GF = { fontFamily: "'Geist', sans-serif" };

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  recommended,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  recommended?: boolean;
}) {
  return (
    <label htmlFor={id} className="security-option-card">
      <div className="security-option-header">
        <span
          style={{ color: "#FFFFFF", ...GF, fontSize: 14, fontWeight: 700 }}
        >
          {label}
        </span>
        {recommended && (
          <span className="security-recommended">Recommended</span>
        )}
      </div>
      <div className="security-option-body">
        <p
          style={{
            color: "#475569",
            ...GF,
            fontSize: 12,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
        <div
          onClick={() => onChange(!checked)}
          role="switch"
          aria-checked={checked}
          id={id}
          tabIndex={0}
          onKeyDown={(e) =>
            (e.key === " " || e.key === "Enter") && onChange(!checked)
          }
          style={{
            width: 42,
            height: 24,
            borderRadius: 12,
            flexShrink: 0,
            background: checked ? "#0078D4" : "#CBD5E1",
            position: "relative",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          aria-label={label}
        >
          <div
            style={{
              position: "absolute",
              top: 3,
              left: checked ? 21 : 3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "white",
              transition: "left 0.2s",
            }}
          />
        </div>
      </div>
    </label>
  );
}

export function OnboardingSecurity() {
  const navigate = useNavigate();
  const { draft, updateSecurity, markStepDone, mfaSetupDone } = useOnboarding();

  function handleBack() {
    navigate("/onboarding/workspace");
  }
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
          <div className="security-option-card">
            <div className="security-option-header">
              <span
                style={{
                  color: "#FFFFFF",
                  ...GF,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Two-factor authentication
              </span>
              <span className="security-recommended">Recommended</span>
            </div>
            <div className="security-option-body">
              <div className="security-option-copy">
                <p
                  style={{
                    color: "#475569",
                    ...GF,
                    fontSize: 12,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Require a one-time code from an authenticator app each time
                  you sign in.
                </p>
              </div>

              {mfaSetupDone || draft.security.mfaEnabled ? (
                <span
                  style={{
                    background: "#EAF6FF",
                    border: "1px solid #BAE0FA",
                    borderRadius: 20,
                    color: "#0078D4",
                    ...GF,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    flexShrink: 0,
                  }}
                >
                  Enabled
                </span>
              ) : (
                <button
                  onClick={handleSetUpMfa}
                  style={{
                    flexShrink: 0,
                    background: "#EAF6FF",
                    border: "1px solid #8FC8F5",
                    borderRadius: 8,
                    color: "#006BBE",
                    ...GF,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "8px 14px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Set up
                </button>
              )}
            </div>
            {!mfaSetupDone && !draft.security.mfaEnabled && (
              <p
                className="security-option-note"
                style={{
                  color: "#64748B",
                  ...GF,
                  fontSize: 11,
                  margin: 0,
                }}
              >
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
      <style>{`
        .security-option-card { display: block; overflow: hidden; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; box-shadow: 0 2px 8px rgba(7,17,31,0.04); }
        .security-option-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; background: #07111F; }
        .security-option-body { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 76px; padding: 16px 18px; }
        .security-option-copy { min-width: 0; flex: 1; }
        .security-option-note { padding: 0 18px 16px; line-height: 1.45; }
        .security-recommended { background: #EAF6FF; border: 1px solid #BAE0FA; border-radius: 20px; color: #0078D4; font: 700 10px 'Geist', sans-serif; padding: 2px 8px; white-space: nowrap; }
        @media (max-width: 480px) {
          .security-option-header { flex-direction: column; align-items: flex-start; gap: 8px; }
          .security-option-body { flex-direction: column; align-items: stretch; gap: 14px; min-height: 0; padding: 16px; }
          .security-option-body [role="switch"], .security-option-body button { align-self: flex-end; }
          .security-option-note { padding: 0 16px 16px; }
        }
      `}</style>
    </OnboardingLayout>
  );
}
