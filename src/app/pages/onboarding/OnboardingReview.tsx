// C13 — Onboarding step 6: Review & complete.
// Shows summary of all draft choices. Edit links go back to each step.
// Completion calls platform.signIn() with mock payload — no real API.
// NEVER claims account was created, workspace created, or subscription active.

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { User, Target, Building2, ShieldCheck, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform } from "../../context/PlatformContext";
import { createMockSignInPayload } from "../../context/PlatformContext";
import { OnboardingLayout } from "../../layouts/OnboardingLayout";
import { ORG_TYPE_LABELS, PRIMARY_GOAL_LABELS } from "../../models/auth";
import { delay } from "../../services/mock/delay";

const GF = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const NAVY = "#07111F";
const SILVER = "#64748B";

function ReviewGroup({
  icon: Icon,
  title,
  editTo,
  children,
}: {
  icon: LucideIcon;
  title: string;
  editTo: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="review-group"
      style={{
        background: "#FFFFFF",
        border: "1px solid #DBEAFE",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 14,
        boxShadow: "0 2px 10px rgba(7,17,31,0.04)",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 18px",
          background: "linear-gradient(135deg, #F0F7FF 0%, #F8FAFB 100%)",
          borderBottom: "1px solid #EAF1F8",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 32, height: 32, borderRadius: 9,
            background: AZURE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Icon size={16} color="#FFFFFF" strokeWidth={2} />
        </div>
        <span style={{ ...GF, fontSize: 13.5, fontWeight: 800, color: NAVY, flex: 1 }}>{title}</span>
        <Link
          to={editTo}
          className="review-edit-link"
          style={{ color: AZURE, ...GF, fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 2 }}
        >
          Edit <ChevronRight size={13} />
        </Link>
      </div>
      <div style={{ padding: "6px 18px" }}>{children}</div>
    </div>
  );
}

function SectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="review-section-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 20,
        padding: "12px 0",
        borderBottom: "1px solid #F0F4F8",
      }}
    >
      <span style={{ color: SILVER, ...GF, fontSize: 12.5, fontWeight: 600 }}>{label}</span>
      <span style={{ color: NAVY, ...GF, fontSize: 13, textAlign: "right", lineHeight: 1.5 }}>
        {value || "—"}
      </span>
    </div>
  );
}

