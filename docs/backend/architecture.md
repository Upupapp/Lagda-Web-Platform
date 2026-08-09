# LAGDA Backend Architecture

**Established by:** BACKEND-00 — Backend Architecture Guardrails.
**Status:** Architectural constitution. Later `BACKEND-XX` commands follow it and
do not casually override it.
**Scope:** LAGDA **eSignature** only. eNotary backend work is out of scope — see §8.
**Backend code written so far:** none. This command produces documentation and
enforcement only; repository scaffolding belongs to BACKEND-01.

**Read with:** [`ARCHITECTURE_INVARIANTS.md`](./ARCHITECTURE_INVARIANTS.md),
[`OPEN_DECISIONS.md`](./OPEN_DECISIONS.md),
[`adr/ADR-001-node-typescript-modular-monolith.md`](./adr/ADR-001-node-typescript-modular-monolith.md).
Endpoint contracts live in `../backend-integration-handoff.md` (44 sections) and
delivery order in `../backend-implementation-priority.md`. Neither is restated here.

---

## 1. Platform

Node.js 24 LTS · TypeScript strict · PostgreSQL · Fastify · Pino · Vitest ·
ESLint 9 flat config · npm workspaces · `pg-boss` for PostgreSQL-backed jobs.

Deliberately **not** introduced: Java, .NET, Redis, Kafka, RabbitMQ,
microservices, Kubernetes, event streaming, or multiple independently versioned
services. Any of these requires a new ADR justified by a concrete requirement.

Rationale is in ADR-001. In brief: the frontend already carries the domain model,
the current specification is hash-and-evidence based rather than
certificate-based, and Node with PostgreSQL is already operated in-house.

---

## 2. Architectural model — modular monolith

One codebase, one coordinated release, strongly separated internal modules,
infrastructure behind ports and adapters, and independently runnable process
roles where useful.

"Monolith" is not permission to put business logic in route handlers or in
persistence models. The separation is enforced by package boundaries, not by
convention.

### Package structure

```
lagda-backend/
  packages/
    contracts/    shared API + domain boundary contracts
    core/         pure domain logic — entities, invariants, transitions
    application/  use cases and orchestration
    db/           PostgreSQL, migrations, repositories, tenancy scoping
    sealing/      document integrity and finalization boundary
    storage/      object-storage port and adapter
    api/          HTTP layer
    worker/       asynchronous job consumers
  infra/
  docs/
```

New packages need genuine justification. Dozens of tiny packages is its own
failure mode.

### Dependency direction

```
              contracts
                  ↑
                core
                  ↑
             application
              ↑   ↑   ↑
        ┌─────┘   │   └─────┐
      api      worker    adapters
                        (db, sealing, storage)
```

- `contracts` depends on nothing internal.
- `core` may depend on `contracts` only. It must run in tests without a server
  or a database.
- `application` depends on `core` and `contracts`, and on **ports** it declares
  itself — `UserRepository`, `WorkspaceRepository`, `DocumentRepository`,
  `ObjectStorage`, `DocumentSealer`, `NotificationPublisher`, `Clock`,
  `IdGenerator`, `TransactionManager`.
- `db`, `sealing`, `storage` implement those ports. Application code never
  imports them directly; composition happens at the process entry point.
- `api` and `worker` are delivery mechanisms. Both call the same use cases.
- No cycles.

### Request flow

```
HTTP request → route → application use case → domain + ports → response mapper
```

Routes authenticate, validate, authorize, build use-case input, invoke, and map
the result. Nothing more (INV-004).

---

## 3. Contract ownership

The backend is TypeScript partly because `src/app/models/` already encodes real
domain knowledge. That does **not** make the frontend a dependency.

**Target:**

```
        @lagda/contracts
          ↑           ↑
      frontend     backend
```

**Not** backend importing frontend source, and **not** hand-copied duplicates.

BACKEND-02 owns the classification and extraction. It must decide per type
whether it is a genuine shared boundary contract, a frontend view model, or a
backend-only concern — and it must resolve the identifier inconsistency in §7
rather than carrying it into the shared package.

### Type safety is not runtime validation

TypeScript interfaces validate nothing at runtime. All externally supplied data
passes through runtime schemas. Prefer defining the schema and deriving the type
from it, so one canonical definition serves validation, typing, and generated
API documentation. Maintaining an interface, a separate validator, and a
separate documentation model for the same structure guarantees drift. Schema
library choice belongs to BACKEND-02/03.

---

## 4. Tenancy

LAGDA is workspace-scoped. **Workspace ownership is enforced at the
data-access boundary**, never by route handlers remembering to add a
`WHERE workspace_id = …` clause (INV-003).

Repository interfaces should make an unscoped tenant query difficult to write:

