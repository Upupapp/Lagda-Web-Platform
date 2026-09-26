// /app/workspace with a real backend — the Manage hub built only from what
// the backend actually holds. No demonstration notice, no invented slug,
// plan, billing email or suspension counts.
//
// Every count is asked for only when the person's role may read it: a call
// the backend would refuse with its hidden 404 is never made. Owners and
// administrators see the full hub; everyone else sees their own access, the
// pages their role reaches, and their other workspaces.
//
// Inside the workspace shell this is the Overview section: the shell's
// header already names the workspace and the viewer's role, its banners
// already list the pages, and it already loaded the figures — so this reads
// the shell's copy rather than asking the backend a second time.

import type { ReactNode } from "react";
import { Link } from "react-router";
import { usePlatform } from "../../../../context/PlatformContext";
import { useViewport } from "../../../../hooks/useViewport";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { REAL_ROLE_LABELS } from "../../../../services/real/workspace-admin.service";
import { memberRoleLabel } from "../../../../models/workspace-admin";
import { PRIVILEGE_LABELS } from "../../../../models/workspace-role-policy";
import { buttonStyle } from "../join/join-styles";
import { ManagePage, GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "./manage-ui";
import { cardStyle, sectionHeadingStyle, LIGHT } from "./manage-styles";
import { formatDate } from "./manage-format";
import {
  useRealOverviewData, overviewGates, pendingInvitationsOf, pendingRequestsOf, initialsOf, type Count,
} from "./overview-data";
import { useWorkspaceShell } from "../shell/workspace-shell-context";
import { useWorkspaceBrandingSnapshot } from "../../../../hooks/workspace-branding-store";
import { WorkspaceBrandCard } from "./WorkspaceBrandCard";

const EXPIRING_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;
const ATTENTION_REQUEST_LIMIT = 5;

function StatCard({ label, value, path, testId }: { label: string; value: Count; path: string; testId: string }) {
  const shown = value === null ? "…" : value === "error" ? "—" : String(value);
  return (
    <Link to={path} data-testid={testId} style={{ textDecoration: "none", minWidth: 0 }}>
      <div style={{ ...cardStyle, padding: "16px 18px", height: "100%" }}>
        <div style={{ ...GF, fontSize: 26, fontWeight: 800, color: NAVY, lineHeight: 1 }} aria-busy={value === null}>{shown}</div>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE, marginTop: 6 }}>{label}</div>
      </div>
    </Link>
  );
}

function HubLink({ label, path, description, badge }: { label: string; path: string; description: string; badge?: ReactNode }) {
  return (
    <Link to={path} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #F0F2F5", minHeight: 44 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {label}{badge}
        </div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 1 }}>{description}</div>
      </div>
      <span aria-hidden style={{ ...GF, fontSize: 16, color: SILVER }}>›</span>
    </Link>
  );
}

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span aria-label={label} style={{ ...GM, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#FFF8E1", color: "#8A5A00", border: "1px solid #F5D98B" }}>
      {count}
    </span>
  );
}

