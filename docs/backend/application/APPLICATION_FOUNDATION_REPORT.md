# Application Foundation Report — BACKEND-05

## 1. What was built

`@lagda/application` with 7 ports, 5 error types, 3 actor kinds, and **two representative use cases** — `CreateWorkspace` (command) and `GetWorkspaceMember` (query). Both are **FOUNDATION_IMPLEMENTED**, not feature-complete; BACKEND-25 owns the workspace feature.

They were chosen because they need no storage, PDF, email or authentication, so they prove the orchestration pattern without consuming a later command's scope: input validation → clock → ID generation → domain invariant → two writes in one transaction → typed result, and a tenant-scoped read with anti-enumeration behaviour.

**Zero new external production dependencies.**

## 2. The port discipline that shaped this command

§166 forbids ports with no consumer; §148 asked to fix `DocumentSealer` ownership now. Resolved by creating **only** ports with consumers, plus `DocumentSealer` with its lack of consumer stated explicitly — a port's whole purpose is inverting a dependency before the implementation exists.

Eight ports were **deliberately not created**: `ObjectStorage`, `MalwareScanner`, `NotificationPublisher`, `PasswordHasher`, `TokenGenerator`, `BackgroundWorkScheduler`, `EvidenceRepository`, `AuthorizationService`. All are genuinely needed later; none has a consumer today. Creating them now reproduces exactly the decorative architecture this repository has already shipped once.

## 3. Risks discovered

**R-1 — Durable follow-up is unsolved, and nothing pretends otherwise.**
Publishing an event before commit tells the world about state that may not exist; publishing after commit with no outbox drops it if the process dies in between. `CreateWorkspace` therefore publishes nothing, with the reason in a comment rather than a silent omission. **BACKEND-06/16 must provide transactional outbox semantics** before any use case claims reliable follow-up.

**R-2 — Fake transactions cannot prove rollback.**
The transaction-failure test proves the use case does not proceed past a failure and writes nothing. It does **not** prove PostgreSQL atomicity, and the test says so. Real rollback verification needs a database (BACKEND-08).

**R-3 — Pre-check plus insert is racy.**
Where uniqueness matters, an application check followed by an insert has a window. Database constraints stay authoritative, and BACKEND-08 must translate constraint violations into `ResourceConflictError`.

**R-4 — Type safety is not authorization.**
`GetWorkspaceMember` scopes by the actor's workspace, which prevents cross-tenant reads. It does **not** check whether the actor may read members at all — that is BACKEND-27. Tenant scoping and permission are two protections, and this command implements one.

## 4. Handoffs

**BACKEND-06/08 (database):** implement `WorkspaceRepository`, `WorkspaceMembershipRepository`, `TransactionManager`, and the two ID generators. `TransactionContext` must stay opaque — no `PoolClient` in a repository signature. Tenant-scoped reads return `null` for another workspace's row rather than throwing or revealing it. Translate unique-constraint violations into conflicts; application never parses SQL error strings. Provide outbox support (R-1). Enforce independently: one owner per workspace, unique membership per (workspace, user), FK integrity.

**BACKEND-09 (sealing):** application owns `DocumentSealer`; `@lagda/sealing` implements it. One high-level `seal()`. No library type crosses. One caller — completion — so a Node adapter and a future Java/.NET adapter differ only in wiring.

**BACKEND-11 (API):** construct the actor from the authenticated session, map request → input (never pass the raw request), invoke, map result → response, map `error.category` → status using the BACKEND-03 table. No business logic in routes. Errors carry no status; the mapping lives at the boundary.

**BACKEND-14 (idempotency):** send, invite, plan change, signature submission, OTP delivery (handoff §28), plus completion — which must not produce two final artifacts. HTTP-level idempotency does not cover worker retries; use cases stay safe under repeated execution against authoritative state.

**BACKEND-16 (worker):** workers invoke use cases, never reimplement rules. At-least-once. Job payloads carry identifiers, not entities or PII. Scheduled work uses `SystemActor`, not a borrowed human ID.

**BACKEND-19+ (auth):** `PasswordHasher` and token generator/verifier ports, created when first consumed. Entity ID generators are **not** reusable for security tokens. Anti-enumeration errors may deliberately collapse internal causes.

**BACKEND-27 (authorization):** integrates at the point noted in R-4, close to the use case rather than only in route middleware.

## 5. Rule ownership, updated from BACKEND-04

| Rule | Owner | Now |
|---|---|---|
| Domain send readiness, signing order, completion eligibility | core | implemented |
| Exactly one owner | core | implemented, invoked by `CreateWorkspace` |
| Resource existence | application | implemented |
| Tenant-scoped resolution | application + repository port | implemented |
| Workspace name required | application | implemented |
| Email uniqueness | application + **database** | BACKEND-19/08 |
| Who may perform an action | authorization | BACKEND-27 |
| Unique membership, FK integrity | database | BACKEND-08 |
| Idempotent retries | application + infrastructure | BACKEND-14 |

## 6. Verification

Application tests run with fakes only — no database, no HTTP server, no network. 11 application tests, 137 backend tests total. The cross-tenant case is explicit: workspace A requests a member that exists in workspace B and receives the same outcome as for a member that does not exist.
