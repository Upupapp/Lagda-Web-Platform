# BACKEND-31 report — the signing recipient model

**Backend:** `632a423` · **Migration:** 018 · **Date:** 2026-08-10

## What was built

A recipient: a participant in one document's preparation, holding a snapshot of
a name, an email and an organization, plus what they are expected to do and when
their turn comes.

- `preparation_recipients`, with RLS + FORCE and five constraints that each
  carry a rule.
- `preparation_fields.participant_slot` **dropped** and replaced by a real
  `recipient_id` on a three-column foreign key.
- A third email brand, `RecipientEmailKey`.
- Five HTTP routes nested under the document.
- 135 new assertions.

## Defects found while proving it

### 1. A composite `ON DELETE SET NULL` nulls every referencing column

The first draft of migration 018 wrote:

```sql
foreign key (workspace_id, source_contact_id)
  references contacts (workspace_id, contact_id)
  on delete set null
```

which is not "forget the provenance". It is "set `workspace_id` to NULL as
well", and `workspace_id` is `NOT NULL` — so deleting a contact would have
failed outright with a not-null violation, leaving the recipient behind an error
nobody could act on. The clause written to protect the recipient would have been
the thing that broke.

Fixed with the column list, PostgreSQL 15+:

```sql
on delete set null (source_contact_id)
```

Found by the integration test that deletes a contact and asserts the recipient
survives with its tenancy intact. It is worth noting what would have missed it:
contacts currently cannot be deleted at all — BACKEND-28 granted the runtime
role no `DELETE` — so nothing in normal operation would have exercised this
until whoever implements OD-110's erasure hit it years later. The test performs
the delete as the *owner* role precisely to reach the case the runtime role
cannot.

### 2. `RecipientId` was declared twice

BACKEND-10 declared it speculatively in `evidence.ts` for an evidence actor
whose table did not exist. Two identical brands that agree by coincidence of
brand string are one refactor away from disagreeing. Canonical declaration now
lives with the table; `evidence.ts` re-exports.

## Decisions and where they are recorded

| Decision | Document |
|---|---|
| Snapshot, not reference | [RECIPIENT_SNAPSHOT_MODEL.md](RECIPIENT_SNAPSHOT_MODEL.md) |
| Delivery address, not identity | [RECIPIENT_IDENTITY.md](RECIPIENT_IDENTITY.md) |
| Duplicates refused, unlike contacts | [RECIPIENT_DUPLICATE_POLICY.md](RECIPIENT_DUPLICATE_POLICY.md) |
| Three-column assignment key; RESTRICT not CASCADE | [RECIPIENT_FIELD_ASSIGNMENT.md](RECIPIENT_FIELD_ASSIGNMENT.md) |
| No new capability | ADR-024, OD-128 |
| Six types, no witness | [RECIPIENT_PRODUCT_INVENTORY.md](RECIPIENT_PRODUCT_INVENTORY.md) |

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass — build graph and the tools project (tests included) |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1503 passed, 51 files** |
| `npm run test:integration` | **497 passed, 49 skipped** (storage/upload need object storage) |
| Migration from zero | Verified — `lagda_test` dropped and rebuilt from migration 001 |
| Migration `down` | Written; restores `participant_slot` and drops the table |

## Honest gaps

**Readiness is not enforced.** A preparation can be saved with required fields
that have no assignee. `fieldRequiresRecipient` says all nine types need one *at
readiness*, and readiness belongs to the send flow. Enforcing it at save time
would block the ordinary act of building a layout. **OD-127.**

**Recipients are unversioned.** The layout has `expectedRevision`; recipients do
not. Two people editing the same participant is last-write-wins per field. Both
are the sender's own edits, and a revision would add ceremony without preventing
loss. Duplicates and deletion races *are* handled, by the database.

**No rate limiting.** A normal authenticated write, like the layout save.
Recipient lists are small and the ceiling is 50.

**Nothing is sent.** No email provider, and a recipient row proves nothing about
delivery. BACKEND-33/34.

**No frontend contract fixtures.** OD-126 stands unchanged — the frontend does
not yet call these routes.

**Preparation requires accepted bytes.** Adding a recipient lazily creates the
preparation, which needs the original artifact — so a document with no uploaded
file, or with rotated pages (OD-124), accepts no recipients either. Correct for
the product's flow (upload → prepare → send), and worth knowing.

## What BACKEND-32 inherits

1. **Snapshot the recipient set** when a signing request is created, the same
   way a recipient snapshots a contact. A sender editing a draft on Tuesday must
   not change who a recipient saw on Monday.
2. **`locked_at` still has no writer.** Every recipient mutation conditions on
   it — `PreparationNotEditableError` exists and is unreachable — so the freeze
   is one statement when the state that triggers it exists.
3. **Readiness validation** (OD-127): every required field assigned, at least
   one participant who blocks completion, a routing plan that terminates.
4. **Removal after sending is an event, not a row deletion.** A hard delete is
   correct only while nothing has been sent.
