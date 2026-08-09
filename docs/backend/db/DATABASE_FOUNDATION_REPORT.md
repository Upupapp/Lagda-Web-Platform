# Database Foundation Report — BACKEND-06

## 1. What exists now

PostgreSQL 16 is operational. `@lagda/db` has validated configuration, a bounded
pool with explicit lifecycle, Kysely + `pg`, a migration runner and CLI, a real
transaction adapter implementing BACKEND-05's port, explicit row↔domain mapping,
SQLSTATE error classification, and two representative repository adapters.

**16 integration tests run against real PostgreSQL.** Rollback, constraints,
tenancy and timestamp round-tripping are verified against the database, not a
fake.

## 2. Schema created

Two tables — the minimum that makes the foundation real.

| Object | Why now |
|---|---|
| `workspaces` | BACKEND-05's `CreateWorkspace` needs it |
| `workspace_memberships` | Same use case; also the tenant-owned table that proves scoping |
| `uq_workspace_memberships_workspace_user` | A user belongs to a workspace once. Races make this a database concern |
| `uq_workspace_memberships_workspace_member` | **The compound-key foundation** — redundant today, required the moment a child table references a member |
| `idx_workspace_memberships_workspace_created_at` | Leads with `workspace_id`; every query is tenant-scoped first |
| `fk_workspace_memberships_workspace` (RESTRICT) | Deleting a workspace must not silently erase who belonged to it |
| `chk_workspace_memberships_role` | Keeps arbitrary strings out of a role column |
| `chk_workspaces_name_not_blank` | A blank name is bad data, not a lifecycle state |

**Deliberately absent:** users, documents, signing requests, recipients,
evidence, notifications, billing. Creating them now would freeze schema decisions
before the domain questions behind them are answered — **OD-013 in particular**,
which is unresolved and would otherwise dictate how signing state is stored.

## 3. Decisions

**Kysely** (ADR-003), chosen because tenant integrity must be expressible as
compound foreign keys and because a security reviewer has to be able to read what
a query does. Prisma's generated types would leak; Drizzle's generated migrations
are harder to review, and for tenant constraints the diff *is* the review.

**Row types hand-maintained, not generated.** Generation makes the live database
authoritative for types while migrations are authoritative for schema — two
sources that drift the moment someone skips a regeneration step.

**`varchar` + CHECK for statuses, not ENUM.** An ENUM couples schema lifecycle to
status evolution, and LAGDA's state model is still moving.

**RESTRICT, not CASCADE.** Deletion semantics are an open product question; a
default CASCADE would answer it silently and destructively.

## 4. Findings from building it

**F-1 — A test that mutates schema breaks isolation, permanently.**
An integration test dropped a CHECK constraint to write an invalid row, then
re-added it. It failed once — and because TRUNCATE clears rows but not DDL, the
dropped constraint leaked into the next three runs, failing tests that had
nothing to do with it. Rewritten as a unit test of the mapper, which is a pure
function and needed no database at all. **Recorded in the conventions:
integration tests must not mutate schema.**

**F-2 — `mergeConfig` silently ran the wrong suite.**
The integration Vitest config was built with `mergeConfig` from the base, which
concatenated the base `exclude` — including `**/*.integration.test.ts`. The
result ran the unit suite, skipped every integration test, and **reported
success**. Caught only because the test count looked wrong. The integration
config is now standalone.

**F-3 — Kysely 0.29 moved migration exports.** `Migrator` is in
`kysely/migration`, not `kysely`. The error message says so, which is better than
most.

## 5. Tenancy

`workspace_id` is a first-class column, indexes lead with it, and repository
ports have no unscoped lookup to call. The compound-key target is in place so
child tables can reference a member tenant-safely without a migration that
rewrites this table.

**RLS assessed and deferred** — see [RLS_ASSESSMENT.md](./RLS_ASSESSMENT.md). The
short version: RLS needs a per-transaction `SET LOCAL` that, missed under
connection pooling, carries one request's workspace into the next — a worse
failure than the one it prevents. Compound FKs address the more damaging case
(cross-tenant *writes*), which RLS does not.

## 6. Handoff — BACKEND-07 (tenancy)

Apply the compound-FK pattern to every tenant-owned table as it arrives:
`UNIQUE (workspace_id, id)` on the parent, `FOREIGN KEY (workspace_id,
parent_id)` on the child. Index leading with `workspace_id`. Split database roles
(`lagda_app` owning nothing, `lagda_migrate` owning the schema) — required before
RLS is even possible. Cross-tenant tests for every new tenant-owned table, using
the existing harness.

## 7. Handoff — BACKEND-08 (repositories)

Available: `createDatabase`, the transaction manager, `unwrapTransaction`,
mapping conventions, SQLSTATE helpers, and the integration harness with
TRUNCATE-based isolation.

Required: translate SQLSTATE into application errors per repository (constraint
name identifies which rule); scope every tenant-owned query in SQL, never by
comparing after the fetch; validate persisted status values rather than casting;
prefer conditional updates over read-then-write for state transitions. Repository
contract tests should run every adapter against the same behavioural suite.

**Not provided:** an outbox. BACKEND-05 flagged durable follow-up as unsolved and
it remains so — BACKEND-06 did not create the table because its shape depends on
the job system (BACKEND-16).

## 8. Handoff — others

**BACKEND-10:** evidence tables carry `seal_scheme`, `seal_version`,
`digest_algorithm` from the first row; migrations never rewrite historical seal
semantics. **BACKEND-11:** `database.ping()` for readiness, `close()` for
shutdown, config validated at startup. **BACKEND-17/29:** document bytes go to
object storage; the database holds metadata, references and hashes.
**BACKEND-60:** production needs automated backups, PITR, restore testing, and a
rollback plan for destructive migrations — `down` is not one.

## 9. Open

**OD-018** production PostgreSQL major · **OD-019** RLS timing ·
**OD-020** database hosting topology, which depends on OD-001 (data residency)
and is deliberately not decided here. Code stays portable PostgreSQL with no
Linode-specific APIs.
