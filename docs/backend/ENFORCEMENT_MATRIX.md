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

## BACKEND-20 - Login and sessions

| Rule | Status | Mechanism |
|---|---|---|
| Canonical login email normalization | **ENFORCED** | Shared normalizer; real-DB casing test |
| Unknown / wrong-password public equivalence | **ENFORCED** | Byte-for-byte response comparison; probed |
| Dummy Argon2 path for unknown accounts | **ENFORCED** | Probed by removal |
| No account metadata on failure | **ENFORCED** | Serialized-failure scan |
| Verification checked after the password | **ENFORCED** | Probed by reordering |
| Unverified accounts cannot log in | **ENFORCED** | Probed; real-DB test on a freshly registered account |
| Registration hashes authenticate | **ENFORCED** | Cross-command integration test |
| Fresh session per login | **ENFORCED** | Distinct tokens asserted |
| Session fixation prevented | **ENFORCED** | Planted-cookie test |
| Raw tokens never in body or logs | **ENFORCED** | Marker tests; closed response schema, probed |
| Only digests persisted | **ENFORCED** | Real-DB assertion |
| Cookie attributes correct | **ENFORCED** | HttpOnly/Secure/SameSite/Path/Max-Age asserted |
| Login-CSRF origin check | **ENFORCED** | Probed |
| Logout revokes server-side | **ENFORCED** | Probed; revoked credential no longer resolves |
| Failed revocation not reported as success | **ENFORCED** | Probed |
| Logout cookie scope matches | **ENFORCED** | Path comparison; probed |
| Repeated logout safe | **ENFORCED** | Tested |
| No JWT / refresh token / bearer | **ENFORCED** | Closed schema; no dependency |
| Rate limit BEFORE Argon2 | **PARTIALLY ENFORCED** | Ordering proven with a hook; the real limiter is not yet BOUND to the route |
| Logout CSRF hook | **PARTIALLY ENFORCED** | Written as a protected mutation; the plugin is attached at composition |
| Rehash on login | **ENFORCED** | Success-only, non-fatal, probed |

### Honest gaps

**Neither route is wired into `createApp` yet.** They are registered by their own
function and tested through a Fastify instance built in the test. That means the
rate-limit plugin and the session/CSRF plugin are not attached to them in a
running application - the ORDERING is proven with a stand-in hook, and the
binding is composition work.

**No timing benchmark.** The dummy-hash path is verified structurally rather
than by measuring response times, because microsecond assertions are flaky in CI
and a passing flaky test is worse than an honest gap.

**The frontend still uses its mock auth service.** No frontend change was made,
so cookie-session compatibility is unproven end to end.

## BACKEND-21 - Email verification

| Rule | Status | Mechanism |
|---|---|---|
| Raw code never persisted | **ENFORCED** | Digest-only schema; row scanned in a test |
| Raw code never logged | **ENFORCED** | Marker test at trace level |
| Digest lookup, domain-separated | **ENFORCED** | Unique index; compared against a bare hash; probed |
| Credential strength independent of rate limits | **ENFORCED** | 60 bits; probed by shortening |
| Single use | **ENFORCED** | Conditional UPDATE, tested at the repository; probed |
| Expiry honoured, never reactivated | **ENFORCED** | Derived from timestamps; probed |
| Supersession on resend | **ENFORCED** | Probed; old code refused |
| One active challenge per user | **ENFORCED** | PARTIAL UNIQUE INDEX; concurrent-resend test |
| First verification timestamp preserved | **ENFORCED** | Conditional UPDATE, tested directly; probed |
| Concurrent redemption yields one transition | **ENFORCED** | 8 concurrent transactions |
| Delivery failure does not invalidate the old code | **ENFORCED** | Scheduling inside the transaction; failure test |
| Public resend anti-enumeration | **ENFORCED** | Identical responses; route discards the reason; probed |
| Verification failures collapse publicly | **ENFORCED** | Probed |
| Configured link base URL | **ENFORCED** | Tested |
| No session from verification | **ENFORCED** | Tested |
| No GET mutation | **ENFORCED** | Tested |
| Login eligibility changes after verification | **ENFORCED** | Cross-feature test end to end |
| Consumed and superseded are mutually exclusive | **ENFORCED** | Database CHECK, tested |
| Rate-limit policies defined | **ENFORCED** | Registry validation with strengthened provenance |
| Rate limiter BOUND to these routes | **NOT ENFORCED** | Composition work; neither route is wired into createApp |
| Verification email delivery | **BLOCKED** | No notification infrastructure - BACKEND-44/45 |
| Challenge retention / cleanup | **NOT IMPLEMENTED** | No policy exists to implement |

### Honest gaps

**Delivery is still blocked.** The lifecycle is complete and proven, and nothing
sends a code. A production user cannot verify. Unchanged since BACKEND-19.

**Neither route is composed.** Like login and registration, they are registered
by their own function and tested through a Fastify instance built in the test,
so the rate limiter is not attached in a running application.

**Three controls had no test until probed.** `consumeIfActive`'s conditions,
`markEmailVerifiedIfUnverified`'s condition, and the digest domain prefix were
each masked by a redundant application-level check. Defence in depth is right;
untested defence in depth is deletable, and each now has a direct test.

**A provenance check was checking nothing.** `sources every threshold` matched
any string containing the word "handoff" - including "not specified by the
handoff". It now requires a section citation or an explicit admission that the
number was chosen.

## BACKEND-22 — Password recovery

| Rule | Status | Mechanism |
|---|---|---|
| Forgot-password anti-enumeration | **ENFORCED** | Identical status, body and header set; route discards the reason; probed |
| Raw reset token not persisted | **ENFORCED** | Digest-only schema; the row is scanned in a test |
| Raw reset token / URL not logged | **ENFORCED** | Never reaches a query, error or body; response bodies asserted clean |
| Digest lookup, domain-separated | **ENFORCED** | Unique index; asserted against a bare SHA-256 and the verification digest; probed |
| Credential strength independent of rate limits | **ENFORCED** | 256 bits; probed by shortening |
| Single-use reset token | **ENFORCED** | Conditional consume; probed |
| Expiry honoured | **ENFORCED** | Derived from timestamps; probed |
| Supersession on re-request | **ENFORCED** | Probed; old token refused |
| One active reset credential | **ENFORCED** | PARTIAL UNIQUE INDEX; 5 concurrent requests |
| Concurrent same-token reset yields one change | **ENFORCED** | 4 concurrent resets; exactly one candidate verifies |
| Reset + session revocation atomic | **ENFORCED** | One transaction; probed |
| Delivery failure does not invalidate the old token | **ENFORCED** | Scheduling inside the transaction; probed |
| Rate limit before Argon2 | **PARTIALLY ENFORCED** | Ordering enforced, order-asserted and probed; limiter NOT bound |
| Cheap validation before Argon2 | **ENFORCED** | Shape and policy precede the hash; probed |
| Argon2 outside the DB transaction | **ENFORCED** | Order asserted in a route test |
| Reset URL uses the configured host | **ENFORCED** | Probed |
| Password policy identical to registration | **ENFORCED** | Imported, not restated; probed |
| Password reset does not verify email | **ENFORCED** | One-column update; probed |
| No GET mutation | **ENFORCED** | Tested on both endpoints |
| No auto-login; cookies cleared | **ENFORCED** | Tested; probed |
| Old password fails, new password works | **ENFORCED** | Cross-feature test end to end |
| Rate limiter BOUND to these routes | **NOT ENFORCED** | Composition work; neither route is wired into `createApp` |
| Reset email delivery | **BLOCKED** | No notification infrastructure — BACKEND-44/45 |
| Timing equivalence between branches | **DOCUMENTED ONLY** | Structurally identical pipeline; no constant-time guarantee |
| Challenge retention / cleanup | **NOT IMPLEMENTED** | No policy exists to implement — OD-077 |
| Supersede other active challenges on success | **UNREACHABLE** | Written and correct; the one-active index makes it unmatchable. The test asserts the property instead |

