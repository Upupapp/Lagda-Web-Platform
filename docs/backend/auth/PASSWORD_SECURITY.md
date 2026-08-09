# Password Security — BACKEND-19

## Algorithm: Argon2id

`argon2@0.45.1`, imported by exactly one file
(`packages/api/src/security/password-hasher.ts`) and reached everywhere else
through the `PasswordHasher` port (INV-242).

**Why Argon2id.** It is memory-hard, which is what makes offline cracking
expensive on the hardware attackers actually use: a GPU can compute SHA-256
billions of times per second but cannot cheaply allocate 19 MiB per guess. The
`id` variant combines Argon2i's side-channel resistance with Argon2d's
resistance to time-memory trade-offs, and is what RFC 9106 recommends for
password storage.

**Not bcrypt** — not memory-hard, and it silently truncates at 72 bytes, which
means two different long passwords authenticate one account. **Not PBKDF2** —
cheap to parallelise. **Not a bare SHA family** — not a password hash at all.

## Parameters

| Parameter | Value | Meaning |
|---|---|---|
| `memoryCost` | **19 456 KiB** (19 MiB) | The memory-hardness. The number that actually costs an attacker. |
| `timeCost` | **2** | Iterations over that memory. |
| `parallelism` | **1** | One lane. Node hashes on a libuv thread; extra lanes compete with the waiting request. |

From RFC 9106's second recommended configuration. **Explicit, never the
library's defaults** — a default is a value that changes underneath a deployment
without anyone deciding to change it, and password parameters are exactly the
thing that must be deliberate.

**Floors are enforced.** Constructing a hasher below `memoryCost 19456` or
`timeCost 2` throws. Configuration that could set `memoryCost: 8` would look
like it was hashing passwords while providing almost none of the protection —
the failure mode where a control exists and does nothing. Removing the floor
check makes a test fail.

The cost is real and intentional: tens of milliseconds and 19 MiB per hash. That
is exactly why registration is rate limited **before** hashing (INV-234), and
why BACKEND-61 should measure before raising these.

## Policy

| Rule | Value | Source |
|---|---|---|
| Minimum length | **8** | MEASURED from the real frontend `isPasswordAcceptable` |
| Maximum length | **1024** | A resource bound, not a security rule |
| Composition rules | **none** | The product specifies none |

**Minimum 8** matches the registration form. The handoff specifies no password
policy, so the UI is the only stated requirement, and a server minimum stricter
than the UI would reject passwords the UI told the user were fine. It is on the
low side of modern guidance and is recorded as an open decision (OD-063) rather
than presented as a considered security target.

**Maximum 1024** exists because Argon2id hashes whatever it is given, and a
multi-megabyte "password" is a cheap way to make the server do expensive work.
Over-limit input is **rejected, never truncated** — truncation would mean two
different passwords authenticate the same account.

**No forced uppercase/digit/symbol.** Composition rules push users toward
`Password1!` — predictable, and shorter than a passphrase that would be
stronger.

## The password is never altered

Not trimmed, not lowercased, not Unicode-normalized. It is an opaque byte
sequence: a leading space may be deliberate, and altering it would mean the
password a user typed is not the password LAGDA stored (INV-233).

The request schema deliberately applies no "trim all strings" transform, which
would silently break this. A probe that trimmed the password inside the use case
makes a test fail.

Passphrases, emoji and CJK text are all accepted and tested.

## Storage

One column, `users.password_hash`, holding the standard PHC-encoded string:

```
$argon2id$v=19$m=19456,p=1,t=2$<salt>$<hash>
```

Algorithm, version, parameters, salt and hash together. **No separate salt
column** — the library generates a cryptographically random salt per hash and
encodes it, and managing salts by hand is a way to get it wrong. Two hashes of
the same password are different, which is tested.

A **database CHECK constraint** requires the value to start with `$argon2id$`,
so a bug that wrote a plaintext password or a weaker hash is refused by
PostgreSQL rather than discovered at login (INV-243). Tested by attempting the
insert directly.

Note the parameter order is `m,p,t` as the library emits it — the first version
of the parser assumed `m,t,p` from the PHC examples and returned null for every
real hash, a check that silently examined nothing. The parser now reads the
parameters as an unordered key/value list.

## Never logged, never returned

- Plaintext: reaches the hasher and nothing else. Tested with a marker string
  against captured logger output at `trace` level, the response body, and every
  column of the stored row.
- The hash: sensitive. Not in any public projection — `UserRecord` has no field
  for it, so it cannot be serialized by accident. `AuthUserRecord` is the one
  type that carries it, and BACKEND-20 is its only intended consumer.
- Argon2 internals never appear in an error message. A password rejection states
  the length rule, not what algorithm failed.

## Verification and rehashing

`verify` reads parameters from the **encoded hash**, not from current settings,
so a password hashed under older parameters still verifies. That is what makes
raising the parameters later a safe, non-breaking change.

`needsRehash` reports whether a stored hash used weaker settings than current
policy. **BACKEND-20** can rehash on successful login, when the plaintext is
briefly available again. Tested: a hash made at 19 MiB is flagged by a 64 MiB
policy and still verifies under it.

A corrupt or unparseable hash returns `false` rather than throwing, so a bad row
does not become a 500 that distinguishes it from a wrong password.

## Event loop

The library's **async** API runs the hash on a libuv thread. A synchronous hash
would stall every other in-flight request for tens of milliseconds.

## Not implemented at BACKEND-19

- **No login.** `verify` existed on the port because BACKEND-20 would need it.
  *(BACKEND-20 has since implemented login and rehash-on-login — see below.)*
- **No breached-password checking.** Worth considering later; it needs a data
  source and a privacy decision about how a password prefix is queried.
- **No password reset, no MFA.** Still true.

## Verification at login (BACKEND-20)

`PasswordHasher.verify` reads Argon2 parameters from the ENCODED HASH, not from
current settings, so a password hashed under older parameters still verifies.

**The dummy hash.** An unknown account still runs a real verification against a
fixed Argon2id hash that authenticates nobody, so response time does not reveal
whether an account exists (INV-250). It is derived ONCE at startup from a random
secret nobody keeps - per-request generation would double the cost of every
unknown-account attempt.

It is not a credential: no account references it, and no password matches it.
It is still not logged, because a fixed hash in logs invites confusion with a
real one.

**Rehash on login** is implemented: if `needsRehash` reports a stored hash below
current policy, it is upgraded after a SUCCESSFUL verification, outside any
transaction, and a failure to persist the upgrade never fails the login.

**Timing defence** is the dummy path plus one public error, not artificial
delays. Constant-time padding was rejected: it is easy to get wrong, it slows
every legitimate login, and it does not remove the difference it hides.

## Password reset uses this policy unchanged (BACKEND-22)

`resetPassword` imports `checkPassword` from the registration module rather than
restating the rule. Same minimum (8), same maximum (1024), same absence of
composition requirements, same treatment of whitespace and Unicode — a reset
password is not trimmed, folded or normalized, exactly as at registration.

The Argon2id parameters are the same too, because both paths go through the same
`PasswordHasher` port. There is no reset-specific hasher and no reset-specific
column.

A probe that weakened the reset policy to accept short passwords was caught by
three tests. That matters because a weaker reset path is invisible: the signup
form still enforces the strong rule, so nobody notices until an account holds a
password the product would have refused to create.

Argon2 runs **outside** the reset transaction — see
PASSWORD_RECOVERY_ARCHITECTURE.md for why, and what revalidates afterwards.
