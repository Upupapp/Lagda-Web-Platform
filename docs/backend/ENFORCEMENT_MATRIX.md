# LAGDA Backend — Enforcement Matrix

What actually executes, versus what is written down. Updated by each
`BACKEND-XX` command that changes an invariant's enforcement.

**Enforcement values**

- **ENFORCED** — a tool fails when the rule is violated, and that has been
  demonstrated by deliberately violating it.
- **PARTIALLY ENFORCED** — some violations are caught, others are not. The gap
  is stated.
- **DOCUMENTED ONLY** — nothing fails automatically. A human or a reviewing
  command must catch it.

The distinction is the point. This repository has already shipped a rule that
existed and executed nothing (`RouteMeta.status`, declared on 225 routes, read by
no code, drifted until three routes misreported themselves). A matrix that
overstates enforcement would repeat exactly that failure.

| Invariant | Rule | Enforcement | Tool | Command | Completed by |
|---|---|---|---|---|---|
| **INV-001** | PDF/signing libraries confined to `packages/sealing` | **ENFORCED** | ESLint `no-restricted-imports` | `npm run lint` | BACKEND-01 |
| **INV-002** | Only signing completion invokes `DocumentSealer` | DOCUMENTED ONLY | — | — | BACKEND-09 |
| **INV-003** | Workspace-owned access is workspace scoped | DOCUMENTED ONLY | — | — | BACKEND-06/07 |
| **INV-004** | Routes contain no primary domain logic | DOCUMENTED ONLY | — | — | BACKEND-11 |
| **INV-005** | `core` does not depend on infrastructure | **ENFORCED** | ESLint `no-restricted-imports` | `npm run lint` | BACKEND-01 |
| **INV-006** | Frontend source is not a backend dependency | **ENFORCED** | Vitest architecture test | `npm test` | BACKEND-01 |
| **INV-007** | Shared contracts originate from `@lagda/contracts` | **PARTIALLY ENFORCED** — the package exists and the backend consumes it, proven by a compile-time fixture. The **frontend does not**, because distribution is unresolved (OD-005), so the frontend remains a second authoritative source. | ESLint + consumption test | `npm run lint`, `npm test` | Blocked on OD-005 |
| **INV-021** | Contract types derived from schemas | DOCUMENTED ONLY | — | — | — |
| **INV-022** | Contracts stay browser-compatible | **PARTIALLY ENFORCED** — ESLint bars infrastructure and framework imports from `contracts`; emitted output verified free of Node references. A real browser bundle check needs the frontend to consume the package (OD-005). | ESLint + inspection | `npm run lint` | Blocked on OD-005 |
| **INV-023** | Public responses expose no more than the operation needs | **ENFORCED for verification** — `additionalProperties: false`, with tests asserting the public schema rejects `issuerWorkspaceId`, `transactionId`, `originalDocumentHash` | Vitest | `npm test` | BACKEND-02 |
| **INV-024** | No non-JSON values in contracts | **ENFORCED for verification** — JSON round-trip test | Vitest | `npm test` | BACKEND-02 |
| **INV-025** | Serialized status values are API contract | DOCUMENTED ONLY | — | — | — |
| **INV-008** | Public API types expose no infrastructure-library types | DOCUMENTED ONLY | — | — | BACKEND-09/11 |
| **INV-009** | eNotary is out of scope | DOCUMENTED ONLY | — | — | — |
| **INV-010** | Original uploaded documents are immutable | DOCUMENTED ONLY | — | — | BACKEND-05 |
| **INV-011** | Operational logs and evidence records are separate | DOCUMENTED ONLY | — | — | BACKEND-11/12 |
| **INV-012** | Retry-sensitive operations have durable idempotency | DOCUMENTED ONLY | — | — | BACKEND-03 |
| **INV-013** | State transitions are explicit and validated | DOCUMENTED ONLY | — | — | BACKEND-07 |
| **INV-014** | Tenant isolation is tested, not assumed | DOCUMENTED ONLY | — | — | BACKEND-07 |
| **INV-015** | Architectural change needs an ADR | Process | — | — | — |
| **INV-016** | `WorkspaceId` is branded and used for every workspace-owned reference | DOCUMENTED ONLY | — | — | BACKEND-02 |
| **INV-017** | Backend redactor matches by pattern and recurses through arrays | DOCUMENTED ONLY | — | — | BACKEND-11 |
| **INV-018** | Transition rules are owned by `core` | DOCUMENTED ONLY | — | — | BACKEND-07 |
| **INV-019** | No invariant without a named enforcing command | **ENFORCED** by this table's `Completed by` column | Review | — | BACKEND-00 |
| **INV-020** | No package dependency cycles; `package.json` deps and tsconfig references agree | **ENFORCED** | Vitest architecture test | `npm test` | BACKEND-01 |

