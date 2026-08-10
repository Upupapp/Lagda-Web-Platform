# Signing request creation — test matrix

114 assertions across four suites. Every status below is the **actual** result
of a run, not an intention.

| Suite | File | Count | Result |
|---|---|---|---|
| Use cases | `packages/application/src/signing-requests/signing-requests.test.ts` | 41 | PASS |
| HTTP | `packages/api/src/signing-requests/signing-request-routes.test.ts` | 20 | PASS |
| Architecture | `tests/architecture/signing-requests.test.ts` | 30 | PASS |
| Integration (real PostgreSQL) | `packages/db/src/signing-requests.integration.test.ts` | 23 | PASS |

## By area

| Area | Case | Result |
|---|---|---|
| Identity | RequestId is opaque and not the Document/Preparation/Artifact id | PASS |
| Identity | New request RecipientIds, distinct from preparation's | PASS |
| Identity | New request FieldIds, distinct from preparation's | PASS |
| Identity | Three distinct brands declared | PASS |
| Snapshot | Exact source ArtifactId, from the preparation | PASS |
| Snapshot | Preparation revision recorded | PASS |
| Snapshot | Recipient name, email, organization, type, order, routing copied | PASS |
| Snapshot | Field geometry copied byte-identically, not re-rounded | PASS |
| Snapshot | Assignments remapped to request recipients | PASS |
| Snapshot | Routing order copied | PASS |
| Snapshot | Document title snapshotted | PASS |
| Snapshot | Creator taken from the session | PASS |
| Snapshot | Coherent single-transaction read | PASS (by construction + integration atomicity) |
| Independence | Contact change does not alter the request | PASS |
| Independence | Contact delete does not alter the request | PASS |
| Independence | Preparation recipient edit does not alter the request | PASS |
| Independence | Preparation recipient DELETE nulls provenance, keeps the snapshot | PASS (integration) |
| Independence | Field move/resize does not alter the request | PASS |
| Independence | Field delete does not alter the request | PASS |
| Independence | Field delete nulls provenance | PASS (integration) |
| Independence | Assignment change does not alter the request | PASS |
| Independence | Document rename does not alter the snapshotted title | PASS |
| Independence | The READ path returns the snapshot, not current state | PASS |
| Creation | Valid preparation creates one request | PASS |
| Creation | A second request from the same document is permitted | PASS |
| Creation | Preparation is NOT frozen | PASS |
| Creation | No preparation → refused | PASS |
| Creation | No recipients → refused | PASS |
| Creation | No fields → refused | PASS |
| Creation | Unassigned field → refused | PASS |
| Creation | Required signer with no field → refused | PASS |
| Creation | Only non-blocking participants → refused | PASS |
| Creation | Blockers name indexes, never labels or addresses | PASS |
| Creation | Nothing written when readiness fails | PASS |
| Creation | Archived document rejected | **N/A** — BACKEND-29 has no archive; there is no `archived_at` on `documents` and no archive operation |
| Tenant | Wrong-workspace document → hidden 404 | PASS |
| Tenant | Wrong-workspace document → FK violation at the DB | PASS (integration) |
| Tenant | Wrong-workspace artifact → FK violation | PASS (integration) |
| Tenant | Wrong-workspace preparation → FK violation | PASS (integration) |
| Tenant | Scope mismatch on write → refused | PASS (integration) |
| Tenant | Cross-request field assignment → FK violation | PASS (integration) |
| Tenant | RLS hides another workspace's request | PASS (integration) |
| Tenant | Runtime role has no BYPASSRLS, is not superuser | PASS (integration) |
| Auth | `signing-request.create` required; auditor refused | PASS |
| Auth | `signing-request.view`; auditor permitted | PASS |
| Auth | Non-member gets a hidden 404 | PASS |
| Auth | Exhaustive 20 × 7 capability matrix | PASS |
| Auth | Role change takes effect immediately | PASS — authority is read inside the mutation transaction; covered centrally by the BACKEND-27 suite |
| Auth | Removed member denied | PASS — the membership read returns null → 404 |
| Session | MFA pre-auth denied | PASS **BY COMPOSITION** — the authenticated scope's hook rejects a pending credential before any route handler runs; tested once centrally, not re-asserted here |
| CSRF | Creation protected | PASS |
| CSRF | Anonymous refused on both routes | PASS |
| Idempotency | Same key replays the same id | PASS (unit + HTTP) |
| Idempotency | Replay after a preparation edit returns the ORIGINAL snapshot | PASS |
| Idempotency | Different key creates a second request | PASS |
| Idempotency | Concurrent same key → exactly one request | PASS (integration, real transactions) |
| Idempotency | Missing key refused | PASS |
| Idempotency | Same key, changed logical input → conflict | **N/A** — the fingerprint is the document alone, and the document is in the URL. There is no input that can change while the key stays the same. This is deliberate; see CREATION_CONSISTENCY |
| Immutability | No update method on the port | PASS |
| Immutability | No UPDATE statement in the repository | PASS |
| Immutability | No UPDATE grant on either snapshot table | PASS (integration, catalog + attempted write) |
| Immutability | UPDATE IS granted on the request row, for BACKEND-33 | PASS (integration) |
| Immutability | `state = 'sent'` refused by the CHECK | PASS (integration) |
| Immutability | No PATCH/PUT/DELETE route | PASS |
| Client input | Recipient array refused (422) | PASS |
| Client input | Field array refused | PASS |
| Client input | Source artifact refused | PASS |
| Client input | Preparation id refused | PASS |
| Client input | State refused | PASS |
| Client input | Id, creator, title, workspace, document refused | PASS |
| Client input | Send metadata (subject, message, expiry, reminders, auth) refused | PASS |
| Side effects | No email — no provider, no mailer call | PASS (architecture) |
| Side effects | No signing token, no OTP, no access column | PASS (architecture) |
| Side effects | No queued job, no outbox | PASS (architecture) |
| Side effects | No storage write | PASS (architecture — no storage import) |
| Side effects | No evidence event written | PASS (unit + architecture) |
| Side effects | No artifact or seal created; source artifact row untouched | PASS |
| PDF | No PDF library imported | PASS (architecture) |
| PDF | DocumentSealer never referenced | PASS (architecture) |
| Logging | No recipient name, address, title, label or geometry | PASS (whole serialized line, real fixtures) |
| Logging | Reads unlogged | PASS |
| Metrics | Bounded label set | PASS (architecture) |
| API | No storage key, token or normalized email in a response | PASS |
| Migration | From zero | PASS — `lagda_test` dropped and rebuilt from 001 |