### Honest gaps

**Delivery is still blocked.** Fourth command in a row. The recovery lifecycle
is complete and proven, and a production user cannot receive a link.

**Still nothing is composed.** No auth route — register, sign-in, sign-out,
verify, resend, forgot, reset — is registered in `createApp`. Every rate-limit
policy in this feature is a defined policy attached to nothing.

**A probe caught nothing on its first run.** `drop the digest domain prefix`
passed every test. The domain-separation test compared the digest function to
itself and then asserted that a garbage value found no row — two things that are
true regardless of the prefix. Rewritten to assert the actual property.

**One control is unreachable.** `supersedeActiveForUser` in the reset path
cannot match a row while `password_reset_one_active` exists. Kept as defence in
depth; the test asserts the outcome §72 wants rather than the mechanism, so it
stays meaningful either way.

## BACKEND-23 — Multi-factor authentication

| Rule | Status | Mechanism |
|---|---|---|
| Implemented factor matches the product | **ENFORCED** | Inventory measured from the frontend; closed type + DB CHECK |
| No raw code persistence | **NOT APPLICABLE** | TOTP codes are computed, never stored |
| TOTP secret encrypted at rest | **ENFORCED** | AES-256-GCM; row scanned for plaintext; probed (fixed IV) |
| GCM authentication | **ENFORCED** | Tampered-ciphertext and wrong-key tests |
| Purpose / subject binding | **ENFORCED** | The ceremony resolves the user; codes checked against that user's factor; cross-user tests |
| Attempt limit, durable and atomic | **ENFORCED** | PostgreSQL-computed increment; 8 concurrent → exactly 5; probed twice |
| Exhausted ceremony cannot authenticate | **ENFORCED** | Ceiling in the UPDATE; probed; direct repository test |
| Replay prevention | **ENFORCED** | Conditional watermark; probed |
| Malformed submissions cost an attempt | **ENFORCED** | Tested |
| Narrow skew window | **ENFORCED** | Probed, after the gap was found |
| One session per ceremony (recovery path) | **ENFORCED** | Conditional consume; probed 3/3 |
| One session per ceremony (TOTP path) | **DEFENCE IN DEPTH** | Unreachable while the watermark serializes first; kept, and honestly labelled |
| No full session before MFA | **ENFORCED** | Result type carries no credentials; probed |
| Fresh session after MFA | **ENFORCED** | Probed |
| Pre-auth never promoted to a session | **ENFORCED** | Probed |
| Pre-auth restricted to `/auth` | **ENFORCED** at the cookie | `Path=/auth`; browsers do not transmit it elsewhere |
| Pre-auth cannot access app routes | **PARTIALLY ENFORCED** | Route-level refusal tested through a test double; not demonstrated in a composed app (OD-069) |
| MFA enumeration blocked | **ENFORCED** | Three login paths return identical rejections; probed |
| Enrolment requires proving the factor | **ENFORCED** | Probed |
| Disable requires the password | **ENFORCED** | Probed |
| Password reset revokes ceremonies | **ENFORCED** | Probed |
| Password reset does not disable MFA | **ENFORCED** | Tested |
| No code / secret / credential in bodies | **ENFORCED** | Response-body tests |
| No attempt count disclosed | **ENFORCED** | Tested |
| Replay indistinguishable from a wrong code | **ENFORCED** | Probed, after the test was found to be passing vacuously |
| Rate limiters BOUND to routes | **NOT ENFORCED** | No auth route is composed — OD-069 |
| Key management | **PARTIALLY ENFORCED** | One configured key with a version column; no KMS, no rotation, no escrow — OD-081 |
| OTP delivery | **NOT APPLICABLE** | TOTP delivers nothing |
| Challenge retention / cleanup | **NOT IMPLEMENTED** | No policy exists — OD-077 |

### Honest gaps

**OD-069 is now the top blocker, and it has changed character.** Eleven auth
routes across five commands, none composed into `createApp`. Until BACKEND-23
that meant unbound rate limiters. It now also means the guarantee that a pre-auth
credential cannot resolve a user is a property of a test double: `authenticatedUser`
is a route option, and nothing in a running application supplies it.

**Two probes caught nothing, for defensible reasons** — the TOTP-path consume
guard is unreachable behind the watermark, and the secret box's tag-length guard
is redundant with GCM itself. Both are recorded as defence in depth rather than
counted as enforced.

**Four probes caught nothing on their first run and exposed real gaps**, since
fixed: repository conditions masked by redundant application checks, an untested
skew window, a route assertion that passed vacuously because its stub returned
`valid: false` for the replay case, and two concurrency paths no test reached.

**One flaky full-suite run**, not reproduced in four subsequent full runs and
five focused ones. Test names not captured. Recorded rather than dismissed.

## BACKEND-24 — Account and profile

| Rule | Status | Mechanism |
|---|---|---|
| Profile field allowlist | **ENFORCED** | Closed schema + explicit column lists; probed |
| Security fields excluded | **ENFORCED** | 14 mass-assignment payloads each a 400; probed |
| No generic user patch exists | **ENFORCED** | Repository surface asserted by a test |
| `/me` safe projection | **ENFORCED** | Closed response schema + leak tests; probed |
| MFA secret cannot reach `/me` | **ENFORCED BY TYPES** | The projection type has nowhere to put it — the leak does not compile |
| Session digests cannot reach a response | **ENFORCED** | Projection selects four columns; probed |
| Identity resolved from the session only | **ENFORCED** | No id in any path or schema |
| Pre-auth denied account access | **PARTIALLY ENFORCED** | Route refuses it; not demonstrated in a composed app (OD-069) |
| CSRF on account mutations | **NOT ENFORCED** | No plugin bound anywhere — OD-069 |
| Rate limit on password change | **NOT ENFORCED** | Policy exists, binding does not — OD-069 |
| Current password required to change it | **ENFORCED** | Probed |
| Registration password policy reused | **ENFORCED** | Imported, not restated; probed |
| Other sessions revoked, own preserved | **ENFORCED** | Probed in both directions |
| Pending MFA revoked on password change | **ENFORCED** | Tested |
| Session ops scoped to the owner | **ENFORCED** | Probed |
| IANA time zones only | **ENFORCED** | Shape + runtime + CHECK; probed. A real defect found here |
| Unicode names accepted | **ENFORCED** | Tested against real names |
| `no-store` on account responses | **ENFORCED** | Probed |
| Email change is not a profile edit | **ENFORCED BY ABSENCE** | Not in product; requirements documented |
| Workspace state excluded | **ENFORCED** | No workspace field anywhere in this surface |
| Historical evidence untouched | **ENFORCED ARCHITECTURALLY** | No import path from account code to evidence |
| Account deletion | **NOT IMPLEMENTED** | BACKEND-55; no hard delete exists |
| Avatar / phone | **NOT IMPLEMENTED** | Not persisted / not collected |

### Honest gaps

**OD-069 now spans seventeen routes.** Six added here, none composed. Three
controls this command is supposed to enforce — pre-auth refusal, CSRF, and a
rate limit on password change — are therefore properties of route options and
test doubles rather than of a running application. This is the same gap
BACKEND-20 raised and it has grown with every command since.

**The sessions page shows device and region; nothing records them.** BACKEND-13
stores no user agent or IP. The projection returns what exists rather than
fabricating labels — OD-087.

**Probing found a real defect.** The timezone check trusted
`Intl.DateTimeFormat`, which accepts `"+08:00"`. Raw offsets would have been
stored. Fixed with an IANA shape check, and probed.

## BACKEND-25 — Workspace lifecycle

