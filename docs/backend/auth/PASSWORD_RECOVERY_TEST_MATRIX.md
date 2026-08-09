# BACKEND-22 — Password recovery test matrix

34 integration tests against real PostgreSQL, 19 route tests, 17 probes.

| Area | Case | Result |
|---|---|---|
| Request | known account generic success | **PASS** |
| Request | unknown account generic success | **PASS** |
| Request | public response equivalence (status, body, headers) | **PASS** |
| Request | never 404 for unknown | **PASS** |
| Request | no account created for unknown | **PASS** |
| Request | same email normalization as registration | **PASS** |
| Request | unverified account eligible | **PASS** |
| Request | unknown fields rejected | **PASS** |
| Request | rate limited | **NOT BOUND** — policies defined, no route composition |
| Challenge | secure token, 256 bits | **PASS** |
| Challenge | raw token not stored | **PASS** |
| Challenge | digest is domain-separated | **PASS** |
| Challenge | expiry | **PASS** |
| Challenge | one active per user (DB index) | **PASS** |
| Challenge | supersession on re-request | **PASS** |
| Challenge | concurrent request → one active | **PASS** |
| Challenge | consumed+superseded refused by CHECK | **PASS** |
| Delivery | durable intent atomic (rollback keeps old token usable) | **PASS** |
| Delivery | provider send | **BLOCKED** — no notification infrastructure |
| Reset | valid token | **PASS** |
| Reset | malformed token | **PASS** |
| Reset | unknown token | **PASS** |
| Reset | expired token | **PASS** |
| Reset | superseded token | **PASS** |
| Reset | consumed token (lost-response replay) | **PASS** |
| Reset | concurrent same-token reset — one password wins | **PASS** |
| Reset | reset vs new request race | **PASS** |
| Reset | all failures collapse to one code | **PASS** |
| Reset | unknown fields rejected | **PASS** |
| Reset | new request after success | **PASS** |
| Password | registration policy reused, boundaries | **PASS** |
| Password | rejection does not consume the challenge | **PASS** |
| Password | Argon2id | **PASS** |
| Password | plaintext not persisted | **PASS** |
| Password | rejected before hashing | **PASS** |
| Password | dead token rejected before hashing | **PASS** |
| Password | hash precedes the transaction | **PASS** |
| Password | old password invalid | **PASS** |
| Password | new password valid | **PASS** |
| Session | all sessions revoked | **PASS** |
| Session | revocation reason `password-change` | **PASS** |
| Session | pre-reset session no longer resolves | **PASS** |
| Session | post-reset session unaffected | **PASS** |
| Session | old cookie / CSRF invalid | **PASS** — via server-side revocation |
| Session | cookies cleared, none issued | **PASS** |
| Session | no auto-login | **PASS** |
| Email state | verification state unchanged (verified) | **PASS** |
| Email state | verification state unchanged (unverified) | **PASS** |
| Link | configured base URL only | **PASS** |
| Link | no email in URL | **PASS** |
| Link | GET does not mutate or consume | **PASS** |
| Security | token absent from responses | **PASS** |
| Security | password absent from responses | **PASS** |
| Security | hash absent from responses | **PASS** |
| Migration | from zero on a clean database | **PASS** |

## Probes — 17 of 17 catch

accept an expired token · accept a superseded token · accept a consumed token ·
consume without the active conditions · ignore a lost consume race · skip
session revocation · weaken the reset password policy · verify the email during
reset · rotate without superseding · schedule delivery outside the transaction ·
leak account existence from forgot-password · expose the exact token failure
reason · shorten the token to 4 bytes · drop the digest domain prefix · ignore
the configured base URL · open the reset request schema · stop clearing session
cookies

`drop the digest domain prefix` caught **nothing** on the first run. The test
was rewritten; it now catches.
