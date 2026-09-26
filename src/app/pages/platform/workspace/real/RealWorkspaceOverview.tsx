// /app/workspace with a real backend — the Manage hub built only from what
// the backend actually holds. No demonstration notice, no invented slug,
// plan, billing email or suspension counts.
//
// Every count is asked for only when the person's role may read it: a call
// the backend would refuse with its hidden 404 is never made. Owners and
// administrators see the full hub; everyone else sees their own access, the
// pages their role reaches, and their other workspaces.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { usePlatform } from "../../../../context/PlatformContext";
import { useViewport } from "../../../../hooks/useViewport";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { realWorkspaceService } from "../../../../services/real/workspace.service";
import { realWorkspaceAdminService, REAL_ROLE_LABELS } from "../../../../services/real/workspace-admin.service";
import { realOrganizationService } from "../../../../services/real/organization.service";
import { listJoinRequests, listJoinTickets, type JoinRequest } from "../../../../services/real/workspace-join.service";
import { memberRoleLabel, type WorkspaceMemberSummary, type WorkspaceInvitation } from "../../../../models/workspace-admin";
import { PRIVILEGE_LABELS } from "../../../../models/workspace-role-policy";
import { buttonStyle } from "../join/join-styles";
import { GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "./manage-ui";
import { cardStyle, sectionHeadingStyle, LIGHT } from "./manage-styles";
import { formatDate } from "./manage-format";

const EXPIRING_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;
const ATTENTION_REQUEST_LIMIT = 5;

/** A number that failed to load reads "—", never a made-up zero. */
type Count = number | null | "error";

interface OverviewData {
  name: string | null;
  createdAt: number | null;
  me: WorkspaceMemberSummary | null;
  members: Count;
  pendingRequests: JoinRequest[] | null | "error";
  invitations: WorkspaceInvitation[] | null | "error";
  activeLinks: Count;
  teams: Count;
}

const EMPTY: OverviewData = {
  name: null, createdAt: null, me: null, members: null, pendingRequests: null,
  invitations: null, activeLinks: null, teams: null,
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

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
  const [data, setData] = useState<OverviewData>(EMPTY);

  const canMembers = access.can("membership.view");
  const canManageMembers = access.can("membership.role.change");
  const canInvitations = access.can("invitation.view");
  const canTeams = access.can("unit.view");

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    const set = (patch: Partial<OverviewData>) => { if (!signal.cancelled) setData(d => ({ ...d, ...patch })); };
    const jobs: Promise<void>[] = [];
    jobs.push(realWorkspaceService.get(workspaceId)
      .then(ws => set({ name: ws.name, createdAt: ws.createdAt }))
      .catch(() => { /* the session's name stands in */ }));
    if (canMembers) {
      jobs.push(realWorkspaceAdminService.listMembers(workspaceId)
        .then(list => set({ members: list.length, me: list.find(m => m.isCurrentUser) ?? null }))
        .catch(() => set({ members: "error" })));
    }
    if (canManageMembers) {
      jobs.push(listJoinRequests(workspaceId, "pending")
        .then(list => set({ pendingRequests: list.filter(r => r.state === "pending").sort((a, b) => a.createdAt - b.createdAt) }))
        .catch(() => set({ pendingRequests: "error" })));
    }
    if (canInvitations) {
      jobs.push(realWorkspaceAdminService.listInvitations(workspaceId)
        .then(list => set({ invitations: list }))
        .catch(() => set({ invitations: "error" })));
      jobs.push(listJoinTickets(workspaceId)
        .then(list => set({ activeLinks: list.filter(t => t.state === "sent" && t.usedAt === null && t.request === null).length }))
        .catch(() => set({ activeLinks: "error" })));
    }
    if (canTeams) {
      jobs.push(realOrganizationService.listUnits(workspaceId)
        .then(list => set({ teams: list.filter(u => u.archivedAt === null).length }))
        .catch(() => set({ teams: "error" })));
    }
    await Promise.all(jobs);
  }, [workspaceId, canMembers, canManageMembers, canInvitations, canTeams]);

  useEffect(() => {
    const signal = { cancelled: false };
    setData(EMPTY);
    void load(signal);
    return () => { signal.cancelled = true; };
  }, [load]);

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

  const pendingInvitations = Array.isArray(data.invitations) ? data.invitations.filter(i => i.status === "pending") : [];
  const now = Date.now();
  const expiringSoon = pendingInvitations.filter(i => {
    const t = new Date(i.expiresAt).getTime();
    return t > now && t - now <= EXPIRING_WITHIN_MS;
  });
  const pendingRequests = Array.isArray(data.pendingRequests) ? data.pendingRequests : [];
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

      <div style={{ maxWidth: 960, margin: "24px auto 0", padding: `0 ${String(padX)}px`, boxSizing: "border-box", display: "flex", gap: 24, flexDirection: stacked ? "column" : "row", alignItems: "flex-start" }}>
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
        </div>

        <aside style={{ flex: stacked ? "1 1 auto" : "0 0 280px", width: stacked ? "100%" : 280, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <section aria-labelledby="about-workspace" data-testid="workspace-facts" style={{ ...cardStyle, padding: "16px 20px" }}>
            <h2 id="about-workspace" style={sectionHeadingStyle}>This workspace</h2>
            <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</dt>
                <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0", fontWeight: 500, overflowWrap: "anywhere" }}>{name}</dd>
              </div>
              {data.createdAt !== null && (
                <div>
                  <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>Created</dt>
                  <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0", fontWeight: 500 }}>{formatDate(data.createdAt)}</dd>
                </div>
              )}
              <div>
                <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your role</dt>
                <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0", fontWeight: 500 }}>
                  {roleLabel}
                  {myTitle && role && role !== "member" && (
                    <span style={{ color: SLATE }}> ({REAL_ROLE_LABELS[role]})</span>
                  )}
                </dd>
              </div>
              <div>
                <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your privileges</dt>
                <dd data-testid="your-privileges" style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0", lineHeight: 1.5 }}>
                  {inherentPrivileges
                    ? "Both privileges come with your role."
                    : (myPrivileges.requestDocuments || myPrivileges.assignSigners)
                      ? [myPrivileges.requestDocuments && PRIVILEGE_LABELS.requestDocuments, myPrivileges.assignSigners && PRIVILEGE_LABELS.assignSigners].filter(Boolean).join(" · ")
                      : "None granted yet."}
                </dd>
              </div>
            </dl>
            <Link to="/app/workspace/roles" style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", display: "inline-block", marginTop: 12 }}>
              What your role can do →
            </Link>
          </section>

          <WorkspacesPanel />
        </aside>
      </div>
    </div>
  );
}