| Rule | Status | How |
|---|---|---|
| Workspace + owner membership atomic | **ENFORCED** | One unit of work; rollback forced with PostgreSQL's own FK, both rows asserted absent |
| Creator taken from the authenticated actor | **ENFORCED** | Use-case input has no owner field; ten privileged payloads each rejected at the schema |
| Client cannot choose a WorkspaceId | **ENFORCED** | Generated from a port; `additionalProperties: false` |
| Membership uniqueness | **ENFORCED** | `UNIQUE(workspace_id, user_id)`; duplicate insert refused |
| Membership references a real account | **ENFORCED** | FK added in 013; a ghost user is refused |
| No cascade on either FK | **ENFORCED** | Both `RESTRICT`; both refusals tested |
| Current membership required for tenant access | **ENFORCED** | Resolved per request; out-of-band removal refused on the next call |
| Cross-tenant access hidden | **ENFORCED** | 404 for foreign and fictional alike, compared field by field; three layers (predicate, RLS, error) |
| Active workspace is not session authority | **ENFORCED ARCHITECTURALLY** | No workspace field on the actor, no column on `user_sessions`, no cookie, no server preference |
| User-scoped read path cannot write | **ENFORCED** | `FOR SELECT` policies; UPDATE affects zero rows, INSERT raises |
| Runtime role is unprivileged | **ENFORCED** | `rolsuper` and `rolbypassrls` asserted false before any other tenancy assertion |
| Tenant/user context does not leak across pooled connections | **ENFORCED** | `set_config(..., true)`; a later transaction sees nothing |
| Owner-only workspace management | **ENFORCED** | Role read from the membership row; a `reviewer` can read and cannot rename |
| CSRF on workspace mutations | **ENFORCED** | **In a running application** — through `createApp`, not a test double |
| Pre-auth credential refused | **ENFORCED** | **In a running application** — through `createApp` |
| Create rate limit | **ENFORCED** | 10/hour per user, bound in the authenticated scope, 429 asserted with `Retry-After` |
| Create idempotency | **ENFORCED** | Required header; replay, conflict, concurrency and rollback all tested against PostgreSQL |
| No hard workspace deletion | **ENFORCED** | Route audit over 8 absent paths; FKs refuse it independently |
| Workspace name absent from routine logs | **ENFORCED** | Full captured log output searched for a distinctive name |
| No tenant identifiers as metric labels | **ENFORCED** | Exact label set asserted |
| Historical evidence untouched by rename | **ENFORCED ARCHITECTURALLY** | No import path from workspace code to evidence; stable id and `created_at` asserted unchanged |
| Archive / restore | **NOT IMPLEMENTED** | No product action exists — OD-091 |
| Ownership transfer / leave | **NOT IMPLEMENTED** | BACKEND-26/27 |
| Full RBAC and permission matrix | **DOCUMENTED ONLY** | BACKEND-27. One predicate, `canManageWorkspace`, stands in |
| Invitations | **DOCUMENTED ONLY** | BACKEND-26. No table, no route, no job |
| Last-owner invariant | **DOCUMENTED + PURE FUNCTIONS** | `assertExactlyOneOwner` and `wouldOrphanWorkspace` exist and are tested; no endpoint in this command can violate the rule, and BACKEND-26/27 must call them |
| Workspace entitlements / plan limits | **NOT IMPLEMENTED** | BACKEND-50 — OD-090 |

### Honest gaps

**OD-069 narrows but does not close.** BACKEND-25 built the authenticated scope
and put four routes inside it, so for the first time a pre-auth refusal, a CSRF
rejection and a 429 are demonstrated through `createApp` rather than a test
double. The seventeen auth and account routes are still uncomposed, which means
a real browser cannot yet sign in to reach the workspace surface — the tests
issue a session directly from the service. Composing them is now wiring into an
existing scope rather than designing one.

**Six of seven workspace settings fields are unimplemented.** The settings page
will save `name` and silently do nothing with the other six until BACKEND-26,
BACKEND-27 and BACKEND-50 land. Each is listed with its owner in
WORKSPACE_PRODUCT_INVENTORY.md.

**`workspace_operations_total` collects nothing.** No exporter until BACKEND-66
— the pre-existing INSTRUMENTED_NO_EXPORTER status.

## BACKEND-26 — Workspace invitations

| Rule | Status | How |
|---|---|---|
| Invitation is not membership | **ENFORCED** | Separate table; creation writes no membership; acceptance tests |
| Canonical invitee email | **ENFORCED** | The shared `normalizeEmail`, plus a lower-case CHECK on the stored key |
| Inviter authority is current membership | **ENFORCED** | `requireWorkspaceAccess` then `canManageInvitations`, before parsing the address |
| Inviter cannot be client-supplied | **ENFORCED** | No field on the input type or the schema; 9 privileged payloads rejected |
| OWNER not invitable | **ENFORCED** | Absent from the schema union AND refused by a database CHECK |
| Raw token not persisted | **ENFORCED** | Digest-only schema; the row is scanned for the raw value |
| Raw token not returned | **ENFORCED** | Create and list responses scanned |
| Token entropy and format | **ENFORCED** | 256 bits, base64url, 43 chars, shape-validated before any lookup |
| Invitation single-use | **ENFORCED** | Conditional UPDATE plus a concurrency test on real PostgreSQL |
| Membership and consumption atomic | **ENFORCED** | One transaction; a forced insert failure leaves the invitation live |
| Duplicate membership protection | **ENFORCED** | `UNIQUE(workspace_id, user_id)`; concurrent acceptance yields one |
| One live invitation per workspace and email | **ENFORCED** | Partial unique index; expired rows superseded explicitly |
| Create is not resend | **ENFORCED** | Create refuses a live duplicate; separate operations, policies and keys |
| Resend rotates safely | **ENFORCED** | Rotation and scheduling in one transaction; failure preserves the old token |
| Account match on acceptance | **ENFORCED** | Current canonical email from the account; wrong-account and changed-email tests |
| No email-verification side effect | **ENFORCED** | `email_verified_at` asserted unchanged |
| Pre-auth MFA cannot accept | **ENFORCED** | **In a running application** — the authenticated scope refuses it |
| CSRF on every invitation mutation | **ENFORCED** | **In a running application** — through `createApp` |
| No GET consumes an invitation | **ENFORCED** | Route audit, four shapes, all 404 |
| Host-header injection | **ENFORCED BY CONSTRUCTION** | The link builder has no request parameter |
| Token lookup without RLS bypass | **ENFORCED** | `FOR SELECT` on a UNIQUE column; predicate-free SELECT returns 1, UPDATE affects 0 |
| Management tenant isolation | **ENFORCED** | Scoped repository plus `tenant_isolation`; cross-tenant read tested |
| No session rotation after acceptance | **ENFORCED** | Same cookie, workspace unreachable before and reachable after |
| Invitation history not erasable | **ENFORCED** | No `DELETE` grant on the table |
| Create and resend rate limits | **PARTIALLY ENFORCED** | Four policies defined, validated at startup, bound in the handlers; no dedicated 429 test — INVITATION_TEST_MATRIX.md records them as N/A |
| No email or token in logs and metrics | **ENFORCED BY CONSTRUCTION** | Event builders take IDs only; metric labels are a closed union. No grep-the-log test as the workspace suite has |
| Delivery | **BLOCKED** | The seam is inside the transaction; no notification infrastructure (OD-003). A production invitee cannot receive a link |
| Member removal, role change, ownership transfer | **NOT IMPLEMENTED** | BACKEND-27 |
| Full RBAC and permission matrix | **DOCUMENTED ONLY** | BACKEND-27. Two predicates stand in: `canManageInvitations`, `canGrantRole` |
| Last-owner invariant | **DOCUMENTED, WITH PURE FUNCTIONS** | Still no caller; no BACKEND-26 endpoint can violate it |

### Honest gaps

