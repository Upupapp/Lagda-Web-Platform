# Document architecture — BACKEND-29

The workspace document domain. Read
[DOCUMENT_PRODUCT_INVENTORY.md](./DOCUMENT_PRODUCT_INVENTORY.md) first — it
explains why this is a foundation rather than a document library.

## 1. Shape

```
POST   /workspaces/:workspaceId/documents                 document.create
GET    /workspaces/:workspaceId/documents                 document.view
GET    /workspaces/:workspaceId/documents/:documentId     document.view
PATCH  /workspaces/:workspaceId/documents/:documentId     document.update
```

Four routes, all inside the authenticated scope, so each gets a validated
session and a CSRF check because of where it is registered.

**No DELETE and no download.** Neither exists in the product, and the runtime
role has no DELETE grant. See DOCUMENT_DELETION_POLICY.md and OD-114.

## 2. The aggregate

```
Workspace
  └── Document (doc_…)  ── title, originalFilename, createdBy, timestamps
        └── artifacts, via document_artifacts.document_id
              ORIGINAL   (BACKEND-18)
              SEALED     (BACKEND-33)
              CERTIFICATE (BACKEND-33)
```

`documents` holds metadata and nothing else. No artifact column, no digest, no
size, no media type, no page count — every one of those describes bytes, and
bytes belong to an artifact. [DOCUMENT_ARTIFACT_MODEL.md](./DOCUMENT_ARTIFACT_MODEL.md)
is the full argument.

| Column | Notes |
|---|---|
| `document_id` | PK. Opaque, server-generated. **Globally unique** |
| `workspace_id` | First-class tenant column, FK to `workspaces` RESTRICT |
| `title` | The only mutable field |
| `original_filename` | Write-once, set by the upload. Separate from the title |
| `created_by_user_id` | Audit metadata, **not** authorization |
| `created_at`, `updated_at` | `updated_at` equals `created_at` on insert |

`UNIQUE (workspace_id, document_id)` is the compound-FK target. Redundant
against the primary key, and present so `document_artifacts` can reference it
tenant-safely.

Note the consequence of `document_id` being the primary key: ids are unique
across tenants, so two workspaces cannot hold the same one. An integration test
asserts it, and two test fixtures had to be corrected for it.

## 3. Title and filename

The product's `TransactionFile` carries `displayTitle` **and** `fileName`, so
the distinction is the product's, not an invention:

```
originalFilename: lease-v4-final.pdf   ← what arrived. Write-once
title:            Office Lease         ← what people call it. Mutable
```

Renaming changes one `varchar`. It does not touch the filename, the bytes, the
digest or the storage key — asserted by an integration test that compares the
whole artifact row before and after.

**Title validation** rejects Unicode `Cc` and `Cf`, trims the outside only, and
counts code points. The `Cf` rule matters more here than anywhere else in
LAGDA: a title is what a signer is told they are signing, and an RTL override
can make a rendered title read as something other than what is stored.

**The initial title never comes from the PDF.** `titleFromFilename` strips one
extension and nothing else — no underscore-to-space, no title-casing, both of
which make `SPA_2026_v3` worse. A PDF's embedded `/Title` is attacker-controlled
text inside an untrusted file and is never read (§228); reading it would also
put a PDF parser in the document domain.

A filename that fails title validation yields `null` rather than a repaired
string. Silently sanitizing untrusted display text into something that passes is
how a crafted name reaches a signer's screen looking legitimate.

## 4. Upload handoff

**Document-first**, forced by BACKEND-18's shape rather than chosen:

```
CreateDocument            metadata only, no bytes, no storage call
      ↓  documentId
secure upload (BACKEND-18, unchanged)
  receive → quarantine → validate → inspect → scan → SHA-256 → promote
      ↓
ORIGINAL artifact, workspace-scoped, page count persisted
      ↓
recordDocumentFilename    write-once, best-effort
```

`UploadRequest.documentId` is an input and the storage key embeds it. Before
this command that value was a client-supplied string naming nothing; migration
016's foreign key makes it real, and an upload naming a nonexistent document now
fails at commit.

**No storage write and no PDF parse during document creation.** The document
domain imports no storage client, no PDF library and no sealer — three
architecture guards, across every file in the domain.

**Partial failure** is BACKEND-18's existing story: object storage and the
database are not atomic, the accepted object is private and unreferenced if the
commit fails, and a retry converges. Document creation adds no new window — it
writes one row and claims nothing in storage.

