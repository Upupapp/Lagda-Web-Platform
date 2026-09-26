// Onboarding → Workspace → "With a team": invite teammates with single-use
// join links (078).
//
// The workspace does not exist until Continue, so invites are collected in
// the onboarding draft first. OnboardingWorkspace calls `sendTeamInvites`
// once the workspace is created (or found) and before moving on:
//   with an email + "Email the link" — the link is created and emailed;
//   otherwise                         — it is saved as a Draft in
//                                       Workspace → Members, ready to send.
// Every person who uses a link still waits for the owner's approval.
//
// No props, so OnboardingWorkspace only renders it; the list lives in the
// onboarding draft (`workspace.teamInvites`) and survives Back / refresh.

import { useId, useState } from "react";
import { useOnboarding } from "../../context/OnboardingContext";
import type { TeamInviteDraft } from "../../models/auth";
import { validateTicketInput, JOIN_TICKET_LABEL_MAX } from "../../services/real/workspace-join.service";
import { GF, NAVY, AZURE, inputStyle } from "./onboarding-form";

const SLATE = "#64748B";
const DANGER = "#C0392B";
/** Enough for onboarding; more can be added from Workspace → Members. */
const MAX_INVITES = 10;

export function TeamInvitesSlot() {
  const { draft, updateWorkspace } = useOnboarding();
  const invites = draft.workspace.teamInvites ?? [];
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const labelId = useId();
  const emailId = useId();

  function add() {
    const checked = validateTicketInput(label, email);
    if ("error" in checked) { setError(checked.error); return; }
    if (invites.length >= MAX_INVITES) {
      setError(`You can add up to ${String(MAX_INVITES)} here. Add more later from Workspace → Members.`);
      return;
    }
    const next: TeamInviteDraft = {
      id: `inv_${String(Date.now())}_${String(invites.length)}`,
      label: checked.input.label,
      email: checked.input.recipientEmail,
      sendEmail: checked.input.recipientEmail !== null && sendEmail,
      status: "queued",
    };
    updateWorkspace({ teamInvites: [...invites, next] });
    setLabel("");
    setEmail("");
    setError(null);
  }

  function remove(id: string) {
    updateWorkspace({ teamInvites: invites.filter(i => i.id !== id) });
  }

  return (
    <div data-testid="team-invites-slot" style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, background: "#F8FAFC" }}>
      <p style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>
        Invite teammates <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
      </p>
      <p style={{ ...GF, fontSize: 13, lineHeight: 1.5, color: SLATE, margin: "0 0 14px" }}>
        Each person gets a single-use join link. They join only after you approve their request in
        Workspace → Members, where you can also add more links later.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <label htmlFor={labelId} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 4 }}>Label</label>
          <input id={labelId} type="text" value={label} maxLength={JOIN_TICKET_LABEL_MAX}
            onChange={(e) => { setLabel(e.target.value); setError(null); }}
            placeholder="Finance team" style={inputStyle(false)} />
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <label htmlFor={emailId} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 4 }}>
            Email <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
          </label>
          <input id={emailId} type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="name@example.com" style={inputStyle(false)} />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
        <label style={{ ...GF, fontSize: 13, color: email.trim() ? NAVY : SLATE, display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={sendEmail && email.trim() !== ""} disabled={email.trim() === ""}
            onChange={(e) => setSendEmail(e.target.checked)} style={{ width: 16, height: 16 }} />
          Email the link
        </label>
        <button type="button" onClick={add}
          style={{ ...GF, fontSize: 14, fontWeight: 600, color: AZURE, background: "#FFFFFF", border: `1.5px solid ${AZURE}`, borderRadius: 8, padding: "8px 16px", minHeight: 40, cursor: "pointer" }}>
          Add invite
        </button>
      </div>
      {error && <p role="alert" style={{ ...GF, fontSize: 13, color: DANGER, margin: "8px 0 0" }}>{error}</p>}

      {invites.length > 0 && (
        <ul aria-label="Invites to send" style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {invites.map(i => (
            <li key={i.id} style={{ background: "#FFFFFF", border: `1px solid ${i.status === "failed" ? "#F5C2C0" : "#E2E8F0"}`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>{i.label}</div>
                <div style={{ ...GF, fontSize: 12, color: i.status === "failed" ? DANGER : SLATE, overflowWrap: "anywhere" }}>
                  {i.status === "failed" ? i.error
                    : i.status === "done" ? (i.email && i.sendEmail ? `Link emailed to ${i.email}` : "Saved as a draft link")
                    : i.email && i.sendEmail ? `Link will be emailed to ${i.email}`
                    : "Saved as a draft link when you continue"}
                </div>
              </div>
              {i.status !== "done" && (
                <button type="button" onClick={() => remove(i.id)} aria-label={`Remove ${i.label}`}
                  style={{ ...GF, fontSize: 13, color: SLATE, background: "none", border: "none", cursor: "pointer", padding: "6px 4px", minHeight: 32 }}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
