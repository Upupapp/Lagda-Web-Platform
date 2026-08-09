# ADR-018 — Workspace tenant lifecycle

**Status:** Accepted · **Date:** 2026-08-10 · **Command:** BACKEND-25

Supersedes nothing. Builds on
[ADR-004](./ADR-004-workspace-row-level-security.md) (RLS),
[ADR-008](./ADR-008-server-sessions-and-csrf.md) (sessions),
[ADR-009](./ADR-009-durable-idempotency.md) and
[ADR-014](./ADR-014-account-identity-and-password-hashing.md) (global accounts).

---

## Context

BACKEND-07 made `WorkspaceId` the tenant boundary and BACKEND-19 made `UserId` a
global account. Nothing connected them. `workspaces` and `workspace_memberships`
existed as BACKEND-05's persistence fixtures, with a representative
`CreateWorkspace` use case that took `ownerUserId` as a parameter, no
authentication, and no way to find a workspace afterwards.

The product needs a real one. Onboarding asks for a workspace name; the sidebar
has a workspace switcher; the settings page renders workspace identity; the
handoff says every resource belongs to a workspace and cross-workspace access
must be denied.

The question this ADR settles is **where authorization to a tenant lives**, and
that question has to be answered before any workspace-owned resource exists —
because every later command inherits the answer.

## Decision

**Global users, workspaces as tenants, and a membership table as the only
authorization edge between them.**

1. `UserId` is global. One account per person, never duplicated per tenant.
2. `WorkspaceId` is opaque, server-generated and immutable. A rename does not
   mint a new tenant.
3. `workspace_memberships` is authoritative. A row means actual access.
   `UNIQUE(workspace_id, user_id)`, foreign-keyed to both sides with
   `ON DELETE RESTRICT`.
4. Workspace creation writes the workspace **and** the creator's `owner`
   membership in one transaction. Neither half is meaningful alone.
5. The creator comes from `AuthenticatedActor.userId`. No request schema in the
   command has a field that could nominate anyone else.
6. **The session carries no workspace authority.** Active workspace is
   navigation context; the backend resolves membership on every request.
7. RLS reinforces both scopes: tenant context for workspace-scoped work, and a
   `FOR SELECT`-only user context for "which workspaces do I belong to".

### Two consequences worth stating separately

**`workspaces.owner_user_id` is dropped** (migration 013). It was a second
authority on ownership alongside the `owner` membership row, and an ownership
transfer updates one of them. Two sources of truth that disagree after a partial
write are worse than one source that is occasionally awkward to query.

**`workspace_memberships.user_id` gains its foreign key** to `users`, which had
been missing since 001 because `users` only arrived in 008.

## Alternatives considered

### One workspace per user

Simplest, and wrong on day one. The product's own switcher shows three
workspaces and the fixture user is an `owner` in two of them and a `reviewer` in
a third. Rejected because the product already contradicts it.

### `users.workspace_id`

A column cannot hold "several". The moment it needs to, the fix is a join table
added late, with a migration inventing memberships for existing rows and an
ambiguous period where two mechanisms both look authoritative. Rejected.

### `workspaces.owner_user_id` retained alongside memberships

Convenient: "who owns this" is one column read instead of a filtered query. It
is also two rows to keep in step, updated by an operation that does not exist
yet, with no rule for a partial write. Rejected, and removed.

### Workspace claims in the session cookie

The handoff asks for this (§5, §60): put `workspaceId`, `role`, `permissions`
and the accessible workspace list in the session.

Rejected, and the reasoning is the core of this ADR. A credential carrying
authorization state is a credential that keeps granting access after the state
changes. Removing a member would then require invalidating their session — which
signs them out of every *other* workspace to remove them from one — or accepting
a window in which a removed member still has access. Neither is acceptable in a
system holding legal documents.

The cost is a membership lookup per request: one indexed read on
`(workspace_id, user_id)`, inside a transaction the operation was going to open
anyway. Bought a property that is otherwise unobtainable.

### Membership join table — **selected**

The standard model, and it is standard because it is the only one that expresses
a many-to-many relation with per-edge state. It gives each edge a role, a
timestamp, an addressable ID, and a place for BACKEND-26 and BACKEND-27 to
attach without reshaping anything.

### For "list my workspaces": grant the runtime role `BYPASSRLS`

The lazy fix, and it defeats the mechanism BACKEND-07 built. Rejected outright
by §85.

### For "list my workspaces": load all workspaces and filter in the application

A security control implemented in memory over a result set that already contains
every tenant's data. One early return, one thrown exception mid-loop, one
refactor that reorders the filter, and the whole list leaks. Rejected.

### For "list my workspaces": a user-scoped RLS context — **selected**

`lagda.user_id`, transaction-local, with two `FOR SELECT` policies. The
transaction sets user context and *not* workspace context, so tenant isolation
matches nothing and no write is possible against either table — asserted by an
`UPDATE` that affects zero rows and an `INSERT` that raises.

## Consequences

**Good.** Membership changes take effect on the next request with no re-login.
Switching workspaces does not rotate a session. A stolen session grants exactly
the user's real memberships and nothing more. Cross-tenant access is refused at
three independent layers — the explicit predicate, the RLS policy, and the
resource-hiding 404 — and each is tested separately.

**Costs.** A membership read per workspace-scoped request. A third transaction
scope to understand. Two RLS policy families whose interaction has to be
reasoned about, which is why WORKSPACE_ARCHITECTURE.md §6 has a table for it.

**Deferred.** Archive, hard delete, ownership transfer, leave, invitations,
roles, teams and entitlements. Each has a named owner, and none has a
placeholder column or a stub endpoint.

**Also decided here:** workspace creation requires an `Idempotency-Key`. A lost
response is indistinguishable from a failure to the browser, and the natural
retry would create a second permanent tenant that no endpoint can delete.
