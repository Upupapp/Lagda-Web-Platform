// Step 3 of 7: Routing — configure how participants are sequenced.
// Routing groups are created automatically from the routing mode or
// manually by the user. Participants are assigned to groups here.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.

import React, { useEffect, useCallback, useState } from "react";
import { Route } from "lucide-react";
import { usePrepare } from "../../../context/PrepareContext";
import {
  ROUTING_MODE_DESCRIPTIONS,
  PREP_PARTICIPANT_ROLE_LABELS,
  PREP_ROLE_IS_BLOCKING,
  DEFAULT_ROUTING_CONFIG,
  normalizeRoutingGroups,
  deriveApprovalBasedGroups,
} from "../../../models/prepare";
import type {
  PrepRoutingGroup,
  PrepGroupId,
  PrepParticipantRole,
  PrepPaxId,
  RoutingMode,
  RoutingCompletionRule,
} from "../../../models/prepare";
import { StepBanner, StepTwoColumn, RailCard, StepIssueList } from "../../../components/prepare/StepBanner";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

const ROUTING_MODES: { id: RoutingMode; label: string }[] = [
  { id: "parallel",       label: "Parallel — everyone at once" },
  { id: "sequential",     label: "Sequential — one step at a time" },
  { id: "mixed",          label: "Mixed — groups, each in parallel" },
  { id: "approval-based", label: "Approval-based — approve before sign" },
];

function generateGroupId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Approval-based is handled separately by deriveApprovalBasedGroups() in
// models/prepare.ts — it's system-derived from roles, not a default starting
// point the user then customizes like the three modes here.
function buildDefaultGroups(
  mode: Exclude<RoutingMode, "approval-based">,
  participants: { id: PrepPaxId; role: PrepParticipantRole; name: string }[],
): PrepRoutingGroup[] {
  const blocking = participants.filter(p => PREP_ROLE_IS_BLOCKING[p.role]);

  if (mode === "parallel") {
    return normalizeRoutingGroups([
      {
        id:                     generateGroupId(),
        stepNumber:             0,
        label:                  "All participants",
        participantIds:         blocking.map(p => p.id),
        requiredCompletionRule: "all",
      },
    ]);
  }

  if (mode === "sequential") {
    return normalizeRoutingGroups(blocking.map((p, i) => ({
      id:                     generateGroupId(),
      stepNumber:             0,
      label:                  `Step ${i + 1}`,
      participantIds:         [p.id],
      requiredCompletionRule: "all" as RoutingCompletionRule,
    })));
  }

  // mixed
  if (blocking.length === 0) return [];
  return normalizeRoutingGroups([
    {
      id:                     generateGroupId(),
      stepNumber:             0,
      label:                  "Group 1",
      participantIds:         blocking.map(p => p.id),
      requiredCompletionRule: "all",
    },
  ]);
}

// ── Routing group card ────────────────────────────────────────────────────────

