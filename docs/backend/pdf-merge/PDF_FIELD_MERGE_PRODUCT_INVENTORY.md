# PDF field merge — product inventory

**Read before the architecture.** Sources: `PREPARATION_FIELD_TYPES`
(contracts), `renderTypeFor` (core), `SEALABLE_FIELD_TYPES` and
`packages/sealing/src/internal/fields.ts`, migration 023's
`REPRESENTATION_TYPES`, and the frontend's field and signature models.

## The headline finding: field rendering ALREADY EXISTS, and it is thin

`packages/sealing/src/internal/fields.ts` renders fields today, as a private
collaborator of `DocumentSealer.seal()`. So BACKEND-39 is not writing a renderer
from nothing — it is replacing one that was built to prove the seam, and that
has three concrete defects the product will hit.

## The nine types, and the five the sealer knows

The backend has **nine** preparation field types; the sealer has **five**
renderable ones, and `renderTypeFor` collapses the difference.

| Field type | Renders as | Verdict | Note |
|---|---|---|---|
| `signature` | `signature` | **IMPLEMENT_NOW** | today drawn as *text in an oblique font* — see the raster gap below |
| `initials` | `initials` | **IMPLEMENT_NOW** | same |
| `date-signed` | `date` | **IMPLEMENT_NOW** | server-derived; BACKEND-36 stores it as an instant |
| `text` | `text` | **IMPLEMENT_NOW** | |
| `checkbox` | `checkbox` | **IMPLEMENT_NOW** | drawn, not a glyph — deliberately, because a missing glyph renders as nothing and an unchecked box that should be checked is the worst possible failure |
| `full-name` | `text` | **IMPLEMENT_NOW** | server-derived from the recipient snapshot |
| `email` | `text` | **IMPLEMENT_NOW** | server-derived |
| `title` | `text` | **IMPLEMENT_NOW** | recipient-provided |
| `company` | `text` | **IMPLEMENT_NOW** | recipient-provided |
| RADIO | — | **NOT_IN_PRODUCT** | not in `PREPARATION_FIELD_TYPES`; the editor cannot create one |
| DROPDOWN | — | **NOT_IN_PRODUCT** | same |

§34 and §35 require unknown and unsupported types to fail closed. They already
do: `PreparationFieldType` is a closed union validated at the persistence
boundary, so an unknown type cannot be read back out of the database.

## Signature representations

Migration 023 accepts exactly two, and there is no upload path anywhere in the
product.

| Representation | Verdict | Note |
|---|---|---|
| `TYPED_SIGNATURE_V1` | **IMPLEMENT_NOW** | text plus an index into four server-known styles. A client cannot name a font because there is nowhere to put one |
| `RASTER_SIGNATURE_V1` | **IMPLEMENT_NOW** | the 420×120 canvas PNG, stored as `bytea`, magic-byte checked and bounded at 64 KiB |
| UPLOADED SIGNATURE | **NOT_IN_PRODUCT** | BACKEND-36's report is explicit: "no upload — there is no file input anywhere in the recipient pages" |
| DRAWN STROKES (vector) | **NOT_IN_PRODUCT** | the product rasterises on the canvas; no stroke list is ever transmitted or stored, so §41's vector rendering has no input |

## Three defects in the renderer as it stands

**1. A drawn signature does not render at all.** `fields.ts` handles
`signature` and `initials` by `drawText(field.value, …)` in an oblique font.
That is a *typed* rendering. A `RASTER_SIGNATURE_V1` — the PNG the signer
actually drew — has no text value, and nothing in the current path embeds an
image. This is the single largest gap BACKEND-39 closes.

**2. Unicode is not supported, and Philippine names will break it.**
The renderer embeds `StandardFonts.Helvetica` and `HelveticaOblique`. Those are
WinAnsi-encoded: pdf-lib **throws** on a character outside that range rather
than substituting. §146 requires names with diacritics to work, and *Ñ* is in
WinAnsi while many other marks used in Philippine and international names are
not. Fixing it means embedding a real Unicode font with `fontkit`, which is a
dependency decision (§52, §272) and a licensing decision.

**3. Rotation is refused rather than handled.** BACKEND-30 refused rotated
pages at preparation time — `page.getSize()` returns the unrotated mediabox
while a viewer shows the rotated page, so every field on a 90° page would land
wrong with no error. So `ROTATED PAGE` is **FOUNDATION_ONLY** here: §198–§201
ask for 0/90/180/270 tests, and today only 0° can occur, because a rotated
source cannot be prepared. Implementing the transform without being able to
produce a rotated request would be untested code that looks supported.

| Concept | Verdict |
|---|---|
| ROTATED PAGE | **FOUNDATION_ONLY** — refused upstream by BACKEND-30 (OD-124) |
| MULTI-PAGE PDF | **IMPLEMENT_NOW** — `pageNumber` is 1-based and page count is inspected at upload |
| UNICODE | **REQUIRES_REVIEW** — needs a font decision before it can be claimed |

## Coordinate model — settled, do not re-derive

`PDF_COORDINATE_MODEL.md`: normalized 0–1, **top-left origin**, `y` to the
field's TOP edge, **1-based** pages. The conversion to PDF space lives only in
`toPdfRect`. BACKEND-39 reuses it and adds no second convention (§23).
