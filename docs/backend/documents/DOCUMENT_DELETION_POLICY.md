# Document deletion policy

## The answer

**NO DELETE, and no archive either.** Option C of §43, plus one step further:
the runtime database role holds `select, insert, update` on `documents` and
nothing else.

## Why

**The product has neither.** `document.service.ts` has eight operations —
`list`, `getFolders`, `getTags`, `archive`, `restore`, `renameDraft`, `addTag`,
`moveToFolder` — and every one operates on a **transaction**. `TransactionFile`,
the per-document shape, has no `archivedAt`, no delete action and no status.

Adding either would mean inventing a document-level lifecycle the product does
not have, and then reconciling it against the transaction-level one that does.

**And a document is referenced by things that must not lose their referent.**
Today: immutable artifacts, via a compound foreign key. Soon: signing requests,
recipients, evidence events, seals and verification records — `evidence_events`
and `verification_records` already carry a `document_id`.

## Enforcement, in layers

| Layer | Control |
|---|---|
| Database | No `DELETE` grant on `documents` for `lagda_app` |
| Schema | `document_artifacts → documents` is `ON DELETE RESTRICT` |
| Repository | No `delete`, `archive` or `restore` method on the port |
| API | No `DELETE` route; the path 404s |
| Guard | Architecture test asserts the grant, the absence of `deleteFrom`, and the absence of a DELETE route |

The grant is the one that matters. A repository omitting a method is a
convention someone can add to; a missing privilege refuses the statement.
Proved by an integration test that issues `delete from documents` as the runtime
role and expects `permission denied`.

## No cascade, anywhere

`ON DELETE RESTRICT` on every reference, and an architecture guard asserting
migration 016 contains no `cascade` and no `set null`.

A cascade from a document to its artifacts would let one delete destroy the
immutable record that a set of bytes existed — which is the evidence a
completion certificate rests on. A `SET NULL` would be worse: an artifact with
no document is an orphaned object nothing can find and nothing can attribute.

## Artifacts are never deleted by a document operation

No document operation issues an object-storage delete. There is no code path
from the document domain to storage at all — the domain imports no storage
client, asserted by a guard.

Unreferenced object reconciliation is BACKEND-55/60's problem, and BACKEND-18's
orphan cleanup already reads `document_uploads.quarantine_cleared_at` rather
than guessing from a bucket listing.

## The upload-cleanup race (§241)

**Not reachable in the current design**, and worth stating precisely rather than
claiming a test that does not exist.

BACKEND-18's cleanup deletes **quarantine objects**, keyed on
`document_uploads.quarantine_cleared_at is null`. It never touches an accepted
artifact: promotion copies bytes into the artifacts zone and the quarantine copy
is what gets removed. So "cleanup deletes a successfully referenced artifact" has
no code path — there is no candidate list that an accepted artifact appears on.

Document creation does not change this. It writes metadata and claims nothing in
storage; the artifact is written by the upload pipeline, and by then the
promotion has already happened.

The test matrix records this as **N/A with a reason** rather than PASS.

## Data-subject erasure

Not implemented, and materially harder than for contacts (OD-110).

A document's **content** is the personal data — a PDF may contain names,
addresses, government identifiers, medical or financial detail — and it is also
the evidence a signature attests to. Erasing it destroys the thing a completion
certificate certifies.

The Data Privacy Act's erasure right is not absolute, and a signed contract has
a strong competing basis for retention. But LAGDA currently has **no operation
at all**, so there is nothing to weigh. That is OD-119 and it belongs to
BACKEND-55.

## What BACKEND-32 inherits

When signing requests reference documents:

- **Do not add a cascade.** A cancelled transaction must not delete a document
  another transaction also uses.
- **Do not make deletion conditional on reference count.** "You cannot delete
  this, it is on 3 transactions" invites the inverse: deletion permitted at
  zero. The current answer — deletion does not exist — needs no counting.
- **If a "remove from library" action ever appears**, it is almost certainly an
  archive flag on a *transaction*, which is what the product already has.
