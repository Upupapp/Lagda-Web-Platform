// /app/workspace/people with a real backend — People & Teams.
//
// What used to be two parts and five tabs (People › Members, Invite people,
// Requests; Organisation › Teams, Organization units) is one page:
//
//   People & Teams   [Add from contacts] [Waiting to Join 2] [+ New team]
//   3 people · 3 teams   [Search people or teams…]
//   ┌ Not in a team yet ───────────────────────────────────────────────┐
//   └──────────────────────────────────────────────────────────────────┘
//   ┌──── workspace brand banner ────┐  ┌──── workspace brand banner ────┐
//   │ Finance · Department · 2       │  │ Litigation · Team · 1   NEW    │
//   │ (faces, titles)                │  │ (faces, titles)                │
//   │ ┃ Payroll · Team · 0           │  │                                │
//   └────────────────────────────────┘  └────────────────────────────────┘
//                                                         [Invite people]
//
// The teams take the whole width. "Add from contacts", "Waiting to Join" and
// "New team" are buttons beside the title, each opening its own panel in the
// middle of the page (a sheet from the bottom on a phone). A team card wears
// the workspace's own banner — its colour and logo — as the teams always
// did; a person's panel opens under the two-toned banner the Home dashboard
// uses.
//
// Teams and "organization units" were always the same thing on the backend
// (039's units: a kind, a parent and members with a title each), so they are
// drawn once, as a tree from the top down, newest first. A team is deleted for
// good (094) — only once it is empty: no people and no teams inside it. Clicking a person
// opens their panel in the middle of the page: their position in the team,
// moving them to another team, swapping positions with a teammate, their
// workspace role and access, and removing them — from the team, or from the
// workspace. Their personal details (name, email, photo) are theirs and are
// only shown.
//
// Moving, removing and adding run behind the two-second loading screen
// (process-screens.ts). A contact who is already a member joins the team at
// once; anyone else is invited to the workspace first, waits under "Waiting
// to join", and is placed with one click once they have joined.
//
// Every control is shown only to a role that may use it, and the backend
// re-checks every action.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import {
  Search, Plus, Network, UserPlus, Users, MoreHorizontal, Pencil, Trash2, ArrowLeftRight,
  ChevronRight, Mail, X, Contact, Clock,
} from "lucide-react";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { usePlatform } from "../../../../context/PlatformContext";
import { useDocumentCardBranding, type CardBranding } from "../../documents/CompletedDocumentCards";
import { BrandBand } from "../../settings/branding-preview";
import { brandGradient, BrandWaves } from "../../contacts/contacts-ui";
import { Z } from "../../../../utils/z-index";
import { realOrganizationService } from "../../../../services/real/organization.service";
import { realWorkspaceAdminService, REAL_ROLE_LABELS, type BackendWorkspaceRole } from "../../../../services/real/workspace-admin.service";
import { updateMemberAccess } from "../../../../services/real/workspace-join.service";
import { realContactService, type WireContact } from "../../../../services/real/contact.service";
import { useWorkspacePeople, memberAvatarUrl, refreshWorkspacePeople } from "../../../../services/real/workspace-people.service";
import {
  ORGANIZATION_UNIT_KINDS, ORGANIZATION_UNIT_KIND_LABELS,
  type OrganizationUnit, type OrganizationUnitKind, type OrganizationUnitMember,
} from "../../../../models/organization";
import type { WorkspaceMemberSummary, WorkspaceInvitation } from "../../../../models/workspace-admin";
import { isOwnerOrAdministratorRole } from "../../../../models/workspace-admin";
import { MemberAvatar } from "../../../../components/platform/MemberAvatar";
import { withProcess } from "../../../../config/process-screens";
import { InvitePeopleToggle } from "../../invitations/InvitePeoplePanel";
import { AccessEditor, Dialog, ErrorNote, type AccessDraft } from "../join/join-ui";
import { buttonStyle, inputStyle, labelStyle } from "../join/join-styles";
import { ManagePage, LoadingBlock, ErrorBlock, GF, NAVY, AZURE, SLATE, SILVER, BORDER } from "./manage-ui";
import { errorMessage, formatDate } from "./manage-format";

const CRUMBS = [{ label: "Workspace", to: "/app/workspace" }, { label: "People & Teams" }];
/** A button whose icon sits beside its label, never above it. */
const INLINE = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap" } as const;
const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const TITLE_MAX = 120;

// ── The data ───────────────────────────────────────────────────────────────

/** One person as the page knows them: the account, and the membership when visible. */
export interface Person {
  userId: string;
  name: string;
  email: string;
  /** Null when this reader cannot see the workspace's member list. */
  member: WorkspaceMemberSummary | null;
}

export interface TeamNode {
  unit: OrganizationUnit;
  members: OrganizationUnitMember[];
  children: TeamNode[];
}

/** Units into a tree, every level newest first. Archived units are left out. */
export function buildTeamTree(units: OrganizationUnit[], members: ReadonlyMap<string, OrganizationUnitMember[]>): TeamNode[] {
  const live = units.filter(u => u.archivedAt === null);
  const ids = new Set<string>(live.map(u => u.unitId));
  const byParent = new Map<string, OrganizationUnit[]>();
  for (const u of live) {
    const parent = u.parentUnitId !== null && ids.has(u.parentUnitId) ? u.parentUnitId : "";
    byParent.set(parent, [...(byParent.get(parent) ?? []), u]);
  }
  const build = (parent: string): TeamNode[] => (byParent.get(parent) ?? [])
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(unit => ({ unit, members: members.get(unit.unitId) ?? [], children: build(unit.unitId) }));
  return build("");
}

function flatten(nodes: TeamNode[]): TeamNode[] {
  return nodes.flatMap(n => [n, ...flatten(n.children)]);
}

interface PageData {
  units: OrganizationUnit[];
  unitMembers: Map<string, OrganizationUnitMember[]>;
  members: WorkspaceMemberSummary[] | null;
  invitations: WorkspaceInvitation[];
}

// ── The page ───────────────────────────────────────────────────────────────

