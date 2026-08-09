# Evidence & Integrity Foundation Report — BACKEND-10

## 1. What was built

| Artifact | Location |
|---|---|
| Migration (4 tables, RLS, privileges) | `packages/db/src/migrations/003_evidence_and_integrity.ts` |
| Row types | `packages/db/src/schema/index.ts` |
| Ports | `packages/application/src/common/ports/evidence.ts` |
| PostgreSQL adapters | `packages/db/src/repositories/evidence.ts` |
| In-memory fakes | `packages/application/src/test-support/fakes.ts` |
| Integration tests (42) | `packages/db/src/evidence.integration.test.ts` |
| Shared contract cases (6, run twice) | `packages/application/src/test-support/repository-contract.ts` |

Three repositories for four tables: seal and verification are written by one
method, because a seal without a verification record is not a state the product
has.

## 2. The constraint that shaped everything

**Only `workspaces` and `workspace_memberships` exist.** There is no `documents`,
`signing_requests` or `recipients` table until BACKEND-29/30/31.

So `document_id`, `signing_request_id` and `recipient_id` carry no foreign key.
Every *other* relationship is compound-FK constrained today and proven by test.

Rather than leave that as a latent problem, each future parent table must be
created with `UNIQUE (workspace_id, <id>)`, which makes each future constraint a
pure `ALTER TABLE` touching no evidence code. The exact statements are in
[EVIDENCE_ARCHITECTURE.md §14](./EVIDENCE_ARCHITECTURE.md).

Inventing those tables here to satisfy the FK requirement would have meant
guessing BACKEND-30/31's schema — a far worse outcome than a documented gap.

## 3. Decisions found in the specification, not invented

| Question | Answer | Source |
|---|---|---|
| Is there a `prepared` artifact? | **No.** Fields merge *after* signing; storage is "original + signed final" | Handoff §8, §9 |
| What is §17's `documentHash`? | SHA-256 of the original at upload — and since preparation adds no bytes, that is BACKEND-09's `preparedDocumentHash` | §17 + §8 |
| What does "location" mean? | IP-derived, city level only, never lat/lng | §16 + `DeviceNetworkSummary` |
| Must evidence be immutable? | Yes — "cannot be modified or deleted (append-only store)" | §32 |
| Verification record fields | verificationId, documentHash, signedDocumentHash, completedAt, participantCount, issuerWorkspaceId | §17 |
| Does verification have a lifecycle? | No revocation semantics exist → no `status` column | absence in spec |

## 4. Defects and corrections

### 4.1 A uniqueness test was passing for the wrong reason

The "refuses a second finalization" test passed with
`document_seals_one_per_request` **dropped entirely**. The rejection was coming
from the verification table's own uniqueness, because the repository writes both
rows and the second constraint fired first.

Found by probing — dropping the constraint and expecting a failure that never
came. Fixed by adding two raw-SQL tests that insert a duplicate into each table
independently. Both now fail when their own constraint is dropped, verified
separately.

### 4.2 OD-022 was deferred for a reason that was false

BACKEND-09 recorded that `Sha256Digest` could not be branded because
`@lagda/contracts` is shared with the frontend.

**The frontend consumes nothing from that package.** OD-005 records exactly that,
and a search of `src/` confirms zero imports. Branding cost one line — the
sealer's digest helper now returns through a validating constructor — and closed
a hazard at the moment two hashes were being mapped into adjacent columns, where
a swap would have compiled silently.

The prompt to recheck was ESLint flagging `as Sha256Digest` as an unnecessary
assertion. The assertion was unnecessary *because the type was doing nothing*.

### 4.3 A nested `ColumnType` broke Kysely's inference

`created_at: Generated<Timestamptz>` nests a `ColumnType` inside a `ColumnType`,
which silently produced a select type that no longer matched `Date`. Replaced
with an explicit `GeneratedTimestamptz = ColumnType<Date, Date | undefined,
never>` — which also states the intent better: database-filled, optional on
insert, never updatable.

## 5. Immutability — precisely what enforces it

| Mechanism | In place |
|---|---|
| Repository API omits update/delete | **Yes**, asserted by test |
| DB privilege separation (`lagda_app`: INSERT + SELECT only) | **Yes**, asserted via `has_table_privilege` with a negative control |
| Trigger | **No** — would block the erasure path BACKEND-55 needs |
| RLS | Yes, for tenancy — not an immutability control |

