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


## BACKEND-11 — API boundaries

| Rule | Status | Mechanism |
|---|---|---|
| Routes cannot import `@lagda/db`, `kysely`, `pg` | **ENFORCED** | Directory-scoped ESLint on `api/src/routes/**`, `api/src/plugins/**`. Probed: 3 blocked, plus `fastify` allowed as a control |
| Routes cannot import `@lagda/sealing` / `@lagda/storage` | **ENFORCED** | Same rule. Probed |
| Composition root MAY import `@lagda/db` | **ENFORCED (as permitted)** | `api/src/app/**` and `api/src/server/**` excluded. Probed — both allowed |
| HTTP framework confined to `@lagda/api` | **ENFORCED** | Architecture test + manifest check, with a negative control |
| Importing the package starts no listener | **ENFORCED** | No call at statement position in the entry point; probed |
| Every route declares a response schema | **ENFORCED for current routes** | Serialization test (leaky handler) + a route/schema count test. **Future feature commands must keep this true** — the count test enforces it per file |
| Unknown request fields rejected | **ENFORCED** | `removeAdditional: false`; probed by flipping it |
| No framework/validator error reaches a client | **ENFORCED** | One mapper; validator-internals test |
| No stack/SQL/credential in a 5xx body | **ENFORCED** | Credential-leak test; probed by returning `error.message` |
| Request ID on every response and error | **ENFORCED** | Tested on success, 404 and 500 |
| Client request ID ignored | **ENFORCED** | `requestIdHeader: false`; CRLF test; probed |
| Forwarded IP trusted only when configured | **ENFORCED (default-deny)** | `TRUST_PROXY=true` rejected at config load; spoofing tested both ways. **Production topology is OD-027** |
| CORS exact-match, never wildcard+credentials | **ENFORCED** | Lookalike-origin test; probed with a substring matcher |
| No migrations at startup | **ENFORCED** | Architecture test on migration symbols |
| No request/response body logging | **ENFORCED** | Explicit serializer allowlists; no body serializer exists |
| Sensitive headers redacted | **PARTIALLY ENFORCED** | Pino `redact` with `remove: true` is configured and reviewed, but no test asserts a redacted log line — BACKEND-12 owns log assertions |
| `process.env` read only in config | **ENFORCED** | Architecture test |
| No `console.*` | **ENFORCED** | Architecture test |
| API and worker are separate roles | **DOCUMENTED ONLY** | The worker does not exist yet |

### Honest gaps

**Log redaction is configured but unverified.** The paths are set and reviewed,
and bodies are never serialized at all — but nothing asserts that a log line
containing a cookie comes out without it. That assertion needs a log capture
harness, which is BACKEND-12's to build.

**Response-schema coverage is enforced per file, not per future route.** The
count test compares registered routes to declared response schemas in each route
module, so a new route without a schema fails. It cannot enforce that the schema
is *correct*.


## BACKEND-12 - Observability

| Rule | Status | Mechanism |
|---|---|---|
| No request-body logging | **ENFORCED** | No body serializer exists; capture test |
| No response-body logging | **ENFORCED** | Same |
| Secret redaction at any depth | **ENFORCED** | Deep walk in `formatters.log`; 20 capture tests. Probed: disabling it fails 7 |
| Secrets scrubbed from error MESSAGES | **ENFORCED** | `hooks.logMethod` + err serializer. Probed |
| Document/PDF content never logged | **ENFORCED** | Binary becomes a size marker; synthetic-marker test |
| Redaction does not over-match diagnostics | **ENFORCED** | Nine field names asserted to survive |
| No high-cardinality metric labels | **ENFORCED** | Catalog audit test. Probed by adding `workspaceId` |
| No dynamic metric names | **ENFORCED** | Closed union - the compiler refuses |
| `core`/`application` provider-independent | **ENFORCED** | Architecture test; no use-case signature takes a logger |
| Observability context is not authorization | **ENFORCED** | No `@lagda/db` file reads it; consumers an exact named set |
| Context does not leak across concurrent requests | **ENFORCED** | Three overlapping executions with different delays |
| Instrumentation rethrows the original error | **ENFORCED** | Identity assertion. Probed by swallowing it |
| Logs are not evidence | **ENFORCED ARCHITECTURALLY** | No telemetry table may be created; schema asserted. Feature commands must preserve it |
| No `console.*` in runtime code | **ENFORCED** | Architecture test across all packages |
| Structured logs in every process role | **ENFORCED** | Migration runner converted and verified against a live database |
| Metrics actually collected | **NOT ENFORCED - none are** | INSTRUMENTED_NO_EXPORTER. BACKEND-66 |
| DB / sealing telemetry | **DOCUMENTED ONLY** | Hooks and catalog defined; nothing wraps a repository or the sealer yet |