**Delivery is blocked, and that is the headline.** Everything above describes a
lifecycle nobody can currently enter, because no email is sent. The scheduling
call sits inside the transaction so that the moment a scheduler exists, a
failure to enqueue rolls the invitation back rather than stranding it — but
today the seam is absent and a created invitation is a row in a list.

**OD-069 is unchanged.** The invitation routes are inside the authenticated
scope BACKEND-25 built, so their CSRF and pre-auth behaviour is demonstrated
through `createApp`. The seventeen auth and account routes are still uncomposed,
so a browser cannot sign in to reach any of it.

## BACKEND-27 — Roles and permissions

| Rule | Status | How |
|---|---|---|
| Central role-to-capability mapping | **ENFORCED** | One frozen total `Record` in `@lagda/core`; 70 exhaustive assertions written independently of it |
| No route role checks | **ENFORCED** | Static architecture guard over every package, plus a route-specific guard |
| Default-deny capability policy | **ENFORCED** | Unknown role and unknown capability both tested |
| Role-grant policy separate from capability | **ENFORCED** | 49 exhaustive assertions |
| Nobody may grant OWNER | **ENFORCED** | Four independent layers, two of them in the database |
| Self-promotion impossible | **ENFORCED** | Tested from every role |
| Last-owner protection | **ENFORCED** | Transactional count; two PostgreSQL concurrency tests |
| Actor authority read inside the mutation transaction | **ENFORCED** | TOCTOU test: demoted actor's next write fails |
| Current membership is the authority | **ENFORCED** | Role change and removal both take effect on the next call |
| No role in the login session | **ENFORCED** | Architecture test over the actor contract |
| No per-member permission column | **ENFORCED** | Architecture test over the schema |
| No external policy engine | **ENFORCED** | Architecture test over dependencies |
| Capability list defined once | **ENFORCED** | Contracts and core compared by test |
| Capability projection cannot exceed the policy | **ENFORCED** | Tested for every role |
| Cross-tenant member administration refused | **ENFORCED** | Real membership ids from another tenant, under the runtime DB role |
| System actor separate from human roles | **ENFORCED ARCHITECTURALLY** | Architecture test; worker context unchanged |
| Member removal does not touch account or sessions | **ENFORCED** | Integration |
| CSRF and pre-auth on member routes | **ENFORCED BY COMPOSITION** | The authenticated scope enforces both for every route in it — proved by the workspace and invitation suites through the same factory. The member routes have no dedicated assertions |
| Denial telemetry free of PII | **ENFORCED BY CONSTRUCTION** | Event builders take ids and roles; metric labels are a closed union |
| Ownership transfer | **NOT IMPLEMENTED** | OD-101 — the product control says "demonstration only" |
| Leave workspace | **NOT IMPLEMENTED** | No control exists — OD-102 |
| Suspend / deactivate member | **NOT IMPLEMENTED** | A membership status model — OD-103 |
| Custom roles | **DOCUMENTED ONLY** | Migration path in AUTHORIZATION_ARCHITECTURE.md §11 — OD-105 |
| Future document / contact / billing permissions | **DOCUMENTED ONLY** | Catalogued in the product inventory; added by the commands that build the operations |

### Honest gaps

**Ownership never moves.** Nobody may grant `owner`, the owner cannot be demoted
or removed, and transfer is deferred. Coherent, and a real product limitation —
the product already tells users to transfer ownership before closing an account.

**Member-route CSRF and pre-auth are structural rather than asserted.** They
hold because of where the routes live, and the scope is tested elsewhere. A
dedicated member-route suite would close the gap.

## Contacts (BACKEND-28)

| Control | Status | Evidence |
|---|---|---|
| Tenant isolation on `contacts` | **ENFORCED** | `tenant_isolation` + FORCE RLS; cross-tenant read, update, archive and a raw INSERT all probed as the runtime role |
| Scoped repository, no workspace parameter | **ENFORCED** | Architecture test over the port |
| A contact is never an identity | **ENFORCED** | Schema has no linking column; the use-case module reaches no identity repository; behavioural test with a real member's email |
| Contact key unassignable to account key | **ENFORCED AT COMPILE TIME** | Distinct brands; `expectTypeOf` |
| Comparison key never leaves the backend | **ENFORCED** | Response key set pinned by test |
| No delete, at the database | **ENFORCED** | No DELETE grant; a raw `DELETE` as `lagda_app` is refused; `information_schema` asserted |
| No delete, in code | **ENFORCED** | Architecture guard over repository, ports and routes |
| State derived, not stored | **ENFORCED** | No `status` column; the epoch-0 case is tested |
| Duplicates warned, never refused | **ENFORCED** | No unique index (asserted); two active contacts share an address in integration |
| Capability gate on all six routes | **ENFORCED** | Four capabilities; 7 x 14 exhaustive matrix; every role probed through the use case, reviewer through HTTP |
| Contact capabilities travel together | **ENFORCED** | Architecture test - every role holds 0 or 4 |
| No role comparison in contact code | **ENFORCED** | The BACKEND-27 guard, unchanged |
| Actor authority re-read inside the transaction | **ENFORCED** | Demotion mid-request refused |
| Hidden 404 on denial | **ENFORCED** | Route test - reviewer and non-member both 404 |
| Anonymous refusal on all six routes | **ENFORCED** | Route test through the real `createApp` |
| CSRF on mutations | **ENFORCED** | Route test through the real `createApp` |
| Pre-auth refusal | **ENFORCED BY COMPOSITION** | The scope hook covers every route in it, proved by the workspace and invitation suites through the same factory. No dedicated contact assertion |
| Closed request schemas | **ENFORCED** | `additionalProperties: false`; `workspaceId`, `userId`, `state` and `contactId` are all rejected with 422 |
| Bounded pagination and closed sort whitelist | **ENFORCED** | Schema bounds; an unknown sort field is 422 |
| LIKE metacharacters escaped | **ENFORCED** | Probed against PostgreSQL |
| Conditional mutations | **ENFORCED** | Three `...IfActive` / `...IfArchived` methods; double-archive and premature restore both refused |
| No PII in logs | **ENFORCED** | Architecture guard over log payloads, plus a serialized real log line |
| No PII in metric labels | **ENFORCED** | Architecture guard pins the label set |
| `no-store` on every response | **ENFORCED** | Route test plus an architecture guard counting handlers |
| No new RLS bypass or transaction scope | **ENFORCED** | Architecture guard |
| Contact edits cannot rewrite signing evidence | **ENFORCED BY ABSENCE** | Nothing references `contacts`; the requirement is specified for BACKEND-30 rather than tested against nothing |
| Rate limiting on contact writes | **NOT APPLIED** | No outbound-email surface and no unbounded write path today. Stated, not implied |
| Data-subject erasure | **NOT IMPLEMENTED** | OD-110 - the highest-priority gap this command leaves |
| Merge duplicates | **NOT IMPLEMENTED** | The product's action is `merge-demonstration` - OD-111 |
| CSV import / bulk create | **NOT IMPLEMENTED** | OD-112 |
| Personal vs workspace scope | **NOT IMPLEMENTED** | A second ownership axis - OD-107 |
| Usage tracking, recent/frequent views | **NOT IMPLEMENTED** | Nothing writes them until recipients exist - OD-108 |
| `invalid` / `restricted` status | **NOT IMPLEMENTED** | No operation sets either - OD-109 |

### Honest gaps

**There is no way to erase a contact.** Archiving is a timestamp and the runtime
role cannot delete. LAGDA holds personal data about people who are not its
users, did not consent, and do not know the record exists. A Data Privacy Act
erasure request would reach the workspace as controller, who would find that
archiving is the strongest thing their software can do. OD-110.

**Contact writes are unlimited.** Member-only and no outbound email, so the
abuse surface that made invitation limits necessary does not exist here - but a
runaway client can still insert without bound, and nothing stops it.

