# Idempotency Architecture — BACKEND-14

## 1. The decision everything follows from

**The claim row is inserted inside the business transaction.**

That single choice removes three problems that would otherwise each need
machinery:

| Problem | Resolved by |
|---|---|
| Two simultaneous duplicates | PostgreSQL blocks the second `INSERT` on the unique index until the first transaction resolves |
| A failed mutation poisoning the key | The claim rolls back with it — nothing to clean up |
| A crash leaving a stale `IN_PROGRESS` row | Nothing committed, so no such row exists. **No lease, no reclaim job, no recovery** |

The cost, stated plainly: it works only for mutations contained in **one**
PostgreSQL transaction. An operation that seals a PDF or calls an email provider
must not hold a transaction open across that work — those need staged durable
state (BACKEND-33/38), and §5 below says which is which.

## 2. Identity

```
scope_type + scope_key + operation + key_digest      ← UNIQUE
```

All four, always. A raw idempotency key is **not** globally unique — two
unrelated clients legitimately send the same UUID, or `"1"` — so identity must
carry the caller and the operation.

**Scope** is a discriminated union, each variant carrying only the identifiers
it needs:

| Type | Key | Used by |
|---|---|---|
| `workspace` | `ws:<id>` | send, invitation, plan change |
| `user` | `usr:<id>` | account-level operations |
| `recipient` | `rcp:<signingRequestId>:<recipientId>` | signature submission |
| `system` | `sys:<scope>` | internal scheduled work |

The type prefix matters: a workspace ID and a user ID could be textually equal,
and without it they would share a namespace. A test asserts they do not.

`recipient` exists because signature submission (BACKEND-36) is performed by an
external signer with no workspace session — the framework must never depend on
`AuthenticatedActor.userId`.

**Operation** is a closed union, so a typo cannot silently create a second
namespace in the same table.

## 3. Key handling

| | |
|---|---|
| Header | `Idempotency-Key` (BACKEND-03) |
| Length | 8–255 characters — 255 is the canonical maximum already in contracts |
| Characters | Printable ASCII, no whitespace or control characters |
| Stored | **A SHA-256 digest only.** The raw key is never persisted |
| Logged | **Never.** `recordId` is the diagnostic handle |

The minimum length is not arbitrary: a client sending `"1"` has not generated a
key per operation, and short keys collide within a scope, making two different
operations look like retries of each other.

Control characters are rejected because they create ambiguity in logs and in
anything downstream that parses headers.

**A key is not authorization.** Holding one grants nothing — authentication,
CSRF and authorization all still apply, and a replay is subject to all three.

## 4. Request fingerprint

Reusing a key with different input must **fail**, not replay the first result.
That requires knowing what the first request was — without storing it.

```
logical request → canonical string → SHA-256 (domain-separated) → hex
```

**Canonicalization** exists because `{"a":1,"b":2}` and `{"b":2,"a":1}` are the
same logical request and different bytes. Hashing raw HTTP bytes would make a
retry from a client that serializes keys differently look like a new operation —
and the framework would then execute it twice.

Rules, each with a reason:

- **Object keys sorted.** The whole point.
- **Array order preserved.** Recipients `[A, B]` and `[B, A]` are different
  signing orders; sorting would make two genuinely different requests replay
  each other.
- **`null` preserved, distinct from absent.** "Clear this field" is not "leave
  this field alone".
- **`undefined` rejected**, not dropped — otherwise `{a: undefined}` and `{}`
  collide and one of them is a bug.
- **`NaN`/`Infinity` rejected** — both serialize to `null`, so two different
  requests would fingerprint identically.
- **`BigInt`, `Date`, class instances rejected** — each has environment-varying
  coercion, and none belongs in a schema-validated request.
- **Depth bounded at 32**, which also catches cycles without carrying a
  `WeakSet` through every call.

### Excluded from the fingerprint

`sessionToken` · `csrfToken` · `requestId` · IP · user-agent

A session rotation between two retries must not make the second look like a
different business request. A CSRF rotation likewise. The request ID is new
every attempt by definition. IP and user-agent change legitimately between
retries — evidence records them separately (BACKEND-10).

