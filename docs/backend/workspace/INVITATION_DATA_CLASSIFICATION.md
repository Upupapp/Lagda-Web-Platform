# Invitation data classification

**Established by:** BACKEND-26. Companion to
[WORKSPACE_DATA_CLASSIFICATION.md](./WORKSPACE_DATA_CLASSIFICATION.md).

Classes: **SECRET / EPHEMERAL** (exists in memory for one operation) ·
**SENSITIVE** (a credential handle) · **PII** · **BUSINESS_SENSITIVE** ·
**AUTHORIZATION_STATE** · **INTERNAL** (opaque identifier).

---

| Datum | Class | Response | Log | Metric label | Persisted |
|---|---|---|---|---|---|
| **raw invitation token** | **SECRET / EPHEMERAL** | **never** | **never** | never | **never** |
| **full invitation URL** | **SECRET / EPHEMERAL** | never | **never** | never | **never** |
| `token_digest` | **SENSITIVE** | **never** | never | never | yes — the only stored form |
| `invitee_email` (display) | **PII** | to workspace managers | **no** | never | yes |
| `invitee_normalized_email` | **PII / IDENTITY** | **never** | **no** | never | yes |
| `invitation_id` | INTERNAL | yes | yes | **no** | yes |
| `workspace_id` | INTERNAL | yes | yes | **no** | yes |
| `invited_by_user_id` | PII (pseudonymous) | **no** | yes | **no** | yes |
| `accepted_by_user_id` | PII (pseudonymous) | **no** | yes | **no** | yes |
| `requested_role` | AUTHORIZATION_STATE | yes | yes | **bounded — permitted** | yes |
| derived state | AUTHORIZATION_STATE | yes | yes | as `result` | no — computed |
| `expires_at`, `created_at` | INTERNAL | yes | yes | no | yes |
| workspace **name** on a preview | BUSINESS_SENSITIVE | **yes — see below** | no | never | n/a |

## The raw token exists for one operation

It is generated, handed to `scheduleDelivery`, and discarded when the
transaction ends. It is not written to `workspace_invitations`, not returned
from any route, not put in a job payload by any code in this command, and not
logged.

Two consequences worth stating plainly:

- **A database dump contains no usable invitation credential.** Asserted by
  scanning the stored row for the raw value.
- **A lost token cannot be recovered, only replaced.** That is why resend
  rotates rather than re-sending: there is nothing to re-send.

## The full URL is as secret as the token

It contains the token. Every rule above applies to it identically — no logging,
no persistence, no analytics identifier, no error-report attachment. The link
builder returns it directly to the delivery seam and nothing else sees it.

## Why the invitee's email is returned to managers but not logged

A manager of a workspace is entitled to see who they invited: the pending list
renders it, and withholding it would make the feature unusable.

That entitlement is **scoped to the response**. An email address in an
operational log is personal data in a system that classifies logs differently
from tenant data, retains them differently, and ships them to places nobody
reviewed for PII. Invitation events carry `invitationId` and `workspaceId`; the
address stays in the database and in the manager's browser.

## Why the workspace name IS on a preview

Workspace names are business-sensitive — WORKSPACE_DATA_CLASSIFICATION.md
explains that a name can disclose a client, a matter or a counterparty.

Returning one on an invitation preview is a **considered exception**. The
credential was deliberately given to this person by someone authorized to give
it, and an invitation page that cannot say which workspace it is for is useless.
The disclosure is bounded to exactly that: the name, the role, the invited
address and the expiry. No members, no counts, no documents, no settings.

It remains absent from logs and metrics, as everywhere else.

## Retention

**Unresolved — OD-097.** Two clocks that must not be conflated:

- **Credential validity** — 7 days, enforced by `expires_at`.
- **Invitation history retention** — undecided.

Terminal invitations are retained indefinitely today, and the runtime role has
no `DELETE` grant, so nothing in the application can remove one. That is the
right default while the question is open: invitation history is security history
— who was offered access to a tenant, by whom, and whether they took it.

Invitation records are personal data and belong in BACKEND-54's export review
and BACKEND-55's erasure review. Neither is implemented here.

## Cross-border

No new processor and no new infrastructure. Invitation records live in the
primary PostgreSQL database, under OD-001 like everything else.
