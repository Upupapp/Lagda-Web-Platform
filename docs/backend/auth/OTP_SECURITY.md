# OTP security

## The entropy problem

A 6-digit code is **one million possibilities**. Every other credential in LAGDA
carries 60–256 bits and is unguessable on its own; this one is not, and the
design has to compensate.

| Control | Where it lives | Why this one |
|---|---|---|
| **5 attempts per ceremony** | `pending_authentications.failed_attempts`, atomic | The real bound. Per-IP limits are defeated by distribution; a per-CEREMONY counter is not, because starting a ceremony needs the password |
| Increment computed by PostgreSQL | `failed_attempts + 1` in the UPDATE | Read-modify-write would let 8 parallel guesses each read 0 and write 1 |
| Ceiling in the WHERE clause | `failed_attempts < max_attempts` | A correct code after exhaustion still matches zero rows |
| Malformed submissions cost an attempt | The use case, before shape dispatch | Otherwise unlimited guesses by varying the length |
| 10-minute absolute ceremony life | `expires_at`, never extended | A password entered once must not authenticate hours later |
| ±1 time step only | `SKEW_STEPS = 1` | Each extra step multiplies simultaneously-valid codes |
| Replay watermark | `last_used_time_step`, advanced conditionally | A code stays valid ~90s; without this, one observed over a shoulder works again |
| Volumetric IP limit | `mfa.verify.ip` 20/15min | Bounds an attacker starting ceremony after ceremony |

## Why the code is never stored

There is nothing to store. TOTP is computed from the shared secret, so no
verifier, no HMAC pepper, and no per-login row exist — the low-entropy-storage
problem BACKEND-23 §13/§14 describes does not arise here, because the low-entropy
value is never persisted at all.

The **secret** is stored, encrypted, and that is the credential worth attacking.

## Threats

| Threat | Control | Status |
|---|---|---|
| **Brute force** | Per-ceremony counter of 5, atomic, ceiling enforced in SQL | **ENFORCED** — probed; 8 concurrent wrong codes cost exactly 5 |
| **Replay of an observed code** | Time-step watermark, conditional advance | **ENFORCED** — probed |
| **Replay of the enrolment code as a login** | Shared watermark across both flows | **ENFORCED** — tested |
| **Two sessions from one ceremony** | Conditional consume of the pending authentication | **ENFORCED** on the recovery path (probed 3/3); **DEFENCE IN DEPTH** on the TOTP path, where the watermark serializes first |
| **Cross-user code** | The ceremony resolves the user; the code is checked against that user's factor | **ENFORCED** — tested |
| **Cross-user recovery code** | `consumeForUser` scoped by user AND digest | **ENFORCED** — probed |
| **MFA enumeration** | `mfa-required` reached only after a correct password | **ENFORCED** — three login paths return identical rejections |
| **Email bombing** | Nothing is sent. TOTP has no delivery | **NOT APPLICABLE** |
| **Pre-auth theft** | httpOnly, `Path=/auth`, 10 minutes, digest-only storage, single use | **ENFORCED** |
| **Pre-auth promoted to a session** | A fresh session is issued after consumption | **ENFORCED** — probed |
| **Database compromise** | The secret is AES-256-GCM ciphertext; the key is in configuration | **ENFORCED** — the row is scanned for plaintext in a test |
| **Tampered ciphertext** | GCM authenticates | **ENFORCED** — tested |
| **Password reset bypassing MFA** | Reset revokes ceremonies and leaves the factor enabled | **ENFORCED** — probed |
| **Confirming a replay** | `code-replayed` and `invalid-code` return identically | **ENFORCED** — probed, after the test was found to be passing vacuously |

## What is not defended

**Real-time phishing.** A user reading a live code to an attacker completes a
genuine ceremony. Only WebAuthn fixes this.

**Key loss.** Losing `MFA_SECRET_KEY` makes every enrolled secret undecryptable
and leaves every affected user dependent on recovery codes.
