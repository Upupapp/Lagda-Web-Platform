# BACKEND-29 — Document domain report

## Product inventory

| Feature | Status |
|---|---|
| **CREATE** | **FOUNDATION_ONLY** — no create UI; documents arise in `/app/prepare/upload` (BACKEND-30) |
| **LIST** | **FOUNDATION_ONLY** — the page that looks like a document list is a transaction list |
| **GET** | **FOUNDATION_ONLY** |
| **RENAME / UPDATE** | **FOUNDATION_ONLY** — `rename-draft` renames the *transaction*; `TransactionFile.displayTitle` has no UI yet |
| **PAGE COUNT / FILE SIZE / ORIGINAL FILENAME** | **IMPLEMENTED** — on `TransactionFile`, read through the artifact |
| **ARCHIVE / RESTORE** | **NOT_IN_PRODUCT** at document level — transaction actions |
| **DELETE** | **NOT_IN_PRODUCT** — no action at either level |
| **DOWNLOAD ORIGINAL** | **NOT_IN_PRODUCT** — the `Download` icon is imported once and never used |
| **PREVIEW** | **DEFERRED** — belongs with preparation |
| **REPLACE ORIGINAL** | **NOT_IN_PRODUCT** |
| **DUPLICATE** | **NOT_IN_PRODUCT** — the `Copy` action duplicates a transaction |
| **SEARCH** | **NOT_IN_PRODUCT** at document level |
| **STATUS DISPLAY** | **NOT_IN_PRODUCT** at document level — every status is a `TransactionStatus` |

→ [DOCUMENT_PRODUCT_INVENTORY.md](./DOCUMENT_PRODUCT_INVENTORY.md)

## What reading the product changed

**LAGDA's "Documents" page does not list documents. It lists signing
transactions.** `DocumentListItem.status` is a `TransactionStatus`, the fixtures
are `txn_001…txn_008`, and the service has eight operations, none of which is
create, delete, download or upload. The real per-document shape is
`TransactionFile`, reachable only from a transaction detail page.

So this command built the aggregate BACKEND-30 needs and **invented no library
operations to go with it**. A Dropbox-shaped document system would have been a
plausible, entirely fictional API.

Two smaller corrections came from the same reading:

- `TransactionFile` carries `displayTitle` **and** `fileName`, so the
  title-vs-filename distinction (§29) is the product's, not an invention.
- `view_documents` and `prepare_documents` do not line up: **reviewer and
  auditor may read documents and may not create or rename them.** A third
  distinct capability shape, and one no `owner || administrator` check produces.

## The handoff decision

§13 asks whether upload creates the document or returns an artifact a separate
operation consumes. **Neither.** `UploadRequest.documentId` is an *input*, the
storage key is `{workspaceId}/{documentId}/{artifactId}`, and BACKEND-18's route
says in as many words that it left the seam here.

So: **document-first**. Artifact-first would mean changing the key strategy and
the artifact schema so accepted bytes could live under a placeholder path
permanently. The consequence is modelled rather than hidden: `source` is
nullable, and a document between creation and upload has no bytes.

→ [DOCUMENT_ARTIFACT_MODEL.md](./DOCUMENT_ARTIFACT_MODEL.md) · ADR-022

## What migration 016 actually bought

Creating `documents` was the small half. The consequential half is what it let
us add to `document_artifacts`, which had carried `document_id NOT NULL` with
**no foreign key since migration 003** — a client-supplied string naming
nothing:

- **`(workspace_id, document_id) → documents(workspace_id, document_id)`.**
  Cross-tenant artifact linkage is now a constraint violation rather than a bug
  application code happens to catch. §113 asks for exactly this.
- **A partial unique index giving one ORIGINAL artifact per document**, so a
  second successful upload cannot leave two originals nothing can choose
  between.
- **`page_count`.** BACKEND-18 inspects it and threw it away; the product
  displays it. Without this the only options were re-parsing on every read or
  trusting a client.

## Verification

| Gate | Result |
|---|---|
| typecheck · lint · build | **PASS** |
| unit | **PASS** — 1252 |
| `npm run check` | **PASS** |
| integration | **PASS** — 452, 49 skipped (S3); run twice |
| migration up + down | **PASS** |
| migration from zero | **PASS** — fresh database, FK and partial index verified via `pg_constraint` / `pg_indexes` |

