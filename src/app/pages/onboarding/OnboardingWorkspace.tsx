// C13 — Onboarding step 3: Workspace.
// Three scenarios: personal, organization, invitation (join existing).
// Never creates a real workspace. All success messaging is frontend-demo language.

import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import { OnboardingLayout, OnboardingCard, OnboardingActions } from "../../layouts/OnboardingLayout";
import type { WorkspaceScenario } from "../../models/auth";

const GF = { fontFamily: "'Geist', sans-serif" };

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, color: "white",
  fontFamily: "'Geist', sans-serif", fontSize: 15,
  padding: "12px 14px", outline: "none",
};

const SCENARIOS: { id: WorkspaceScenario; title: string; desc: string }[] = [
  { id: "personal",     title: "Personal workspace",    desc: "For individual use — manage your own documents." },
  { id: "organization", title: "Team workspace",        desc: "Collaborate with colleagues under a shared workspace." },
  { id: "invitation",   title: "Join via invitation",   desc: "You have an invitation link to join an existing workspace." },
];

const TEAM_SIZES = [
  { value: "",          label: "Select team size" },
  { value: "1",         label: "Just me" },
  { value: "2-10",      label: "2–10 people" },
  { value: "11-50",     label: "11–50 people" },
  { value: "51-200",    label: "51–200 people" },
  { value: "201+",      label: "201+ people" },
];

export function OnboardingWorkspace() {
  const navigate = useNavigate();
  const { draft, updateWorkspace, markStepDone } = useOnboarding();

  function handleBack()     { navigate("/onboarding/use-case"); }
  function handleContinue() {
    markStepDone("workspace");
    navigate("/onboarding/security");
  }

  const scenario = draft.workspace.scenario;

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="Set up your workspace"
        description="Choose how you will use LAGDA. You can create additional workspaces later."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Scenario selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SCENARIOS.map(({ id, title, desc }) => {
              const selected = scenario === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateWorkspace({ scenario: selected ? "" : id })}
                  role="radio"
                  aria-checked={selected}
                  style={{
                    display: "flex", gap: 14, alignItems: "flex-start", textAlign: "left",
                    background: selected ? "rgba(0,120,212,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selected ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10, padding: "14px 16px",
                    cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    border: `2px solid ${selected ? "#0078D4" : "rgba(255,255,255,0.2)"}`,
                    background: selected ? "#0078D4" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                  </div>
                  <div>
                    <p style={{ color: selected ? "white" : "#94A3B8", ...GF, fontSize: 14, fontWeight: 600, margin: "0 0 3px" }}>{title}</p>
                    <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Personal: optional name */}
          {scenario === "personal" && (
            <div>
              <label htmlFor="ws-name-p" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Workspace name <span style={{ color: "#334155", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="ws-name-p"
                type="text"
                value={draft.workspace.workspaceName}
                onChange={(e) => updateWorkspace({ workspaceName: e.target.value })}
                placeholder="My Documents"
                style={INPUT_STYLE}
              />
            </div>
          )}

          {/* Organization: name + org name + team size */}
          {scenario === "organization" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label htmlFor="ws-name" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Workspace name <span aria-hidden style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  id="ws-name"
                  type="text"
                  value={draft.workspace.workspaceName}
                  onChange={(e) => updateWorkspace({ workspaceName: e.target.value })}
                  placeholder="Mabini Legal Solutions"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label htmlFor="ws-org" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Organisation name <span style={{ color: "#334155", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="ws-org"
                  type="text"
                  value={draft.workspace.orgName}
                  onChange={(e) => updateWorkspace({ orgName: e.target.value })}
                  placeholder="Mabini Legal Solutions, Inc."
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label htmlFor="ws-size" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Team size
                </label>
                <select
                  id="ws-size"
                  value={draft.workspace.teamSize}
                  onChange={(e) => updateWorkspace({ teamSize: e.target.value })}
                  style={{ ...INPUT_STYLE, appearance: "none", cursor: "pointer" }}
                >
                  {TEAM_SIZES.map(({ value, label }) => (
                    <option key={value} value={value} style={{ background: "#07111F" }}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Invitation: guidance only (actual acceptance is on /accept-invitation) */}
          {scenario === "invitation" && (
            <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "16px" }}>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>Using an invitation link</p>
              <p style={{ color: "#475569", ...GF, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Your invitation link will take you directly to the workspace. If you have a link, open it in your browser and sign in with this account to join.
              </p>
            </div>
          )}
        </div>

        <OnboardingActions
          onBack={handleBack}
          onContinue={handleContinue}
          continueLabel="Continue"
          disabled={scenario === "" }
        />
      </OnboardingCard>
    </OnboardingLayout>
  );
}
