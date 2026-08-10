# Signing state architecture

**Backend:** BACKEND-37 · **Migration:** 024

```
accepted RecipientSubmission
     |
     v  (SAME transaction)
recipient  active -> signed,  signed_at = submission.accepted_at
     +  a durable advance intent
  [commit]
     |
     v  (workspace transaction)
lock the request
read every recipient's state, joined to the immutable snapshot
plan, in the pure domain
     |
     +--> next cohort activated + provisioned through BACKEND-33
     +--> request -> completion-ready
     +--> request -> declined
  [commit]
```

## The state the product does not have

`completion-ready` is the only value in `SIGNING_REQUEST_STATES` that was not
read out of the product's `TransactionStatus`. It was added deliberately.

The product conflates two facts that fail independently: *everyone signed* and
*the completed document exists*. PDF merge, certificate generation and sealing
all happen after the last signature is legally binding, and each can fail. A
status that called that moment `completed` would claim an artifact nobody has —
in a state that is terminal, legally significant, and cannot be walked back.

So BACKEND-37 stops one step short. `completed` has exactly one inbound edge in
the transition table, it starts at `completion-ready`, and BACKEND-37 holds no
path to it. An architecture guard asserts the string does not appear in the
workflow module at all.

## Two realms, and why the progression is split across them

**This is the central finding of the command, and it is a security property
rather than an engineering preference.**

Migration 022 bound the recipient-session realm to its OWN recipient row with
RESTRICTIVE row-level security, on `signing_request_recipients`,
`signing_request_fields`, `signing_recipient_progress`,
`signing_recipient_consents`, `signing_requests` and `document_artifacts`.

Activating the next cohort requires reading the next recipient's type, routing
order, name and email — the delivery intent that invites them literally carries
the address. A signer's own transaction structurally cannot do it, and making
the whole progression atomic (§24's preference) would mean widening that policy
so that any signer's own request can read every participant of the request. That
trades the strongest tenancy control in the signing stack for one commit.

The split therefore falls exactly where the realms do:

| Realm | What it moves | When |
|---|---|---|
| recipient | their OWN state, and the advance intent | inside the submission transaction |
| workspace | routing, provisioning, request state | driven by that intent |

`SIGNING_STATE_CONSISTENCY.md` records why this cannot strand an accepted
signature.

## Where each fact lives

| Fact | Column | Written by |
|---|---|---|
| recipient position | `signing_request_recipient_activation.recipient_state` | BACKEND-33 (waiting/active), BACKEND-37 (signed/declined) |
| activated at | `.activated_at` | send, then each routing advance |
| **signed at** | `.signed_at` | copied from `recipient_submissions.accepted_at`, never a clock |
| the submission it names | `.submission_id`, four-column FK | the signing transaction |
| declined at / why | `.declined_at`, `.decline_reason` | the decline |
| first entered the ceremony | `signing_recipient_progress.first_entered_at` | BACKEND-35, unchanged |
| authenticated at | `recipient_signing_sessions.authenticated_at` | BACKEND-34, unchanged |
| workflow closed at | `signing_requests.completion_ready_at` | the advance |
| ended without completing | `.terminated_at`, `.termination_reason` | decline or cancel |
| the sender's cancel reason | `.cancellation_note`, bounded at 200 | cancel |

## One state column, not two

BACKEND-33 wrote at its own declaration that activation holds "two values, and
neither is a ceremony state". That was right while the answers were `waiting`
and `active`. It stops being right once `signed` exists: *whose turn is it* and
*what did they do* become the same question, and every gate that asks whether a
recipient may act needs one answer. Two columns on two tables would be two
answers that must agree, which is the combination §15 forbids.

So the column was WIDENED and RENAMED — `activation_state` -> `recipient_state`
— rather than a second state being added beside it. The rename is not cosmetic:
`activation_state = 'signed'` reads as a lie.

`signing_recipient_progress` keeps exactly what it was built for and gains
nothing, so there is still one place a recipient's position is recorded.

## One signability rule

Before BACKEND-37, "may this recipient act?" was answered in three places:
BACKEND-34's bootstrap check, BACKEND-35's `assessCeremonyAccess`, and
BACKEND-36's revalidation. Three answers that happen to agree is not one answer,
and when they diverge the LOOSEST one wins, because a caller only has to find it.

`assessSigningEligibility` in `packages/core/src/signing/workflow-state.ts` is
now the only implementation. `assessCeremonyAccess` is a projection of it, and
the ceremony's own `CEREMONY_SIGNABLE_REQUEST_STATES` was deleted. An
architecture guard asserts the list is declared exactly once, in that file.

### The check order changed, and the reason is worth keeping

The recipient's own outcome is checked BEFORE the request state. Every branch is
a denial, so the order cannot widen access — it only decides which true sentence
the recipient is told. After the last required signature the request becomes
`completion-ready`, so a request-first order would tell the person who just
signed that the document is not signable: true of the request, and misleading
about them. The product has a confirmation screen for exactly that moment.

## What BACKEND-38 inherits

A durable, queryable fact: `signing_requests.state = 'completion-ready'` with
`completion_ready_at` set. Every required signing obligation behind it is backed
by an immutable `RecipientSubmission`, and the four-column foreign key means a
workflow row cannot cite a submission that is not its own recipient's.
