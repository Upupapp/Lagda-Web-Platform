# MFA architecture

**Factor implemented: TOTP (RFC 6238), with recovery codes.**

Measured from the product, not assumed. `MfaChallenge.tsx` says "Enter the
6-digit code from your **authenticator app**"; `MfaSetup.tsx` runs a QR scan →
confirm → recovery codes enrolment. See MFA_OTP_PRODUCT_INVENTORY.md.

## OTP is not automatically MFA

An OTP is a one-time code proving control of a channel. It becomes a **second
factor** only when it follows an independently established first factor.

Here: a password (something known) plus a TOTP secret on a device (something
possessed). The two are genuinely independent — compromising the user's mailbox
does not yield the TOTP secret, which is not true of an email-OTP design.

It is **not phishing-resistant**. A user can be talked into reading a live code
to an attacker. WebAuthn would prevent that; this does not. Stated plainly
rather than described as equivalent.

## Why there is no OTP challenge table

BACKEND-23 describes an issued-and-delivered code with a stored verifier,
delivery intent, resend and supersession. TOTP has none of it: the code is
**computed** on the user's phone from a shared secret, so nothing is generated
per login and nothing is sent.

A challenge table for a delivered code would have no writer and no reader. What
TOTP genuinely needs is built instead:

| Need | Mechanism |
|---|---|
| Bound brute force on 10^6 codes | Durable, atomic per-ceremony attempt counter |
| Stop replay inside the valid window | `last_used_time_step` watermark, advanced conditionally |
| Carry the password proof safely | Short-lived pre-authentication transaction |
| Recover a lost phone | 10 single-use recovery codes |
| Store a recoverable secret | AES-256-GCM, key from configuration |

## Login flow

```
email + password
      |
      v
password verified?  --no-->  INVALID_CREDENTIALS   (unchanged from BACKEND-20)
      | yes
      v
MFA required?  (server reads the factor table)
      |
      +-- no --> fresh session, `status: "authenticated"`
      |
      v yes
create pending_authentication   (10 min absolute, 5 attempts)
      |
      v
200 { status: "mfa-required", factor: "TOTP" }
   + lagda_pre_auth cookie, httpOnly, Path=/auth
      |
      v
POST /auth/mfa/verify   { code }
      |
      v
[ ceremony active? not expired? attempts left? ]
      |
      v
recovery-code shape? --yes--> consume for THIS user
      | no
      v
6 digits, verifies against the secret?
      |
      v
time step > watermark?   <-- replay defence
      |
      v
consume the ceremony (conditional)
      |
      v
FRESH session + CSRF, pre-auth cookie cleared
```

Every failure increments the counter, including a malformed submission —
otherwise unlimited guesses are available simply by varying the length.

## The secret

The one credential in LAGDA the server must **recover** rather than compare.
AES-256-GCM, fresh IV per encryption, key from `MFA_SECRET_KEY`, key version
stored alongside the ciphertext so rotation needs no migration.

**Not a key-management system.** One key from configuration. No KMS, no envelope
encryption, no automatic rotation, no escrow — recorded in MFA_SECURITY.md.

## Enrolment

`POST /auth/mfa/enroll` generates a secret and stores it **unverified**. The
factor becomes active only when `POST /auth/mfa/confirm` proves the
authenticator holds it. Abandoning setup halfway cannot lock anyone out.

Recovery codes are issued in the same transaction as enablement: MFA without a
loss path is a lockout waiting for a broken phone.

The confirmation code **burns its time step**, so it cannot be replayed
immediately as a login. The cost is that a user enrolling and signing in inside
the same 30 seconds waits for the next code.

## Disable

`POST /auth/mfa/disable` requires the **current password**, not merely a
session. Removing the second factor is the first thing an attacker with a stolen
session tries, and a session alone must not undo the control that limits what a
stolen session is worth.

Disabling deletes recovery codes and revokes in-flight ceremonies.

## Password reset interaction

A password reset **revokes pending authentications** — a ceremony is a proof of
the old password, and leaving it alive means the reset did not revoke what the
user thought it did.

It does **not** disable MFA (§197 Model A). A weaker credential must not be able
to strip a stronger one.
