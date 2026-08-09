# Idempotency Data Classification — BACKEND-14

`idempotency_records` is **internal application data**, not an anonymous cache.
Scope identifiers link rows to workspaces and users, and a stored replay body may
contain PII.

| Column | Class | Notes |
|---|---|---|
| `record_id` | INTERNAL | Opaque. The safe diagnostic handle — use it in logs instead of the key |
| `scope_type` | INTERNAL | Closed set, safe as a metric label |
| `scope_key` | **CONTEXTUAL_IDENTIFIER** | Contains a workspace, user or recipient ID. Never a metric label |
| `operation` | INTERNAL | Closed set, safe as a metric label |
| `key_digest` | **SENSITIVE** | Not a credential — a key authorizes nothing — but it identifies a client operation. Never logged, never returned |
| `request_fingerprint` | **SENSITIVE** | Reveals nothing directly, but confirms whether two requests were identical. Never returned to a client |
| `state` | INTERNAL | |
| `response_status` | INTERNAL | |
| `response_body` | **MAY CONTAIN PII** | Whatever the operation returned. Never logged |
| `response_version` | INTERNAL | |
| timestamps | INTERNAL | |

## What is deliberately absent

**The raw idempotency key.** Only a digest is stored. Lookup works from the
digest, so the raw value has no purpose in the database — and a
client-supplied string that need not be retained should not be.

**The request body.** Only its fingerprint. Determining "same key, different
request" needs no plaintext, so none is kept. This is the largest PII saving in
the design: the framework would otherwise duplicate every protected request
payload.

## Logging

**Never logged:** the raw key, the key digest, the fingerprint, the stored
response body, the scope key.

**Safe to log:** `recordId`, `operation`, `scopeType`, outcome, `requestId`.

Suggested levels: claimed/completed/replayed at `debug` (metrics carry the
volume), fingerprint conflict at `info` or `warn` depending on volume, storage
failure at `error`.

## Metrics

Labels: `operation`, `result` only — both closed sets.

**Prohibited:** the key, key digest, fingerprint, `workspaceId`, `userId`,
`recipientId`, `requestId`, `recordId`. Every one is unbounded, and metrics are
the surface that should carry no identifiers at all.

## Retention and privacy

24 hours, operational, and **separate from evidence, session and document
retention**. Short retention is itself a privacy control: a stored response
containing PII exists for a day, not indefinitely.

**Export (BACKEND-54):** idempotency records are infrastructure execution data
and should not appear in an ordinary customer export. Privacy review decides
finally.

**Erasure (BACKEND-55):** short retention removes records naturally. No erasure
hook is built, deliberately — building one for data that expires in a day would
be machinery with no user.

**Encryption:** none per-column. Database encryption-at-rest applies, and short
retention bounds the exposure. A per-column scheme here would add key management
for a day of data.
