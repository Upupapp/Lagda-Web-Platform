# Workspace invitations — product inventory

**Established by:** BACKEND-26. Every entry was found by reading the frontend.

Sources inspected:

- `src/app/pages/platform/workspace/InvitationsPage.tsx` — the send form and the
  pending list
- `src/app/pages/auth/AcceptInvitation.tsx` — the invitee's page
- `src/app/services/mock/workspace-admin.service.ts` — `asyncSendInvitation`,
  `asyncResendInvitation`, `asyncRevokeInvitation`
- `src/app/services/mock/auth.service.ts` — `getInvitation`, `acceptInvitation`,
  `declineInvitation`
- `src/app/models/workspace-admin.ts` — `WorkspaceInvitation`,
  `WorkspaceInvitationStatus`
- `src/app/models/auth.ts` — `MockInvitation`
- `src/app/pages/platform/workspace/MembersPage.tsx`, `RolesPage.tsx`
- `docs/backend-integration-handoff.md` §20

Classification: **IMPLEMENT_NOW** · **FOUNDATION_ONLY** · **DEFER** ·
**NOT_IN_PRODUCT** · **REQUIRES_REVIEW**

---

## Lifecycle

| Behaviour | Where the product shows it | Status |
|---|---|---|
| **Create invitation** | `InvitationsPage.tsx` — an email field and a role selector, defaulting to `role_member`. Success reads *"Invitation added to this demonstration. No email was sent."* | **IMPLEMENT_NOW** |
| **List pending invitations** | The same page renders a table with email, role, status, expiry. | **IMPLEMENT_NOW** |
| **Resend** | A **Resend** button on every `pending` row. | **IMPLEMENT_NOW** |
| **Revoke** | A **Revoke** button on every `pending` row. | **IMPLEMENT_NOW** |
| **Preview** | `AcceptInvitation.tsx` loads the invitation and renders the workspace, the inviter, the role and the expiry *before* any action. | **IMPLEMENT_NOW** |
| **Accept** | The primary button on that page. | **IMPLEMENT_NOW** |
| **Decline** | A secondary button, with its own "Invitation declined" screen and `declineInvitation` in the mock service. | **IMPLEMENT_NOW** |
| **Invite as OWNER** | The role selector does **not** offer Owner. | **NOT_IN_PRODUCT** — and structurally prevented |
| **Bulk invite** | Nothing. One address per submission. | **NOT_IN_PRODUCT** |
| **Invite by link / copy link** | Nothing. Email is the only channel. | **NOT_IN_PRODUCT** |
| **Domain allowlist / auto-join** | Nothing. | **NOT_IN_PRODUCT** |
| **Edit a pending invitation's role** | Nothing — there is no edit control, only resend and revoke. | **DEFER** — OD-096 |
| **Member directory / remove member** | `MembersPage.tsx` exists with suspend, deactivate and remove. | **DEFER** — BACKEND-27 |

## The states the invitee's page can show

`AcceptInvitation.tsx` drives off `?inv=` with five fixture states:
`valid | expired | revoked | accepted | mismatch`.

All five are reachable in the backend, and the mapping is deliberate:

| Frontend state | Backend |
|---|---|
| `valid` | `pending` — preview succeeds |
| `expired`, `revoked` | collapsed into one public error, `invalid_or_expired_invitation` |
| `accepted` | also collapsed into the same error on preview; the accept path reports `joined: false` if the caller is already a member |
| `mismatch` | a DISTINCT error, `invitation_account_mismatch` |

**Why `mismatch` is the one that stays distinct.** A caller who reaches it has
already proved possession of a live credential, so they learn nothing new about
whether the invitation exists — and they genuinely need to be told to switch
accounts, because otherwise the only available advice is "your valid link does
not work". Expired and revoked are collapsed because distinguishing them would
confirm to an anonymous guesser that a token once existed.

## Roles the invite form offers

Seven options, and they are **`WorkspaceRoleId` values from the custom-roles
table**, not the canonical membership vocabulary:

| Form option | Backend role | Status |
|---|---|---|
| `role_member` (default) | `member` | **IMPLEMENT_NOW** — added to `WORKSPACE_ROLES` in migration 014 |
| `role_sender` | `sender` | **IMPLEMENT_NOW** — already canonical |
| `role_administrator` | `administrator` | **IMPLEMENT_NOW** — already canonical |
| `role_template_manager` | `template_administrator` | **IMPLEMENT_NOW** — already canonical |
| `role_reviewer_auditor` | `reviewer` **or** `auditor` | **REQUIRES_REVIEW** — OD-095. One UI option covers two canonical roles, and nothing says which one an invitation should grant. |
| `role_billing_admin` | none | **DEFER** — BACKEND-27/50. `PlatformRole` has `billing_administrator`; `WORKSPACE_ROLES` does not, and billing permissions are BACKEND-50's. |
| `role_contact_manager` | none | **DEFER** — BACKEND-27. A custom role over contact permissions that do not exist yet. |

`member` is the one addition, and it was **not invented**: it is the form's own
default and the product's `SYSTEM_ROLE_PERMISSIONS` defines `role_member`. §14
anticipates exactly this case — the minimum actual invited-member role the
product requires.

The other two are recorded rather than built. Inventing a `billing_admin`
membership role would mean deciding what billing permissions are, which is
BACKEND-50's question, not this command's.

## Deliberately not built

| Behaviour | Status | Owner |
|---|---|---|
| Custom roles, permission matrix, effective permissions | **DEFER** | BACKEND-27 |
| Member removal, suspend, deactivate, role change | **DEFER** | BACKEND-27 |
| Ownership transfer | **DEFER** | BACKEND-27 |
| Teams | **DEFER** | BACKEND-27+ |
| Activity log (`invitation-sent`, `invitation-accepted`, … — 5 of the 24 event types are invitation events) | **DEFER** | BACKEND-27+. The security events exist; a tenant-visible activity feed is a different feature. |
| Seat counting / billing entitlement on invite | **DEFER** | BACKEND-50 |
| Delivery bounce tracking (`WorkspaceInvitationStatus` includes `bounced`) | **DEFER** | BACKEND-44/45. No provider, so nothing can report a bounce. Never returned. |
| SCIM, directory sync, enterprise SSO | **NOT_IN_PRODUCT** | — |

## Handoff comparison

`backend-integration-handoff.md` §20 names:

- `POST /api/workspace/invitations` → implemented as
  `POST /workspaces/:workspaceId/invitations`, matching the path-scoped tenancy
  convention BACKEND-25 established rather than the handoff's flat path.
- `POST /api/invitations/:id/accept` → implemented as `POST /invitations/accept`
  with the token in the body. **Deliberate divergence:** the handoff's shape
  addresses an invitation by its ID, which would make the id sufficient to
  attempt acceptance; here the opaque credential resolves the invitation and the
  id is never an authorization input (§4).
- "cannot remove sole owner", role assignment, custom role CRUD, team CRUD —
  all BACKEND-27.
