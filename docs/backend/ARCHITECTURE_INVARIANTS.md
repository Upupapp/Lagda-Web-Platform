# LAGDA Backend — Architecture Invariants

Rules every `BACKEND-XX` command checks before modifying backend code.

**Enforcement column is honest.** "Documentation" means a human or a reviewing
command must catch a violation — nothing fails automatically. This repository has
already shipped one contract that existed but was never consumed
(`RouteMeta.status`, declared on 225 routes, read by no code, drifted until three
routes misreported themselves). Invariants become executable as the packages they
govern are created; until then the column says so rather than implying safety
that does not exist.

**Current enforcement is tracked in [`ENFORCEMENT_MATRIX.md`](./ENFORCEMENT_MATRIX.md)**,
which BACKEND-01 introduced. That file is authoritative for *what executes*; this
one is authoritative for *what the rules are*.

| ID | Invariant | Enforcement today |
|---|---|---|
| **INV-001** | No PDF library import outside `packages/sealing`. | **ENFORCED** — ESLint, backend + frontend |
| **INV-002** | Only the signing-completion use case may invoke `DocumentSealer`. | Documented only → BACKEND-09 |
| **INV-003** | Workspace-owned data access must be workspace scoped at the repository boundary. | Documented only → BACKEND-06/07 |
| **INV-004** | API routes may not contain primary domain logic. | Documented only → BACKEND-11 |
| **INV-005** | `core` may not depend on infrastructure packages. | **ENFORCED** — ESLint (BACKEND-01) |
| **INV-006** | Frontend source files are not backend runtime dependencies. | **ENFORCED** — architecture test (BACKEND-01) |
| **INV-007** | Shared API/domain contracts originate from `@lagda/contracts`. | **Partially enforced** — ESLint bars infrastructure from `contracts`; origination needs BACKEND-02 |
| **INV-008** | Public API types may not expose infrastructure-library types. | Documented only → BACKEND-09/11 |
| **INV-009** | eNotary implementation is outside current scope. | Documentation + frontend disclosure tests |
| **INV-010** | Original accepted uploaded documents are immutable. | Documented only → BACKEND-05 |
| **INV-011** | Operational logs and evidence/audit records are separate concerns. | Documented only → BACKEND-11/12 |
| **INV-012** | Retry-sensitive operations must support durable idempotency. | Documented only → BACKEND-03 |
| **INV-013** | Business state transitions must be explicit and validated. | Documented only → BACKEND-07 |
| **INV-014** | Tenant isolation is tested, not assumed. | Documented only → BACKEND-07 |
| **INV-015** | Later architectural changes require an ADR or an explicit backend command. | Process |

## Additional invariants from repository inspection

