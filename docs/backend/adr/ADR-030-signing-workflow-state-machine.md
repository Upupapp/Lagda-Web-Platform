# ADR-030 — The signing workflow state machine

**Status:** Accepted (BACKEND-37) · **Migration:** 024

## Context

BACKEND-36 produced an immutable, idempotent, concurrency-safe
`RecipientSubmission` and deliberately stopped there. The repository could hold
an accepted signing act while the recipient's workflow state said nothing had
happened, and BACKEND-36's own report called the feature not externally
production-ready until that gap closed.

Closing it needs three decisions at once: what a recipient's state IS, what the
request's state becomes, and where "the last signature" sits relative to "the
signed document exists".

## Decision

**Four recipient states, one column.** `waiting`, `active`, `signed`,
`declined`, on `signing_request_recipient_activation` — widened and renamed from
BACKEND-33's two-value `activation_state`. Not a second state table beside it:
once `signed` exists, *whose turn is it* and *what did they do* are the same
question, and two columns that must agree is the shape §15 forbids. Events
(viewed, authenticated, consented) stay as their own timestamps.

**`RecipientSubmission.acceptedAt` is the signing time.** Copied into
`signed_at`, with a four-column foreign key naming the submission it came from,
so the claim is checkable. `markSignedFromSubmission` has no overload that reads
a clock.

**A new request state, `completion-ready`.** Every required signing obligation
is satisfied and the final artifact does not exist. `completed` keeps exactly
one inbound edge, from `completion-ready`, and BACKEND-37 holds no path to it.

**One canonical signability policy**, `assessSigningEligibility`. BACKEND-34,
BACKEND-35 and BACKEND-36 all delegate; the ceremony's own list of signable
states was deleted.

**A hybrid consistency model.** The signer's own state commits with their
signature; routing and request progression are driven by a durable advance
intent, applied synchronously after commit and reconciled automatically if that
fails.

## Alternatives considered

**Derive everything dynamically from submissions.** No stored state at all —
"is this recipient signed?" becomes a query. Genuinely appealing: nothing can
drift, because there is nothing to drift. Rejected because routing has to ask
the question on every access check and every advance, the query joins four
tables, and the routing gate is on the hot path of every recipient page load.
The stored state is a denormalization, and the submission remains the fact — an
invariant this ADR states rather than a property it assumes.

**One generic status enum per entity, with a setter.** Rejected for the reason
§16 gives and this repository has been bitten by before: once `updateState`
exists, `PATCH /signing-requests/:id { state }` is one careless handler away.
Every transition here is a named conditional UPDATE, and an architecture guard
asserts no generic setter exists at any layer.

**Mark the request `completed` when the last signer submits.** The obvious
model, and the one the product's own status vocabulary implies. Rejected
because PDF merge, certificate generation and sealing all happen afterwards and
all can fail — and `completed` is terminal and legally significant, so a request
that reached it wrongly cannot be walked back. The failure would be silent and
permanent, and it would be the most consequential record in the product.

**Everything in the submission transaction (§24's preference).** Rejected on a
security ground rather than a technical one: migration 022 binds the recipient
realm to its own recipient row, and provisioning the next cohort needs the next
recipient's snapshot and email. Making it atomic means widening that policy so
any signer's request can read every participant. The hybrid keeps the tenancy
control and loses nothing, because the signature and its own state still commit
together.

**A generic transactional outbox.** Rejected as unnecessary, not wrong — ADR-026
made the same call for `signing_delivery_intents`, and a second mechanism beside
it would be two ways to say "durable follow-up work".

## Consequences

- The intermediate state BACKEND-36 documented no longer exists.
- OD-017 is closed by the product rather than by preference: one participant's
  decline ends the request.
- OD-151's lock order is implemented, not just recorded, so the
  submission-versus-cancellation race is closed rather than narrowed.
- `signing_workflow_advance_intents` carries no RLS, which is a deliberate third
  exception to the tenancy rule, justified by its content and precedented by
  `idempotency_records`.
- BACKEND-38 begins from a durable, queryable `completion-ready`, and must
  revalidate the submissions behind it rather than trusting the state.
