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
// Master-detail: units on the left (flat list, indented by depth), the
// selected unit's roster and settings on the right. A tree WIDGET was
// considered and dropped — a workspace's unit count is bounded by what an
// admin will author, and a flat indented list is both simpler to build and
// easier to keyboard-navigate than a collapsible tree for that size.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, Trash2, X } from "lucide-react";
import {
  SettingsPage, SCard, SField, INPUT_STYLE, BTN_PRIMARY, BTN_SECONDARY,
  BTN_DANGER, Skeleton, StatusBadge,
} from "../SettingsShell";
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

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER = "#8A9BAE";

// ── Tree ordering ────────────────────────────────────────────────────────

interface UnitRow { unit: OrganizationUnit; depth: number }

/** Depth-first, root-first, alphabetical among siblings — a stable, legible
 *  order for a flat list standing in for a tree. Archived units sort after
 *  their live siblings rather than being interleaved by name, so a glance
 *  down the list reads "the live org chart, then what's gone". */
function flatten(units: readonly OrganizationUnit[]): UnitRow[] {
  const byParent = new Map<string | null, OrganizationUnit[]>();
  for (const unit of units) {
    const list = byParent.get(unit.parentUnitId) ?? [];
    list.push(unit);
    byParent.set(unit.parentUnitId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) =>
      (a.archivedAt === null ? 0 : 1) - (b.archivedAt === null ? 0 : 1)
      || a.name.localeCompare(b.name));
  }

  const rows: UnitRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const unit of byParent.get(parentId) ?? []) {
      rows.push({ unit, depth });
      visit(unit.unitId, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

// ── Create-unit form ─────────────────────────────────────────────────────

function CreateUnitForm({ units, onCreated }: {
  units: readonly OrganizationUnit[];
  onCreated: (unit: OrganizationUnit) => void;
}) {
  const platform = usePlatform();
  const { run } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const [open, setOpen] = useState(false);
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
      setName(""); setParentUnitId(""); setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The unit could not be created.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); }}
        style={{ ...BTN_SECONDARY, display: "inline-flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}
      >
        <Plus size={14} /> New Unit
      </button>
    );
  }

  return (
    <div style={{ border: "1.5px solid #E3E8EF", borderRadius: 10, padding: 12, marginTop: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY }}>New Unit</span>
        <button onClick={() => { setOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: SILVER }}>
          <X size={14} />
        </button>
      </div>
      <input
        value={name}
        onChange={e => { setName(e.target.value); }}
        placeholder="e.g. Records"
        style={{ ...INPUT_STYLE, marginBottom: 8 }}
      />
      <select value={kind} onChange={e => { setKind(e.target.value as typeof kind); }} style={{ ...INPUT_STYLE, marginBottom: 8, cursor: "pointer" }}>
        {ORGANIZATION_UNIT_KINDS.map(k => (
          <option key={k} value={k}>{ORGANIZATION_UNIT_KIND_LABELS[k]}</option>
        ))}
      </select>
      <select value={parentUnitId} onChange={e => { setParentUnitId(e.target.value); }} style={{ ...INPUT_STYLE, marginBottom: 10, cursor: "pointer" }}>
        <option value="">— No parent (a root unit) —</option>
        {liveUnits.map(u => <option key={u.unitId} value={u.unitId}>{u.name}</option>)}
      </select>
      {error !== null && (
        <p style={{ ...GF, fontSize: 12, color: "#B91C1C", margin: "0 0 8px" }}>{error}</p>
      )}
      <button
        onClick={() => { void handleCreate(); }}
        disabled={busy || name.trim() === ""}
        style={{ ...BTN_PRIMARY, width: "100%", opacity: busy || name.trim() === "" ? 0.6 : 1 }}
      >
        {busy ? "Creating…" : "Create"}
      </button>
    </div>
  );
}

// ── Unit list ────────────────────────────────────────────────────────────

