# MFA security

## The factor

**TOTP**, SHA-1 / 6 digits / 30 seconds — the parameters every authenticator app
assumes when a provisioning URI omits them. "Upgrading" to SHA-256 would break
enrolment in apps that ignore the algorithm parameter and buy nothing: TOTP's
security rests on the secret's entropy and the attempt limit, not on the hash.

Secret: 20 bytes (160 bits, RFC 4226), CSPRNG.

## Enrolment, and why confirmation is mandatory

```
POST /auth/mfa/enroll   -> secret generated, stored UNVERIFIED, URI returned once
POST /auth/mfa/confirm  -> a code from that secret proves the app holds it
                        -> factor VERIFIED + 10 recovery codes, one transaction
```

Marking MFA enabled on a button press would lock out every user whose QR scan
silently failed. Enrolment is not enabling.

## Disable

Requires the **current password**. A session alone is insufficient, because
removing the second factor is exactly what an attacker with a stolen session
wants — and permitting it would make the control worthless in the case it exists
for.

Disabling deletes recovery codes and revokes in-flight ceremonies.

## Recovery

**Recovery codes only.** 10 codes, 60 bits each, `XXXX-XXXX-XXXX`, digest-only,
single-use, shown once and never retrievable.

Password reset is deliberately **not** an MFA bypass (§197 Model A). If it were,
the second factor would only ever be as strong as the mailbox.

There is no support-mediated reset path. A user who loses both their
authenticator and their recovery codes is locked out — recorded as OD-082 rather
than solved by weakening the factor.

## Key management — the real limitation

One AES-256-GCM key, from `MFA_SECRET_KEY`, with a version label stored next to
each ciphertext.

**There is no KMS, no envelope encryption, no automatic rotation, and no key
escrow.** The version column makes rotation possible without a migration; nothing
performs one. This is the honest state, and it is a smaller gap than storing
plaintext would be, but it is a gap:

- the key sits in the application environment, so a host compromise yields both
  ciphertext and key,
- losing it is unrecoverable for every enrolled user,
- rotating it requires a re-encryption pass nobody has written.

Recorded as OD-081.

## Assurance

`pending_authentications.authentication_method` records how the first factor was
proved, and `completeMfaChallenge` reports `PASSWORD_PLUS_TOTP` or
`PASSWORD_PLUS_RECOVERY_CODE`.

**Deliberately not built into a full AAL framework.** No product operation
requires recent-MFA re-proof today, and an assurance model with no consumer is
the "foundation without callers" failure this codebase has already recorded.
Step-up is OD-083.
