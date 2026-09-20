// The backend's signing-request state, in the platform's status vocabulary.
//
// `SigningRequestState` (what the API returns) and `TransactionStatus` (what
// `StatusBadge`, its tones and its labels are keyed by) overlap for eight of
// the nine values exactly. Only `completion-ready` has no matching label; it
// maps to `awaiting-signature`, which is an accurate description — every
// recipient has acted and the document is not yet marked done.
//
// This used to be a private constant inside DocumentsPage. It is shared now
// because the dashboard renders the same rows with the same badge, and two
// copies of a nine-entry map is exactly the kind of thing that drifts by one
// entry and is never noticed until a badge says the wrong word.

import type { SigningRequestState } from "./real/signing-request.service";
import type { TransactionStatus } from "../models";

export const SIGNING_REQUEST_STATUS: Record<SigningRequestState, TransactionStatus> = {
  "draft": "draft",
  "ready-to-send": "ready-to-send",
  "sent": "sent",
  "partially-completed": "partially-completed",
  "completion-ready": "awaiting-signature",
  "completed": "completed",
  "declined": "declined",
  "cancelled": "cancelled",
  "expired": "expired",
};