**Included**: path and resource identifiers that change what the operation
means. `POST /signing-requests/:id/send` must not let one key send request B
after sending request A.

Fingerprinting happens **after** schema validation, so what is hashed is what
the business operation actually interprets.

## 5. Which operations fit this model

| Operation | Contained in one transaction? | Notes |
|---|---|---|
| Signature submission | **Yes** | DB + evidence transition. The best fit |
| Workspace invitation | **Yes**, with an outbox | DB row + notification intent |
| Send signing request | **Yes**, with an outbox | Logical success is "sent + job enqueued", not "email delivered" |
| Plan change | **No** | External billing provider (BACKEND-50) |
| OTP delivery | **No** | External provider. Idempotency protects the *intent*, not the delivery |

For the outbox cases, business state, job intent and idempotency completion all
commit together — which is exactly the consistency this design gives for free.

**Idempotency does not make external delivery exactly-once.** An email provider
may still receive a retry and send twice. Provider adapters need their own
idempotency keys, and that is a different boundary.

## 6. Outcomes

| Situation | Result |
|---|---|
| New key | `claimed` → execute |
| Same key, same fingerprint, completed | `completed` → **replay, do not execute** |
| Same key, different fingerprint | `conflict` → 409, neither executes nor replays |
| Same key, same fingerprint, in progress | Blocks on the index; then sees `completed` |
| Expired record | Reclaimed in place → treated as new |

The in-progress *state* exists for the future out-of-transaction pattern. Under
the current model a concurrent duplicate blocks rather than observing it.

## 7. Replay

Stored: `{ version, statusCode, body }` — bounded to 64 KiB.

**Deliberately not stored:** headers of any kind. No `Set-Cookie` (replaying one
would re-issue an old session), no CORS, no security headers, no
`X-Request-Id`. The current response pipeline produces all of those fresh, so a
replay gets its **own** request ID.

`version` is not decoration: records outlive a deployment inside the retention
window, so a parser must read yesterday's row.

A replay returns the same status and body. It does **not** add `{"replayed":
true}` to the body — that would break replay equivalence. A header is the place
for it if a client ever needs to know.

## 8. Failures

| Failure | Behaviour |
|---|---|
| Business rule violation | Throws → transaction rolls back → **key is free**, retry executes |
| Unexpected 500 | Same. **Never cached as a completed result** |
| Database unavailable | Propagates as a dependency error, not a conflict |
| Process crash mid-operation | Nothing committed. No stale row |

There is no `try/catch` around `execute()` in the service, and that is
deliberate — catching would defeat the mechanism that makes failures retryable.

## 9. Retention

24 hours by default, configurable. **Operational, and unrelated to evidence,
session or document retention** — it bounds client retries, not legal history.

After it lapses the same key is a new operation. This framework does not promise
permanent deduplication, and saying so is more useful than implying it.

Expired rows are reclaimed **in place** by a conditional `UPDATE`, not deleted
and re-inserted: two statements have a race between them; one has none.

Cleanup is bounded, never on the request path, and deletes only expired rows —
an in-progress operation whose retention has not lapsed must survive, or a
duplicate could execute. BACKEND-16 schedules it.

## 10. Ordering in a request

```
authenticate → CSRF → authorize → schema validation → idempotency claim → mutation
```

CSRF and validation come **first** so a rejected request never creates a record.
Authorization comes first so an unauthorized caller cannot reserve another
workspace's key.

**A replay still requires current authentication and authorization.** The record
is not a capability: if a user has since lost workspace access, the feature route
must deny them before the replay path is reached. That ordering is the feature
command's responsibility and is stated in the handoff.

## 11. Tenancy

`idempotency_records` is **MIXED TYPED SCOPE with no RLS** — the second
deliberate exception after sessions.

A workspace-only policy would have to decide what `workspace_id IS NULL` means
for user and recipient scopes, and "unrestricted" is the dangerous answer.
Safety comes from identity instead: every repository method takes the full
identity, and **there is no method that queries by key alone**. A caller cannot
ask "who else used this key". A test asserts workspace B gets nothing for a key
workspace A used.
