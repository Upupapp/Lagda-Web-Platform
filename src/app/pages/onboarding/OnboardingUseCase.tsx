// C13 — Onboarding step 2: Intended use.
// Collects orgType and primaryGoals.
// eNotary updates opt-in is present but never pre-selected, shown with strict legal copy.

import { useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext";
import { OnboardingLayout, OnboardingCard, OnboardingActions } from "../../layouts/OnboardingLayout";
import { ORG_TYPE_LABELS, PRIMARY_GOAL_LABELS, type OrgType, type PrimaryGoal } from "../../models/auth";

const GF = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const NAVY = "#07111F";

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
        display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
        background: selected ? "#EAF6FF" : "#FFFFFF",
        border: `1px solid ${selected ? "#76BDF2" : "#E2E8F0"}`,
        borderRadius: 8, padding: "10px 14px",
        // The selected background is a light tint, not a solid fill — text
        // must stay dark here. (A previous pass left this at "white" from
        // when the card had a dark selected background; it read as
        // invisible white-on-light-blue once the theme went light.)
        color: selected ? NAVY : "#475569",
        fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: selected ? 700 : 400,
        cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {selected && <CheckCircle2 size={14} color={AZURE} style={{ flexShrink: 0 }} />}
      <span>{children}</span>
    </button>
  );
}

export function OnboardingUseCase() {
  const navigate = useNavigate();
  const { draft, updateUseCase, markStepDone } = useOnboarding();
  const [showReminder, setShowReminder] = useState(false);

  const hasAnySelection = draft.useCase.orgType !== "" || draft.useCase.primaryGoals.length > 0;

  function toggleGoal(goal: PrimaryGoal) {
    const current = draft.useCase.primaryGoals;
    if (current.includes(goal)) {
      updateUseCase({ primaryGoals: current.filter((g) => g !== goal) });
    } else {
      updateUseCase({ primaryGoals: [...current, goal] });
    }
    setShowReminder(false);
  }

  function handleBack()     { navigate("/onboarding/profile"); }
  function handleContinue() {
    if (!hasAnySelection) {
      setShowReminder(true);
      return;
    }
    markStepDone("use-case");
    navigate("/onboarding/workspace");
  }

  const orgTypeEntries = Object.entries(ORG_TYPE_LABELS) as [Exclude<OrgType, "">, string][];
  const goalEntries    = Object.entries(PRIMARY_GOAL_LABELS) as [PrimaryGoal, string][];

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="How will you use LAGDA?"
        description="This helps us tailor your experience — pick whichever fits, you can change it later."
      >
        {showReminder && (
          <div
            role="status"
            style={{
              ...GF, display: "flex", alignItems: "center", gap: 10,
              marginBottom: 20, padding: "12px 16px", borderRadius: 10,
              background: "#FEF9EC", border: "1px solid #F0D07A", color: "#8A6A16", fontSize: 13,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 15 }}>💡</span>
            Pick at least one option below — either what best describes you, or a goal — so we can tailor things for you.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Organisation type */}
          <div>
            <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 10px" }}>
              What best describes you?
            </p>
            <div className="onboarding-org-type-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {orgTypeEntries.map(([value, label]) => (
                <OptionCard
                  key={value}
                  selected={draft.useCase.orgType === value}
                  onClick={() => { updateUseCase({ orgType: draft.useCase.orgType === value ? "" : value }); setShowReminder(false); }}
                >
                  {label}
                </OptionCard>
              ))}
            </div>
          </div>

          {/* Primary goals */}
          <div>
            <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 10px" }}>
              What are your main goals? <span style={{ color: "#334155", fontWeight: 400 }}>(select all that apply)</span>
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

      <style>{`
        /* Two columns fits comfortably above phone width; below that the
           labels wrap and crowd against each other, so mobile stacks them. */
        @media (max-width: 480px) {
          .onboarding-org-type-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </OnboardingLayout>
  );
}
