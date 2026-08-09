# LAGDA Database Conventions

PostgreSQL 16 · Kysely · `pg` · Kysely's migrator. Rationale in
[ADR-003](../adr/ADR-003-postgresql-query-layer.md).

## Naming

`snake_case` in the database, `camelCase` in TypeScript and on the wire, mapped
explicitly at the repository boundary. Database names never appear in an API
response.

Tables are **plural**: `workspaces`, `workspace_memberships`. Constraints and
indexes are named deterministically so migrations and error translation can
refer to them:

```
uq_workspace_memberships_workspace_user
fk_workspace_memberships_workspace
chk_workspace_memberships_role
idx_workspace_memberships_workspace_created_at
```

Auto-generated names vary between PostgreSQL versions, which makes error
translation unreliable.

## Identifiers

Opaque branded strings from `@lagda/contracts`, stored as bounded `varchar(64)`
— not sequential integers, which leak record counts and creation order. No
separate internal surrogate key: a second identity per table earns its place
only with a measured join, index or storage benefit.

## Timestamps

`timestamptz`, always. A naive `timestamp` stores whatever the server's timezone
happened to be, and a host reconfiguration silently reinterprets every
historical row.

`created_at` on business records. **`updated_at` is not automatic** — it is
added where something consumes it, not by default.

Business event times (`sent_at`, `signed_at`, `completed_at`, `expires_at`) are
supplied by the application `Clock` and persisted explicitly. They are **not**
interchangeable with technical row timestamps, and a database `now()` default
must never stand in for one: two clocks for one business event is a
contradiction waiting to be discovered in evidence.

The driver's `timestamptz` parser is pinned so a column reads as a `Date`
regardless of environment. Mapping converts it to the domain's numeric instant —
a `Date` never leaves the persistence layer, because it is mutable.

## Tenancy

Every workspace-owned table carries `workspace_id` as a **first-class column**,
never derived through joins. Repositories scope on it, indexes lead with it, and
a future RLS policy would read it.

Composite indexes begin with `workspace_id` — `(workspace_id, created_at DESC)`,
not the reverse — because every query is tenant-scoped first.

**Compound keys are the tenant-integrity mechanism.** A child table referencing
only a parent's ID allows a row in workspace A to point at a parent in workspace
B, with nothing but application code preventing it. The pattern:

```sql
UNIQUE (workspace_id, id)                        -- on the parent
FOREIGN KEY (workspace_id, parent_id)            -- on the child
  REFERENCES parent (workspace_id, id)
```

`workspace_memberships` already carries `UNIQUE (workspace_id, member_id)` for
this reason — redundant today, and required the moment a child table references
a member.

Uniqueness is **per workspace** unless a value is genuinely global:
`UNIQUE (workspace_id, user_id)`, not `UNIQUE (user_id)`.

## Nullability and constraints

`NOT NULL` unless absence is a real lifecycle state with a documented reason.
`completed_at NULL` is meaningful; `workspace_id NULL` on a workspace-owned row
is not.

CHECK constraints where they cheaply protect a durable invariant — a role
outside the canonical vocabulary, a blank workspace name.

**Statuses use `varchar` + CHECK, not a PostgreSQL ENUM.** An ENUM is a stronger
constraint but couples schema lifecycle to status evolution: adding a value needs
a migration, and removing or renaming one is worse. LAGDA's state model is still
moving, and OD-013 may change it further.

## Deletion

**`ON DELETE RESTRICT` by default. Never CASCADE without an explicit decision.**

This is a legal-evidence system, and deletion semantics are an unresolved product
question (BACKEND-55). A default CASCADE would answer it silently, in the
destructive direction. `SET NULL` only where an orphaned historical reference is
genuinely valid.

No universal soft-delete framework. Lifecycle fields appear where a domain
requires them.

## JSONB

For genuinely semi-structured or versioned data only. Never as a substitute for
relational modelling — `signing_request.data JSONB` is a schema you cannot
query, constrain or migrate. Where a JSONB structure must stay historically
interpretable, it carries a version.

## Documents and evidence

**Document bytes do not go in PostgreSQL.** The database holds metadata,
object-storage references, hashes, ownership and lifecycle; binaries live in
object storage (BACKEND-17/29).

