# Email Verification Architecture — BACKEND-21

This proves control of the registered **mailbox**, to the level that receiving a
code implies. It is not identity verification, not KYC, and not notarial
identification — nothing here establishes who a person is.

## The credential is a typed CODE

**MEASURED, and it changed the design.** `VerifyEmail.tsx` presents a field the
user types into and calls `verifyEmail(code)`. BACKEND-19 had generated a
43-character base64url link token, which nobody types.

```
K7QM-2X9F-P4TB      12 characters, Crockford base32, ~60 bits
```

| Property | Value |
|---|---|
| Alphabet | Crockford base32 — no `I`, `L`, `O`, `U` |
| Length | 12 characters (32¹² ≈ 2⁶⁰) |
| Display | grouped `XXXX-XXXX-XXXX` |
| Input | case-insensitive; `-`, spaces, `O`→`0`, `I`/`L`→`1` accepted |
| Stored | SHA-256 digest with a `lagda.email-verify:` prefix. **Never the code.** |

`I`, `L` and `O` are absent because a person reads this off a screen and types
it. `U` is excluded to avoid generating accidental obscenities.

**Entropy stands on its own.** At an unrealistic 10 000 guesses per second,
searching 0.1% of the space takes over three thousand years. Rate limiting is
defence in depth, not what makes the code safe.

Character selection uses rejection sampling. `byte % 32` happens to be unbiased
for a 32-character alphabet, but the property is written explicitly so it
survives someone changing the alphabet.

Every accepted input variant maps to exactly ONE canonical value before
digesting, so tolerance costs no entropy.

## Challenge states

There is no persisted `status` column. State is **derived**:

```
ACTIVE          consumed_at IS NULL AND superseded_at IS NULL
  ↓ redeem      → CONSUMED     (consumed_at set)
  ↓ resend      → SUPERSEDED   (superseded_at set)

EXPIRED         derived: expires_at <= now, no column, no job
```

`consumed_at` and `superseded_at` are **separate columns**. Overloading one
would destroy the distinction exactly where it matters — an incident review
needs to know whether a code was *used* or merely *rotated*. A CHECK constraint
forbids both being set, so "was this code used?" can never have two answers.

Expiry is derived rather than stored because a status column needs a job to keep
it true, and the day that job falls behind, the column lies.

## One active challenge, enforced by PostgreSQL

```sql
create unique index email_verification_one_active
  on email_verification_challenges (user_id)
  where consumed_at is null and superseded_at is null
```

A **partial unique index**. This is what makes two concurrent resends unable to
leave two live codes — the second insert is rejected by the database, not by a
check the first already passed.

Expiry is deliberately not in the predicate: `now()` is not immutable and cannot
appear in an index, and it does not need to. A resend supersedes any prior
unconsumed challenge regardless of expiry before inserting the replacement.

## Verification transaction

```
digest the submitted code       malformed → rejected with no query
BEGIN
  find by digest                indexed, unique — never a scan
  superseded?  → invalid
  consumed?    → already-verified if the account is verified
  expired?     → invalid
  consumeIfActive               CONDITIONAL update
  markEmailVerifiedIfUnverified CONDITIONAL update
  supersede any other active challenge
COMMIT
```

Both writes are **conditional updates** — the condition lives in the `WHERE`
clause, never in a preceding read. A read-then-write leaves a window in which
two requests both see an active challenge.

`markEmailVerifiedIfUnverified` carries `WHERE email_verified_at IS NULL`, which
keeps the **first** verification time historically true. A repeat redemption can
never move it forward.

Nothing external happens inside the transaction — no email, no HTTP, no hashing.

## Resend transaction

```
generate the code               BEFORE the transaction; discarded if it rolls back
BEGIN
  look up by normalized email
  unknown or already verified → no challenge, no email
  supersede active challenges
  create the new challenge     digest only
  schedule delivery            INSIDE the transaction
COMMIT
```

**Delivery scheduling sits inside the transaction, and that placement is the
whole point.** If it fails, the rotation rolls back and the user keeps the code
they already have. Rotating first and scheduling after would invalidate a
working code and then fail to send its replacement, stranding the account with
no way in.

Supersede-then-insert is also what lets the partial unique index permit the
write, and what makes concurrent resends serialize.

## Concurrency

| Race | Behaviour |
|---|---|
| Same code submitted 8× at once | Exactly **one** first-time verification; the rest see already-verified |
| Two resends at once | Exactly **one** active challenge survives |
| Verify vs resend | Whichever commits first wins; the loser's code is superseded or already consumed |
| Already-verified account resending | No challenge, no email |

All four are tested against real PostgreSQL.

## Anti-enumeration

**Resend returns one response for everything.** Unknown address,
already-verified account and successful rotation are indistinguishable —
`202 { accepted: true }`. Unlike registration, the caller has asserted nothing
about owning this address, so this matters more.

The route **discards** the use case's return value, so the internal reason
cannot reach the response by accident.

**Verification collapses every failure** into `422
INVALID_OR_EXPIRED_VERIFICATION_CODE`. Unknown, expired, consumed and superseded
are one public answer; distinguishing them would tell someone submitting random
codes which ones ever existed.

## Both routes are POST

Email security scanners and messaging clients fetch every link in a message
before a human sees it. A GET that consumed a code would let a scanner verify an
account, or burn the code so the real user cannot.

The product already avoids this: the user types a code into a page and submits
it. Nothing is consumed by merely opening a page. **If a link is added later it
must land on that page, not on the API.**

## What a code authorizes

Exactly one thing: verifying the account it was issued for. It is never a
session, never a password-reset credential, never workspace access. Verification
issues **no session** — the user signs in afterwards, which is what the frontend
does.

Domain separation is enforced in the digest prefix, so a verification code and a
session token that happened to be the same string cannot produce the same
digest.

## Login interaction

BACKEND-20 blocks unverified accounts. After successful verification the same
credentials authenticate — proven end to end:

```
register → login BLOCKED → verify → login SUCCEEDS
```

Verification state is **server-authoritative**. It is not a cookie claim, so it
cannot go stale.
