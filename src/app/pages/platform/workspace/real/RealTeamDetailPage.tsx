// /app/workspace/teams/:teamId with a real backend — one organization unit:
// who is in it and the title each holds, rename, archive, add and remove
// people. Archiving is final on the backend, so there is no restore.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useViewport } from "../../../../hooks/useViewport";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { realOrganizationService } from "../../../../services/real/organization.service";
import { realWorkspaceAdminService } from "../../../../services/real/workspace-admin.service";
import {
  ORGANIZATION_UNIT_KIND_LABELS, type OrganizationUnit, type OrganizationUnitMember,
} from "../../../../models/organization";
import type { WorkspaceMemberSummary } from "../../../../models/workspace-admin";
import { Dialog, ErrorNote } from "../join/join-ui";
import { buttonStyle, inputStyle, labelStyle, hintStyle } from "../join/join-styles";
import { ManagePage, LoadingBlock, ErrorBlock, GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "./manage-ui";
import { cardStyle, LIGHT } from "./manage-styles";
import { errorMessage, formatDate } from "./manage-format";

const NAME_MAX = 120;

type Modal =
  | { kind: "rename" }
  | { kind: "archive" }
  | { kind: "add" }
  | { kind: "title"; member: OrganizationUnitMember }
  | { kind: "remove"; member: OrganizationUnitMember }
  | null;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

/** One text field and a Save — rename a team, or set someone's title in it. */
function TextDialog({ title, label, hint, initial, required, saveLabel, onClose, onSave }: {
  title: string; label: string; hint?: string; initial: string; required: boolean; saveLabel: string;
  onClose: () => void; onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    const trimmed = value.trim();
    if (required && trimmed === "") { setError(`Enter a ${label.toLowerCase()}.`); return; }
    if (trimmed.length > NAME_MAX) { setError(`Keep it under ${String(NAME_MAX)} characters.`); return; }
    setBusy(true);
    setError(null);
    try { await onSave(trimmed); } catch (err) {
      setError(errorMessage(err, "We couldn't save this change. Please try again."));
      setBusy(false);
    }
  }
  return (
    <Dialog title={title} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy} style={buttonStyle("primary", busy)}>{busy ? "Saving…" : saveLabel}</button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <label htmlFor="team-text-field" style={labelStyle}>{label}</label>
      <input id="team-text-field" value={value} onChange={e => setValue(e.target.value)} maxLength={NAME_MAX} style={inputStyle()} />
      {hint && <p style={hintStyle}>{hint}</p>}
    </Dialog>
  );
}

function ConfirmDialog({ title, body, confirmLabel, onClose, onConfirm }: {
  title: string; body: string; confirmLabel: string; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={title} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy} style={buttonStyle("danger", busy)}
          onClick={() => {
            setBusy(true);
            onConfirm().catch((err: unknown) => { setError(errorMessage(err, "We couldn't do that. Please try again.")); setBusy(false); });
          }}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, lineHeight: 1.6 }}>{body}</p>
    </Dialog>
  );
}