function AttentionRow({ title, description, actionLabel, actionPath, tone = "warning" }: {
  title: string; description: string; actionLabel: string; actionPath: string; tone?: "warning" | "info";
}) {
  const c = tone === "warning"
    ? { bg: "#FFFBEB", border: "#FDE68A", dot: "#92400E" }
    : { bg: "#EBF4FC", border: "#BAD7F5", dot: AZURE };
  return (
    <li style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, marginTop: 7, flexShrink: 0 }} />
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>{title}</div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3, overflowWrap: "anywhere" }}>{description}</div>
      </div>
      <Link to={actionPath} style={{ ...buttonStyle("secondary"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
        {actionLabel}
      </Link>
    </li>
  );
}

function WorkspacesPanel() {
  const platform = usePlatform();
  const current = platform.currentWorkspace?.id;
  return (
    <section aria-labelledby="your-workspaces" data-testid="your-workspaces" style={{ ...cardStyle, padding: "16px 20px" }}>
      <h2 id="your-workspaces" style={sectionHeadingStyle}>Your workspaces</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {platform.workspaces.map(w => {
          const isCurrent = w.id === current;
          return (
            <li key={w.id} data-testid={`workspace-row-${w.id}`}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: `1px solid ${isCurrent ? "#BAD7F5" : BORDER}`, background: isCurrent ? LIGHT : "#FFFFFF" }}>
              <div aria-hidden style={{ width: 30, height: 30, borderRadius: 8, background: w.accentColor, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {w.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>{w.name}</div>
                <div style={{ ...GF, fontSize: 11, color: SLATE }}>
                  {w.role === "viewer" ? REAL_ROLE_LABELS.member : (REAL_ROLE_LABELS as Record<string, string>)[w.role] ?? w.role}
                </div>
              </div>
              {isCurrent ? (
                <span style={{ ...GM, fontSize: 10, fontWeight: 700, color: AZURE, whiteSpace: "nowrap" }}>CURRENT</span>
              ) : (
                <button type="button" onClick={() => platform.switchWorkspace(w.id)} aria-label={`Switch to ${w.name}`}
                  style={{ ...buttonStyle("secondary"), padding: "6px 10px", minHeight: 32 }}>
                  Switch
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>Join a workspace</div>
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "4px 0 0", lineHeight: 1.5 }}>
          To join another workspace, ask one of its owners or administrators for a join link. Open the link,
          send your request, and you will be added once they approve it.
        </p>
      </div>
    </section>
  );
}

export function RealWorkspaceOverview({ workspaceId }: { workspaceId: string }) {
  const platform = usePlatform();
  const access = useWorkspaceAccess();
  const { isNarrow, isMedium } = useViewport();
  const shell = useWorkspaceShell();
  const gates = overviewGates(access);
  // In the shell the figures are already loaded; this loads only on its own.
  const own = useRealOverviewData(workspaceId, gates, shell?.realOverview == null);
  const data = shell?.realOverview ?? own;

  const canMembers = gates.members;
  const canManageMembers = gates.manageMembers;
  const canInvitations = gates.invitations;
  const canTeams = gates.teams;

  const branding = useWorkspaceBrandingSnapshot(workspaceId);
  const name = data.name ?? platform.currentWorkspace?.name ?? "Workspace";
  const role = access.role;
  // A member who cannot read the roster still gets their own title from /access.
  const roleLabel = data.me ? memberRoleLabel(data.me)
    : access.roleTitle ?? (role ? REAL_ROLE_LABELS[role] : "—");
  const myTitle = data.me?.roleTitle ?? access.roleTitle;
  const inherentPrivileges = role === "owner" || role === "administrator";
  const myPrivileges = data.me
    ? { requestDocuments: data.me.canRequestDocuments === true, assignSigners: data.me.canAssignSigners === true }
    : { requestDocuments: access.can("upload-request.create"), assignSigners: access.can("signing-request.send") };

  const pendingInvitations = pendingInvitationsOf(data);
  const now = Date.now();
  const expiringSoon = pendingInvitations.filter(i => {
    const t = new Date(i.expiresAt).getTime();
    return t > now && t - now <= EXPIRING_WITHIN_MS;
  });
  const pendingRequests = pendingRequestsOf(data);
  const pendingCount = pendingRequests.length;

  const stats: { key: string; label: string; value: Count; path: string }[] = [];
  if (canMembers) stats.push({ key: "members", label: "Members", value: data.members, path: "/app/workspace/members" });
  if (canManageMembers) {
    stats.push({
      key: "join-requests", label: "Join requests waiting",
      value: data.pendingRequests === null ? null : data.pendingRequests === "error" ? "error" : pendingCount,
      path: "/app/workspace/join-requests",
    });
  }
  if (canInvitations) {
    stats.push({
      key: "invitations", label: "Pending invitations",
      value: data.invitations === null ? null : data.invitations === "error" ? "error" : pendingInvitations.length,
      path: "/app/workspace/invitations",
    });
    stats.push({ key: "join-links", label: "Active join links", value: data.activeLinks, path: "/app/workspace/join-links" });
  }
  if (canTeams) stats.push({ key: "teams", label: "Teams", value: data.teams, path: "/app/workspace/teams" });

  const attention: ReactNode[] = [];
  for (const r of pendingRequests.slice(0, ATTENTION_REQUEST_LIMIT)) {
    attention.push(
      <AttentionRow key={r.requestId}
        title={`${r.fullName} asked to join`}
        description={`${r.email} · ${r.sourceKind === "invitation" ? "Email invitation" : `Join link: ${r.ticketLabel ?? "—"}`} · ${formatDate(r.createdAt)}`}
        actionLabel="Review" actionPath="/app/workspace/join-requests" />,
    );
  }
  if (pendingCount > ATTENTION_REQUEST_LIMIT) {
    attention.push(
      <AttentionRow key="more-requests" tone="info"
        title={`${String(pendingCount - ATTENTION_REQUEST_LIMIT)} more join request${pendingCount - ATTENTION_REQUEST_LIMIT === 1 ? "" : "s"}`}
        description="Every request waits for an owner or administrator to approve or decline it."
        actionLabel="See all" actionPath="/app/workspace/join-requests" />,
    );
  }
  for (const inv of expiringSoon) {
    attention.push(
      <AttentionRow key={inv.id} tone="info"
        title={`Invitation to ${inv.email} expires soon`}
        description={`It expires on ${formatDate(inv.expiresAt)}. Resend it if they still need to join.`}
        actionLabel="Open invitations" actionPath="/app/workspace/invitations" />,
    );
  }

  const stacked = isNarrow || isMedium;
  const padX = isNarrow ? 16 : 24;
  const isAdmin = canManageMembers;

  // The hub. In the shell the banners already list every Manage page, so
  // only what lives elsewhere in the product stays here.
  const hub = shell ? (
    access.can("workspace.update") ? (
      <section aria-labelledby="more-for-workspace" style={{ ...cardStyle, padding: "4px 20px" }}>
        <h2 id="more-for-workspace" style={{ ...sectionHeadingStyle, margin: "14px 0 2px" }}>More for this workspace</h2>
        <HubLink label="Signing routes" path="/app/workflow" description="Reusable signing orders for documents with several signers" />
        <HubLink label="Logo & colours" path="/app/settings/branding" description="How your documents and emails look to signers" />
        <div style={{ height: 8 }} />
      </section>
    ) : null
  ) : (
    <section style={{ ...cardStyle, padding: "4px 20px" }}>
      <h2 style={{ ...sectionHeadingStyle, margin: "14px 0 2px" }}>People</h2>
      {canMembers && <HubLink label="Members" path="/app/workspace/members" description="Who is in this workspace, their roles and privileges" />}
      {canManageMembers && (
        <HubLink label="Join requests" path="/app/workspace/join-requests" description="People waiting for you to approve or decline them"
          badge={pendingCount > 0 ? <CountBadge count={pendingCount} label={`${String(pendingCount)} waiting`} /> : undefined} />
      )}
      {canInvitations && <HubLink label="Join links" path="/app/workspace/join-links" description="Single-use links that let someone ask to join" />}
      {canInvitations && <HubLink label="Invitations" path="/app/workspace/invitations" description="People invited by email who have not joined yet" />}
      {canTeams && <HubLink label="Teams" path="/app/workspace/teams" description="Departments, offices and other groups of members" />}
      <HubLink label="Who can do what" path="/app/workspace/roles" description="What each role in this workspace is allowed to do" />

      {(access.can("document.view") || access.can("activity.view")) && (
        <h2 style={{ ...sectionHeadingStyle, margin: "18px 0 2px" }}>Oversight</h2>
      )}
      {access.can("document.view") && isAdmin && (
        <HubLink label="All workspace documents" path="/app/workspace/documents" description="Every document sent for signing, and who sent it" />
      )}
      {access.can("activity.view") && (
        <HubLink label="Activity log" path="/app/workspace/activity" description="Changes to members, links, teams and settings" />
      )}

      {access.can("workspace.update") && (
        <>
          <h2 style={{ ...sectionHeadingStyle, margin: "18px 0 2px" }}>Workspace</h2>
          <HubLink label="Workspace settings" path="/app/workspace/settings" description="The workspace's name" />
          <HubLink label="Signing routes" path="/app/workflow" description="Reusable signing orders for documents with several signers" />
          <HubLink label="Logo & colours" path="/app/settings/branding" description="How your documents and emails look to signers" />
        </>
      )}
      <div style={{ height: 8 }} />
    </section>
  );

  const privilegesLine = inherentPrivileges
    ? "Both privileges come with your role."
    : (myPrivileges.requestDocuments || myPrivileges.assignSigners)
      ? [myPrivileges.requestDocuments && PRIVILEGE_LABELS.requestDocuments, myPrivileges.assignSigners && PRIVILEGE_LABELS.assignSigners].filter(Boolean).join(" · ")
      : "None granted yet.";

  // The branded card replaces the old "This workspace" panel: name, sender,
  // created date and your role, in the workspace's own colours.
  const brandCard = (
    <WorkspaceBrandCard
      branding={branding}
      fallbackName={name}
      fallbackColor={platform.currentWorkspace?.brandColor ?? undefined}
      createdAt={data.createdAt !== null ? formatDate(data.createdAt) : null}
      roleLabel={<>
        {roleLabel}
        {myTitle && role && role !== "member" && (
          <span style={{ color: SLATE }}> ({REAL_ROLE_LABELS[role]})</span>
        )}
      </>}
      privilegesLine={privilegesLine}
      canEdit={inherentPrivileges || access.can("workspace.update")}
      compact={isNarrow}
    />
  );

  const body = (
    <div style={{
      ...(shell ? {} : { maxWidth: 960, margin: "24px auto 0", padding: `0 ${String(padX)}px` }),
      boxSizing: "border-box",
    }}>
    {brandCard}
    <div style={{ display: "flex", gap: 24, flexDirection: stacked ? "column" : "row", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 0", minWidth: 0, width: stacked ? "100%" : undefined }}>
        {stats.length > 0 && (
          <div data-testid="overview-stats" style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isNarrow ? 128 : 150}px, 1fr))`, gap: 12, marginBottom: 24 }}>
            {stats.map(s => <StatCard key={s.key} testId={`stat-${s.key}`} label={s.label} value={s.value} path={s.path} />)}
          </div>
        )}

        {attention.length > 0 && (
          <section aria-labelledby="needs-attention" data-testid="needs-attention" style={{ marginBottom: 24 }}>
            <h2 id="needs-attention" style={sectionHeadingStyle}>Needs attention</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>{attention}</ul>
          </section>
        )}

        {hub}
      </div>

      <aside style={{ flex: stacked ? "1 1 auto" : "0 0 280px", width: stacked ? "100%" : 280, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <WorkspacesPanel />
      </aside>
    </div>
    </div>
  );

  // In the shell, its header already names the workspace and your role.
  if (shell) {
    return (
      <ManagePage crumbs={[{ label: "Manage", to: "/app/workspace" }, { label: "Overview" }]} title="Overview"
        subtitle="What needs your attention, and what your role can do here.">
        {body}
      </ManagePage>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px", overflowX: "hidden" }}>
      <header style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}`, padding: `${isNarrow ? 16 : 24}px ${String(padX)}px 20px` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div aria-hidden style={{ width: 44, height: 44, borderRadius: 10, background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 14, fontWeight: 700, color: AZURE, flexShrink: 0, border: "1.5px solid #BAD7F5" }}>
            {initialsOf(name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 data-testid="workspace-name" style={{ ...GF, fontSize: isNarrow ? 20 : 22, fontWeight: 800, color: NAVY, margin: 0, overflowWrap: "anywhere" }}>{name}</h1>
            <div style={{ ...GF, fontSize: 13, color: SLATE, marginTop: 3 }}>
              You are <strong data-testid="your-role" style={{ color: NAVY }}>{roleLabel}</strong> in this workspace
            </div>
          </div>
        </div>
      </header>
      {body}
    </div>
  );
}
