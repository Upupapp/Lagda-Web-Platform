// C13 — Onboarding step 4 of 4: Review.
//
// Shows what each step actually saved — every status here is derived from
// what happened (a workspace created, a join request sent, MFA enrolled),
// never from what was merely chosen. Edit links go back to each step.
//
// Completion, with a real backend, re-reads the session FROM the backend so
// the dashboard opens on the account's real workspace. Only the demo build
// (no VITE_API_BASE_URL) signs in with the mock payload — see handleComplete.

import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, ChevronRight, ClipboardCheck, ShieldCheck, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform, createMockSignInPayload } from "../../context/PlatformContext";
import {
  OnboardingLayout,
  OnboardingCard,
  OnboardingActions,
} from "../../layouts/OnboardingLayout";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { Notice } from "./onboarding-ui";
import { GF, AZURE, NAVY } from "./onboarding-form";

type StatusTone = "done" | "pending" | "todo";

const STATUS_STYLE: Record<StatusTone, { color: string; bg: string }> = {
  done:    { color: "#1E6B41", bg: "#EAF7EF" },
  pending: { color: "#1F4E79", bg: "#F0F7FF" },
  todo:    { color: "#7A5A00", bg: "#FFF8E6" },
};

function ReviewRow({
  icon: Icon, title, detail, status, tone, editTo, editLabel,
}: {
  icon: LucideIcon;
  title: string;
  detail: ReactNode;
  status: string;
  tone: StatusTone;
  editTo: string;
  editLabel: string;
}) {
  const s = STATUS_STYLE[tone];
  return (
    <li
      style={{
        display: "flex", gap: 12, alignItems: "flex-start",
        padding: "14px 0", borderBottom: "1px solid #EEF2F6",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "#EAF4FC",
          display: "inline-flex", alignItems: "center", justifyContent: "center", color: AZURE,
        }}
      >
        <Icon size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 700, color: NAVY }}>{title}</p>
        <p style={{ ...GF, margin: "2px 0 6px", fontSize: 14, color: "#33414F", lineHeight: 1.5, overflowWrap: "anywhere" }}>
          {detail}
        </p>
        <span
          style={{
            ...GF, display: "inline-block", fontSize: 12.5, fontWeight: 700,
            color: s.color, background: s.bg, borderRadius: 999, padding: "3px 10px",
          }}
        >
          {status}
        </span>
      </div>
      <Link
        to={editTo}
        aria-label={editLabel}
        className="review-edit-link"
        style={{
          ...GF, color: AZURE, fontSize: 14, fontWeight: 700, textDecoration: "none", flexShrink: 0,
          display: "inline-flex", alignItems: "center", gap: 2, minHeight: 44, minWidth: 44,
          justifyContent: "flex-end",
        }}
      >
        Edit <ChevronRight size={14} aria-hidden />
      </Link>
    </li>
  );
}

export function OnboardingReview() {
  const navigate = useNavigate();
  const { draft, markComplete, mfaSetupDone } = useOnboarding();
  const platform = usePlatform();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  const { profile, workspace, security } = draft;
  const mfaOn = security.mfaEnabled || mfaSetupDone;

  let workspaceDetail: string;
  let workspaceStatus: string;
  let workspaceTone: StatusTone;
  if (workspace.scenario === "join" && workspace.joinRequest) {
    workspaceDetail = `Join request sent to ${workspace.joinRequest.workspaceName}`;
    workspaceStatus = "Pending approval";
    workspaceTone = "pending";
  } else if (workspace.usedExistingWorkspace) {
    workspaceDetail = platform.currentWorkspace?.name ?? workspace.workspaceName;
    workspaceStatus = "✓ Ready";
    workspaceTone = "done";
  } else {
    workspaceDetail = workspace.savedName || workspace.workspaceName;
    workspaceStatus = USE_REAL_BACKEND ? "✓ Created" : "✓ Saved";
    workspaceTone = "done";
  }

  async function handleComplete() {
    if (status !== "idle") return;
    setStatus("submitting");
    setError(null);

    if (USE_REAL_BACKEND) {
      // Ask the backend who this is and which workspace to open. Do NOT
      // invent it: signing in with the mock fixture here once replaced a
      // brand-new account's session with a fictional user in a fictional
      // workspace, and the dashboard then failed to load.
      const result = await platform.refreshSessionFromBackend();
      if (result.status === "unauthenticated") {
        setStatus("idle");
        setError("Your session has ended. Sign in again to finish — everything you saved is kept.");
        return;
      }
    } else {
      // Demo build only: there is no backend to ask, and the fixture IS the
      // session.
      const payload = createMockSignInPayload();
      const ws = payload.currentWorkspace ?? payload.workspaces[0];
      if (ws)
        platform.signIn(
          payload.user,
          payload.workspaces,
          ws,
          payload.subscription,
          payload.notifications,
        );
    }
    markComplete();
    void navigate("/onboarding/complete", { replace: true });
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        icon={ClipboardCheck}
        title="Review your setup"
        description="Here's what's saved to your account. Edit anything before you start."
      >
        {error && <div style={{ marginBottom: 16 }}><Notice tone="error">{error}</Notice></div>}

        <ul aria-label="Setup summary" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          <ReviewRow
            icon={User}
            title="Profile"
            detail={`${profile.fullName || profile.displayName || "—"} · ${profile.timeZone.replace(/_/g, " ")}`}
            status="✓ Saved"
            tone="done"
            editTo="/onboarding/profile"
            editLabel="Edit profile"
          />
          <ReviewRow
            icon={Building2}
            title="Workspace"
            detail={workspaceDetail || "—"}
            status={workspaceStatus}
            tone={workspaceTone}
            editTo="/onboarding/workspace"
            editLabel="Edit workspace"
          />
          <ReviewRow
            icon={ShieldCheck}
            title="Security"
            detail={mfaOn ? "Two-step verification" : "Two-step verification not set up yet"}
            status={mfaOn ? "✓ Two-step on" : "Not on yet — Settings → Security"}
            tone={mfaOn ? "done" : "todo"}
            editTo="/onboarding/security"
            editLabel="Edit security"
          />
        </ul>

        <p style={{ ...GF, margin: "16px 0 0", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
          Notifications use recommended settings — change them anytime in Settings.
        </p>

        <OnboardingActions
          onBack={() => { void navigate("/onboarding/security"); }}
          onContinue={() => { void handleComplete(); }}
          submitting={status === "submitting"}
          continueLabel="Go to your dashboard →"
        />
      </OnboardingCard>
      <style>{`
        .review-edit-link:hover { color: #005BA9 !important; text-decoration: underline !important; text-underline-offset: 3px; }
      `}</style>
    </OnboardingLayout>
  );
}
