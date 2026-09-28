// /app/settings/organization — Organization Units.
//
// The org chart: departments/offices/teams/etc., who belongs to each, and
// which TITLE (061) a member holds inside one — "Department Head" of
// Records, say. A unit grants no permission by itself; see
// models/organization.ts's header. Real backend only — there is no
// fixture catalogue for an org chart the way templates or documents have
// one, so this page has no mock fallback (the same choice Signatures &
// Initials made for the same reason).
//
// ── Layout ───────────────────────────────────────────────────────────────
//
//   ┌──────────── workspace branding banner (live) ─────────────┐
//   └────────────────────────────────────────────────────────────┘
//   ┌ Structure ──────────┐  ┌ Unit ───────────────────────────┐
//   │ Finance             │  │ name · kind · part of · created │
//   │ ├─ Cebu Office      │  ├ Unit settings  [Archive][Rename]│
//   │ │  └─ Front Desk    │  ├ Roster (people and titles)      │
//   │ └─ Payroll          │  │ + Add a person                  │
//   │ [+ New unit]        │  └─────────────────────────────────┘
//   └─────────────────────┘
//
// Master-detail on a desktop; stacked on a tablet or phone. The structure is
// an outline with elbow connectors — the same drawing the Teams hierarchy
// uses on a phone — built from buttons, so it keyboard-navigates like any
// list. The roster is a list of rows rather than a table, so nothing ever
// needs horizontal scrolling at 320px.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, Plus, Trash2, X, Network, Users, FolderTree, Archive, PencilLine, UserPlus, Check } from "lucide-react";
import {
  SettingsPage, SCard, SField, INPUT_STYLE, BTN_PRIMARY, BTN_SECONDARY,
  BTN_DANGER, Skeleton, Badge, SET,
} from "../SettingsShell";
import { SettingsActions } from "../SettingsActions";
import { BrandBand } from "../branding-preview";
import { useDocumentCardBranding } from "../../documents/CompletedDocumentCards";
import { usePlatform } from "../../../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { realOrganizationService } from "../../../../services/real/organization.service";
import { realWorkspaceMembersService } from "../../../../services/real/workspace-members.service";
import { useProcessing } from "../../../../services/processing.service";
import { ApiError } from "../../../../services/api-client";
import {
  ORGANIZATION_UNIT_KINDS, ORGANIZATION_UNIT_KIND_LABELS,
  type OrganizationUnit, type OrganizationUnitMember, type WorkspaceMemberOption,
} from "../../../../models/organization";

const GF = { fontFamily: SET.FONT };
const GM = { fontFamily: SET.MONO };
const NAVY = SET.NAVY;
const AZURE = SET.TEAL_TEXT;
const SLATE = SET.SLATE;
// Text-safe muted grey (the old #8A9BAE read at under 3:1 on white).
const SILVER = SET.MUTED;

