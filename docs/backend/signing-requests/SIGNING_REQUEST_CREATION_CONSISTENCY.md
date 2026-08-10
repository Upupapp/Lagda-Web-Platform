# Creation consistency

How a snapshot is guaranteed coherent, and how a retry cannot duplicate a
workflow.

## One transaction, nothing outside PostgreSQL

```
runForWorkspace(workspaceId):
  authorize                      read the actor's CURRENT membership
  ── begin the snapshot ──
  documents.findById             the document, and its title
  preparations.findByDocument    the preparation, and its revision
  artifacts.listForDocument      the exact source artifact
  recipients.list                the participants
  preparations.listFields        the layout
  assessSnapshotReadiness        pure, on the rows just read
  signingRequests.createSnapshot request + recipients + fields
  idempotency claim              completed, same transaction
commit
```

No email, no queue, no object storage, no PDF parsing, no crypto. The
transaction is short, it is entirely inside PostgreSQL, and it either happens
completely or not at all.

## Why one transaction is the whole coherence story

The five reads happen at **one snapshot of the database**. A concurrent
`saveDocumentPreparation` either committed before them — in which case this
request captures the new layout, coherently — or commits after, in which case it
captures the old one, coherently.

There is no interleaving that produces recipients from revision 7 and fields
from revision 8. PostgreSQL's MVCC gives this for free at READ COMMITTED,
because all five reads are in one transaction and each sees a consistent view.

`source_preparation_revision` is recorded from the same read, so a snapshot can
always say which revision it IS.

### Why no explicit lock

`SELECT … FOR UPDATE` on the preparation row was considered and is not used.

It would add contention between creating a request and the editor's autosave —
two operations a sender may genuinely perform seconds apart — to prevent a race
that MVCC already prevents. A lock that buys nothing costs latency on the
editor's hot path.

What a lock *would* additionally give is a guarantee that the revision cannot
advance between the read and the commit. That does not matter: if it advances,
this request captured revision N and the preparation is now at N+1, which is
exactly the normal, documented, tested behaviour.

### The race, stated precisely

| Interleaving | Result |
|---|---|
| Layout save commits, then creation reads | Request captures the NEW layout |
| Creation reads, then layout save commits | Request captures the OLD layout; the preparation advances |
| Both in flight | One of the two above. Never a mix |

Both outcomes are correct. Neither is half-old and half-new.

## Readiness, before anything is generated

`assessSnapshotReadiness` runs on the rows just read, before a single id is
generated and before a single row is written. A workflow that could never
complete does not become a durable record.

The rules come from `docs/backend-integration-handoff.md` §10 verbatim — *"all
participants have email, routing is valid, at least one signing field per
signer"* — plus the assignment integrity that becomes load-bearing once the
snapshot is immutable.

The first two are already structural: BACKEND-31's CHECK constraints make an
email-less or badly-routed recipient unstorable. What is left:

| Blocker | Meaning |
|---|---|
| `no-recipients` | Nobody to send to |
| `no-fields` | Nothing to ask for |
| `no-blocking-participant` | Only viewers and carbon-copies — the workflow could never complete |
| `unassigned-field` | Legitimate authoring, impossible workflow |
| `dangling-assignment` | Should be unreachable; refused rather than snapshotted |
| `ineligible-assignee` | Should be unreachable; same |
| `participant-without-field` | A required signer asked for nothing would stall forever |

Every blocker is reported, not just the first. Each names an **index**, never a
label, a name or an address.

## Idempotency

**Operation** `signingRequest.create`. **Scope** the workspace. **Required** at
the route, like invitations.

### The fingerprint is the ASK, not the answer

```ts
request: { documentId }
```

The document, and nothing else. Deliberately **not** the preparation revision,
the recipients, the fields or any generated id.

"Create a signing request for document D" is one logical request. Consider what
a revision in the fingerprint would do:

```
T0  create with key K          preparation at revision 7
T1  it commits                 SigningRequest SR-1 exists
T2  the sender edits           preparation reaches revision 8
T3  the network retry sends K
```

At T3 the fingerprint would differ, and the framework would report a **conflict**
— for a retry of a request that already succeeded, which the caller cannot act
on. Under a different design it would create a second workflow from revision 8,
which is worse: two sets of invitations for one agreement.

With the document alone, T3 **replays SR-1**. The stored body wins, and the
caller learns the id of the workflow that exists rather than one that never
will. A unit test walks exactly this sequence and asserts the replayed snapshot
still holds the revision-7 values.

### The claim commits with the snapshot

`createIdempotencyService` is called with `uow.idempotency` — the repository
from the same unit of work — so the claim is inserted **inside** the business
transaction. A rollback takes it with it, so a failed attempt does not poison
the key, and a concurrent duplicate blocks on the unique index rather than
creating a second workflow.

### Concurrency

Two genuinely concurrent creations under one key produce **exactly one
request**. Proven against real PostgreSQL: two transactions open before either
commits, and afterwards `count(*) from signing_requests` is 1. One caller may
receive the in-progress error the framework documents rather than a replay;
what must hold — and does — is that only one workflow exists.

### A different key creates a second request

Correct, and deliberate: the schema permits more than one request per document.
Two different keys are two different intentions.

## Authorization inside the transaction

The actor's membership is read through the same unit of work the write uses, so
a contributor demoted mid-request cannot commit under authority they have just
lost. One indexed query, on every mutation in the domain.

## Failure atomicity

| Failure | Result |
|---|---|
| Not a member, or lacks the capability | Hidden 404. Nothing written |
| Document absent or another tenant's | 404. Nothing written |
| No preparation | 409 `document_not_prepared`. Nothing written |
| Readiness blockers | 422 with every blocker. Nothing written |
| Corrupt preparation | 500 `preparation_integrity`. Nothing written, and operationally visible |
| A constraint fires mid-write | The whole transaction rolls back — request, recipients, fields and claim together |

A unit test asserts all three tables are empty after a readiness failure.