function AddMemberDialog({ candidates, onClose, onAdd }: {
  candidates: WorkspaceMemberSummary[]; onClose: () => void;
  onAdd: (userId: string, title: string | null) => Promise<void>;
}) {
  const [userId, setUserId] = useState(candidates[0]?.userId ?? "");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (userId === "") { setError("Choose a member to add."); return; }
    setBusy(true);
    setError(null);
    try { await onAdd(userId, title.trim() === "" ? null : title.trim()); } catch (err) {
      setError(errorMessage(err, "We couldn't add this member. Please try again."));
      setBusy(false);
    }
  }
  return (
    <Dialog title="Add a member to this team" onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy || candidates.length === 0} style={buttonStyle("primary", busy || candidates.length === 0)}>
          {busy ? "Adding…" : "Add to team"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      {candidates.length === 0 ? (
        <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0 }}>Everyone in the workspace is already in this team.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="team-add-member" style={labelStyle}>Member</label>
            <select id="team-add-member" value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle()}>
              {candidates.map(m => <option key={m.userId} value={m.userId}>{m.displayName} ({m.email})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="team-add-title" style={labelStyle}>Title in this team (optional)</label>
            <input id="team-add-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={NAME_MAX}
              placeholder="e.g. Department Head" style={inputStyle()} />
            <p style={hintStyle}>A title describes a position. It does not change what the person can do.</p>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function RealTeamDetailPage({ workspaceId, teamId }: { workspaceId: string; teamId: string }) {
  const access = useWorkspaceAccess();
  const { isNarrow } = useViewport();
  const [unit, setUnit] = useState<OrganizationUnit | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationUnitMember[] | null>(null);
  const [roster, setRoster] = useState<WorkspaceMemberSummary[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const canUpdate = access.can("unit.update");
  const canArchive = access.can("unit.archive");
  const canManageMembers = access.can("unit.member.manage");
  const canSeeRoster = access.can("membership.view");

  const load = useCallback(async () => {
    setError(null);
    try {
      const units = await realOrganizationService.listUnits(workspaceId);
      const found = units.find(u => u.unitId === teamId) ?? null;
      if (!found) { setState("missing"); return; }
      setUnit(found);
      setParentName(found.parentUnitId ? units.find(u => u.unitId === found.parentUnitId)?.name ?? null : null);
      setMembers(await realOrganizationService.listMembers(workspaceId, teamId));
      setState("ready");
    } catch (err) {
      setError(errorMessage(err, "We couldn't load this team."));
      setState("error");
    }
  }, [workspaceId, teamId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!canSeeRoster) return;
    let cancelled = false;
    realWorkspaceAdminService.listMembers(workspaceId)
      .then(list => { if (!cancelled) setRoster(list); })
      .catch(() => { if (!cancelled) setRoster(null); });
    return () => { cancelled = true; };
  }, [workspaceId, canSeeRoster]);

  const crumbs = [{ label: "Manage", to: "/app/workspace" }, { label: "Teams", to: "/app/workspace/teams" }, { label: unit?.name ?? "Team" }];

  if (state === "loading") return <ManagePage crumbs={crumbs} title="Team"><LoadingBlock label="Loading team…" /></ManagePage>;
  if (state === "error") return <ManagePage crumbs={crumbs} title="Team"><ErrorBlock message={error ?? "We couldn't load this team."} onRetry={() => void load()} /></ManagePage>;
  if (state === "missing" || !unit || !members) {
    return (
      <ManagePage crumbs={crumbs} title="Team not found">
        <div style={{ ...cardStyle, padding: 28, textAlign: "center" }}>
          <p style={{ ...GF, fontSize: 14, color: SLATE, margin: "0 0 10px" }}>This team does not exist in this workspace.</p>
          <Link to="/app/workspace/teams" style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none" }}>Back to Teams</Link>
        </div>
      </ManagePage>
    );
  }

  const active = unit.archivedAt === null;
  const membershipByUser = new Map((roster ?? []).filter(m => m.userId).map(m => [m.userId as string, m.id]));
  const inTeam = new Set(members.map(m => m.userId));
  const candidates = (roster ?? []).filter(m => m.userId && !inTeam.has(m.userId)).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const done = () => { setModal(null); void load(); };

  return (
    <ManagePage crumbs={crumbs} title={unit.name} maxWidth={760}
      badge={!active ? <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F1F5F9", color: "#475569" }}>Archived</span> : undefined}
      actions={active ? <>
        {canUpdate && <button type="button" onClick={() => setModal({ kind: "rename" })} style={buttonStyle("secondary")}>Rename</button>}
        {canArchive && <button type="button" onClick={() => setModal({ kind: "archive" })} style={buttonStyle("secondary")}>Archive</button>}
      </> : undefined}>
      <section aria-labelledby="team-members" style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 id="team-members" style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Members ({members.length})
          </h2>
          {active && canManageMembers && canSeeRoster && (
            <button type="button" onClick={() => setModal({ kind: "add" })} style={buttonStyle("primary")}>+ Add member</button>
          )}
        </div>
        {members.length === 0 ? (
          <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, padding: "28px 20px", textAlign: "center" }}>No members in this team yet.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {members.map(m => {
              const membershipId = membershipByUser.get(m.userId);
              return (
                <li key={m.userId} data-testid={`team-member-${m.userId}`}
                  style={{ display: "flex", alignItems: isNarrow ? "flex-start" : "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #F0F2F5", flexWrap: "wrap" }}>
                  <div aria-hidden style={{ width: 32, height: 32, borderRadius: "50%", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, color: AZURE, flexShrink: 0 }}>
                    {initials(m.displayName)}
                  </div>
                  <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                    {membershipId ? (
                      <Link to={`/app/workspace/members/${encodeURIComponent(membershipId)}`} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none", overflowWrap: "anywhere" }}>{m.displayName}</Link>
                    ) : (
                      <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>{m.displayName}</span>
                    )}
                    <div style={{ ...GF, fontSize: 12, color: SLATE, overflowWrap: "anywhere" }}>
                      {m.title ? <strong style={{ color: NAVY, fontWeight: 600 }}>{m.title}</strong> : "No title"}
                      <span style={{ ...GM, fontSize: 11, color: SILVER }}> · {m.email}</span>
                    </div>
                  </div>
                  {active && canManageMembers && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={() => setModal({ kind: "title", member: m })} aria-label={`Change title for ${m.displayName}`} style={buttonStyle("link")}>Title</button>
                      <button type="button" onClick={() => setModal({ kind: "remove", member: m })} aria-label={`Remove ${m.displayName} from team`} style={{ ...buttonStyle("link"), color: "#B42318" }}>Remove</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={{ ...cardStyle, marginTop: 16, padding: "16px 20px" }}>
        <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Details</h2>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: "10px 20px" }}>
          {[
            { label: "Kind", value: ORGANIZATION_UNIT_KIND_LABELS[unit.kind] ?? unit.kind },
            { label: "Part of", value: parentName ?? "Top level" },
            { label: "Created", value: formatDate(unit.createdAt) },
            ...(unit.archivedAt !== null ? [{ label: "Archived", value: formatDate(unit.archivedAt) }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</dt>
              <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0", overflowWrap: "anywhere" }}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {modal?.kind === "rename" && (
        <TextDialog title="Rename team" label="Name" initial={unit.name} required saveLabel="Save"
          onClose={() => setModal(null)}
          onSave={async name => { await realOrganizationService.updateUnit(workspaceId, unit.unitId, { name }); done(); }} />
      )}
      {modal?.kind === "archive" && (
        <ConfirmDialog title={`Archive ${unit.name}?`} confirmLabel="Archive team"
          body="The team stays on record but can no longer be changed or given new members. This cannot be undone."
          onClose={() => setModal(null)}
          onConfirm={async () => { await realOrganizationService.archiveUnit(workspaceId, unit.unitId); done(); }} />
      )}
      {modal?.kind === "add" && (
        <AddMemberDialog candidates={candidates} onClose={() => setModal(null)}
          onAdd={async (userId, title) => { await realOrganizationService.addMember(workspaceId, unit.unitId, { userId, ...(title ? { title } : {}) }); done(); }} />
      )}
      {modal?.kind === "title" && (
        <TextDialog title={`Title for ${modal.member.displayName}`} label="Title" initial={modal.member.title ?? ""} required={false} saveLabel="Save"
          hint="Leave it empty to clear the title. A title does not change what someone can do."
          onClose={() => setModal(null)}
          onSave={async title => { await realOrganizationService.setMemberTitle(workspaceId, unit.unitId, modal.member.userId, title === "" ? null : title); done(); }} />
      )}
      {modal?.kind === "remove" && (
        <ConfirmDialog title={`Remove ${modal.member.displayName}?`} confirmLabel="Remove from team"
          body="They leave this team but stay in the workspace."
          onClose={() => setModal(null)}
          onConfirm={async () => { await realOrganizationService.removeMember(workspaceId, unit.unitId, modal.member.userId); done(); }} />
      )}
    </ManagePage>
  );
}
