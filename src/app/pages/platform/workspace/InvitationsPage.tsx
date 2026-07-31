// /app/workspace/invitations — Invitations management.
// List pending/expired invitations, resend, revoke, send new invitation.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceInvitation, WorkspaceInvitationStatus, WorkspaceRoleId } from "../../../models/workspace-admin";
import { WORKSPACE_INVITATION_STATUS_LABELS } from "../../../models/workspace-admin";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

const STATUS_BADGE: Record<WorkspaceInvitationStatus, { bg: string; color: string }> = {
  "pending":  { bg: "#EBF4FC", color: "#0078D4" },
  "accepted": { bg: "#E8F5E9", color: "#1B5E20" },
  "expired":  { bg: "#F1F5F9", color: "#475569" },
  "revoked":  { bg: "#FEF2F2", color: "#991B1B" },
  "bounced":  { bg: "#FFF3E0", color: "#E65100" },
};

const SYSTEM_ROLES = [
  { id: "role_sender",           name: "Sender" },
  { id: "role_member",           name: "Member" },
  { id: "role_reviewer_auditor", name: "Reviewer / Auditor" },
  { id: "role_administrator",    name: "Administrator" },
  { id: "role_billing_admin",    name: "Billing Administrator" },
  { id: "role_template_manager", name: "Template Manager" },
  { id: "role_contact_manager",  name: "Contact Manager" },
];

function InviteForm({ onDone }: { onDone: () => void }) {
  const { asyncSendInvitation, asyncLoadInvitations } = useWorkspaceAdmin();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("role_member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    await asyncSendInvitation({ email: email.trim(), roleId: roleId as WorkspaceRoleId });
    await asyncLoadInvitations();
    setSending(false);
    setSuccess(true);
    setEmail(""); setRoleId("role_member");
    setTimeout(() => { setSuccess(false); onDone(); }, 1500);
  };

  return (
    <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
      <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 16px" }}>Invite a member</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 220px", minWidth: 160 }}>
          <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@example.com"
            required aria-required="true"
            style={{ ...GF, fontSize: 13, padding: "9px 12px", border: `1.5px solid ${error ? "#EF4444" : "#D1D9E0"}`, borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: "0 0 200px", minWidth: 160 }}>
          <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Role</label>
          <select value={roleId} onChange={e => setRoleId(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", width: "100%", cursor: "pointer" }}>
            {SYSTEM_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={sending}
          style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, whiteSpace: "nowrap" }}>
          {sending ? "Sending…" : "Send invitation"}
        </button>
      </form>
      {error   && <p role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", margin: "8px 0 0" }}>{error}</p>}
      {/* No invitation email is sent. Saying "Invitation sent." would claim a
          delivery that did not happen. */}
      {success && <p role="status" style={{ ...GF, fontSize: 12, color: "#16A34A", margin: "8px 0 0" }}>Invitation added to this demonstration. No email was sent.</p>}
    </div>
  );
}

function InvitationRow({ inv }: { inv: WorkspaceInvitation }) {
  const { state, asyncResendInvitation, asyncRevokeInvitation, asyncLoadInvitations } = useWorkspaceAdmin();
  const [acting, setActing] = useState(false);
  const badge = STATUS_BADGE[inv.status];

  const resend = async () => {
    setActing(true);
    await asyncResendInvitation(inv.id);
    await asyncLoadInvitations();
    setActing(false);
  };
  const revoke = async () => {
    setActing(true);
    await asyncRevokeInvitation(inv.id);
    await asyncLoadInvitations();
    setActing(false);
  };

  const isExpiring = inv.status === "pending" && new Date(inv.expiresAt) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  return (
    <tr style={{ borderBottom: "1px solid #F0F2F5" }}>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{inv.email}</div>
        <div style={{ ...GM, fontSize: 11, color: SILVER }}>Invited by {inv.invitedByName}</div>
      </td>
      <td style={{ padding: "12px 12px", ...GF, fontSize: 13, color: SLATE }}>{inv.roleName}</td>
      <td style={{ padding: "12px 12px" }}>
        <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: badge.bg, color: badge.color }}>
          {WORKSPACE_INVITATION_STATUS_LABELS[inv.status]}
        </span>
      </td>
      <td style={{ padding: "12px 12px", ...GM, fontSize: 11, color: isExpiring ? "#E65100" : SILVER }}>
        {inv.status === "pending"
          ? `Expires ${new Date(inv.expiresAt).toLocaleDateString("en-PH")}`
          : new Date(inv.sentAt).toLocaleDateString("en-PH")}
      </td>
      <td style={{ padding: "12px 16px" }}>
        {inv.status === "pending" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resend} disabled={acting}
              style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "none", border: "1.5px solid #BAD7F5", borderRadius: 6, padding: "4px 12px", cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.5 : 1 }}>
              Resend
            </button>
            <button onClick={revoke} disabled={acting}
              style={{ ...GF, fontSize: 12, color: "#DC2626", background: "none", border: "1.5px solid #FECACA", borderRadius: 6, padding: "4px 12px", cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.5 : 1 }}>
              Revoke
            </button>
          </div>
        )}
        {inv.status === "expired" && (
          <button onClick={resend} disabled={acting}
            style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "none", border: "1.5px solid #BAD7F5", borderRadius: 6, padding: "4px 12px", cursor: acting ? "not-allowed" : "pointer" }}>
            Resend
          </button>
        )}
      </td>
    </tr>
  );
}

function InvitationsInner() {
  const { state, asyncLoadInvitations } = useWorkspaceAdmin();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "expired" | "revoked">("all");

  useEffect(() => { asyncLoadInvitations(); }, [asyncLoadInvitations]);

  const filtered = state.invitations.filter(i => filter === "all" || i.status === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Invitations</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Invitations</h1>
          <button onClick={() => setShowForm(v => !v)}
            style={{ ...GF, fontSize: 13, fontWeight: 600, background: AZURE, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}>
            {showForm ? "Cancel" : "+ Invite Member"}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "24px auto 0", padding: "0 24px" }}>
        {showForm && <InviteForm onDone={() => setShowForm(false)} />}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {(["all", "pending", "expired", "revoked"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                background: filter === f ? NAVY : "#F1F5F9", color: filter === f ? "#FFFFFF" : SLATE }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, overflow: "hidden" }}>
          {state.invitationsLoading ? (
            <div aria-busy="true" style={{ padding: "32px", textAlign: "center", ...GF, fontSize: 13, color: SLATE }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0 }}>
                {filter === "all" ? "No invitations yet." : `No ${filter} invitations.`}
              </p>
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
                  View all
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table role="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ borderBottom: "2px solid #E3E8EF", background: "#F8FAFC" }}>
                  <tr>
                    <th style={{ padding: "10px 16px", ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Invitee</th>
                    <th style={{ padding: "10px 12px", ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Role</th>
                    <th style={{ padding: "10px 12px", ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Status</th>
                    <th style={{ padding: "10px 12px", ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Expiry / Sent</th>
                    <th style={{ padding: "10px 16px", width: 160 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => <InvitationRow key={inv.id} inv={inv} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 16, padding: "10px 16px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8 }}>
          Invitation emails are not actually sent in this demonstration.
          Status changes are session-local and reset on reload.
        </p>
      </div>
    </div>
  );
}

export function InvitationsPage() {
  return (
    <WorkspaceAdminProvider>
      <InvitationsInner />
    </WorkspaceAdminProvider>
  );
}
