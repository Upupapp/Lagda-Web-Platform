# Tenancy Foundation Report — BACKEND-07

## 1. Decision: RLS is IMPLEMENTED

BACKEND-06 recommended deferring. **That is reversed**, and the reasoning is in
[ADR-004](../adr/ADR-004-workspace-row-level-security.md).

BACKEND-06's three objections were all *cost*, not blockers: no role split (§29
of this command puts that in scope), the pooling hazard (real, and manageable
because `SET LOCAL` is issued in exactly one place — and directly testable), and
only two tables (which cuts the other way, since the cost is mostly fixed and
retrofitting across twenty tables is far worse). BACKEND-07 is the command that
pays those costs, so the objections dissolve.

## 2. The finding that changed the architecture

**Repository reads had to become transactional, and this was found by test rather
than by reasoning.**

Reads went through `db.selectFrom(...)` — the pool — while RLS tenant context
lives on the *transaction's* connection via `SET LOCAL`. The result: a workspace
could not see **its own** members. Every negative test passed; the positive ones
failed.

That failure is the useful kind. Had reads silently worked — for instance if
context had been session-level — the design would have been leaking across
pooled connections instead. The fix is that repository read methods now take the
transaction context, which looks redundant until you know why, so the port
documents the reason.

`GetWorkspaceMember` now wraps its read in `runForWorkspace`, and the query is
scoped twice: by predicate and by policy.

## 3. Transaction architecture

Two explicit methods, never one with an optional workspace:

```ts
runForWorkspace(workspaceId, op)   // ordinary path — sets tenant context
runGlobal(op)                      // user accounts, sessions, system records
```

`run(workspaceId?)` would make **forgetting the argument** mean unrestricted
access — the most dangerous possible default. Global access must be asked for by
name, and even then it sees no tenant rows, because a policy with no context
matches nothing.

`CreateWorkspace` runs under `runForWorkspace(newWorkspaceId)`: the ID is
generated before the transaction, so `WITH CHECK` permits the rows and creating a
workspace needs no global escape.

## 4. Role model

`lagda_app` — logs in, **owns nothing**, no `BYPASSRLS`. Migrations run as the
owner. `FORCE ROW LEVEL SECURITY` subjects even the owner to policies, so a
careless script connecting as the owner does not see everything.

The tenancy suite asserts all four properties **before** any policy test, because
every later assertion depends on them. A suite connecting as `postgres` would
pass while production leaked.

## 5. Coverage

32 integration tests, all against real PostgreSQL as the runtime role. Highlights:

- A query with **no predicate at all** returns only the current workspace — the
  bug repository scoping cannot catch, because the forgetting happens there.
- Cross-tenant insert and ownership-change are rejected by `WITH CHECK`.
- Cross-tenant update and delete affect **zero rows** — invisible rather than
  forbidden, so nothing reveals the row exists elsewhere.
- Missing context sees **nothing**, not everything.
- Context does not survive a commit, a rollback, or ten alternating transactions
  on a shared pool.

## 6. What RLS does not do

It restricts which rows a query returns. It does **not** prevent a row in
workspace A referencing a parent in workspace B. **Compound foreign keys remain
required**, and the two controls solve related but distinct problems.

The compound-FK target (`UNIQUE (workspace_id, member_id)`) exists; no
referencing table does yet, so the cross-tenant relationship attack is PLANNED
rather than tested. It becomes required with the first child table.

## 7. Handoff — BACKEND-08

Every workspace-owned repository method takes **workspace scope and the
transaction**. Reads included — that is not optional under RLS.

Scope in SQL, never by comparing after the fetch. A `save` must reject an entity
whose `workspaceId` differs from the transaction's scope rather than silently
rewriting it. Conditional updates (`WHERE status = :expected`) preserve scope.
Repository contract tests run every adapter against workspace A and B.

Note the RLS interaction: a cross-tenant `UPDATE` returns **zero rows** rather
than an error, so a repository that requires success must check the affected
count — and zero can mean not found, wrong tenant, or wrong state. Map it without
revealing which.

## 8. Other handoffs

**BACKEND-11:** resolve workspace from the authenticated session, never from a
request body; no route gets a global DB handle. **BACKEND-14:** idempotency key
identity includes tenant scope, or keys collide across workspaces.
**BACKEND-16:** jobs carry `workspaceId`; the worker opens a tenant transaction
on **every** attempt — context never survives a retry. A mismatched
tenant/resource pair fails rather than falling back to a global lookup.
**BACKEND-17:** storage metadata is authoritative; a key prefix is not
authorization. **BACKEND-27:** authorization runs inside an already-resolved
workspace context, never a global lookup first. **BACKEND-48/49:** scope at SQL
level, never global-then-filter. **BACKEND-59:** admin access is a separate named
capability — never a flag on an ordinary repository.

## 9. Risks

**R-1 — Compound FKs are a pattern, not yet an enforcement.** Documented and the
target exists; the first child table must apply it or T-3 is uncovered.

**R-2 — RLS adds a way to be wrong.** A read outside a tenant transaction now
returns nothing rather than erroring. That is fail-closed and correct, but it
presents as "no data" rather than "you forgot the transaction". The port
documents it; BACKEND-08 should keep it in mind when a query mysteriously returns
empty.

**R-3 — Test-only credentials.** The tenancy suite gives `lagda_app` a password
to connect. Production credentials come from deployment; the migration
deliberately creates the role with `NOLOGIN` and no password, since a password in
a migration would be a committed secret.