**Pre-auth refusal is structural rather than asserted** on these routes, the
same label BACKEND-27 used for member routes.

## Documents (BACKEND-29)

| Control | Status | Evidence |
|---|---|---|
| DocumentId != ArtifactId | **ENFORCED** | Separate tables and ids; types, schema and tests |
| Accepted artifact only | **ENFORCED** | Only `processUpload` writes an `original`; no storage path in the domain |
| Cross-workspace artifact link | **ENFORCED** | Compound FK, probed as the runtime role |
| One ORIGINAL per document | **ENFORCED** | Partial unique index, probed |
| Original artifact immutable | **ENFORCED** | Whole artifact row compared before/after a rename; three import guards |
| Client storage metadata rejected | **ENFORCED** | One-property schemas; ten forbidden properties each 422 |
| Document capabilities | **ENFORCED** | 7 x 17 matrix; view six roles, write four; no write-without-view |
| No role comparison in document code | **ENFORCED** | The BACKEND-27 guard, unchanged |
| No PDF imports | **ENFORCED** | Architecture guard over every domain file |
| No storage client imports | **ENFORCED** | Same |
| Sealer never invoked | **ENFORCED** | Same |
| Tenant isolation | **ENFORCED** | RLS + FORCE + scoped repository; cross-tenant read/list/rename probed |
| No RLS bypass or new transaction scope | **ENFORCED** | Architecture guard |
| Hidden 404 on denial | **ENFORCED** | Route test - reviewer and non-member both 404 |
| Anonymous refusal | **ENFORCED** | All four routes through the real `createApp` |
| CSRF on mutations | **ENFORCED** | Both mutations through the real `createApp` |
| Pre-auth refusal | **ENFORCED BY COMPOSITION** | The scope hook covers every route in it; no dedicated document assertion |
| Document/signing lifecycle separation | **ENFORCED** | No status column; a guard fails on any signing-status literal |
| No delete, at the database | **ENFORCED** | No DELETE grant; raw DELETE refused; `information_schema` asserted |
| No cascade to artifacts | **ENFORCED** | RESTRICT everywhere; guard asserts no CASCADE or SET NULL |
| Page count server-observed | **ENFORCED** | Persisted from the upload inspection; CHECK `> 0` |
| No PII in logs or metric labels | **ENFORCED** | Two guards plus a live serialized-log assertion |
| `no-store` on every response | **ENFORCED** | Route test plus a handler-count guard |
| Deletion preserves evidence | **PARTIALLY ENFORCED** | Nothing can be deleted today. The SigningRequest and evidence references that make this fully testable arrive with BACKEND-32 |
| Document metadata cannot rewrite evidence | **ENFORCED BY ABSENCE** | Nothing references a document's title yet; the requirement is specified for BACKEND-32 |
| Idempotency on create | **NOT APPLIED** | Document-first inverts the risk; the artifact claim is protected by a DB constraint. Stated, not implied |
| Rate limiting on document writes | **NOT APPLIED** | The expensive limiter stays on upload; creation writes one row |
| Download / archive / delete / search | **NOT IMPLEMENTED** | None exists in the product - OD-113..116 |
| Data-subject erasure | **NOT IMPLEMENTED** | OD-119, and harder than the contact case |

### Honest gaps

**There is no way to erase a document**, and unlike contacts the two purposes
genuinely conflict: the content is both personal data and the evidence a
signature attests to. OD-119.

**Listing is N+1** - one artifact lookup per row, bounded by `perPage <= 100`.
OD-120.

**A document can exist with no bytes indefinitely** if an upload is abandoned or
rejected. Nothing cleans it up. OD-117.

## Document preparation (BACKEND-30)

| Control | Status | Evidence |
|---|---|---|
| Original artifact immutable during preparation | **ENFORCED** | Whole artifact row compared before/after; three import guards |
| No prepared artifact produced | **ENFORCED** | Architecture guard; use-case assertion |
| DocumentSealer never invoked | **ENFORCED** | Static import and call check over every domain file |
| No PDF library outside the approved boundary | **ENFORCED** | Architecture guard |
| No storage client, no artifact write | **ENFORCED** | Architecture guard |
| Canonical coordinate model | **ENFORCED** | BACKEND-09's model reused; a guard fails on a second origin, unit or page convention |
| Field within page bounds | **ENFORCED** | Domain rule, request schema AND database CHECK - possible because coordinates are normalized |
| NaN / Infinity rejected | **ENFORCED** | Explicit finite check first in the domain; the CHECK catches them too |
| 1-based page numbers, page 0 refused | **ENFORCED** | Schema, domain and CHECK |
| Page ceiling from server-inspected metadata | **ENFORCED** | `document_artifacts.page_count`; no schema accepts one |
| Rotated pages refused | **ENFORCED** | Inspector records it; `canPlaceFields` refuses rotated AND unknown |
| Every field type renderable | **ENFORCED** | `renderTypeFor` total onto `SealableFieldType`, asserted |
| Unknown field type rejected | **ENFORCED** | Closed union, 422, and a database CHECK |
| No submitted signer value stored | **ENFORCED** | No column; the API rejects `value`/`signatureValue`/`signedAt` with 422 |
| No generic configuration bag | **ENFORCED** | Architecture guard over the migration |
| Preparation tenant scope | **ENFORCED** | Scoped repository, RLS + FORCE, compound FKs to document/artifact/preparation |
| Cross-tenant preparation or artifact target | **ENFORCED BY THE DATABASE** | Probed as the runtime role |
| One preparation per document | **ENFORCED** | Unique constraint; real concurrent inserts converge |
| DOCUMENT_PREPARE authorization | **ENFORCED** | Central capability tests; no prepare without view |
| Editability checked inside the write | **ENFORCED** | Single claiming UPDATE; locked row probed |
| Stale layout save refused | **ENFORCED** | `expectedRevision` in the same UPDATE; 409 at the route |
| Layout save atomicity | **ENFORCED** | Integration: a CHECK violation mid-batch leaves the previous layout intact |
| CSRF on save | **ENFORCED** | Route test through the real `createApp` |
| Anonymous refused | **ENFORCED** | Both routes, real app |
| Pre-auth refusal | **ENFORCED BY COMPOSITION** | The scope hook; no dedicated preparation assertion |
| No layout, label or coordinate in telemetry | **ENFORCED** | Two guards plus a live serialized-log assertion; reads unlogged |
| Metric labels bounded | **ENFORCED** | Guard pins the label set; field count deliberately excluded |
| No signing evidence written | **ENFORCED** | Architecture guard |
| Document/signing lifecycle separation | **ENFORCED ARCHITECTURALLY** | No signing column; guard on signing-status literals |
| Historical signing snapshot independence | **DOCUMENTED / FUTURE ENFORCEMENT** | PREPARATION_EDITABILITY.md specifies it for BACKEND-32; nothing outside the domain reads preparation yet |
| Recipient assignment validation | **ENFORCED (BACKEND-31)** | The slot is dropped; a three-column FK plus a use-case check against the preparation's own recipients |
| Ready/lock operation | **NOT IMPLEMENTED** | No product control - OD-125 |
| Rate limiting on layout saves | **NOT APPLIED** | Normal authenticated write; a low limit would break editor autosave (§152) |
| Frontend coordinate fixtures | **NOT APPLICABLE THIS COMMAND** | No frontend contract changed - OD-126 |

### Honest gaps

**A rotated document cannot be prepared at all.** Refused with a clear message
rather than mis-signed. OD-124, and the highest-priority gap this command
leaves.

**`locked_at` has no writer.** The seam is built and every mutation conditions
on it; BACKEND-32 adds the transition.

**The backend cannot detect a bad viewport conversion.** `0.5` looks identical
whether computed correctly or by luck. OD-126.

