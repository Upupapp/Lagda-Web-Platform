# ADR-004 — Row Level Security for workspace tenancy

- **Status:** Accepted — **IMPLEMENTED**
- **Established by:** BACKEND-07
- **Supersedes:** BACKEND-06's recommendation to defer

---

## Decision

PostgreSQL Row Level Security is **enabled** on every workspace-owned table, with
`FORCE ROW LEVEL SECURITY`, a non-owning runtime role that lacks `BYPASSRLS`, and
transaction-local tenant context.

**Repository scoping remains mandatory.** RLS is defence in depth, never the only
boundary.

---

## Why this reverses BACKEND-06

BACKEND-06 assessed RLS and recommended deferring. That recommendation named
three objections, and all three were **cost**, not blockers:

1. **No role split existed.** §29 of BACKEND-07 puts the role split inside this
   command's scope. It exists now.
2. **The pooling hazard.** Real, and the reason to be careful — not a reason to
   skip. It is manageable precisely because `SET LOCAL` is issued in exactly one
   place, the transaction manager, and the leak is directly testable.
3. **Only two tables.** True, and the argument cuts the other way: the cost is
   mostly fixed, so paying it at two tables is far cheaper than retrofitting it
   across twenty.

BACKEND-07 is the command that pays those costs, so the objections dissolve
rather than persist.

---

## Design

**Context is transaction-local.** `select set_config('lagda.workspace_id', $1,
true)` inside the transaction. Never session-level `SET` — a connection carrying
that value back to the pool would hand one request's workspace to the next, a
silent, intermittent, load-dependent cross-tenant read. The value is a bind
parameter, so a workspace ID can never be concatenated into SQL.

**Two explicit transaction methods**, never one with an optional workspace:

```ts
runForWorkspace(workspaceId, op)   // ordinary path
runGlobal(op)                      // user accounts, sessions, system records
```

`run(workspaceId?)` would make *forgetting the argument* mean unrestricted
access — the most dangerous possible default. Global access has to be asked for
by name.

**Policies cover reads and writes.** `USING` governs visibility, `WITH CHECK`
governs writes. A policy with only `USING` protects reads while leaving `INSERT`
and `UPDATE` unrestricted — half a control, and the more dangerous half missing.

**Fail closed.** Missing context means the policy matches nothing, so a
transaction without a workspace sees zero rows rather than all of them.

**Role model.** `lagda_app` — logs in, owns nothing, no `BYPASSRLS`. Migrations
run as the owner. `FORCE ROW LEVEL SECURITY` subjects even the owner to
policies, so a careless script connecting as the owner does not see everything.

---

## Consequences

### Positive

- Catches the query that **forgot** its scope — a bug repository scoping cannot
  catch, because the forgetting happens in the repository.
- Cross-tenant writes are rejected by the database, not just by application code.
- Missing context fails closed instead of opening everything.

### Trade-offs

- **Every read must run inside a tenant transaction.** This was discovered by
  test, not by reasoning: repository reads went through the pool while `SET
  LOCAL` lived on the transaction's connection, so a workspace could not see its
  own members. Repository read methods now take the transaction context. It
  looks redundant until you know why.
- Slightly more ceremony at every call site.
- Policy correctness is only demonstrable by testing **as the runtime role**. A
  suite connecting as `postgres` would pass while production leaked, so the
  first tenancy test asserts the role cannot bypass — every later assertion
  depends on it.
- Indexes leading with `workspace_id` matter more, since the policy predicate
  is evaluated on every access.

### Not solved by RLS

RLS restricts which rows a query returns. It does **not** stop a row in workspace
A referencing a parent in workspace B. Compound foreign keys remain required, and
the two controls solve related but distinct problems.
