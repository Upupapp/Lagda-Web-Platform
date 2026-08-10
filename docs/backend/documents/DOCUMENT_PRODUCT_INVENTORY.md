# Document product inventory — BACKEND-29

Read before changing anything in `docs/backend/documents/`.

**The headline finding, because it changes the shape of this whole command:**

> LAGDA's "Documents" page does not list documents. It lists **signing
> transactions**. There is no document library anywhere in the product.

Everything below follows from that.

## Sources read in full

| File | What it settled |
|---|---|
| `src/app/models/documents.ts` | `DocumentListItem.status: TransactionStatus`, `DocumentActionId`, the view set |
| `src/app/data/mock/documents.ts` | the fixtures are `txn_001`…`txn_008` |
| `src/app/services/mock/document.service.ts` | the complete operation set |
| `src/app/models/transaction-detail.ts` | **`TransactionFile`** — the real per-document shape |
| `src/app/models/prepare.ts` | `PrepFile[]`, the upload step, transaction-level title |
| `src/app/models/index.ts` | `view_documents` vs `prepare_documents` in `ROLE_PERMISSIONS` |
| `src/app/config/platform.nav.ts` | the `/app/documents` gate |
| `packages/db/src/migrations/003_evidence_and_integrity.ts` | `document_artifacts.document_id` already exists |
| `packages/db/src/migrations/007_document_uploads.ts` | the accepted-upload model |
| `packages/application/src/upload/process-upload.ts` | **`UploadRequest.documentId` is an INPUT** |
| `packages/api/src/upload/upload-route.ts` | the seam BACKEND-18 explicitly left for this command |

## What the product actually contains

### The "Documents" page lists transactions

`DocumentListItem` carries `status: TransactionStatus` (17 signing statuses),
`participants`, `participantCount`, `completedParticipantCount`, `sentAt`,
`completedAt`, `expiresAt`, `verificationId`. The fixtures are named `txn_001`
onward and the comment says *"IDs txn_001–006 match MOCK_TRANSACTIONS"*.

`document.service.ts` has exactly eight operations: `list`, `getFolders`,
`getTags`, `archive`, `restore`, `renameDraft`, `addTag`, `moveToFolder`. There
is **no create, no delete, no download, no upload, no duplicate, no replace**.

Every one of those eight operates on a transaction.

### A transaction has MANY documents

`prepare.ts` step 1 is `upload`, labelled **"Documents"** (plural), and produces
`PrepFile[]` — each with `fileName`, `fileSizeBytes`, `mimeType`, `order`.
`duplicate` is a file state *within one transaction*.

`TransactionDetailsDraft.title` is the **transaction's** title, not a file's.

### `TransactionFile` is the real document

```ts
export interface TransactionFile {
  id: string;                     // ← DocumentId
  transactionId: string;          // ← BACKEND-32, not this command
  displayTitle: string;           // ← document title, MUTABLE
  fileName: string;               // ← original filename, from the upload
  fileType: "pdf" | "word" | "other";
  fileSizeBytesApprox: number;    // ← from the artifact
  pageCount: number;              // ← from upload inspection
  uploadedAt: string;             // ← createdAt
  isPrimary: boolean;             // ← ordering within a transaction
  completedCopyAvailable: boolean;
  integrityState: FileIntegrityState;
  verificationAvailable: boolean;
}
```

**`displayTitle` and `fileName` in the same interface is the product making
§29's distinction for us.** A document has a title *and* the filename it
arrived as, and they are separate fields.

Note what `TransactionFile` does **not** have: any lifecycle state of its own.
No status, no `archivedAt`. Lifecycle lives on the transaction.

## Classification

