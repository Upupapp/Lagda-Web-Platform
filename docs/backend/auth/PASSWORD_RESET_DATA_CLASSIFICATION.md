# Password reset — data classification

| Value | Class | Retention | Rule |
|---|---|---|---|
| Raw reset token | **SECRET / EPHEMERAL** | Exists only between generation and delivery | Never persisted, never logged, never in a response, never in an error |
| Full reset URL | **SECRET / EPHEMERAL** | Same | Contains the token. Never logged, never stored as application state |
| New plaintext password | **SECRET / EPHEMERAL** | Duration of one request | Hashed and discarded. Never logged, never in an error |
| Password hash | **SENSITIVE** | Life of the account | `users.password_hash`. Never in an API contract — `UserRecord` has no such field |
| Reset token digest | **SENSITIVE** | Life of the challenge row | A lookup key, not a usable credential. Never returned, never logged |
| Email address | **PII** | Life of the account | Not logged raw on this path. The challenge stores a `user_id`, never an address |
| Normalized email | **PII** | Life of the account | Used as a limiter scope, where it is digested before it becomes a counter key |
| Challenge ID | **INTERNAL** | Life of the row | Safe in security telemetry; never in a public response |
| User ID | **INTERNAL** | Life of the account | Safe in telemetry; never in a recovery response |
| Revoked session count | **INTERNAL** | Telemetry only | A count. Session identifiers are never logged |
| `consumed_at` / `superseded_at` | **INTERNAL** | Retention TBD (OD-077) | Non-secret history of a dead credential |

## What is deliberately absent

There is no `reset_token` column, no `plaintext` column, no password-history
table, and no column anywhere holding a full reset URL. A field that does not
exist cannot leak.

The reset link carries the token and nothing else — no email, no user ID, no
workspace, no roles. An address in the URL would add nothing the token does not
already resolve while leaking PII into browser history and referrer headers.