```ts
repository.forWorkspace(workspaceId).findById(id)   // preferred
repository.findById({ workspaceId, id })            // acceptable
repository.findById(id)                             // not for tenant-owned records
```

Indexes, unique constraints, foreign keys and queries incorporate `workspace_id`
where appropriate. PostgreSQL Row Level Security may follow as defence in depth;
it does not replace application-level enforcement.

**Cross-tenant exposure is a critical security defect** — for documents,
contacts, recipients, signing requests, templates, files, audit events, reports,
invitations, or billing. Tenancy is tested, not assumed: repository suites
include Workspace A and Workspace B and actively attempt unauthorised access
(INV-014).

---

## 5. The sealing seam

Document finalization begins in Node. Certificate-backed signing may later
require a dedicated Java or .NET component. One seam makes that a swap rather
than a redesign.

**The external interface is one operation.**

```ts
interface DocumentSealer {
  seal(request: SealRequest): Promise<SealResult>;
}
```

Low-level steps — merging fields, hashing, generating the completion
certificate, applying a signature — are internal components of the sealing
package. They are not application services and are not called individually from
outside (INV-002).

**One caller.** `DocumentSealer` is invoked only from the signing completion
use case:

```
CompleteSigningRequest → DocumentSealer → NodeDocumentSealer
CompleteSigningRequest → DocumentSealer → RemoteDocumentSealer → Java/.NET service
```

`CompleteSigningRequest` does not know which implementation is active. One caller
is a swap; twenty callers is a rewrite.

**No library types cross the seam.** `SealRequest` and `SealResult` are
LAGDA-owned structures. No `pdf-lib` object may appear in an application
interface, a database record, or an API response (INV-008). No PDF library may
be imported outside the sealing package (INV-001) — enforced by ESLint, not by
comment.

### Seal metadata

Every finalization and evidence record records how it was produced:
`sealScheme`, `sealVersion`, `digestAlgorithm`. Initial values represent
hash-evidence sealing with SHA-256. Records written under one scheme must remain
verifiable after a later scheme is introduced. This is the cheapest thing on
this page and the only one that cannot be added retroactively.

### Document hashes are stage-specific

No single ambiguous `hash` field. Distinguish `originalDocumentHash`,
`preparedDocumentHash`, `signedDocumentHash` as appropriate.

### Original documents are immutable

The accepted original upload is preserved unchanged (INV-010). Sanitized,
prepared, field-rendered, signed, and certificate artifacts are distinct
versions. Provenance stays reconstructable.

---

## 6. Security baseline

Documented now, implemented by later commands.

- **Upload:** receive → quarantine → magic-byte inspection → structure
  validation → AV scan → hash → accept/reject → persist immutable original.
  Never trust filename extension, browser MIME type, or client `Content-Type`.
- **Authentication:** server-managed sessions, httpOnly + Secure cookies,
  SameSite policy, CSRF protection on state-changing browser requests, session
  invalidation and rotation, Argon2id password hashing.
- **Authorization is not authentication.** "Who are you" and "may you do this to
  this resource" are separate questions. Permission checks are centralized enough
  to test and audit — not role-string comparisons scattered through handlers.
  The frontend already defines 24 `PlatformPermission` values and a
  `ROLE_PERMISSIONS` map; that vocabulary is a starting point, not an authority.
- **Idempotency** is durable — surviving process restarts, worker retries, and
  duplicate client requests — for send, invitations, plan changes, signature
  submission, and OTP delivery (INV-012). Not request-local deduplication.
- **Transactions:** multi-record logical operations use deliberate boundaries so
  no impossible partial state is reachable.
- **Tokens:** cryptographically secure randomness only. Never `Math.random()`,
  timestamp-plus-random, or predictable counters.
- **Time:** an injectable `Clock`, so expiry, OTP validity, deadlines, reminders
  and retention are deterministically testable. Timestamps persist in UTC.
- **Secrets:** validated at startup, fail fast when missing, never committed,
  never dumped to logs.

### Logging and evidence are different systems

Pino operational logs may be rotated and redacted. Business evidence records have
their own retention and integrity requirements and are append-oriented (INV-011).
Legally significant history is not modelled solely as mutable current state.

**Redaction:** reproduce the frontend's *principle*, not its implementation —
see the defect in §7.

---

## 7. Repository findings

Recorded during BACKEND-00 inspection. Not fixed here; several materially affect
BACKEND-02.

### F-1 — Branded IDs exist but are inconsistently applied

91 branded ID types are declared. The security-critical one is applied least:

| Identifier | Branded type exists | Fields typed with it | Fields typed `string` |
|---|---|---|---|
| `workspaceId` | yes (`WorkspaceId`) | 6 | 21 |
| `contactId` | yes (`ContactId`) | 8 | some |
| `transactionId` | **no** | — | all |
| `documentId` | **no** | — | all |
| `userId` | **no** | — | all |

The tenant key is a plain `string` in roughly 78% of its declarations, so nothing
prevents a document ID being passed where a workspace ID is expected. **BACKEND-02
must resolve this during extraction rather than carrying it into
`@lagda/contracts`.** Given §4, `WorkspaceId` should be branded and applied
consistently before repository interfaces are designed against it.

### F-2 — The frontend redactor has two gaps; do not port it

`src/app/utils/logger.ts` is dev-only, which bounds its impact there. Verified by
executing the function:

- **Exact key matching.** `SENSITIVE_KEYS.has(k.toLowerCase())` catches the literal
  key `token` but not `resetToken` or `sessionToken` — both of which the security
  requirements list as never-log.
- **Arrays are never redacted.** `redact()` returns early on arrays, so
  `{ users: [{ password: "…" }] }` passes through untouched. List-shaped payloads
  are the common case.

Server logs are persistent and centralized, so both gaps are considerably more
serious in the backend. The backend redactor uses substring or pattern matching
and recurses through arrays. Fixing the frontend logger is a separate task and
was deliberately not done here.

### F-3 — 50 status unions, zero explicit transitions

50 distinct `*Status` unions exist across the models. No transition table,
`canTransitionTo`, or equivalent exists anywhere. **There is no state machine to
port** — the backend defines transition rules itself (INV-013), and the frontend
unions are vocabulary rather than lifecycle authority.

### F-4 — Precedent for decorative architecture

`RouteMeta.status` was declared on all 225 routes and read by no code; it drifted
until three routes claimed `"implemented"` while rendering a placeholder. A
`routeIds` field in the capability registry has the same character. This is why
INV-001 is an ESLint rule and tenancy is a repository-interface shape rather than
a documented convention. **A rule nothing executes is not a rule.**

### F-5 — Frontend service surface is the real contract

24 mock services totalling 14,289 lines under `src/app/services/mock/` define
method surfaces the backend must satisfy. They are specifications, not sketches.
The intended migration is to keep each module's exported signature and replace
the body with an HTTP call, leaving the pages layer untouched.

### F-6 — No PDF dependency exists yet

Neither `pdf-lib`, `pdfkit`, `jsPDF` nor `pdfmake` appears in `package.json`.
The handoff already requires all PDF operations to be server-side, so the ESLint
restriction added by this command (§9) currently passes trivially — it exists to
prevent the first violation, not to fix an existing one.

---

## 8. eSignature / eNotary boundary

Current scope is **electronic signature**. Not implemented, and not to be
implemented without a dedicated command and ADR: notarial certificate issuance,
remote online notarization, notary commissioning, PNPKI integration, qualified
signing infrastructure, accreditation-dependent flows (INV-009).

The sealing seam exists precisely so accredited certificate-backed signing can
arrive later without redesigning the backend.

### Java/.NET extraction triggers

Requirement-based, never scheduled or assumed. Any one justifies the work:

- accreditation requires a certificate-backed signature profile;
- PNPKI integration becomes mandatory;
- a customer contract requires cryptography impractical in Node;
- trusted timestamp authority integration is required;
- certificate-chain validation or revocation materially favours a specialised stack;
- key custody or HSM integration favours another platform;
- **measured** throughput shows sealing is a bottleneck.

---

## 9. Enforcement status

Honest separation of what executes from what is written down.

| Rule | Enforcement today |
|---|---|
| INV-001 no PDF imports outside sealing | **ESLint** — `no-restricted-imports` in `eslint.config.js`, active now |
| INV-009 no eNotary backend | Documentation + existing frontend disclosure tests |
| All other invariants | **Documentation only** — no backend repository exists yet |

Every remaining invariant becomes executable as the packages it governs are
created. BACKEND-01 owns the boundary lint rules and package manifests;
BACKEND-02 owns contract extraction and the F-1 identifier decision.

---

## 10. Deployment topology

One application release, two process roles from the same artifact:

```
lagda-api      HTTP
lagda-worker   pg-boss consumers
```

Separate process roles do not justify separate repositories or independently
versioned services. Liveness and readiness are distinguished: a live process does
not imply reachable PostgreSQL, applied migrations, a usable queue, or valid
storage configuration. Health endpoints do not disclose internal state.

---

## 11. Open decisions

Tracked in [`OPEN_DECISIONS.md`](./OPEN_DECISIONS.md): data residency, retention,
email provider, AV implementation, and contracts distribution. None invent policy
that product or legal has not decided, and none block unrelated backend work.