### Honest gaps

**No metric is exported.** The catalog and instrumentation exist and are tested
through an in-memory recorder. Nothing collects them, and the status says so.

**DB and sealing instrumentation are hooks, not wiring.** No repository is
wrapped and no sealing call exists to wrap. Writing a wrapper for an uncalled
operation would produce code nothing executes - the failure this repository has
already shipped once.

**Redaction cost is unmeasured.** The walk is bounded in depth, breadth and
string length, but its cost per log line under load has not been measured.


## BACKEND-14 - Idempotency

| Rule | Status | Mechanism |
|---|---|---|
| One record per scope+operation+key | **ENFORCED** | DB unique constraint. Probed by removing `ON CONFLICT` |
| Concurrent duplicates execute once | **ENFORCED** | Two independent transactions on separate connections; the second blocks then replays |
| Rollback frees the key | **ENFORCED** | Real transaction test - no poisoned row |
| Mutation + completion commit atomically | **ENFORCED** | Real transaction test against a second table |
| Fingerprint mismatch conflicts | **ENFORCED** | Tested at both application and DB level |
| Canonicalization stable across key order | **ENFORCED** | Tested; probed by sorting arrays |
| Raw key never persisted | **ENFORCED** | Schema asserted against the live database - no such column; CHECK rejects non-hex |
| Request body never persisted | **ENFORCED** | Same assertion |
| Raw key never logged | **ENFORCED** | BACKEND-12 redaction covers `idempotencyKey` and the header |
| No identifier metric labels | **ENFORCED** | Catalog audit test from BACKEND-12 |
| Bounded replay body | **ENFORCED** | 64 KiB, tested |
| No headers replayed | **ENFORCED** | The stored shape has no header field at all |
| Expired reclaim is race-free | **ENFORCED** | Conditional UPDATE, not delete-then-insert; tested |
| Cleanup spares unexpired rows | **ENFORCED** | Tested |
| **Replay requires current authorization** | **DOCUMENTED ONLY** | No feature route exists to enforce it. The framework cannot force ordering; the handoff states it |
| CSRF before claim | **PARTIALLY ENFORCED** | Structural - `requireSession` runs in `onRequest`, the claim in the handler. No feature route yet exercises the ordering |
| Exactly-once external delivery | **NOT CLAIMED** | Explicitly disclaimed |

### Honest gaps

**Authorization-before-replay is documented, not enforced.** It is the most
security-relevant rule this command states and the one the framework cannot
guarantee alone: a feature route must resolve authorization before reaching the
idempotency path. BACKEND-33/36 must do it, and a reviewer must check it.

**No HTTP adapter exists.** There is no route reading `Idempotency-Key`, because
there is no protected product route to attach it to. The header contract and the
key validator exist; wiring them is the first feature command's work.

**Only single-transaction operations are covered.** Plan change and OTP delivery
call external providers and are catalogued as PLANNED.


## BACKEND-15 - Rate limiting

| Rule | Status | Mechanism |
|---|---|---|
| Durable shared counters | **ENFORCED** | PostgreSQL; 10 concurrent increments yield 10 distinct counts |
| Atomic increment | **ENFORCED** | Single upsert. Probed by substituting read-then-write |
| Threshold boundary exact | **ENFORCED** | 5 allowed, 6th rejected. Probed with an off-by-one |
| Window reset | **ENFORCED** | Deterministic clock, no sleeping |
| Trusted IP only | **ENFORCED** | Spoofed header ignored when untrusted, honoured when a hop is trusted |
| Personal-data scope keys digested | **ENFORCED** | Tested; probed by storing raw |
| Every threshold sourced | **ENFORCED** | Startup validation plus a test citing handoff sections |
| Limit below 1 rejected | **ENFORCED** | Startup validation |
| Unknown policy rejected | **ENFORCED** | Throws rather than skipping the check |
| Fail-closed for credential policies | **ENFORCED** | Both modes tested; probed by forcing fail-open |
| Canonical 429 + Retry-After | **ENFORCED** | Integration test including the current request ID |
| No policy/count/scope in response | **ENFORCED** | Leak test |
| CORS preflight not counted | **ENFORCED** | Tested |
| Health/readiness unlimited | **ENFORCED** | Tested |
| Rate limit before idempotency | **ENFORCED** | Claim count unchanged after a 429 |
| Replay still counted | **ENFORCED** | Tested |
| No identifier metric labels | **ENFORCED** | Exact label assertion plus catalog audit |
| No raw IP in logs | **ENFORCED** | Log capture against the app's real logger |
| Feature thresholds (11 operations) | **DOCUMENTED ONLY** | TBD in the catalog; each feature command owns its number |
| No permanent lockout / anti-enumeration | **DOCUMENTED ONLY** | No auth endpoint exists to enforce it against |