## What each layer cannot prove

**The use-case suite** runs against fakes whose rollback restores a whole-store
snapshot, so it cannot model a genuine race. Every concurrency claim is in
integration. The fakes do reproduce the field-assignment constraint, so a
remapping bug fails there too rather than passing and failing later.

**The HTTP suite** proves what the schema refuses and what the log carries. It
uses the real `createApp` for the scope's protections and a bare Fastify with a
captured logger for telemetry.

**The architecture suite** greps source, with a comment-stripping helper and a
second that also strips SQL line comments. The most valuable guard in it is
positional: it slices the use-case file at `getSigningRequest` and asserts no
mutable repository appears after that point.

**The integration suite** is the only place RLS, the compound keys, the grants
and real concurrency are exercised, as the `lagda_app` runtime role.

## One flake, recorded honestly

A single full-integration run reported two failures in
`idempotency.integration.test.ts` (`commits the claim and the business write
together`, `rolls back the business write when completion fails`). That run had
`npm run build` invoked in the same shell command.

Three subsequent full runs — and the two suites run together in isolation — were
clean, and the failure was not reproduced. It is recorded rather than dismissed:
if it recurs, the suspicion is a `dist/` rewrite racing the integration run
rather than anything in BACKEND-32, and the next occurrence should capture the
assertion text before rerunning.
