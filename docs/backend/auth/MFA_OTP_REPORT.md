# BACKEND-23 — MFA / OTP report

## Product decision

| Flow | Status | Why |
|---|---|---|
| **TOTP** | **IMPLEMENTED** | The product's only account MFA factor |
| **MFA enrolment** | **IMPLEMENTED** | `MfaSetup.tsx`, route status `implemented` |
| **Recovery codes** | **IMPLEMENTED** | `RecoveryCodes.tsx`, `/mfa/recovery` |
| **MFA disable** | **IMPLEMENTED** | Settings model and `/app/settings/security/mfa` |
| **Email OTP (account login)** | **NOT_IN_PRODUCT** | No such flow. The product's "Email OTP" is *signer authentication* for recipients — a different subject, a different command |
| **SMS OTP** | **NOT_IN_PRODUCT** | No phone number is collected anywhere |
| **Delivered-code OTP challenge** | **NOT_IN_PRODUCT** | TOTP codes are computed, not issued. A challenge table would have no writer |
| **Step-up** | **DEFERRED** | No operation requires recent-MFA re-proof |
| **Passkeys / SSO / social** | **NOT_IN_PRODUCT** | Out of scope |

## Routes

| Method | Path | Authorized by | Success |
|---|---|---|---|
| POST | `/auth/sign-in` | public | 200 `{status:"authenticated"}` **or** 200 `{status:"mfa-required",factor:"TOTP"}` |
| POST | `/auth/mfa/verify` | pre-auth cookie | 200 `{status:"authenticated",userId}` |
| POST | `/auth/mfa/enroll` | full session | 200 `{provisioningUri,secret}` |
| POST | `/auth/mfa/confirm` | full session | 200 `{status:"enabled",recoveryCodes}` |
| POST | `/auth/mfa/disable` | full session **+ password** | 200 `{status:"disabled"}` |

No `/auth/mfa/resend` — TOTP has nothing to resend.

## Tables (migration 011)

`mfa_factors` — encrypted secret, key version, `verified_at`, `disabled_at`,
`last_used_time_step`. Partial unique index: one active factor per type per user.
CHECK: known factor type; a verified factor must carry a secret.

`mfa_recovery_codes` — digest-only, unique, single-use.

`pending_authentications` — credential digest (unique), absolute `expires_at`,
`failed_attempts`, `max_attempts`, `authentication_method`. CHECK bounds the
counter. Deliberately NOT unique per user: logging in on a phone and a laptop at
once is legitimate.

## Policy decisions

| Decision | Value | Source |
|---|---|---|
| Max attempts per ceremony | **5** | handoff §145 |
| Ceremony lifetime | **10 minutes**, absolute, never extended | chosen |
| TOTP parameters | SHA-1 / 6 / 30s | universal authenticator default |
| Clock skew | **±1 step** | chosen; narrow deliberately |
| Recovery codes | **10**, 60 bits each | chosen |
| Post-reset MFA | stays **enabled** | §197 Model A |
| Auto-login after enrolment | **no** | enrolment is not authentication |

## Dependencies

**`otpauth@9.5.1`** — one maintained, standards-compliant TOTP library. A
hand-rolled HMAC-OTP appears to work while being subtly wrong about counter
endianness or truncation, in a way no test written by its own author catches.

**Not introduced:** JWT, Redis, Passport, Twilio or any SMS SDK, any second
hashing library, any second OTP library.

## Verification

| Gate | Result |
|---|---|
| typecheck / lint / build | **PASS** |
| unit tests | **PASS** — 615 |
| `npm run check` | **PASS** |
| integration | **PASS** — 340 |
| migration from zero | **PASS** — 11 migrations on a clean database |
| probes | **19 of 21 catch**; 2 recorded below |

## Honest gaps

**Still nothing is composed.** No auth route — register, sign-in, sign-out,
verify, resend, forgot, reset, and now four MFA routes — is registered in
`createApp`. Fourteen rate-limit policies are defined and none is bound. This is
now much more serious than in BACKEND-22: `authenticatedUser` and `issueSession`
are route *options*, so the guarantee that a pre-auth credential cannot resolve a
user is currently a property of a test double rather than of a running
application. **OD-069 is the top blocker.**

**Key management is one key in an environment variable.** No KMS, no rotation, no
escrow. Better than plaintext; not a key-management system. OD-081.

**Two probes caught nothing, for different reasons.** The TOTP-path consume guard
is unreachable while the replay watermark serializes first — genuine defence in
depth, and the equivalent guard on the recovery path IS reachable and is now
tested (3/3). The secret-box tag-length guard is redundant with GCM's own
authentication, which is tested directly.

**Four probes initially caught nothing and exposed real gaps**, since fixed:
repository conditions masked by redundant application checks, an untested skew
window, a route test that passed vacuously because its stub returned
`valid: false` for the replay case, and two concurrency paths no test reached.

**One flaky full-suite run.** A single run of the complete integration suite
reported 2 failures; four subsequent full runs and five MFA-only runs were clean
and the failing test names were not captured. Cause unidentified — recorded
rather than dismissed.

**Delivery is still blocked** for verification and password-reset email. TOTP
needs none, so MFA is the first auth feature that is end-to-end usable.
