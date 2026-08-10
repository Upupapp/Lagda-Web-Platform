# Preparation editability

## When a layout may change

**Whenever `locked_at` is null**, which today is always — nothing sets it.

The rule lives in one predicate, `isPreparationEditable`, and is enforced in the
same `UPDATE` that claims the next revision. There is no path that checks
editability and then writes.

## Concurrency: the editor autosaves and tabs multiply

Whole-layout replacement is the right shape for a drag-and-drop canvas
(PREPARATION_ARCHITECTURE.md §"Mutation model"), and it has one sharp edge: two
tabs open on the same document, the second saving a layout it read before the
first saved.

Without protection the second silently erases work the user never saw
disappear.

### The revision

```
GET  →  revision 7, 12 fields
                          … another tab saves → revision 8
PUT  expectedRevision 7 →  409, "reload and try again"
```

`expectedRevision` is checked in the claiming `UPDATE`, so the stale save
matches zero rows. **Last-write-wins is not what happens** — last-write-wins
would be silent, and this is not.

`revision` is **concurrency metadata, never authorization** (§109). Knowing it
grants nothing; a caller who guesses it still needs `document.prepare` and a
membership.

### `expectedRevision: 0` and the first save

A client that opened a document with no preparation reads revision `0`, because
that is what `GET` returns for one that does not exist yet. Lazy creation then
inserts at revision 1, so a naive comparison would never match.

The use case reconciles it: **when this call created the row**, the client's `0`
was accurate and is translated to the revision it now holds. When the row
already existed — including because a racing first save created it a moment ago
— the client's value stands and the save is refused. That refusal is correct:
the other tab's fields are already saved, and this one would erase them.

*(This was a real bug in the first draft: the first save always 409'd. The
use-case tests caught it.)*

### The create race

Two autosaves on a never-prepared document both try to create. `UNIQUE
(workspace_id, document_id)` means one insert wins; the loser catches the
violation and re-reads rather than failing, because both callers wanted the same
thing.

Proved against **real PostgreSQL** with genuinely concurrent transactions. It is
deliberately *not* proved against the in-memory fake: the fake rolls back by
restoring a whole-store snapshot, so a losing transaction would discard the
winner's committed writes too. A test that passed there would be testing the
fake.

### Atomicity

A layout save is one transaction: claim the revision, delete the old fields,
insert the new ones. A validation failure — or a CHECK violation on field 40 —
leaves the previous layout **entirely** intact (§247), asserted in integration.

## The immutability moment is BACKEND-32's, and it is a SNAPSHOT

> **A signing request must not read live preparation after it is created.**

Otherwise a sender editing the layout on Tuesday changes what a recipient who
opened the document on Monday is being asked to sign — silently, with no record
that it happened.

This is the same rule as
[CONTACT_RECIPIENT_BOUNDARY.md](../contacts/CONTACT_RECIPIENT_BOUNDARY.md): a
mutable source record must not rewrite historical transaction state. There, a
recipient snapshots a contact's name and email. Here, a signing request must
snapshot the field layout.

### Why a snapshot rather than only a lock

A lock alone would freeze the preparation and let the signing request point at
it. That is worse in three ways:

1. **One document, several transactions.** Nothing in the product says a
   document is sent once (§104). A lock makes the second send impossible or the
   first one wrong.
2. **Every future edit path is a place to forget the lock.** A snapshot makes
   the question moot — there is nothing live to read.
3. **A completed transaction should be able to say what it asked for**, in its
   own right, without depending on a row someone may later unlock.

The lock is still useful as a guard *during* an active send, which is why
`locked_at` exists.

### What BACKEND-32 must do

- **Snapshot transactionally.** Copy the fields and freeze in ONE transaction,
  so an edit cannot commit between the read and the freeze (§160). The
  `revision` is the value to capture and re-check.
- **Copy values, not references.** A snapshot row holding a `preparation_field_id`
  is not a snapshot.
- **Record the source artifact.** The preparation names the exact artifact its
  coordinates target; the snapshot must carry it, so evidence can say which
  bytes the geometry applied to.
- **Never reconstruct a past ceremony from current preparation** (§268). If a
  signing request needs to know its layout, it holds it.

Canonical serialization is already in place should a snapshot want hashing
(§161, §162): stable ordering, explicit types, no arbitrary maps, coordinates
rounded to a fixed precision. No preparation hash is computed today, because
nothing consumes one.

## What archives and deletion do

A document has no archive and no delete (BACKEND-29), so neither reaches
preparation. Preparation fields cascade from their preparation — the schema's
only `ON DELETE CASCADE`, justified because a field has no meaning without its
parent and nothing references one.

Nothing cascades from a document, an artifact or a workspace: all RESTRICT.
