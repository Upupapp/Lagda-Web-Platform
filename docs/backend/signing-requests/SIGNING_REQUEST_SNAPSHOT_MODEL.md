# The signing request snapshot model

Exactly what is captured when a request is created, and exactly what is not.

## The request

| Captured | Source | Why |
|---|---|---|
| `documentId` | The route | The business relationship. The document outlives the request |
| `sourceArtifactId` | `preparation.source_artifact_id` | The EXACT bytes the geometry applies to — **not** "the document's current original" |
| `sourcePreparationId` | The document's preparation | Provenance |
| `sourcePreparationRevision` | `preparation.revision`, same read | Provenance, and how the snapshot can say which revision it IS |
| `documentTitle` | `document.title`, at this instant | Mutable at source. See below |
| `state` | The constant `draft` | Never from input |
| `createdByUserId` | `AuthenticatedActor.userId` | Never from a body field |
| `createdAt` | One `clock.now()` for the whole transaction | Coherent timestamps |

### Why the title is snapshotted

A document title is mutable (`renameDocument`), and the **signer sees it**: the
product's `RecipientRequest` carries `transactionTitle`
(`src/app/models/recipient.ts:196-211`).

Without the snapshot, renaming a document in October would retroactively rename
the transaction someone signed in March, on their own copy of it.

### Why the original filename is NOT snapshotted

Nothing in the signing flow displays it, and the artifact row still holds it for
internal use. Copying mutable metadata with no consumer is duplication with a
maintenance cost and no benefit.

### Why the workspace name is NOT snapshotted

The product's `RecipientRequest` has `senderWorkspaceDisplayName`, so something
will eventually need it — but that something is the **recipient-facing** view
(BACKEND-34) or the completion certificate (BACKEND-38+), and whichever command
displays it should decide whether it shows the current name or a captured one.
Capturing it now would be guessing at that decision a command early.

## Each recipient

| Captured | Notes |
|---|---|
| `request_recipient_id` | **NEW**, request-scoped. See [RECIPIENT_MODEL](SIGNING_REQUEST_RECIPIENT_MODEL.md) |
| `source_preparation_recipient_id` | Provenance only, nullable, `SET NULL` |
| `name` | Copied |
| `email` | The DELIVERY address, exactly as it was. Not rewritten |
| `normalized_email` | The fold. Internal — never projected to a client |
| `organization` | Copied |
| `recipient_type` | One of six, CHECK-constrained |
| `is_required` | Whether the workflow waits for this participant |
| `order_index` | Display order |
| `routing_order` | The step. **Equal values mean parallel** |

### Routing, narrowly

BACKEND-31 persists one integer per recipient and nothing else. The frontend's
richer `PrepRoutingConfig` — a mode, named groups, `requiredCompletionRule` — is
persisted by **no backend command**, so there is no mode to snapshot.

The integer is copied verbatim. What a gap in the sequence means, and who is
unblocked when, is BACKEND-37's question: this command stores the plan, it does
not execute it.

## Each field

| Captured | Notes |
|---|---|
| `request_field_id` | **NEW**, request-scoped |
| `source_preparation_field_id` | Provenance only, nullable, `SET NULL` |
| `field_type` | One of nine |
| `page_number` | **1-based**, the canonical model |
| `x`, `y`, `width`, `height` | Normalized 0–1, top-left origin, `y` to the field's TOP |
| `required` | Copied |
| `label` | Copied |
| `layer` | z-order |
| `request_recipient_id` | **Remapped** to the request recipient. NOT NULL |

### Geometry is copied, never recomputed

Not re-rounded, not converted, not re-derived. The coordinates were
canonicalized once when the layout was saved; rounding a second time here would
move fields by a pixel for no reason, and would mean the request and the
preparation disagreed about a document they are supposed to describe identically.

A unit test asserts each of `x`, `y`, `width`, `height`, `pageNumber`, `label`
and `required` is byte-identical to its source.

### The assignment is remapped

The mapping `PreparationRecipientId → SigningRequestRecipientId` is built during
creation and **held only for the length of that function**. Nothing persists it:
the request recipient's own columns are authoritative, and the provenance column
may become NULL.

## What is NOT captured, and who owns it

| Absent | Owner |
|---|---|
| `subject`, `message`, sender display name | BACKEND-33. Email copy belongs with the send that uses it, and BACKEND-30 persists none of it |
| `expiresAt`, reminder configuration | BACKEND-46 |
| Signer authentication policy | BACKEND-34 |
| `sentAt`, `deliveredAt`, `viewedAt` | BACKEND-33 / 37 |
| `signedAt`, `declinedAt`, `completedAt` | BACKEND-37 |
| `accessToken`, `otp`, `authenticatedAt` | BACKEND-34 |
| A snapshot digest | Deferred. There is no consumer, and a hash added because hashes sound secure is a hash nobody validates. If BACKEND-43 needs one it must define the canonical serialization precisely — `JSON.stringify` is not one |
| Any PDF bytes | Nothing is rendered. See below |

## The source is the ORIGINAL artifact

There is no prepared artifact to choose instead.

BACKEND-30's preparation is metadata-only: it writes no bytes. The frontend has
no PDF library at all — a grep for `artifact|prepared.?pdf|flatten|sealed` across
`src/` returns one hit, a CSS comment.

So a request signs against **the original artifact plus its field snapshot**.
BACKEND-38 must merge at completion time from exactly those two things. Stated
here explicitly rather than left to be inferred.

## Coherence

Every value above is read on **one unit of work**, at one snapshot of the
database. A concurrent layout save either committed before those reads — in
which case the request captures the new layout, coherently — or commits after,
in which case it captures the old one, coherently.

There is no interleaving that produces recipients from revision 7 and fields
from revision 8. See
[SIGNING_REQUEST_CREATION_CONSISTENCY.md](SIGNING_REQUEST_CREATION_CONSISTENCY.md).
