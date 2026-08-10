# Invitation architecture

**Established by:** BACKEND-26. Read with
[INVITATION_STATE_MACHINE.md](./INVITATION_STATE_MACHINE.md),
[INVITATION_SECURITY.md](./INVITATION_SECURITY.md),
[MEMBERSHIP_ARCHITECTURE.md](./MEMBERSHIP_ARCHITECTURE.md) and
[ADR-019](../adr/ADR-019-workspace-invitations.md).

---

## 1. The rule

> An invitation is an **offer** to join one workspace under one permitted role.
> It grants nothing until acceptance creates a membership.

`workspace_invitations` and `workspace_memberships` are separate tables, and
that separation is the design rather than a normalization preference. A
`status = 'PENDING'` column on the membership table would put people who have
accepted nothing into the authorization table, and every authorization query in
the system would then depend on `AND status = 'ACTIVE'` — a filter one caller
eventually forgets, in a query that then admits someone who never replied.

## 2. The two proofs

```
  the credential   proves the offer reached the invited mailbox
  the session      proves who is claiming it
```

Acceptance requires **both**. That is what makes a forwarded or stolen link
worthless: whoever receives it still cannot authenticate as the invited address.

It is also the honest limit of the design. If an attacker controls both the
mailbox *and* an account for it, the system cannot distinguish them from the
legitimate owner — no email-based invitation can. That is stated in
INVITATION_SECURITY.md rather than glossed.

## 3. Identity

The invitee is an **email address**, not a `UserId`. Two columns:

| Column | Purpose |
|---|---|
| `invitee_email` | What the inviter typed. Rendered back to them. |
| `invitee_normalized_email` | The identity key. Uniqueness and the acceptance match are computed against it. CHECK-constrained to be lower case. |

The normalizer is `normalizeEmail` from `@lagda/auth` — **the same one**
registration, login and password recovery use. An address that resolved to one
identity at login and another at invitation would be a way to have someone
else's invitation delivered to a mailbox you control.

An invitee needs **no account**. That is the whole point of an email-addressed
offer: `nobody@example.com` can be invited, register later, and accept. No
placeholder user row and no placeholder membership is created — asserted in the
integration suite.

## 4. Authorization to invite

```
authenticated user + workspaceId
        → requireWorkspaceAccess   (BACKEND-25)
        → canManageInvitations(role)
        → canGrantRole(inviterRole, requestedRole)
```

Three steps, in that order, before the email is even parsed. A caller who is not
a manager must not learn whether an address is well-formed, let alone whether it
is already a member.

`canManageInvitations` is `owner` only today, and it is a **separate function**
from `canManageWorkspace` rather than an alias — the product's own table grants
`members:invite` to `administrator` while reserving `workspace:manage` more
narrowly, so BACKEND-27 will almost certainly separate them, and two names now
means that is one edit.

`canGrantRole` is the privilege-escalation seam. Today it answers one question;
BACKEND-27 replaces the body, not the call sites.

**`owner` is not invitable.** It is absent from `INVITABLE_WORKSPACE_ROLES`, so
the request schema built from that list cannot express it, and a database CHECK
refuses it independently. A workspace has exactly one owner, and an invitation
granting a second would break that invariant days later in a transaction the
inviter is not present for.

## 5. The credential

| Property | Value |
|---|---|
| Entropy | 32 bytes / 256 bits, from `randomBytes` |
| Encoding | base64url, 43 characters |
| Storage | SHA-256 digest, domain `lagda.workspace-invitation:` |
| Raw persistence | **never** |
| Lifetime | 7 days (`INVITATION_TTL_MS`) |
| Uses | one |
| Validation | exact length and alphabet, **before** any digest or lookup |

Eight credential types now digest to 64 hex characters in this system. The
domain prefix is what stops any of them resolving another's row — and an
invitation token is the only one that grants access to a **tenant** rather than
to an account, which makes the separation matter more here, not less.

Expiry does not justify less entropy. Seven days is still 604,800 seconds of
guessing.

## 6. The credential RLS path

This is the part with no precedent in the codebase, and it is the reason
ADR-019 exists.

An invitee is not a member. They have no tenant context and cannot be given one
before the invitation says which tenant. Under `tenant_isolation` alone they see
nothing, so acceptance is impossible.

Migration 014 adds a **third transaction-local setting**:

```sql
create policy invitation_credential_read on workspace_invitations
for select
using (token_digest = lagda_current_invitation_digest())
```

Two facts make this safe, and they are the whole argument:

1. **Equality on a UNIQUE column** matches at most one row. It cannot
   enumerate, cannot scan a workspace, and cannot answer any question except
   "the invitation whose credential I already hold". Holding the setting *is*
   holding the credential.
2. **`FOR SELECT`.** It cannot accept, revoke or supersede anything. Every write
   still requires tenant context.

No role gains `BYPASSRLS`. No policy is widened. The `find()` method issues a
`SELECT` with **no predicate at all** — which is the clearest possible
demonstration that the policy is doing the work, and the integration suite runs
exactly that query and asserts one row.

### The tenant transition

