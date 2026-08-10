# ADR-022 — Document identity versus artifact identity

**Status:** Accepted · **Date:** 2026-08-10 · **Command:** BACKEND-29

Builds on [ADR-012](./ADR-012-s3-compatible-object-storage.md) (storage),
[ADR-013](./ADR-013-secure-document-upload-pipeline.md) (the upload pipeline)
and [ADR-020](./ADR-020-workspace-role-capability-authorization.md)
(capabilities).

---

## Context

A LAGDA document begins as an uploaded PDF and, over its life, becomes several
byte-distinct things: the original, a sealed version carrying signatures, and a
completion certificate. Each has its own SHA-256, its own storage object and its
own place in the evidence chain.

Meanwhile a workspace refers to *one lease* — a thing users name, rename, list
and eventually send. Those two ideas have different lifetimes and different
mutability, and the question this ADR settles is whether they are one record or
two.

Two constraints were already in place before this command, and they matter:

- `document_artifacts` has carried `document_id NOT NULL` since migration 003,
  with **no foreign key**, because there was no `documents` table to point at.
  It was a client-supplied string naming nothing.
- The storage key is `{workspaceId}/{documentId}/{artifactId}` (BACKEND-17), and
  `UploadRequest.documentId` is an **input** to the pipeline (BACKEND-18). Its
  route says so, and defers the fix to this command.

## Decision

**A stable workspace-owned `DocumentId`, plus immutable `ArtifactId`s for exact
byte representations.** Document metadata and lifecycle are separate from
artifact bytes.

1. `DocumentId`, `ArtifactId`, the storage key and the content digest are **four
   identifiers with four meanings**, none derived from another.
2. The relation lives on the **artifact** — `document_artifacts.document_id`,
   which migration 016 makes a tenant-safe compound foreign key. No
   `original_artifact_id` column on `documents`, and no join table.
3. **Accepted bytes are never rewritten.** Any byte-changing operation produces
   a new artifact with a new id and a new digest.
4. **Document-first creation.** The document exists before its bytes, because
   the storage key embeds its id.
5. A document has **no lifecycle state**. Every status the product displays
   belongs to a signing transaction.
6. `documents` is workspace-scoped with ordinary RLS. No new transaction scope.

## Alternatives considered

### The artifact IS the document

The simplest model: one row, one PDF, overwrite as it changes.

Rejected. Overwriting the original destroys the evidence that the
pre-signature document existed — on a platform whose product is proof that a
specific set of bytes was signed. A completion certificate names a digest; if
the digest's bytes can be replaced, the certificate certifies nothing.

### A new Document for every byte change

The other extreme: `original`, `sealed` and `certificate` become three
documents.

Rejected. "The lease" becomes three unrelated records with no way to say they
are the same matter, and every list in the product shows the same thing three
times. It also makes the obvious question — *which of these is the current
one?* — unanswerable without inventing exactly the link this ADR is about.

### `original_artifact_id` on `documents`

Tempting because it makes the common read a single query.

Rejected: it is a **second authority** on which bytes belong to a document,
alongside `document_artifacts.document_id`, and the two disagree the first time
one is written without the other. It also does not generalise — `sealed` and
`certificate` would each want a column, and §51 warns about exactly that
progression.

The cost is real and accepted: resolving a document's source is a second query,
and listing is currently N+1 bounded by `perPage ≤ 100` (OD-120).

### A separate `document_artifacts` join table

Also rejected, for a plainer reason: **it already exists.** Migration 003's
artifact table carries `document_id` and `artifact_type`, which is the typed
relationship. Adding a second one would duplicate a relation the schema already
models, and §50 explicitly says not to.

### Artifact-first creation (§14's preference)

`upload → accepted artifact → CreateDocument → link` is the order the command
prefers, and it was rejected on structural grounds rather than taste.

The storage key embeds `documentId` and `document_artifacts.document_id` is NOT
NULL, so an artifact cannot be accepted before a document exists. Making
artifact-first work would mean changing the key strategy (BACKEND-17) *and* the
artifact schema (BACKEND-10) so accepted bytes could be filed under a
placeholder path — **permanently**, because a storage key is never rewritten.

That is a large change to two settled foundations, to satisfy an ordering
preference, and it leaves every uploaded object with a path that lies about what
it belongs to.

**The accepted consequence:** a document can exist with no bytes, between
creation and a successful upload. Modelled as `source: null` — a real state a
client renders as "awaiting file", not an error. It can also persist, if an
upload is rejected or abandoned, leaving a metadata row nothing points at. That
is cheap and visible, and no cleanup exists for it (OD-117).

### A document status column

Rejected, and it is the decision most likely to be revisited by someone who has
not read the product.

The frontend's "Documents" page lists **transactions**: `DocumentListItem.status`
is a `TransactionStatus`, and the fixtures are `txn_001…txn_008`.
`TransactionFile` — the actual per-document shape — has no status and no
`archivedAt`.

Adding one would be either an invention or a copy of the signing vocabulary onto
a resource that does not have it. And because a document may back more than one
transaction (§104), a single status column would be wrong as soon as there are
two. An architecture guard fails on any signing-status literal in the domain.

### Client-supplied artifact metadata

Rejected without qualification. Digest, size, media type, page count and scan
outcome are server-observed; the create schema has one property and rejects the
rest with 422.

Page count deserves a note: BACKEND-18 **computed and discarded** it, so the
product's display had no server-side source. Persisting it on the artifact —
where it belongs, since it describes one exact set of bytes — closes that
without trusting a client and without re-parsing the PDF on every read.

## Consequences

**Good.** Identity survives every byte change, so signing evidence can reference
an immutable artifact while the library refers to a stable document. Renaming
is provably byte-neutral. Cross-tenant artifact linkage became a **constraint
violation** rather than an application check — the single most valuable outcome
of the migration, and it closes a gap that had been open since migration 003.
BACKEND-30 can attach preparation state to a `DocumentId` that will not move.

**Costs.** Two lookups to render a document with its source, and an N+1 in
listing (OD-120). A document can exist with no bytes, and nothing cleans up the
abandoned ones (OD-117). Two test fixtures had to be corrected because they had
been writing dangling references that the schema previously permitted.

**A consequence worth stating loudly.** Documents cannot be deleted, archived or
downloaded — none exists in the product, and the runtime role has no DELETE
grant. Combined with the absence of any erasure operation, LAGDA now stores
documents whose content is both personal data and signing evidence, with no way
to remove either. That is **OD-119**, it is harder than the contact case
(OD-110) because the two purposes genuinely conflict, and it belongs to
BACKEND-55.
