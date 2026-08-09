# PDF Coordinate Model

## The two spaces

| | Origin | Units | `y` measures |
|---|---|---|---|
| **LAGDA field editor** | **top-left** | normalized 0–1 of the page | distance **down** to the field's **top** edge |
| **PDF user space** | **bottom-left** | points (1/72 inch) | distance **up** to the field's **bottom** edge |

The frontend model is not inferred. `src/app/models/field-editor.ts` states it:

> All coordinates are NORMALIZED (0–1) relative to the logical page dimensions.
> x=0, y=0 is the top-left of the page.
> Normalized values; page is A4 portrait (595x842 CSS px at 100% zoom).

PDF's bottom-left origin is part of the format.

## The conversion

```ts
const width  = rect.width  * pageWidth;
const height = rect.height * pageHeight;
const x      = rect.x      * pageWidth;
const y      = pageHeight - (rect.y * pageHeight) - height;
```

Two things happen to `y`, and missing either produces a plausible wrong answer:

1. **The axis inverts** — `pageHeight - …` converts "down from the top" into "up
   from the bottom".
2. **The height is subtracted** — LAGDA's `y` locates the field's *top* edge;
   pdf-lib draws from its *bottom* edge.

Forgetting only step 2 offsets every field by its own height: correct for a thin
date field, visibly wrong for a tall signature block. That is the failure mode
worth naming, because it looks fine in a spot check.

`x` and `width` need no adjustment — the horizontal axis agrees.

## It lives in exactly one place

`toPdfRect` in `packages/sealing/src/internal/fields.ts`. Nothing else in the
backend performs the flip.

A miscomputed rectangle does not crash. It produces a structurally valid PDF with
the signature in the wrong half of the page — which passes every assertion about
bytes, page counts and re-parsing. Confining the conversion to one exported
function is what makes it reviewable and directly testable.

Three tests pin it at the boundaries: a mid-page rectangle with hand-computed
expected values, a field at the very top of the page, and one at the very bottom.

## Page numbers

The product is **1-based**. pdf-lib is **0-based**. The adapter subtracts one, in
the same file.

Page `0` is rejected rather than treated as page 1 — a zero means the caller is
using a different convention, and silently accepting it would render the field on
the wrong page for every subsequent call.

## Out-of-bounds fields are rejected, not clipped

A field extending past the page edge fails with `InvalidFieldPlacementError`.

Clipping would produce a document that looks complete while a signature is
cropped away at the margin. A failed seal is recoverable; a silently truncated
signature on a distributed document is not.

## Validation runs before rendering

Every field is validated before the first byte is drawn. Interleaving would leave
a document half-rendered when the fourth field is rejected, and it also let an
unrelated failure — font embedding — mask a placement error that has a far more
specific message.

## Page geometry

The certificate is generated at A4 portrait, 595.28 × 841.89 points, matching the
frontend's stated page size.

Field placement never assumes A4. Each page's real size is read from the document
via `page.getSize()`, so a Letter or legal source PDF places correctly. Assuming
A4 would put fields subtly out of position on every non-A4 upload — again,
without any error.