export function RealPeopleTeamsPage({ workspaceId }: { workspaceId: string }) {
  const access = useWorkspaceAccess();
  const platform = usePlatform();
  const meId = platform.user?.id ?? null;
  const versions = useWorkspacePeople(workspaceId);
  const branding = useDocumentCardBranding();
  const [params, setParams] = useSearchParams();

  const canSeeMembers = access.can("membership.view");
  const may = {
    createTeam: access.can("unit.create"),
    renameTeam: access.can("unit.update"),
    deleteTeam: access.can("unit.archive"),
    placeMembers: access.can("unit.member.manage"),
    changeRole: access.can("membership.role.change"),
    removeMember: access.can("membership.remove"),
    seeInvitations: access.can("invitation.view"),
    invite: access.can("invitation.create"),
    contacts: access.can("contact.view"),
  };

  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<{ userId: string; unitId: string | null } | null>(null);
  const [dialog, setDialog] = useState<null | { kind: "new-team"; parent: string | null } | { kind: "rename"; unit: OrganizationUnit }
    | { kind: "delete"; unit: OrganizationUnit } | { kind: "add-people"; unit: OrganizationUnit } | { kind: "contacts" } | { kind: "waiting" }>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setError(null);
    try {
      const units = await realOrganizationService.listUnits(workspaceId);
      const live = units.filter(u => u.archivedAt === null);
      const [lists, members, invitations] = await Promise.all([
        Promise.all(live.map(u => realOrganizationService.listMembers(workspaceId, u.unitId))),
        canSeeMembers ? realWorkspaceAdminService.listMembers(workspaceId) : Promise.resolve(null),
        may.seeInvitations ? realWorkspaceAdminService.listInvitations(workspaceId).catch(() => []) : Promise.resolve([]),
      ]);
      if (seq !== loadSeq.current) return;
      setData({
        units,
        unitMembers: new Map<string, OrganizationUnitMember[]>(live.map((u, i) => [u.unitId, lists[i] ?? []])),
        members,
        invitations: invitations.filter(i => i.status === "pending"),
      });
    } catch (err) {
      if (seq === loadSeq.current) setError(errorMessage(err, "We couldn't load the people and teams."));
    }
  }, [workspaceId, canSeeMembers, may.seeInvitations]);

  useEffect(() => { void load(); }, [load]);

  const reload = useCallback(async (message?: string) => {
    if (message) setNotice(message);
    await load();
    void refreshWorkspacePeople(workspaceId);
  }, [load, workspaceId]);

  // ?member=<membership or user id> opens a person; ?team=<id> scrolls to a team.
  useEffect(() => {
    if (!data) return;
    const wanted = params.get("member");
    if (wanted) {
      const m = data.members?.find(x => x.id === wanted || x.userId === wanted);
      const userId = m?.userId ?? wanted;
      setOpen({ userId, unitId: null });
      setParams(prev => { const out = new URLSearchParams(prev); out.delete("member"); return out; }, { replace: true });
    }
    const team = params.get("team");
    if (team) {
      const el = document.querySelector<HTMLElement>(`[data-team-id="${CSS.escape(team)}"]`);
      if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [data, params, setParams]);

  const tree = useMemo(() => data ? buildTeamTree(data.units, data.unitMembers) : [], [data]);
  const allTeams = useMemo(() => flatten(tree), [tree]);

  const people = useMemo(() => {
    const map = new Map<string, Person>();
    for (const m of data?.members ?? []) {
      if (m.userId) map.set(m.userId, { userId: m.userId, name: m.displayName, email: m.email, member: m });
    }
    for (const list of data?.unitMembers.values() ?? []) {
      for (const u of list) if (!map.has(u.userId)) map.set(u.userId, { userId: u.userId, name: u.displayName, email: u.email, member: null });
    }
    return map;
  }, [data]);

  const teamsOf = useCallback((userId: string) => allTeams.filter(t => t.members.some(m => m.userId === userId)), [allTeams]);
  const unplaced = useMemo(() => (data?.members ?? []).filter(m => m.userId && teamsOf(m.userId).length === 0), [data, teamsOf]);
  const photo = useCallback((userId: string | null | undefined) => memberAvatarUrl(workspaceId, userId, versions), [workspaceId, versions]);

  const q = query.trim().toLowerCase();
  const matches = (name: string, email = "") => q === "" || name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  const nodeMatches = (n: TeamNode): boolean => q === "" || n.unit.name.toLowerCase().includes(q)
    || n.members.some(m => matches(m.displayName, m.email)) || n.children.some(nodeMatches);

  if (error) return <ManagePage crumbs={CRUMBS} title="People & Teams"><ErrorBlock message={error} onRetry={() => void load()} /></ManagePage>;
  if (!data) return <ManagePage crumbs={CRUMBS} title="People & Teams"><LoadingBlock label="Loading people and teams…" /></ManagePage>;

  const memberCount = data.members?.length ?? people.size;
  const contactsAllowed = may.contacts && (may.placeMembers || may.invite) && allTeams.length > 0;
  const openPerson = open ? people.get(open.userId) ?? null : null;

  const personButton = (p: { userId: string; name: string; email: string; line: string | null }, unitId: string | null) => (
    <li key={p.userId}>
      <button type="button" className="pt-person" data-testid={`person-${p.userId}`} onClick={() => { setOpen({ userId: p.userId, unitId }); }}>
        <MemberAvatar name={p.name} url={photo(p.userId)} size={40} />
        <span className="pt-person-text">
          <span className="pt-person-name">{p.name}{p.userId === meId && <span className="pt-you">You</span>}</span>
          <span className="pt-person-line">{p.line ?? p.email}</span>
        </span>
        <ChevronRight size={16} aria-hidden className="pt-person-go" />
      </button>
    </li>
  );

  const renderTeam = (node: TeamNode, depth: number): ReactNode => {
    if (!nodeMatches(node)) return null;
    const isNew = Date.now() - node.unit.createdAt < NEW_FOR_MS;
    const shownMembers = node.members.filter(m => matches(m.displayName, m.email) || node.unit.name.toLowerCase().includes(q));
    const count = `${String(node.members.length)} ${node.members.length === 1 ? "person" : "people"}`;
    const deleteBlock = node.members.length > 0
      ? `Remove the ${count} in it first`
      : node.children.length > 0 ? "Delete or move the teams inside it first" : null;
    const actions = (
      <div className="pt-team-actions">
        {may.placeMembers && canSeeMembers && (
          <button type="button" className="pt-mini" onClick={() => { setDialog({ kind: "add-people", unit: node.unit }); }}>
            <UserPlus size={14} aria-hidden /> <span className="pt-mini-label">Add people</span>
          </button>
        )}
        {(may.renameTeam || may.deleteTeam || may.createTeam) && (
          <TeamMenu
            onRename={may.renameTeam ? () => { setDialog({ kind: "rename", unit: node.unit }); } : undefined}
            onDelete={may.deleteTeam ? () => { setDialog({ kind: "delete", unit: node.unit }); } : undefined}
            deleteBlockedBecause={deleteBlock}
            onSubTeam={may.createTeam ? () => { setDialog({ kind: "new-team", parent: node.unit.unitId }); } : undefined} />
        )}
      </div>
    );
    const body = (
      <>
        {shownMembers.length > 0 ? (
          <ul className="pt-people">
            {shownMembers.map(m => personButton({
              userId: m.userId, name: m.displayName, email: m.email,
              line: m.title ?? (people.get(m.userId)?.member ? roleLine(people.get(m.userId)!.member!) : null),
            }, node.unit.unitId))}
          </ul>
        ) : q === "" && (
          <p className="pt-empty">No one in this team yet.{may.placeMembers && " Use Add people, or Add from contacts."}</p>
        )}
        {node.children.length > 0 && (
          <div className="pt-children">{node.children.map(c => renderTeam(c, depth + 1))}</div>
        )}
      </>
    );
    if (depth > 0) {
      // A team inside a team: a lighter card, edged in the workspace colour.
      return (
        <section key={node.unit.unitId} className="pt-sub" data-team-id={node.unit.unitId} data-depth={depth}
          aria-label={node.unit.name} style={{ borderLeftColor: branding.primaryColor }}>
          <header className="pt-team-head">
            <div className="pt-team-title">
              <h3>{node.unit.name}</h3>
              <span className="pt-team-meta">{ORGANIZATION_UNIT_KIND_LABELS[node.unit.kind]} · {count}{isNew && <span className="pt-new">New</span>}</span>
            </div>
            {actions}
          </header>
          {body}
        </section>
      );
    }
    return (
      <section key={node.unit.unitId} className="pt-team pt-team-branded" data-team-id={node.unit.unitId} data-depth={depth}
        aria-label={node.unit.name}>
        <div className="pt-team-band">
          <BrandBand variant="card" compact testId={`team-${node.unit.unitId}-banner`}
            subtitle={`${ORGANIZATION_UNIT_KIND_LABELS[node.unit.kind]} · ${count}`}
            branding={{ displayName: branding.displayName, primaryColor: branding.primaryColor, logoPreviewUrl: branding.logoUrl }}
            headerAside={isNew ? <span className="pt-new pt-new-on-band">New</span> : undefined} />
        </div>
        <div className="pt-team-inner">
          <header className="pt-team-head">
            <div className="pt-team-title"><h3>{node.unit.name}</h3></div>
            {actions}
          </header>
          {body}
        </div>
      </section>
    );
  };

  const contactsPanel = (
    <ContactsToTeam workspaceId={workspaceId} teams={allTeams} people={people} invitations={data.invitations}
      mayPlace={may.placeMembers} mayInvite={may.invite}
      onDone={(message) => { setDialog(null); void reload(message); }} />
  );

  return (
    <ManagePage crumbs={CRUMBS} title="People & Teams" maxWidth={1240}
      actions={(
        <div className="pt-actions" role="group" aria-label="People & Teams actions">
          {contactsAllowed && (
            <button type="button" className="pt-action" onClick={() => { setDialog({ kind: "contacts" }); }} data-testid="open-contacts">
              <Contact size={16} aria-hidden /> <span>Add from contacts</span>
            </button>
          )}
          {may.seeInvitations && (
            <button type="button" className="pt-action" aria-pressed={dialog?.kind === "waiting"} onClick={() => { setDialog({ kind: "waiting" }); }} data-testid="open-waiting">
              <Clock size={16} aria-hidden /> <span>Waiting to Join</span>
              {data.invitations.length > 0 && <span className="pt-action-count" aria-label={`${String(data.invitations.length)} waiting`}>{data.invitations.length}</span>}
            </button>
          )}
          {may.createTeam && (
            <button type="button" className="pt-action pt-action-primary" onClick={() => { setDialog({ kind: "new-team", parent: null }); }} data-testid="new-team">
              <Plus size={16} aria-hidden /> <span>New team</span>
            </button>
          )}
        </div>
      )}>
      <style>{PEOPLE_TEAMS_CSS}</style>
      <div className="pt-toolbar">
        <p className="pt-summary">
          <Users size={15} aria-hidden /> {memberCount} {memberCount === 1 ? "person" : "people"}
          <span aria-hidden>·</span>
          <Network size={15} aria-hidden /> {allTeams.length} {allTeams.length === 1 ? "team" : "teams"}
        </p>
        <label className="pt-search">
          <Search size={15} aria-hidden color={SILVER} />
          <span className="pt-sr">Search people and teams</span>
          <input type="search" value={query} onChange={e => { setQuery(e.target.value); }} placeholder="Search people or teams…" data-testid="people-search" />
        </label>
      </div>
      <div aria-live="polite">{notice && <p className="pt-notice" role="status">{notice}<button type="button" aria-label="Dismiss" onClick={() => { setNotice(null); }}><X size={14} /></button></p>}</div>

      <div className="pt-main">
        {unplaced.length > 0 && unplaced.some(m => matches(m.displayName, m.email)) && (
          <section className="pt-team pt-unplaced" aria-label="Not in a team yet" data-testid="not-in-team">
            <header className="pt-team-head">
              <span className="pt-team-icon" aria-hidden style={{ background: "#FEF3C7", color: "#92400E" }}><Users size={16} /></span>
              <div className="pt-team-title">
                <h3>Not in a team yet</h3>
                <span className="pt-team-meta">New joiners land here. Open someone to place them in a team.</span>
              </div>
            </header>
            <ul className="pt-people">
              {unplaced.filter(m => matches(m.displayName, m.email)).map(m => personButton({ userId: m.userId!, name: m.displayName, email: m.email, line: roleLine(m) }, null))}
            </ul>
          </section>
        )}

        {tree.length === 0 ? (
          <div className="pt-team pt-blank">
            <Network size={28} aria-hidden color={SILVER} />
            <h3>No teams yet</h3>
            <p>Teams group people — a department, an office, a project. {may.createTeam ? "Create the first one with New team." : "An owner or administrator can create them."}</p>
          </div>
        ) : (
          <div className="pt-tree" data-testid="team-tree">{tree.map(n => renderTeam(n, 0))}</div>
        )}
      </div>

      {openPerson && (
        <MemberPanel workspaceId={workspaceId} person={openPerson} unitId={open?.unitId ?? null} branding={branding}
          teams={allTeams} teamsOfPerson={teamsOf(openPerson.userId)} meId={meId} photo={photo(openPerson.userId)} may={may}
          onClose={() => { setOpen(null); }}
          onChanged={(message, close) => { if (close) setOpen(null); void reload(message); }} />
      )}

      {dialog?.kind === "new-team" && (
        <TeamFormDialog title={dialog.parent ? "New sub-team" : "New team"} teams={allTeams} parent={dialog.parent}
          onClose={() => { setDialog(null); }}
          onSave={async (name, kind, parent) => {
            await withProcess("team-create", name, () => realOrganizationService.createUnit(workspaceId, { name, kind, ...(parent ? { parentUnitId: parent } : {}) }));
            setDialog(null);
            await reload(`${name} was created. Add people to it next.`);
          }} />
      )}
      {dialog?.kind === "rename" && (
        <RenameDialog unit={dialog.unit} onClose={() => { setDialog(null); }}
          onSave={async name => {
            const unit = dialog.unit;
            await withProcess("team-rename", "", () => realOrganizationService.updateUnit(workspaceId, unit.unitId, { name }));
            setDialog(null);
            await reload(`The team is now called ${name}.`);
          }} />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog title={`Delete ${dialog.unit.name}?`} confirmLabel="Delete team" danger
          body="This deletes the team for good — it cannot be undone. The Activity log keeps its name in the history."
          onClose={() => { setDialog(null); }}
          onConfirm={async () => {
            const unit = dialog.unit;
            await withProcess("team-delete", unit.name, () => realOrganizationService.deleteUnit(workspaceId, unit.unitId));
            setDialog(null);
            await reload(`${unit.name} was deleted.`);
          }} />
      )}
      {dialog?.kind === "add-people" && (
        <AddPeopleDialog unit={dialog.unit} candidates={(data.members ?? []).filter(m => m.userId && !(data.unitMembers.get(dialog.unit.unitId) ?? []).some(u => u.userId === m.userId))}
          photo={photo} onClose={() => { setDialog(null); }}
          onAdd={async member => {
            const unit = dialog.unit;
            await withProcess("team-member-add", `${member.displayName} to ${unit.name}`, () => realOrganizationService.addMember(workspaceId, unit.unitId, { userId: member.userId! }));
            setDialog(null);
            await reload(`${member.displayName} is now in ${unit.name}.`);
          }} />
      )}
      {dialog?.kind === "waiting" && (
        <Dialog title="Waiting to Join" onClose={() => { setDialog(null); }}
          footer={<button type="button" onClick={() => { setDialog(null); }} style={buttonStyle("secondary")}>Close</button>}>
          <div data-testid="waiting-to-join">
            <p className="pt-dialog-lead">Invited, not joined yet. Once they join they appear under Not in a team yet, ready to be placed.</p>
            {data.invitations.length === 0 ? (
              <p className="pt-empty">No one is waiting. Invite people with the button at the lower right.</p>
            ) : (
              <ul className="pt-contact-list">
                {data.invitations.map(i => (
                  <li key={i.id}>
                    <span className="pt-invited" aria-hidden><Mail size={16} /></span>
                    <span className="pt-person-text"><span className="pt-person-name">{i.email}</span>
                      <span className="pt-person-line">Invited {formatDate(i.sentAt)} · {i.roleName}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog>
      )}
      {dialog?.kind === "contacts" && (
        <Dialog title="Add from contacts" onClose={() => { setDialog(null); }}
          footer={<button type="button" onClick={() => { setDialog(null); }} style={buttonStyle("secondary")}>Done</button>}>
          {contactsPanel}
        </Dialog>
      )}

      <InvitePeopleToggle workspaceId={workspaceId} onChanged={() => void reload()} />
    </ManagePage>
  );
}

function roleLine(m: WorkspaceMemberSummary): string {
  const role = m.roleId as BackendWorkspaceRole;
  const label = REAL_ROLE_LABELS[role] ?? m.roleName;
  if (role === "member") return m.roleTitle ?? label;
  return m.roleTitle ? `${label} · ${m.roleTitle}` : label;
}

// ── The team's menu ───────────────────────────────────────────────────────

function TeamMenu({ onRename, onDelete, deleteBlockedBecause, onSubTeam }: {
  onRename?: () => void; onDelete?: () => void; deleteBlockedBecause: string | null; onSubTeam?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [open]);
  const item = (label: string, icon: ReactNode, run?: () => void) => run && (
    <button type="button" role="menuitem" onClick={() => { setOpen(false); run(); }}>{icon}{label}</button>
  );
  return (
    <div className="pt-menu" ref={ref}>
      <button type="button" className="pt-mini pt-icon-only" aria-label="Team options" aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(v => !v); }}>
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="pt-menu-list">
          {item("Add a sub-team", <Plus size={14} aria-hidden />, onSubTeam)}
          {item("Rename", <Pencil size={14} aria-hidden />, onRename)}
          {onDelete && (deleteBlockedBecause === null
            ? <button type="button" role="menuitem" className="pt-menu-danger" data-testid="delete-team" onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={14} aria-hidden />Delete team</button>
            : <button type="button" role="menuitem" aria-disabled="true" disabled className="pt-menu-disabled" data-testid="delete-team" title={deleteBlockedBecause}>
                <Trash2 size={14} aria-hidden /><span>Delete team<small>{deleteBlockedBecause}</small></span>
              </button>)}
        </div>
      )}
    </div>
  );
}

// ── A person's panel ─────────────────────────────────────────────────────

const CHANGEABLE_ROLES: BackendWorkspaceRole[] = ["administrator", "template_administrator", "sender", "reviewer", "auditor", "member"];

function MemberPanel({ workspaceId, person, unitId, branding, teams, teamsOfPerson, meId, photo, may, onClose, onChanged }: {
  workspaceId: string;
  branding: CardBranding;
  person: Person;
  /** The team the person was opened from (null: not in a team, or from a link). */
  unitId: string | null;
  teams: TeamNode[];
  teamsOfPerson: TeamNode[];
  meId: string | null;
  photo?: string | undefined;
  may: { placeMembers: boolean; changeRole: boolean; removeMember: boolean };
  onClose: () => void;
  onChanged: (message: string, close: boolean) => void;
}) {
  const member = person.member;
  const isMe = person.userId === meId;
  const isOwner = member?.isOwner === true;
  const context = (unitId ? teams.find(t => t.unit.unitId === unitId) : undefined) ?? teamsOfPerson[0];
  const inContext = context?.members.find(m => m.userId === person.userId);
  const [title, setTitle] = useState(inContext?.title ?? "");
  const [moveTo, setMoveTo] = useState("");
  const [swapWith, setSwapWith] = useState("");
  const [role, setRole] = useState<string>(member?.roleId ?? "member");
  const [accessDraft, setAccessDraft] = useState<AccessDraft>({
    roleTitle: member?.roleTitle ?? "", canRequestDocuments: member?.canRequestDocuments === true, canAssignSigners: member?.canAssignSigners === true,
  });
  const [confirmRemove, setConfirmRemove] = useState<"team" | "workspace" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [busy, onClose]);

  const run = async (work: () => Promise<void>, message: string, close = false) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      onChanged(message, close);
    } catch (err) {
      setError(errorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const moveTargets = teams.filter(t => t.unit.unitId !== context?.unit.unitId && !t.members.some(m => m.userId === person.userId));
  const teammates = context ? context.members.filter(m => m.userId !== person.userId) : [];
  const inherent = member ? isOwnerOrAdministratorRole(member.roleId) : false;
  const canEditMember = !!member && may.changeRole && !isOwner;

  return (
    <div className="pt-scrim" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }} style={{ zIndex: Z.modal }}>
      <div role="dialog" aria-modal="true" aria-label={`${person.name}'s details`} data-testid="member-panel"
        className="pt-panel">
        <div className="pt-panel-band" style={{ backgroundImage: brandGradient(branding.primaryColor) }} data-testid="member-panel-band">
          <BrandWaves />
          <span className="pt-panel-brand">
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt="" />
              : <span aria-hidden>{branding.displayName.split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase()}</span>}
            <span className="pt-panel-brand-name">{branding.displayName}</span>
          </span>
          <button type="button" className="pt-panel-close" aria-label="Close" onClick={onClose} disabled={busy}><X size={18} aria-hidden /></button>
        </div>
        <div className="pt-panel-head">
          <span className="pt-panel-avatar"><MemberAvatar name={person.name} url={photo} size={88} ring /></span>
          <div style={{ minWidth: 0 }}>
            <h2>{person.name}{isMe && <span className="pt-you">You</span>}</h2>
            <p className="pt-panel-email">{person.email}</p>
            {member && <p className="pt-panel-role">{roleLine(member)}{isOwner && " · Workspace owner"}</p>}
          </div>
        </div>
        <p className="pt-panel-note">Name, email and photo are theirs to change, in their own profile.</p>
        {error && <ErrorNote>{error}</ErrorNote>}

        {/* Teams */}
        <section className="pt-panel-sec" aria-label="Team">
          <h3>Team</h3>
          <div className="pt-chips">
            {teamsOfPerson.length === 0 ? <span className="pt-chip pt-chip-muted">Not in a team yet</span>
              : teamsOfPerson.map(t => <span key={t.unit.unitId} className="pt-chip">{t.unit.name}</span>)}
          </div>
          {may.placeMembers && moveTargets.length > 0 && (
            <div className="pt-row">
              <label className="pt-field">
                <span style={labelStyle}>{context ? `Move from ${context.unit.name} to` : "Place in"}</span>
                <select value={moveTo} onChange={e => { setMoveTo(e.target.value); }} style={inputStyle()} data-testid="move-to">
                  <option value="">Choose a team…</option>
                  {moveTargets.map(t => <option key={t.unit.unitId} value={t.unit.unitId}>{t.unit.name}</option>)}
                </select>
              </label>
              <button type="button" disabled={busy || moveTo === ""} style={buttonStyle("primary", busy || moveTo === "")} data-testid="move-member"
                onClick={() => {
                  const target = teams.find(t => t.unit.unitId === moveTo);
                  if (!target) return;
                  const from = context;
                  void run(() => withProcess("member-move", `${person.name} to ${target.unit.name}`, async () => {
                    await realOrganizationService.addMember(workspaceId, target.unit.unitId, { userId: person.userId, title: from ? inContext?.title ?? null : null });
                    if (from) await realOrganizationService.removeMember(workspaceId, from.unit.unitId, person.userId);
                  }), `${person.name} is now in ${target.unit.name}.`);
                }}>{context ? "Move" : "Place"}</button>
            </div>
          )}
        </section>

        {/* Position in the team */}
        {context && inContext && may.placeMembers && (
          <section className="pt-panel-sec" aria-label="Position">
            <h3>Position in {context.unit.name}</h3>
            <div className="pt-row">
              <label className="pt-field">
                <span style={labelStyle}>Title</span>
                <input value={title} maxLength={TITLE_MAX} onChange={e => { setTitle(e.target.value); }} placeholder="e.g. Department Head" style={inputStyle()} data-testid="position-title" />
              </label>
              <button type="button" disabled={busy || title.trim() === (inContext.title ?? "")} style={buttonStyle("secondary", busy)}
                onClick={() => {
                  const next = title.trim() === "" ? null : title.trim();
                  void run(() => withProcess("member-title", "", () => realOrganizationService.setMemberTitle(workspaceId, context.unit.unitId, person.userId, next)),
                    `${person.name}'s position was saved.`);
                }}>Save</button>
            </div>
            {teammates.length > 0 && (
              <div className="pt-row">
                <label className="pt-field">
                  <span style={labelStyle}>Swap position with</span>
                  <select value={swapWith} onChange={e => { setSwapWith(e.target.value); }} style={inputStyle()} data-testid="swap-with">
                    <option value="">Choose a teammate…</option>
                    {teammates.map(m => <option key={m.userId} value={m.userId}>{m.displayName}{m.title ? ` — ${m.title}` : ""}</option>)}
                  </select>
                </label>
                <button type="button" disabled={busy || swapWith === ""} style={{ ...buttonStyle("secondary", busy || swapWith === ""), ...INLINE }} data-testid="swap-member"
                  onClick={() => {
                    const other = teammates.find(m => m.userId === swapWith);
                    if (!other) return;
                    void run(() => withProcess("member-swap", other.displayName, async () => {
                      await realOrganizationService.setMemberTitle(workspaceId, context.unit.unitId, person.userId, other.title);
                      await realOrganizationService.setMemberTitle(workspaceId, context.unit.unitId, other.userId, inContext.title);
                    }), `${person.name} and ${other.displayName} swapped positions.`);
                  }}><ArrowLeftRight size={14} aria-hidden /> Swap</button>
              </div>
            )}
          </section>
        )}

        {/* Workspace role and access */}
        {canEditMember && member && (
          <section className="pt-panel-sec" aria-label="Role and access">
            <h3>Role and access</h3>
            {!isMe && (
              <div className="pt-row">
                <label className="pt-field">
                  <span style={labelStyle}>Workspace role</span>
                  <select value={role} onChange={e => { setRole(e.target.value); }} style={inputStyle()} data-testid="member-role">
                    {CHANGEABLE_ROLES.map(r => <option key={r} value={r}>{REAL_ROLE_LABELS[r]}</option>)}
                  </select>
                </label>
                <button type="button" disabled={busy || role === member.roleId} style={buttonStyle("secondary", busy || role === member.roleId)}
                  onClick={() => {
                    void run(() => withProcess("member-role", "", async () => {
                      await realWorkspaceAdminService.changeMemberRole(workspaceId, member.id, role as BackendWorkspaceRole);
                    }), `${person.name} is now ${REAL_ROLE_LABELS[role as BackendWorkspaceRole]}.`);
                  }}>Change role</button>
              </div>
            )}
            <AccessEditor value={accessDraft} onChange={setAccessDraft} privilegesInherent={inherent} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" disabled={busy} style={buttonStyle("secondary", busy)} data-testid="save-access"
                onClick={() => {
                  void run(() => withProcess("member-access", "", () => updateMemberAccess(workspaceId, member.id, inherent
                    ? { roleTitle: accessDraft.roleTitle }
                    : { roleTitle: accessDraft.roleTitle, canRequestDocuments: accessDraft.canRequestDocuments, canAssignSigners: accessDraft.canAssignSigners })),
                    `${person.name}'s access was saved.`);
                }}>Save access</button>
            </div>
          </section>
        )}

        {/* Removing */}
        {((context && inContext && may.placeMembers) || (member && may.removeMember && !isOwner && !isMe)) && (
          <section className="pt-panel-sec pt-danger" aria-label="Remove">
            <h3>Remove</h3>
            {confirmRemove === null ? (
              <div className="pt-row pt-row-wrap">
                {context && inContext && may.placeMembers && (
                  <button type="button" disabled={busy} style={buttonStyle("secondary", busy)} data-testid="remove-from-team"
                    onClick={() => { setConfirmRemove("team"); }}>Remove from {context.unit.name}</button>
                )}
                {member && may.removeMember && !isOwner && !isMe && (
                  <button type="button" disabled={busy} style={buttonStyle("danger", busy)} data-testid="remove-from-workspace"
                    onClick={() => { setConfirmRemove("workspace"); }}>Remove from workspace</button>
                )}
              </div>
            ) : (
              <div className="pt-confirm" role="alert">
                <p>{confirmRemove === "team"
                  ? `Remove ${person.name} from ${context?.unit.name ?? "this team"}? They stay in the workspace.`
                  : `Remove ${person.name} from the workspace? They lose access to its documents, contacts and teams.`}</p>
                <div className="pt-row pt-row-wrap">
                  <button type="button" disabled={busy} style={buttonStyle("secondary", busy)} onClick={() => { setConfirmRemove(null); }}>Cancel</button>
                  <button type="button" disabled={busy} style={buttonStyle("danger", busy)} data-testid="confirm-remove"
                    onClick={() => {
                      if (confirmRemove === "team" && context) {
                        void run(() => withProcess("team-member-remove", person.name, () => realOrganizationService.removeMember(workspaceId, context.unit.unitId, person.userId)),
                          `${person.name} was removed from ${context.unit.name}.`, true);
                      } else if (member) {
                        void run(() => withProcess("member-remove", "", () => realWorkspaceAdminService.removeMember(workspaceId, member.id)),
                          `${person.name} was removed from the workspace.`, true);
                      }
                    }}>{confirmRemove === "team" ? "Remove from team" : "Remove from workspace"}</button>
                </div>
              </div>
            )}
          </section>
        )}
        {member && <p className="pt-panel-foot">Joined {formatDate(member.joinedAt)}</p>}
      </div>
    </div>
  );
}

