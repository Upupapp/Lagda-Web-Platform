# Email Identity — BACKEND-19

**One normalization rule for the entire backend.** Registration, login, password
reset, email verification and invitation acceptance must all resolve an account
through `normalizeEmail`. Two of them disagreeing produces either a duplicate
account or an authentication bypass (INV-231).

Declared in `packages/application/src/auth/email-identity.ts`. That file is the
reason `.toLowerCase()` must not appear next to an email anywhere else.

## The rule

**Trim, then lowercase. Nothing else.**

```
"  User@Example.COM  "  →  lookup: "user@example.com"   display: "User@Example.COM"
```

Two values are kept:

| | Purpose |
|---|---|
| `normalized_email` | Canonical identity. Unique constraint. Every lookup. |
| `email` | What the user typed. Display, and addressing mail. |

The display form is never used for lookup, so the two cannot drift into
disagreeing about who an account belongs to.

## Examples

| Input | Normalized | Same account as `user@example.com`? |
|---|---|---|
| `user@example.com` | `user@example.com` | — |
| `User@Example.com` | `user@example.com` | **yes** |
| `  USER@EXAMPLE.COM  ` | `user@example.com` | **yes** |
| `user+tag@example.com` | `user+tag@example.com` | **no** |
| `us.er@example.com` | `us.er@example.com` | **no** |
| `user@googlemail.com` | `user@googlemail.com` | **no** |
| `josé@example.com` | `josé@example.com` | **no** |

## What LAGDA deliberately does NOT do

**No Gmail dot-stripping.** `john.smith@gmail.com` and `johnsmith@gmail.com`
stay distinct. Gmail ignores dots; almost nothing else does. Applying the rewrite
would merge two genuinely different mailboxes into one account — in an
authentication system that is an account takeover primitive, not a convenience.

**No plus-address stripping.** `user+lagda@example.com` is its own identity.
Tagging is a legitimate way to keep separate accounts.

**No `googlemail.com` → `gmail.com` mapping.** A provider-specific fact that
will not stay true for every provider LAGDA's users have.

**No Unicode normalization.** Two visually identical addresses with different
code points remain distinct. Conservative and predictable; a normalization form
chosen carelessly can merge addresses that different mail servers treat
differently.

Each rewrite LAGDA skips has the same failure shape: it turns a mailbox someone
controls into one they may not.

## Lowercasing is a real trade-off

RFC 5321 makes the **local part** case-sensitive, so `User@x.com` and
`user@x.com` are formally two mailboxes. LAGDA folds them into one anyway,
because:

- no mail provider in practice distinguishes them;
- users type their own address inconsistently;
- the real registration form already lowercases before submitting;
- treating them as two accounts produces silent duplicates and failed logins,
  which is a far worse outcome than the theoretical one it avoids.

Stated here rather than left implicit, because it is a decision, not an
accident.

## Locale independence

Lowercasing uses `toLocaleLowerCase("en-US")`, not `toLowerCase()`. The
unqualified form is affected by the ambient locale for a handful of characters —
the Turkish dotless `i` being the well-known case — and an account key that
depends on the server's locale is a key that changes when the server does.

## Validation

Structure only:

- non-empty after trimming;
- at most **254** characters, matching the database column and RFC 5321's path
  limit;
- one `@`, a local part, a domain containing a dot, no whitespace.

A regex cannot decide whether a mailbox exists or accepts mail — only delivery
can, which is what email verification is for. Attempting RFC 5322 in a pattern
produces something unreadable that still rejects valid addresses.

## Repository boundary

`assertNormalized` throws if a value reaching a repository was not produced by
`normalizeEmail`. A database adapter that lowercased independently would be a
second normalization rule, and the two would drift.

## Uniqueness

`users.normalized_email` carries a **UNIQUE constraint**. An application
pre-check improves behaviour but races with itself — two simultaneous
registrations both pass it. The constraint is what actually decides, proven by
six concurrent registrations producing exactly one row.

## For BACKEND-20 and beyond

Login, password reset, email verification and invitations **must** call
`normalizeEmail` and look up by `normalized_email`. A flow that lowercases its
own way, or queries the display column, will silently fail to find accounts that
registration created.

## Consumers (BACKEND-20)

`loginUser` calls `normalizeEmail` and looks up by `normalized_email` - the same
function and the same column registration writes. An integration test registers
with one casing and authenticates with three others against real PostgreSQL.

Still to come: password reset (BACKEND-22), email verification redemption
(BACKEND-21) and invitation acceptance. Each must use this normalizer; a flow
that lowercases its own way will silently fail to find accounts.
