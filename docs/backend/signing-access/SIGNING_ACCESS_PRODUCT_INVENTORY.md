# Signing access — product inventory

## The decision

> **RECIPIENT AUTHENTICATION POLICY: `LINK_ONLY`**

Link possession is the whole authentication ceremony. A valid bootstrap
credential is exchanged for a recipient signing session, and no second factor is
required.

That is the product's own default, and it is also the only policy that can be
honestly implemented today. Both halves of that sentence matter.

## The evidence

### The product's default is link-only

`PrepAuthMethodId` (`src/app/models/prepare.ts:170-176`):

```ts
export type PrepAuthMethodId =
  | "none" | "email-otp" | "sms-otp"
  | "knowledge-based" | "id-verification" | "account-signin";
```

`DEFAULT_AUTH_CONFIG` (`prepare.ts:317-320`) is `defaultMethod: "none"`, labelled
**"Secure Invitation Link"**. A sender who never opens step 4 of the wizard gets
link-only, and that is the path every fixture takes.

`email-otp` is `availability: "active"` and selectable, so the product clearly
*intends* it. `sms-otp` and `account-signin` are `plan-dependent`;
`knowledge-based` is `enterprise`; `id-verification` is `planned` — the last two
are rendered disabled.

### Why email OTP cannot be implemented today

Three blockers, each independently sufficient:

1. **The policy is not persisted anywhere.** `PrepAuthConfig` lives in the
   frontend's in-memory prepare draft. No backend command stores it: BACKEND-30
   persists no invitation settings, BACKEND-31 no auth config, and BACKEND-32's
   create route explicitly **rejects** `authMethod` with a comment naming
   BACKEND-34. So there is no per-request authentication policy to read. A
   global "always OTP" would override senders who chose the default.

2. **There is no delivered-OTP architecture to reuse.** §38 requires reusing
   BACKEND-23's model; BACKEND-23 is TOTP-only and says so
   (`011_mfa_and_pending_auth.ts:4-14`: *"A challenge table for a delivered code
   would have no writer and no reader"*). `MFA_OTP_PRODUCT_INVENTORY.md` already
   classifies a delivered-code challenge model as NOT_IN_PRODUCT while carving
   out signing OTP as a separate, unbuilt thing.

3. **Nothing can deliver it.** BACKEND-33 is DURABLE INTENT ONLY: no provider,
   no renderer, no worker. **An OTP that cannot reach the recipient is not a
   stronger lock — it is a lock with no key.** Shipping it would make signing
   impossible rather than more secure.

Building OTP now would mean inventing a challenge model, inventing the policy
storage it reads, and shipping a factor nobody can complete. §1 says not to add
OTP merely because it is stronger, and here it would not even be stronger.

### What the recipient UI shows

`AuthChallengePage.tsx` is a real six-digit code screen — and it is gated on
`participant.authRequired`, which is fixture data. Its own copy says
*"Demo: Enter 000000, 123456, or 111111 to pass. No real code was sent."*
(`AuthChallengePage.tsx:105`), and the sender-side step carries the same
disclaimer (`AuthStep.tsx:315-317`).

So the screen exists, and nothing behind it does.

## Classification

| Concern | Classification | Notes |
|---|---|---|
| **LINK-ONLY ACCESS** | **IMPLEMENT_NOW** | The product default and the implemented policy |
| **EMAIL OTP** | **FOUNDATION_ONLY** | The method type, the session's `authentication_method` column and the single policy decision point all admit it. The challenge model, the policy snapshot and delivery are all absent — OD-140 |
| **SMS OTP** | **NOT_IN_PRODUCT** | `plan-dependent`, and no SMS anything exists |
| **STATIC ACCESS CODE** | **NOT_IN_PRODUCT** | No such method in either union |
| **PASSWORD** | **NOT_IN_PRODUCT** | Not a method the product offers |
| **LAGDA ACCOUNT LOGIN** | **NOT_IN_PRODUCT** | `account-signin` is `plan-dependent`, and §161 forbids treating an account match as recipient authentication regardless |
| **RECIPIENT SESSION** | **IMPLEMENT_NOW** | Opaque, digest-stored, HttpOnly cookie, its own realm |
| **SESSION EXPIRY** | **IMPLEMENT_NOW** | Absolute, explicit. No idle timeout — see below |
| **OTP RESEND** | **NOT_IN_PRODUCT** | There is no resend control on the auth screen, and no OTP |
| **LINK REISSUE** | **DEFER** | BACKEND-33 left the partial index that permits it; the operation is OD-136 |
| **ACCESS REVOCATION** | **FOUNDATION_ONLY** | `revoked_at` exists on the grant and on the session, and the session records its source grant. No operation revokes either yet — OD-142 |
| **MULTI-DEVICE ACCESS** | **IMPLEMENT_NOW**, deliberately | The bootstrap credential is reusable until it expires; each exchange mints an independent session. See below |
| **EMAIL SCANNER LANDING** | **IMPLEMENT_NOW** | GET is the frontend's; only an explicit POST exchanges |
| **RECIPIENT CONTEXT** | **IMPLEMENT_NOW** | A minimal authenticated context endpoint |

## Two policy choices worth stating

### The bootstrap credential is REUSABLE until it expires

Not one-time. §25 prefers exchange-once; §26 asks for a deliberate decision.

The product's recipient flow has no session concept at all — `authState` lives
in a React reducer and is **lost on every page reload**
(`RecipientContext.tsx:179-191` re-challenges on mount). A one-time credential
would mean a recipient who refreshes, or opens the email on their phone after
starting on a laptop, is permanently locked out of a document they were asked to
sign, with no self-service recovery and no resend operation.

The exposure is real and bounded: the credential already expires in 14 days, is
already bound to one recipient of one request, is already revocable, and is
already invalid the moment routing or request state changes. Each exchange mints
an independent short-lived session, so the *session* surface stays small even
though the link stays usable.

Recorded as OD-141 so a product decision can reverse it cheaply.

### No idle timeout

Absolute expiry only. §68 asks whether one is needed; the answer is that a
signing session is short by construction, and touching a row on every request
buys nothing when the absolute lifetime is already measured in hours.

## What BACKEND-34 does not build

Signature drawing, typed signatures, uploads, initials, text or checkbox
submission, field values, consent, completion, decline, PDF merge, certificates,
`DocumentSealer`, public verification. BACKEND-35 onwards.

## A cross-repo contract gap, recorded

The frontend route is `/sign/:requestId` and looks the parameter up in a fixture
`Map` (`recipient.service.ts:23-47`). BACKEND-33's link builder emits
`/sign/<43-char credential>`.

Those do not agree. The backend's shape is the correct one — a bearer credential
is what an emailed link must carry — and the frontend's is demo scaffolding.
Whoever wires the real flow must treat the path segment as a **token**, POST it
to `/signing-access/bootstrap`, and strip it from the URL. Recorded in the
handoff rather than fixed here: §277 says do not redesign the UX.
