# Recipient state machine

```
      waiting
         |  routing activation (BACKEND-33 at send, BACKEND-37 per cohort)
         v
      active
       /   \
 accepted   accepted
 submission decline
     |         |
     v         v
  signed    declined      both terminal
```

Four states, and every one is a POSITION rather than an event. Implemented in
`packages/core/src/signing/workflow-state.ts`; stored in
`signing_request_recipient_activation.recipient_state`.

## The two absent edges, and why

**`waiting -> signed` does not exist.** A recipient whose turn has not come holds
no credential, so an accepted submission for them means provisioning or the
routing evaluation is wrong — not that they signed early. The application throws
`SigningWorkflowIntegrityError`, which rolls the submission back with it, and the
database refuses the row independently: the CHECK requires `activated_at` on
every non-waiting state.

**`waiting -> declined` does not exist**, by the same argument. You cannot refuse
a document you have never been given access to.

## Terminal means terminal

`signed` and `declined` carry an explicitly empty action set rather than being
omitted from the table, so adding a fifth state is a compile error instead of a
silent hole. A test asserts every action from every terminal state is refused,
and a second asserts that `active` is the only state from which `signed` is
reachable — INV-560's "no pathway to SIGNED without an accepted submission",
expressed over the whole table rather than sampled.

## What is NOT a state

| Fact | Where it lives | Why not a state |
|---|---|---|
| viewed | `signing_recipient_progress.first_entered_at` | A recipient who opened the document is still `active`. Overwriting that loses the only thing routing needs to know |
| authenticated | `recipient_signing_sessions.authenticated_at` | An event about a session, not a position |
| consented | `signing_recipient_consents` | A legal act, versioned and append-only |
| delivered | `signing_delivery_intents.dispatched_at` | A transport outcome; BACKEND-45 |

**None of them advances routing** (§144, §145, §146). Asserted directly rather
than assumed: `signing-access.test.ts` proves that authenticating changes no
recipient state, leaves the request `sent`, and enqueues no advance intent.

## The signed timestamp

`signed_at` is copied from `recipient_submissions.accepted_at`, and the row NAMES
the submission it took it from through a four-column foreign key that includes
the workspace, the request and the recipient. The claim is therefore checkable
rather than trusted: a reader can join and compare.

`markSignedFromSubmission` takes `signedAt` as a required parameter and there is
no overload that reads a clock. INV-548 forbids a second signing time, and an
optional parameter is exactly how one appears.

## Storage-level integrity

Migration 024 makes three of these rules constraints rather than conventions:

```sql
-- every non-waiting state has been activated
(recipient_state = 'waiting' and activated_at is null)
  or (recipient_state <> 'waiting' and activated_at is not null)

-- SIGNED implies both a timestamp and a submission; neither without it
(recipient_state = 'signed' and signed_at is not null and submission_id is not null)
  or (recipient_state <> 'signed' and signed_at is null and submission_id is null)

-- and the submission must be THIS recipient's, of THIS request, in THIS tenant
foreign key (submission_id, workspace_id, signing_request_id, request_recipient_id)
  references recipient_submissions (...)
```

The one link a CHECK cannot enforce is that `signed_at` EQUALS the submission's
`accepted_at` — a CHECK may not read another table. It is enforced by the write
path taking the value from the submission record it is already holding, and
asserted by test.