## Enforcement added by BACKEND-01

Four rules became executable. Each was verified by deliberately violating it and
confirming the failure — a rule that has only been seen passing has not been
tested.

| Probe | Expected | Result |
|---|---|---|
| `import "pdf-lib"` in `packages/core` | lint error | error raised |
| `import "fastify"` in `packages/core` | lint error | error raised |
| `import "pdf-lib"` in `packages/sealing` | **no error** — this is its permitted home | no error raised |
| Cycle `contracts → core → contracts` | test failure | failed with the trail `contracts → core → contracts` |

The negative case matters as much as the positive ones: a rule that blocks the
allowed location too would push PDF work back out of the seam.






## Repositories and unit of work (BACKEND-08)

| Invariant | Rule | Enforcement | Tool | Completed by |
|---|---|---|---|---|
| **INV-062** | Ports in application, adapters in db; no DB types escape | **ENFORCED** | ESLint + typecheck | BACKEND-08 |
| **INV-063** | Scope bound by the unit of work, never a parameter | **ENFORCED** — the cross-tenant call is not expressible | Type system | BACKEND-08 |
| **INV-064** | Workspace mismatch rejected, never rewritten | **ENFORCED** — contract suite, both adapters | Vitest | BACKEND-08 |
| **INV-065** | One unit of work, one transaction | **ENFORCED** — rollback discards both repositories' writes | Vitest + PostgreSQL | BACKEND-08 |
| **INV-066** | SQLSTATE classification; unknown errors untranslated | **ENFORCED** | Vitest + PostgreSQL | BACKEND-08 |
| **INV-067** | Conditional updates for state-sensitive writes | **ENFORCED** — stale second writer refused | Vitest + PostgreSQL | BACKEND-08 |
| **INV-068** | Repositories have no external side effects | DOCUMENTED ONLY | — | — |
| **INV-069** | Contract runs against fake AND PostgreSQL | **ENFORCED** | Vitest | BACKEND-08 |

### Probes run

| Probe | Expected | Result |
|---|---|---|
| Insert a workspace-B record while scoped to A | reject before write | `WorkspaceScopeMismatchError` |
| Transaction fails after two repository writes | both discarded | both discarded |
| 15 consecutive transaction failures | pool survives | ping true |
| `runGlobal` exposes tenant repositories | no | none present |
| Duplicate membership | `UniqueConstraintViolation` + constraint name | matched |
| Membership in a missing workspace | `ForeignKeyConstraintViolation` | matched |
| Role outside the vocabulary | `CheckConstraintViolation` | matched |
| `ECONNREFUSED` passed to the translator | unchanged | unchanged |
| Stale conditional writer | `false`, first value survives | confirmed |
| Cross-tenant conditional update | `false`, target untouched | confirmed |
| Same contract against fake and PostgreSQL | both pass | both pass |

## Workspace tenancy (BACKEND-07)

| Invariant | Rule | Enforcement | Tool | Completed by |
|---|---|---|---|---|
| **INV-054** | Repository methods require workspace scope + transaction | **ENFORCED** — no unscoped signature exists; reads take the transaction | Type system + RLS | BACKEND-07 |
| **INV-055** | Tenant context transaction-local, one place | **ENFORCED** — leak tested across commit, rollback, and 10 alternating transactions | Vitest | BACKEND-07 |
| **INV-056** | Missing context fails closed | **ENFORCED** | Vitest | BACKEND-07 |
| **INV-057** | Runtime role cannot bypass RLS | **ENFORCED** — asserted before every policy test | Vitest | BACKEND-07 |
| **INV-058** | RLS does not replace repository predicates | **ENFORCED** — both layers tested independently | Vitest | BACKEND-07 |
| **INV-059** | `workspace_id` immutable | **ENFORCED** — `WITH CHECK` rejects the move | Vitest | BACKEND-07 |
| **INV-060** | Cross-tenant lookup indistinguishable from absent | **ENFORCED** | Vitest | BACKEND-05/07 |
| **INV-061** | New tenant tables update model + matrix | Process | Review | — |
| **INV-047** | Tenant integrity at DB level | **PARTIALLY ENFORCED** — compound-key target exists; no referencing table yet, so the cross-tenant relationship attack is PLANNED not tested | Schema | BACKEND-08 |

