# Registration Test Matrix — BACKEND-19

**24 application + 15 route + 17 integration tests** (real PostgreSQL, real
Argon2id).

## API

| Case | Result |
|---|---|
| Valid registration returns 201 and safe fields only | **PASS** |
| Malformed email rejected | **PASS** |
| Unknown fields rejected (`role`, `isAdmin`, `emailVerified`, `userId`, ...) | **PASS** |
| MEASURED: a default-configured app STRIPS unknown fields instead | **PASS** |
| Response schema is closed | **PASS** |
| Consent must be exactly `true` | **PASS** |
| Oversized password rejected at the schema | **PASS** |
| Non-object body rejected | **PASS** |
| Only mapped fields reach the use case | **PASS** |
| Optional fields may be omitted | **PASS** |

## Email identity

| Case | Result |
|---|---|
| Trim and lowercase, display form preserved | **PASS** |
| Case variants map to ONE account | **PASS** |
| Gmail dots NOT stripped | **PASS** |
| Plus-addresses NOT stripped | **PASS** |
| `googlemail.com` NOT rewritten | **PASS** |
| Locale-independent lowercasing | **PASS** |
| Empty / overlong / malformed rejected | **PASS** |
| Unicode local part preserved | **PASS** |
| Repository boundary refuses a non-normalized value | **PASS** |
| Duplicate by case variant rejected (real DB) | **PASS** |
| **Six SIMULTANEOUS registrations create exactly one user** | **PASS** |

## Password

| Case | Result |
|---|---|
| Below minimum rejected | **PASS** |
| At minimum accepted | **PASS** |
| At maximum accepted | **PASS** |
| Over maximum rejected | **PASS** |
| Passphrases, unicode, emoji accepted | **PASS** |
| Leading/trailing spaces preserved | **PASS** |
| **Hasher receives the password unaltered** | **PASS** |
| Stored hash is Argon2id with LAGDA's parameters | **PASS** |
| Two hashes of one password differ | **PASS** |
| Hash verifies; wrong password does not | **PASS** |
| Weak Argon2 parameters refused | **PASS** |
| Weaker hash flagged for rehash and still verifies | **PASS** |
| Corrupt hash returns false, does not throw | **PASS** |
| **Plaintext absent from DB, logs and response** | **PASS** |
| Database CHECK refuses a non-Argon2id credential | **PASS** |

## Abuse controls

| Case | Result |
|---|---|
| **Rate limited BEFORE any Argon2 work** | **PASS** |
| No hashing when the password fails policy | **PASS** |
| No hashing when the email is malformed | **PASS** |
| No hashing when the email is already registered | **PASS** |
| No hashing when consent is missing | **PASS** |

## Duplicates and takeover

| Case | Result |
|---|---|
| Duplicate returns 409 | **PASS** |
| **An existing account is never overwritten** | **PASS** |
| **An existing password is never replaced** | **PASS** |
| Unique-constraint race maps to the duplicate outcome | **PASS** |
| Repository raises the application error, not a PG error | **PASS** |

## Verification

| Case | Result |
|---|---|
| New account is unverified | **PASS** |
| Challenge stores a DIGEST, never the raw token | **PASS** |
| Tokens are unique and unpredictable | **PASS** |
| Expiry set and in the future | **PASS** |
| `consumed_at` left null | **PASS** |
| URL built from configuration, not a Host header | **PASS** |
| Token URL-encoded | **PASS** |
| Raw token handed only to a delivery component | **PASS** |
| Response never claims an email was sent | **PASS** |
| Raw token absent from logs | **PASS** |

## Transaction and session

| Case | Result |
|---|---|
| User + challenge commit together | **PASS** |
| Challenge failure rolls back the user | **PASS** |
| **No session cookie issued** | **PASS** |
| Session FK accepts a real user, refuses an unknown one | **PASS** |

## Probes — guarantees verified by breaking them

| Violation | Tests failing |
|---|---|
| Hash before the password policy check | **7** |
| Stop lowercasing the account key | **7** |
| Apply Gmail dot-stripping | **8** |
| Trim the password | **1** |
| Allow weak Argon2 parameters | **1** |
| Hash with argon2i instead of argon2id | **10** |
| Mark a new account email-verified | **1** |
| Store the RAW verification token | **9** |
| Open the request schema | **1** |
| Open the response schema | **1** |
| Return the verification token in the response | **0 — see below** |
| Baseline | **0** |

The token-in-response probe catches nothing because the **response schema strips
the field** before serialization. That is the desired behaviour, and it makes a
leak assertion structurally unable to observe the failure — so the schema's
closure is probed directly instead, and opening it does fail.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` | **PASS — 522** |
| `npm run test:integration` | **PASS** |
| Migration from zero | **PASS — 8 migrations** |
| `npm run check` | **PASS** |

## Not covered

- **No verification redemption test** — BACKEND-21 owns the endpoint.
- **No login test** — BACKEND-20.
- **No end-to-end rate-limit integration on this route.** The policies exist and
  the ORDERING is proven with a hook; binding the real limiter to the route is
  composition work that belongs with the wired application.
- **No Argon2 load measurement** (BACKEND-61).
- **No frontend contract test** — the frontend still uses its mock service; the
  backend matches its existing request/response shape.
