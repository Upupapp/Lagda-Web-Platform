// Diffs two PrepParticipant[] snapshots and applies the difference to the
// real backend recipient contract. The frontend's PrepParticipantRole union
// is IDENTICAL to the backend's RecipientType enum (signer, approver,
// reviewer, acknowledgment-recipient, viewer, carbon-copy) — no role
// translation needed. `authMethodOverride` has no backend field yet and is
// never sent (Authentication stays local-only this phase — see the P1
// mission's Settings/Auth deferral).
//
// IDENTITY: a participant added in the UI starts with a LOCAL id
// (generated the same way it always was). Once the backend confirms
// creation, its real `recipientId` REPLACES that local id everywhere in the
// draft — participants array AND routing.groups[].participantIds — via the
// onIdAssigned callback. Nothing downstream is allowed to keep trusting a
// client-generated id after that point (mission P1 §6).

import type {
  PrepParticipant, PrepParticipantRole, PrepRoutingConfig, PrepRoutingGroup, RoutingMode,
} from "../../models/prepare";
import { realRecipientService, type BackendRecipientType, type RealRecipient } from "../real/recipient.service";

// Same nine-role identity — kept as an explicit, checked cast site rather
// than a silent `as` at every call, so a future divergence between the two
// unions fails to compile instead of silently mis-mapping.
function toBackendType(role: PrepParticipantRole): BackendRecipientType {
  return role;
}

/** Anything the backend assigned starts with this prefix (see
 *  Lagda-Backend's `createWorkspaceRecipientIdGenerator`/`mint("rcp")`) — a
 *  participant whose id does NOT start with it has never been persisted and
 *  is safe to POST as new. */
function isRealRecipientId(id: string): boolean {
  return id.startsWith("rcp_");
}

export interface ParticipantSyncResult {
  /** Local id → real id, for every participant that was newly created this
   *  pass. Empty when nothing changed. */
  idReplacements: Map<string, string>;
  /** Non-fatal: individual operations that failed, keyed by participant id,
   *  so the caller can surface a targeted message without discarding the
   *  visitor's edits or the rest of a batch that DID succeed. */
  errors: Map<string, string>;
}

export async function syncParticipants(
  workspaceId: string,
  documentId: string,
  previous: PrepParticipant[],
  next: PrepParticipant[],
): Promise<ParticipantSyncResult> {
  const idReplacements = new Map<string, string>();
  const errors = new Map<string, string>();

  const previousById = new Map(previous.map((p) => [p.id, p]));
  const nextIds = new Set(next.map((p) => p.id));

  // Removed — only ever for participants the backend actually knows about.
  for (const p of previous) {
    if (nextIds.has(p.id) || !isRealRecipientId(p.id)) continue;
    try {
      await realRecipientService.remove(workspaceId, documentId, p.id);
    } catch (err) {
      errors.set(p.id, err instanceof Error ? err.message : "Could not remove this participant.");
    }
  }

  // Added or changed.
  for (const p of next) {
    const prev = previousById.get(p.id);
    if (!prev) {
      if (isRealRecipientId(p.id)) continue; // already real; nothing to create
      try {
        const created = await realRecipientService.add(workspaceId, documentId, {
          name: p.name,
          email: p.email,
          organization: p.organization || null,
          type: toBackendType(p.role),
          isRequired: p.isRequired,
        });
        idReplacements.set(p.id, created.recipientId);
      } catch (err) {
        errors.set(p.id, err instanceof Error ? err.message : "Could not add this participant.");
      }
      continue;
    }

    const changed = prev.name !== p.name || prev.email !== p.email
      || prev.organization !== p.organization || prev.role !== p.role
      || prev.isRequired !== p.isRequired;
    if (!changed || !isRealRecipientId(p.id)) continue;

    try {
      await realRecipientService.update(workspaceId, documentId, p.id, {
        name: p.name,
        email: p.email,
        organization: p.organization || null,
        type: toBackendType(p.role),
        isRequired: p.isRequired,
      });
    } catch (err) {
      errors.set(p.id, err instanceof Error ? err.message : "Could not update this participant.");
    }
  }

  return { idReplacements, errors };
}

/** Sends each participant's current routingOrder (derived from its routing
 *  group's stepNumber — see PrepareContext's updateRouting) to the backend.
 *  Only real (already-persisted) participants can carry one. */
export async function syncRoutingOrder(
  workspaceId: string,
  documentId: string,
  participantsWithOrder: { id: string; routingOrder: number }[],
): Promise<Map<string, string>> {
  const errors = new Map<string, string>();
  for (const { id, routingOrder } of participantsWithOrder) {
    if (!isRealRecipientId(id)) continue;
    try {
      await realRecipientService.update(workspaceId, documentId, id, { routingOrder });
    } catch (err) {
      errors.set(id, err instanceof Error ? err.message : "Could not update routing order.");
    }
  }
  return errors;
}

export { isRealRecipientId };

/**
 * Reconstructs frontend participants + routing groups from a flat real
 * recipient list — used on resume (reload) so the backend, not localStorage,
 * is what repopulates these two steps once they've been persisted for real.
 *
 * The backend has no "routing group" resource, only a routingOrder integer
 * per recipient (mission P1 §7) — groups are DERIVED here from the distinct
 * routingOrder values present, contiguously renumbered exactly like
 * normalizeRoutingGroups() already does for locally-authored routing, so
 * the canonical stepNumber invariant holds for backend-sourced groups too.
 * `mode` has no backend field at all; it's inferred from shape (more than
 * one recipient sharing a step implies at least some parallelism) as a
 * reasonable default, not a stored fact — the visitor can still change it.
 */
export function buildParticipantsAndRoutingFromRecipients(
  recipients: RealRecipient[],
): { participants: PrepParticipant[]; routing: PrepRoutingConfig } {
  const participants: PrepParticipant[] = recipients.map((r) => ({
    id: r.recipientId,
    name: r.name,
    email: r.email,
    role: r.type as PrepParticipantRole,
    organization: r.organization ?? "",
    isRequired: r.isRequired,
    routingGroupId: null,
    authMethodOverride: null,
  }));

  const distinctOrders = [...new Set(recipients.map((r) => r.routingOrder))].sort((a, b) => a - b);
  const groups: PrepRoutingGroup[] = distinctOrders.map((order, i) => ({
    id: `grp_real_${order}`,
    stepNumber: i + 1,
    label: `Step ${i + 1}`,
    participantIds: recipients.filter((r) => r.routingOrder === order).map((r) => r.recipientId),
    requiredCompletionRule: "all",
  }));

  const groupIdByOrder = new Map(distinctOrders.map((order, i) => [order, groups[i]!.id]));
  const orderByRecipientId = new Map(recipients.map((r) => [r.recipientId, r.routingOrder]));
  for (const p of participants) {
    const order = orderByRecipientId.get(p.id);
    p.routingGroupId = order === undefined ? null : (groupIdByOrder.get(order) ?? null);
  }

  const anyGroupHasMultiple = groups.some((g) => g.participantIds.length > 1);
  const mode: RoutingMode = groups.length <= 1
    ? (anyGroupHasMultiple ? "parallel" : "sequential")
    : (anyGroupHasMultiple ? "mixed" : "sequential");

  return { participants, routing: { mode, groups } };
}
