// C13 — Onboarding step 2: Intended use.
// Collects orgType and primaryGoals.
// eNotary updates opt-in is present but never pre-selected, shown with strict legal copy.

import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import { OnboardingLayout, OnboardingCard, OnboardingActions } from "../../layouts/OnboardingLayout";
import { ORG_TYPE_LABELS, PRIMARY_GOAL_LABELS, type OrgType, type PrimaryGoal } from "../../models/auth";

const GF = { fontFamily: "'Geist', sans-serif" };

function OptionCard({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="option"
      aria-selected={selected}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: selected ? "rgba(0,120,212,0.12)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 8, padding: "10px 14px",
        color: selected ? "white" : "#64748B",
        fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: selected ? 600 : 400,
        cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function OnboardingUseCase() {
  const navigate = useNavigate();
  const { draft, updateUseCase, markStepDone } = useOnboarding();

  function toggleGoal(goal: PrimaryGoal) {
    const current = draft.useCase.primaryGoals;
    if (current.includes(goal)) {
      updateUseCase({ primaryGoals: current.filter((g) => g !== goal) });
    } else {
      updateUseCase({ primaryGoals: [...current, goal] });
    }
  }

  function handleBack()     { navigate("/onboarding/profile"); }
  function handleContinue() {
    markStepDone("use-case");
    navigate("/onboarding/workspace");
  }

  const orgTypeEntries = Object.entries(ORG_TYPE_LABELS) as [Exclude<OrgType, "">, string][];
  const goalEntries    = Object.entries(PRIMARY_GOAL_LABELS) as [PrimaryGoal, string][];

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="How will you use LAGDA?"
        description="This helps us tailor your experience. You can change this later."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Organisation type */}
          <div>
            <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 10px" }}>
              What best describes you? <span style={{ color: "#334155", fontWeight: 400 }}>(optional)</span>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {orgTypeEntries.map(([value, label]) => (
                <OptionCard
                  key={value}
                  selected={draft.useCase.orgType === value}
                  onClick={() => updateUseCase({ orgType: draft.useCase.orgType === value ? "" : value })}
                >
                  {label}
                </OptionCard>
              ))}
            </div>
          </div>

          {/* Primary goals */}
          <div>
            <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 10px" }}>
              What are your main goals? <span style={{ color: "#334155", fontWeight: 400 }}>(select all that apply, optional)</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {goalEntries.map(([value, label]) => (
                <OptionCard
                  key={value}
                  selected={draft.useCase.primaryGoals.includes(value)}
                  onClick={() => toggleGoal(value)}
                >
                  {label}
                </OptionCard>
              ))}
            </div>
          </div>

          {/* eNotary updates opt-in — never pre-selected, strict legal copy */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={draft.useCase.enotaryUpdates}
                onChange={(e) => updateUseCase({ enotaryUpdates: e.target.checked })}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: "#0078D4" }}
              />
              <div>
                <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>
                  Notify me about LAGDA eNotary
                </p>
                <p style={{ color: "#334155", ...GF, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                  LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. Checking this means you consent to receive updates about its future availability.
                </p>
              </div>
            </label>
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
