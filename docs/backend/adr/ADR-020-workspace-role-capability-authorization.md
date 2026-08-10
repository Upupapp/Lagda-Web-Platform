# ADR-020 — Workspace role and capability authorization

**Status:** Accepted · **Date:** 2026-08-10 · **Command:** BACKEND-27

Builds on [ADR-018](./ADR-018-workspace-tenant-lifecycle.md) (membership as the
tenant edge) and [ADR-019](./ADR-019-workspace-invitations.md) (invitations).

---

## Context

BACKEND-25 and BACKEND-26 each needed to know who was allowed to do something,
and neither had a role model to consult. Each wrote a narrow predicate:

```ts
canManageWorkspace(role)    // role === "owner"
canManageInvitations(role)  // role === "owner"
canGrantRole(a, b)          // b !== "owner" && canManageInvitations(a)
```

Three functions, one rule, all guesses — and reading the product shows the guess
was wrong. `ROLE_PERMISSIONS` in `models/index.ts` grants `administrator` both
`manage_team` and `manage_workspace`. An administrator should have been able to
invite people and rename the workspace since BACKEND-25, and could not.

Left alone, this compounds: BACKEND-28 adds contacts and writes a fourth
predicate, BACKEND-29 adds documents and writes a fifth, and the answer to "who
may do what" becomes a search rather than a document.

## Decision

**A closed `WorkspaceRole` enum, a closed `WorkspaceCapability` enum, and a
pure code-defined role-to-capability policy in `@lagda/core`.**

1. **Seven roles**, taken from the product. No speculative additions.
2. **Ten capabilities**, one per operation that exists today. None for
   operations that do not.
3. **One total `Record`** mapping roles to capabilities, frozen. Adding a role
   without deciding its powers is a compile error.
4. **Default deny.** Unknown role, unknown capability, unmapped combination —
   all refused.
5. **A separate grant matrix.** Holding `membership.role.change` says you may
   change roles; which roles you may assign is a different question, reviewed
   separately, and nobody may assign `owner`.
6. **Feature code names a capability.** An architecture guard greps every
   package for a role comparison and permits four files.

## Alternatives considered

### Route-level role checks — the status quo

What BACKEND-25 and BACKEND-26 did, and it produced a wrong answer in three
places that nobody noticed because there was nowhere to notice it. Rejected:
the rule ends up spelled differently in each route, and there is no document
that answers "who may invite" without reading them all.

### A `roleRank` hierarchy

`OWNER = 3, ADMIN = 2, MEMBER = 1`, and every check is a comparison. Shorter and
tempting.

Rejected because **the roles are not a hierarchy**. `sender`, `reviewer`,
`auditor` and `template_administrator` are parallel — none outranks another and
none is a superset of another. A rank would invent an ordering that means
nothing, and the first comparison against it would be arbitrary. Explicit rules
describe the shape the product actually has.

### Permission booleans on the membership row

`can_invite`, `can_manage_members`, and so on. Rejected: a second authority that
drifts from the policy, a per-member override nobody reviewed, and a migration
every time a capability is added. An architecture test asserts no such column
exists.

### A dynamic `roles` / `role_permissions` table

The frontend HAS a custom-role builder, so this is the alternative with real
product evidence behind it.

Rejected for now. 26 of the 30 permissions it composes govern documents,
templates, contacts and billing — operations that do not exist. Building the
tables would ship a permission editor for permissions that mean nothing, plus a
bootstrap problem (seeding system roles), a drift problem (code and data
disagreeing about what `owner` means), and a deployment problem (a permission
change is now a data migration).

The migration path is recorded in AUTHORIZATION_ARCHITECTURE.md §11 and needs
its own ADR. Crucially, every caller naming a **capability** rather than a role
means `hasCapability` can become a lookup without changing a single call site.

### An external policy engine — OPA, Casbin, Cedar

Rejected. Seven roles and ten capabilities is a frozen object and a `.includes`
call. An engine adds a runtime, a policy language, a second place to look, and a
deployment coupling — to replace 70 lines that a reviewer can read in full and
180 tests that run in milliseconds. An architecture test asserts none is a
dependency.

If dynamic customer-authored policy ever arrives, that is the ADR to write.

### Capabilities in the session cookie

Rejected, and for the same reason ADR-018 rejected workspace claims: a
credential carrying authorization keeps granting it after the authorization
changes. A demotion would need session invalidation, which signs the person out
of every other workspace to change their role in one.

The cost is a membership read per request — one indexed lookup inside a
transaction the operation was going to open anyway.

### Duplicating the matrix into RLS

Rejected. RLS does tenant isolation; the application decides actions. A policy
per capability would be a second implementation in a different language,
deployed by migration rather than review, and the two would drift. Keeping RLS
to "workspace A cannot see workspace B" keeps it reviewable.

## Consequences

**Good.** One document answers "who may do what", and it is generated from the
same list the code is keyed on. An administrator can finally administer. Adding
a capability is five mechanical steps with a compile error if one is skipped.
Role changes take effect on the next request with no session churn. A future
feature command cannot quietly invent a role check — the guard fails.

**Costs.** Four files are permitted to compare a role, and the allowlist needs
maintaining. Member administration reads the actor's membership inside its own
transaction, which is one extra query on three operations — accepted because
those three are the destructive ones.

**A consequence worth stating loudly.** Nobody may grant `owner`, and ownership
transfer is deferred because the product's control says "demonstration only". So
`owner` is a role no operation can enter or leave: it cannot be granted,
demoted or removed. The invariant holds and nothing is half-built, but a
workspace's owner is permanent until transfer exists — and the product already
tells users they must transfer ownership before closing an account. That is
OD-101 and the highest-priority gap this command leaves.
