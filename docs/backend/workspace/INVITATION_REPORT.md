# BACKEND-26 — Workspace invitations report

## Product inventory

| Feature | Status |
|---|---|
| **CREATE INVITATION** | **IMPLEMENTED** |
| **LIST PENDING** | **IMPLEMENTED** |
| **PREVIEW** | **IMPLEMENTED** — public, POST, read-only |
| **RESEND** | **IMPLEMENTED** — rotates the credential in place |
| **REVOKE** | **IMPLEMENTED** |
| **ACCEPT** | **IMPLEMENTED** |
| **DECLINE** | **IMPLEMENTED** — the product has a Decline button and its own screen |
| **BULK INVITE** | **NOT_IN_PRODUCT** — one address per submission |
| **INVITE OWNER** | **NOT_IN_PRODUCT** — and structurally prevented, two layers |

→ [INVITATION_PRODUCT_INVENTORY.md](./INVITATION_PRODUCT_INVENTORY.md)

## Schema (migration 014)

`workspace_invitations` — 14 columns, 3 foreign keys (all RESTRICT), 6 CHECK
constraints, 3 indexes.

Two changes beyond the new table:

1. **`member` joins `WORKSPACE_ROLES`.** Not invented: `InvitationsPage.tsx`
   defaults its selector to `role_member` and the product's own
   `SYSTEM_ROLE_PERMISSIONS` defines it. The CHECK is dropped and re-added rather
   than supplemented, because two CHECKs on one column both have to pass and
   leaving the old one would keep `member` unwritable while the new constraint
   looked correct.
2. **A third RLS context**, `lagda.invitation_digest`, with one `FOR SELECT`
   policy. See ADR-019.

No `status` column. State is derived from five timestamps plus the clock —
`expired` is a function of `now()`, and a stored copy is wrong from the moment
it lapses.

No `DELETE` grant for the runtime role. Revocation is a timestamp; erasing who
was offered a tenant is not a statement the application can issue.

## Verification

| Gate | Result |
|---|---|
| typecheck (`tsc --build` + tools project) | **PASS** |
| lint | **PASS** |
| build | **PASS** |
| unit tests | **PASS** — 783 |
| `npm run check` | **PASS** |
| integration | **PASS** — 391, 49 skipped (S3) |
| migration from zero | **PASS** — 14 migrations on a clean database |
| migration re-run | **PASS** — no-op |

Integration ran against PostgreSQL 16 as the runtime role `lagda_app`, verified
in-suite to be neither superuser nor `BYPASSRLS` before any other assertion.

New coverage: 47 unit, 22 route through the real `createApp`, 33 integration.

## The design decision worth reading

**How a non-member reads one row out of a tenant they cannot see.**

Under `tenant_isolation` a caller with no workspace context sees nothing — which
is correct, and which makes acceptance impossible without a deliberate answer.
The answer is a `FOR SELECT` policy matching equality against the UNIQUE
`token_digest` column, keyed on a transaction-local setting. Equality on a
unique column matches at most one row, so the scope cannot enumerate, cannot
scan, and cannot write. Tenant context is entered afterwards from the resolved
invitation, on the same transaction, so validating and joining commit together.

No `BYPASSRLS`, no `SECURITY DEFINER`, no widened policy. The proof is an
integration test that issues `SELECT * FROM workspace_invitations` with no
predicate at all, in a workspace holding two invitations, and gets exactly one
row back.

## What probing found

**A convergence bug, fixed.** The already-a-member branch originally called
`enterWorkspace` again from inside `enterWorkspace`, nesting a transition inside
the scope that had already been entered. It typechecked and would have
double-set the tenant context.

**Two fixture classes caught by the database, not by me.** `truncateAll` had to
learn about `workspace_invitations` before `workspaces` — the same
foreign-key-order class BACKEND-25 fixed, and the shared helper meant one edit
rather than seven. And the acceptance suite's sequential member-id generator
collided with the one that created the workspace, which surfaced as a primary
key violation that looked like an acceptance defect and was a fixture problem.

**The architecture guard did its job.** Adding an eighth `createHash` caller
failed `tests/architecture/sealing.test.ts`, which is an explicit allowlist with
a named domain per entry rather than a widened rule. The invitation digest
domain is now entry eight, with its reason recorded.

## Honest gaps

**INVITATION DELIVERY: BLOCKED.** `scheduleDelivery` is called inside the
transaction, exactly as email verification and password reset have it, and there
is still no notification infrastructure (OD-003, BACKEND-44/45). A production
invitee **cannot currently receive a link**. The complete secure lifecycle
exists behind that seam; a provider and a template do not.

The consequence is worth stating plainly: with no delivery wired, creating an
invitation produces a pending row in the manager's list that no email will ever
match. That is why the scheduling call is inside the transaction — the moment a
scheduler exists, a failure to enqueue rolls the invitation back rather than
stranding it.

**Rate limits are bound but not asserted with a 429.** Four policies exist, are
validated at startup, and are applied through the same `checkSemanticLimits`
path BACKEND-25's workspace-create limit uses — which *is* covered by a 429
test. The invitation policies have none of their own, so the test matrix records
them as **N/A** rather than PASS.

**Two matrix rows say "by construction".** The invitation event builders take a
field set with no place for an email, and the metric label type is a closed
union. Stronger than a test, and a different claim — the workspace suite has a
log-redaction test that greps the full captured output; the invitation routes do
not yet.

**OD-069 is unchanged.** Seventeen auth and account routes remain uncomposed, so
a real browser still cannot sign in to reach any of this. The invitation routes
are inside the authenticated scope BACKEND-25 built, and their tests issue a
session directly from the service.

**Three product questions are open**, and each is recorded rather than guessed:
which canonical role `role_reviewer_auditor` grants (OD-095), whether a pending
invitation's role can be edited (OD-096), and how long terminal invitations are
retained (OD-097).

## BACKEND-27 handoff

The seams are in place and named:

- `canManageInvitations(role)` — who may invite. Separate from
  `canManageWorkspace` on purpose.
- `canGrantRole(inviterRole, requestedRole)` — the privilege-escalation seam.
  One function, both roles, every grant decision routed through it.
- `assertExactlyOneOwner` / `wouldOrphanWorkspace` — written, tested, still
  without a caller. BACKEND-27 must call them before any removal or role change.
- `WORKSPACE_ROLES` — seven values, one CHECK, one mapping guard.

No `if (role === ...)` comparison appears in any route. The two predicates are
the only places a role is interpreted, which is what makes replacing them a
contained change.