### Honest gaps

**No policy has a production consumer.** Eight are implemented and enforceable;
none is wired to a feature endpoint, because no feature endpoint exists. The
wiring is two lines per route and belongs to the feature command.

**IP limits are not yet meaningful in production.** `TRUST_PROXY` defaults to
trusting nothing, so behind a proxy every request shares one bucket. That is the
safe failure, not a working control (OD-027).

**Anti-enumeration and no-permanent-lockout are stated, not enforced.** They
constrain BACKEND-20/22/23 and cannot be tested before those exist.

## BACKEND-16 - Worker and queue

| Rule | Status | Mechanism |
|---|---|---|
| API cannot import pg-boss or the worker | **ENFORCED** | ESLint; bare and subpath forms both probed |
| Worker cannot import fastify or the API | **ENFORCED** | ESLint; probed |
| Bans are not over-broad | **ENFORCED** | Three negative controls pass unflagged |
| Transactional enqueue commits together | **ENFORCED** | Real PostgreSQL, real pg-boss |
| Transactional enqueue rolls back together | **ENFORCED** | Probed by deleting the `db:` override |
| Payload size bounded | **ENFORCED** | Probed by raising the cap to 10 MB |
| Payload validated at execution | **ENFORCED** | Probed by skipping validation |
| Handler failure rethrown | **ENFORCED** | Probed by swallowing. Initially caught nothing - see gaps |
| Retry bound reaches the queue row | **ENFORCED** | `retry_limit`/`retry_backoff` asserted from the database |
| Queues exist before work or schedule | **ENFORCED** | Regression test after a boot failure |
| Schedules idempotent across restarts | **ENFORCED** | Repeated registration asserted |
| Schedules registered in UTC | **ENFORCED** | `timezone` column asserted |
| Every job declares a retry bound and idempotency strategy | **ENFORCED** | Registry test over all definitions |
| Configuration rejects invalid values | **ENFORCED** | Zero pool, out-of-range batch, malformed cron, non-numeric |
| Schedules default OFF | **ENFORCED** | Tested |
| Worker runs no migrations | **ENFORCED** | No migrator present; boot verified against a real database |
| Graceful shutdown is idempotent | **ENFORCED** | `close()` called twice |
| Job payload content rules (no PII/credentials) | **DOCUMENTED ONLY** | No detector; JOB_DATA_CLASSIFICATION.md states the rule |
| Job type names never renamed | **DOCUMENTED ONLY** | Review |
| Terminal errors stop retrying | **NOT ENFORCED** | Sets a log field only - see OD-048 |
| Worker log redaction | **NOT ENFORCED** | The API's redactor is not applied to worker output - OD-049 |
| SIGTERM/SIGINT handling | **NOT VERIFIED** | Proven only by calling `close()` directly - OD-047 |

### Honest gaps

**Nothing enqueues a job in production.** The scheduler port is implemented and
its atomicity is proven, but no route calls it. Two maintenance jobs are the only
consumers, and they are scheduled, not enqueued by a request.

**The rethrow guarantee was untested until this command's probe caught it.**
Every retry test drove `boss.work` directly, so the worker's own wrapper - the
code that actually runs in production - was covered by nothing. Deleting
`throw error;` broke no test. This is the `RouteMeta.status` failure mode
exactly: a rule that existed and executed nothing.

**The worker could not boot at all, and the suite was green.** pg-boss 12 does
not create queues implicitly. Twenty passing tests each created their own queue,
so none of them exercised the path production takes. Found by running the built
artefact.

**No workspace-scoped job exists**, so how a worker establishes RLS tenant
context for a job is unanswered and untested (OD-045).

## BACKEND-17 - Object storage

