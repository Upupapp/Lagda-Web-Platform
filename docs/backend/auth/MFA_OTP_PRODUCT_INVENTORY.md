# MFA / OTP — product inventory

Taken from the **actual frontend**, not from the command title. BACKEND-23 §0.

## What the product actually has

| Surface | File / route | Status in `routes.ts` |
|---|---|---|
| Login MFA challenge | `pages/auth/MfaChallenge.tsx`, `/mfa` | **planned** |
| MFA enrolment | `pages/auth/MfaSetup.tsx`, `/mfa/setup` | implemented |
| Recovery codes entry | `pages/auth/RecoveryCodes.tsx`, `/mfa/recovery` | implemented |
| MFA settings | `pages/platform/settings/MfaPage.tsx`, `/app/settings/security/mfa` | implemented |
| Onboarding opt-in | `pages/onboarding/OnboardingSecurity.tsx` | — |
| OTP input component | `components/ui/input-otp.tsx` | — |

## The factor is TOTP

`MfaChallenge.tsx` says, verbatim:

> "Enter the 6-digit code from your **authenticator app**."

`MfaSetup.tsx` runs `intro → scan → confirm → codes`: a QR code and a manual
setup key, then a 6-digit code from the authenticator to confirm, then recovery
codes. That is RFC 6238 TOTP enrolment and nothing else.

**There is no email-OTP or SMS login flow anywhere in the product.**

## The "Email OTP" in the product is something else entirely

`pricing.config.ts`, `product-capability-registry.ts` and two public marketing
routes advertise "Email OTP":

> `/features/signer-authentication` — "Require email OTP, access codes, or
> identity verification **before signing**."

That is **recipient signing authentication** — proving an external signer
controls an address before they may sign a document. It is not account login
MFA, the subject is a recipient rather than a user, and this command's own scope
list excludes it.

Conflating the two would have produced an email-OTP challenge table for account
login that no product flow ever calls — the "foundation without callers" failure
this codebase has already recorded once.

## Classification

| Flow | Classification | Why |
|---|---|---|
| **TOTP login MFA** | **IMPLEMENT_NOW** | `MfaChallenge.tsx`; the product's only account MFA factor |
| **TOTP enrolment** | **IMPLEMENT_NOW** | `MfaSetup.tsx`, route status `implemented` |
| **Recovery codes** | **IMPLEMENT_NOW** | `RecoveryCodes.tsx`, `/mfa/recovery`, `recoveryConfigured` in the settings model; 14 characters, `XXXX-XXXX-XXXX` |
| **MFA disable** | **IMPLEMENT_NOW** | `disable-mfa-demonstration` in the settings model; `/app/settings/security/mfa` |
| **Pre-authentication transaction** | **IMPLEMENT_NOW** | Required by `authStatus: "mfa-required"` — the login result that is neither rejected nor authenticated |
| **Email OTP for account login** | **NOT_IN_PRODUCT** | No such flow exists. The product's email OTP is signer authentication |
| **SMS OTP** | **NOT_IN_PRODUCT** | No phone number is collected anywhere; no telephony architecture |
| **Delivered-code OTP challenge model** | **NOT_IN_PRODUCT** | TOTP codes are *computed from a shared secret*, never issued or delivered. Challenge issuance, delivery intent, resend and supersession have no consumer here |
| **Step-up authentication** | **DEFERRED** | No product operation requires recent-MFA re-proof today |
| **Passkeys / WebAuthn / SSO / social** | **NOT_IN_PRODUCT** | Explicitly out of scope |
| **Workspace-mandated MFA policy** | **DEFERRED** | BACKEND-27/50 |

## The consequence for this command's shape

A large part of BACKEND-23 (§4 challenge model, §59–§68 delivery, §113–§116
resend, §223–§227 provider retry, §61–§64 one-time-secret delivery) presumes an
**issued and delivered** code. TOTP has none of that: nothing is generated
server-side per login, nothing is sent, and there is nothing to resend.

What TOTP genuinely needs, and what is built:

- a **short-lived pre-authentication transaction** carrying the password proof,
- a **durable, atomic failed-attempt counter** on that ceremony — the brute-force
  bound, since a 6-digit code is only a million possibilities,
- **time-step replay prevention**, since a TOTP code stays valid for a window,
- **encrypted secret storage**, because unlike every other credential in this
  system the server must be able to *recover* a TOTP secret, not merely compare a
  digest,
- **recovery codes** as the loss path,
- and a **fresh session only after the second factor succeeds**.

## Two open product questions, recorded not invented

1. `/mfa` — the login challenge route — is marked `status: "planned"` while
   `/mfa/setup` and `/mfa/recovery` are `implemented`. The page exists. Treated
   as intended-and-unfinished rather than abandoned.
2. `MfaChallenge.tsx` has a `locked` error state, matching the `locked` state
   found in sign-in and email verification (OD-076). Here it is finally
   *reachable*: it is what exhausting the attempt limit means.