## Signing recipients (BACKEND-31)

| Claim | Status | Evidence |
|---|---|---|
| Recipient is a distinct identity | **ENFORCED** | Own table and brand; guard forbids account/membership calls |
| Snapshot, never refreshed | **ENFORCED** | Exactly one `uow.contacts.*` call, asserted by count |
| Recipient edit does not touch the contact | **ENFORCED** | No write path exists; guard over four write methods |
| Adding a recipient creates no contact | **ENFORCED** | Use-case assertion on the address-book count |
| Contact deletion preserves the recipient | **ENFORCED BY THE DATABASE** | `set null (source_contact_id)`; integration deletes as the owner role |
| Provenance not editable | **ENFORCED** | Explicit `RecipientUpdate`; 422 at the route |
| No recipient-to-account resolution | **ENFORCED BY TYPES** | Three mutually unassignable email brands |
| No verification, token or signature state | **ENFORCED BY ABSENCE** | Eleven forbidden identifiers, four files |
| Duplicate address refused | **ENFORCED** | Unique index; two concurrent transactions, one survives |
| Duplicate rule applies to edits | **ENFORCED** | Use case plus the index |
| Duplicate error names no address | **ENFORCED** | Message asserted |
| Same address on another document permitted | **ENFORCED** | Use case and integration |
| Cross-preparation field assignment | **ENFORCED BY THE DATABASE** | Three-column FK; probed with a sibling preparation in one workspace |
| Cross-tenant recipient, preparation or contact linkage | **ENFORCED BY THE DATABASE** | Probed as the runtime role |
| Viewer / carbon-copy cannot hold fields | **ENFORCED** | `canHoldFields`; both refused, approver accepted |
| Demotion while assigned refused | **ENFORCED** | With the count |
| Deletion while assigned refused | **ENFORCED** | RESTRICT plus an application count; fields still present after |
| Dense renumbering after deletion | **ENFORCED** | Use case |
| Reorder requires the complete list | **ENFORCED** | Partial, repeated and foreign ids all refused |
| Reorder leaves routing order alone | **ENFORCED** | Use case |
| Recipient ceiling (50) | **ENFORCED** | Domain, plus `maxItems` on the order route |
| Client-chosen id / provenance / order index | **ENFORCED** | 422 each |
| Contact id mixed with a name | **ENFORCED** | Discriminated union, `additionalProperties: false` |
| Unknown recipient type | **ENFORCED** | Closed union, 422, and a database CHECK |
| Recipient tenant scope | **ENFORCED** | Scoped repository, RLS + FORCE, compound FKs |
| DOCUMENT_PREPARE authorization | **ENFORCED** | Central capability; no new capability added |
| Anonymous refused | **ENFORCED** | All five routes, real app |
| CSRF on mutations | **ENFORCED** | Real app |
| Pre-auth refusal | **ENFORCED BY COMPOSITION** | The scope hook; no dedicated recipient assertion |
| No PII in telemetry | **ENFORCED** | Whole serialized log lines against real fixtures; reads unlogged |
| Metric labels bounded | **ENFORCED** | Guard pins the set; `recipientType` deliberately excluded |
| No signing evidence written | **ENFORCED** | Architecture guard |
| Nothing is sent | **ENFORCED BY ABSENCE** | No mailer, no queue, no provider |
| Readiness validation | **NOT IMPLEMENTED** | Belongs to the send flow - OD-127 |
| Recipient-set snapshot by a signing request | **DOCUMENTED / FUTURE** | INV-448; nothing outside the domain reads recipients yet |
| Recipient-level concurrency control | **NOT APPLIED** | Last-write-wins per field; duplicates and deletion races are handled by the database |
| Rate limiting | **NOT APPLIED** | Normal authenticated write; lists are small and capped at 50 |
| Recipient authentication | **NOT APPLICABLE** | BACKEND-34; no column exists |

### Honest gaps

**Readiness is not enforced.** A layout can be saved with required fields that
have no assignee. OD-127.

**Recipients are unversioned.** Two people editing one participant is
last-write-wins per field. The races that corrupt state - duplicates and
delete-vs-assign - are held by constraints.

**A document with no accepted bytes accepts no recipients**, because the
preparation that holds them targets an exact artifact. Correct for the product's
flow, and it means OD-124's rotated-document refusal blocks recipients too.

## Signing requests (BACKEND-32)

| Claim | Status | Evidence |
|---|---|---|
| SigningRequest snapshots coherent preparation state | **ENFORCED** | One unit of work for all reads and writes; integration atomicity test |
| Request recipients independent of preparation recipients | **ENFORCED** | New ids + eight independence tests |
| Request fields independent of preparation fields | **ENFORCED** | New ids + move/delete/reassign tests |
| No live Contact or Preparation reconstruction on read | **ENFORCED** | Positional architecture guard over the read function; no contact reference anywhere in the module |
| Cross-request field assignment | **ENFORCED BY THE DATABASE** | Three-column FK; probed with two requests in one workspace |
| Cross-tenant document, artifact or preparation reference | **ENFORCED BY THE DATABASE** | Probed as the runtime role |
| Exact source artifact captured | **ENFORCED** | Resolved from the preparation; no input field |
| Document title snapshotted | **ENFORCED** | Rename test |
| Client cannot author the snapshot | **ENFORCED** | Empty closed body; twelve 422 cases |
| Client cannot choose the state | **ENFORCED** | 422, plus a CHECK admitting only `draft` |
| Snapshot rows immutable | **ENFORCED BY PRIVILEGE** | No UPDATE grant; attempted write returns permission denied |
| Request row updatable, for BACKEND-33 | **ENFORCED** | Grant asserted present |
| Readiness gate before any write | **ENFORCED** | Seven blockers; nothing written on failure |
| Blockers carry indexes, not names | **ENFORCED** | Asserted against real PII fixtures |
| Create idempotency | **ENFORCED** | Required key; concurrent same-key produces exactly one request |
| Replay after preparation edit | **ENFORCED** | The T0-T3 sequence is a test |
| No send or access side effects | **ENFORCED** | No provider, mailer, queue, PDF or sealer; guarded across six files |
| No signing evidence written | **ENFORCED** | Architecture guard + unit assertion |
| No storage write | **ENFORCED BY ABSENCE** | No storage import |
| SIGNING_REQUEST_CREATE authorization | **ENFORCED** | Central capability; 20 x 7 exhaustive matrix |
| SIGNING_REQUEST_VIEW authorization | **ENFORCED** | Auditor may read, not create |
| Request tenant scope | **ENFORCED** | Scoped repository, RLS + FORCE, compound FKs |
| Anonymous refused | **ENFORCED** | Both routes, real app |
| CSRF on creation | **ENFORCED** | Real app |
| MFA pre-auth refusal | **ENFORCED BY COMPOSITION** | The scope hook; no dedicated signing-request assertion |
| No PII in telemetry | **ENFORCED** | Whole serialized line, real fixtures; reads unlogged |
| Metric labels bounded | **ENFORCED** | Guard pins the set; counts deliberately excluded |
| Future request state transitions | **DOCUMENTED ONLY** | BACKEND-33 / 37; the CHECK admits one value and the UPDATE grant is the seam |
| Snapshot digest | **NOT IMPLEMENTED** | No consumer - deferred to evidence |
| Archived-document rejection | **NOT APPLICABLE** | BACKEND-29 has no archive state to reject |
| Rate limiting | **NOT APPLIED** | Normal authenticated write with no external work |
| Request list | **NOT IMPLEMENTED** | No product surface - BACKEND-49 |
| Delete or cancel before send | **NOT IN PRODUCT** | No affordance exists |

### Honest gaps

**Nothing calls these routes.** There is no frontend send flow. The surface is
correct and unexercised by a real client.