```
runForInvitationCredential(digest)
  ├─ SET LOCAL lagda.invitation_digest      → resolve the invitation
  └─ enterWorkspace(invitation.workspaceId) → SET LOCAL lagda.workspace_id
       └─ the full WorkspaceUnitOfWork, on the SAME transaction
```

One transaction throughout. Two would leave a window in which the invitation is
consumed and the membership is not, or the reverse. The workspace comes from the
**resolved invitation** — there is no parameter a request body could reach, so
workspace tampering is unexpressible rather than rejected.

## 7. Acceptance

```
digest the token            (shape first; malformed never reaches the database)
read the caller's CURRENT canonical email   (from the account, not the session)
resolve the invitation by digest
is it redeemable?           (pending, by derived state)
does the email match?       (canonical vs canonical)
enter the workspace
  already a member?  → consume the invitation, report joined: false
  otherwise          → consume, then INSERT the membership
commit
```

**Consume first, then insert.** The conditional `UPDATE … WHERE` on the four
terminal timestamps is the serialization point: of two concurrent acceptances of
one token, exactly one matches a row and the other stops without ever attempting
an insert. Ordering it before the insert is safe because both are in one
transaction — if the insert fails, the consumption rolls back with it and the
invitation is live again. Both halves are asserted against PostgreSQL.

The membership role comes from the **persisted invitation**. There is no `role`
field on the accept request, so the invitee cannot choose their own.

**Already a member converges** rather than failing. The desired end state holds,
and leaving the invitation live would dangle a credential for access that
already exists.

## 8. What acceptance does not do

It does not create an account, issue a session, verify an email, or bypass MFA.
An invitation is an authorization offer, not an authentication ceremony — and
`email_verified_at` being untouched is an integration assertion, not a comment.

It also does not require a new session. Workspace authorization is server-side
membership state, so the same cookie that could not reach the workspace a moment
ago now can. That is BACKEND-25's design paying out, and there is an end-to-end
test through `createApp` for it.

## 9. Create is not resend

| | Create | Resend |
|---|---|---|
| Refuses a live duplicate | yes | n/a |
| Rotates the credential | issues the first | replaces in place |
| Rows | one per invitation | still one |
| Rate-limit policy | `…create.user` / `…create.workspace` | `…resend.*`, tighter |
| Idempotent operation | `workspace.invitation.create` | `workspace.invitation.resend` |

A double-submitted form must not mail the recipient twice and must not rotate a
credential the first email already delivered. Keeping the two operations
separate is what lets the rate limiter, the audit trail and the idempotency
scope tell a mistake from an intention.

**Resend rotates in place**, keeping one row. The invitation's identity is "this
workspace offered this address this role", and a resend changes none of that —
it replaces the *link*. A new row per resend would grow the manager's list one
entry per click and make "when were they invited" ambiguous. The old digest
stops resolving the moment the UPDATE commits: exactly one valid link at all
times.

Neither the address nor the role can change on a resend. There is no field for
either.

## 10. Delivery — BLOCKED

`scheduleDelivery` is called **inside** the transaction, and that placement is
the guarantee: if delivery cannot be durably scheduled, the invitation creation
or the credential rotation rolls back. On a resend that matters most — the worst
available outcome is the recipient's existing link invalidated and the
replacement never sent, and it cannot happen.

It is **optional**, exactly as it is for email verification and password reset,
and for the same reason: there is no notification infrastructure (OD-003,
BACKEND-44/45). Where it is absent the invitation is created correctly and the
raw token is discarded.

**A production invitee cannot currently receive a link.** That is stated here
and in the report rather than implied away. What exists is the complete secure
lifecycle behind it; what is missing is a provider and a template.

Provider retries reuse the same credential — only an explicit resend rotates.

## 11. The routes

| Method | Path | Auth | CSRF | Limit | Idempotency |
|---|---|---|---|---|---|
| `POST` | `/workspaces/:workspaceId/invitations` | session + owner | yes | create.user + create.workspace | **required** |
| `GET` | `/workspaces/:workspaceId/invitations` | session + owner | n/a | — | n/a |
| `POST` | `/workspaces/:id/invitations/:invitationId/resend` | session + owner | yes | resend.user + resend.workspace | **required** |
| `POST` | `/workspaces/:id/invitations/:invitationId/revoke` | session + owner | yes | — | n/a |
| `POST` | `/invitations/preview` | **public** | n/a | redeem.ip | n/a |
| `POST` | `/invitations/accept` | session | yes | redeem.ip | n/a |
| `POST` | `/invitations/decline` | session | yes | — | n/a |

**Every credential route is a POST, including preview.** A GET would put the
token in a URL and therefore in access logs, referrer headers and browser
history — and would let a mail security scanner, which fetches every link in a
message before a human sees it, consume an invitation by prefetching. A route
audit asserts that four plausible GET shapes all 404.

Acceptance needs no `Idempotency-Key`: it is already single-use by construction,
and the membership unique constraint makes retries converge.

## 12. What was not built

Custom roles, permission matrices, member directories, member removal, role
changes, ownership transfer, teams, bulk invite, domain allowlists, invite
links, seat enforcement, SCIM and directory sync. Each belongs to a named later
command, and none has a placeholder column, a stub route or a `TODO` on an
implemented path.
