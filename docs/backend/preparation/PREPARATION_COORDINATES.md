# Preparation coordinates

**There is one coordinate model in LAGDA and this document does not define it.**
[PDF_COORDINATE_MODEL.md](../sealing/PDF_COORDINATE_MODEL.md) does, and has since
BACKEND-09. This page records how preparation uses it.

A second model is the defect that puts a signature in the wrong half of a page
while every assertion about bytes, page counts and re-parsing still passes.

## The model, restated

| | Value |
|---|---|
| Origin | **top-left** |
| Units | **normalized 0–1** of the page |
| `x` | distance right to the field's **left** edge |
| `y` | distance down to the field's **top** edge |
| `width`, `height` | fractions of page width and height |
| Pages | **1-based** |

```
(0,0) ┌─────────────────┐
      │   ┌────┐        │   x = 0.15, y = 0.20
      │   │    │        │   width = 0.25, height = 0.08
      │   └────┘        │
      │                 │
      └─────────────────┘ (1,1)
```

## Page numbering, without ambiguity

| Page | `pageNumber` |
|---|---|
| First | **1** |
| Second | **2** |
| Last of a 5-page document | **5** |

`pageNumber: 0` is **rejected**, not read as page 1. A zero means the caller is
using a different convention, and accepting it would place the field on the
wrong page for every subsequent call. The schema bounds it at `minimum: 1`, the
database has `page_number >= 1`, and the domain bounds the ceiling against the
artifact's inspected page count.

pdf-lib is 0-based; `toPdfRect` subtracts one, in the one file that converts.

## Bounds need no page dimensions

The property that makes normalization worth having:

```ts
x >= 0 && y >= 0 && x + width <= 1 && y + height <= 1
```

No page width, no page height, no lookup. The same rectangle is valid on A4,
Letter and legal — which is also why this is expressible as a database CHECK
rather than only as application logic.

**Out of bounds is rejected, never clipped**, matching the rendering rule.
Partial overflow counts: a field half off the page is a signature half off the
page, and clipping would produce a document that looks complete.

**NaN and Infinity are rejected first**, explicitly, before any comparison. Every
comparison against `NaN` is false, so `x + width > 1` is false too — a purely
comparative check would pass a `NaN` rectangle as "not out of bounds". The
database CHECK catches them for the same reason it catches overflow: they fail
the comparison it makes.

## Minimum size

`MINIMUM_FIELD_EXTENT = 0.005` — roughly 3 points on A4.

This rejects **pathological** values, not unfashionable ones. A near-zero field
is invisible and unclickable, so a signer would be blocked by a required field
they cannot find. The editor has its own `FIELD_SIZE_CONSTRAINTS` with sensible
per-type defaults; duplicating those here would be a second design authority
that drifts.

## Precision

Stored as `double precision`, **rounded to six decimals** on the way in.

A browser drag produces `0.31415926535897931`. Fifteen decimals of a page is
sub-atomic — at 1e-6 of a 595-point A4 width the increment is 0.0006 points,
about a thousandth of a pixel at 96 DPI. The noise is meaningless and it makes
two visually identical layouts compare as different, which matters the moment
BACKEND-32 wants to hash a preparation snapshot.

Rounding is **centralized in `roundCoordinate`** (§164) so the frontend and
backend cannot round differently, and it is idempotent — persisting and
re-reading cannot walk a coordinate away from where the sender put it.

`numeric` was considered and rejected: these are display geometry the renderer
multiplies by page dimensions, not money. `double precision` round-trips six
decimals exactly.

## Rotation — the gap this command found

**Preparation refuses documents with rotated pages.**

`page.getSize()` returns the **unrotated** mediabox. A viewer renders the
**rotated** page. So on a 90° page the editor's normalized coordinates are taken
against a landscape view while the renderer places them into portrait space, and
every field on that page lands wrong — with no error, at any layer.

Nothing in LAGDA knew a page could be rotated: the inspector never looked. This
command taught it to (§64 permits extending the narrow inspection output),
persisted `rotated_page_count` on the artifact, and made preparation refuse.

**Unknown rotation is refused too.** An artifact inspected before this exists
has `null`, and treating that as zero would silently accept exactly the case the
column was added to catch.

This is a **real limitation**: a contract scanned sideways cannot currently be
prepared. It is **OD-124**, and it is lifted by teaching the renderer about
rotation — not by relaxing the check.

## What the frontend must do

The editor already produces this model — `field-editor.ts` states it:

> All coordinates are NORMALIZED (0–1) relative to the logical page dimensions.
> x=0, y=0 is the top-left of the page.

So the conversion the frontend owes is **viewport → normalized**, and it must be
independent of:

- **zoom** — dividing by the rendered page size at the current zoom is what
  makes it so; a coordinate that changes when the user zooms is a bug;
- **device pixel ratio** — same;
- **scroll position** — the rectangle is relative to the page, not the viewport.

§62 forbids persisting raw drag coordinates, and the backend cannot detect a
violation: `0.5` looks the same whether it was computed correctly or by luck.
The frontend fixtures §285 asks for are the only place that can be caught.