**Readiness is coarse.** Whether an approver needs a field, and whether routing
must be contiguous, are product questions BACKEND-37 must answer.

**A rotated source blocks creation**, because it blocks preparation (OD-124).

## Signing request send (BACKEND-33)

| Claim | Status | Evidence |
|---|---|---|
| Send snapshot-only source | **ENFORCED** | Module-path architecture guard; four independence tests |
| DRAFT to SENT transition | **ENFORCED** | Conditional UPDATE; concurrent transition probed |
| `sent_at` agrees with state | **ENFORCED BY THE DATABASE** | CHECK constraint, probed |
| Only two request states exist | **ENFORCED** | Widened CHECK; a third value refused |
| Already sent, new key | **ENFORCED** | 409, and counts unchanged |
| Send idempotency | **ENFORCED** | Required key; replay mints nothing |
| Atomic grants + intents + state | **ENFORCED** | Multi-recipient partial-failure rollback test |
| Transition is LAST | **ENFORCED** | Positional architecture guard |
| Raw credential not persisted in the grant | **ENFORCED** | Digest-only column with a shape CHECK; the assertion caught a bad test double |
| Raw credential recoverable for delivery | **ENFORCED** | AES-256-GCM sealed intent; `v1.` format asserted in integration |
| No key means no send | **ENFORCED** | Sealer throws before the transition; request stays draft |
| Cross-request access grants | **ENFORCED BY THE DATABASE** | Three-column FK, probed |
| One active grant per recipient | **ENFORCED BY THE DATABASE** | Partial unique index, probed; reissue after revoke permitted |
| One delivery intent per grant | **ENFORCED BY THE DATABASE** | Unique constraint, probed |
| Explicit credential expiry | **ENFORCED** | NOT NULL plus `expires_at > created_at` |
| Parallel routing activation | **ENFORCED** | Tested |
| Sequential routing activation | **ENFORCED** | First cohort only; waiting recipients hold no credential |
| Mixed routing activation | **ENFORCED** | Tested |
| Earliest cohort present, not literal 1 | **ENFORCED** | Tested |
| Client cannot choose active recipients | **ENFORCED** | Empty closed body |
| SIGNING_REQUEST_SEND authorization | **ENFORCED** | Central capability; 21 x 7 exhaustive matrix |
| Current-membership authorization | **ENFORCED** | Read inside the transaction; removed-member test |
| Outbound abuse limits | **ENFORCED** | Two fail-closed policies, checked before credential generation |
| CSRF on send | **ENFORCED BY COMPOSITION** | Registered inside the authenticated scope |
| MFA pre-auth refusal | **ENFORCED BY COMPOSITION** | The scope hook, tested centrally |
| Canonical link base | **ENFORCED** | The builder takes no request |
| No URL persisted or logged | **ENFORCED** | Only the token is sealed; guards on both |
| No PII in send telemetry | **ENFORCED** | Payload-scoped guard |
| Metric labels bounded | **ENFORCED** | Three-value routing shape only |
| RLS on activation, grants, intents | **ENFORCED** | FORCE asserted from `pg_class`; runtime role has no BYPASSRLS |
| No signing ceremony or sealing | **ENFORCED BY ABSENCE** | Guarded across seven files |
| Provider delivery | **PARTIALLY ENFORCED - DURABLE INTENT ONLY** | The intent is durable and discoverable. No provider, no renderer, no worker. BACKEND-45 |
| Provider retry reuses the credential | **ENFORCED STRUCTURALLY** | Made unrepresentable by two constraints; no worker exists to exercise it |
| Provider outage does not revert SENT | **ENFORCED BY CONSTRUCTION** | No provider is called at all. Re-assert in BACKEND-45 |
| Recipient authentication | **DOCUMENTED ONLY** | BACKEND-34 |
| Cross-tenant send via the API | **PARTIALLY ENFORCED** | The membership control is proven in the use case and RLS is proven per table; there is no end-to-end route assertion |
| Send route HTTP contract | **PARTIALLY ENFORCED** | Schema and behaviour covered by inspection and by call; no `createApp` route suite |
| Resend / cancel / void | **NOT IMPLEMENTED** | Not in the product - OD-136, OD-137 |
| CC and viewer delivery | **NOT IMPLEMENTED** | They need a view credential that does not exist - OD-135 |

### Honest gaps

**Nothing is transmitted.** DURABLE INTENT ONLY, and the report says so rather
than implying delivery works.

**No HTTP route suite for send**, and no end-to-end cross-tenant assertion. Both
are missing assertions rather than missing controls.

**Viewers receive nothing at all** - not even a notification that a document
exists.

## Recipient signing access (BACKEND-34)

| Claim | Status | Evidence |
|---|---|---|
| Signing grant digest lookup | **ENFORCED** | Narrow repository + integration |
| No broad RLS bypass | **ENFORCED BY THE DATABASE** | Unfiltered selects return 1 of 2; 0 with no setting; no BYPASSRLS |
| Credential path is read-only | **ENFORCED BY THE DATABASE** | UPDATE affects 0 rows; insert before `enterWorkspace` violates policy |
| Cannot enumerate grants, requests, recipients or activations | **ENFORCED** | Four count assertions |
| Cannot see another recipient of the same request | **ENFORCED** | Integration |
| Scanner-safe GET | **ENFORCED** | Architecture: POST-only exchange, no `:token` parameter |
| Recipient authentication policy | **ENFORCED** | LINK_ONLY; the use case writes one literal and a guard checks it |
| OTP attempt limits | **N/A** | No OTP. A guard asserts no challenge, verifier or counter exists |
| Fresh recipient session | **ENFORCED** | Non-equality and non-containment both ways |
| Session and CSRF credentials independent | **ENFORCED** | Two `randomBytes` draws; a CHECK refuses equal digests |
| Digest-only persistence | **ENFORCED** | Shape CHECKs; no raw value in any response |
| Request/recipient session scope | **ENFORCED BY THE DATABASE** | Three-column FK; same-email test |
| No workspace access | **ENFORCED BY COMPOSITION** | Scope registration and cookie names; no direct HTTP assertion |
| `/me` denial | **ENFORCED BY COMPOSITION** | Same |
| User session is not recipient auth | **ENFORCED BY CONSTRUCTION** | Bootstrap reads no session cookie |
| Cookie coexistence | **ENFORCED BY CONSTRUCTION** | Distinct names and resolvers |
| Recipient CSRF realm | **ENFORCED** in the service, **NOT YET AT A ROUTE** | Built and tested; no recipient mutation exists to guard |
| Session expiry | **ENFORCED** | Derived from the clock; test |
| Session revocation | **FOUNDATION_ONLY** | Column, reasons, lineage index and a repository method. Nothing calls it |
| Snapshot-only source | **ENFORCED** | Guards forbid contact and preparation imports and email lookups |
| No account matching | **ENFORCED** | Guard forbids `uow.users`, `findUser`, `UserId` |
| Authentication evidence | **PARTIAL** | The authoritative fact is persisted on the session row with method and time. BACKEND-43 owns the projection |
| Observed IP / user agent | **NOT CAPTURED** | Permitted by §89; no consumer has defined a need - OD-143 |
| No PII or credential in telemetry | **ENFORCED** | Payload-scoped guard |
| Metric labels bounded | **ENFORCED** | Guard; the failure reason deliberately excluded |
| Signing ceremony | **DOCUMENTED ONLY** | BACKEND-35 |
| Route-level HTTP contract | **NOT TESTED** | No `createApp` suite for this surface - the same gap BACKEND-33 left |

### Honest gaps

**No HTTP route suite**, so the cookie attributes, the 401 body, the rate-limit
rejection and the cross-realm denials are asserted by composition rather than
directly.

**Nothing revokes**, and **CSRF is unenforced** because there is nothing yet to
guard.

## BACKEND-35 — the signing ceremony

