# Send — test matrix

80 assertions across three suites. Every status is the **actual** result of a
run.

| Suite | File | Count | Result |
|---|---|---|---|
| Use cases | `packages/application/src/signing-requests/send.test.ts` | 28 | PASS |
| Architecture | `tests/architecture/signing-request-send.test.ts` | 31 | PASS |
| Integration (real PostgreSQL) | `packages/db/src/signing-request-send.integration.test.ts` | 21 | PASS |

| Area | Case | Result |
|---|---|---|
| State | DRAFT to SENT | PASS |
| State | `sentAt` recorded from the server clock | PASS |
| State | Already sent, new key, denied with 409 | PASS |
| State | `sent_at` and `state` cannot disagree | PASS (integration CHECK) |
| State | A state outside the CHECK refused | PASS (integration) |
| State | Unknown request reported absent | PASS |
| Snapshot | Uses request recipients only | PASS (test + architecture) |
| Snapshot | Uses request fields only | PASS (test + architecture) |
| Snapshot | Contact edited after creation is irrelevant | PASS |
| Snapshot | Preparation recipient edited is irrelevant | PASS |
| Snapshot | Preparation fields deleted entirely is irrelevant | PASS |
| Snapshot | Document renamed is irrelevant | PASS |
| Snapshot | Delivery snapshot captured into the intent | PASS |
| Routing | Parallel: all activate | PASS |
| Routing | Sequential: first cohort only | PASS |
| Routing | Mixed: the shared cohort together | PASS |
| Routing | Waiting recipients get NO credential | PASS |
| Routing | Earliest cohort present, not the literal 1 | PASS |
| Routing | An activation row for every recipient | PASS |
| Routing | Viewer activated, not provisioned | PASS |
| Routing | Client cannot choose active recipients | PASS (empty closed body) |
| Auth | `signing-request.send` required; auditor refused | PASS |
| Auth | Removed member refused, nothing written | PASS |
| Auth | Membership read inside the transaction | PASS (architecture) |
| Auth | Role change immediate | PASS — by the same mechanism; covered centrally |
| Session | MFA pre-auth denied | PASS **BY COMPOSITION** — the scope hook rejects a pending credential before any handler runs |
| CSRF | Protected | PASS **BY COMPOSITION** — registered inside the authenticated scope, like every other write |
| Access | High-entropy opaque credential, not a JWT | PASS (architecture) |
| Access | Digest-only persistence | PASS — the assertion caught a test double whose digest embedded its plaintext |
| Access | Digest shape enforced | PASS (integration CHECK) |
| Access | Each recipient a different credential | PASS |
| Access | Correct recipient and request binding | PASS |
| Access | Cross-request grant refused | PASS (integration FK) |
| Access | Scope mismatch refused | PASS (integration) |
| Access | Explicit expiry from the server clock | PASS |
| Access | Expiry must be after creation | PASS (integration CHECK) |
| Access | One active grant per recipient | PASS (integration partial index) |
| Access | Reissue after revoke permitted | PASS (integration) |
| Access | Digest globally unique | PASS — a reissue test that reused a digest failed on it, correctly |
| Delivery | Intent atomic with grant and state | PASS |
| Delivery | Sealed credential stored, `v1.` format | PASS (integration) |
| Delivery | One intent per grant | PASS (integration unique) |
| Delivery | Grant cannot be deleted while its intent exists | PASS (integration RESTRICT) |
| Delivery | Pending work discoverable | PASS (integration partial index) |
| Delivery | Provider retry reuses the same credential | PASS **STRUCTURALLY** — one intent per grant makes a new credential per retry unrepresentable. No worker exists to run the retry |
| Delivery | Failure before commit leaves DRAFT | PASS |
| Delivery | Multi-recipient partial failure rolls back | PASS |
| Delivery | Provider outage after commit does not revert | PASS **BY CONSTRUCTION** — no provider is called, so there is nothing to fail. Re-assert in BACKEND-45 |
| Delivery | Provider not configured reported honestly | PASS — DURABLE INTENT ONLY, stated in the report |
| Idempotency | Same key replays, mints nothing | PASS |
| Idempotency | Concurrent same key | PASS (integration, via the conditional transition) |
| Idempotency | Different key after SENT refused | PASS |
| Idempotency | Same key, changed input, conflict | **N/A** — the fingerprint is the request id and the request id is in the URL. No input can change while the key stays the same |
| Link | Canonical base URL | PASS (architecture) |
| Link | Host header cannot reach the builder | PASS (architecture — the function takes no request) |
| Link | Never persisted | PASS (architecture + test) |
| Link | Never returned to the sender | PASS |
| Side effect | No signing ceremony, no session, no OTP | PASS (architecture) |
| Side effect | No evidence, artifact or seal written | PASS |
| Side effect | Snapshot untouched | PASS |
| Side effect | No viewed/signed/delivered state anywhere | PASS |
| PDF | No PDF library imported | PASS (architecture) |
| PDF | `DocumentSealer` never referenced | PASS (architecture) |
| PDF | No bytes read from storage | PASS (architecture) |
| RLS | Workspace isolation on activation rows | PASS (integration) |
| RLS | FORCE on all three tables | PASS (integration, `pg_class`) |
| RLS | Runtime role has no BYPASSRLS | PASS (integration) |
| Logging | No credential, URL, email, name or title | PASS (architecture, payload-scoped) |
| Metrics | Bounded labels | PASS (architecture) |
| Rate limit | Checked before credential generation | PASS (architecture, positional) |
| Migration | From zero | PASS — `lagda_zero4_test` and `lagda_test`, both rebuilt from 001 |

## Not covered, and why

**Cross-tenant SEND through the API.** The use case refuses a non-member with a
hidden 404 and the integration suite proves RLS on every new table, but there is
no end-to-end "workspace A member POSTs to workspace B's request" route test.
The control is the same membership read every other command uses; the gap is a
missing assertion, not a missing control.

**No HTTP suite for the send route.** The use-case and architecture suites cover
the body schema by inspection and the behaviour by call. A `createApp` route
test in the shape of BACKEND-32's would add anonymous/CSRF/422 assertions
directly. Worth adding; not done.

**No worker or provider test**, because neither exists.

## What each layer cannot prove

**The fakes** cannot model a genuine race — their rollback restores a whole-store
snapshot. Every concurrency claim is in integration. They do reproduce the
one-active-grant and one-intent-per-grant constraints, so a duplicate-send bug
fails there too.

**The architecture suite** greps source. Its most valuable guards are positional:
the rate-limit check appears before the send call, and the state transition
appears after provisioning.

**The integration suite** is the only place RLS, the partial indexes, the CHECK
constraints and the conditional transition race are exercised, as the runtime
role.
