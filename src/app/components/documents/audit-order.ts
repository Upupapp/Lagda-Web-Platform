// Display order for an audit trail.
//
// The backend emits entries chronologically, but several are written in the
// same instant — sending a request records "Request sent for signing" and
// "Recipient became eligible to sign" with one timestamp — and their order
// within that instant is not guaranteed. The dialog showed eligibility BEFORE
// the send it follows from, which reads as the record contradicting itself.
//
// So: by time first, then — only among entries sharing a timestamp — by where
// the event sits in a request's lifecycle, then by the server's own order.
// Entries at distinct times are never reordered.
//
// The type names are the backend's EvidenceEventType values
// (Lagda-Backend application/src/audit/audit-trail.ts), timeline ones only.

import type { AuditEntry } from "../../services/real/signing-request.service";

const RANK: Readonly<Record<string, number>> = {
  "transaction-created": 0,
  "transaction-sent": 1,
  // "recipient-activated" is placed by context — see rankOf.
  "authentication-completed": 3,
  "document-viewed": 4,
  "consent-accepted": 5,
  "submission-accepted": 6,
  "signature-completed": 7,
  "approval-completed": 7,
  "participant-skipped": 7,
  "participant-declined": 7,
  "transaction-completed": 9,
  "transaction-cancelled": 9,
  "transaction-expired": 9,
};

/**
 * Eligibility follows a SEND when one shares its instant (the first signer),
 * and otherwise follows the previous participant finishing (sequential
 * routing: the next signer becomes eligible as the last one completes).
 */
function rankOf(type: string, groupHasSend: boolean): number | undefined {
  if (type === "recipient-activated") return groupHasSend ? 2 : 8;
  return RANK[type];
}

export function orderAuditEntries(entries: readonly AuditEntry[]): AuditEntry[] {
  const times = entries.map(e => Date.parse(e.occurredAt));
  // An unparseable time leaves nothing safe to sort by: keep server order.
  if (times.some(t => Number.isNaN(t))) return [...entries];
  const sendTimes = new Set(entries.filter(e => e.type === "transaction-sent").map(e => Date.parse(e.occurredAt)));
  // An unknown type inherits the rank of the entry before it in server order,
  // so it stays beside its neighbour and the comparison remains consistent.
  let previous = 0;
  const ranks = entries.map((e, i) => {
    const r = rankOf(e.type, sendTimes.has(times[i] ?? 0));
    previous = r ?? previous;
    return previous;
  });
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) =>
      (times[a.index] ?? 0) - (times[b.index] ?? 0)
      || (ranks[a.index] ?? 0) - (ranks[b.index] ?? 0)
      || a.index - b.index)
    .map(x => x.entry);
}
