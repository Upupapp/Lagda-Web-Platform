# Rate Limit Data Classification — BACKEND-15

`rate_limit_counters` holds one row per (policy, scope, window). **Not a request
log** — no per-request rows, no timestamps of individual attempts.

| Column | Class | Notes |
|---|---|---|
| `policy` | INTERNAL | Code-defined, bounded. Safe as a metric label |
| `scope_type` | INTERNAL | Closed set. Safe as a metric label |
| `scope_key` | **depends on type** | See below |
| `window_start` | INTERNAL | |
| `count` | INTERNAL | Never returned to a client |
| `expires_at`, `updated_at` | INTERNAL | |

## The scope key

**Digested** (SHA-256, domain-separated, irreversible):

- `ip` — an IP address is personal data. The table only ever compares it, so it
  has no need to hold it reversibly. **This table cannot reconstruct an
  address.**
- `account` — a pre-auth identifier, typically an email, lower-cased first.
- `challenge`, `recipient` — identifiers tied to a signing or verification flow.

**Plain** (`user`, `workspace`): already operational identifiers elsewhere, and
hashing them would block an incident investigation for no privacy gain.

## Logging

**Never logged:** the raw IP, the account key, the scope digest, the count, the
remaining allowance.

**Safe:** `policy`, normalized `route`, `method`, `result`, `requestId`.

Security investigation may separately record an observed IP under BACKEND-12's
policy. That is a different record with a different purpose — the limiter does
not become the reason to log addresses.

## Metrics

Labels: `policy`, `route`, `result`. **Never** IP, account, user, workspace,
recipient, request ID or the digest — unbounded, and metrics are the surface
that should carry no personal data at all.

## Retention

Counters expire one full window past their reset, so a late cleanup job cannot
delete one that is still authoritative. Short **operational** retention,
unrelated to evidence, session or document retention.

Because IP and account keys are digested and windows are minutes, the table
holds essentially no reconstructible personal data at rest.

## Privacy handoffs

**Export (BACKEND-54):** counters are internal security telemetry, not customer
data. They should not appear in an ordinary export.

**Erasure (BACKEND-55):** short retention and digested keys mean there is
usually nothing to erase. No erasure hook is built.

**Residency:** counters live in the primary PostgreSQL database and follow its
residency. **No new processor.** If a future edge or WAF stores IP data, that is
a new processor and belongs in the cross-border review (OD-030).
