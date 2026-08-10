# Signature submission consistency

## What commits together

One transaction:

1. the idempotency claim
2. one `recipient_submissions` row
3. zero-to-two `signing_representations` rows
4. N `signing_field_values` rows
5. the idempotency completion

**All or nothing.** A failure on the last value rolls back the first, and no
recipient is ever half-signed (§135, §136).

## What happens outside the transaction

**Base64 decoding and PNG validation.** §129: a database lock must not be held
while an image header is parsed. The bytes are decoded, checked and hashed
first; the transaction receives an already-validated buffer.

Nothing else. There is no object-storage call, no queue publish and no PDF work,
so there is no non-transactional step whose failure could leave the act half
done.

## The failure window that does not exist

§130 – §133 describe managing object-storage/database non-atomicity: a pending
asset, a claim step, an orphan sweeper, and a decision about which to write
first.

**None of it applies**, because the raster is stored in PostgreSQL. That was the
main reason for the choice, and it is worth stating as a consistency property
rather than only as a storage one: there is no window in which an accepted
submission references bytes that are not there, and no orphan to clean up.

If a future command moves signature bytes to object storage, this entire section
becomes live and the pending/claim model must arrive with it.

## Locking and ordering

BACKEND-36 takes no explicit row locks. Uniqueness does the work:

- `recipient_submissions_one_per_recipient` — a second submission violates.
- `signing_field_values_one_per_field` — a second value violates.
- the idempotency claim is a single conditional INSERT, not a read-then-write.

Two concurrent submissions therefore converge without a lock: one commits, the
other fails on a constraint. Integration asserts exactly one survives.

### The canonical lock order for BACKEND-37

When BACKEND-37 adds state transitions it **will** need explicit locks, and the
order must be fixed before two commands take them in different sequences:

```
signing_requests
  -> signing_request_recipient_activation
    -> signing_recipient_progress
      -> recipient_submissions / idempotency
```

Outermost is the request, because a terminal transition (cancel, expire, void)
must be able to exclude a submission in flight. BACKEND-37 and BACKEND-46 both
have to honour it.

## The submission-versus-invalidation race

Today: a submission revalidates request state inside its transaction, and a
concurrent cancellation is a separate write with no shared lock. The window is
narrow — both are single short transactions — but it is real, and honesty is
better than a claim of impossibility:

**a submission can commit microseconds before a cancellation.** The result is an
accepted signing act on a request that then became terminal, which is a state
BACKEND-37 must handle rather than assume away.

The fix belongs with the state machine, not here: once cancellation takes the
request row lock in the order above, a submission holding it cannot be
overtaken. Recorded as an open decision so it is not discovered later.

## Validation failure

No rows. No submission, no evidence, no partial values. The idempotency record
follows BACKEND-14's policy for a stable business error, and a transient
dependency failure is not cached as a permanent result (§142).

## The intermediate state

Between BACKEND-36 and BACKEND-37 the repository can hold an accepted
`RecipientSubmission` while the recipient's workflow state reflects nothing.

**That is expected** (§151). The submission fact is authoritative and complete;
the workflow simply has not consumed it. The feature is not externally
production-ready until BACKEND-37 closes the gap, and this document says so
rather than leaving it to be inferred.
