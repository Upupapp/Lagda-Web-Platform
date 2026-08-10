# Document test matrix — BACKEND-29

**N/A** and **NOT IMPLEMENTED** are used where they are the truth. A matrix of
PASS is not evidence.

New this command: **13 core, 28 use-case, 16 route, 35 architecture, 20
integration** = 112.

## Identity — the central claim

| Case | Result | Where |
|---|---|---|
| `DocumentId` != `ArtifactId` | **PASS** | use case — the id survives acquiring bytes |
| A document keeps its id across artifact stages | **PASS** | use case |
| A SEALED artifact is not treated as the source | **PASS** | use case |
| `documents` has no artifact/storage/digest column | **PASS** | architecture |
| The contract publishes no artifact identifier | **PASS** | architecture |
| No storage reference in any response | **PASS** | use case + route (key set pinned) |
| No digest in any response | **PASS** | use case + route |
| A document with no bytes reports `source: null`, not an error | **PASS** | use case + route |

## Create

| Case | Result | Where |
|---|---|---|
| Accepted-artifact linkage (workspace A artifact → workspace A document) | **PASS** | integration |
| Artifact naming a nonexistent document rejected | **PASS** | integration — new FK |
| Cross-workspace artifact rejected **by the database** | **PASS** | integration, runtime role |
| Client storage key rejected | **PASS** | route — 422, ten forbidden properties |
| Client hash / size / pageCount rejected | **PASS** | route |
| Client `workspaceId` / `documentId` / `createdByUserId` / `status` rejected | **PASS** | route |
| One ORIGINAL artifact per document | **PASS** | integration — partial unique index |
| A SEALED artifact may coexist with the original | **PASS** | integration |
| Quarantined / rejected / malware artifact cannot become an original | **N/A here** | No artifact row exists for a non-accepted upload — `document_uploads_accepted_has_artifact` (BACKEND-18) makes it unrepresentable, and that suite asserts it |
| Wrong media type cannot become an original | **N/A here** | Same: the inspector rejects before an artifact exists |
| Idempotent create | **NOT APPLIED** | See below |
| Concurrent create | **N/A** | Two creates make two empty documents; the artifact claim is what is protected, by a DB constraint |
| Creation writes no artifact, upload, membership or contact | **PASS** | use case |

## Metadata

| Case | Result | Where |
|---|---|---|
| Title trimmed outside, interior preserved | **PASS** | core |
| Empty / whitespace-only rejected | **PASS** | core + use case + DB CHECK |
| `Cc` and `Cf` rejected (NUL, newline, ZWSP, RTL override) | **PASS** | core |
| Control characters reported before length | **PASS** | core |
| Code points, not UTF-16 units | **PASS** | core |
| Boundary: max accepted, max+1 rejected | **PASS** | core + route (422) |
| Non-Latin titles accepted | **PASS** | core |
| `titleFromFilename` strips one extension and does not prettify | **PASS** | core |
| A hostile filename yields null rather than a repaired string | **PASS** | core |
| Duplicate titles allowed | **PASS** | use case + integration |
| Title and filename are independent | **PASS** | use case |
| Filename is write-once | **PASS** | use case + integration |

## Update

| Case | Result | Where |
|---|---|---|
| Rename changes the title only | **PASS** | use case + route |
| **Rename leaves the artifact row byte-identical** | **PASS** | integration — whole row compared |
| Rename cannot change id, creator or `createdAt` | **PASS** | use case + route |
| Artifact fields unsettable through the API | **PASS** | route — 422 |
| Workspace unsettable through the body | **PASS** | route — 422 |
| Signing status unsettable | **PASS** | route — 422 |
| Validation runs before the write | **PASS** | use case |

## Tenancy

| Case | Result | Where |
|---|---|---|
| List isolation | **PASS** | use case + integration |
| Get isolation | **PASS** | use case + integration |
| Update isolation | **PASS** | use case + integration |
| Delete isolation | **N/A** | Delete does not exist |
| Raw insert naming another tenant refused by RLS | **PASS** | integration |
| No tenant context sees nothing | **PASS** | integration |
| Another tenant's artifact never resolves as a source | **PASS** | use case |
| Compound tenant FK enforced by the database | **PASS** | integration |
| Document ids are globally unique | **PASS** | integration |
| No RLS bypass, no new transaction scope | **PASS** | architecture |

## Authorization

| Case | Result | Where |
|---|---|---|
| owner / administrator / template_administrator / sender may create and rename | **PASS** | use case |
| **reviewer and auditor may READ and not write** | **PASS** | use case + route |
| member refused entirely, including read | **PASS** | use case |
| Non-member refused | **PASS** | use case + route |
| Denial is a hidden 404, never 403 | **PASS** | route |
| Exhaustive 7 × 17 capability matrix | **PASS** | core — 119 assertions |
| No role holds write without view | **PASS** | architecture |
| Role change takes effect on the next call | **PASS** | use case — demotion mid-flight |
| No role comparison in document code | **PASS** | the BACKEND-27 guard, unchanged |
| Removed member loses access | **BY COMPOSITION** | `findByUser` returns null → hidden 404. Asserted for members generally in BACKEND-27; no document-specific test |
| Pre-auth MFA denied | **BY COMPOSITION** | The scope hook covers every route in it. No dedicated document assertion |
| Anonymous denied | **PASS** | route — all four routes, nothing written |

## CSRF

