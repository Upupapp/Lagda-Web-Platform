# Row Level Security — Assessment

**Question:** should PostgreSQL RLS enforce workspace tenancy, and should
BACKEND-07 implement it?

**Recommendation: not yet. Revisit when the schema has more than a handful of
tenant-owned tables, and treat compound foreign keys as the higher-value control
in the meantime.**

---

## What RLS would add

A policy per tenant-owned table restricting rows to a workspace set in the
session:

```sql
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workspace_memberships
  USING (workspace_id = current_setting('lagda.workspace_id', true));
```

The value is real: it catches a repository query that **forgot** its scope. That
is a genuine class of bug, and application-level scoping cannot catch it because
the forgetting happens in the application.

## Why not now

**The pooling problem is the significant one.** RLS needs a per-transaction
`SET LOCAL lagda.workspace_id`. With a connection pool, a missed or mis-scoped
`SET LOCAL` means a connection carries the previous request's workspace into the
next one. That failure is worse than the one RLS prevents: it is silent,
intermittent, and load-dependent. Getting it right needs the context set in
exactly one place — the transaction manager — and audited.

**It needs a role split to mean anything.** Policies do not apply to the table
owner or to superusers, so the application must connect as a role that owns
nothing while migrations use a different, more privileged one. That is correct
practice regardless, and it is not in place yet.

**Two tenant-owned tables exist.** The cost of getting pooling and roles right is
mostly fixed; the benefit scales with table count. Today it would be a large
mechanism guarding one table.

**Test complexity.** Every integration test would need session context, and a
test that forgets it fails in a way that looks like a data bug.

## What is doing the work instead

**Compound foreign keys** (`DATABASE_CONVENTIONS.md`). RLS stops a query
returning another tenant's rows. Compound FKs stop a *write* creating a
cross-tenant relationship at all — which is the more damaging failure, and one
RLS does not address. `workspace_memberships` already carries
`UNIQUE (workspace_id, member_id)` so referencing tables can use the pattern.

**Repository ports that require workspace scope** (INV-040). There is no
unscoped lookup to call.

**Cross-tenant integration tests** — a member existing in workspace B, requested
from workspace A, returning null.

## If RLS is adopted later

1. Split roles first: `lagda_app` (owns nothing, subject to policies) and
   `lagda_migrate` (owns the schema).
2. Set `SET LOCAL` in the transaction manager only — never at a call site.
3. Fail closed: a transaction with no workspace context sees nothing, rather than
   everything.
4. Keep repository scoping regardless. **RLS is defence in depth, never the only
   boundary** (INV-047) — a query relying on an invisible policy is one nobody
   can review by reading it.

## For BACKEND-07

Implement the compound-FK pattern across tenant-owned tables as they arrive, and
the role split. Treat RLS as a follow-on with its own decision, not as part of
tenancy architecture by default.