function UnitList({ rows, selectedId, onSelect }: {
  rows: readonly UnitRow[];
  selectedId: string | null;
  onSelect: (unitId: string) => void;
}) {
  if (rows.length === 0) {
    return <p style={{ ...GF, fontSize: 13, color: SILVER, padding: "8px 4px" }}>No units yet.</p>;
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {rows.map(({ unit, depth }) => {
        const selected = unit.unitId === selectedId;
        return (
          <li key={unit.unitId}>
            <button
              onClick={() => { onSelect(unit.unitId); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                textAlign: "left", padding: "8px 10px", paddingLeft: 10 + depth * 16,
                border: "none", borderRadius: 8, cursor: "pointer",
                background: selected ? "#EBF5FB" : "transparent",
                ...GF, fontSize: 13, fontWeight: selected ? 700 : 500,
                color: selected ? AZURE : unit.archivedAt !== null ? SILVER : NAVY,
                opacity: unit.archivedAt !== null ? 0.75 : 1,
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit.name}</span>
              {unit.archivedAt !== null && <StatusBadge label="Archived" color={SILVER} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
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
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
      <select value={userId} onChange={e => { setUserId(e.target.value); }} style={{ ...INPUT_STYLE, flex: "1 1 200px", cursor: "pointer" }}>
        <option value="">— Choose a person —</option>
        {available.map(m => (
          <option key={m.userId} value={m.userId}>{m.displayName} ({m.email})</option>
        ))}
      </select>
      <input
        value={title}
        onChange={e => { setTitle(e.target.value); }}
        placeholder="Title (optional) — e.g. Department Head"
        style={{ ...INPUT_STYLE, flex: "1 1 220px" }}
      />
      <button
        onClick={() => { void handleAdd(); }}
        disabled={busy || userId === ""}
        style={{ ...BTN_PRIMARY, opacity: busy || userId === "" ? 0.6 : 1, whiteSpace: "nowrap" }}
      >
        {busy ? "Adding…" : "Add"}
      </button>
      {error !== null && (
        <p style={{ ...GF, fontSize: 12, color: "#B91C1C", margin: 0, flexBasis: "100%" }}>{error}</p>
      )}
    </div>
  );
}

// ── Member row ───────────────────────────────────────────────────────────

function MemberRow({ workspaceId, unitId, member, onChanged }: {
  workspaceId: string;
  unitId: string;
  member: OrganizationUnitMember;
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
    <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
      <td style={{ padding: "10px 8px", ...GF, fontSize: 13, color: NAVY }}>
        {member.displayName}
        <div style={{ fontSize: 11, color: SILVER }}>{member.email}</div>
      </td>
      <td style={{ padding: "10px 8px" }}>
        {editing ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); }}
              placeholder="No title"
              style={{ ...INPUT_STYLE, padding: "6px 10px", fontSize: 12.5 }}
              autoFocus
            />
            <button onClick={() => { void saveTitle(); }} disabled={busy} style={{ ...BTN_PRIMARY, padding: "6px 12px", fontSize: 12 }}>Save</button>
            <button onClick={() => { setEditing(false); setTitle(member.title ?? ""); }} style={{ ...BTN_SECONDARY, padding: "6px 12px", fontSize: 12 }}>Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => { setEditing(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", ...GF, fontSize: 13, color: member.title ? NAVY : SILVER, fontStyle: member.title ? "normal" : "italic" }}
          >
            {member.title ?? "No title — click to set"}
          </button>
        )}
        {error !== null && <div style={{ ...GF, fontSize: 11, color: "#B91C1C", marginTop: 4 }}>{error}</div>}
      </td>
      <td style={{ padding: "10px 8px", textAlign: "right" }}>
        <button
          onClick={() => { void remove(); }}
          disabled={busy}
          title="Remove from unit"
          style={{ background: "none", border: "none", cursor: busy ? "default" : "pointer", color: "#DC2626", padding: 4 }}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
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

  return (
    <>
      <SCard>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0, flex: 1 }}>{unit.name}</h2>
          {unit.archivedAt !== null && <StatusBadge label="Archived" color={SILVER} />}
        </div>

        {unit.archivedAt === null && (
          <>
            <SField label="Name">
              <div style={{ display: "flex", gap: 8 }}>
                <input value={name} onChange={e => { setName(e.target.value); }} style={INPUT_STYLE} />
                <button
                  onClick={() => { void saveName(); }}
                  disabled={saving || name.trim() === "" || name.trim() === unit.name}
                  style={{ ...BTN_SECONDARY, whiteSpace: "nowrap", opacity: saving || name.trim() === "" || name.trim() === unit.name ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : "Rename"}
                </button>
              </div>
              {saveError !== null && <p style={{ ...GF, fontSize: 12, color: "#B91C1C", margin: "6px 0 0" }}>{saveError}</p>}
            </SField>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
              {hasLiveChildren ? (
                <p style={{ ...GF, fontSize: 12.5, color: SILVER, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> Move or archive the units inside this one before archiving it.
                </p>
              ) : (
                <button onClick={() => { void archive(); }} disabled={archiving} style={{ ...BTN_DANGER, opacity: archiving ? 0.6 : 1 }}>
                  {archiving ? "Archiving…" : "Archive Unit"}
                </button>
              )}
              {archiveError !== null && <p style={{ ...GF, fontSize: 12, color: "#B91C1C", margin: "8px 0 0" }}>{archiveError}</p>}
            </div>
          </>
        )}
      </SCard>

      <SCard>
        <h3 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
          Roster
        </h3>
        {members === null ? (
          <Skeleton h={80} mb={0} />
        ) : membersError !== null ? (
          <p style={{ ...GF, fontSize: 13, color: "#B91C1C" }}>{membersError}</p>
        ) : (
          <>
            {members.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 14px" }}>No members yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #E3E8EF" }}>
                    <th style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE, textAlign: "left", padding: "0 8px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Person</th>
                    <th style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE, textAlign: "left", padding: "0 8px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <MemberRow key={m.userId} workspaceId={workspaceId} unitId={unit.unitId} member={m} onChanged={loadMembers} />
                  ))}
                </tbody>
              </table>
            )}
            {unit.archivedAt === null && (
              <AddMemberForm
                workspaceId={workspaceId} unitId={unit.unitId}
                currentMemberIds={new Set(members.map(m => m.userId))}
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
  const [units, setUnits] = useState<OrganizationUnit[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const rows = useMemo(() => flatten(units ?? []), [units]);
  const selectedUnit = units?.find(u => u.unitId === selectedId) ?? null;

  if (loadError !== null) {
    return (
      <SCard>
        <p style={{ ...GF, fontSize: 13, color: "#B91C1C", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} /> {loadError}
        </p>
        <button onClick={load} style={BTN_SECONDARY}>Retry</button>
      </SCard>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "flex-start" }}>
      <SCard style={{ marginBottom: 0 }}>
        {units === null ? (
          <Skeleton h={160} mb={12} />
        ) : (
          <UnitList rows={rows} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        <div style={{ marginTop: 10 }}>
          <CreateUnitForm
            units={units ?? []}
            onCreated={unit => { setUnits(u => [...(u ?? []), unit]); setSelectedId(unit.unitId); }}
          />
        </div>
      </SCard>

      {selectedUnit === null ? (
        <SCard><p style={{ ...GF, fontSize: 13, color: SILVER }}>Choose a unit, or create the first one.</p></SCard>
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
  );
}

export function OrganizationUnitsPage() {
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;

  return (
    <SettingsPage title="Organization Units" breadcrumb="Organization Units">
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px", maxWidth: "62ch", lineHeight: 1.55 }}>
        Departments, offices and teams — for routing and reporting only. A
        member's title here (like "Department Head") lets a template slot
        resolve to whoever currently holds it, instead of naming a specific
        person.
      </p>
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
