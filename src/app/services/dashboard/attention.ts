// What a sender's dashboard says about their signing requests.
//
// ── Why this is a module and not a component ───────────────────────────────
//
// Every decision here — what counts as "stalled", when "expiring soon" starts,
// which request is more urgent than which — is a rule somebody will one day
// argue with. Rules that live inside a React closure can only be checked by
// rendering the page; rules that live here are checked in a millisecond with
// a fixed clock. Same pattern as `send-readiness.ts` and `field-autofix.ts`.
//
// ── What it is built on, and what it is honest about ───────────────────────
//
// Only `GET /workspaces/:id/signing-requests`, which returns per row: state,
// participant counts, and four timestamps. That is the entire input. Nothing
// here fabricates a number the API did not return.
//
// The list is capped at 100 rows per page and offers no status filter, so
// anything that looks like a total is a total OVER WHAT WAS FETCHED. The
// summary carries `fetched` and `total` separately for that reason, and the
// page is expected to say so when they differ.

import type {
  SigningRequestListItem, SigningRequestState,
} from "../real/signing-request.service";

export const DAY_MS = 86_400_000;

/** Thresholds, as parameters so the rules are one place and tests can pin them. */
export interface AttentionThresholds {
  /** `expiresAt` within this many days of `now` counts as expiring soon. */
  readonly expiringDays: number;
  /** Sent this long ago with nobody signed yet counts as stalled. */
  readonly stalledDays: number;
  /** A draft older than this that was never sent counts as forgotten. */
  readonly forgottenDraftDays: number;
}

export const DEFAULT_THRESHOLDS: AttentionThresholds = {
  expiringDays: 7,
  stalledDays: 5,
  forgottenDraftDays: 2,
};

// ── Buckets ────────────────────────────────────────────────────────────────

const IN_FLIGHT: readonly SigningRequestState[] = ["sent", "partially-completed", "completion-ready"];
const DRAFT: readonly SigningRequestState[] = ["draft", "ready-to-send"];

export function isInFlight(item: SigningRequestListItem): boolean {
  return IN_FLIGHT.includes(item.state);
}

export function isDraft(item: SigningRequestListItem): boolean {
  return DRAFT.includes(item.state);
}

export interface StatusSummary {
  readonly drafts: number;
  readonly inFlight: number;
  readonly completed: number;
  /** Declined or expired — states that ended without a signature. */
  readonly attention: number;
  readonly cancelled: number;
  /** How many rows these counts were computed over. */
  readonly fetched: number;
  /** The API's workspace-wide count, all states. Larger than `fetched` when paged. */
  readonly total: number;
}

export function summarize(items: readonly SigningRequestListItem[], total: number): StatusSummary {
  let drafts = 0, inFlight = 0, completed = 0, attention = 0, cancelled = 0;
  for (const item of items) {
    if (isDraft(item)) drafts += 1;
    else if (isInFlight(item)) inFlight += 1;
    else if (item.state === "completed") completed += 1;
    else if (item.state === "declined" || item.state === "expired") attention += 1;
    else cancelled += 1;
  }
  return { drafts, inFlight, completed, attention, cancelled, fetched: items.length, total };
}

// ── Needs attention ────────────────────────────────────────────────────────

export type AttentionKind = "declined" | "expiring" | "stalled" | "never-sent";

export interface AttentionEntry {
  readonly kind: AttentionKind;
  readonly item: SigningRequestListItem;
  /**
   * Days until expiry (for `expiring`), days since sent (for `stalled`), or
   * days since created (for `never-sent`). Absent for `declined`, which is
   * urgent regardless of age.
   */
  readonly days?: number;
}

/**
 * Urgency order. Declined first: somebody has refused and the sender may not
 * know yet. Expiring next, soonest first. Then stalled, oldest first. Then
 * drafts that were prepared and forgotten, oldest first.
 */
const KIND_RANK: Record<AttentionKind, number> = {
  declined: 0, expiring: 1, stalled: 2, "never-sent": 3,
};

function daysBetween(fromIso: string, toMs: number): number {
  return (toMs - Date.parse(fromIso)) / DAY_MS;
}

export function needsAttention(
  items: readonly SigningRequestListItem[],
  now: number,
  thresholds: AttentionThresholds = DEFAULT_THRESHOLDS,
): AttentionEntry[] {
  const out: AttentionEntry[] = [];

  for (const item of items) {
    if (item.state === "declined") {
      out.push({ kind: "declined", item });
      continue;
    }

    if (isInFlight(item)) {
      // Expiry is the more urgent of the two in-flight conditions, and an
      // item is listed once — under the condition that matters more.
      if (item.expiresAt !== null) {
        const daysLeft = -daysBetween(item.expiresAt, now);
        if (daysLeft >= 0 && daysLeft <= thresholds.expiringDays) {
          out.push({ kind: "expiring", item, days: daysLeft });
          continue;
        }
      }
      if (item.sentAt !== null && item.completedParticipantCount === 0) {
        const since = daysBetween(item.sentAt, now);
        if (since >= thresholds.stalledDays) {
          out.push({ kind: "stalled", item, days: since });
        }
      }
      continue;
    }

    if (isDraft(item)) {
      const age = daysBetween(item.createdAt, now);
      if (age >= thresholds.forgottenDraftDays) {
        out.push({ kind: "never-sent", item, days: age });
      }
    }
  }

  return out.sort((a, b) => {
    const rank = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (rank !== 0) return rank;
    // Within a kind: expiring soonest first; everything else oldest first.
    const da = a.days ?? 0, db = b.days ?? 0;
    return a.kind === "expiring" ? da - db : db - da;
  });
}

// ── In flight ──────────────────────────────────────────────────────────────

export interface InFlightEntry {
  readonly item: SigningRequestListItem;
  readonly signed: number;
  readonly of: number;
}

/** Sent requests still waiting on somebody, most recently sent first. */
export function inFlight(items: readonly SigningRequestListItem[]): InFlightEntry[] {
  return items
    .filter(isInFlight)
    .sort((a, b) => Date.parse(b.sentAt ?? b.createdAt) - Date.parse(a.sentAt ?? a.createdAt))
    .map(item => ({ item, signed: item.completedParticipantCount, of: item.participantCount }));
}

/** Completed requests, most recent first — for a short "recently done" list. */
export function recentlyCompleted(
  items: readonly SigningRequestListItem[], limit = 5,
): SigningRequestListItem[] {
  return items
    .filter(item => item.state === "completed" && item.completedAt !== null)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!))
    .slice(0, limit);
}