export function OnboardingReview() {
  const navigate = useNavigate();
  const { draft, markComplete } = useOnboarding();
  const platform = usePlatform();
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const doneRef = useRef<HTMLDivElement>(null);

  const { profile, useCase, workspace, security, notifications } = draft;

  const orgTypeLabel = useCase.orgType
    ? ORG_TYPE_LABELS[useCase.orgType]
    : "Not specified";
  const goalsLabel =
    useCase.primaryGoals.length > 0
      ? useCase.primaryGoals.map((g) => PRIMARY_GOAL_LABELS[g]).join(", ")
      : "Not specified";
  const wsLabel =
    workspace.scenario === "personal"
      ? "Personal workspace"
      : workspace.scenario === "organization"
        ? `Team workspace${workspace.workspaceName ? ` — ${workspace.workspaceName}` : ""}`
        : workspace.scenario === "invitation"
          ? "Joining via invitation"
          : "Not selected";
  const mfaLabel = security.mfaEnabled ? "Enabled" : "Not enabled";
  const alertsLabel = security.loginAlertsEnabled ? "Enabled" : "Disabled";

  async function handleComplete() {
    if (status !== "idle") return;
    setStatus("submitting");
    await delay(800);
    markComplete();
    const payload = createMockSignInPayload();
    // The mock fixture always has a current workspace; guard so a missing one
    // never enters the session as an undefined workspace.
    const ws = payload.currentWorkspace ?? payload.workspaces[0];
    if (ws)
      platform.signIn(
        payload.user,
        payload.workspaces,
        ws,
        payload.subscription,
        payload.notifications,
      );
    setStatus("done");
    setTimeout(() => navigate("/onboarding/complete", { replace: true }), 400);
  }

  return (
    <OnboardingLayout showProgress={false}>
      <div
        className="review-page"
        style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}
      >
        <div
          className="review-heading"
          style={{ textAlign: "center", marginBottom: 24 }}
        >
          <h1
            style={{
              color: "#07111F",
              ...GF,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: "0 0 8px",
            }}
          >
            Review your settings
          </h1>
          <p
            style={{
              color: "#475569",
              ...GF,
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Confirm your choices before completing account setup. You can change
            any of these later.
          </p>
        </div>

        {/* Readiness banner — the fallback-URL guard in OnboardingLayout
            already prevents reaching this page with an earlier step
            incomplete, so this is confirmatory, not a validation gate. */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 20, padding: "12px 16px", borderRadius: 10,
            background: "#F0FAF4", border: "1px solid #A8D5B5",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 15 }}>✓</span>
          <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#2E7D32" }}>
            Everything's filled in — review the details below, then complete setup.
          </span>
        </div>

        <ReviewGroup icon={User} title="Profile" editTo="/onboarding/profile">
          <SectionRow label="Full name" value={profile.displayName} />
          <SectionRow label="Job title" value={profile.jobTitle || "—"} />
          <SectionRow label="Time zone" value={profile.timeZone} />
        </ReviewGroup>

        <ReviewGroup icon={Target} title="Intended Use" editTo="/onboarding/use-case">
          <SectionRow label="What best describes you" value={orgTypeLabel} />
          <SectionRow label="Goals" value={goalsLabel} />
        </ReviewGroup>

        <ReviewGroup icon={Building2} title="Workspace" editTo="/onboarding/workspace">
          <SectionRow label="Workspace" value={wsLabel} />
        </ReviewGroup>

        <ReviewGroup icon={ShieldCheck} title="Security" editTo="/onboarding/security">
          <SectionRow label="Two-factor authentication" value={mfaLabel} />
          <SectionRow label="Sign-in alerts" value={alertsLabel} />
        </ReviewGroup>

        {/* Demo notice */}
        <div
          style={{
            background: "#F0F7FF",
            border: "1px solid #BAE0FA",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              color: "#0078D4",
              fontFamily: "'Geist Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              margin: "0 0 4px",
            }}
          >
            FRONTEND DEMONSTRATION
          </p>
          <p
            style={{
              color: "#334155",
              ...GF,
              fontSize: 12,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Clicking "Complete setup" demonstrates the completion flow. No real
            account, workspace, or subscription is created.
          </p>
        </div>

        <button
          onClick={handleComplete}
          disabled={status !== "idle"}
          aria-busy={status === "submitting"}
          style={{
            width: "100%",
            background: status !== "idle" ? "#B9D8F5" : AZURE,
            border: "none",
            borderRadius: 8,
            color: "white",
            ...GF,
            fontSize: 15,
            fontWeight: 700,
            padding: "15px",
            minHeight: 50,
            cursor: status !== "idle" ? "not-allowed" : "pointer",
            boxShadow:
              status === "idle" ? "0 5px 14px rgba(0,120,212,0.20)" : "none",
            transition: "background 0.15s, transform 0.15s, box-shadow 0.15s",
          }}
        >
          {status === "submitting"
            ? "Setting up your account…"
            : status === "done"
              ? "Done!"
              : "Complete setup"}
        </button>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <Link
            to="/onboarding/notifications"
            className="review-back-link"
            style={{
              color: "#475569",
              ...GF,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            ← Back
          </Link>
        </div>
      </div>
      <style>{`
        .review-section-row:last-child { border-bottom: none !important; }
        .review-edit-link:hover { color: #005BA9 !important; text-decoration: underline !important; text-underline-offset: 3px; }
        .review-page button:hover:not(:disabled) { background: #006BBE !important; transform: translateY(-1px); }
        .review-page button:active:not(:disabled) { background: #005BA9 !important; transform: translateY(1px); box-shadow: none !important; }
        .review-back-link:hover { color: #0078D4 !important; }
        @media (max-width: 480px) {
          .review-page { max-width: 100% !important; }
          .review-group > div:first-child { padding: 10px 14px !important; }
          .review-group > div:last-child { padding: 4px 14px !important; }
          .review-section-row { gap: 12px !important; }
        }
      `}</style>
    </OnboardingLayout>
  );
}
