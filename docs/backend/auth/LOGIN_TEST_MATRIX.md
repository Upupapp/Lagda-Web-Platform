# Login Test Matrix — BACKEND-20

**20 login unit + 36 route + 10 integration tests** (real PostgreSQL, real
Argon2id, real session service).

## API

| Case | Result |
|---|---|
| Valid login returns 200 and safe fields only | **PASS** |
| Unknown fields rejected | **PASS** |
| Malformed body rejected | **PASS** |
| No raw token in the response body | **PASS** |
| Response schema is closed | **PASS** |

## Identity and credentials

| Case | Result |
|---|---|
| Same email normalization as registration | **PASS** |
| Every casing registration accepts also authenticates | **PASS** |
| Password NOT normalized (case- and space-sensitive) | **PASS** |
| **A registration-created hash authenticates** | **PASS** |
| Correct password authenticates | **PASS** |
| Wrong password refused | **PASS** |
| Unknown account refused | **PASS** |

## Anti-enumeration

| Case | Result |
|---|---|
| **Unknown account and wrong password give byte-identical responses** | **PASS** |
| Unknown account runs a REAL Argon2 verification | **PASS** |
| Malformed email also runs the dummy path | **PASS** |
| Dummy hash never authenticates | **PASS** |
| No account metadata on failure | **PASS** |
| Cause distinguished in telemetry only | **PASS** |
| No session created on any failure | **PASS** |

## Verification policy

| Case | Result |
|---|---|
| **Unverified account refused after a correct password** | **PASS** |
| Unverified state NOT revealed for a wrong password | **PASS** |
| Verification checked AFTER the password | **PASS** |
| A freshly registered account cannot log in (real DB) | **PASS** |

## Sessions

| Case | Result |
|---|---|
| Fresh credential per login | **PASS** |
| **Session fixation prevented — planted cookie never promoted** | **PASS** |
| Session persisted before any cookie is written | **PASS** |
| Only a digest is stored, never the raw token | **PASS** |
| Multiple sessions coexist; revoking one leaves the other | **PASS** |
| **Revoked credentials no longer authenticate** | **PASS** |
| Concurrent logins produce distinct credentials | **PASS** |
| No cookie when session persistence fails | **PASS** |

## Cookies and CSRF

| Case | Result |
|---|---|
| Session cookie HttpOnly + Secure + SameSite + Path | **PASS** |
| CSRF cookie readable, still Secure | **PASS** |
| **Max-Age is a plausible lifetime in seconds** | **PASS** |
| Cross-site origin rejected before credential work | **PASS** |
| Absent Origin allowed (same-origin browsers omit it) | **PASS** |

## Logout

| Case | Result |
|---|---|
| Revokes the server session and clears both cookies | **PASS** |
| Repeated logout is safe | **PASS** |
| Logout with no session is safe | **PASS** |
| **Failed revocation returns 503, not success** | **PASS** |
| Cookies cleared with the same scope they were written | **PASS** |
| GET is not routed | **PASS** |
| No session identifier in the response | **PASS** |

## Rehash

| Case | Result |
|---|---|
| Upgrades only after a successful login | **PASS** |
| Never on a failed login | **PASS** |
| A failed upgrade does not fail the login | **PASS** |
| No upgrade when the hash is current | **PASS** |

## Redaction

| Case | Result |
|---|---|
| Password absent from trace-level logs and response | **PASS** |
| Session token absent from logs | **PASS** |
| CSRF token absent from logs | **PASS** |

## Probes — guarantees verified by breaking them

| Violation | Tests failing |
|---|---|
| Skip the dummy hash for unknown accounts | **3** |
| Expose unknown-account as its own failure | **4** |
| Check verification before the password | **2** |
| Allow unverified accounts to log in | **4** |
| Rehash before verifying the password | **1** |
| Drop the login origin check | **1** |
| Logout clears the cookie without revoking | **3** |
| Report a failed revocation as success | **1** |
| Clear cookies with a mismatched path | **1** |
| Open the sign-in REQUEST schema | **1** |
| Open the sign-in RESPONSE schema | **1** |
| Return the session token in the response body | **0 — see below** |
| Baseline | **0** |

The token-in-body probe catches nothing because the **response schema strips the
field** before serialization — the same structural case as BACKEND-19. The
schema's closure is probed directly instead, and opening it does fail.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` | **PASS — 578** |
| `npm run test:integration` | **PASS — 241** |
| `npm run check` | **PASS** |
| Migration from zero | **NOT APPLICABLE — no migration added** |

## Not covered

- **No end-to-end rate-limit binding on these routes.** The policies exist and
  the ORDERING is proven with a hook, but attaching the real limiter plugin is
  composition work with the wired app.
- **No CSRF plugin binding on logout.** The route is written as a protected
  mutation; attaching BACKEND-13's `requireSession` and CSRF hook happens at
  composition.
- **No timing benchmark.** Deliberately: microsecond assertions are flaky in CI.
  The dummy path is verified structurally instead.
- **No frontend integration.** The frontend still uses its mock auth service.