| Rule | Status | Evidence |
|---|---|---|
| Recipient-only ceremony scope | **ENFORCED** | repository bound at construction; 6 restrictive policies; 1-of-2 counts |
| Immutable request snapshot is the only source | **ENFORCED** | contact and preparation deletion tests; guards over six files |
| Exact source artifact | **ENFORCED** | no-parameter accessor, join from the request, restrictive policy, storage call asserted |
| Other-recipient field isolation | **ENFORCED** | 1 field of 2 in the recipient realm; the other signer's name asserted absent |
| Other-recipient PII never returned | **ENFORCED BY THE DATABASE** | 1 recipient row of 2 on the same request |
| Scanner-safe entry | **ENFORCED** | POST + session cookie + CSRF; both tables empty after a bootstrap |
| Repeated entry idempotent | **ENFORCED** | `on conflict do nothing`; asserted in both suites |
| Refused entry records nothing | **ENFORCED** | the view is built, and throws, before the write |
| Recipient CSRF realm | **PARTIALLY ENFORCED** | validator unit-tested and called; no HTTP-level cross-realm assertion |
| Explicit versioned consent | **ENFORCED** | unique constraint; backend clock; version checked against the requirement |
| Consent concurrency converges | **ENFORCED** | asserted in both suites |
| Consent text never stored | **ENFORCED** | migration guard forbids the column names |
| Append-only progress and consent | **ENFORCED BY PRIVILEGE** | no UPDATE, no DELETE; permission denied, asserted |
| No PDF mutation, no DocumentSealer | **ENFORCED** | guards over six files |
| No signature or field value persisted | **ENFORCED BY ABSENCE** | no table, no port, no path |
| No routing advancement | **ENFORCED** | asserted after entry and after consent |
| Canonical geometry unchanged | **ENFORCED** | values returned verbatim; asserted |
| Storage key secrecy | **ENFORCED** | never leaves the application layer; response shape asserted |
| Telemetry redaction | **ENFORCED** | payload-scoped and label-scoped guards |
| Restrictive policies | **ENFORCED** | `polpermissive = false` on all six, checked twice |
| No BYPASSRLS, no SUPERUSER | **ENFORCED** | asserted against `pg_roles` |
| Range request support | **NOT APPLICABLE** | no PDF viewer exists; `Accept-Ranges: none` |
| Presigned URL handling | **NOT APPLICABLE** | none is issued |
| Evidence event wiring | **DOCUMENTED ONLY** | deliberately absent; nothing in the codebase writes one |
| Recipient cannot reach workspace APIs | **PARTIALLY ENFORCED** | scope registration; no direct HTTP assertion |
| Signature submission | **DOCUMENTED ONLY** | BACKEND-36 |

### Honest gaps

Three rows above are not full PASS and the reason is the same for two of them:
there is **no HTTP route suite** for this surface, as there was none for
BACKEND-33 or BACKEND-34. The mechanisms are real and centrally tested; what is
missing is a request that exercises them end to end.

The third — evidence wiring — is absent by choice, not omission, and
CEREMONY_VIEW_EVENT.md gives the argument.

## BACKEND-36 — signature submission

| Rule | Status | Evidence |
|---|---|---|
| Field ownership | **ENFORCED** | four-column assignment FK; cross-recipient insert refused with the application bypassed |
| Cross-request field submission | **ENFORCED BY THE DATABASE** | FK has no referent |
| Submission idempotency | **ENFORCED** | BACKEND-14 framework; replay, conflict and order-insensitivity all asserted |
| One final submission per recipient | **ENFORCED** | unique constraint; concurrency test in real PostgreSQL |
| One value per field | **ENFORCED** | unique constraint |
| Immutable accepted values | **ENFORCED BY PRIVILEGE** | no UPDATE/DELETE grant; `permission denied` |
| No update/delete method exists | **ENFORCED** | port declares two methods; guard forbids the rest |
| Server-owned field values | **ENFORCED** | derived in core; client value rejected, not ignored |
| Consent revalidation | **ENFORCED** | read from the record inside the transaction |
| Signability revalidation | **ENFORCED** | five checks at commit time |
| Typed value contracts | **ENFORCED** | discriminated union + typed columns; no `any` |
| Signature bounds | **ENFORCED TWICE** | validator and database CHECK |
| PNG only, SVG refused | **ENFORCED** | magic bytes; guard forbids other media types |
| Signature asset isolation | **NOT APPLICABLE** | no object storage; bytes are row-scoped |
| Atomicity | **ENFORCED** | one transaction; no partial values |
| Backend-authoritative timestamp | **ENFORCED** | one Clock read; single column |
| Recipient CSRF realm | **PARTIALLY ENFORCED** | validator called and unit-tested; no HTTP-level test |
| No PDF mutation, no sealer | **ENFORCED** | guards over seven files |
| No routing advancement | **ENFORCED** | guarded and asserted |
| No request completion | **ENFORCED** | asserted |
| Telemetry redaction | **ENFORCED** | payload and label guards |
| Evidence event | **DOCUMENTED ONLY** | deliberately absent; OD-145 |
| IP / user agent capture | **NOT APPLICABLE** | not captured; OD-143 |
| Recipient SIGNED state | **DOCUMENTED ONLY** | BACKEND-37 |
| Routing activation / completion | **DOCUMENTED ONLY** | BACKEND-37/38 |
| `acceptedAt` reuse by BACKEND-37 | **DOCUMENTED ONLY** | nothing here can enforce a future command |
| Submission vs cancellation race | **DOCUMENTED ONLY** | narrow window; closed by BACKEND-37's lock order (OD-151) |

### Honest gaps

Four rows are DOCUMENTED ONLY because they belong to BACKEND-37, one because
evidence wiring is a cross-cutting decision, and one — recipient CSRF — because
there is still **no HTTP route suite** for the signing stack. That gap is now
four commands old and is the largest single one in this area.

## BACKEND-37 — signing workflow state

| Rule | Status | How |
|---|---|---|
| Recipient SIGNED requires a `RecipientSubmission` | **ENFORCED** | four-column FK + CHECK + transition table + tests |
| `signedAt == submission.acceptedAt` | **ENFORCED** | no clock on the path; asserted by test |
| Sequential cohort completion before advance | **ENFORCED** | routing tests, exhaustive over the shapes |
| Next cohort activates once | **ENFORCED** | conditional UPDATE on `waiting` + one-active-grant index + repeat-advance test |
| Parallel signers stay independent | **ENFORCED** | routing tests |
| Request `completion-ready` | **ENFORCED** | required-participant evaluation tests |
| Non-signing participants do not block | **ENFORCED** | per-type tests |
| Accepted submission progression recovery | **ENFORCED** | intent commits with the signature; reconciler test |
| No generic state mutation | **ENFORCED** | architecture guard over sources and routes |
| No PDF / sealer in BACKEND-37 | **ENFORCED** | architecture guard over imports |
| No PII or unbounded label in state telemetry | **ENFORCED** | architecture guard |
| Terminal request denies access | **ENFORCED** | policy + grant and session revocation |
| Recipient realm cannot touch another recipient's state | **ENFORCED** | migration 024 restrictive policy + bound repository |
| Recipient realm cannot read grants or delivery intents | **ENFORCED** | migration 024 restrictive deny |
| **Concurrent final signers converge** | **PARTIALLY ENFORCED** | conditional UPDATEs make it true; NOT proven against real PostgreSQL |
| Request `completed` | **DOCUMENTED ONLY** | BACKEND-38 |
| PDF merge, certificate, sealing | **DOCUMENTED ONLY** | BACKEND-38/39/40/41 |
| Decline and cancel HTTP surface | **NOT IMPLEMENTED** | use cases exist and are tested; no route composed |
| Evidence events for state transitions | **DOCUMENTED ONLY** | OD-145 — nothing in this codebase writes one |