### Probes run as the RUNTIME role against real PostgreSQL

| Probe | Expected | Result |
|---|---|---|
| Runtime role superuser / BYPASSRLS | both false | both false |
| Runtime role owns tenant tables | no | no |
| `FORCE ROW LEVEL SECURITY` | enabled | enabled |
| Read own workspace | visible | visible |
| Read other workspace by ID | null | null |
| Query with **no predicate at all** | only own workspace | only own workspace |
| Insert row for another workspace | rejected | RLS violation |
| Move own row to another workspace | rejected | RLS violation |
| Update another workspace's row | 0 rows | 0 rows |
| Delete another workspace's row | 0 rows, row survives | 0 rows, survived |
| Read with NO tenant context | 0 rows | 0 rows |
| Insert with NO tenant context | rejected | rejected |
| B transaction then A transaction | no leak | no leak |
| Rolled-back B then global | no leak | no leak |
| 10 alternating A/B transactions | no leak | no leak |
| Membership FK to non-existent workspace | rejected | rejected |

## Persistence (BACKEND-06)

| Invariant | Rule | Enforcement | Tool | Completed by |
|---|---|---|---|---|
| **INV-046** | Database confined to `@lagda/db` | **ENFORCED** — `kysely`/`pg` banned outside it | ESLint | BACKEND-06 |
| **INV-047** | Tenant integrity at the DB level | **PARTIALLY ENFORCED** — compound-key target in place; referencing tables arrive in BACKEND-07 | Schema | BACKEND-07 |
| **INV-048** | Migrations sole schema mechanism, immutable once applied | **ENFORCED** — CI migrates an empty database from zero, then re-runs for idempotency | CI | BACKEND-06 |
| **INV-049** | Business vs technical timestamps | DOCUMENTED ONLY | — | — |
| **INV-050** | No document bytes in PostgreSQL | DOCUMENTED ONLY | — | BACKEND-17 |
| **INV-051** | Parameterized SQL, whitelisted identifiers | DOCUMENTED ONLY — no interpolation exists today | — | — |
| **INV-052** | Real PostgreSQL for integration tests | **ENFORCED** — 16 tests against PostgreSQL 16 | Vitest + CI | BACKEND-06 |
| **INV-053** | SQLSTATE, never message text | **ENFORCED** — helpers tested against real violations | Vitest | BACKEND-06 |
| **INV-003** | Workspace-scoped data access | **ENFORCED at the port AND in SQL** — no unscoped lookup exists, and the query carries both predicates. Verified cross-tenant against PostgreSQL. | Type system + Vitest | BACKEND-06 |

### Probes run against real PostgreSQL

| Probe | Expected | Result |
|---|---|---|
| Empty database → current schema | applies | applied |
| Re-run migration | no-op | no-op |
| Transaction fails after first write | both discarded | rolled back |
| 15 consecutive transaction failures | pool survives | ping still true |
| Foreign transaction context | rejected | rejected |
| Duplicate user in one workspace | 23505 | 23505 |
| Same user in two workspaces | allowed | allowed |
| Membership in a non-existent workspace | 23503 | 23503 |
| Role outside the vocabulary | 23514 | 23514 |
| Blank workspace name | 23514 | 23514 |
| Delete a workspace with members | 23503 (RESTRICT) | blocked |
| UTC timestamp round trip | no shift | exact |
| Member of workspace B read from A | null | null |
| `kysely` imported in application | lint error | error raised |
| `kysely` imported in `@lagda/db` | **no error** | no error |

## Application layer (BACKEND-05)