Hashes are named for their artifact — `original_document_hash`,
`signed_document_hash` — never one ambiguous `hash`. (There is no
`prepared_document_hash` column: preparation produces field metadata, not bytes,
so the prepared digest and the original digest are the same value.)

**A digest CHECK is algorithm-aware, never a bare length rule:**

```sql
CHECK (digest_algorithm = 'sha-256' AND digest ~ '^[a-f0-9]{64}$')
```

A fixed 64-character check has to be *dropped* to introduce SHA-512, and dropping
a CHECK is how historical rows stop being validated. Extending a disjunction
leaves every existing row constrained exactly as written.

**Never `UNIQUE (digest)`.** Two identical PDFs legitimately share a SHA-256.

**Evidence tables are append-only by database privilege.** The runtime role holds
`INSERT` and `SELECT` and is explicitly revoked `UPDATE` and `DELETE`. A trigger
is not used, because it would also block the privileged erasure path BACKEND-55
must define.

Evidence and final-artifact records must carry `seal_scheme`, `seal_version` and
`digest_algorithm` **from the first row written**. A migration must never rewrite
historical seal semantics to the current algorithm: a record produced under one
scheme has to remain interpretable under it.

## Secrets

Never stored in plaintext: passwords, session tokens, reset tokens, OTP secrets,
signing access tokens, API keys. Hashed or encrypted, with hashed-token lookups
indexed on the hash.

## Queries

**Every value is parameterized.** No SQL is built by string concatenation.
Dynamic identifiers — sort columns especially — come from code-level whitelists,
never from a request (INV-029).

Raw parameterized SQL inside `@lagda/db` is permitted where PostgreSQL offers
something the builder does not express well. Contorting domain code to satisfy a
query builder is the wrong trade.

## Errors

Classified by **SQLSTATE**, never message text: `23505` unique, `23503` foreign
key, `23514` check. `err.message.includes("duplicate key")` breaks on an upgrade
or a non-English locale, with no warning.

`@lagda/db` may inspect SQLSTATE; application never does. Repositories translate
into application errors (BACKEND-08).

## Concurrency

Assume concurrent requests. Read-then-write is not safe where races matter;
database constraints are the authority, and application pre-checks exist for the
error message.

For state transitions prefer a conditional update —
`UPDATE … WHERE status = :expected` — over read-then-write. No global version
column: optimistic concurrency is added where measured, not everywhere.

Default isolation unless a use case needs more. `SELECT … FOR UPDATE`,
`SERIALIZABLE` and advisory locks are available escalations.

## Migrations

Source-controlled migrations are the **only** schema-change mechanism. Manual
production changes are drift, and if one ever happens it is captured in migration
history immediately.

Listed explicitly in the runner rather than discovered from disk — filesystem
discovery breaks in `dist` and makes ordering depend on directory listing. Names
are zero-padded so lexical order is execution order.

**Applied migrations are immutable.** Once a migration has run anywhere shared,
it is never edited; a new forward migration replaces it.

Migrations are an **explicit deployment step**, never run at application startup.
Otherwise a rolling deploy has several instances racing the same schema change at
whatever moment a container restarts. Kysely's migration lock prevents concurrent
application.

Not every migration is reversible — one that drops a column cannot restore its
data. Production rollback is a restore-from-backup question, not a `down`
question.

For breaking changes once data exists: **expand → deploy → backfill → switch →
contract**. Large backfills run in batches outside a blocking schema transaction;
`NOT VALID` constraints and `CREATE INDEX CONCURRENTLY` are the tools when tables
are big enough to need them.

## Testing

Integration tests use **real PostgreSQL**. SQLite would not exercise
`timestamptz`, compound constraints, transaction semantics or SQLSTATE codes, so
passing against it would prove nothing.

`npm test` stays offline; `npm run test:integration` needs a database. Requiring
one for every quick local run is how people stop running tests.

Isolation is by TRUNCATE between tests. **Tests must not mutate schema** —
TRUNCATE clears rows, not DDL, so a failed run leaks a dropped constraint into
every later run. This was found the hard way: a test that dropped a CHECK
constraint to write an invalid row broke the next three runs. Anything needing
schema mutation is a unit test instead.

The harness refuses to run unless the database name contains `test`.