| Case | Result | Where |
|---|---|---|
| Create | **PASS** | route, real `createApp` |
| Update | **PASS** | route, real `createApp` |
| Delete / archive | **N/A** | Neither exists |

## Artifact

| Case | Result | Where |
|---|---|---|
| Compound tenant FK | **PASS** | integration |
| Original immutable across a rename | **PASS** | integration |
| One original per document | **PASS** | integration |
| Page count persisted and read back | **PASS** | integration |
| Non-positive page count rejected | **PASS** | integration — CHECK |
| No cascade to artifacts | **PASS** | architecture |
| Upload-cleanup race | **N/A** | Cleanup deletes quarantine objects; an accepted artifact never appears on its candidate list. DOCUMENT_DELETION_POLICY.md |

## Lifecycle and deletion

| Case | Result | Where |
|---|---|---|
| Archive / restore | **NOT IMPLEMENTED** | Transaction actions — OD-113 |
| Hard delete | **NOT IMPLEMENTED** | No grant, no method, no route |
| Runtime role refused a raw DELETE | **PASS** | integration |
| Grants are exactly SELECT, INSERT, UPDATE | **PASS** | integration, `information_schema` |
| No `status` / `archived_at` column | **PASS** | architecture |
| No signing vocabulary in the domain | **PASS** | architecture |

## Listing

| Case | Result | Where |
|---|---|---|
| Defaults: newest first, 20 per page | **PASS** | use case |
| Sort by title | **PASS** | use case + integration |
| Stable pagination with a filter-wide total | **PASS** | use case + integration + route |
| Empty page past the end is 200 | **PASS** | use case + route |
| Sort whitelist — `status` and `expiry` rejected | **PASS** | route — 422 |
| `perPage` bound enforced | **PASS** | route — 422 |
| Artifact metadata included per row | **PASS** | use case |
| Search | **NOT IMPLEMENTED** | Not in the product at document level — OD-116 |

## Download

| Case | Result | Where |
|---|---|---|
| Authorized download | **NOT IMPLEMENTED** | Not in the product — OD-114 |
| Storage key hidden | **PASS** | Vacuously for download, and asserted for every other response |
| Presigned URL absent from logs | **N/A** | No URL is ever generated |

## Observability

| Case | Result | Where |
|---|---|---|
| Title absent from a real serialized log line | **PASS** | route, live Pino output |
| A renamed title absent from the rename log | **PASS** | route |
| No log payload names a title or filename | **PASS** | architecture |
| Metric labels bounded, no identifier | **PASS** | architecture |
| Every response `no-store` | **PASS** | route + architecture |
| Document content in logs | **N/A** | No bytes exist in this layer |

## Boundaries

| Case | Result | Where |
|---|---|---|
| No PDF library imported | **PASS** | architecture |
| No storage client imported | **PASS** | architecture |
| Sealer never invoked | **PASS** | architecture |
| No DB import in routes | **PASS** | architecture |
| No `any` | **PASS** | architecture |
| No TODO on an implemented path | **PASS** | architecture |
| No contact / recipient / template / signing reference | **PASS** | architecture |
| No signing evidence written | **PASS** | architecture |
| Every domain file is covered by the guards | **PASS** | architecture — enumerates the directories |

## Migration

| Case | Result | Where |
|---|---|---|
| From zero | **PASS** | Fresh database; all 16 applied; FK and partial index verified via `pg_constraint` / `pg_indexes` |
| Up and down round-trip | **PASS** | `migrateDown` then `migrateToLatest` |

## An unreproduced integration failure

One integration run reported **2 failures out of 452**, immediately after a
`npm run check` invocation was killed by a 2-minute command timeout. The failure
detail was not captured, and **four subsequent full runs passed 452/452**.

The likely cause is the killed process: integration suites share one database
and `truncateAll` between tests, and a worker killed mid-transaction can leave
locks or connections that the next run trips over. The same shape as the
cold-start flake BACKEND-28 found and fixed.

Recorded as observed-and-unreproduced rather than dismissed. If it recurs, the
first thing to check is whether a previous run was interrupted, and the second
is whether `fileParallelism: false` is still set in
`vitest.integration.config.ts` — it is what makes the shared database safe.

## Fixtures corrected by this command

Two pre-existing suites were writing artifacts with **dangling `document_id`
values** — legal until migration 016 gave the column a foreign key. Both now
seed a real document, per workspace:

- `packages/db/src/evidence.integration.test.ts`
- `packages/application/src/test-support/repository-contract.ts`

The second correction was needed twice: `document_id` is the primary key, so it
is globally unique, and the first fix seeded the same id into two workspaces.
That is itself now asserted as intended behaviour.

## Not tested, and why

**Idempotency on create — NOT APPLIED, not merely untested.** §68 assumes the
artifact-first model, where a retry could consume one accepted upload twice.
Document-first inverts it: a retry creates a second **empty** document — no
bytes, no artifact, nothing claimed — and the upload that follows names one
`documentId`. The claim worth protecting is the artifact claim, and
`document_artifacts_one_original_idx` protects it at the database.

**Rate limiting — NOT APPLIED.** The expensive limiter stays on upload
(BACKEND-18). Document creation writes one row and sends no email.

**Pre-auth and removed-member denial — BY COMPOSITION**, the same honest label
BACKEND-27 and BACKEND-28 used.

**Frontend checks — NOT APPLICABLE.** No frontend contract changed: these are
new backend routes the frontend does not yet call, and no existing contract was
altered.
