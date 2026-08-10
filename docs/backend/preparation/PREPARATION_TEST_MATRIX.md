# Preparation test matrix — BACKEND-30

**N/A** and **NOT IMPLEMENTED** are used where they are the truth.

New this command: **38 core, 35 use-case, 16 route, 39 architecture, 24
integration** = 152.

## Domain

| Case | Result | Where |
|---|---|---|
| Preparation targets the exact source artifact | **PASS** | use case + integration |
| Original artifact immutable through every mutation | **PASS** | use case (whole array) + integration (whole row) |
| Preparation is not a signing request | **PASS** | use case + architecture (no signing literals, no evidence write) |
| No prepared artifact is created | **PASS** | use case + architecture |
| Every field type maps onto a `SealableFieldType` | **PASS** | architecture |

## Create

| Case | Result | Where |
|---|---|---|
| Lazy creation on first save | **PASS** | use case |
| `GET` on an unprepared document writes nothing | **PASS** | use case |
| Document with no uploaded bytes refused | **PASS** | use case |
| Cross-tenant document refused | **PASS** | integration (compound FK) + use case |
| Cross-tenant **artifact** refused | **PASS** | integration (compound FK) |
| Concurrent create converges to one | **PASS** | **integration**, real transactions |
| Second create for one document refused | **PASS** | integration (unique constraint) |
| The unit-level create race | **N/A** | The fake rolls back a whole-store snapshot, so a losing transaction would discard the winner's writes. Asserted in integration instead |

## Fields

| Case | Result | Where |
|---|---|---|
| Each of the nine supported types accepted | **PASS** | integration |
| Unknown type refused | **PASS** | route (422) + integration (CHECK) |
| The four deferred editor types refused | **PASS** | route + integration |
| Type-incompatible properties refused | **PASS** | route — `additionalProperties: false` |
| Add | **PASS** | use case + route |
| Update (move, resize, relabel) | **PASS** | use case |
| Delete (absent from the saved array) | **PASS** | use case + integration |
| Clear all (empty array) | **PASS** | use case + integration |
| Deterministic ordering: page, layer, id | **PASS** | use case + integration |
| Field id stable across a move | **PASS** | use case |
| Unknown client field id refused | **PASS** | use case |
| Field ceiling (500) enforced | **PASS** | use case + route |

## Geometry

| Case | Result | Where |
|---|---|---|
| Valid field accepted | **PASS** | core + integration |
| Page 0 refused | **PASS** | core + use case + route + integration (CHECK) |
| Page past the end refused | **PASS** | core + use case |
| Negative and non-integer page refused | **PASS** | core |
| Negative coordinates refused | **PASS** | core + integration |
| Zero and negative size refused | **PASS** | core + use case + integration |
| Below minimum size refused | **PASS** | core |
| Partial page overflow refused | **PASS** | core + use case + integration |
| Total overflow refused | **PASS** | core + route |
| NaN and Infinity refused | **PASS** | core (all four fields) + integration (CHECK) |
| Precision round-trip without drift | **PASS** | core (idempotent) + integration (PostgreSQL) |
| Rounding cannot push a flush field over the edge | **PASS** | core |
| Bounds need no page dimensions | **PASS** | core |
| **Rotated page** | **PASS — REFUSED** | core + use case. See below |

## Rotation

| Case | Result | Where |
|---|---|---|
| Unrotated document accepted | **PASS** | core + use case |
| Any rotated page refuses the whole document | **PASS** | core + use case (read and save) |
| Unknown rotation refused, not assumed zero | **PASS** | core + use case |
| Inspector records the rotated page count | **PASS** | typechecked contract; the inspector's own suite covers PDF parsing |
| Non-multiple-of-90 rotation rejected as malformed | **NOT TESTED** | Added to the inspector; would need a crafted PDF fixture the inspection suite does not have. Recorded rather than claimed |

## State and editability

| Case | Result | Where |
|---|---|---|
| Editable preparation accepts mutations | **PASS** | use case + integration |
| **Locked preparation refuses mutations** | **PASS** | integration — `locked_at` set directly, since nothing sets it yet |
| State derived from `lockedAt`, never stored | **PASS** | core + architecture |
| Epoch-zero `lockedAt` is locked, not absent | **PASS** | core |
| Editability checked inside the write | **PASS** | integration (same `UPDATE`) |
| Ready/lock **operation** | **NOT IMPLEMENTED** | No product control — OD-125 |
| Ready-vs-edit race | **N/A** | No ready transition exists. The lock-vs-edit race IS covered, by the single-statement claim |

## Concurrency

| Case | Result | Where |
|---|---|---|
| Stale revision refused, newer work preserved | **PASS** | use case + integration + route (409) |
| Revision advances on every save | **PASS** | use case |
| First save reconciles `expectedRevision: 0` | **PASS** | use case |
| Racing first save refused rather than overwriting | **PASS** | use case |
| Layout save is atomic — a bad field changes nothing | **PASS** | use case + **integration** (CHECK violation mid-batch) |

