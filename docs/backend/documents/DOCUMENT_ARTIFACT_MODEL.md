# Document and artifact identity

The most important document in this folder, and the one BACKEND-30 must read
before it writes a line.

## Four identifiers, four meanings

| Identifier | What it names | Mutable? | Lifetime |
|---|---|---|---|
| `DocumentId` | A business resource in a workspace | id never changes; title does | Forever |
| `ArtifactId` | One exact sequence of bytes | Never | Forever |
| Storage key | Where those bytes live | Never | Forever |
| SHA-256 digest | What those bytes are | Never | Forever |

They are **not interchangeable**, and none is derived from another in a way that
lets one stand in for another:

```
Workspace
  └── Document  (doc_…)          title: "Office Lease"
        ├── Artifact (art_…)  ORIGINAL     sha256:a1b2…  1.2 MB  12 pages
        ├── Artifact (art_…)  SEALED       sha256:c3d4…  (BACKEND-33)
        └── Artifact (art_…)  CERTIFICATE  sha256:e5f6…  (BACKEND-33)
```

One document, three artifacts, three digests, one id.

## Why a document is not its artifact

The tempting simplification is that the document *is* the PDF. It fails on the
first thing LAGDA actually does:

> A lease is uploaded, signed by three people, sealed, and issued a completion
> certificate.

If the document were the PDF, either the original bytes get overwritten — and
the evidence that the pre-signature document existed is destroyed — or every
stage produces a new document, and "the lease" becomes four unrelated records
with no way to say they are the same matter.

Stable identity plus immutable artifacts gives both: the workspace refers to one
lease, and every byte-state it ever had remains addressable and hashed.

## The relation lives on the artifact

`document_artifacts` has carried `document_id NOT NULL` and `artifact_type`
since migration 003. That IS the typed relationship §51 asks for, and BACKEND-29
did **not** add a second one.

There is no `original_artifact_id` column on `documents`, and no
`document_artifacts` join table. Either would be a second authority on which
bytes belong to a document, and the two would disagree the first time one was
written without the other.

What migration 016 added instead:

```sql
alter table document_artifacts
  add constraint document_artifacts_document_fk
  foreign key (workspace_id, document_id)
  references documents (workspace_id, document_id) on delete restrict;
```

**Compound, not `document_id` alone.** A single-column reference would let a
Workspace A artifact name a Workspace B document, with nothing but application
code between that and production. §113 requires the database to refuse it, and
now it does — proved by an integration test that attempts exactly that insert as
the runtime role.

Before this, `document_id` was a **client-supplied string naming nothing**.
BACKEND-18's upload route said so explicitly, and deferred the fix here.

## One ORIGINAL per document

```sql
create unique index document_artifacts_one_original_idx
  on document_artifacts (workspace_id, document_id)
  where artifact_type = 'original';
```

Partial, covering `original` only. `sealed` and `completion-certificate` are
deliberately unconstrained: nobody has decided a document has at most one of
either, and a constraint promising something undecided is a constraint that gets
dropped later — which is how historical rows stop being validated.

What it prevents concretely: a second successful upload against a document that
already has its original, leaving two `original` rows nothing can choose
between. The legitimate retry still works — a commit that failed wrote no row.

## Document-first, and why the order is not a preference

§14 prefers `upload → accepted artifact → CreateDocument → link`. BACKEND-29
does the reverse, and the reason is structural rather than stylistic:

1. `UploadRequest.documentId` is an **input** to BACKEND-18.
2. The storage key is `{workspaceId}/{documentId}/{artifactId}` (BACKEND-17).
3. `document_artifacts.document_id` is `NOT NULL` (BACKEND-10).

The identity must exist before the object can be filed. Artifact-first would
require changing the key strategy *and* the artifact schema so that accepted
bytes could live under a placeholder path — permanently, since a storage key is
never rewritten — to satisfy an ordering preference.

```
CreateDocument  →  DocumentId, no bytes
      ↓
secure upload (BACKEND-18, unchanged)  →  accepted ORIGINAL artifact
      ↓
the document's source resolves
```

**The consequence, stated rather than hidden:** a document can exist with no
original artifact. `DocumentSummary.source` is `null` in that window, and the
contract models it as a real state — a client should render "awaiting file", not
an error. See DOCUMENT_LIFECYCLE.md.

## Immutability, and what it costs to break

Once accepted, the bytes behind an `ArtifactId` never change. Not for metadata
cleanup, not for compression, not for rotation normalization, not for PDF
repair, and not for field placement.

Any byte-changing operation produces a **new artifact with a new id and a new
digest**. This is not enforced by discipline: the document domain imports no PDF
library, no storage client and no sealer, and an architecture guard asserts all
three across every file in the domain.

Renaming a document writes one `varchar` column. An integration test compares
the entire artifact row before and after a rename and asserts they are equal.

## What BACKEND-30 must not do

1. **Never overwrite the ORIGINAL.** Field placement is metadata about
   coordinates on pages; it is not a new PDF. If preparation ever does produce
   bytes, they are a new artifact — and `artifact_type` currently has no
   `prepared` value, which is migration 003's deliberate answer to the same
   question.

2. **Never put a PDF library in the document domain.** The inspection boundary
   (BACKEND-18) and the sealer (BACKEND-09) are the only places a PDF is opened.
   The guard in `tests/architecture/documents.test.ts` fails on `pdf-lib`,
   `pdfjs`, `pdf-parse` and `PDFDocument` in any document file.

3. **Reference the stable `DocumentId`**, not an artifact id, from preparation
   state. Field coordinates belong to a document's page geometry, and the
   original artifact is where that geometry comes from — but the field
   definitions survive a re-seal and the artifact does not.

4. **Use the compound key** if preparation state references artifacts:
   `(workspace_id, artifact_id) → document_artifacts (workspace_id, artifact_id)`,
   which already exists as `document_artifacts_workspace_key`.

5. **Page count is already persisted** on the artifact, from the upload
   inspection. Do not re-parse the PDF to get it.

## Related

- ADR-022 — the decision and the alternatives.
- DOCUMENT_ARCHITECTURE.md — the domain end to end.
- DOCUMENT_DELETION_POLICY.md — why nothing here can be deleted.
- `docs/backend/storage/STORAGE_KEY_STRATEGY.md` — where the key shape comes from.
