// C13 — Onboarding step 5: Notification preferences.
// Transaction + account notifications default ON.
// Marketing + eNotary never pre-selected.

import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import type { NotificationsDraft } from "../../models/auth";
import { OnboardingLayout, OnboardingCard, OnboardingActions } from "../../layouts/OnboardingLayout";

const GF = { fontFamily: "'Geist', sans-serif" };

type BoolKey = { [K in keyof NotificationsDraft]: NotificationsDraft[K] extends boolean ? K : never }[keyof NotificationsDraft];

function NotifRow({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
      <div>
        <p style={{ color: "#94A3B8", ...GF, fontSize: 13, fontWeight: 500, margin: "0 0 2px" }}>{label}</p>
        {description && <p style={{ color: "#334155", ...GF, fontSize: 11, margin: 0, lineHeight: 1.4 }}>{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, flexShrink: 0, marginTop: 3, accentColor: "#0078D4", cursor: "pointer" }}
      />
    </label>
  );
}

export function OnboardingNotifications() {
  const navigate = useNavigate();
  const { draft, updateNotifications, markStepDone } = useOnboarding();
  const n = draft.notifications;

  function set(key: BoolKey) {
    return (v: boolean) => updateNotifications({ [key]: v });
  }

  function handleBack()     { navigate("/onboarding/security"); }
  function handleContinue() {
    markStepDone("notifications");
    navigate("/onboarding/review");
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="Notification preferences"
        description="Choose which notifications you want to receive. You can update these in Account Settings at any time."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Document notifications */}
          <div>
            <p style={{ color: "#64748B", ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 2px" }}>Document activity</p>
            <div>
              <NotifRow label="Document viewed"           checked={n.docViewed}            onChange={set("docViewed")} />
              <NotifRow label="Signature completed"       checked={n.signatureCompleted}   onChange={set("signatureCompleted")} />
              <NotifRow label="Approval completed"        checked={n.approvalCompleted}    onChange={set("approvalCompleted")} />
              <NotifRow label="Participant declined"      checked={n.participantDeclined}  onChange={set("participantDeclined")} />
              <NotifRow label="Delivery failed"           checked={n.deliveryFailed}       onChange={set("deliveryFailed")} />
              <NotifRow label="Request expiring soon"     checked={n.requestExpiring}      onChange={set("requestExpiring")} />
              <NotifRow label="All participants completed" checked={n.requestCompleted}    onChange={set("requestCompleted")} />
            </div>
          </div>

          {/* Account notifications */}
          <div>
            <p style={{ color: "#64748B", ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 2px" }}>Account & security</p>
            <div>
              <NotifRow label="New sign-in from a different device" checked={n.newSignIn}             onChange={set("newSignIn")} />
              <NotifRow label="Security alerts"                     checked={n.securityAlert}         onChange={set("securityAlert")} />
              <NotifRow label="Workspace invitation received"       checked={n.workspaceInvitation}   onChange={set("workspaceInvitation")} />
              <NotifRow label="Role or permission changed"          checked={n.roleChanged}           onChange={set("roleChanged")} />
            </div>
          </div>

          {/* Marketing — never pre-selected */}
          <div>
            <p style={{ color: "#64748B", ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 2px" }}>Product & marketing</p>
            <div>
              <NotifRow label="Product updates and new features"  checked={n.productUpdates}   onChange={set("productUpdates")} />
              <NotifRow label="Guides and educational resources"  checked={n.guidesEducation}  onChange={set("guidesEducation")} />
            </div>
          </div>

          {/* eNotary — separate, never pre-selected, strict legal copy */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ color: "#64748B", ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>LAGDA eNotary</p>
            <NotifRow
              label="eNotary availability updates"
              description="LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules."
              checked={n.enotaryUpdates}
              onChange={set("enotaryUpdates")}
            />
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
