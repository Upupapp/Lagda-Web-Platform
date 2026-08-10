# Document lifecycle

**A document has no lifecycle state.** That is the finding, not a gap.

## What the product actually has

Every status LAGDA displays on a "document" is a `TransactionStatus`:

```
draft · ready-to-send · sent · delivered · viewed ·
authentication-completed · awaiting-signature · awaiting-approval ·
partially-completed · completed · declined · cancelled · expired ·
failed-delivery · voided · needs-attention · archived
```

Seventeen values, and all seventeen belong to a **signing transaction**.
`DocumentListItem.status` is typed `TransactionStatus`; `VIEW_STATUS_SET` maps
every view — Drafts, In Progress, Completed, Archived — to sets of them.

`TransactionFile`, the product's real per-document shape, has **no status field
and no `archivedAt`**. It has `uploadedAt`, `isPrimary`, `completedCopyAvailable`
and `integrityState` — and the last two are about artifacts, not about a
document's own state.

So: `documents` has no `status` column, no `archived_at`, no `deleted_at`. An
architecture guard asserts their absence in migration 016, and a second guard
asserts no signing-status string literal appears anywhere in the document domain.

## The two states a document does have

Not lifecycle states — a derived fact about whether its bytes have arrived:

| | `source` | Meaning |
|---|---|---|
| **Awaiting its file** | `null` | Created; the upload has not landed |
| **Has its original** | populated | An ORIGINAL artifact exists |

```
CreateDocument ──▶ [ source: null ] ──▶ secure upload ──▶ [ source: {...} ]
```

This is **derived**, never stored: it is the presence or absence of an
`original` row in `document_artifacts`. A status column mirroring it would be a
second representation of one fact, and the denormalised one always drifts — the
same reasoning that kept a status column off invitations and contacts.

### Why "awaiting its file" is a real state and not an anomaly

The storage key embeds the `documentId`, so the document must exist before the
bytes can be filed (DOCUMENT_ARTIFACT_MODEL.md). The window between the two is
unavoidable, and modelling it as `null` rather than hiding it behind a flag is
what lets a client render "awaiting file" instead of treating the document as
broken.

A document can also stay in that state permanently — if the upload is rejected
for malware, or the user abandons the flow. That leaves a metadata row with no
bytes: cheap, harmless, and visible. There is no cleanup job for it, which is a
deliberate omission recorded as OD-117 rather than an oversight.

## Everything is permitted in both states

| Operation | No bytes | With bytes |
|---|---|---|
| Read | ✅ | ✅ |
| List | ✅ | ✅ |
| Rename | ✅ | ✅ |
| Receive an upload | ✅ | ❌ — one ORIGINAL per document |

Nothing is gated on the presence of an artifact. A document awaiting its file
can be renamed, which matters because the prepare flow lets a user set a title
before or after choosing a file.

## Renaming is not restricted by transaction state

The product's action is `rename-draft`, which reads like "drafts only". But
"draft" there is a **`TransactionStatus`**, and this command deliberately does
not know about transaction status.

Implementing the restriction now would mean inventing the state it depends on —
exactly what §33 forbids. Once BACKEND-32 exists, whether a document attached to
a **sent** transaction may be renamed is a decision it can make with the state
to make it. Recorded as OD-118.

Note that the restriction is about tidiness rather than integrity: renaming
cannot corrupt anything. The artifact digest is untouched, and signing evidence
snapshots its own display text rather than reading this column later.

## What does not exist, and why

| | Why absent |
|---|---|
| **ARCHIVED** | `archive` and `restore` are transaction actions. `TransactionFile` has no `archivedAt`. BACKEND-32 |
| **DELETED** | No delete anywhere in the product, and the runtime role has no DELETE grant. DOCUMENT_DELETION_POLICY.md |
| **PREPARED** | Preparation produces field metadata, not a new PDF. Migration 003 records the same answer for `artifact_type` |
| **SENT / SIGNED / COMPLETED** | Transaction states. A document may back several transactions, so copying one transaction's state onto it would be wrong as soon as there are two |

## The seam BACKEND-30 extends

Preparation state is **not** a document status. A document backs preparation;
it does not become "prepared".

If BACKEND-30 needs a state — "fields placed", "ready to send" — it belongs to
the preparation aggregate keyed on `DocumentId`, or to the transaction, and it
must be able to coexist with a second transaction over the same document
(§104). Adding a `status` column to `documents` would foreclose that, and would
be the column BACKEND-32 then has to reconcile against the signing state it
duplicates.
