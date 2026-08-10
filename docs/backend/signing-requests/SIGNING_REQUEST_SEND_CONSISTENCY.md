# Send consistency

## What commits together

One transaction, all of it or none:

```
idempotency claim
request read + eligibility           from the snapshot
activation rows                      every recipient, active or waiting
per provisioned recipient:
    signing access grant             the digest
    delivery intent                  the sealed credential + snapshot
request state -> sent, sent_at       CONDITIONAL, and LAST
idempotency completion
```

**A request cannot reach SENT unless every credential and intent its active
recipients need is already durable.** The transition is the last statement for
exactly that reason.

## What happens outside the transaction

**Credential generation.** Random bytes are not a database operation, and
generating them inside an open transaction would hold it open for nothing. If
the transaction fails, the raw values are discarded — never persisted, never
delivered.

**Nothing else.** No provider call, no queue publish, no storage, no PDF, no
crypto beyond `randomBytes` and one `seal` per recipient.

## Lock ordering

**Idempotency claim first, then the conditional state transition.** One order,
everywhere, so two sends cannot deadlock by taking them in opposite sequences.

The claim is the cheaper contention point and the one that resolves a genuine
retry without touching the request at all.

## The conditional transition

```sql
update signing_requests set state = 'sent', sent_at = $1
 where workspace_id = $2 and signing_request_id = $3 and state = 'draft'
```

The predicate IS the concurrency control. Two sends racing under different keys
would both read `draft` and both proceed; the second matches zero rows and its
transaction rolls back, taking its grants and intents with it.

Proven against real PostgreSQL: two concurrent transitions, exactly one wins.

A CHECK refuses `state = 'sent'` with a NULL `sent_at`, and the reverse — so a
future transition that forgot the timestamp fails rather than producing a
request that was sent at no particular time.

## Failure modes

| Failure | Result |
|---|---|
| No signing-delivery key | Fails at the first `seal`, before anything is durable. Request stays `draft` |
| Recipient 2 of 3 fails | Whole transaction rolls back. No partial activation. Proven by a test that fails the second seal |
| Source artifact missing | Integrity error. Request stays `draft` |
| Sender demoted mid-request | Membership is read inside the transaction. Refused, nothing written |
| Another send commits first | Zero rows matched, rollback |
| Grant unique violation | Rolls back. The one-active-grant index converges rather than duplicating |

## Idempotency

| Property | Value |
|---|---|
| Operation | `signingRequest.send` — pre-listed from the handoff, now used |
| Scope | `workspace` |
| Key | **Required** at the route |
| Fingerprint | `{ signingRequestId }` |
| Replay | The original result, and **no new credentials** |

### Why the fingerprint is only the request

BACKEND-33 owns no send-level configuration — the product has no send screen, so
there is no subject or message to include. If BACKEND-46 adds one it belongs in
the fingerprint, because sending the same request with a different message is a
different logical request.

### Same key, retried

Returns the original `sentAt`, the original id, and mints nothing. A test
asserts one grant, one intent and **one issued credential** after two calls.

### Different key, already sent

`409 SIGNING_REQUEST_ALREADY_SENT`. A deliberate second attempt, not a retry,
and it must not silently re-invite anyone. The test asserts the grant and intent
counts are unchanged.

### Concurrent, same key

Exactly one transition. The claim's unique index resolves it; the conditional
UPDATE is the second line of defence.

## After the commit

The request is SENT. The delivery intent is pending, discoverable through the
partial index on `dispatched_at is null`.

**A provider failure after commit does not revert anything.** The workflow was
committed; delivery is retryable. A UI may later surface "delivery failed"
without pretending the request was never sent — BACKEND-45 owns that state.

**Delivery is at-least-once, never exactly-once.** A provider retry may deliver
the same invitation twice. Both copies carry the same still-valid credential,
because a retry reuses the same intent and the same grant — it does not mint a
new one. That is what `UNIQUE (grant_id)` on the intent enforces.
