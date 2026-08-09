# Repository Conventions

## Ownership

**Application declares the port. `@lagda/db` implements it.** Never the reverse —
an interface defined in `db` and imported by `application` inverts the dependency
the architecture rests on.

No Kysely type, `pg` type, row type, SQL fragment or SQLSTATE crosses out of
`@lagda/db`. Repositories return LAGDA-owned records.

## Scope is bound, not passed

Repositories come from a unit of work and are bound to one workspace and one
transaction. There is **no** `workspaceId` parameter on a tenant-owned method —
which is what makes a cross-tenant read unsayable rather than merely caught.

No optional tenant scope. No `skipTenantCheck`, `unscoped`, or `global` flag.
Privileged access, when it is ever needed, is a separate named capability.

## Queries

Every tenant-owned query carries an explicit `workspace_id` predicate **even
though RLS also constrains it**. Two layers, deliberately: a reader can see the
scope without knowing the policy exists.

Every value is parameterized. Sort keys map from closed unions to explicit
columns — never `orderBy(request.sortBy)`.

**Always `ORDER BY` where order matters.** PostgreSQL guarantees none without
one, so "insertion order" is an assumption that holds until it does not.

`COUNT` in SQL rather than loading rows to measure their length.

## Writes

`insert` refuses a record whose workspace differs from the bound scope, raising
`WorkspaceScopeMismatchError` **before** the write. Silently rewriting the
workspace to match would turn a programmer error into a data-corruption event,
quietly moving a record between tenants. RLS would also reject it, but failing
here names the problem instead of surfacing a policy violation from three layers
down.

For state-sensitive changes use a **conditional update** — `WHERE role =
:expected` — not read-then-write. Two concurrent requests reading the same value
would both write, and the second would silently overwrite the first.

**Zero affected rows is ambiguous**: absent, other tenant, or changed
concurrently. Return whether it applied; never reveal which.

No generic `updateMany(filter, patch)`. In a multi-tenant system an unbounded
mass update is a loaded weapon.

No `UPSERT` by default — it hides duplicate requests and lost conflict
detection. Use it only where repeated writes genuinely should converge.

No generic hard delete for evidence-bearing resources.

## Mapping

Explicit, field by field. No `row as Entity`, no `.values(entity)`, no spread —
a spread carries along whatever the record gained later, including computed
fields with no column.

Persisted values are **runtime data, not guarantees**. A status written by an
older release is validated, not cast. `row.role as WorkspaceRole` would accept
anything the column holds.

Branded IDs survive. Timestamps convert to the domain's numeric instant — a
`Date` never leaves this layer, because it is mutable.

## Errors

Classified by **SQLSTATE and constraint name**, never message text.
`message.includes("duplicate key")` breaks on an upgrade or a non-English
locale, silently.

`translatePersistenceError` maps 23505/23503/23514/40001 to LAGDA-owned errors
carrying the **constraint name** — which tells a caller which business rule
broke — and never the offending value, which is usually user data.

**Unknown errors pass through unchanged.** A connection failure or timeout must
stay an infrastructure failure: reporting it as "conflict" or "not found" would
tell a caller the data is absent when the database is merely unreachable.

No retry inside a repository. Retry policy belongs to the transaction or worker
layer, where a non-idempotent business operation will not be silently repeated.

## Side effects

Repositories persist and retrieve. They do not send email, enqueue jobs, call
webhooks, seal documents, or write audit events. A repository with hidden side
effects makes every caller's behaviour unpredictable.

## Testing

The behavioural contract runs against **both** the in-memory fake and
PostgreSQL. Divergence means either the fake is lying to application tests or
the adapter is wrong.

Only the PostgreSQL run exercises RLS, constraints and SQLSTATE. **A fake is
never security proof.**

Every tenant-owned repository suite seeds workspace A and B by default.
Cross-tenant behaviour is not an optional extra.
