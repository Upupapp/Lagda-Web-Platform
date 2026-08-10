# ADR-025 — The signing request as an immutable snapshot

**Status:** Accepted (BACKEND-32)
**Date:** 2026-08-10
**Related:** ADR-021 (contacts), ADR-022 (document vs artifact identity),
ADR-023 (preparation model), ADR-024 (recipient model)

## Context

LAGDA's authoring state is mutable by design. A sender edits a preparation,
moves fields, corrects a recipient's name, renames the document. Every one of
those is correct while nothing has been sent.

A signing transaction cannot work that way. BACKEND-33 must know exactly who to
send to; BACKEND-38 must complete against exactly the geometry that was agreed;
BACKEND-43 must cite exactly what was asked of whom. All three would be wrong if
they read state a sender can still change.

## Decision

**A SigningRequest is an immutable snapshot of one coherent preparation state,
with request-scoped identities.**

1. **Snapshot, not reference.** Recipients, fields, assignments, routing, the
   source artifact and the document title are all COPIED at creation. Nothing is
   re-read afterwards.

2. **New ids for recipients and fields.** `SigningRequestRecipientId` and
   `SigningRequestFieldId`, distinct brands from `RecipientId` and
   `PreparationFieldId`. The `source_*` columns are provenance only, nullable,
   `ON DELETE SET NULL`.

3. **The exact source artifact.** From the preparation, never from input, and
   never "the document's current original".

4. **Assignments constrained on three columns** —
   `(workspace_id, signing_request_id, request_recipient_id)`.

5. **One state, `draft`**, with a CHECK admitting only that. Creating is not
   sending.

6. **Snapshot rows immutable by privilege.** The runtime role holds no `UPDATE`
   grant on either table.

7. **The client supplies nothing.** An empty, closed creation body.

8. **Idempotent, fingerprinted on the document alone**, so a retry after a
   preparation edit replays the original request.

9. **Preparation is not frozen.**

## Alternatives rejected

**Reference the preparation dynamically.** The obvious design and the reason
this ADR exists: a sender editing on Tuesday would change what a recipient saw
on Monday, and a completion certificate would describe a layout nobody agreed to.

**Reuse `PreparationRecipientId` and `PreparationFieldId` forever.** Rejected on
three counts: deleting a preparation recipient would orphan a live workflow (or
the FK would block ordinary editing); reusing one in a second request would make
two workflows share a participant identity; and a preparation field id is
*deliberately reused across saves*, so "field `pf_7`" means a different
rectangle after every drag.

**Store the snapshot as one JSONB blob.** Rejected. BACKEND-34, 37, 38 and 43
all need efficient access by recipient, by field and by request; relational rows
give integrity constraints a blob cannot. Typed columns also mean a future
reader does not have to version-parse yesterday's shape.

**Freeze the preparation on creation.** Rejected: the schema permits more than
one request per document, and freezing would make the second impossible. The
product has no "authoring finished" control to model it on either.

**`UNIQUE (document_id)`.** Rejected on asymmetry: forbidding a second request
the product wants blocks a real action and needs a migration, while permitting
one it does not want costs a single application condition against zero rows. The
only 1:1 evidence was a fixture display shape and a `CONFLICT` rule about a
different aggregate.

**An editable request draft.** Rejected. Nothing in the product creates a request
at all, so nothing edits one; what IS editable is the preparation, which is the
right place. `SIGNING_REQUEST_IMMUTABILITY.md` states the flow: edit the
preparation, create a new request.

**Include the preparation revision in the idempotency fingerprint.** Rejected —
and this is the subtlest decision here. It would make a legitimate retry
arriving after an edit report a spurious conflict, or create a second workflow.
The logical request is "create a request for document D", and that is what is
fingerprinted.

**`SELECT … FOR UPDATE` on the preparation.** Rejected: it adds contention with
the editor's autosave to prevent a race MVCC already prevents. Both possible
interleavings produce a coherent snapshot.

**A snapshot digest.** Deferred, not rejected. There is no consumer today, and a
hash added because hashes sound secure is a hash nobody validates. If BACKEND-43
needs one it must define the canonical serialization precisely.

**Reuse `document.prepare` as the create capability.** Rejected: preparing is
reversible and creating a request is not. Today the same four roles hold both,
which makes the matrix look redundant — until the day a role should draft
layouts without committing anyone to a signature.

## Consequences

**Good**

- A signed document keeps saying who was asked, for what, and where, whatever
  happens to the address book, the layout or the title.
- Cross-request field assignment is a constraint violation, independently of any
  application check.
- Immutability survives a future author adding a repository method, because the
  grant is not there.
- BACKEND-33 through 43 have stable identities to bind to from the first day
  they exist.

**Costs**

- Data is duplicated. A recipient's name exists on the contact, the preparation
  recipient and every request. That is the price of a historical record.
- Correcting a typo after creation means creating a new request. There is no
  edit, and this must be visible in any future send UI.
- Three more tables on the tenancy surface, each with RLS and grants.

**Left open**

- OD-129 through OD-133 — send metadata, expiry, reminders, recipient
  authentication, post-send amendment, cancel/void semantics.
- OD-110 — erasure now reaches its hardest case.