## 5. Authorization

Three capabilities in the BACKEND-27 policy:

| Capability | Roles |
|---|---|
| `document.view` | owner, administrator, template_administrator, sender, reviewer, auditor |
| `document.create` | owner, administrator, template_administrator, sender |
| `document.update` | owner, administrator, template_administrator, sender |

**The first domain where view and write diverge.** `ROLE_PERMISSIONS` splits
documents across `view_documents` (six roles) and `prepare_documents` (four),
and they do not line up: `reviewer` and `auditor` may read a document and may
not create or rename one. `member` holds neither — it is not a `PlatformRole`
and has no entry in the table (the same disagreement as OD-100, resolved the
same way).

A guard asserts the one incoherent combination cannot arise: no role holds write
without view.

Denial is the hidden 404. Authority is read **inside the mutation transaction**,
so a contributor demoted mid-request cannot commit under authority they lost.

## 6. Tenancy

```sql
create policy tenant_isolation on documents
using (workspace_id = lagda_current_workspace())
with check (workspace_id = lagda_current_workspace());
```

with `FORCE ROW LEVEL SECURITY`, a scoped repository with no workspace
parameter, and **no new transaction scope**. Contacts needed none and neither do
documents: every caller is an authenticated member. A guard asserts the absence
of `BYPASSRLS`, `SECURITY DEFINER`, `runGlobal` and `runForInvitationCredential`.

The layer that matters most is the compound foreign key — see
[DOCUMENT_ARTIFACT_MODEL.md](./DOCUMENT_ARTIFACT_MODEL.md) §"The relation lives
on the artifact". Cross-tenant artifact linkage is a constraint violation, not
an application check.

## 7. Listing

Page-based, defaults `createdAt desc`, 20 per page, bounded at 100 in the
schema. Sort is a closed whitelist of **two** fields — `createdAt` and `title`.

The product's `DocumentSortField` offers five, but three of them (`status`,
`expiry`, `updated`-as-transaction-activity) sort transactions. Publishing a
sort key with nothing behind it would be a contract LAGDA cannot honour, and the
route returns 422 for `sort=status`.

**No filters.** Every filter the product's list offers selects on
`TransactionStatus`. A document has none.

`document_id desc` is the tie-breaker on every query. Without it, documents
sharing a `created_at` — which a batch upload produces in one transaction — have
an unspecified relative order, and PostgreSQL may return them differently on
page 1 and page 2, silently dropping rows and duplicating others.

**One artifact lookup per row.** Bounded by `perPage ≤ 100` and honest about
being N+1; the alternative was omitting page count and file size, which the
product displays. A batch method is the obvious improvement and is recorded as
OD-120 rather than pretended away.

## 8. Read model

`DocumentSummary` and its `DocumentSourceView` are the only shapes that leave
the application layer. The artifact record is never returned: `storageReference`
is an internal capability-bearing key (INV-205) and the digest is not something
the product displays.

The exclusion is **upstream, in the projection**, not a delete-list at the
serializer — so there is no field at the boundary to forget to strip. A route
test pins the exact key set of the response body.

## 9. Telemetry

Two events — `document.created`, `document.renamed` — carrying ids, outcomes and
`titleLength`. **Never the title, never the filename.**

A legal document's name identifies the client, the matter, the counterparty and
often the transaction value. "Retainer Agreement — Mabini Business Services"
in a log line is a disclosure, and logs are retained centrally and read widely.

`titleLength` is computed **before** the log call so the payload object contains
no reference to the title at all — a guard reads these payloads literally, and
`[...document.title].length` inside one is indistinguishable from logging it.

`document_operations_total` has three labels: `operation`, `result`,
`processRole`. All closed sets.

## 10. What was not built

| | Why |
|---|---|
| Delete, archive, restore | Not in the product at document level; no DELETE grant — OD-113 |
| Download / preview | `Download` is an unused import in the product — OD-114 |
| Replace original, duplicate | No control anywhere — OD-115 |
| Search | The product searches transactions — OD-116 |
| Document status | Every status is a `TransactionStatus` (§33) |
| Idempotency key on create | The claim that needs protecting is the ARTIFACT claim, and a database constraint protects it — see the use case |
| Rate limiting | Upload already carries the expensive limiter; document creation writes one row |
