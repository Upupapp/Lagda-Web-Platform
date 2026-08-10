# Completion readiness

## The rule, precisely

> A signing request becomes `completion-ready` when **every required signing
> participant has an accepted `RecipientSubmission`**, and no disqualifying
> terminal condition exists.

```
required  =  canHoldFields(type)  AND  isRequired
```

Both facts come from `signing_request_recipients` — the immutable snapshot taken
at creation. Nothing in this evaluation reads a contact, a preparation
recipient, or the document's current authoring state.

## What does NOT count

| Participant | Counts? | Why |
|---|---|---|
| `signer`, `approver`, `reviewer`, `acknowledgment-recipient`, required | **yes** | they were asked for something |
| the same four, `is_required = false` | no | the product persists an optional flag; they may act, and the workflow does not wait |
| `viewer` | no | cannot hold fields, so has nothing to submit, ever |
| `carbon-copy` | no | same |

**`signedCount === recipientCount` is the wrong test**, and §39 says so
explicitly. On a request with one signer and two carbon-copies it would never be
true, and the transaction would hang forever waiting for people who were never
asked for anything. The predicate is over an explicit participant SET.

## A decline outranks readiness

Checked first, so a request cannot activate its next cohort — or reach readiness
— on the same evaluation that discovers it is over. See
`SIGNING_TERMINAL_STATES.md`.

## A request with no required participants is REFUSED, not completed

`planWorkflowAdvance` returns `invalid / no-required-participants`. Answering
"completion-ready" would mean a request completing with nobody having signed
anything.

This is a corruption check rather than a product case: BACKEND-32's readiness
gate refuses to create such a request and BACKEND-33's send eligibility refuses
to send one (`no-deliverable-recipient`). Two layers already stop it; this is
the third, and it fails loudly rather than quietly succeeding.

## `completion_ready_at` is the transition time

§67 asks for a deliberate choice between the final submission's `acceptedAt` and
the backend transition time. It is the **transition time**, and the reason is
that they answer different questions:

- `accepted_at` is when a person signed.
- `completion_ready_at` is when LAGDA determined nothing further is outstanding.

Under the synchronous path they are milliseconds apart. When the advance is
applied by a retry or by the reconciler they are not, and collapsing them would
silently reattribute a scheduling delay to a human act — the same error INV-548
forbids for `signed_at`.

It is **not** `completed_at`. The signed document does not exist yet, and
BACKEND-38 owns that column.

## Exactly one transition

`markCompletionReady` is a conditional UPDATE whose predicate names the two
states it may move from. Two final signers racing both evaluate readiness, both
call it, and exactly one matches a row; the other converges on `no-change`
rather than erroring. Asserted against real PostgreSQL, because a fake cannot
prove a conditional UPDATE serializes.

## What completion readiness closes

Once the request is `completion-ready`:

- **no further signing submissions.** `completion-ready` is not in
  `SIGNABLE_REQUEST_STATES`, so `assessSigningEligibility` refuses everyone.
- **no cancellation.** The product offers cancel only while a transaction is
  active; see `SIGNING_TERMINAL_STATES.md`.
- **no routing advance.** There is nothing left to activate.
- **recipient sessions are NOT revoked.** The final signer's response is still
  in flight and the product has a confirmation screen to render (§97). What is
  denied is the mutation, by state, not the session.

## What BACKEND-38 must not assume

`completion-ready` says the OBLIGATIONS are satisfied. It says nothing about the
document. BACKEND-38 must revalidate that every required participant is still
backed by an accepted submission before producing final bytes — the state is a
projection, and the submissions are the evidence.
