# Preparation product inventory — BACKEND-30

Read before changing anything in `docs/backend/preparation/`.

## Sources read

| File | What it settled |
|---|---|
| `docs/backend/sealing/PDF_COORDINATE_MODEL.md` | **The coordinate model is already canonical.** Nothing to invent |
| `packages/application/src/common/ports/sealing.ts` | `SEALABLE_FIELD_TYPES` — the **five** types the sealer can render |
| `packages/sealing/src/internal/fields.ts` | `toPdfRect`, the single conversion point |
| `src/app/models/field-editor.ts` | `FieldType` (13), `FieldDefinition`, `NormalizedRect`, `FIELD_SIZE_CONSTRAINTS`, `FIELD_PLAN_TIER` |
| `src/app/models/prepare.ts` | `PrepParticipantRole`, the step flow, `PrepFile[]` |
| `packages/application/src/upload/process-upload.ts` | `InspectionOk.pageSizes` — inspected, **not persisted** |
| BACKEND-29 documents | `DocumentId`/`ArtifactId` separation, one ORIGINAL per document |

## The coordinate model needs no decision

Already fixed by BACKEND-09 and documented, and BACKEND-30 must not create a
second one:

| | Value |
|---|---|
| Origin | **top-left** |
| Units | **normalized 0–1** of the page |
| `y` measures | distance **down** to the field's **top** edge |
| Page numbering | **1-based** (`SealableField.pageNumber`; page `0` is rejected) |
| Rect | `{ x, y, width, height }`, all 0–1 |
| Conversion to PDF space | `toPdfRect`, in exactly one file |

`§54`, `§59`, `§60`, `§61` are therefore all answered by existing architecture.

**A consequence worth stating early:** because coordinates are normalized, bounds
validation is `0 ≤ x` and `x + width ≤ 1` — it needs **no page dimensions at
all**. Page geometry is only needed by the renderer, which reads it from the
actual PDF at seal time (`page.getSize()`).

## Classification

| Feature | Classification | Why |
|---|---|---|
| **PREPARATION (as a resource)** | **IMPLEMENT_NOW** | The editor needs somewhere to persist a layout |
| **ADD / MOVE / RESIZE / DELETE FIELD** | **IMPLEMENT_NOW** | `EditorMode`, drag/resize and `FIELD_SIZE_CONSTRAINTS` all exist |
| **REQUIRED FLAG** | **IMPLEMENT_NOW** | `FieldDefinition.required: boolean` |
| **FIELD LABEL** | **IMPLEMENT_NOW** | `FieldDefinition.label: string`, displayed in the editor |
| **FIELD ORDER / Z-ORDER** | **IMPLEMENT_NOW** | `FieldDefinition.layer: number` — a real z-order the editor manipulates |
| **SIGNATURE / INITIALS / DATE_SIGNED / TEXT / CHECKBOX** | **IMPLEMENT_NOW** | In the editor **and** renderable by the sealer |
| **FULL-NAME / EMAIL / TITLE / COMPANY** | **REQUIRES_REVIEW** | In the editor; render as text, but each asks the signer for something different. See below |
| **MULTILINE-TEXT** | **REQUIRES_REVIEW** | `FieldDefinition.multiline?` exists; the sealer has no multiline renderer |
| **ACKNOWLEDGMENT** | **REQUIRES_REVIEW** | In the editor with its own participant role; no sealer support |
| **SENDER-TEXT** | **DEFER** | Sender-filled content — §39 warns it carries separate authority and audit semantics |
| **RADIO-GROUP** | **DEFER** | Needs option sets and group semantics (§38); the only type gated behind a paid plan tier; no sealer support |
| **DROPDOWN** | **NOT_IN_PRODUCT** | Not in `FieldType` at all |
| **PREFILL FIELD** | **NOT_IN_PRODUCT** | No prefill concept beyond `sender-text` |
| **FIELD DUPLICATE** | **REQUIRES_REVIEW** | No duplicate action found in the editor model |
| **RECIPIENT ASSIGNMENT** | **FOUNDATION_ONLY** | `participantId: string \| null` exists. BACKEND-31 owns the identity |
| **LOCK PREPARATION** | **REQUIRES_REVIEW** | No lock control found; the flow has a "Review" step, not a lock |
| **PREPARED PDF ARTIFACT** | **NOT_IN_PRODUCT** | Nothing generates one. Metadata-only (§15) |

## The three findings that shape this command

### 1. The editor offers 13 field types; the sealer can render 5

```
sealer  (SEALABLE_FIELD_TYPES):  signature · initials · text · date · checkbox
editor  (FieldType):             signature · initials · full-name · date-signed ·
                                 text · multiline-text · checkbox · radio-group ·
                                 email · title · company · acknowledgment · sender-text
```

**A field type that can be placed but never rendered onto the signed PDF is a
promise the system cannot keep.** Placing an `email` field today would produce a
document where the signer was asked for an address that appears nowhere.

Eight of the thirteen fall into that gap. Four of them (`full-name`, `email`,
`title`, `company`) are *semantically* distinct but would all render as `text` —
so supporting them means the preparation type is richer than the render type,
with an explicit mapping. That is defensible architecture and it is a decision,
not a detail: it needs the sealer to agree, and the sealer is BACKEND-33's.

`radio-group` is the clearest DEFER: it needs option sets, group semantics and a
renderer, and it is the one type gated behind a plan tier.

### 2. Every `FieldDefinition` is marked `demonstrationOnly: true`

Not optional — a required literal type on every field the editor produces. And
`prepare.ts` opens with:

> `// The preparation flow is FRONTEND-ONLY — no real uploads, no real invitations.`

The same signal as contacts' `merge-demonstration`, and it means the editor's
richer features (z-order, labels, radio options, sender text) have never been
exercised against a backend.

It does **not** mean preparation should not be built — BACKEND-30 exists to
build it, and the geometry and the five renderable types are unambiguous. It
does mean the marginal types deserve REQUIRES_REVIEW rather than being adopted
because they appear in a union.

### 3. Page geometry is inspected and thrown away — and rotation is never inspected

`InspectionOk.pageSizes` carries `{ width, height }` per page and is returned in
the upload result. **It is persisted nowhere** — the same class of gap as the
page count BACKEND-29 found and fixed.

Worse, **rotation is not inspected at all**. `InspectionOk` has no rotation
field, so nothing in LAGDA knows a page is rotated.

Why it matters (§63, §219): pdf-lib's `page.getSize()` returns the *unrotated*
mediabox. A viewer renders the *rotated* page. So for a 90°-rotated page the
frontend's normalized coordinates are taken against a landscape view while the
sealer places them into a portrait space — every field on that page lands wrong,
with no error.

**This predates BACKEND-30** — the sealer has always had it — but §63 forbids
silently ignoring it, so this command must either extend the inspection output
(§64 permits exactly that) or state the limitation explicitly and refuse rotated
pages. It cannot be left unsaid.

Bounds validation itself does **not** need page geometry, because the
coordinates are normalized.

## What is already decided elsewhere

| Question | Answer | Source |
|---|---|---|
| Page indexing | 1-based | `SealableField.pageNumber`; page 0 rejected |
| Origin / units | top-left, normalized 0–1 | PDF_COORDINATE_MODEL.md |
| Out-of-bounds | rejected, never clipped | PDF_COORDINATE_MODEL.md |
| Page count authority | `document_artifacts.page_count` | BACKEND-29 |
| Source artifact | the document's ORIGINAL | BACKEND-29 — one per document |
| Prepared artifact | none | Nothing in the product generates one |
