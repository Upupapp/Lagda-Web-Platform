// The backend's signing-request state, in the platform's status vocabulary.
//
// `SigningRequestState` (what the API returns) and `TransactionStatus` (what
// `StatusBadge`, its tones and its labels are keyed by) overlap for eight of
// the nine values exactly. Only `completion-ready` has no matching label; it
// maps to `finalizing` — every required participant has acted and the signed
// document is being produced. (It once mapped to `awaiting-signature`, which
// told a sender whose document had stalled that it was still out for signing.)
//
// This used to be a private constant inside DocumentsPage. It is shared now
// because the dashboard renders the same rows with the same badge, and two
// copies of a nine-entry map is exactly the kind of thing that drifts by one
// entry and is never noticed until a badge says the wrong word.

import type { SigningRequestState, CompletionStatus } from "./real/signing-request.service";
import type { TransactionStatus } from "../models";

export const SIGNING_REQUEST_STATUS: Record<SigningRequestState, TransactionStatus> = {
  "draft": "draft",
  "ready-to-send": "ready-to-send",
  "sent": "sent",
  "partially-completed": "partially-completed",
  "completion-ready": "finalizing",
  "completed": "completed",
  "declined": "declined",
  "cancelled": "cancelled",
  "expired": "expired",
};

/**
 * True for a request whose every signature is in and whose final document
 * could not be produced (109). Everywhere a list says "Finalizing", this says
 * whether it is still at it or has stopped. Here, not in the request service,
 * so a screen that only needs the answer does not depend on the service.
 */
export function completionFailed(item: { state: SigningRequestState; completion?: CompletionStatus | null }): boolean {
  return item.state === "completion-ready" && item.completion?.state === "failed";
}