function kindLabel(unit: OrganizationUnit): string {
  return ORGANIZATION_UNIT_KIND_LABELS[unit.kind] ?? unit.kind;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

function formatCreated(ms: number): string {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ── Tree ordering ────────────────────────────────────────────────────────

/** Children of each parent, live before archived, then alphabetical — "the
 *  live org chart, then what's gone" at every level. */
function childrenByParent(units: readonly OrganizationUnit[]): Map<string | null, OrganizationUnit[]> {
  const byParent = new Map<string | null, OrganizationUnit[]>();
  const ids = new Set(units.map(u => u.unitId));
  for (const unit of units) {
    // A unit whose parent is missing is shown at the top level rather than lost.
    const parent = unit.parentUnitId !== null && ids.has(unit.parentUnitId) ? unit.parentUnitId : null;
    const list = byParent.get(parent) ?? [];
    list.push(unit);
    byParent.set(parent, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) =>
      (a.archivedAt === null ? 0 : 1) - (b.archivedAt === null ? 0 : 1)
      || a.name.localeCompare(b.name));
  }
  return byParent;
}

// ── Create-unit form ─────────────────────────────────────────────────────

function CreateUnitForm({ units, onCreated, onClose }: {
  units: readonly OrganizationUnit[];
  onCreated: (unit: OrganizationUnit) => void;
  onClose: () => void;
}) {
  const platform = usePlatform();
  const { run } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<typeof ORGANIZATION_UNIT_KINDS[number]>("department");
  const [parentUnitId, setParentUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveUnits = units.filter(u => u.archivedAt === null);

  const handleCreate = async () => {
    if (!workspaceId || name.trim() === "") return;
    setError(null);
    setBusy(true);
    try {
      const unit = await run(
        { message: "Creating unit" },
        () => realOrganizationService.createUnit(workspaceId, {
          name: name.trim(), kind,
          ...(parentUnitId === "" ? {} : { parentUnitId }),
        }),
      );
      onCreated(unit);
      setName(""); setParentUnitId(""); onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The unit could not be created.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="org-create" aria-label="New unit" onSubmit={e => { e.preventDefault(); void handleCreate(); }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>New unit</span>
        <button type="button" onClick={onClose} aria-label="Close the new unit form" className="org-icon-btn">
          <X size={15} aria-hidden />
        </button>
      </div>
      <label className="org-label" htmlFor="org-new-name">Name</label>
      <input id="org-new-name" value={name} onChange={e => { setName(e.target.value); }} placeholder="e.g. Records"
        style={{ ...INPUT_STYLE, marginBottom: 10 }} />
      <label className="org-label" htmlFor="org-new-kind">Kind</label>
      <select id="org-new-kind" value={kind} onChange={e => { setKind(e.target.value as typeof kind); }} style={{ ...INPUT_STYLE, marginBottom: 10, cursor: "pointer" }}>
        {ORGANIZATION_UNIT_KINDS.map(k => (
          <option key={k} value={k}>{ORGANIZATION_UNIT_KIND_LABELS[k]}</option>
        ))}
      </select>
      <label className="org-label" htmlFor="org-new-parent">Part of</label>
      <select id="org-new-parent" value={parentUnitId} onChange={e => { setParentUnitId(e.target.value); }} style={{ ...INPUT_STYLE, marginBottom: 12, cursor: "pointer" }}>
        <option value="">— No parent (a top-level unit) —</option>
        {liveUnits.map(u => <option key={u.unitId} value={u.unitId}>{u.name}</option>)}
      </select>
      {error !== null && (
        <p role="alert" style={{ ...GF, fontSize: 12.5, color: "#B91C1C", margin: "0 0 10px" }}>{error}</p>
      )}
      <SettingsActions divider={false} testId="org-create-actions">
        <button type="button" onClick={onClose} style={BTN_SECONDARY}>Cancel</button>
        <button type="submit" disabled={busy || name.trim() === ""}
          style={{ ...BTN_PRIMARY, opacity: busy || name.trim() === "" ? 0.6 : 1, cursor: busy || name.trim() === "" ? "not-allowed" : "pointer" }}>
          <Plus size={15} aria-hidden /> {busy ? "Creating…" : "Create unit"}
        </button>
      </SettingsActions>
    </form>
  );
}

// ── Structure (the outline) ──────────────────────────────────────────────

function UnitOutline({ units, selectedId, onSelect }: {
  units: readonly OrganizationUnit[];
  selectedId: string | null;
  onSelect: (unitId: string) => void;
}) {
  const byParent = useMemo(() => childrenByParent(units), [units]);
  if (units.length === 0) {
    return <p style={{ ...GF, fontSize: 13, color: SILVER, padding: "8px 4px", margin: 0 }}>No units yet. Create the first one below.</p>;
  }
  const branch = (parent: string | null, depth: number, seen: Set<string>): ReactNode => {
    const list = (byParent.get(parent) ?? []).filter(u => !seen.has(u.unitId));
    if (list.length === 0) return null;
    return (
      <ul className={depth === 0 ? "org-outline" : "org-outline org-outline--nested"} aria-label={depth === 0 ? "Units" : undefined}>
        {list.map(unit => {
          const selected = unit.unitId === selectedId;
          const archived = unit.archivedAt !== null;
          const next = new Set(seen).add(unit.unitId);
          return (
            <li key={unit.unitId} className="org-outline-item">
              <button type="button" onClick={() => { onSelect(unit.unitId); }} aria-current={selected ? "true" : undefined}
                data-testid={`org-unit-${unit.unitId}`}
                className={`org-unit-btn${selected ? " org-unit-btn--selected" : ""}${archived ? " org-unit-btn--archived" : ""}`}>
                <span className="org-unit-name">{unit.name}</span>
                <span className="org-unit-kind">{kindLabel(unit)}{archived ? " · Archived" : ""}</span>
              </button>
              {branch(unit.unitId, depth + 1, next)}
            </li>
          );
        })}
      </ul>
    );
  };
  return <>{branch(null, 0, new Set())}</>;
}

// ── Add-member picker ────────────────────────────────────────────────────

function AddMemberForm({ workspaceId, unitId, currentMemberIds, onAdded }: {
  workspaceId: string;
  unitId: string;
  currentMemberIds: ReadonlySet<string>;
  onAdded: () => void;
}) {
  const { run } = useProcessing();
  const [candidates, setCandidates] = useState<WorkspaceMemberOption[] | null>(null);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    realWorkspaceMembersService.list(workspaceId)
      .then(members => { if (!cancelled) setCandidates(members); })
      .catch(() => { if (!cancelled) setCandidates([]); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const available = (candidates ?? []).filter(m => !currentMemberIds.has(m.userId));

  const handleAdd = async () => {
    if (userId === "") return;
    setError(null);
    setBusy(true);
    try {
      await run(
        { message: "Adding to unit" },
        () => realOrganizationService.addMember(workspaceId, unitId, {
          userId, ...(title.trim() === "" ? {} : { title: title.trim() }),
        }),
      );
      setUserId(""); setTitle("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that person.");
    } finally {
      setBusy(false);
    }
  };

  if (candidates === null) return <Skeleton h={38} mb={0} />;
  if (available.length === 0) {
    return <p style={{ ...GF, fontSize: 12.5, color: SILVER, margin: 0 }}>Everyone in the workspace already belongs to this unit.</p>;
  }

  return (
    <form className="org-add" aria-label="Add a person to this unit" onSubmit={e => { e.preventDefault(); void handleAdd(); }}>
      <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <UserPlus size={15} aria-hidden color={AZURE} /> Add a person
      </div>
      <div className="org-add-fields">
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <label className="org-label" htmlFor={`org-add-person-${unitId}`}>Person</label>
          <select id={`org-add-person-${unitId}`} value={userId} onChange={e => { setUserId(e.target.value); }} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
            <option value="">— Choose a person —</option>
            {available.map(m => (
              <option key={m.userId} value={m.userId}>{m.displayName} ({m.email})</option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <label className="org-label" htmlFor={`org-add-title-${unitId}`}>Title (optional)</label>
          <input id={`org-add-title-${unitId}`} value={title} onChange={e => { setTitle(e.target.value); }}
            placeholder="e.g. Department Head" style={INPUT_STYLE} />
        </div>
      </div>
      {error !== null && (
        <p role="alert" style={{ ...GF, fontSize: 12.5, color: "#B91C1C", margin: "8px 0 0" }}>{error}</p>
      )}
      <SettingsActions divider={false} testId="org-add-actions">
        <button type="submit" disabled={busy || userId === ""}
          style={{ ...BTN_PRIMARY, opacity: busy || userId === "" ? 0.6 : 1, cursor: busy || userId === "" ? "not-allowed" : "pointer" }}>
          <Plus size={15} aria-hidden /> {busy ? "Adding…" : "Add to unit"}
        </button>
      </SettingsActions>
    </form>
  );
}

// ── Member row ───────────────────────────────────────────────────────────

function MemberRow({ workspaceId, unitId, member, readOnly, onChanged }: {
  workspaceId: string;
  unitId: string;
  member: OrganizationUnitMember;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const { run } = useProcessing();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(member.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTitle = async () => {
    setError(null);
    setBusy(true);
    try {
      await run(
        { message: "Updating title" },
        () => realOrganizationService.setMemberTitle(
          workspaceId, unitId, member.userId, title.trim() === "" ? null : title.trim()),
      );
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update that title.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await run(
        { message: "Removing from unit" },
        () => realOrganizationService.removeMember(workspaceId, unitId, member.userId),
      );
      onChanged();
    } catch {
      setBusy(false);
    }
  };

  return (
    <li className="org-member" data-testid={`org-member-${member.userId}`}>
      <span aria-hidden className="org-avatar">{initials(member.displayName)}</span>
      <div className="org-member-who">
        <span style={{ ...GF, fontSize: 13.5, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>{member.displayName}</span>
        <span style={{ ...GM, fontSize: 11.5, color: SILVER, overflowWrap: "anywhere" }}>{member.email}</span>
      </div>
      <div className="org-member-title">
        {editing ? (
          <form style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
            onSubmit={e => { e.preventDefault(); void saveTitle(); }}>
            <input value={title} onChange={e => { setTitle(e.target.value); }} placeholder="No title" aria-label={`Title for ${member.displayName}`}
              style={{ ...INPUT_STYLE, padding: "6px 10px", fontSize: 13, flex: "1 1 140px", minWidth: 0 }} autoFocus />
            <button type="submit" disabled={busy} style={{ ...BTN_PRIMARY, padding: "6px 12px", minHeight: 34, fontSize: 12.5 }}>
              <Check size={14} aria-hidden /> Save
            </button>
            <button type="button" onClick={() => { setEditing(false); setTitle(member.title ?? ""); }} style={{ ...BTN_SECONDARY, padding: "6px 12px", minHeight: 34, fontSize: 12.5 }}>Cancel</button>
          </form>
        ) : readOnly ? (
          <span className={member.title ? "org-title-chip" : "org-title-none"}>{member.title ?? "No title"}</span>
        ) : (
          <button type="button" onClick={() => { setEditing(true); }} className="org-title-btn"
            aria-label={member.title ? `Title: ${member.title}. Change title for ${member.displayName}` : `Set a title for ${member.displayName}`}>
            <span className={member.title ? "org-title-chip" : "org-title-none"}>{member.title ?? "No title — set one"}</span>
            <PencilLine size={13} aria-hidden />
          </button>
        )}
        {error !== null && <div role="alert" style={{ ...GF, fontSize: 12, color: "#B91C1C", marginTop: 4 }}>{error}</div>}
      </div>
      {!readOnly && (
        <button type="button" onClick={() => { void remove(); }} disabled={busy}
          aria-label={`Remove ${member.displayName} from unit`} title="Remove from unit" className="org-icon-btn org-icon-btn--danger">
          <Trash2 size={15} aria-hidden />
        </button>
      )}
    </li>
  );
}

// ── Unit detail ──────────────────────────────────────────────────────────

function UnitDetail({ workspaceId, unit, units, onUnitChanged, onUnitArchived }: {
  workspaceId: string;
  unit: OrganizationUnit;
  units: readonly OrganizationUnit[];
  onUnitChanged: (unit: OrganizationUnit) => void;
  onUnitArchived: (unitId: string) => void;
}) {
  const { run } = useProcessing();
  const [members, setMembers] = useState<OrganizationUnitMember[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [name, setName] = useState(unit.name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const loadMembers = useCallback(() => {
    setMembersError(null);
    realOrganizationService.listMembers(workspaceId, unit.unitId)
      .then(setMembers)
      .catch(() => { setMembersError("The roster could not be loaded."); });
  }, [workspaceId, unit.unitId]);

  // Resets when the SELECTED unit changes (by id), not on every rename —
  // `name`'s own state is already the just-saved value the moment a rename
  // succeeds, and re-deriving it from `unit.name` here would fight the
  // input while someone is mid-edit of a name that hasn't saved yet.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMembers(null); setName(unit.name); loadMembers(); }, [unit.unitId, loadMembers]);

  const hasLiveChildren = units.some(u => u.parentUnitId === unit.unitId && u.archivedAt === null);
  const parent = unit.parentUnitId ? units.find(u => u.unitId === unit.parentUnitId) ?? null : null;
  const children = units.filter(u => u.parentUnitId === unit.unitId);
  const archived = unit.archivedAt !== null;
  const renameDisabled = saving || name.trim() === "" || name.trim() === unit.name;

  const saveName = async () => {
    if (name.trim() === "" || name.trim() === unit.name) return;
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await run(
        { message: "Renaming unit" },
        () => realOrganizationService.updateUnit(workspaceId, unit.unitId, { name: name.trim() }),
      );
      onUnitChanged(updated);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not rename this unit.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    setArchiveError(null);
    setArchiving(true);
    try {
      await run(
        { message: "Archiving unit" },
        () => realOrganizationService.archiveUnit(workspaceId, unit.unitId),
      );
      onUnitArchived(unit.unitId);
    } catch (err) {
      setArchiveError(err instanceof ApiError ? err.message : "Could not archive this unit.");
      setArchiving(false);
    }
  };

  const facts: { label: string; value: string }[] = [
    { label: "Kind", value: kindLabel(unit) },
    { label: "Part of", value: parent?.name ?? "Top level" },
    { label: "Sub-units", value: String(children.length) },
    { label: "Created", value: formatCreated(unit.createdAt) },
    ...(unit.archivedAt !== null ? [{ label: "Archived", value: formatCreated(unit.archivedAt) }] : []),
  ];

  return (
    <>
      <SCard>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <span aria-hidden className="org-unit-icon"><FolderTree size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 data-testid="org-unit-title" style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: 0, overflowWrap: "anywhere", lineHeight: 1.3 }}>{unit.name}</h3>
            <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "3px 0 0" }}>
              {kindLabel(unit)}{parent ? ` in ${parent.name}` : " · top level"}
              {members !== null && ` · ${String(members.length)} ${members.length === 1 ? "person" : "people"}`}
            </p>
          </div>
          {archived && <Badge tone="neutral">Archived</Badge>}
        </div>
        <dl className="org-facts">
          {facts.map(f => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </SCard>

      {!archived && (
        <SCard>
          <h3 className="org-card-title"><PencilLine size={16} aria-hidden color={AZURE} /> Unit settings</h3>
          <form onSubmit={e => { e.preventDefault(); void saveName(); }}>
            <SField label="Name" htmlFor={`org-name-${unit.unitId}`}>
              <input id={`org-name-${unit.unitId}`} value={name} onChange={e => { setName(e.target.value); }} style={INPUT_STYLE} />
            </SField>
            {hasLiveChildren && (
              <p style={{ ...GF, fontSize: 12.5, color: SLATE, display: "flex", alignItems: "flex-start", gap: 6, margin: "0 0 4px" }}>
                <AlertCircle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} /> Move or archive the units inside this one before archiving it.
              </p>
            )}
            <SettingsActions testId="org-unit-actions" status={<>
              {saveError !== null && <span role="alert" style={{ color: "#B91C1C" }}>{saveError}</span>}
              {archiveError !== null && <span role="alert" style={{ color: "#B91C1C" }}>{archiveError}</span>}
            </>}>
              {!hasLiveChildren && (
                <button type="button" onClick={() => { void archive(); }} disabled={archiving} style={{ ...BTN_DANGER, opacity: archiving ? 0.6 : 1 }}>
                  <Archive size={15} aria-hidden /> {archiving ? "Archiving…" : "Archive unit"}
                </button>
              )}
              <button type="submit" disabled={renameDisabled}
                style={{ ...BTN_PRIMARY, opacity: renameDisabled ? 0.6 : 1, cursor: renameDisabled ? "not-allowed" : "pointer" }}>
                <Check size={15} aria-hidden /> {saving ? "Saving…" : "Rename"}
              </button>
            </SettingsActions>
          </form>
        </SCard>
      )}

      <SCard>
        <h3 className="org-card-title">
          <Users size={16} aria-hidden color={AZURE} /> Roster
          {members !== null && <span className="org-count">{members.length}</span>}
        </h3>
        {members === null && membersError === null ? (
          <Skeleton h={80} mb={0} />
        ) : membersError !== null ? (
          <p role="alert" style={{ ...GF, fontSize: 13, color: "#B91C1C" }}>{membersError}</p>
        ) : (
          <>
            {(members ?? []).length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 14px" }}>No one belongs to this unit yet.</p>
            ) : (
              <ul className="org-roster" aria-label={`People in ${unit.name}`}>
                {(members ?? []).map(m => (
                  <MemberRow key={m.userId} workspaceId={workspaceId} unitId={unit.unitId} member={m} readOnly={archived} onChanged={loadMembers} />
                ))}
              </ul>
            )}
            {!archived && (
              <AddMemberForm
                workspaceId={workspaceId} unitId={unit.unitId}
                currentMemberIds={new Set((members ?? []).map(m => m.userId))}
                onAdded={loadMembers}
              />
            )}
          </>
        )}
      </SCard>
    </>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────

function OrganizationUnitsInner({ workspaceId }: { workspaceId: string }) {
  const branding = useDocumentCardBranding();
  const [units, setUnits] = useState<OrganizationUnit[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    realOrganizationService.listUnits(workspaceId)
      .then(list => {
        setUnits(list);
        setSelectedId(current => current ?? list.find(u => u.archivedAt === null)?.unitId ?? list[0]?.unitId ?? null);
      })
      .catch(() => { setLoadError("The organization chart could not be loaded."); });
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const selectedUnit = units?.find(u => u.unitId === selectedId) ?? null;
  const live = (units ?? []).filter(u => u.archivedAt === null).length;
  const archivedCount = (units ?? []).length - live;

  if (loadError !== null) {
    return (
      <SCard>
        <p role="alert" style={{ ...GF, fontSize: 13, color: "#B91C1C", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} aria-hidden /> {loadError}
        </p>
        <button type="button" onClick={load} style={BTN_SECONDARY}>Retry</button>
      </SCard>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <style>{ORG_STYLES}</style>
      <section aria-label="Workspace branding" className="org-brand" data-testid="org-brand-header">
        <BrandBand variant="card" testId="org-banner" subtitle="Organization chart"
          branding={{ displayName: branding.displayName, primaryColor: branding.primaryColor, logoPreviewUrl: branding.logoUrl }}
          headerAside={units === null ? undefined : (
            <span className="org-brand-stats">
              <span><strong>{live}</strong> {live === 1 ? "unit" : "units"}</span>
              {archivedCount > 0 && <span><strong>{archivedCount}</strong> archived</span>}
            </span>
          )} />
      </section>

      <div className="org-grid">
        <SCard style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
            <h3 className="org-card-title" style={{ margin: 0 }}><Network size={16} aria-hidden color={AZURE} /> Structure</h3>
            {!creating && (
              <button type="button" onClick={() => { setCreating(true); }} style={{ ...BTN_SECONDARY, minHeight: 34, padding: "6px 12px", fontSize: 12.5 }}>
                <Plus size={14} aria-hidden /> New unit
              </button>
            )}
          </div>
          {creating && (
            <CreateUnitForm units={units ?? []} onClose={() => { setCreating(false); }}
              onCreated={unit => { setUnits(u => [...(u ?? []), unit]); setSelectedId(unit.unitId); }} />
          )}
          {units === null ? (
            <Skeleton h={160} mb={12} />
          ) : (
            <UnitOutline units={units} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </SCard>

        <div style={{ minWidth: 0 }}>
          {selectedUnit === null ? (
            <SCard><p style={{ ...GF, fontSize: 13, color: SILVER, margin: 0 }}>Choose a unit, or create the first one.</p></SCard>
          ) : (
            <UnitDetail
              workspaceId={workspaceId}
              unit={selectedUnit}
              units={units ?? []}
              onUnitChanged={updated => { setUnits(u => (u ?? []).map(x => x.unitId === updated.unitId ? updated : x)); }}
              onUnitArchived={unitId => {
                setUnits(u => (u ?? []).map(x => x.unitId === unitId ? { ...x, archivedAt: Date.now() } : x));
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function OrganizationUnitsPage() {
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;

  return (
    <SettingsPage title="Organization Units" breadcrumb="Organization Units" icon={Network}
      description={<>Departments, offices and teams — for routing and reporting only. A member’s title here (like “Department Head”) lets a template slot resolve to whoever currently holds it, instead of naming a specific person.</>}>
      {!USE_REAL_BACKEND || !workspaceId ? (
        <SCard>
          <p style={{ ...GF, fontSize: 13, color: SLATE }}>Open a workspace to manage its organization chart.</p>
        </SCard>
      ) : (
        <OrganizationUnitsInner workspaceId={workspaceId} />
      )}
    </SettingsPage>
  );
}

const LINE = "#64748B";

const ORG_STYLES = `
  .org-brand { border-radius: 12px; overflow: hidden; border: 1px solid #E3E8EF; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(7,17,31,0.05); }
  .org-brand-stats { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; flex-shrink: 0; }
  .org-brand-stats > span { font-family: 'Geist', sans-serif; font-size: 12px; color: #FFFFFF; background: rgba(7,17,31,0.28); border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
  .org-grid { display: grid; gap: 16px; align-items: start; grid-template-columns: minmax(0, 1fr); min-width: 0; }
  @media (min-width: 1024px) { .org-grid { grid-template-columns: minmax(0, 320px) minmax(0, 1fr); } }
  .org-card-title { display: flex; align-items: center; gap: 8px; font-family: 'Geist', sans-serif; font-size: 14.5px; font-weight: 700; color: ${NAVY}; margin: 0 0 14px; }
  .org-count { font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 999px; padding: 0 8px; color: #1E293B; }
  .org-label { display: block; font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 5px; }
  .org-create { border: 1px solid #E3E8EF; background: #F8FAFC; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
  .org-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid transparent; background: none; color: ${SLATE}; cursor: pointer; flex-shrink: 0; }
  .org-icon-btn:hover { background: #F1F5F9; }
  .org-icon-btn--danger { color: #B91C1C; }
  .org-icon-btn--danger:hover { background: #FEF2F2; border-color: #FECACA; }
  .org-icon-btn:focus-visible, .org-unit-btn:focus-visible, .org-title-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }

  .org-outline { list-style: none; margin: 0; padding: 0; }
  .org-outline--nested { margin-left: 12px; padding-left: 14px; border-left: 2px solid ${LINE}; }
  .org-outline-item { position: relative; padding-top: 4px; }
  .org-outline--nested > .org-outline-item::before { content: ""; position: absolute; left: -16px; top: 24px; width: 12px; border-top: 2px solid ${LINE}; }
  .org-outline--nested > .org-outline-item:last-child::after { content: ""; position: absolute; left: -17px; top: 26px; bottom: 0; width: 4px; background: #FFFFFF; }
  .org-unit-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 100%; text-align: left; padding: 7px 10px; min-height: 44px; box-sizing: border-box;
    border: 1px solid transparent; border-radius: 8px; background: transparent; cursor: pointer; }
  .org-unit-btn:hover { background: #F8FAFC; border-color: #E2E8F0; }
  .org-unit-btn--selected { background: #EFFBF8; border-color: #99E0D0; box-shadow: inset 3px 0 0 ${SET.TEAL}; }
  .org-unit-btn--selected:hover { background: #EFFBF8; }
  .org-unit-name { font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 600; color: ${NAVY}; overflow-wrap: anywhere; }
  .org-unit-btn--selected .org-unit-name { font-weight: 700; color: ${AZURE}; }
  .org-unit-btn--archived .org-unit-name { color: ${SLATE}; }
  .org-unit-kind { font-family: 'Geist', sans-serif; font-size: 11.5px; color: ${SLATE}; }
  .org-unit-icon { width: 36px; height: 36px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: #EFFBF8; color: ${AZURE}; border: 1px solid #99E0D0; flex-shrink: 0; }

  .org-facts { margin: 0; display: grid; gap: 10px 20px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr)); border-top: 1px solid #F1F5F9; padding-top: 12px; }
  .org-facts dt { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: ${SLATE}; text-transform: uppercase; letter-spacing: 0.06em; }
  .org-facts dd { margin: 2px 0 0; font-family: 'Geist', sans-serif; font-size: 13.5px; color: ${NAVY}; font-weight: 500; overflow-wrap: anywhere; }

  .org-roster { list-style: none; margin: 0 0 16px; padding: 0; border: 1px solid #E3E8EF; border-radius: 10px; }
  .org-member { display: grid; grid-template-columns: 34px minmax(0, 1fr) minmax(0, 1fr) auto; grid-template-areas: "av who title rm"; align-items: center; gap: 8px 12px; padding: 10px 12px; border-bottom: 1px solid #F1F5F9; min-width: 0; }
  .org-member > .org-avatar { grid-area: av; }
  .org-member > .org-member-who { grid-area: who; }
  .org-member > .org-member-title { grid-area: title; }
  .org-member > .org-icon-btn { grid-area: rm; }
  .org-member:last-child { border-bottom: none; }
  .org-avatar { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: #F0F7FF; color: #005A9E; border: 1px solid #BFDBFE; font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; }
  .org-member-who { display: flex; flex-direction: column; min-width: 0; }
  .org-member-title { min-width: 0; }
  .org-title-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; padding: 4px 2px; cursor: pointer; color: ${SLATE}; max-width: 100%; text-align: left; }
  .org-title-chip { font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 700; color: #1E3A8A; background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 999px; padding: 2px 9px; overflow-wrap: anywhere; }
  .org-title-none { font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${SLATE}; font-style: italic; }
  .org-add { border-top: 1px solid #F1F5F9; padding-top: 14px; }
  .org-add-fields { display: flex; flex-wrap: wrap; gap: 10px 12px; }
  @media (max-width: 480px) {
    .org-member { grid-template-columns: 34px minmax(0, 1fr) auto; grid-template-areas: "av who rm" ". title title"; }
    .org-brand-stats { display: none; }
  }
`;
