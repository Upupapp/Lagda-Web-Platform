# Email Verification Report — BACKEND-21

## Status

**VERIFICATION CORE: IMPLEMENTED.**
**DELIVERY: BLOCKED — no notification infrastructure exists.**

The full lifecycle works and is proven against real PostgreSQL. Nothing delivers
the code, so in production a user cannot receive one. Unchanged from BACKEND-19,
and stated rather than implied.

## What was built

| Piece | Package |
|---|---|
| `verifyEmail`, `resendEmailVerification` | `@lagda/application` |
| Typed-code credential, canonicalizer, digester, link builder | `@lagda/api/security` |
| `POST /auth/verify-email`, `POST /auth/resend-verification` | `@lagda/api/auth` |
| Challenge repository, `markEmailVerifiedIfUnverified` | `@lagda/db` |
| Migration 009 — `superseded_at`, partial unique index, CHECK | `@lagda/db` |
| Three rate-limit policies | `@lagda/application` |

**No new dependency.** No JWT, no Redis, no email SDK.

## The credential changed, deliberately

BACKEND-19 generated a 43-character base64url link token. The product does not
work that way: `VerifyEmail.tsx` collects a **typed code**. A 12-character
Crockford base32 code (~60 bits) is typeable and still unguessable, and can be
embedded in a link later; a link token could never be typed.

Confirmed with the user before building on it. See ADR-015.

## Numbers

- **21 integration tests** against real PostgreSQL + **50 auth route tests**
- **575 unit tests**, **262 integration**, all passing
- **11 probes**, all catching
- **9 migrations** from zero

## Three controls that nothing tested

Each was masked by a redundant application-level check, so a probe removing the
real control broke nothing:

- **`consumeIfActive`'s WHERE clause** — the use case checks the same states
  first, so removing the conditions changed no behaviour under test. The
  authoritative single-transition guarantee turned out to be
  `markEmailVerifiedIfUnverified`, with the conditional consume as defence in
  depth. Both are now tested directly at the repository.
- **`WHERE email_verified_at IS NULL`** — same shape.
- **The digest's domain prefix** — nothing compared it against a bare hash.

Defence in depth is right. Untested defence in depth is deletable.

## A provenance check that checked nothing

`sources every threshold` asserted `toMatch(/handoff/)` — which any string
containing the word satisfies, including "not specified by the handoff". It read
as a provenance rule while accepting anything that mentioned the document.

Now a source must either cite a handoff section (`handoff §317`) or say plainly
that the handoff is silent. Both are honest; a bare assertion is not.

## What does NOT exist

- **No delivery.** BACKEND-44/45.
- **No password recovery, MFA, OTP login, social login or SSO.**
- **No workspace invitation acceptance** on verification — BACKEND-26 owns it,
  and a verified address can be matched to invites later.
- **No auto-login after verification.** The user signs in, which is what the
  frontend does.
- **No challenge cleanup job.** Records are retained; retention policy is
  unresolved.
- **No account status beyond verified/unverified.** The frontend mock has a
  `locked` scenario; no such column exists and none was invented.

## eNotary

Untouched. LAGDA eNotary is Coming Soon and Subject to Supreme Court
Accreditation and applicable rules.

## Reading order

1. **ADR-015** — why a typed code, and what was rejected
2. **EMAIL_VERIFICATION_ARCHITECTURE.md** — states, transactions, concurrency
3. **EMAIL_VERIFICATION_SECURITY.md** — threats and controls
4. **EMAIL_VERIFICATION_DATA_CLASSIFICATION.md** — what may be stored or logged
5. **EMAIL_VERIFICATION_TEST_MATRIX.md** — what is proven, and what is not
