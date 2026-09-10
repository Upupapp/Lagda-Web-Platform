// C13 — Onboarding step 3: Workspace.
// Three scenarios: personal, organization, invitation (join existing).
// Never creates a real workspace. All success messaging is frontend-demo language.

import { useState } from "react";
import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import {
  OnboardingLayout,
  OnboardingCard,
  OnboardingActions,
} from "../../layouts/OnboardingLayout";
import type { WorkspaceScenario } from "../../models/auth";

const GF = { fontFamily: "'Geist', sans-serif" };

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#FFFFFF",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  color: "#07111F",
  fontFamily: "'Geist', sans-serif",
  fontSize: 15,
  padding: "12px 14px",
  outline: "none",
};

const SCENARIOS: { id: WorkspaceScenario; title: string; desc: string }[] = [
  {
    id: "personal",
    title: "Personal workspace",
    desc: "For individual use — manage your own documents.",
  },
  {
    id: "organization",
    title: "Team workspace",
    desc: "Collaborate with colleagues under a shared workspace.",
  },
  {
    id: "invitation",
    title: "Join via invitation",
    desc: "You have an invitation link to join an existing workspace.",
  },
];

const TEAM_SIZES = [
  { value: "", label: "Select team size" },
  { value: "1", label: "Just me" },
  { value: "2-10", label: "2–10 people" },
  { value: "11-50", label: "11–50 people" },
  { value: "51-200", label: "51–200 people" },
  { value: "201+", label: "201+ people" },
];

export function OnboardingWorkspace() {
  const navigate = useNavigate();
  const { draft, updateWorkspace, markStepDone } = useOnboarding();
  const [reminder, setReminder] = useState<string | null>(null);

  const scenario = draft.workspace.scenario;

  function handleBack() {
    navigate("/onboarding/use-case");
  }
  function handleContinue() {
    if (scenario === "") {
      setReminder("Choose how you'll use LAGDA before continuing.");
      return;
    }
    if (scenario === "organization" && !draft.workspace.workspaceName.trim()) {
      setReminder("Give your team workspace a name before continuing.");
      return;
    }
    markStepDone("workspace");
    navigate("/onboarding/security");
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="Set up your workspace"
        description="Choose how you will use LAGDA. You can create additional workspaces later."
      >
        {reminder && (
          <div
            role="status"
            style={{
              ...GF, display: "flex", alignItems: "center", gap: 10,
              marginBottom: 20, padding: "12px 16px", borderRadius: 10,
              background: "#FEF9EC", border: "1px solid #F0D07A", color: "#8A6A16", fontSize: 13,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 15 }}>💡</span>
            {reminder}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Scenario selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SCENARIOS.map(({ id, title, desc }) => {
              const selected = scenario === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    updateWorkspace({ scenario: selected ? "" : id });
                    setReminder(null);
                  }}
                  role="radio"
                  aria-checked={selected}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    textAlign: "left",
                    background: selected ? "#EAF6FF" : "#FFFFFF",
                    border: `1px solid ${selected ? "#76BDF2" : "#E2E8F0"}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 2,
                      border: `2px solid ${selected ? "#0078D4" : "#CBD5E1"}`,
                      background: selected ? "#0078D4" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "white",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <p
                      style={{
                        color: "#07111F",
                        ...GF,
                        fontSize: 14,
                        fontWeight: 700,
                        margin: "0 0 3px",
                      }}
                    >
                      {title}
                    </p>
                    <p
                      style={{
                        color: "#475569",
                        ...GF,
                        fontSize: 12,
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Personal: optional name */}
          {scenario === "personal" && (
            <div>
              <label
                htmlFor="ws-name-p"
                style={{
                  display: "block",
                  color: "#94A3B8",
                  ...GF,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Workspace name{" "}
                <span style={{ color: "#334155", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                id="ws-name-p"
                type="text"
                value={draft.workspace.workspaceName}
                onChange={(e) =>
                  updateWorkspace({ workspaceName: e.target.value })
                }
                placeholder="My Documents"
                style={INPUT_STYLE}
              />
            </div>
          )}

          {/* Organization: name + org name + team size */}
          {scenario === "organization" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  htmlFor="ws-name"
                  style={{
                    display: "block",
                    color: "#94A3B8",
                    ...GF,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Workspace name{" "}
                  <span aria-hidden style={{ color: "#0078D4" }}>
                    *
                  </span>
                </label>
                <input
                  id="ws-name"
                  type="text"
                  value={draft.workspace.workspaceName}
                  onChange={(e) => {
                    updateWorkspace({ workspaceName: e.target.value });
                    if (e.target.value.trim()) setReminder(null);
                  }}
                  placeholder="Mabini Legal Solutions"
                  style={{
                    ...INPUT_STYLE,
                    borderColor: reminder && !draft.workspace.workspaceName.trim() ? "#F0D07A" : "#CBD5E1",
                    background: reminder && !draft.workspace.workspaceName.trim() ? "#FEF9EC" : "#FFFFFF",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="ws-org"
                  style={{
                    display: "block",
                    color: "#94A3B8",
                    ...GF,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Organisation name{" "}
                  <span style={{ color: "#334155", fontWeight: 400 }}>
                    (optional)
                  </span>
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
                <label
                  htmlFor="ws-size"
                  style={{
                    display: "block",
                    color: "#94A3B8",
                    ...GF,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Team size
                </label>
                <select
                  id="ws-size"
                  value={draft.workspace.teamSize}
                  onChange={(e) =>
                    updateWorkspace({ teamSize: e.target.value })
                  }
                  style={{
                    ...INPUT_STYLE,
                    appearance: "none",
                    cursor: "pointer",
                  }}
                >
                  {TEAM_SIZES.map(({ value, label }) => (
                    <option
                      key={value}
                      value={value}
                      style={{ background: "#FFFFFF", color: "#07111F" }}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Invitation: guidance only (actual acceptance is on /accept-invitation) */}
          {scenario === "invitation" && (
            <div
              style={{
                background: "#F0F7FF",
                border: "1px solid #BAE0FA",
                borderRadius: 10,
                padding: "16px",
              }}
            >
              <p
                style={{
                  color: "#07111F",
                  ...GF,
                  fontSize: 13,
                  fontWeight: 700,
                  margin: "0 0 8px",
                }}
              >
                Using an invitation link
              </p>
              <p
                style={{
                  color: "#475569",
                  ...GF,
                  fontSize: 13,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Your invitation link will take you directly to the workspace. If
                you have a link, open it in your browser and sign in with this
                account to join.
              </p>
            </div>
          )}
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
