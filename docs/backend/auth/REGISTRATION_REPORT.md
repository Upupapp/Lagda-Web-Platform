# Registration Report — BACKEND-19

## Status

**REGISTRATION CORE: IMPLEMENTED.**
**VERIFICATION EMAIL DELIVERY: BLOCKED — no notification infrastructure exists.**

A registered account cannot currently be verified. The challenge is created and
stored correctly; nothing can deliver the link. Stated here rather than described
as complete.

## What was built

| Piece | Package |
|---|---|
| Canonical email normalization | `@lagda/application` |
| Password policy, `registerUser` use case | `@lagda/application` |
| `PasswordHasher`, `UserRepository`, verification ports | `@lagda/application` |
| Argon2id adapter, verification token factory | `@lagda/api/security` |
| `POST /auth/register` | `@lagda/api/auth` |
| `users`, `email_verification_challenges` (migration 008) | `@lagda/db` |
| Two registration rate-limit policies | `@lagda/application` |

## Measured, not assumed

Every contract decision came from the real frontend and the handoff:

- **Endpoint** `POST /auth/register` — handoff service map.
- **Fields** `name, email, organization?, intendedUse?, consent` plus password —
  `CreateAccountRequest` and `CreateAccount.tsx`.
- **Password minimum 8** — the frontend's `isPasswordAcceptable`.
- **No auto-login** — the form navigates to `/verify-email` and marks the user
  `email-verification-required`.
- **Normalization trim + lowercase** — matches what the form already submits.
- **Consent covers Terms and Privacy Policy** — the checkbox's own wording.

## Numbers

- **24 application tests + 15 route tests + 17 integration tests**
- **522 unit tests overall**, all passing
- **11 security probes**, 10 catching; the eleventh is explained below
- **1 new dependency**: `argon2`. No JWT. No Redis. No email provider SDK.

## Defects and corrections

**The hash-parameter parser examined nothing.** It assumed `m,t,p` ordering from
the PHC examples; the library emits `m,p,t`, so it returned null for every real
hash and the Argon2id assertion silently passed over it. Now parsed as an
unordered key/value list.

**A handler-level unknown-field guard could never fire.** Written as defence in
depth, then deleted: Fastify's default AJV strips unknown properties before the
handler runs, so `Object.keys(body)` cannot see them. It read as protection while
being incapable of firing. The real control is `removeAdditional: false` on the
app, and both behaviours are now measured by tests.

**Three probes initially caught nothing**, each a missing test rather than
missing code: nothing asserted the use case hands the hasher an unaltered
password, nothing asserted the response schema is closed, and the unknown-field
probe was aimed at the dead guard rather than the schema.

## The one probe that cannot catch

Adding `verificationToken` to the response object breaks no test — because the
**response schema strips it** before serialization. That is the desired behaviour
and it makes a leak assertion unable to observe the failure. The schema's
closure is therefore probed directly, and opening it does break a test. The chain
is complete; it just cannot be demonstrated from the leak side.

## What does NOT exist

- **No login, logout, password reset, MFA or OTP.**
- **No verification delivery** (BACKEND-44/45) and therefore no way to verify.
- **No verification redemption endpoint** (BACKEND-21).
- **No workspace creation, no invitation acceptance, no profile editing.**
- **No session issued by registration**, by design.
- **No registration IP or user agent stored.**

## eNotary

Untouched. LAGDA eNotary is Coming Soon and Subject to Supreme Court
Accreditation and applicable rules.

## Reading order

1. **ADR-014** — account identity and password hashing
2. **EMAIL_IDENTITY.md** — the canonical rule every auth flow must reuse
3. **PASSWORD_SECURITY.md** — Argon2id, parameters, policy, redaction
4. **REGISTRATION_ARCHITECTURE.md** — the flow, contract, session policy
5. **REGISTRATION_DATA_CLASSIFICATION.md** — what may be stored, logged, returned
6. **REGISTRATION_TEST_MATRIX.md** — what is proven, and what is not