**This is an operational control, not cryptographic non-repudiation.** It does
not prove a database administrator could never alter a row (INV-085).

**Hash chaining: DEFERRED**, with reasons — see
[EVIDENCE_ARCHITECTURE.md §12](./EVIDENCE_ARCHITECTURE.md). No blockchain, Merkle
tree or ledger.

## 6. Gates

| Gate | Result |
|---|---|
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm test` | **204 passed** (was 198) |
| `npm run test:integration` | **95 passed** (was 47) |
| Migration from zero | PASS — verified on a fresh database |
| Probes | **8/8 fire**, baseline clean |

The integration suite now runs. A local PostgreSQL 16 was reachable on default
development credentials, which also closed the item handed over at the end of
BACKEND-09 — the pre-existing 47 tests pass, and the `describe.skipIf` fix is
verified in its executing path rather than only its skipped one.

### Probes

| Violation introduced | Result |
|---|---|
| Grant UPDATE/DELETE on evidence to `lagda_app` | 3 tests fail |
| Drop the compound seal→artifact FK | 1 fails |
| Drop `document_seals_one_per_request` | 1 fails *(0 before §4.1 was fixed)* |
| Drop `verification_records_one_per_request` | 1 fails |
| Order by `occurred_at` only | 1 fails |
| Leak `workspace_id` into the public projection | 2 fail |
| Disable the workspace scope check | 3 fail |
| Baseline | 42/42 pass |

## 7. Risks

**R-1 — Nothing writes evidence yet.** No use case appends an event; the
repositories have no production caller until BACKEND-36/38. The schema and
adapters are proven; their ergonomics against a real use case are not.

**R-2 — `client_ip` and `client_user_agent` have no writer.** Deliberate:
BACKEND-11/56 must establish trusted proxy configuration first. Until then,
evidence carries no request context and must not be described as though it does.

**R-3 — Storage references are synthetic.** `lagda://foundation/...` in tests.
This is **FOUNDATION**; BACKEND-17 supplies real references.

**R-4 — Three ID types are backend-owned and unbranded across boundaries.**
`EvidenceEventId`, `ArtifactId` and `SealId` are branded within the backend but
absent from `@lagda/contracts`, deliberately, since none crosses a public
boundary. If one ever does, it moves.

**R-5 — `details` validation is a type, not a runtime schema.** The port accepts
a bounded typed payload and the database caps its size, but per-event-type
runtime validation (§167) belongs with the use cases that write each event type.
Route input must never become an evidence payload (INV-104).

**R-6 — Evidence volume is unbounded.** No pagination on
`listForSigningRequest`, which is correct for completion (a bounded set) and
wrong for BACKEND-43's audit view. Flagged there rather than overbuilt here.

## 8. Handoffs

**BACKEND-11 (API):** must supply observed request context — IP from the
connection after trusted proxy configuration, user-agent from headers —
**separately** from the business payload. A route must never accept
`{ eventType, occurredAt, ip }` from a client (INV-104).

**BACKEND-17 (storage):** artifact rows are written only after bytes are
authoritative. There is no `pending` state and no UPDATE privilege to fill a
reference in later — the ordering is forced, not requested. Both failure windows
(storage-then-DB, DB-then-storage) are yours.

**BACKEND-29/30/31:** create `documents`, `signing_requests` and `recipients`
with `UNIQUE (workspace_id, <id>)`, then add the FKs in §14 of the architecture
document.

**BACKEND-36/38:** completion writes artifacts, the finalization pair, the
evidence event and signing state in **one** transaction — all repositories are on
the unit of work and this is tested. Sealing happens *outside* it (INV-082).

**BACKEND-42:** the public projection and its port exist. Build the endpoint on
`PublicVerificationLookup` and add nothing to the projection without revisiting
INV-099. No new database role is needed.

**BACKEND-43:** the audit trail is a superset of these thirteen event types, not
a replacement. Delivery outcomes and settings changes belong to you.

**BACKEND-55:** retention, legal hold, anonymization and privileged erasure.
Nothing is hardcoded. Note that hashing an email or IP does not automatically
make it anonymous.