| Feature | Classification | Why |
|---|---|---|
| **CREATE DOCUMENT** | **FOUNDATION_ONLY** | No create UI. Documents come into being inside `/app/prepare/upload`, which is BACKEND-30. The backend must provide the operation so BACKEND-30 has something to call |
| **LIST DOCUMENTS** | **FOUNDATION_ONLY** | The page that looks like a document list is a transaction list. The only real per-document list is `TransactionFile[]` on a transaction, which needs BACKEND-32 |
| **GET DOCUMENT** | **FOUNDATION_ONLY** | Same |
| **UPDATE TITLE** | **FOUNDATION_ONLY** | `rename-draft` exists and renames the **transaction**. `TransactionFile.displayTitle` is a real per-document field with no UI to change it yet |
| **PAGE COUNT** | **IMPLEMENT_NOW** | On `TransactionFile`, and already captured by BACKEND-18's inspection. Read through the artifact — never re-parsed |
| **FILE SIZE** | **IMPLEMENT_NOW** | Same |
| **ORIGINAL FILENAME** | **IMPLEMENT_NOW** | `TransactionFile.fileName`, already captured by BACKEND-18 |
| **STATUS DISPLAY** | **NOT_IN_PRODUCT** at document level | Every status the UI shows is a `TransactionStatus`. Copying any of them onto a document is exactly what §33 forbids |
| **ARCHIVE / RESTORE** | **NOT_IN_PRODUCT** at document level | `archive` and `restore` are transaction actions. A document has no `archivedAt` anywhere in the product |
| **DELETE** | **NOT_IN_PRODUCT** | No delete action, no service method, at either level |
| **DOWNLOAD ORIGINAL** | **NOT_IN_PRODUCT** | `TransactionDetailPage.tsx` imports the `Download` icon and **never uses it** — one import, zero call sites |
| **PREVIEW** | **DEFER** | `WorkflowDocumentPreview.tsx` exists and is a workflow component. Preview of a real PDF belongs with preparation (BACKEND-30) |
| **REPLACE ORIGINAL** | **NOT_IN_PRODUCT** | No control anywhere |
| **DUPLICATE** | **NOT_IN_PRODUCT** | The `Copy` icon on the transaction page duplicates a *transaction*, not a document |
| **SEARCH** | **NOT_IN_PRODUCT** at document level | `DocumentListQuery.q` searches transactions |

## The three decisions this drove

### 1. BACKEND-29 builds a foundation, not a library

§0 says *"Do not infer a Dropbox/Google-Drive-style document system if the
current LAGDA product is simpler."* It is simpler. There is no library.

So the document domain is built as the aggregate BACKEND-30 needs — stable
identity, workspace ownership, an immutable original artifact, mutable title —
and **no user-facing library operations are invented to go with it**. Archive,
restore, delete, download, duplicate and search are all absent from the product
at this level and all absent from this command.

### 2. The handoff is DOCUMENT-FIRST, and BACKEND-18 already decided it

§13 asks whether secure upload (A) creates the document itself, or (B) returns
an artifact a separate create-document consumes. **The real answer is neither.**

`UploadRequest.documentId` is an **input** to the upload pipeline, and the
storage key is `{workspaceId}/{documentId}/{artifactId}`. `document_artifacts`
has `document_id NOT NULL`. BACKEND-18's own route says so explicitly:

> *"Supplied by the caller because DOCUMENTS DO NOT EXIST YET — there is no
> `documents` table and no document use case until BACKEND-29. Inventing a
> document identity here would be inventing the document model, which this
> command must not do."*

So today `documentId` is a client-supplied string pointing at nothing. The flow
this command establishes:

```
CreateDocument  →  DocumentId (no bytes yet)
      ↓
secure upload (BACKEND-18, unchanged)  →  accepted ORIGINAL artifact
      ↓
document's original artifact is now resolvable
```

Option (B) — artifact-first — would require changing the storage key strategy
(BACKEND-17) and the artifact schema (BACKEND-10) to allow an artifact with no
document. That is a larger and worse change to make an ordering preference
work, and it would leave accepted bytes filed under a placeholder path forever.

The consequence is stated rather than hidden: **a document can exist with no
original artifact**, for the window between creation and a successful upload.
DOCUMENT_LIFECYCLE.md treats that as a real state rather than an anomaly.

### 3. View is much wider than write

`ROLE_PERMISSIONS` splits documents across two permissions, and they do not
line up:

| Permission | Roles holding it (of the backend's seven) |
|---|---|
| `view_documents` | owner, administrator, template_administrator, sender, reviewer, auditor |
| `prepare_documents` | owner, administrator, template_administrator, sender |

`reviewer` and `auditor` may **view** documents and may not create or rename
them. That is a genuinely different shape from contacts, where all four
capabilities moved together — and a third distinct answer that no
`owner || administrator` check could have produced.

`member` holds neither: it is not a `PlatformRole` and has no entry in this
table. Consistent with BACKEND-27's treatment of the same gap (OD-100), the
navigation gate wins and `member` gets nothing.
