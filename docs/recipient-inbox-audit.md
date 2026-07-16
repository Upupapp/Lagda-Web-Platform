# Recipient Inbox — Pre-Implementation Audit (Command 27)

**Audit date:** 2026-07-16
**Command:** 27

---

## Existing recipient-discovery and inbox code

### No `/app/inbox` route exists
`src/router.tsx` has no `/app/inbox` route. The platform shell has a `/app/notifications` placeholder (`PlatformPlaceholder`). No "My Actions" or "Inbox" navigation item exists in `PRIMARY_NAV`.

### No authenticated inbox model exists
`src/app/models/recipient.ts` defines the C20 participant-facing types (`RecipientRequest`, `RecipientParticipant`, `RecipientField`, `SignatureAdoption`, etc.) for the external signing flow. No `RecipientInboxItem`, `RecipientAssignmentStatus`, `RecipientDeadlineState`, or `RecipientHandoffContext` exists.

### No inbox service exists
`src/app/services/mock/` has `recipient.service.ts` for the C20 flow. No `inbox.service.ts` exists.

### Existing recipient routes (C20)
`/sign/:requestId` under `RecipientLayout` — external recipient signing flow, no auth guard, flow-controlled access. This route is correctly separate from the platform shell and will be reused as the handoff destination.

### Dashboard does not include My Actions
`PlatformDashboard.tsx` has Quick Actions (sender-focused), Needs Attention (sender-focused), Recent Documents, Recent Activity, Template Shortcuts. No My Actions / Inbox section exists.

### "Awaiting My Action" in Documents
`DocumentsPage.tsx` has an `awaiting-my-action` view that shows *sender-side* transactions awaiting another participant — not the current user's recipient assignments. This is sender-side only and correctly separate.

### C20 fixture IDs (available for handoff)
| Fixture ID | Role | Status |
|---|---|---|
| `req-engagement-0002-marco` | signer | active |
| `req-psa-0001-lea` | signer (multi-doc) | active |
| `req-dpa-0005-ana` | approver | active |
| `req-policy-review-0006` | reviewer | active |
| `req-policy-0004-sofia` | acknowledgment-recipient | active |
| `req-viewer-0007` | viewer | active |
| `req-copy-0008` | copy-recipient | active (completed copy) |
| `req-locked-0009` | signer | routing-locked |
| `req-expired-0010` | signer | expired |
| `req-cancelled-0011` | signer | cancelled |
| `req-voided-0012` | signer | voided |
| `req-done-0013` | signer | completed |

### Privacy findings
- No cross-user Inbox access exists anywhere
- No email-based access grants exist
- No Contact-based access grants exist
- `PlatformContext` user and workspace state is personal to the session
- No localStorage of recipient data exists

### Missing items (to be created in C27)
1. `src/app/models/inbox.ts` — inbox domain types
2. `src/app/services/mock/inbox.service.ts` — inbox service + fixtures
3. `src/app/pages/platform/inbox/InboxPage.tsx` — `/app/inbox`
4. `src/app/pages/platform/inbox/AssignmentDetailPage.tsx` — `/app/inbox/:requestId`
5. Platform nav: "My Actions" nav item
6. Router: 2 new routes
7. Dashboard: My Actions section
8. Documentation

### No eNotary inbox, role, or action exists — compliant
### No Burgundy (#67023B) in any inbox-relevant file — compliant
