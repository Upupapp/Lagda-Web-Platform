# Account — data classification

| Value | Class | Exposed at `/me`? | Rule |
|---|---|---|---|
| `userId` | **INTERNAL** | yes | Opaque, stable across an email change |
| `email` (display) | **PII** | yes | The user's own address, to the user |
| `normalized_email` | **PII / INTERNAL IDENTITY** | **no** | A lookup key. Absent from `CurrentUser` entirely |
| `full_name`, `display_name`, `job_title`, `department`, `preferred_sender_name` | **PII** | yes | Never logged as values |
| `timezone`, `locale`, `language`, formats, appearance | **PREFERENCE / low-sensitivity PII** | yes | A timezone narrows location; not logged routinely |
| `email_verified_at` | **ACCOUNT SECURITY** | derived only | A boolean is exposed; the timestamp is not |
| `password_hash` | **SENSITIVE** | **no** | Not on any account type. Reached only through `AccountCredentialRepository` |
| Current / new password | **SECRET / EPHEMERAL** | **no** | Hashed and discarded. Never logged, never echoed |
| MFA summary (`mfaEnabled`, factor, codes remaining) | **ACCOUNT SECURITY** | yes | Whether a factor exists, never what it is |
| TOTP secret ciphertext, key version, watermark | **SECRET / SENSITIVE** | **no** | A leak attempt into `/me` does not compile |
| Session id | **INTERNAL** | yes, own only | Opaque; every operation scoped by user |
| Session token / CSRF token / digests | **SECRET** | **no** | Not selected by the account projection |
| `profile_updated_at` | **INTERNAL** | no | Operational |

## Logging

Profile **values** are never logged — names, job titles and departments are PII
with no operational value. Where a record of a change is useful, the safe form
is a bounded list of changed FIELD NAMES, never their contents.

Never logged: passwords, hashes, session tokens, CSRF tokens, MFA secrets,
challenge digests.

Metric labels carry no `userId`, `email`, `sessionId` or challenge id.

## Portability and erasure

Every PII field above is account-scoped and export-relevant. BACKEND-54 owns
export and BACKEND-55 owns erasure; neither is implemented here, and no hard
delete exists.
