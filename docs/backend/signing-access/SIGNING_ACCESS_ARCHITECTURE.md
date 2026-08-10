# Signing access architecture

## The flow

```
emailed link  →  FRONTEND route renders          (a scanner may fetch this)
                      │
                      │ explicit user action
                      ▼
              POST /signing-access/bootstrap     { token }
                      │
                      ├─ IP rate limit           before any lookup
                      ├─ structural reject       43 chars, base64url
                      ├─ digest                  lagda.signing-access-bootstrap
                      │
                      ▼  runForSigningCredential(digest)
              the ONE grant that matches
                      ├─ its request
                      ├─ its ONE recipient
                      └─ its ONE activation row
                      │
                      ├─ revoked?        → invalid
                      ├─ expired?        → invalid
                      ├─ state ≠ sent?   → invalid
                      └─ not active?     → not-yet
                      │
                      ▼  enterWorkspace(grant.workspaceId)   same transaction
              a FRESH RecipientSigningSession
                      │
                      ▼
              HttpOnly cookies + a body with no credential in it
```

## Five conditions, and why each

| Condition | Why |
|---|---|
| The grant exists | The credential is real |
| Not revoked | A reissue or a security action must take effect immediately |
| Not expired | 14 days. A bearer credential in an inbox must not be a permanent key |
| Request is `sent` | A DRAFT request must never be reachable from a link. It is also what will refuse `cancelled`, `completed` and `expired` when those states exist, with no further edit |
| Recipient is routing-`active` | Defence in depth. BACKEND-33 does not mint credentials for waiting recipients, so reaching this means a grant outlived a routing change |

## One error for five causes

Unknown credential, revoked grant, expired grant, wrong request state — all
collapse to `invalid_or_expired_signing_link`, with an identical message and
code. Separate errors would make a public endpoint an oracle: "expired" tells an
attacker their guess was a real credential.

**Routing is the exception.** A recipient who legitimately holds a link and is
genuinely waiting gets `signing_access_not_active` — actionable, and revealing
nothing they could not already infer from holding a valid credential. It names
no other recipient and no position in the sequence.

## The narrow public path

See [SIGNING_ACCESS_RLS.md](SIGNING_ACCESS_RLS.md). In one sentence: four
`FOR SELECT` policies keyed off a transaction-local setting, each matching
equality against a unique column, so the credential can answer exactly one
question and no other.

## The second realm

| | Workspace actor | Signing recipient |
|---|---|---|
| Credential | `lagda_session` | `lagda_signing_session` |
| CSRF | `lagda_csrf` | `lagda_signing_csrf` |
| Digest domain | `lagda.session` | `lagda.recipient-signing-session` |
| Transaction setting | `lagda.workspace_id` | `lagda.recipient_session_digest` |
| Identity | `UserId` + membership | `SigningRequestRecipientId` |
| Authorization | role → capability | the session's own binding |
| Reaches | every workspace surface | one request, one recipient |

They coexist in one browser and neither implies the other.

## What this command does NOT build

No signature, no initials, no typed name, no upload, no text or checkbox value,
no consent, no viewed state, no decline, no completion, no PDF merge, no
certificate, no `DocumentSealer`, no public verification. BACKEND-35 onwards.

Also not built: OTP (see the policy document), grant reissue, session
revocation operations, and any account-linked signing flow.
