# MFA / OTP — data classification

| Value | Class | Retention | Rule |
|---|---|---|---|
| Submitted TOTP code | **SECRET / EPHEMERAL** | One request | Never persisted, never logged. Handled as a STRING — `parseInt("004218")` is 4218 |
| TOTP secret (plaintext) | **SECRET** | Transient, at enrolment and at each verification | Returned once at enrolment; otherwise exists only inside a verification |
| TOTP secret (stored) | **SENSITIVE** | Life of the factor | AES-256-GCM ciphertext in `mfa_factors.secret_ciphertext` |
| `MFA_SECRET_KEY` | **SECRET / CONFIG ONLY** | — | Never in the database, never logged, never in a queue payload, never committed |
| Provisioning URI (`otpauth://`) | **SECRET / EPHEMERAL** | One response | Contains the secret in full. Never logged, never sent to analytics |
| Recovery code (displayed) | **SECRET / EPHEMERAL** | One response | Shown once. No endpoint returns them again |
| Recovery code digest | **SENSITIVE** | Life of the code | Domain-separated SHA-256 |
| Pre-auth credential (raw) | **SECRET** | ≤10 minutes, httpOnly cookie | Carries a completed password proof. Never in a body, never logged |
| Pre-auth digest | **SENSITIVE** | Life of the ceremony | Lookup key only |
| `failed_attempts` | **INTERNAL** | Life of the ceremony | Never returned — an attempt count discloses the security configuration |
| `last_used_time_step` | **INTERNAL** | Life of the factor | A replay watermark; reveals only when a factor was last used |
| Factor id / ceremony id | **INTERNAL** | Life of the row | Safe in telemetry, never in a public response |
| MFA enabled state | **ACCOUNT SECURITY** | Life of the account | Server-authoritative. Not settable through any profile field |
| Account label in the URI | **PII** | Transient | The user's own email, shown to the user |

## Absent by construction

No plaintext secret column. No OTP column. No `recovery_code` column. No
`mfaEnabled` field in any session cookie or client claim. No attempt count in
any response body.