112 new tests: 13 core, 28 use-case, 16 route, 35 architecture, 20 integration.

→ [DOCUMENT_TEST_MATRIX.md](./DOCUMENT_TEST_MATRIX.md)

## Three things the tests caught

**The exhaustive capability matrix caught the change, for the third command
running.** Adding three capabilities broke 16 hand-written assertions plus the
count guard. That is BACKEND-27's "write the expectations by hand" decision
paying out again.

**Two pre-existing fixtures were writing dangling references.** The evidence and
repository-contract suites inserted artifacts whose `document_id` pointed at
nothing — legal until migration 016 gave the column a foreign key. Both now seed
a real document. The fix was needed **twice**: `document_id` is the primary key,
so it is globally unique, and the first attempt seeded the same id into two
workspaces. That behaviour is now asserted as intended.

**An architecture guard flagged correct code, and the fix improved it.** The
"no title in logs" guard matched `[...document.title].length` inside a log
payload. The value logged was the length, not the title — but a guard that reads
payloads literally cannot tell, and neither can a reviewer skimming. Hoisting
`titleLength` above the call makes the payload reference the title nowhere.

## Honest gaps

**No erasure operation, and this one is harder than contacts.** A document's
content is simultaneously personal data and the evidence a signature attests to;
erasing it destroys the thing a completion certificate certifies. LAGDA has no
operation at all, so nothing is being weighed. **OD-119**, the highest-priority
gap this command leaves, owned by BACKEND-55.

**No idempotency key on create — not applied, not untested.** §68's reasoning
assumes artifact-first. Document-first inverts the risk: a retry makes a second
*empty* document, and the claim worth protecting is the artifact claim, which a
database constraint protects.

**Listing is N+1**, one artifact lookup per row, bounded by `perPage ≤ 100`. The
alternative was omitting page count and file size, which the product displays. A
batch repository method is the obvious fix — OD-120.

**A document can exist with no bytes, permanently**, if an upload is rejected or
abandoned. Cheap and visible, and nothing cleans it up — OD-117.

**Pre-auth refusal and removed-member denial are enforced by composition**, not
asserted on these routes. Anonymous-401 and CSRF **are** asserted against the
real `createApp`. The same label BACKEND-27 and BACKEND-28 used.

**No production ID generator**, unchanged since BACKEND-25: `DocumentIdGenerator`
joins the other four ports whose only implementation is the test one, because
the server bootstrap wires no workspace dependencies. Part of OD-069.

**The upload route is still uncomposed.** It now *could* be wired with a real
`documentId`, which was the blocker; composing it is BACKEND-30's natural first
step.

## BACKEND-30 handoff

The repository is ready. What preparation must respect:

- **Never overwrite the ORIGINAL.** Field placement is coordinate metadata, not
  a new PDF. `artifact_type` has no `prepared` value, deliberately.
- **Reference the stable `DocumentId`**, not an artifact id — field definitions
  survive a re-seal; an artifact does not.
- **No PDF library in the document domain.** The guard fails on `pdf-lib`,
  `pdfjs`, `pdf-parse` and `PDFDocument` in any document file. If preparation
  genuinely needs to parse, it belongs behind the BACKEND-18 inspection boundary
  with its own ADR.
- **Page count is already persisted** on the artifact. Do not re-parse.
- **Preparation state is not document status.** It belongs to the preparation
  aggregate or the transaction, and must coexist with a second transaction over
  the same document (§104).
- **Use the compound key** for any artifact reference:
  `(workspace_id, artifact_id) → document_artifacts (workspace_id, artifact_id)`,
  which already exists.
- **Capabilities**: `document.prepare` is the likely addition, and only if the
  product's `prepare_documents` permission maps to an operation being built.
  Read `ROLE_PERMISSIONS` first — it has been non-obvious three times now.

→ [DOCUMENT_ARTIFACT_MODEL.md](./DOCUMENT_ARTIFACT_MODEL.md) §"What BACKEND-30
must not do"
