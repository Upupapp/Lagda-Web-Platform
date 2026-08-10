# Signing state consistency

## The model: HYBRID, and it is forced

| Part | Where it commits |
|---|---|
| accepted submission + **the signer's own SIGNED state** + the advance intent | ONE transaction, the recipient's |
| routing, provisioning, request state | a workspace transaction, driven by that intent |

§22 prefers everything in one transaction. It cannot be, and the reason is
recorded in `SIGNING_STATE_ARCHITECTURE.md`: migration 022 binds the recipient
realm to its own recipient row, so a signer's transaction structurally cannot
read the next recipient's snapshot — and the delivery intent that invites them
carries their email address.

This is §171's **Model B**, chosen because the architecture forces it rather
than because it was preferred.

## Why an accepted submission can never be stranded

Three properties together, and none of them is "we remember to run it":

1. **The signer's own state commits with the signature.** The intermediate state
   BACKEND-36 documented and deliberately left open (§23) no longer exists. If
   the submission committed, the recipient is `signed`.
2. **The advance intent commits with it too.** A committed signature always has
   a committed instruction to act on it.
3. **The advance is a pure function of durable rows.** It reads every
   recipient's state and decides what should be true. Running it a second time
   changes nothing; never running it is the only failure mode, and (2) is what
   makes that recoverable.

The synchronous attempt after commit is an optimisation for latency, and it is
deliberately best-effort: letting it throw would fail a request whose signature
is already accepted and immutable, telling the signer that signing failed when
it did not (§172).

## Reconciliation

`reconcileSigningWorkflow` reads outstanding intents ACROSS tenants, then enters
each workspace properly and advances under normal row-level security. One
request with several outstanding intents is swept once, because advancing it
clears them all.

`attemptsBelow` stops a permanently failing intent from starving the queue: it
drops out of the sweep and stays in the table with its bounded failure code,
which is a signal an operator can act on rather than an infinite retry nobody
notices.

**No manual repair exists or is needed** (§175). The recovery path is the same
code as the ordinary path.

### Why the intent table has no row-level security

The reconciler must find stranded work across tenants, and a cross-tenant scan
of an RLS table needs `BYPASSRLS` — rejected as INV-334, four times.
`idempotency_records` is the documented precedent.

What makes it safe is the CONTENT: opaque identifiers, a bounded trigger
vocabulary, an attempt count and a bounded failure code. No name, no address, no
field value, no credential, no document title. A reader of every row learns that
some request needs evaluating and nothing about anybody. The reconciliation
repository returns identifiers only; the actual work happens inside the tenant.

## Lock order

OD-151 fixed it, and BACKEND-37 honours it:

```
signing_requests
  -> signing_request_recipient_activation
    -> signing_recipient_progress
      -> recipient_submissions / idempotency
```

`lockRequest` is a `select ... for update` on the request row and is taken FIRST
by both the advance and the cancellation. **That closes the
submission-versus-cancellation race OD-151 recorded** rather than narrowing it:
a cancellation holding the request lock cannot be overtaken by an advance, and
two advances serialize there instead of deadlocking further down.

The submission transaction itself still takes no explicit lock — uniqueness does
that work, exactly as BACKEND-36 described — so the ordering only has to hold
among the transitions that take locks at all.

## What is idempotent, and how

| Repeated thing | What stops the duplicate |
|---|---|
| the same submission applied twice | `markSignedFromSubmission` is conditional on `active`; the second matches zero rows |
| the same advance intent enqueued twice | unique `(request, recipient, trigger)`; `on conflict do nothing` |
| the same advance run twice | it reads current state — the cohort is already `active`, so nothing activates |
| two final signers racing readiness | `markCompletionReady` is conditional on the two active states; exactly one matches |
| a duplicate cohort activation | `activateRecipients` is conditional on `waiting`, and the one-active-grant partial unique index refuses a second credential |

None of these needs a client `Idempotency-Key`. §163: BACKEND-36's key already
protects the public mutation, and the internal progression uses durable fact
identity instead.

## Failure handling

| Failure | Result |
|---|---|
| corrupt routing data | intents stay OUTSTANDING with `routing-<reason>`; the request may be repairable and marking them applied would hide it forever |
| provisioning throws | whole transaction rolls back; the signature is untouched, and the intent is retried |
| the post-commit advance throws | swallowed WITHOUT the error object — an exception message is unbounded text that may carry a value from the row it failed on |
| delivery provider is down | not this command's concern. BACKEND-45 dispatches intents; a transport failure never rolls routing back |

## The intermediate state BACKEND-36 documented

Closed. A `RecipientSubmission` can no longer exist while the recipient's
workflow state reflects nothing, because the two are written in one transaction
and `applyRecipientSubmissionToWorkflow` throws if the state transition does not
apply — which rolls the submission back with it.