These were derived from findings in
[`architecture.md` §7](./architecture.md#7-repository-findings), not from the
generic rule set.

| ID | Invariant | Why | Enforcement today |
|---|---|---|---|
| **INV-016** | `WorkspaceId` is a branded type and is used for every workspace-owned reference in `@lagda/contracts`. | The tenant key is currently a plain `string` in ~78% of its declarations (F-1). Branding it is what makes INV-003 checkable by the compiler rather than by review. | Documentation → **BACKEND-02 blocker** |
| **INV-017** | The backend redactor matches sensitive keys by substring/pattern and recurses through arrays. | The frontend redactor does neither: `resetToken` and `sessionToken` pass through, and arrays are returned unredacted (F-2). Server logs are persistent, so porting it verbatim would be worse than having none. | Documentation → unit test at BACKEND-01 |
| **INV-018** | Status transition rules are owned by `core`. Frontend `*Status` unions are vocabulary, not lifecycle authority. | 50 status unions exist with zero transition tables (F-3). There is no state machine to port. | Documentation → `core` |
| **INV-019** | No invariant may be recorded here without an enforcement plan naming the command that makes it executable. | Prevents this file becoming the next `RouteMeta.status` (F-4). | This table's enforcement column |
| **INV-020** | No package dependency cycles, and `package.json` workspace dependencies must agree with TypeScript project references. | The graph is declared in two places. If they drift, `tsc --build` orders packages by one graph while the code depends on the other, and a cycle makes the build order non-deterministic. Added by BACKEND-01 when the packages became real. | **ENFORCED** — architecture test |
| **INV-021** | Shared contract types are DERIVED from runtime schemas (`Static<typeof XSchema>`), never declared alongside them. | A hand-written type and a hand-written validator for the same structure drift, and the drift is invisible until a request is rejected in production. ADR-002. | Documented → review |
| **INV-022** | `@lagda/contracts` stays browser-compatible: no Node built-ins, no environment reads, no side effects on import. | The frontend is a first-class consumer. A `node:crypto` import would break its build, and a side effect on import would make a contract package do something. | **PARTIALLY ENFORCED** — ESLint bars infrastructure; a browser bundle check needs the frontend to consume it (OD-005) |
| **INV-023** | Public response contracts set no field that the operation does not require, and separate public from authenticated shapes as distinct types. | Verification is unauthenticated. One shape guarded by a boolean has to be checked correctly at every call site forever; two types cannot leak into each other. | **ENFORCED for verification** — `additionalProperties: false` plus tests asserting the public schema rejects owner-only fields |
| **INV-024** | Contracts contain no non-JSON values — no `Date`, `BigInt`, `Map`, `Set`, `Buffer`, or class instances. | A `Date`-typed field describes something the wire never carries; the receiver always gets a string. Making the string the contract removes the asymmetry. | **ENFORCED for verification** — round-trip test |
| **INV-025** | A serialized status value is an API contract. Changing one is a compatibility change, not a refactor. | `pending` → `awaiting` is invisible to TypeScript and breaks every stored record and client. | Documented → review |
| **INV-026** | Every API error response uses the canonical `ApiError` envelope from `@lagda/contracts/api`. | One shape, or every client writes a parser per endpoint. | **ENFORCED for the schema** — runtime schema + tests; route adoption needs BACKEND-11 |
| **INV-027** | Clients branch on `error.code`, never on `error.message`. HTTP mapping never inspects a message either. | Copy and localization change; `message.includes("not found")` is how status mapping silently breaks. | Documented → review |
| **INV-028** | Unknown properties in mutation request bodies are rejected. | Silently stripping hides stale clients and typos, and rejecting is the cheapest defence against mass assignment. | **ENFORCED** — `additionalProperties: false` + tests |
| **INV-029** | List sort keys are closed typed unions per endpoint, never free strings. | A free sort key reaching a repository becomes `ORDER BY ${input}`. | **ENFORCED** — `sortSchema()` + test rejecting `id; DROP TABLE documents` |
| **INV-030** | API timestamps are RFC 3339 UTC strings, never `Date` objects. | `JSON.stringify` produces a string, so a `Date`-typed field describes something the wire never carries. | **ENFORCED for extracted contracts** — pattern + tests |
| **INV-031** | Request and response contracts stay distinct types where server-owned or write-only fields exist. | Structural reuse is how `createdAt` becomes settable and a password reaches a response. | Documented → review |
| **INV-032** | Route handlers map domain results into declared response contracts. A persistence row is never serialized directly. | It is how persistence-only and secret fields leak. | Documented → BACKEND-11 |
| **INV-033** | Core never reads the current time. Time-dependent rules take `now` as a parameter. | A hidden clock read makes expiry logic untestable without stubbing globals, and non-reproducible across dates. | **ENFORCED** — purity test |
| **INV-034** | Core never generates identifiers, tokens, or randomness. | Identity comes from the application layer; a domain that invents IDs cannot be replayed. | **ENFORCED** — purity test |
| **INV-035** | Lifecycle state changes go through named actions. No generic `setStatus`/`setState`/`setWorkspaceId`. | A generic setter makes the transition table decorative — every invariant becomes bypassable in one line. | **ENFORCED** — purity test |
| **INV-036** | Terminal signing states never transition back to an active state. | A completed transaction is legally significant history. Corrections create a new transaction. | **ENFORCED** — every terminal state × every action |
| **INV-037** | The frontend does not depend on `@lagda/core`. | Core is backend-only. Shared needs belong in `@lagda/contracts`. | Documented → review |
| **INV-038** | Domain events and errors carry no infrastructure concerns — no HTTP status, log level, severity, queue name, or delivery detail. | Core must not decide how a failure is presented or recorded. | **ENFORCED for errors** — `DomainError` has no such fields |
| **INV-039** | Application use cases may not import concrete infrastructure, including LAGDA's own `@lagda/db`, `@lagda/storage` and `@lagda/sealing`. | Those packages implement application's ports; importing them inverts the dependency and creates a cycle. Only composition roots import both sides. | **ENFORCED** — ESLint |
| **INV-040** | Workspace-owned repository ports require workspace scope in their signature. | Tenant isolation must not depend on a caller remembering to filter. A method resolving a member from any workspace is a cross-tenant read waiting to happen. | **ENFORCED by port shape** — no unscoped lookup exists |
| **INV-041** | Application business time comes from `Clock`; generated entity IDs come from explicit generators. | Hidden `Date.now()` or `randomUUID()` makes a use case untestable and non-reproducible. | **ENFORCED** — tests assert both |
| **INV-042** | Application errors contain no HTTP status codes, headers, or log levels. | One use case must serve an HTTP route, a worker, and a future partner API. | **ENFORCED** — test asserts no status property |
| **INV-043** | Use cases receive resolved actor context, never raw HTTP, session, cookie, or token objects. | A worker must be able to invoke the same use case without fabricating a request. A token in an actor object reaches logs. | Documented → review |
| **INV-044** | A tenant-scoped lookup for another workspace's resource is indistinguishable from one that does not exist. | Distinguishing them confirms the existence of another tenant's data to anyone who can guess an ID. | **ENFORCED** — anti-enumeration test |
| **INV-045** | External side effects are not treated as durable simply because a transaction committed. | Publishing before commit describes state that may not exist; after commit without an outbox, the event is lost if the process dies. | Documented → BACKEND-06/16 |
| **INV-046** | Database access is confined to `@lagda/db`. Kysely, `pg` and row types never appear elsewhere. | The query layer is an implementation choice, not part of the domain. Application must survive replacing it. | **ENFORCED** — ESLint |
| **INV-047** | Workspace-owned relationships preserve tenant identity at the DATABASE level via compound keys where practical. RLS, if adopted, is defence in depth and never the only boundary. | A child FK referencing only a parent ID lets a row in workspace A reference a parent in workspace B, with nothing but application code preventing it. | **PARTIALLY ENFORCED** — the compound-key target exists; referencing tables arrive in BACKEND-07 |
| **INV-048** | Source-controlled migrations are the sole schema-change mechanism, and applied migrations are immutable. | Manual production changes are drift with no audit trail. Editing an applied migration makes history unreproducible. | **ENFORCED** — CI migrates from zero |
| **INV-049** | Business-significant timestamps are persisted explicitly from the application `Clock`, distinct from technical row timestamps. | Two clocks for one business event is a contradiction discovered later, in evidence. | Documented → review |
| **INV-050** | Uploaded document bytes are not stored in PostgreSQL. The database holds metadata, references and hashes. | Binaries in a transactional database wreck backup, replication and restore time. Changing it needs an ADR. | Documented → BACKEND-17 |
| **INV-051** | SQL values are always parameterized; dynamic identifiers come from code-level whitelists. | The shortest path from a query parameter to SQL injection. | Documented → review |
| **INV-052** | Database integration tests use real PostgreSQL, and must not mutate schema. | SQLite would not exercise timestamptz, compound constraints or SQLSTATE. TRUNCATE clears rows but not DDL, so a schema-mutating test leaks a broken schema into later runs. | **ENFORCED** — real PostgreSQL in CI |
| **INV-053** | Database error classification uses SQLSTATE, never message text. | `message.includes("duplicate key")` breaks on an upgrade or a non-English locale, silently. | **ENFORCED** — SQLSTATE helpers, tested |
| **INV-054** | Every workspace-owned repository method requires workspace scope AND the transaction context. No optional tenant parameter, no `skipTenantCheck`, no bypass flag. | Optional tenancy defeats the invariant, and a bypass flag becomes the security trap everyone reaches for. Reads take the transaction because RLS context is transaction-local. | **ENFORCED** — port shape + RLS |
| **INV-055** | Tenant context is transaction-local (`SET LOCAL`), established in exactly one place, and never session-level. | A session-level setting rides a pooled connection into the next request — a silent, intermittent, load-dependent cross-tenant read. | **ENFORCED** — leak tests incl. after rollback |
| **INV-056** | Missing tenant context fails CLOSED: no rows, not all rows. | If absent context meant unrestricted, every bug that loses context becomes a full cross-tenant read. | **ENFORCED** — tested |
| **INV-057** | The runtime database role owns no tenant tables and lacks `BYPASSRLS`; tenant tables use `FORCE ROW LEVEL SECURITY`. | An owner bypasses RLS unless forced. Testing as a superuser gives false confidence while production leaks. | **ENFORCED** — asserted before every RLS test |
| **INV-058** | RLS is defence in depth and never replaces explicit repository predicates. | A query relying on an invisible policy is one nobody can review by reading it. | **ENFORCED** — both layers tested separately |
| **INV-059** | `workspace_id` is immutable for tenant-owned resources; there is no generic reassignment. | Moving a row between tenants is a privileged audited operation, not an ordinary update. | **ENFORCED** — RLS `WITH CHECK` rejects it |
| **INV-060** | A cross-tenant lookup is indistinguishable from an absent resource. | Any difference confirms the resource exists elsewhere. | **ENFORCED** — application + DB |
| **INV-061** | Adding a workspace-owned table requires updating TENANCY_MODEL.md and TENANCY_TEST_MATRIX.md, with RLS, compound FK, tenant index and cross-tenant tests. | Tenancy applied to some tables and forgotten on others is the realistic failure mode. | Process → review |
| **INV-062** | Repository ports are declared by `@lagda/application`; `@lagda/db` implements them. No row or query-library type escapes `@lagda/db`. | An interface defined in `db` and imported by `application` inverts the dependency the architecture rests on. | **ENFORCED** — ESLint + package boundaries |
| **INV-063** | Tenant-owned repositories are obtained from a unit of work and bound to one workspace. Scope is never a method parameter. | A workspace parameter makes a cross-tenant call *typeable*; binding makes it unsayable. A control depending on a runtime policy to catch a compile-time-expressible error is weaker than one where the error cannot be written. | **ENFORCED** — port shape |
| **INV-064** | A repository refuses to persist a record whose workspace differs from its scope, and never rewrites it to match. | Silently rewriting turns a programmer error into a data-corruption event, moving a record between tenants. | **ENFORCED** — contract suite, both adapters |
| **INV-065** | Every repository in one unit of work shares the same database transaction. | Independently built repositories can hold the pool while another holds the transaction — atomicity that looks correct and is not. | **ENFORCED** — rollback test against PostgreSQL |
| **INV-066** | Persistence errors are classified by SQLSTATE and constraint name, never message text; unknown errors pass through untranslated. | Message parsing breaks on an upgrade or locale. Downgrading an unknown error to "conflict" or "not found" tells a caller data is absent when the database is unreachable. | **ENFORCED** — tested |
| **INV-067** | State-sensitive writes use conditional updates rather than read-then-write. | Two concurrent readers of the same value both write, and the second silently overwrites the first. | **ENFORCED** — stale-writer test |
| **INV-068** | Repositories persist and retrieve only. No email, queue, webhook, sealing or audit side effects. | Hidden side effects make every caller's behaviour unpredictable. | Documented → review |
| **INV-069** | The repository behavioural contract runs against both the in-memory fake and PostgreSQL. | Divergence means either the fake is lying to application tests or the adapter is wrong. Only the PostgreSQL run is security proof. | **ENFORCED** — both suites |
| **INV-070** | `DocumentSealer` exposes exactly ONE operation, `seal()`. Merging, hashing and certificate rendering stay private to `@lagda/sealing`. | Every extra method is a call site a future remote signing service must reproduce. A seam becomes a rewrite when twenty callers each learned a different piece of it. | **ENFORCED** — method count asserted; probed |
| **INV-071** | `DocumentSealer` is declared in exactly one file, and no second copy exists in any package. | Two definitions typecheck, drift, and give the two layers different contracts. | **ENFORCED** — exact-path assertion |
| **INV-072** | Document bytes cross the seam as `Uint8Array`, never Node's `Buffer`. | `Buffer` is Node-only; a signing service in another runtime could not satisfy a contract demanding one. | **ENFORCED** — asserted on comment-stripped source; probed |
| **INV-073** | The final artifact's digest is computed AFTER every byte-changing step, from the exact bytes returned. | A digest taken from an intermediate buffer fails against the document people actually hold, and fails silently — both values look like valid digests. | **ENFORCED** — compared against an independently computed digest |
| **INV-074** | Hashes are named for the artifact they identify (`preparedDocumentHash`, `signedDocumentHash`). Never one field or column called `hash`. | An ambiguous name survives exactly as long as one person remembers which artifact it meant. | Documented → review (see OD-022: `Sha256Digest` is unbranded, so the two are mutually assignable) |
| **INV-075** | The sealer never mutates the caller's document buffer. | pdf-lib may write through the array it is given; the caller still needs those bytes to match the recorded digest. | **ENFORCED** — byte-equality test |
| **INV-076** | Every sealed artifact records `sealScheme`, `sealVersion` and `digestAlgorithm` from the first record written. | Retrofitting is impossible — the information is gone. A second scheme makes every earlier artifact ambiguous. | **ENFORCED** — exact metadata assertion |
| **INV-077** | The completion certificate is a SEPARATE artifact, never appended to the sealed document. | Appending changes the signed document's page count, so the file delivered is no longer the file participants signed. Handoff §15 stores them separately. | **ENFORCED** — page-count and inequality tests |
| **INV-078** | The sealer reads no clock, no randomness and no environment. `sealedAt` and `verificationId` are inputs. | A hidden clock makes output non-reproducible, and a sealer that mints verification IDs hands LAGDA's identifier namespace to a future third-party service. | **ENFORCED** — source scan on comment-stripped source |
| **INV-079** | No pdf-lib error, message or type reaches a caller. Failures are LAGDA-owned types with a stable `code` and an explicit `retryable`. | A caller that must understand pdf-lib's exceptions could not be satisfied by a Java or .NET signer. `retryable` is what stops the pipeline retrying a permanently malformed document forever. | **ENFORCED** — tested, including the raw `TypeError` path |
| **INV-080** | SHA-256 hashing happens in exactly one file. | Several implementations across layers is how one ends up base64 and another hex, and a verification comparison silently never matches. | **ENFORCED** — exact-path assertion on `node:crypto` imports |
| **INV-081** | The PDF coordinate flip happens in exactly one function. | A miscomputed rectangle does not crash — it places a signature in the wrong half of a structurally valid page. | **ENFORCED** — three boundary tests on `toPdfRect` |
| **INV-082** | Sealing is never invoked inside a database transaction. | It is slow, external, and cannot be rolled back when the commit later fails. | Documented → review (no consumer exists yet) |
| **INV-083** | Every architectural boundary test is verified by deliberately violating it, including a negative control proving the permitted case still passes. | A boundary test that cannot fail proves nothing. This command's probes exposed two dead detectors and four dead lint rules. | **ENFORCED** — by process; probe results recorded in SEALING_TEST_MATRIX.md |

## Rules for future `BACKEND-XX` commands

1. Read this file and the applicable ADRs before changing backend code.
2. Preserve package boundaries.
3. Report — do not silently proceed — if the requested task would violate an
   invariant.
4. Modify an invariant only when explicitly instructed, and record the change in
   an ADR.
5. Add or update tests for any architectural behaviour touched.
6. Avoid opportunistic unrelated refactors.
7. When an invariant's enforcement column says "Documentation", and the command
   creates the package that governs it, **make it executable in that command**.