function GroupCard({
  group,
  index,
  allParticipants,
  canRemove,
  onLabelChange,
  onRuleChange,
  onParticipantToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  // Approval-based groups are system-derived from participant roles (see
  // deriveApprovalBasedGroups) — reordering, removing, or hand-picking
  // membership doesn't apply the way it does for a user-built Sequential or
  // Mixed structure, so those controls are locked here rather than left
  // clickable and silently overwritten by the next reconciliation pass.
  isSystemManaged,
}: {
  group: PrepRoutingGroup;
  index: number;
  allParticipants: { id: PrepPaxId; name: string; role: PrepParticipantRole }[];
  canRemove: boolean;
  onLabelChange:        (groupId: PrepGroupId, label: string) => void;
  onRuleChange:         (groupId: PrepGroupId, rule: RoutingCompletionRule) => void;
  onParticipantToggle:  (groupId: PrepGroupId, paxId: PrepPaxId) => void;
  onRemove:             (groupId: PrepGroupId) => void;
  onMoveUp:             (groupId: PrepGroupId) => void;
  onMoveDown:           (groupId: PrepGroupId) => void;
  isFirst: boolean;
  isLast:  boolean;
  isSystemManaged: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid #D1D9E0",
        borderRadius: 10,
        background: "#FAFBFC",
        overflow: "hidden",
      }}
    >
      {/* Group header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid #E3E8EF",
          background: "#F5F7FA",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: AZURE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          {group.stepNumber}
        </div>

        <input
          type="text"
          value={group.label}
          onChange={e => onLabelChange(group.id, e.target.value)}
          aria-label={`Label for routing step ${group.stepNumber}`}
          style={{
            ...GF,
            flex: 1,
            padding: "4px 8px",
            border: "1px solid #D1D9E0",
            borderRadius: 6,
            background: "#FFFFFF",
            fontSize: 13,
            fontWeight: 600,
            color: NAVY,
          }}
        />

        {!isSystemManaged && (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => onMoveUp(group.id)}
              disabled={isFirst}
              aria-label="Move step up"
              style={{
                ...GF,
                width: 26, height: 26,
                border: "1px solid #D1D9E0",
                borderRadius: 5,
                background: isFirst ? "#F5F7FA" : "#FFFFFF",
                color: isFirst ? "#D1D9E0" : NAVY,
                cursor: isFirst ? "not-allowed" : "pointer",
                fontSize: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >↑</button>
            <button
              onClick={() => onMoveDown(group.id)}
              disabled={isLast}
              aria-label="Move step down"
              style={{
                ...GF,
                width: 26, height: 26,
                border: "1px solid #D1D9E0",
                borderRadius: 5,
                background: isLast ? "#F5F7FA" : "#FFFFFF",
                color: isLast ? "#D1D9E0" : NAVY,
                cursor: isLast ? "not-allowed" : "pointer",
                fontSize: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >↓</button>
            {canRemove && (
              <button
                onClick={() => onRemove(group.id)}
                aria-label="Remove step"
                style={{
                  ...GF,
                  width: 26, height: 26,
                  border: "none",
                  borderRadius: 5,
                  background: "transparent",
                  color: GOLD,
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            )}
          </div>
        )}
      </div>

      {/* Participants in this group */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: SILVER, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Participants in this step
        </div>
        {isSystemManaged && (
          <div style={{ ...GF, fontSize: 11.5, color: SILVER, marginBottom: 10, fontStyle: "italic" }}>
            Assigned automatically based on each participant's role.
          </div>
        )}
        {allParticipants.length === 0 && (
          <div style={{ ...GF, fontSize: 13, color: SILVER }}>Add participants in the Participants step first.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allParticipants.map(p => {
            const inGroup = group.participantIds.includes(p.id);
            return (
              <label
                key={p.id}
                style={{
                  ...GF,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: isSystemManaged ? "default" : "pointer",
                  fontSize: 13,
                  color: isSystemManaged && !inGroup ? SILVER : NAVY,
                }}
              >
                <input
                  type="checkbox"
                  checked={inGroup}
                  disabled={isSystemManaged}
                  onChange={() => onParticipantToggle(group.id, p.id)}
                  style={{ accentColor: AZURE, width: 15, height: 15 }}
                />
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: SILVER, fontSize: 12 }}>
                  {PREP_PARTICIPANT_ROLE_LABELS[p.role] ?? p.role}
                </span>
              </label>
            );
          })}
        </div>

        {/* Completion rule */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ ...GF, fontSize: 12, fontWeight: 600, color: SILVER, flexShrink: 0 }}>
            Complete when:
          </span>
          <label style={{ ...GF, display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: NAVY }}>
            <input
              type="radio"
              name={`rule-${group.id}`}
              value="all"
              checked={group.requiredCompletionRule === "all"}
              onChange={() => onRuleChange(group.id, "all")}
              style={{ accentColor: AZURE }}
            />
            All participants complete
          </label>
          <label style={{ ...GF, display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: NAVY }}>
            <input
              type="radio"
              name={`rule-${group.id}`}
              value="any"
              checked={group.requiredCompletionRule === "any"}
              onChange={() => onRuleChange(group.id, "any")}
              style={{ accentColor: AZURE }}
            />
            Any one participant completes
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Main step ─────────────────────────────────────────────────────────────────

