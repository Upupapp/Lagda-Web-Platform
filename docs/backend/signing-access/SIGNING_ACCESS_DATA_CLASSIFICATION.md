# Signing access data classification

| Item | Class | Log? | Metric label? | On the wire? |
|---|---|---|---|---|
| **Raw bootstrap credential** | **SECRET** | **Never** | Never | Inbound only, in a POST body |
| Bootstrap digest | Sensitive | **Never** | Never | **Never** |
| **Full signing URL** | **SECRET** | **Never** | Never | **Never** |
| `SigningAccessGrantId` | Internal | Not routinely | Never | **No** |
| **Raw recipient session token** | **SECRET** | **Never** | Never | HttpOnly cookie only |
| Session digest | Sensitive | **Never** | Never | **Never** |
| **Raw recipient CSRF token** | **SECRET** | **Never** | Never | Cookie, readable by the page |
| CSRF digest | Sensitive | **Never** | Never | **Never** |
| `RecipientSigningSessionId` | Internal | Not routinely | Never | **No** |
| Recipient email | **PII** | **Never** | Never | **Masked only** — `m***@example.com` |
| Recipient name | **PII** | **Never** | Never | Yes, to the recipient themselves |
| Document title | Business-sensitive | **Never** | Never | Yes, to the recipient |
| `SigningRequestRecipientId` | Pseudonymous handle | Yes, in the auth event | Never | **No** |
| `SigningRequestId` | Resource id | Yes | **No** — unbounded | Yes |
| `workspaceId` | Tenant id | **No** in this realm | Never | **Never** — a recipient has no tenant identity |
| `authentication_method` | Security state | Yes | **Yes** — bounded | Yes |
| Observed IP | PII / security evidence | **Not captured** | **Never** | No |
| User agent | PII-potential | **Not captured** | Never | No |

## What is logged

```
signing_access.session_created    signingRequestId, recipientId, authenticationMethod
signing_access.bootstrap_failed   result (invalid_or_expired | not_active)
```

`session_created` is a **security event**: it records that a recipient
authenticated, by which method, at a backend-authoritative time. It does not
record viewing, consent or signing — none of which has happened.

`bootstrap_failed` carries a bounded reason and **never the token, not even
truncated** — a prefix of a credential is still a credential's prefix.

Reads are not logged. A signing page polls `/signing/context`.

### Why `recipientId` is in the event and `workspaceId` is not

The recipient id is the subject of the security event and the thing BACKEND-43
will project. The workspace id is tenant context a recipient does not have and
does not need to appear in their realm's telemetry.

## Metrics

`signing_access_attempts_total`, labelled `operation`, `result`, `processRole`.

**The failure REASON is deliberately not a label.** The public error is collapsed
precisely so a caller cannot distinguish "expired" from "unknown"; a metric that
split them would rebuild the oracle for anyone who can read a dashboard.

Never a request id, a recipient id, a workspace id, an IP or a digest.

## At rest

- `credential_digest`, `token_digest` and `csrf_token_digest` are all SHA-256
  hex with shape CHECKs. No raw value is stored anywhere.
- A CHECK refuses a session whose two digests are equal.
- The runtime role has `INSERT` and `UPDATE` on sessions and **no `DELETE`** — a
  session that ended is revoked, not erased.
- Four `FOR SELECT` policies key off transaction-local settings and match
  equality on unique columns.

## In the browser

- The session cookie is HttpOnly. No script can read it.
- The CSRF cookie is readable **by design** — the page must echo it — and is a
  different credential under a different digest domain, so reading it grants
  nothing.
- Neither is ever in a response body.
- The bootstrap token must never reach `localStorage` or `sessionStorage`; see
  the scanner-safety document's frontend requirements.

## Retention

Sessions cascade from the request recipient, which cascades from the request.
They are the authentication record, so they outlive their usefulness as
credentials deliberately — and hold no PII beyond the ids that point at the
snapshot.
