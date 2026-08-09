# Repository Implementation Report — BACKEND-08

## 1. What this command actually added

BACKEND-06 already produced working Kysely adapters, and BACKEND-07 made them
tenant-safe. An honest accounting of what was still missing:

| Gap | Status before | Now |
|---|---|---|
| **`save` accepted a workspace mismatch** | A repository scoped to A would happily persist a record belonging to B | Rejected before the write |
| **No unit of work** | Repositories built separately, each handed a context — one could hold the pool while another held the transaction | One `uow`, one transaction, verified |
| **Cross-tenant reads were *expressible*** | `findInWorkspace(otherWorkspace, …)` type-checked; RLS caught it at runtime | Scope is bound — the call cannot be written |
| **SQLSTATE never reached the application** | Helpers existed; nothing translated | LAGDA-owned errors carrying constraint names |
| **No concurrency control** | Read-then-write only | Conditional update, tested with a stale second writer |
| **No shared contract suite** | Fake and adapter tested separately | One specification, run against both |

## 2. The change worth arguing about

Scope moved from a **parameter** to a **binding**.

Before, `findInWorkspace(workspaceId, memberId, tx)` let a caller pass workspace
B while inside workspace A's transaction. RLS returned null, so the system was
safe — but the mistake was *typeable*, and a control that depends on a runtime
policy catching a compile-time-expressible error is weaker than one where the
error cannot be expressed.

Now the workspace is not an argument. `uow.memberships.findMember(id)` can only
mean the bound workspace.

This changed BACKEND-05's ports, which §100 of BACKEND-07 permits and this
command's §27 requires be done once and documented rather than accumulated.

## 3. Unit of work

`runForWorkspace(workspaceId, uow => …)` builds both repositories on one
transaction, having first set RLS context. `runGlobal(uow => …)` exposes **no
tenant repositories at all** — global mode is not a route to workspace data.

Details in [UNIT_OF_WORK.md](./UNIT_OF_WORK.md).

## 4. Coverage

| Repository | Save/load | Missing | Tenant isolation | Transaction | Constraint errors | Concurrency |
|---|---|---|---|---|---|---|
| `ScopedWorkspaceRepository` | PASS | PASS | PASS | PASS | PASS | N/A |
| `ScopedMembershipRepository` | PASS | PASS | PASS | PASS | PASS | PASS |

**47 integration tests** against real PostgreSQL: tenancy 16, persistence 18,
contract 13. Plus the same 13-case contract against the in-memory fake, in the
application package.

Notable cases: rollback discards **both** repositories' writes; a stale
conditional writer is refused and the first writer's value survives; a
cross-tenant conditional update returns `false` rather than an error, so it is
indistinguishable from "already changed"; an unknown error passes through
untranslated.

## 5. Risks

**R-1 — The fake's rollback is a snapshot restore.** It proves a use case does
not proceed past a failure. It does **not** prove PostgreSQL atomicity, and the
fake says so. Only the PostgreSQL contract run is evidence of that.

**R-2 — Conditional updates are ambiguous by design.** Zero rows means absent,
other tenant, or concurrently changed. That ambiguity is deliberate — resolving
it for the caller would leak cross-tenant existence — but it means a caller
cannot distinguish "you were too slow" from "it was never yours". Feature
commands must choose their message carefully.

**R-3 — No outbox.** Durable follow-up remains unsolved, as recorded since
BACKEND-05. The table is not created here because its shape depends on the job
system (BACKEND-16), and guessing it would leave a schema the queue has to
migrate around.

**R-4 — Repository test coverage is only as broad as the schema.** Two tables
exist. Every pattern here — scope binding, mismatch rejection, conditional
update, error translation — has to be applied by each feature command, not
inherited automatically.

## 6. Handoff — BACKEND-09 (Document Sealing Seam)

The persistence layer is ready to store what sealing produces, and deliberately
stores none of it yet.

`DocumentSealer` lives in `@lagda/application` with one operation, `seal()`, and
**still has no consumer** — that remains correct until completion exists
(BACKEND-38). `SealRequest`/`SealResult` are LAGDA-owned; INV-008 forbids any
`pdf-lib` type crossing, and INV-001 confines PDF libraries to
`packages/sealing` with ESLint enforcing it.

When artifact metadata is persisted, it must carry `seal_scheme`, `seal_version`
and `digest_algorithm` **from the first row written** — retrofitting them makes
historical records uninterpretable — and hashes must be named for their artifact
(`original_document_hash`, `signed_document_hash`), never one ambiguous `hash`.

Document bytes do not go in PostgreSQL (INV-050). The database holds metadata,
storage references and hashes.

Sealing must not be called inside a database transaction: it is slow, it is
external, and it cannot be rolled back when the commit later fails.

## 7. Other handoffs

**BACKEND-11:** routes never touch the database; they invoke use cases, which
own the unit of work. **BACKEND-14:** idempotency key identity includes tenant
scope. **BACKEND-16:** workers use this same unit of work — no worker-specific
SQL — and re-establish tenant context on every attempt. **BACKEND-19+:** auth
repositories are legitimately global; document that classification so a reviewer
does not read it as a tenancy bug. **BACKEND-31/37:** the signing aggregate
spans several tables and should be **one** repository, using conditional updates
for state transitions — core decides whether a transition is valid, the
repository makes an authorized one race-safe.
