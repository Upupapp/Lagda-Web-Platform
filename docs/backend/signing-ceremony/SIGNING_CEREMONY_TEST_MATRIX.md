# Signing ceremony — test matrix

86 assertions across three suites. Every status is the **actual** result of a
run.

| Suite | File | Count | Result |
|---|---|---|---|
| Use cases | `packages/application/src/signing-ceremony/signing-ceremony.test.ts` | 34 | PASS |
| Architecture | `tests/architecture/signing-ceremony.test.ts` | 33 | PASS |
| Integration (real PostgreSQL) | `packages/db/src/signing-ceremony.integration.test.ts` | 19 | PASS |

| Area | Case | Result |
|---|---|---|
| Access | valid recipient session | PASS |
| Access | no recipient session | PASS — 401, and the route returns before any use case runs |
| Access | unknown / malformed session cookie | PASS |
| Access | expired session | PASS |
| Access | wrong request | PASS — a session for request B reaches only B |
| Access | wrong recipient | PASS (integration) — one recipient row of two |
| Request | not signable (`draft`, `cancelled`, `completed`) | PASS |
| Routing | waiting recipient denied | PASS |
| Routing | no activation row at all | PASS |
| Snapshot | Contact mutation irrelevant | PASS — contacts deleted entirely, ceremony unchanged |
| Snapshot | Preparation mutation irrelevant | PASS — preparations and fields deleted |
| Snapshot | current Document artifact irrelevant | PASS — and the schema forbids a second `original` |
| Document | exact source artifact | PASS — storage asked for the frozen key only |
| Document | storage key hidden | PASS — asserted over the returned shape |
| Document | Range requests | **NOT APPLICABLE** — no PDF viewer exists; `Accept-Ranges: none` |
| Document | presigned URL secrecy | **NOT APPLICABLE** — none is issued |
| Document | storage failure | PASS — dependency error, request unchanged |
| Fields | only authorized recipient fields | PASS (use case + integration) |
| Fields | geometry unchanged | PASS |
| Fields | other-recipient fields hidden | PASS — and their NAME absent from the payload |
| Fields | deterministic order | PASS |
| Fields | server-derived types marked | PASS |
| Entry | meaningful ceremony entry | PASS |
| Entry | repeated entry idempotent | PASS (use case + integration) |
| Entry | refused entry records nothing | PASS |
| Entry | bootstrap does not mark entered | PASS |
| Entry | view does not sign, consent or advance routing | PASS |
| Consent | required for the four field-eligible roles | PASS |
| Consent | not required for a viewer | PASS |
| Consent | gates document and fields | PASS |
| Consent | explicit acceptance unlocks both | PASS |
| Consent | exact version required | PASS |
| Consent | backend time, not the client's | PASS |
| Consent | rotation asks again | PASS |
| Consent | idempotent retry | PASS (use case + integration) |
| Consent | concurrent acceptance converges | PASS |
| Consent | unknown consent type refused | PASS (integration, CHECK) |
| Consent | cross-request recipient refused | PASS (integration, three-column FK) |
| Consent | CSRF realm | PASS **BY CONSTRUCTION** — see below |
| Realm | no workspace authorization symbol anywhere | PASS (architecture) |
| Realm | no workspace capability named | PASS (architecture) |
| Realm | no LAGDA account lookup | PASS (architecture) |
| Realm | recipient cannot reach workspace APIs | PASS **BY COMPOSITION** |
| Realm | normal user session is not enough | PASS **BY CONSTRUCTION** |
| RLS | recipient-scoped reads | PASS — 1 of 2 requests, 1 of 2 recipients, 1 of 2 fields, 1 of 2 artifacts |
| RLS | fail closed with an unknown session | PASS — 0 rows |
| RLS | workspace realm unaffected | PASS — still 2 and 2 |
| RLS | policies are RESTRICTIVE | PASS — all six, `polpermissive = false` |
| RLS | no BYPASSRLS, not superuser | PASS |
| Privilege | cannot UPDATE progress | PASS — permission denied |
| Privilege | cannot DELETE progress or consent | PASS — permission denied |
| PDF | no mutation | PASS (architecture) |
| PDF | no DocumentSealer | PASS (architecture) |
| Logging | no PII, content, layout or consent text | PASS (architecture) |
| Metrics | bounded labels | PASS (architecture) |
| Migration | from zero | PASS — `lagda_zero6_test` and `lagda_zero7_test` |

## Not covered, and why

**No HTTP route suite.** The same gap BACKEND-33 and BACKEND-34 left. A
`createApp` test would assert the 401 body, the 403 on a missing CSRF token, the
document response headers and the rate-limit rejection directly. Today those are
covered by reading the source (architecture) and by the use cases underneath.
Three commands have now deferred it; it is worth one pass of its own.

**Recipient CSRF is asserted BY CONSTRUCTION at the HTTP layer.** The validator
itself has three unit tests from BACKEND-34, and the route calls it — a guard
asserts that. What is missing is a request that POSTs a workspace CSRF token at
`/signing/ceremony/consent` and gets a 403.

**Cross-realm denial is BY COMPOSITION.** The workspace routes live inside a
scope whose hook does not read the recipient cookie, and the ceremony routes are
registered outside it. The mechanism is real and centrally tested; there is no
test that POSTs a recipient cookie at `/workspaces`.

## An observed flake

One full `test:integration` run reported 2 failed of 630 in a file the filtered
output did not name; the two immediately following runs were fully green (581
passed, 49 skipped). The suite runs sequentially against one shared database
with `truncateAll` between tests, and the surrounding log noise was from the
worker retry-timing tests, which are the time-sensitive ones. Recorded rather
than dismissed — BACKEND-32 saw the same shape once.

## What each layer cannot prove

**The fakes** cannot prove RLS. Every isolation claim is in integration, as the
runtime role.

**The architecture suite** greps source. Five of its guards were narrowed during
the run, each with the reason recorded at the assertion — including a
`SESSION_COOKIE_NAME` guard that failed because `RECIPIENT_SESSION_COOKIE_NAME`
contains it as a substring, and a slice boundary written as a comment, which
`code()` strips.

**The integration suite** is the only place the restrictive policies are
exercised. Its most valuable assertions are the counts, and the first version of
them was wrong in an instructive way: the queries ran on `app.db` outside the
transaction, so every count was zero and every test "passed" the wrong way. They
now set both settings explicitly.