## Authorization

| Case | Result | Where |
|---|---|---|
| `owner`, `administrator`, `template_administrator`, `sender` may save | **PASS** | use case |
| `reviewer` and `auditor` may READ, not save | **PASS** | use case + route |
| `member` refused entirely | **PASS** | use case |
| Non-member refused | **PASS** | use case + route |
| Denial is a hidden 404 | **PASS** | route |
| Role change effective on the next call | **PASS** | use case — demotion mid-flight |
| No `document.prepare` without `document.view` | **PASS** | architecture |
| Exhaustive 7 × 18 capability matrix | **PASS** | core — 126 assertions |
| No raw role check in preparation code | **PASS** | the BACKEND-27 guard, unchanged |
| Removed member denied | **BY COMPOSITION** | `findByUser` returns null → hidden 404. No preparation-specific test |

## Tenancy and RLS

| Case | Result | Where |
|---|---|---|
| Cross-tenant get | **PASS** | integration, runtime role |
| Cross-tenant save | **PASS** | integration |
| Cross-tenant field insert | **PASS** | integration (compound FK) |
| No tenant context sees nothing | **PASS** | integration |
| Compound FK to document, artifact, preparation | **PASS** | integration + architecture |
| One cascade only, no `SET NULL` | **PASS** | architecture + integration |
| No RLS bypass, no new transaction scope | **PASS** | architecture |

## HTTP

| Case | Result | Where |
|---|---|---|
| Anonymous refused on both routes | **PASS** | route, real `createApp` |
| CSRF required on save | **PASS** | route, real `createApp` |
| `no-store` on both responses | **PASS** | route + architecture |
| Client submitted value refused | **PASS** | route — `value`, `signatureValue`, `signedAt` all 422 |
| Client `sourceArtifactId` refused | **PASS** | route (422) |
| Client `state` / `lockedAt` refused | **PASS** | route (422) |
| Client `workspaceId` / `preparationId` / `revision` refused | **PASS** | route (422) |
| Stale revision returns 409 | **PASS** | route |
| Pre-auth MFA denied | **BY COMPOSITION** | The scope hook covers every route in it; no dedicated assertion |

## PDF boundary

| Case | Result | Where |
|---|---|---|
| No PDF library imported | **PASS** | architecture |
| **`DocumentSealer` never invoked** | **PASS** | architecture |
| No storage client imported | **PASS** | architecture |
| No artifact written | **PASS** | architecture + use case |
| No storage key or digest handled | **PASS** | architecture |

## Observability

| Case | Result | Where |
|---|---|---|
| Labels and coordinates absent from a real log line | **PASS** | route, live Pino output |
| Log payload names no field data | **PASS** | architecture (source scan) |
| Reads are not logged | **PASS** | route |
| Metric labels bounded, no id and no count | **PASS** | architecture |
| Document content in logs | **N/A** | No bytes in this layer |

## Contract hygiene

| Case | Result | Where |
|---|---|---|
| One coordinate model — no second origin or unit | **PASS** | architecture |
| 1-based pages everywhere, no `pageIndex` | **PASS** | architecture |
| Rounding centralized | **PASS** | architecture |
| No generic JSONB configuration bag | **PASS** | architecture |
| No `any` | **PASS** | architecture |
| No `setStatus` | **PASS** | architecture |
| No TODO on an implemented path | **PASS** | architecture |
| No contact, recipient, template or signing reference | **PASS** | architecture |
| Every domain file covered by the guards | **PASS** | architecture — enumerates directories |

## Migration

| Case | Result | Where |
|---|---|---|
| From zero | **PASS** | Fresh database; all 17 applied; both compound FKs verified via `pg_constraint` |
| Up and down round-trip | **PASS** | Verified while iterating on the migration |

## Frontend

| Case | Result |
|---|---|
| Coordinate fixtures (§285) | **NOT APPLICABLE this command** — no frontend contract changed; these are new backend routes the frontend does not yet call |
| Zoom invariance (§286) | **NOT APPLICABLE** — same |
| Viewer rotation (§287) | **N/A** — rotated documents are refused server-side (OD-124) |

The frontend work is real and is recorded as **OD-126**: whoever wires the
editor to these routes must add the shared fixtures, because the backend cannot
detect a bad viewport→normalized conversion — `0.5` looks identical whether it
was computed correctly or by luck.

## Not tested, and why

**Non-multiple-of-90 rotation** — the inspector now rejects it, but asserting it
needs a crafted PDF the inspection suite has no fixture for. Stated rather than
claimed.

**Pre-auth and removed-member denial** — enforced by composition, the same
honest label BACKEND-27, 28 and 29 used.

**Rate limiting** — **not applied**, not untested. A layout save is a normal
authenticated write; the expensive limiter stays on upload. §152 warns
explicitly against a low limit that would break editor autosave.