// ── Contacts → a team ──────────────────────────────────────────────────────

function ContactsToTeam({ workspaceId, teams, people, invitations, mayPlace, mayInvite, onDone }: {
  workspaceId: string;
  teams: TeamNode[];
  people: ReadonlyMap<string, Person>;
  invitations: WorkspaceInvitation[];
  mayPlace: boolean;
  mayInvite: boolean;
  onDone: (message: string) => void;
}) {
  const [team, setTeam] = useState(teams[0]?.unit.unitId ?? "");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<WireContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(() => {
      const trimmed = search.trim();
      realContactService.list(workspaceId, { ...(trimmed ? { search: trimmed } : {}), state: "active", perPage: 25, sort: "name", direction: "asc" })
        .then(page => { if (id === seq.current) setContacts(page.items); })
        .catch(err => { if (id === seq.current) setError(errorMessage(err, "We couldn't load your contacts.")); });
    }, search ? 250 : 0);
    return () => { clearTimeout(t); };
  }, [workspaceId, search]);

  const byEmail = useMemo(() => new Map([...people.values()].map(p => [p.email.toLowerCase(), p])), [people]);
  const invited = useMemo(() => new Set(invitations.map(i => i.email.toLowerCase())), [invitations]);
  const target = teams.find(t => t.unit.unitId === team);

  async function add(c: WireContact) {
    if (!target) return;
    const person = byEmail.get(c.email.toLowerCase());
    setBusy(c.contactId);
    setError(null);
    try {
      if (person) {
        await withProcess("contact-to-team", `${c.name} to ${target.unit.name}`,
          () => realOrganizationService.addMember(workspaceId, target.unit.unitId, { userId: person.userId }));
        onDone(`${c.name} is now in ${target.unit.name}.`);
      } else {
        await withProcess("contact-to-team", c.name,
          () => realWorkspaceAdminService.sendInvitation(workspaceId, { email: c.email, roleId: "member" as never }, crypto.randomUUID()));
        onDone(`${c.name} was invited to the workspace. Place them in ${target.unit.name} once they join.`);
      }
    } catch (err) {
      setError(errorMessage(err, "That contact could not be added."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pt-contacts" data-testid="contacts-panel">
      <div className="pt-contacts-head">
        <p>Members join the team at once. Anyone else is invited to the workspace first.</p>
      </div>
      <label className="pt-field">
        <span style={labelStyle}>Add to team</span>
        <select value={team} onChange={e => { setTeam(e.target.value); }} style={inputStyle()} data-testid="contacts-team">
          {teams.map(t => <option key={t.unit.unitId} value={t.unit.unitId}>{t.unit.name}</option>)}
        </select>
      </label>
      <label className="pt-search pt-search-full">
        <Search size={15} aria-hidden color={SILVER} />
        <span className="pt-sr">Search contacts</span>
        <input type="search" value={search} onChange={e => { setSearch(e.target.value); }} placeholder="Search contacts…" />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      {contacts === null ? <p className="pt-empty">Loading contacts…</p> : contacts.length === 0 ? (
        <p className="pt-empty">{search ? "No contacts match." : "No contacts yet. Add some under Contacts."}</p>
      ) : (
        <ul className="pt-contact-list">
          {contacts.map(c => {
            const person = byEmail.get(c.email.toLowerCase());
            const inTeam = person && target?.members.some(m => m.userId === person.userId);
            const pending = !person && invited.has(c.email.toLowerCase());
            const allowed = person ? mayPlace : mayInvite;
            return (
              <li key={c.contactId} data-testid={`contact-${c.contactId}`}>
                <MemberAvatar name={c.name} size={32} />
                <span className="pt-person-text">
                  <span className="pt-person-name">{c.name}</span>
                  <span className="pt-person-line">{person ? "Member" : pending ? "Invited — waiting to join" : c.email}</span>
                </span>
                {inTeam ? <span className="pt-chip pt-chip-muted">In team</span> : pending ? null : allowed && (
                  <button type="button" className="pt-mini" disabled={busy !== null || !target} onClick={() => void add(c)}>
                    {person ? <><Plus size={14} aria-hidden /> Add</> : <><Mail size={14} aria-hidden /> Invite</>}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Small dialogs ─────────────────────────────────────────────────────────

function TeamFormDialog({ title, teams, parent, onClose, onSave }: {
  title: string; teams: TeamNode[]; parent: string | null; onClose: () => void;
  onSave: (name: string, kind: OrganizationUnitKind, parent: string | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OrganizationUnitKind>("team");
  const [under, setUnder] = useState(parent ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={title} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy} style={buttonStyle("primary", busy)} data-testid="save-team"
          onClick={() => {
            const trimmed = name.trim();
            if (trimmed === "") { setError("Enter a name for the team."); return; }
            setBusy(true);
            onSave(trimmed, kind, under || null).catch(err => { setError(errorMessage(err, "The team could not be created.")); setBusy(false); });
          }}>Create team</button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <label className="pt-field"><span style={labelStyle}>Name</span>
        <input value={name} maxLength={120} onChange={e => { setName(e.target.value); }} style={inputStyle(!!error)} placeholder="e.g. Finance" data-testid="team-name" />
      </label>
      <label className="pt-field"><span style={labelStyle}>Kind</span>
        <select value={kind} onChange={e => { setKind(e.target.value as OrganizationUnitKind); }} style={inputStyle()}>
          {ORGANIZATION_UNIT_KINDS.map(k => <option key={k} value={k}>{ORGANIZATION_UNIT_KIND_LABELS[k]}</option>)}
        </select>
      </label>
      <label className="pt-field"><span style={labelStyle}>Part of</span>
        <select value={under} onChange={e => { setUnder(e.target.value); }} style={inputStyle()}>
          <option value="">Nothing — a top-level team</option>
          {teams.map(t => <option key={t.unit.unitId} value={t.unit.unitId}>{t.unit.name}</option>)}
        </select>
      </label>
    </Dialog>
  );
}

function RenameDialog({ unit, onClose, onSave }: { unit: OrganizationUnit; onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(unit.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={`Rename ${unit.name}`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy || name.trim() === "" || name.trim() === unit.name} style={buttonStyle("primary", busy)}
          onClick={() => { setBusy(true); onSave(name.trim()).catch(err => { setError(errorMessage(err, "The team could not be renamed.")); setBusy(false); }); }}>Save</button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <label className="pt-field"><span style={labelStyle}>Name</span>
        <input value={name} maxLength={120} onChange={e => { setName(e.target.value); }} style={inputStyle()} />
      </label>
    </Dialog>
  );
}

function ConfirmDialog({ title, body, confirmLabel, danger = false, onClose, onConfirm }: {
  title: string; body: string; confirmLabel: string; danger?: boolean; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={title} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" disabled={busy} style={buttonStyle(danger ? "danger" : "primary", busy)}
          onClick={() => { setBusy(true); onConfirm().catch(err => { setError(errorMessage(err, "That didn't work.")); setBusy(false); }); }}>{confirmLabel}</button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0, lineHeight: 1.6 }}>{body}</p>
    </Dialog>
  );
}

function AddPeopleDialog({ unit, candidates, photo, onClose, onAdd }: {
  unit: OrganizationUnit; candidates: WorkspaceMemberSummary[]; photo: (userId: string | undefined) => string | undefined;
  onClose: () => void; onAdd: (member: WorkspaceMemberSummary) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = candidates.filter(m => q.trim() === "" || m.displayName.toLowerCase().includes(q.trim().toLowerCase()) || m.email.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog title={`Add people to ${unit.name}`} onClose={onClose}
      footer={<button type="button" onClick={onClose} style={buttonStyle("secondary")}>Done</button>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <label className="pt-search pt-search-full">
        <Search size={15} aria-hidden color={SILVER} />
        <span className="pt-sr">Search members</span>
        <input type="search" value={q} onChange={e => { setQ(e.target.value); }} placeholder="Search members…" />
      </label>
      {shown.length === 0 ? <p className="pt-empty">{candidates.length === 0 ? "Everyone in the workspace is already in this team." : "No one matches."}</p> : (
        <ul className="pt-contact-list">
          {shown.map(m => (
            <li key={m.id}>
              <MemberAvatar name={m.displayName} url={photo(m.userId)} size={32} />
              <span className="pt-person-text"><span className="pt-person-name">{m.displayName}</span><span className="pt-person-line">{roleLine(m)}</span></span>
              <button type="button" className="pt-mini" disabled={busy}
                onClick={() => { setBusy(true); onAdd(m).catch(err => { setError(errorMessage(err, "They could not be added.")); setBusy(false); }); }}>
                <Plus size={14} aria-hidden /> Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

const PEOPLE_TEAMS_CSS = `
.pt-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

/* Actions beside the title: contacts, waiting, new team. */
.pt-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.pt-action { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 0 14px;
  font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 600; color: ${NAVY}; background: #FFFFFF; border: 1px solid #D1D9E0;
  border-radius: 10px; cursor: pointer; white-space: nowrap; transition: border-color 120ms ease, background 120ms ease, color 120ms ease; }
.pt-action:hover { border-color: ${AZURE}; color: ${AZURE}; }
.pt-action:focus-visible { outline: 3px solid rgba(0,120,212,0.4); outline-offset: 2px; }
.pt-action[aria-pressed="true"] { background: #EBF4FC; border-color: ${AZURE}; color: ${AZURE}; }
.pt-action-primary { background: ${AZURE}; border-color: ${AZURE}; color: #FFFFFF; box-shadow: 0 6px 16px -8px rgba(0,120,212,0.7); }
.pt-action-primary:hover { background: #0A6BC0; color: #FFFFFF; }
.pt-action-count { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #DC2626; color: #FFFFFF; font-size: 11px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center; }

.pt-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-bottom: 14px; }
.pt-summary { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-family: 'Geist', sans-serif; font-size: 13px; color: ${SLATE}; font-weight: 600; }
.pt-search { display: flex; align-items: center; gap: 8px; flex: 1 1 240px; max-width: 420px; border: 1.5px solid #D1D9E0; border-radius: 10px; padding: 0 10px; background: #FFFFFF; min-height: 40px; }
.pt-search-full { max-width: none; flex: none; width: 100%; box-sizing: border-box; margin: 10px 0; }
.pt-search:focus-within { border-color: ${AZURE}; }
.pt-search input { border: none; outline: none; flex: 1; min-width: 0; font-family: 'Geist', sans-serif; font-size: 13px; color: ${NAVY}; background: transparent; }
.pt-notice { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-family: 'Geist', sans-serif; font-size: 13px; color: #14532D;
  background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 10px 14px; margin: 0 0 14px; }
.pt-notice button { border: none; background: none; cursor: pointer; color: #14532D; display: inline-flex; }
.pt-dialog-lead { font-family: 'Geist', sans-serif; font-size: 13px; color: ${SLATE}; margin: 0 0 10px; line-height: 1.5; }

/* The teams take the whole width: one column, two on a wide screen. */
.pt-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; padding-bottom: 88px; }
.pt-tree { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
@media (min-width: 1200px) { .pt-tree { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.pt-team { background: #FFFFFF; border: 1px solid ${BORDER}; border-radius: 16px; padding: 14px 16px; min-width: 0; box-shadow: 0 1px 2px rgba(7,17,31,0.04); }
.pt-team-branded { padding: 0; overflow: hidden; }
.pt-team-band { position: relative; }
.pt-team-inner { padding: 14px 16px 16px; }
.pt-new-on-band { background: #FFFFFF; color: #15803D; }
.pt-unplaced { border-color: #FDE68A; background: #FFFDF5; }
.pt-blank { text-align: center; padding: 36px 20px; }
.pt-blank h3 { font-family: 'Geist', sans-serif; font-size: 16px; color: ${NAVY}; margin: 8px 0 4px; }
.pt-blank p { font-family: 'Geist', sans-serif; font-size: 13px; color: ${SLATE}; margin: 0; }
.pt-team-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
.pt-team-icon { flex: 0 0 34px; width: 34px; height: 34px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: #EBF4FC; color: #0B4F8A; }
.pt-team-title { flex: 1; min-width: 0; }
.pt-team-title h3 { font-family: 'Geist', sans-serif; font-size: 16px; font-weight: 800; color: ${NAVY}; margin: 0; overflow-wrap: anywhere; }
.pt-team-meta { font-family: 'Geist', sans-serif; font-size: 12px; color: ${SLATE}; display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pt-new { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #15803D; background: #DCFCE7; border-radius: 999px; padding: 2px 8px; flex-shrink: 0; }
.pt-team-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.pt-mini { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; color: ${NAVY};
  background: #FFFFFF; border: 1px solid #D1D9E0; border-radius: 9px; min-height: 34px; padding: 0 11px; cursor: pointer; white-space: nowrap; }
.pt-mini:hover:not(:disabled) { border-color: ${AZURE}; color: ${AZURE}; }
.pt-mini:disabled { opacity: 0.55; cursor: default; }
.pt-icon-only { padding: 0; width: 34px; justify-content: center; }
.pt-menu { position: relative; }
.pt-menu-list { position: absolute; right: 0; top: calc(100% + 4px); z-index: ${Z.dropdown}; min-width: 220px; background: #FFFFFF; border: 1px solid ${BORDER};
  border-radius: 10px; box-shadow: 0 12px 28px -8px rgba(7,17,31,0.25); padding: 4px; display: flex; flex-direction: column; }
.pt-menu-list button { display: flex; align-items: flex-start; gap: 8px; font-family: 'Geist', sans-serif; font-size: 13px; color: ${NAVY}; background: none; border: none;
  text-align: left; padding: 9px 10px; border-radius: 7px; cursor: pointer; }
.pt-menu-list button:hover:not(:disabled) { background: #F1F5F9; }
.pt-menu-list button svg { margin-top: 2px; flex-shrink: 0; }
.pt-menu-danger { color: #B42318 !important; }
.pt-menu-disabled { color: #94A3B8 !important; cursor: not-allowed !important; }
.pt-menu-disabled span { display: flex; flex-direction: column; }
.pt-menu-disabled small { font-size: 11px; color: ${SLATE}; margin-top: 2px; }
.pt-people { list-style: none; margin: 12px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; }
.pt-person { width: 100%; display: flex; align-items: center; gap: 10px; text-align: left; background: #FFFFFF; border: 1px solid ${BORDER}; border-radius: 12px;
  padding: 8px 10px; cursor: pointer; min-height: 58px; box-sizing: border-box; transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease; }
.pt-person:hover { border-color: #93C5FD; box-shadow: 0 8px 18px -12px rgba(0,120,212,0.7); transform: translateY(-1px); }
.pt-person:focus-visible { outline: 3px solid rgba(0,120,212,0.4); outline-offset: 2px; }
.pt-person-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pt-person-name { font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 700; color: ${NAVY}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
.pt-person-line { font-family: 'Geist', sans-serif; font-size: 12px; color: ${SLATE}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-person-go { color: #94A3B8; flex-shrink: 0; }
.pt-you { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #FFFFFF; background: ${AZURE}; border-radius: 999px; padding: 1px 7px; }
.pt-invited { width: 40px; height: 40px; border-radius: 50%; background: #F1F5F9; color: #475569; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pt-empty { font-family: 'Geist', sans-serif; font-size: 13px; color: ${SLATE}; margin: 10px 0 0; }
.pt-children { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.pt-sub { background: #FBFCFE; border: 1px solid ${BORDER}; border-left: 4px solid ${AZURE}; border-radius: 12px; padding: 12px 14px; min-width: 0; }
.pt-sub .pt-team-title h3 { font-size: 14.5px; }
.pt-contacts { min-width: 0; }
.pt-contacts-head p { font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${SLATE}; margin: 0 0 10px; line-height: 1.5; }
.pt-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; margin-bottom: 8px; }
.pt-contact-list { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; max-height: min(460px, 50dvh); overflow-y: auto; }
.pt-contact-list li { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid #F1F5F9; }
.pt-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.pt-chip { font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 999px; background: #F0F7FF; color: ${AZURE}; border: 1px solid #BAD7F5; white-space: nowrap; }
.pt-chip-muted { background: #F8FAFC; color: ${SLATE}; border-color: ${BORDER}; }

/* A person's panel: the Home dashboard's two-toned banner, their face over it. */
.pt-scrim { position: fixed; inset: 0; background: rgba(7,17,31,0.55); display: flex; justify-content: center; align-items: center; padding: 16px; box-sizing: border-box; }
.pt-panel { position: relative; background: #FFFFFF; width: min(620px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto; border-radius: 20px;
  box-sizing: border-box; box-shadow: 0 24px 64px rgba(7,17,31,0.32); }
.pt-panel > :not(.pt-panel-band):not(.pt-panel-head) { margin-left: 24px; margin-right: 24px; }
.pt-panel-band { position: relative; height: 112px; overflow: hidden; display: flex; align-items: flex-start; justify-content: space-between; padding: 14px 14px 0 18px; box-sizing: border-box; }
.pt-panel-brand { position: relative; display: inline-flex; align-items: center; gap: 10px; min-width: 0; color: #FFFFFF; }
.pt-panel-brand img, .pt-panel-brand > span[aria-hidden] { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.95); object-fit: contain; padding: 3px; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; font-family: 'Geist', sans-serif; font-weight: 800; font-size: 13px; color: ${NAVY}; flex-shrink: 0; }
.pt-panel-brand-name { font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 2px rgba(7,17,31,0.25); }
.pt-panel-close { position: relative; width: 36px; height: 36px; border-radius: 10px; border: none; background: rgba(255,255,255,0.92); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pt-panel-head { display: flex; align-items: flex-start; gap: 16px; padding: 0 24px; margin-top: -44px; position: relative; }
.pt-panel-avatar { flex-shrink: 0; border-radius: 50%; box-shadow: 0 8px 20px -8px rgba(7,17,31,0.45); }
.pt-panel-head > div { min-width: 0; padding-top: 52px; }
.pt-panel-head h2 { font-family: 'Geist', sans-serif; font-size: 20px; font-weight: 800; color: ${NAVY}; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; overflow-wrap: anywhere; }
.pt-panel-email { font-family: 'Geist Mono', monospace; font-size: 12px; color: ${SLATE}; margin: 2px 0 0; overflow-wrap: anywhere; }
.pt-panel-role { font-family: 'Geist', sans-serif; font-size: 13px; color: ${NAVY}; font-weight: 600; margin: 4px 0 0; }
.pt-panel-note { font-family: 'Geist', sans-serif; font-size: 12px; color: ${SILVER}; margin-top: 12px; margin-bottom: 4px; }
.pt-panel-sec { border-top: 1px solid #F0F2F5; padding-top: 14px; margin-top: 14px; }
.pt-panel-sec h3 { font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 800; color: ${NAVY}; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px; }
.pt-row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 8px; }
.pt-row > button { margin-bottom: 8px; flex-shrink: 0; }
.pt-row-wrap { flex-wrap: wrap; align-items: center; }
.pt-row-wrap > button { margin-bottom: 0; }
.pt-danger h3 { color: #991B1B; }
.pt-confirm { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 12px; }
.pt-confirm p { font-family: 'Geist', sans-serif; font-size: 13px; color: #7F1D1D; margin: 0 0 10px; line-height: 1.5; }
.pt-panel-foot { font-family: 'Geist Mono', monospace; font-size: 11px; color: ${SILVER}; margin-top: 14px; padding-bottom: 22px; }

/* Tablets: the three actions share one even row under the title. */
@media (max-width: 900px) {
  .manage-actions { flex: 1 1 100%; }
  .pt-actions { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); }
}
/* Phones: icon over label, a tidy three-up bar; everything one column. */
@media (max-width: 640px) {
  .pt-action { flex-direction: column; gap: 3px; min-height: 56px; padding: 6px 4px; font-size: 11.5px; white-space: normal; text-align: center; line-height: 1.15; }
  .pt-action-count { position: absolute; top: 4px; right: 6px; }
  .pt-search { max-width: none; flex-basis: 100%; }
  .pt-team-inner, .pt-team { padding: 12px; }
  .pt-team-branded { padding: 0; }
  .pt-team-head { flex-wrap: wrap; }
  .pt-team-actions { width: 100%; justify-content: flex-end; }
  .pt-mini-label { display: inline; }
  .pt-people { grid-template-columns: 1fr; }
  .pt-sub { padding: 10px; }
  .pt-scrim { padding: 0; align-items: flex-end; }
  .pt-panel { border-radius: 20px 20px 0 0; max-height: 94dvh; }
  .pt-panel > :not(.pt-panel-band):not(.pt-panel-head) { margin-left: 16px; margin-right: 16px; }
  .pt-panel-band { height: 96px; }
  .pt-panel-head { flex-direction: column; align-items: flex-start; gap: 8px; padding: 0 16px; margin-top: -40px; }
  .pt-panel-head > div { padding-top: 0; }
  .pt-row { flex-direction: column; align-items: stretch; }
  .pt-row > button { margin-bottom: 0; }
}
@media (prefers-reduced-motion: reduce) { .pt-person, .pt-action { transition: none; } .pt-person:hover { transform: none; } }
`;
