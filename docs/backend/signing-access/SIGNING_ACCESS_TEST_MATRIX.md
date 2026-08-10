# Signing access — test matrix

84 assertions across three suites. Every status is the **actual** result of a
run.

| Suite | File | Count | Result |
|---|---|---|---|
| Use cases | `packages/application/src/signing-access/signing-access.test.ts` | 33 | PASS |
| Architecture | `tests/architecture/signing-access.test.ts` | 30 | PASS |
| Integration (real PostgreSQL) | `packages/db/src/signing-access.integration.test.ts` | 21 | PASS |

| Area | Case | Result |
|---|---|---|
| Bootstrap | Valid grant exchanges for a session | PASS |
| Bootstrap | Malformed token rejected before any I/O | PASS |
| Bootstrap | Unknown token | PASS |
| Bootstrap | Expired grant | PASS |
| Bootstrap | Revoked grant | PASS — the use case checks `grantRevokedAt` |
| Bootstrap | Request not `sent` | PASS |
| Bootstrap | Routing inactive | PASS |
| Bootstrap | No activation row at all | PASS |
| Bootstrap | Failures collapse to one error and code | PASS |
| Bootstrap | Reusable — a second exchange mints a second session | PASS |
| Bootstrap | Masked address returned, never the full one | PASS |
| Scanner | Only `app.post` exchanges; the sole GET is a context read | PASS (architecture) |
| Scanner | No `:token` path parameter on the API | PASS (architecture) |
| Scanner | `Referrer-Policy: no-referrer` | PASS (architecture) |
| Auth | The method is `link-only` and nothing else is reachable | PASS |
| OTP | every OTP case | **N/A** — LINK_ONLY. A guard asserts no challenge, verifier or attempt counter exists |
| Session | Credential is fresh, not the bootstrap token, not derived | PASS |
| Session | Session and CSRF tokens differ; two independent draws | PASS (test + architecture) |
| Session | Digest-only persistence | PASS |
| Session | Distinct-credentials CHECK | PASS (integration) |
| Session | Records method, source grant, `authenticated_at`, expiry | PASS |
| Session | Expired session refused | PASS |
| Session | Unknown or malformed cookie refused | PASS |
| Session | Session token not accepted as a bootstrap credential | PASS |
| Session | Unknown authentication method refused by CHECK | PASS (integration) |
| Session | Bound to another request's recipient refused by FK | PASS (integration) |
| Session | No DELETE grant on sessions | PASS (integration) |
| Scope | Same email, two requests → two sessions, neither crosses | PASS |
| Scope | Each session resolves only its own request | PASS |
| Scope | Workspace comes from the grant, never supplied | PASS (test + integration) |
| Realm | Context carries no role, membership, userId or capability | PASS (test + architecture) |
| Realm | No workspace authorization symbol anywhere in the surface | PASS (architecture) |
| Realm | Distinct cookie names across five credentials | PASS (architecture) |
| Realm | Distinct digest domains, reusing none | PASS (architecture) |
| Realm | The recipient unit of work has no workspace repository | PASS (architecture) |
| Realm | Recipient cannot access workspace endpoints | PASS **BY COMPOSITION** — those routes live inside the authenticated scope and `requireSession` does not read this cookie |
| Realm | Recipient cannot call `/me` | PASS **BY COMPOSITION** — same mechanism |
| Realm | A user session does not authenticate a recipient | PASS **BY CONSTRUCTION** — the bootstrap route reads no session cookie at all |
| Realm | Cookies coexist | PASS **BY CONSTRUCTION** — different names, different resolvers |
| CSRF | Own token accepted | PASS |
| CSRF | Another session's token refused | PASS |
| CSRF | Session token as its own CSRF token refused | PASS |
| CSRF | Workspace-realm token cannot satisfy it | PASS **BY CONSTRUCTION** — different digest domain; no shared code path exists to test through |
| RLS | Credential resolves exactly one grant | PASS (integration) |
| RLS | Cannot enumerate grants | PASS — unfiltered select returns 1 of 2 |
| RLS | Cannot enumerate requests, recipients or activations | PASS — 1/1/1 of 2 each |
| RLS | Cannot see another recipient of the SAME request | PASS |
| RLS | No setting → sees nothing (fail closed) | PASS |
| RLS | Cannot UPDATE through the credential path | PASS — 0 rows affected |
| RLS | Cannot INSERT a session before `enterWorkspace` | PASS — policy violation |
| RLS | Session realm cannot be resolved via the bootstrap setting | PASS |
| RLS | Runtime role has no BYPASSRLS, is not superuser | PASS |
| Snapshot | No contact or preparation read anywhere | PASS (architecture) |
| Snapshot | Never resolves a recipient by email | PASS (architecture) |
| Snapshot | Never looks for a matching LAGDA account | PASS (architecture) |
| Side effect | No viewed, consent, signature or completion recorded | PASS |
| Side effect | Grant not consumed | PASS |
| Side effect | Immutable snapshot untouched | PASS |
| Side effect | No evidence event written | PASS |
| Side effect | No PDF, storage or sealer | PASS (architecture) |
| Logging | No credential, address or title in any log payload | PASS (architecture) |
| Logging | No credential in any response shape | PASS (architecture) |
| Metrics | Bounded labels | PASS (architecture) |
| Migration | From zero | PASS — `lagda_zero5_test` and `lagda_test`, both from 001 |

## Not covered, and why

**No HTTP route suite.** The use-case and architecture suites cover behaviour
and shape; a `createApp` test would add the cookie attributes, the 401 body, the
rate-limit rejection and the 422 on a malformed body as direct assertions. The
same gap BACKEND-33 left. Worth closing in one pass.

**Session fixation** is asserted structurally rather than through HTTP: the
credential is generated server-side inside the use case and never read from a
request, so an attacker-supplied cookie cannot become the session. A route test
would demonstrate it end to end.

**Cross-realm HTTP tests** (§236–§239) are marked BY COMPOSITION above. The
mechanism is real and centrally tested — scope registration and cookie names —
but there is no test that POSTs a recipient cookie at `/workspaces` and asserts
401. Recorded honestly rather than claimed.

## What each layer cannot prove

**The fakes** cannot prove RLS. Every isolation claim is in integration, as the
runtime role.

**The architecture suite** greps source. Two of its guards were narrowed during
the run, each with the reason recorded at the assertion: a substring `otp` guard
that failed on the declared-but-unreachable method name, and a slice boundary
written as a comment — which `code()` strips, silently taking the whole file.

**The integration suite** is the only place the policies, the settings and the
grants are exercised. Its most valuable assertions are the counts: 1 of 2, and
0 with no setting.