| Invariant | Rule | Enforcement | Tool | Completed by |
|---|---|---|---|---|
| **INV-039** | No concrete infrastructure in application | **ENFORCED** — bans third-party infra *and* `@lagda/db`/`storage`/`sealing`, with composition roots exempt | ESLint | BACKEND-05 |
| **INV-040** | Workspace-owned ports require scope | **ENFORCED by port shape** — no unscoped lookup exists to call | Type system | BACKEND-05 |
| **INV-041** | Clock and ID generators, not globals | **ENFORCED** | Vitest | BACKEND-05 |
| **INV-042** | No HTTP semantics in application errors | **ENFORCED** | Vitest | BACKEND-05 |
| **INV-043** | Resolved actor context only | DOCUMENTED ONLY | — | BACKEND-11 |
| **INV-044** | Cross-tenant lookup indistinguishable from absent | **ENFORCED** | Vitest | BACKEND-05 |
| **INV-045** | External side effects not falsely durable | DOCUMENTED ONLY — no outbox exists | — | BACKEND-06/16 |
| **INV-002** | Only completion invokes `DocumentSealer` | **PARTIALLY ENFORCED** — the port exposes one high-level `seal()`, so no caller can reach `mergeFields`/`signPdf`. Nothing yet restricts *which* use case calls it, because completion does not exist. | Port shape | BACKEND-38 |

### Probes run

| Probe | Expected | Result |
|---|---|---|
| `import "@lagda/db"` in application | lint error | error raised |
| `import "pg"` in application | lint error | error raised |
| `import "@lagda/db"` in `packages/api` | **no error** — composition root | no error raised |
| Workspace A reads a member existing in workspace B | not-found | not-found |
| Foreign member vs absent member | identical code and message | identical |
| Empty name | no transaction opened | none opened |
| Transaction failure | nothing persisted | nothing persisted |
| Application error | no `statusCode`/`status` property | none present |

## Core domain (BACKEND-04)

| Invariant | Rule | Enforcement | Tool | Completed by |
|---|---|---|---|---|
| **INV-005** | Core free of infrastructure | **ENFORCED** — ESLint import bans plus a purity test reading core's own source | ESLint + Vitest | BACKEND-01/04 |
| **INV-013** | State transitions explicit and validated | **PARTIALLY ENFORCED** — the signing request machine is a table with terminal protection and 59 tests. Document, template and invitation lifecycles are not modelled yet. | Vitest | BACKEND-29/33 |
| **INV-033** | No clock read in core | **ENFORCED** | Vitest | BACKEND-04 |
| **INV-034** | No randomness in core | **ENFORCED** | Vitest | BACKEND-04 |
| **INV-035** | No generic status setter | **ENFORCED** | Vitest | BACKEND-04 |
| **INV-036** | Terminal states never reactivate | **ENFORCED** — every terminal state tested against every action | Vitest | BACKEND-04 |
| **INV-037** | Frontend does not import core | DOCUMENTED ONLY — cross-repo, so nothing can check it (OD-005) | — | — |
| **INV-038** | Domain errors carry no infrastructure concerns | **ENFORCED for errors** | Type shape | BACKEND-04 |

### Probes run

| Probe | Expected | Result |
|---|---|---|
| `Date.now()` / `new Date()` in core production source | none | none found |
| `Math.random` / `randomUUID` / `crypto.` in core | none | none found |
| `process.env` in core | none | none found |
| `node:` / fastify / pg / pdf-lib import in core | none | none found |
| `any` / `as any` in core | none | none found |
| `TODO` / `FIXME` / `HACK` in core | none | none found |
| `setStatus` / `setWorkspaceId` in core | none | none found |
| Every terminal state × every action | all forbidden | all forbidden |
| Signature required for a viewer | throw | threw |

## API conventions (BACKEND-03)

| Invariant | Rule | Enforcement | Tool | Completed by |
|---|---|---|---|---|
| **INV-026** | Canonical `ApiError` envelope | **ENFORCED for the schema** — the shape is validated and rejects `stack`/`sql`/`path`. Nothing yet forces routes to use it, because no routes exist. | Vitest | BACKEND-11 |
| **INV-027** | Branch on code, never message | DOCUMENTED ONLY | — | — |
| **INV-028** | Unknown request fields rejected | **ENFORCED** — `additionalProperties: false` on every request schema, with tests | Vitest | BACKEND-03 |
| **INV-029** | Sort keys whitelisted | **ENFORCED** — `sortSchema()` is a closed union; `id; DROP TABLE documents` is rejected | Vitest | BACKEND-03 |
| **INV-030** | Timestamps are UTC strings | **ENFORCED for extracted contracts** — RFC 3339 pattern | Vitest | BACKEND-03 |
| **INV-031** | Request/response DTOs distinct | DOCUMENTED ONLY | — | BACKEND-11 |
| **INV-032** | Handlers map to declared contracts | DOCUMENTED ONLY | — | BACKEND-11 |