| Rule | Status | Mechanism |
|---|---|---|
| No SDK types outside packages/storage | **ENFORCED** | ESLint names + wildcard; 7 violations probed, 4 negative controls |
| Application/core/contracts free of S3 types | **ENFORCED** | Import bans plus the existing core-purity test |
| Byte-exact round trip | **ENFORCED** | SHA-256 compared across a 3 MB streamed round trip against real MinIO |
| No storage-side transformation | **ENFORCED** | Digest equality plus a `Content-Encoding` assertion |
| ETag is not the artifact digest | **ENFORCED** | Typed separately; inequality and length asserted |
| Immutable artifact keys | **PARTIALLY ENFORCED** | Refusal of different bytes is enforced and probed. NOT atomic under concurrency - measured, 6 of 6 concurrent writers succeeded. Uniqueness of artifact ids carries the rest |
| Identical-byte retry converges | **ENFORCED** | Sequential and concurrent tests |
| No torn object under concurrency | **ENFORCED** | Stored bytes always equal exactly one writer's payload |
| Missing bucket is not "object not found" | **ENFORCED** | Probed; found by pointing at a non-existent bucket |
| Typed absence, never empty content | **ENFORCED** | `null` from get/head; tested through the artifact path |
| Keys derived, never client-supplied | **ENFORCED** | Branded type, one validating constructor, probed |
| No customer filename in keys | **ENFORCED** | Probed by injecting one - 4 tests fail |
| Traversal / empty segment / overlong key rejected | **ENFORCED** | Probed |
| Zones map to separate buckets | **ENFORCED** | Verified against the live service |
| Tenant isolation of storage references | **ENFORCED** | Workspace B obtains no reference under RLS |
| TLS required in production | **ENFORCED** | Plaintext refused; the override is refused in production |
| Credentials never logged | **ENFORCED** | Allowlist projection, probed; live auth-failure leak test |
| Provider errors mapped structurally | **ENFORCED** | Induced against a real service |
| Bounded retries, no hidden loop | **ENFORCED** | SDK `maxAttempts` configured; no retry loop in any method |
| No binary queue payloads | **ENFORCED** | BACKEND-16 payload cap and schemas, unchanged |
| No presigned URL logging | **ENFORCED (vacuously)** | Not implemented; the redactor already scrubs signatures |
| No public buckets | **DEPLOYMENT ENFORCED** | No ACL in code (audited); bucket policy is BACKEND-58/65 |
| Server-side encryption | **DOCUMENTED ONLY** | A provider setting, not application code |
| DB/storage atomicity handled | **PARTIALLY ENFORCED** | Non-atomicity documented and ordering stated; flows are BACKEND-18/38 |
| Least-privilege credentials | **DOCUMENTED ONLY** | IAM lives in the provider |

### Honest gaps

**Nothing uploads and nothing downloads.** The port is implemented and proven,
and no product route uses it. Quarantine is provisioned and tested as a zone but
has no writer.

**Create-once is weaker than it first appeared.** `IfNoneMatch: "*"` is honoured
sequentially by MinIO, and an earlier version of this work generalised that into
an atomicity claim. Six concurrent writers with the header set ALL succeeded.
The claim was corrected in code comments, architecture doc and tests; the
guarantee now rests on unique artifact ids, with the conditional as a guard that
is stronger on providers which enforce it.

**The conditional-write probe catches nothing locally**, because the HEAD
pre-check covers every case MinIO would reject. Its value is provider-dependent
and cannot be demonstrated here.

**All provider-specific behaviour is measured against MinIO only.** AWS S3 is
expected to differ on exactly the conditional-write behaviour above (OD-051).

## BACKEND-18 - Secure upload

| Rule | Status | Mechanism |
|---|---|---|
| Quarantine before acceptance | **ENFORCED** | Order asserted; probed (13 tests fail) |
| Client MIME/extension not trusted | **ENFORCED** | Content detection + parser; probed (3 fail) |
| Malware scan mandatory | **ENFORCED** | Real ClamAV integration; no disable switch exists |
| Scanner failure fails closed | **ENFORCED** | Probed in the pipeline and in health (5 fail combined) |
| Unscannable file refused | **ENFORCED** | Tested against a real scanner limit |
| Malformed PDF rejected | **ENFORCED** | Two distinct branches, each probed separately |
| Encrypted PDF rejected | **ENFORCED** | Probed |
| Zero-page PDF rejected | **ENFORCED** | Hand-built fixture; probed |
| Accepted hash = exact bytes | **ENFORCED** | Byte-exact round trip through real MinIO |
| Digest re-verified at promotion | **ENFORCED** | Probed; tamper test |
| Extra files refused, not ignored | **ENFORCED** | Exact status and code asserted; probed |
| Oversized upload abandoned, not drained | **ENFORCED** | Chunk-count assertion |
| Identity never from the body | **ENFORCED** | Structural - the route parses no body |
| No long DB transaction | **ENFORCED** | One short transaction; reviewed |
| DB/storage consistency | **ENFORCED** | Failure injection at both windows |
| Accepted row implies an artifact | **ENFORCED** | Database CHECK constraint, tested directly |
| Cross-tenant promotion impossible | **ENFORCED** | Compound FK plus RLS; tenancy test |
| Cleanup row-driven and idempotent | **ENFORCED** | Run twice; horizon tested |
| No binary queue payloads | **ENFORCED** | Inherited from BACKEND-16; nothing enqueued here |
| Scanner/parser/SDK types confined | **ENFORCED** | ESLint bans on four package groups |
| Rejected uploads create no evidence | **ENFORCED** | No evidence write exists in this path |
| Document bytes never logged | **PARTIALLY ENFORCED** | Nothing in this path logs; no redaction test, because no log statement exists to test |
| Session / CSRF / rate limit ordering | **NOT ENFORCED HERE** | The route is test-only; the product route is BACKEND-29 |
| Quarantine retention schedule | **NOT ENFORCED** | Primitive built and tested; recurring job unregistered (OD-062) |
| Active-content sanitization | **DOCUMENTED ONLY** | Explicitly not performed - OD-059 |

