# ADR-019 — Workspace invitations

**Status:** Accepted · **Date:** 2026-08-10 · **Command:** BACKEND-26

Builds on [ADR-018](./ADR-018-workspace-tenant-lifecycle.md) (tenant lifecycle),
[ADR-004](./ADR-004-workspace-row-level-security.md) (RLS),
[ADR-008](./ADR-008-server-sessions-and-csrf.md),
[ADR-009](./ADR-009-durable-idempotency.md),
[ADR-014](./ADR-014-account-identity-and-password-hashing.md) and
[ADR-016](./ADR-016-password-reset-challenges.md) (emailed credentials).

---

## Context

BACKEND-25 made membership the only authorization edge between a global user and
a workspace, and left one way to create one: being the person who created the
workspace. Everyone else needs an invitation.

The product has the full surface already — a send form with a role selector, a
pending list with resend and revoke, and an invitee page with accept and
decline. The handoff specifies the endpoints. What none of them settles is the
question that makes this hard:

**How does someone who is not a member, and may not even have an account, read
one row out of a tenant they cannot see?**

Under `tenant_isolation` a caller with no workspace context sees nothing. That
is correct and is exactly what BACKEND-25 built. It also means acceptance is
impossible without a deliberate answer.

## Decision

**A tenant-scoped invitation, addressed to a canonical email, carrying an
opaque single-use expiring credential, accepted only by an authenticated
account whose current canonical email matches — with membership creation and
invitation consumption in one transaction.**

Six parts:

1. `workspace_invitations` is a **separate table**. A pending invitation is
   never a membership row.
2. The invitee is an **email address**, normalized by the same function
   registration and login use. No account is required to be invited.
3. The credential is **256 bits, digest-stored, seven days, single-use**, in its
   own digest domain.
4. Acceptance requires **both** the credential and a session whose canonical
   email matches the invitation.
5. Consumption and membership creation are **one conditional UPDATE plus one
   INSERT in one transaction**.
6. The credential resolves the tenant through a **narrow `FOR SELECT` RLS
   policy keyed on a transaction-local digest** — not through a bypass.

### The part with no precedent: the credential RLS path

```sql
create policy invitation_credential_read on workspace_invitations
for select
using (token_digest = lagda_current_invitation_digest())
```

`token_digest` is UNIQUE. Equality against a unique column matches at most one
row, so the policy cannot enumerate, cannot scan a workspace, and cannot answer
any question except "the invitation whose credential I already hold". Holding
the transaction-local setting *is* holding the credential.

`FOR SELECT` means it cannot write. Tenant context — established afterwards from
the **resolved** invitation, on the same transaction — is what permits the
membership insert and the consumption.

This is the same shape BACKEND-25 used for "list my workspaces": a second
narrow, read-only, transaction-local context alongside tenant isolation. The
repository built for it has one method, returns one row, and issues a `SELECT`
with no predicate at all — which is the clearest demonstration available that
the policy is doing the work.

## Alternatives considered

### Create the membership when the invitation is sent

Simplest, and wrong. It grants tenant access to someone who has not replied, may
never reply, and may not exist. Every authorization query would then need to
exclude "invited but not accepted", and one that forgot would admit a stranger.
Rejected outright by the command's central rule.

### A `status` column on `workspace_memberships`

The same failure with a filter bolted on. `AND status = 'ACTIVE'` in every
authorization query is a condition one caller eventually omits — in the query
where omitting it grants access. Rejected.

### A JWT invitation token

Self-contained, needs no storage, resolves the workspace without any RLS
problem. It also cannot be revoked, cannot be superseded by a resend, and cannot
be made single-use without the server-side state it exists to avoid — so the
three operations the product actually has (revoke, resend, accept-once) would
each need a database round trip anyway. And a signed token carrying `role` and
`workspaceId` puts authorization claims in a value the holder can read and a key
compromise can forge.

Rejected. An opaque handle to a database row is strictly better here: revocable,
rotatable, single-use, and it discloses nothing.

### `BYPASSRLS` for the token lookup

The lazy answer to the credential problem, and it defeats the mechanism
BACKEND-07 built. Rejected outright by §141 and by INV-334.

### A `SECURITY DEFINER` function for the lookup

Workable and narrower than `BYPASSRLS`. Rejected in favour of the policy because
a `SECURITY DEFINER` function is a privilege escalation that lives outside the
policy system — reviewing tenancy would mean reading both the policies *and*
every definer function, where the chosen approach keeps one place to look.

### Auto-accept on registration with an invited address

Convenient, and it makes invitation consumption invisible. The user never
explicitly joins anything, the audit trail cannot say when they agreed, and a
registration transaction becomes coupled to workspace membership. Rejected;
§59 prefers explicit acceptance and so does this.

### Accept by invitation ID, as the handoff suggests

`POST /api/invitations/:id/accept` makes the ID sufficient to attempt
acceptance, which makes an enumerable identifier part of the authorization path.
Rejected: the opaque credential resolves the invitation and the ID is never an
authorization input.

### A new invitation row per resend

Preserves per-credential history. It also grows the manager's pending list one
entry per click and makes "when were they invited" ambiguous. Rejected in favour
of rotating the credential in place — a superseded digest is unusable and
unrecoverable, so there is nothing about it worth keeping, and the operational
events are on the audit trail.

## Consequences

**Good.** A forwarded or stolen link is worthless without the invited account.
Exactly one valid link exists at any moment. Two concurrent acceptances produce
one membership. A failed resend leaves the recipient's working link intact. The
new member's session needs no rotation — membership is authoritative, so the
same cookie reaches the workspace immediately.

**Costs.** A fourth transaction scope to understand, and a third RLS context
whose interaction with the other two has to be reasoned about — which is why
INVITATION_ARCHITECTURE.md §6 spells it out. `member` joins the role vocabulary,
which means migration 014 rewrites a CHECK constraint.

**Deliberately unresolved.** Whether `reviewer_auditor` maps to `reviewer` or
`auditor` (OD-095); whether a pending invitation's role can be edited (OD-096);
how long terminal invitations are retained (OD-097).

**Delivery is BLOCKED.** The seam is in place and called inside the transaction,
exactly as email verification and password reset have it, and there is still no
notification infrastructure (OD-003). A created invitation is correct and
undeliverable until BACKEND-44/45. Stated rather than implied.