### Probes run

| Probe | Expected | Result |
|---|---|---|
| Error carrying `stack`, `sql` or `path` | reject | rejected |
| Validation detail carrying the submitted value | reject | rejected |
| More than 25 validation details | reject | rejected |
| `NOT_FOUND` / `notFound` / `not-found` as a wire code | reject | rejected |
| `perPage: 1000000` | reject | rejected |
| `page: 0`, `page: -1`, `page: 1.5` | reject | rejected |
| `{ page: 1, isAdmin: true }` | reject | rejected |
| `sortBy: "id; DROP TABLE documents"` | reject | rejected |
| `{ totalItems, pageSize, hasMore }` instead of the canonical names | reject | rejected |
| Out-of-range page as `items: []` | accept | accepted |

## Enforcement added by BACKEND-02

| Probe | Expected | Result |
|---|---|---|
| Public verification schema given `issuerWorkspaceId` | reject | rejected |
| Public verification schema given `transactionId` | reject | rejected |
| Public verification schema given `originalDocumentHash` | reject | rejected |
| `FileComparisonResult` given `match-demo` | reject | rejected |
| Malformed SHA-256 digests (case, length, non-hex) | reject | rejected |
| Timestamp with `+08:00` offset instead of `Z` | reject | rejected |
| `DocumentId` passed where `WorkspaceId` expected | compile error | `@ts-expect-error` satisfied |
| Plain `string` passed where `WorkspaceId` expected | compile error | `@ts-expect-error` satisfied |

The `@ts-expect-error` assertions fail the build if the error they expect stops
occurring, so branding cannot silently weaken.

**Not enforced, and stated plainly:** contract drift between frontend and
backend. The frontend does not consume the package (OD-005), so the guardrail
that would catch it — the frontend failing to compile — does not exist.

### CORRECTION — the "known imprecision" was not merely cosmetic

This section previously recorded that a PDF import inside `packages/core` cited
the INV-005 message rather than INV-001, and concluded that only the citation was
imprecise while "the import is still blocked".

**The first half was true and the conclusion was wrong.** BACKEND-09 probed the
mechanism instead of reasoning about it, and found real holes.

`no-restricted-imports` is **last-wins per file**, not additive. When two config
blocks both matched a package, the later block *replaced* the earlier one. The
overlapping layout therefore deleted bans nobody noticed were gone:

| Import | Package | Was | Now |
|---|---|---|---|
| `react` | `@lagda/contracts` | **allowed** | blocked |
| `vite` | `@lagda/contracts` | **allowed** | blocked |
| `@lagda/api` | `@lagda/application` | **allowed** | blocked |
| `@lagda/worker` | `@lagda/application` | **allowed** | blocked |
| `pdf-lib` | `@lagda/sealing` | **blocked** | allowed |

The last row is the inverse failure: the persistence block spread a package list
that transitively contained the PDF libraries, so the one package that *must*
import `pdf-lib` was forbidden from doing so — and told "Database access belongs
in `@lagda/db`" when it tried. `@lagda/sealing` had no source files at the time,
so nothing failed and the rule looked fine.

**Fix.** One block per package, built from groups that each keep their own
message. Lists are now purpose-specific (`DB_PACKAGES`, `INFRA_NON_PDF`,
`FRONTEND_PACKAGES`, `LAGDA_ADAPTERS`) rather than one `INFRA_PACKAGES` reused
for unrelated bans.

**Verification.** 17 probes, each appending a real import and reading the result:
14 must-block cases and 3 negative controls (`pdf-lib` in sealing, `pg` in db,
`@lagda/db` in api), plus the previously-broken four. All 17 behave correctly.

**The lesson, recorded because it generalises.** The original note reasoned about
the config rather than executing it, and reached a conclusion that was
comfortable and wrong. Every claim in this matrix should be a probe result. The
earlier reading also had the strongest possible reason to look correct: `npm run
lint` passed, in a repository where nothing had yet tried to violate the deleted
rules.

### Known imprecision

~~Inside `packages/core`, a PDF import reports the INV-005 message rather than
INV-001 … recorded rather than worked around with a more fragile
configuration.~~

**Superseded by the correction above.** Each package now carries one rule whose
groups keep their own messages, so a PDF import reports the PDF message
everywhere, and no ban is silently replaced by another block.