export function RoutingStep() {
  const { draft, updateRouting, setStep, validate } = usePrepare();

  useEffect(() => { setStep("routing"); }, [setStep]);

  const participants = (draft?.participants ?? []).filter(p => PREP_ROLE_IS_BLOCKING[p.role]);
  const routing      = draft?.routing ?? DEFAULT_ROUTING_CONFIG;
  const validation   = draft ? validate() : null;
  const routeErrors  = validation?.errors.filter(e => e.stepId === "routing") ?? [];
  const routeWarnings = validation?.warnings.filter(e => e.stepId === "routing") ?? [];
  const isApprovalBased = routing.mode === "approval-based";

  // ── Mode change: rebuild groups ─────────────────────────────────────────────

  const handleModeChange = useCallback((mode: RoutingMode) => {
    const groups = mode === "approval-based"
      ? deriveApprovalBasedGroups(participants)
      : buildDefaultGroups(mode, participants);
    updateRouting({ mode, groups });
  }, [participants, updateRouting]);

  // ── Participant reconciliation ──────────────────────────────────────────────
  // Runs whenever who's on the transaction (or their role) changes — not on
  // every routing edit — so routing groups never retain a stale reference to
  // a removed participant, and Approval-based stays fully system-derived.
  // routingRef avoids needing `routing` itself in the dependency array, which
  // would re-run this on every routing mutation (including the ones this
  // effect makes) instead of only on participant changes.
  const routingRef = React.useRef(routing);
  routingRef.current = routing;
  const participantsSignature = participants.map(p => `${p.id}:${p.role}`).join(",");

  useEffect(() => {
    const current = routingRef.current;
    let nextGroups: PrepRoutingGroup[];

    if (current.mode === "approval-based") {
      nextGroups = deriveApprovalBasedGroups(participants, current.groups);
    } else if (current.mode === "parallel") {
      // Parallel has no "which group" choice — it's everyone, together — so
      // the single group is kept in sync rather than left to go stale.
      const existing = current.groups[0];
      nextGroups = normalizeRoutingGroups([
        {
          id:                     existing?.id ?? generateGroupId(),
          stepNumber:             0,
          label:                  existing?.label ?? "All participants",
          participantIds:         participants.map(p => p.id),
          requiredCompletionRule: existing?.requiredCompletionRule ?? "all",
        },
      ]);
    } else {
      // Sequential / Mixed are user-customized structures — only strip
      // references to participants who no longer exist or no longer hold a
      // blocking role. Never auto-add; the user assigns new participants
      // themselves via the checkboxes below.
      const blockingIds = new Set(participants.map(p => p.id));
      nextGroups = normalizeRoutingGroups(
        current.groups.map(g => ({ ...g, participantIds: g.participantIds.filter(id => blockingIds.has(id)) })),
      );
    }

    if (JSON.stringify(nextGroups) !== JSON.stringify(current.groups)) {
      updateRouting({ ...current, groups: nextGroups });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantsSignature]);

  // ── Group operations ────────────────────────────────────────────────────────

  const handleLabelChange = useCallback((groupId: PrepGroupId, label: string) => {
    const groups = routing.groups.map(g => g.id === groupId ? { ...g, label } : g);
    updateRouting({ ...routing, groups: normalizeRoutingGroups(groups) });
  }, [routing, updateRouting]);

  const handleRuleChange = useCallback((groupId: PrepGroupId, rule: RoutingCompletionRule) => {
    const groups = routing.groups.map(g => g.id === groupId ? { ...g, requiredCompletionRule: rule } : g);
    updateRouting({ ...routing, groups: normalizeRoutingGroups(groups) });
  }, [routing, updateRouting]);

  const handleParticipantToggle = useCallback((groupId: PrepGroupId, paxId: PrepPaxId) => {
    const groups = routing.groups.map(g => {
      if (g.id !== groupId) return g;
      const already = g.participantIds.includes(paxId);
      return {
        ...g,
        participantIds: already
          ? g.participantIds.filter(id => id !== paxId)
          : [...g.participantIds, paxId],
      };
    });
    updateRouting({ ...routing, groups: normalizeRoutingGroups(groups) });
  }, [routing, updateRouting]);

  const handleRemoveGroup = useCallback((groupId: PrepGroupId) => {
    const groups = routing.groups.filter(g => g.id !== groupId);
    updateRouting({ ...routing, groups: normalizeRoutingGroups(groups) });
  }, [routing, updateRouting]);

  const handleMoveUp = useCallback((groupId: PrepGroupId) => {
    const idx = routing.groups.findIndex(g => g.id === groupId);
    if (idx <= 0) return;
    const next = [...routing.groups];
    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
    updateRouting({ ...routing, groups: normalizeRoutingGroups(next) });
  }, [routing, updateRouting]);

  const handleMoveDown = useCallback((groupId: PrepGroupId) => {
    const idx = routing.groups.findIndex(g => g.id === groupId);
    if (idx < 0 || idx >= routing.groups.length - 1) return;
    const next = [...routing.groups];
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
    updateRouting({ ...routing, groups: normalizeRoutingGroups(next) });
  }, [routing, updateRouting]);

  const handleAddGroup = () => {
    const newGroup: PrepRoutingGroup = {
      id:                     generateGroupId(),
      stepNumber:             0,
      label:                  `Step ${routing.groups.length + 1}`,
      participantIds:         [],
      requiredCompletionRule: "all",
    };
    updateRouting({ ...routing, groups: normalizeRoutingGroups([...routing.groups, newGroup]) });
  };

  if (participants.length === 0) {
    return (
      <div style={GF}>
        <StepBanner
          icon={Route}
          eyebrow="Step 3 of 7"
          title="Routing"
          description="Choose how participants are sequenced and whether they act simultaneously or one at a time."
          meta="Waiting on participants"
        />
        <div style={{ padding: "24px", borderRadius: 10, background: "#F5F7FA", border: "1px solid #E3E8EF", fontSize: 14, color: SILVER, lineHeight: 1.6 }}>
          Add at least one signer, approver, reviewer, or acknowledgment recipient in the
          Participants step before configuring routing.
        </div>
      </div>
    );
  }

  const currentModeLabel = ROUTING_MODES.find(m => m.id === routing.mode)?.label ?? routing.mode;

  const main = (
    <div style={{ ...GF, width: "100%" }}>
      {/* Command 37: the Signing Workflow tab turns this routing order into named
          stages with an explicit required action and eSignature requirement per person.
          It is optional — simple routing configured here continues to work on its own,
          and Workflow Automation is never required. */}
      <div
        style={{
          ...GF, marginBottom: 24, padding: "14px 16px", borderRadius: 10,
          border: "1px solid #C8E1F5", background: "#F0F9FF",
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>
          Need named stages and per-person requirements?
        </p>
        <p style={{ fontSize: 12.5, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          After this document exists, its Signing Workflow tab can turn the routing order below
          into named stages — each with an explicit required action and an individual electronic
          signature requirement for every person. Routing configured here keeps working on its own,
          and nothing here depends on Workflow Automation.
        </p>
      </div>

      {/* Errors / Warnings */}
      <StepIssueList issues={routeErrors} severity="error" />
      <StepIssueList issues={routeWarnings} severity="warning" />

      {/* Routing mode selector */}
      <fieldset style={{ border: "none", margin: "0 0 28px", padding: 0 }}>
        <legend style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
          Routing mode
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ROUTING_MODES.map(m => {
            const active = routing.mode === m.id;
            return (
              <label
                key={m.id}
                style={{
                  ...GF,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: `1px solid ${active ? AZURE : "#D1D9E0"}`,
                  background: active ? "#EBF4FC" : "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="routing-mode"
                  value={m.id}
                  checked={active}
                  onChange={() => handleModeChange(m.id)}
                  style={{ accentColor: AZURE, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: NAVY }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 12, color: SILVER, marginTop: 3, lineHeight: 1.5 }}>
                    {ROUTING_MODE_DESCRIPTIONS[m.id]}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Routing groups */}
      <div>
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
          Routing steps
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {routing.groups.map((g, idx) => (
            <GroupCard
              key={g.id}
              group={g}
              index={idx}
              allParticipants={participants}
              canRemove={routing.groups.length > 1}
              isSystemManaged={isApprovalBased}
              onLabelChange={handleLabelChange}
              onRuleChange={handleRuleChange}
              onParticipantToggle={handleParticipantToggle}
              onRemove={handleRemoveGroup}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={idx === 0}
              isLast={idx === routing.groups.length - 1}
            />
          ))}
        </div>

        {(routing.mode === "sequential" || routing.mode === "mixed") && (
          <button
            onClick={handleAddGroup}
            style={{
              ...GF,
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px dashed ${AZURE}`,
              background: "#F0F7FF",
              color: AZURE,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              justifyContent: "center",
            }}
          >
            + Add routing step
          </button>
        )}
      </div>
    </div>
  );

  const rail = (
    <RailCard title="Routing preview">
      <div style={{ ...GF, fontSize: 12, color: "#4B5E70", marginBottom: 12 }}>
        Mode: <strong style={{ color: NAVY }}>{currentModeLabel}</strong>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {routing.groups.map(g => {
          const assigned = participants.filter(p => g.participantIds.includes(p.id));
          return (
            <div key={g.id} style={{ borderLeft: `2px solid ${AZURE}`, paddingLeft: 10 }}>
              <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY }}>
                Step {g.stepNumber}: {g.label}
              </div>
              <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 2 }}>
                {g.requiredCompletionRule === "all" ? "All must complete" : "Any one completes"}
              </div>
              {assigned.length === 0 ? (
                <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>No one assigned</div>
              ) : (
                <div style={{ ...GF, fontSize: 11, color: "#4B5E70", marginTop: 4 }}>
                  {assigned.map(p => p.name).join(", ")}
                </div>
              )}
            </div>
          );
        })}
        {routing.groups.length === 0 && (
          <div style={{ ...GF, fontSize: 12, color: SILVER }}>No routing steps configured.</div>
        )}
      </div>
    </RailCard>
  );

  return (
    <div style={GF}>
      <StepBanner
        icon={Route}
        eyebrow="Step 3 of 7"
        title="Routing"
        description="Choose how participants are sequenced and whether they act simultaneously or one at a time."
        meta={currentModeLabel}
      />
      <StepTwoColumn main={main} rail={rail} />
    </div>
  );
}
