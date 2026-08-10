# Signature submission architecture

## The chain

```
recipient session cookie + recipient CSRF + Idempotency-Key
      -> RecipientSigningContext                    BACKEND-34
      -> claim the key, scoped to THIS recipient    BACKEND-14
      -> revalidate signability, routing, consent   AT COMMIT TIME
      -> resolve values against immutable assignments
      -> validate the adopted representation
      -> RecipientSubmission + representations + values
      -> complete the key
ONE transaction
```

## Submission model: ATOMIC_RECIPIENT_SUBMISSION

`RecipientContext.submitFinalAction()` is one function that validates every
required field and submits once. There is no per-field finalize anywhere in the
recipient flow, so this is the product's shape rather than a preference applied
to it.

**Atomicity means:** the submission row, every representation and every field
value commit together, or none do. A failure on the last value rolls back the
first. There is no state in which a recipient is half-signed.

## Authentication before idempotency

The session is resolved **first**. An idempotency key is not a credential and
grants nothing (§32): a caller holding only a key fails at authentication,
before the key is ever looked at.

## Revalidation at commit time

Every check runs inside the transaction, against current state:

| Check | Source |
|---|---|
| Session valid, unexpired, unrevoked | BACKEND-34 |
| Request state signable | `signing_requests.state` |
| Routing reached this recipient | activation row |
| Recipient type may sign | `canHoldFields` |
| Required consent accepted | `signing_recipient_consents` — the RECORD, never a client boolean |
| Not already submitted | `recipient_submissions` |

A ceremony page loaded twenty minutes ago proves nothing about now.

## Field ownership: three layers

1. **The server decides the set.** Assignments come from the immutable
   snapshot; a client cannot say "these are all my fields" (§81).
2. **The repository is bound** to one recipient and its read methods take no
   identifying argument.
3. **The database has no referent.** The four-column assignment key means
   another recipient's field cannot be pointed at, only refused.

## What commits, and what does not

**Commits:** one `recipient_submissions` row, zero-to-two
`signing_representations` rows, N `signing_field_values` rows, and the
idempotency completion — all in one transaction.

**Does not:** any recipient state, any request state, any routing activation,
any delivery intent, any PDF, any seal, any evidence event.

## The BACKEND-37 seam

`recipient_submissions.accepted_at` is the authoritative signing instant and the
only timestamp on the row. BACKEND-37 must **reuse** it as the recipient's
signed-at rather than taking a second clock reading — one signing act with two
different times is a scheduling artefact presented as a fact.

## The temporary intermediate state

Until BACKEND-37 lands, the repository can hold an accepted
`RecipientSubmission` while the recipient's workflow state still says nothing
happened. That is expected and recorded (§151): the submission fact is
authoritative, the workflow has simply not consumed it yet.

**This is not externally production-ready until BACKEND-37 consumes it.**
