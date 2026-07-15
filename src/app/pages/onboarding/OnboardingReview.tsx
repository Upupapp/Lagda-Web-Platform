// C13 — Onboarding step 6: Review & complete.
// Shows summary of all draft choices. Edit links go back to each step.
// Completion calls platform.signIn() with mock payload — no real API.
// NEVER claims account was created, workspace created, or subscription active.

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform } from "../../context/PlatformContext";
import { createMockSignInPayload } from "../../context/PlatformContext";
import { OnboardingLayout } from "../../layouts/OnboardingLayout";
import { ORG_TYPE_LABELS, PRIMARY_GOAL_LABELS } from "../../models/auth";
import { delay } from "../../services/mock/delay";

const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";

function SectionRow({ label, value, editTo }: { label: string; value: string; editTo: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <p style={{ color: "#475569", ...GF, fontSize: 11, fontWeight: 600, margin: "0 0 2px" }}>{label}</p>
        <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{value || "—"}</p>
      </div>
      <Link to={editTo} style={{ color: "#38BDF8", ...GF, fontSize: 12, textDecoration: "none", flexShrink: 0 }}>Edit</Link>
    </div>
  );
}

export function OnboardingReview() {
  const navigate   = useNavigate();
  const { draft, markComplete } = useOnboarding();
  const platform   = usePlatform();
  const [status,   setStatus]   = useState<"idle"|"submitting"|"done">("idle");
  const doneRef    = useRef<HTMLDivElement>(null);

  const { profile, useCase, workspace, security, notifications } = draft;

  const orgTypeLabel   = useCase.orgType ? ORG_TYPE_LABELS[useCase.orgType] : "Not specified";
  const goalsLabel     = useCase.primaryGoals.length > 0
    ? useCase.primaryGoals.map((g) => PRIMARY_GOAL_LABELS[g]).join(", ")
    : "Not specified";
  const wsLabel        = workspace.scenario === "personal" ? "Personal workspace"
    : workspace.scenario === "organization" ? `Team workspace${workspace.workspaceName ? ` — ${workspace.workspaceName}` : ""}`
    : workspace.scenario === "invitation" ? "Joining via invitation"
    : "Not selected";
  const mfaLabel       = security.mfaEnabled ? "Enabled" : "Not enabled";
  const alertsLabel    = security.loginAlertsEnabled ? "Enabled" : "Disabled";

  async function handleComplete() {
    if (status !== "idle") return;
    setStatus("submitting");
    await delay(800);
    markComplete();
    const payload = createMockSignInPayload();
    platform.signIn(payload.user, payload.workspaces, payload.currentWorkspace, payload.subscription, payload.notifications);
    setStatus("done");
    setTimeout(() => navigate("/onboarding/complete", { replace: true }), 400);
  }

  return (
    <OnboardingLayout showProgress={false}>
      <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            Review your settings
          </h1>
          <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
            Confirm your choices before completing account setup. You can change any of these later.
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "4px 20px 4px", marginBottom: 20 }}>
          <SectionRow label="Full name"     value={profile.displayName}         editTo="/onboarding/profile" />
          <SectionRow label="Job title"     value={profile.jobTitle || "—"}     editTo="/onboarding/profile" />
          <SectionRow label="Time zone"     value={profile.timeZone}            editTo="/onboarding/profile" />
          <SectionRow label="Organisation type" value={orgTypeLabel}            editTo="/onboarding/use-case" />
          <SectionRow label="Goals"         value={goalsLabel}                  editTo="/onboarding/use-case" />
          <SectionRow label="Workspace"     value={wsLabel}                     editTo="/onboarding/workspace" />
          <SectionRow label="Two-factor authentication" value={mfaLabel}        editTo="/onboarding/security" />
          <SectionRow label="Sign-in alerts" value={alertsLabel}                editTo="/onboarding/security" />
        </div>

        {/* Demo notice */}
        <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <p style={{ color: "#C9960C", fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            Clicking "Complete setup" demonstrates the completion flow. No real account, workspace, or subscription is created.
          </p>
        </div>

        <button
          onClick={handleComplete}
          disabled={status !== "idle"}
          aria-busy={status === "submitting"}
          style={{
            width: "100%",
            background: status !== "idle" ? "rgba(0,120,212,0.5)" : AZURE,
            border: "none", borderRadius: 8, color: "white",
            ...GF, fontSize: 15, fontWeight: 700,
            padding: "15px", minHeight: 50, cursor: status !== "idle" ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {status === "submitting" ? "Setting up your account…"
           : status === "done"     ? "Done!"
           : "Complete setup"}
        </button>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <Link to="/onboarding/notifications" style={{ color: "#475569", ...GF, fontSize: 12, textDecoration: "none" }}>← Back</Link>
        </div>
      </div>
    </OnboardingLayout>
  );
}
