// /app/workspace — Workspace administration overview.
// Shows workspace identity, health summary, attention items, quick stats.
// Frontend-only demonstration. No Burgundy. No eNotary references.

import React, { useEffect } from "react";
import { Link } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceAttentionItem } from "../../../models/workspace-admin";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

function StatCard({ label, value, sub, path }: { label: string; value: number; sub?: string; path: string }) {
  return (
    <Link to={path} style={{ textDecoration: "none" }}>
      <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = AZURE)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#E3E8EF")}>
        <div style={{ ...GF, fontSize: 28, fontWeight: 800, color: NAVY, lineHeight: 1 }}>{value}</div>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE, marginTop: 6 }}>{label}</div>
        {sub && <div style={{ ...GM, fontSize: 11, color: SILVER, marginTop: 3 }}>{sub}</div>}
      </div>
    </Link>
  );
}

const SEVERITY_COLORS = {
  info:     { bg: "#EBF4FC", border: "#BAD7F5", text: AZURE },
  warning:  { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
  critical: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
};

function AttentionCard({ item }: { item: WorkspaceAttentionItem }) {
  const c = SEVERITY_COLORS[item.severity];
  return (
    <div style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{item.title}</div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3 }}>{item.description}</div>
        {item.actionLabel && item.actionPath && (
          <Link to={item.actionPath} style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", marginTop: 6, display: "inline-block" }}>
            {item.actionLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

function QuickLinkRow({ label, path, description }: { label: string; path: string; description: string }) {
  return (
    <Link to={path} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #F0F2F5" }}
      onMouseEnter={e => { (e.currentTarget.querySelector("[data-label]") as HTMLElement).style.color = AZURE; }}
      onMouseLeave={e => { (e.currentTarget.querySelector("[data-label]") as HTMLElement).style.color = NAVY; }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div data-label="" style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, transition: "color 0.15s" }}>{label}</div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 1 }}>{description}</div>
      </div>
      <span style={{ ...GF, fontSize: 16, color: SILVER }}>›</span>
    </Link>
  );
}

function WorkspaceOverviewInner() {
  const { state, asyncLoadOverview } = useWorkspaceAdmin();

  useEffect(() => { void asyncLoadOverview(); }, [asyncLoadOverview]);

  if (state.overviewLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {[80, 120, 200].map((h, i) => (
            <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const { workspace, attentionItems } = state;
  if (!workspace) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      {/* Header */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "24px 24px 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 14, fontWeight: 700, color: AZURE, flexShrink: 0, border: "1.5px solid #BAD7F5" }}>
              {workspace.initials}
            </div>
            <div>
              <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>{workspace.name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ ...GM, fontSize: 11, color: SLATE }}>/{workspace.slug}</span>
                <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#E8F5E9", color: "#1B5E20", fontWeight: 600 }}>
                  {workspace.status.toUpperCase()}
                </span>
                <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: LIGHT, color: AZURE }}>
                  {workspace.plan}
                </span>
              </div>
            </div>
          </div>
          {/* Demo notice */}
          <div style={{ marginTop: 14, padding: "8px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, ...GF, fontSize: 11, color: "#92400E" }}>
            Demonstration workspace — all data is fictional and session-local.
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "24px auto 0", padding: "0 24px", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Main column */}
        <div style={{ flex: "1 1 580px", minWidth: 0 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard label="Active Members"      value={workspace.activeMembers}      path="/app/workspace/members" />
            <StatCard label="Suspended"           value={workspace.suspendedMembers}   path="/app/workspace/members?status=suspended" />
            <StatCard label="Pending Invitations" value={workspace.pendingInvitations} path="/app/workspace/invitations" />
            <StatCard label="Active Teams"        value={workspace.teamCount}          path="/app/workspace/teams" />
            <StatCard label="Custom Roles"        value={workspace.customRoleCount}    path="/app/workspace/roles" />
          </div>

          {/* Attention items */}
          {attentionItems.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
                Needs attention
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {attentionItems.map(item => <AttentionCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {/* The Manage hub.
              *
              * Grouped by what someone is trying to do, not by which service
              * owns the page. Three headings a non-expert can choose between
              * without knowing the product: who is here, what is happening,
              * and how the workspace itself is set up.
              *
              * Reports and Signing routes are DEMOTED here from the sidebar.
              * Neither is on the path to sending a document, and both sat as
              * peers of Documents for a first-time sender whose whole job is
              * one PDF and one signer. */}
          <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "4px 20px 4px" }}>
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "14px 0 2px" }}>
              People
            </h2>
            <QuickLinkRow label="Members"          path="/app/workspace/members"     description="Who is in this workspace" />
            <QuickLinkRow label="Invitations"      path="/app/workspace/invitations" description="People invited but not yet joined" />
            <QuickLinkRow label="Teams"            path="/app/workspace/teams"       description="Group members by department or function" />
            {/* "Roles & Permissions" was two abstract nouns. This asks the
                question the page answers. */}
            <QuickLinkRow label="Who can do what"  path="/app/workspace/roles"       description="What each kind of member is allowed to do" />

            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 2px" }}>
              Oversight
            </h2>
            <QuickLinkRow label="All workspace documents" path="/app/workspace/documents" description="Every document sent for signing, and who sent it" />
            <QuickLinkRow label="Reports"                 path="/app/reports"            description="Volume, turnaround and completion figures" />
            <QuickLinkRow label="Activity log"            path="/app/workspace/activity" description="A record of administrative changes" />

            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 2px" }}>
              Workspace
            </h2>
            {/* Signing routes were the top-level "Workflow" section. The name
                collided with two other meanings — a document's signing order,
                and the automation rules engine — and the section's own tab was
                also called "Workflows", so the nav read "Workflow › Workflows". */}
            <QuickLinkRow label="Signing routes"   path="/app/workflow"           description="Reusable signing orders for documents with several signers" />
            <QuickLinkRow label="Logo & colours"   path="/app/settings/branding"  description="How your documents and emails look to signers" />
            <QuickLinkRow label="Plan & billing"   path="/app/settings/billing"   description="Your plan, invoices and usage" />
            <div style={{ borderBottom: "none", padding: "12px 0 2px" }}>
              <Link to="/app/workspace/settings" style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none" }}>
                Workspace settings &amp; sign-in policy →
              </Link>
            </div>
          </section>
        </div>

        {/* Side column */}
        <div style={{ flex: "0 0 240px", minWidth: 200 }}>
          <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 20px" }}>
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
              Workspace details
            </h2>
            <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Type",   value: workspace.type.charAt(0).toUpperCase() + workspace.type.slice(1) },
                { label: "Plan",   value: workspace.plan },
                { label: "Created", value: new Date(workspace.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) },
                { label: "Billing email", value: workspace.billingEmail ?? "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</dt>
                  <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0", fontWeight: 500 }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div style={{ marginTop: 12, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 20px" }}>
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
              Other workspaces
            </h2>
            <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
              Workspace switching is available in the sidebar. This demonstration is scoped to Mabini Legal Solutions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceOverviewPage() {
  return (
    <WorkspaceAdminProvider>
      <WorkspaceOverviewInner />
    </WorkspaceAdminProvider>
  );
}
