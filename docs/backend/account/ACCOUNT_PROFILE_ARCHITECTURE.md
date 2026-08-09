# Account and profile architecture

## Four kinds of state, one table

`users` holds all four, which is why the boundary between them has to be
structural rather than a matter of care:

| Kind | Examples | Who may write it |
|---|---|---|
| **ACCOUNT IDENTITY** | `email`, `normalized_email`, `email_verified_at` | Registration and email verification only |
| **SECURITY STATE** | `password_hash`, MFA factors, sessions, challenges | Dedicated security use cases (BACKEND-19–23, and `changeCurrentPassword` here) |
| **PROFILE** | full name, display name, job title, department, sender name | `updateCurrentUserProfile` |
| **PREFERENCES** | timezone, locale, formats, appearance | `updateCurrentUserPreferences` |

`AccountProfileRepository` exposes exactly three methods —
`findCurrentUser`, `updateProfile`, `updatePreferences` — and the two writers
name their columns explicitly. **There is no `update(userId, fields)`.**

That absence is the mass-assignment defence. Not a denylist someone must extend
when a column is added; a missing capability. A profile handler cannot set
`email_verified_at` because no function exists to call.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/me` | Safe projection; `no-store` |
| PATCH | `/me/profile` | Five fields, closed schema |
| PATCH | `/me/preferences` | Closed vocabularies |
| POST | `/me/password` | Requires the CURRENT password |
| GET | `/me/sessions` | The caller's own, no credentials |
| POST | `/me/sessions/revoke` | One session, or all others |

**No user id appears in any path or any schema.** With no `:userId` segment and
no `userId` field, "user A edits user B" is not a request that can be
expressed — there is no authorization comparison that could be written wrongly.

## The current-user projection

`CurrentUser` has no `passwordHash`, no `normalizedEmail`, no session, no MFA
secret, no challenge state. A field that is not on the type cannot be
serialized by accident — and probing confirmed this: an attempt to place an
encrypted TOTP secret into the response **did not compile**.

`emailVerified` is derived. The timestamp is not exposed; the product renders a
badge, not a date.

The MFA summary is `{ mfaEnabled, mfaFactor, recoveryCodesRemaining }`. Never
the secret, the key version, the replay watermark, or any challenge.

## Names

A single `fullName`, matching the product. Not `firstName`/`lastName`.

Validation rejects control characters and bounds length. It does **not** apply
an ASCII allowlist: `José Rizal`, `Ng`, `D'Souza`, `de la Cruz-Santos`, `李小龍`
are all accepted, and all are tested. A `/^[a-zA-Z ]+$/` would reject a large
share of this product's own users, and rejecting punctuation is not an XSS
defence anyway — profile text is stored as data and escaped by whatever renders
it.

## Preferences

Explicit typed columns with database CHECKs, not a `preferences jsonb` bag. A
value the product cannot render is not storable.

Timezone is an **IANA identifier**, validated twice: a shape check that rejects
offsets, and a runtime check against real zone data. Both are needed —
`Intl.DateTimeFormat` **accepts `"+08:00"`**, measured rather than assumed, so a
runtime-only check would have stored raw offsets. An offset is wrong twice a
year wherever daylight saving applies and cannot be corrected without knowing
the zone it came from.

An absent key leaves a stored preference alone; an explicit `null` clears it.

## Password change

Requires the **current password**. A valid session is not sufficient: changing a
password from a stolen session would lock the real owner out using nothing but
the theft.

Both Argon2 operations run outside the transaction. Inside it: replace the hash,
revoke every OTHER session, revoke pending MFA ceremonies.

**The caller's own session survives.** Signing someone out of the browser they
just used to change their password teaches users that the security action they
were told to take breaks things. Every other session dies, because the reason to
change a password is usually the suspicion that someone else has one.

## Sessions

The projection carries `sessionId`, `createdAt`, `lastSeenAt`, `expiresAt`,
`isCurrent` — no token, no digest, no IP, no user agent. The product's own page
states it shows none of those, and the backend records none of them.

Revocation is scoped by user **and** session id. A revoke keyed on the session
alone would let anyone who learned an identifier sign another account out;
"not found" covers both "no such session" and "not yours", so this is not an
oracle for which identifiers exist.
