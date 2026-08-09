# ADR-017 — TOTP multi-factor authentication

**Status:** accepted (BACKEND-23)

## Context

The product ships an MFA surface: a challenge page that asks for "the 6-digit
code from your authenticator app", a QR-based enrolment flow, and recovery
codes. Login must gain a second factor without weakening the server-managed
session architecture.

## Decision

**TOTP (RFC 6238) via a maintained library**, with:

- the secret encrypted at rest (AES-256-GCM, key from configuration, key version
  stored beside the ciphertext),
- a **short-lived pre-authentication transaction** carrying the password proof,
  with a durable atomic attempt counter,
- a **time-step replay watermark** on the factor,
- **recovery codes** as the loss path,
- a **fresh BACKEND-13 session issued only after both factors succeed**.

## Alternatives

**Email OTP as the MFA factor.** Simpler — no secret to store, no encryption
needed. Rejected on two grounds: the product does not have it, and it would not
be a genuine second factor here, because the same mailbox already controls
password recovery. Compromising it would yield both factors.

**A delivered-OTP challenge table** (issued code, stored verifier, delivery
intent, resend). Rejected because TOTP issues nothing — the table would have no
writer and no reader.

**A simple SHA-256 of the OTP.** Would apply if codes were stored. They are not:
TOTP codes are computed, never persisted, so the low-entropy-storage problem does
not arise. An HMAC pepper would protect nothing that exists.

**A full session before MFA, downgraded by a flag.** Rejected outright: it makes
"is this browser authenticated?" a question every middleware must ask correctly,
forever. A separate credential makes a half-finished ceremony unmistakable.

**A JWT pre-auth token.** Stateless, therefore not revocable and not single-use
— and password reset must be able to revoke it.

**Plaintext TOTP secrets.** Rejected. One database dump would hand over every
user's second factor.

**Blocking TOTP for want of a KMS.** Considered seriously, since no encryption
capability existed. Rejected because AES-256-GCM from `node:crypto` with a
configured key is a standard construction rather than home-grown cryptography,
and blocking would have left the product's entire MFA surface unusable. The
limitation is recorded (OD-081) rather than hidden.

## Consequences

- One new production dependency, `otpauth`.
- A key that must be provisioned, protected and never lost — losing it makes
  every enrolled factor undecryptable.
- Enrolment burns a time step, so enrolling and signing in inside 30 seconds
  requires waiting for the next code.
- No step-up model. Deliberate: nothing consumes one yet.