### Honest gaps

**The route is test-only.** `POST /documents` is P0-16, a Documents-phase
endpoint owned by BACKEND-29. The pipeline is fully wired and exercised
end-to-end, but session, CSRF and rate-limit hooks are not attached, because
attaching them to a test route would prove nothing about the product route.

**No logging exists in the upload path.** The data classification is written and
the rules are clear, but there is no log statement to redact and therefore no
redaction test. Wiring observability belongs with the product route.

**Two orphan windows remain.** An upload row insert failing, or the acceptance
transaction failing, leaves a private unreferenced object that row-driven cleanup
cannot see. Both are recorded (OD-061); a bucket lifecycle rule is the intended
fix and it is a deployment setting.

**Signature coverage is a deployment property.** The integration scanner runs a
minimal EICAR database. What is proven is the adapter, the protocol and the
fail-closed behaviour - not that production signatures are fresh (OD-060).

## BACKEND-19 - Registration

| Rule | Status | Mechanism |
|---|---|---|
| One canonical email normalizer | **ENFORCED** | Single function; boundary assertion; probed twice |
| Unique normalized email | **ENFORCED** | DB constraint + six-way concurrency test |
| No plaintext password persistence | **ENFORCED** | Marker test over every column |
| No plaintext password logging | **ENFORCED** | Marker test over captured trace-level output |
| Password never altered | **ENFORCED** | Probed by trimming |
| Argon2id with explicit parameters | **ENFORCED** | PHC string parsed and asserted; probed with argon2i |
| Argon2 parameter floors | **ENFORCED** | Constructor throws; probed |
| Rate limit before hashing | **ENFORCED** | Hook ordering test observes zero hasher calls |
| Hashing outside transactions | **ENFORCED** | Ordering test; probed |
| No account overwrite / password replacement | **ENFORCED** | No update path; real-DB test |
| Mass assignment blocked | **ENFORCED** | Closed schema + explicit mapping; probed |
| New account unverified | **ENFORCED** | Probed |
| Verification digest, not raw token | **ENFORCED** | Probed |
| Token domain separation | **ENFORCED** | Distinct prefixes; digest allowlist test |
| Verification URL from configuration | **ENFORCED** | Builder takes a configured base |
| Atomic user + challenge | **ENFORCED** | Rollback tested |
| No session on registration | **ENFORCED** | Asserted |
| No false "email sent" claim | **ENFORCED** | Asserted |
| Stored credential must be Argon2id | **ENFORCED** | Database CHECK |
| Registration rate-limit policies exist | **ENFORCED** | Registry validation |
| Rate limiter BOUND to the route | **NOT ENFORCED** | Policies defined; binding is composition work with the wired app |
| Email verification delivery | **BLOCKED** | No notification infrastructure - BACKEND-44/45 |

### Honest gaps

**Verification cannot happen.** The challenge is created and stored correctly and
the raw token is returned for delivery, but nothing delivers it. A registered
account is therefore permanently unverified until BACKEND-21 and BACKEND-44/45
exist. Labelled a blocker, not a detail.

**The rate limiter is not bound to the route.** The policies are defined and the
ORDERING is proven with a hook, but the real limiter plugin is attached during
app composition, which this command did not perform - the route is registered by
its own function and not yet wired into `createApp`.

**A handler-level unknown-field guard was written and deleted.** Fastify's
default ajv strips unknown properties before the handler runs, so the guard could
never fire. It read as defence in depth while being incapable of doing anything.
The real control is `removeAdditional: false`, which `createApp` sets, and both
behaviours are now measured by tests.
