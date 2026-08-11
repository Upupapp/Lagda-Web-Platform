# PDF field merge — the renderer

**Command:** BACKEND-39 · **Status:** renderer built; the pipeline STEP is not
**Code:** `packages/sealing/src/node-field-merger.ts`,
`internal/merge.ts`, `internal/fonts.ts`, `internal/geometry.ts`
**Read with:** `PDF_FIELD_MERGE_PRODUCT_INVENTORY.md`, ADR-031,
`sealing/PDF_COORDINATE_MODEL.md`

## What this is

`FieldMerger.mergeFields()` renders accepted field values onto the exact source
PDF and returns a **merged candidate** — fields drawn, not sealed. It is the
output of the completion pipeline's `field-merge` step.

It never calls `DocumentSealer`, never touches object storage, and never reads a
clock.

## The seam

A **second** port, deliberately not a second method on `DocumentSealer`.

`DocumentSealer` is the one-operation boundary a future Java or .NET signer
replaces wholesale. Hanging `mergeFields` off it would oblige a remote signing
service to implement field rendering to satisfy the interface — backwards, since
merging is the part that stays local. An architecture guard asserts
`DocumentSealer` still declares exactly one method.

One package, two seams, one caller each.

```
FieldMerger.mergeFields(request) -> {
  mergedDocument, sourceDocumentHash, mergedDocumentHash, renderedFieldCount
}
```

`sourceDocumentHash` is taken **before** anything touches the bytes, so the step
can prove it merged onto the artifact the signing request froze rather than onto
whatever storage happened to return. `mergedDocumentHash` is taken **after**
serialization, from the exact bytes returned.

## The three defects it fixes

The inventory found a renderer that already existed, with three concrete
problems. All three are closed.

### 1. A drawn signature did not render at all

`fields.ts` drew every `signature` field with `drawText` in an oblique face —
a *typed* rendering. A `RASTER_SIGNATURE_V1` is the PNG the signer drew on the
canvas; it has no text value, and nothing in the path embedded an image. The
field produced no marks whatsoever.

`MergeableFieldValue` is now a discriminated union rather than one
`value: string`, because a raster is not a string and encoding it as one is
precisely how a drawn signature silently became a typed one.

The raster is **scaled to fit and centred, never stretched**. A signature
stretched to a box of a different aspect ratio is a different mark from the one
the signer made. The image's own dimensions drive the layout, not the recorded
`width`/`height`: the bytes are immutable and are the authority.

Only `image/png` is accepted — the product's canvas emits nothing else and §52
verifies it. A JPEG is refused, not skipped, because skipping produces a blank
signature on a document that looks complete.

### 2. Unicode was unsupported

See ADR-031. Noto Sans, embedded via fontkit, plus a **glyph-coverage guard**
that refuses text the face cannot draw instead of drawing nothing.

### 3. Rotation

Unchanged and deliberate. BACKEND-30 refuses rotated pages at preparation time
(OD-124), so only 0° can reach completion. Implementing a transform that cannot
be exercised would be untested code that looks supported.

## Determinism

The merged candidate's SHA-256 is its identity, so two attempts of the same run
must agree — otherwise §117's "reuse the previous attempt's output" compares
against something that can never match.

Three things secure it:

- **`mergedAt` is supplied**, never read from a clock. pdf-lib otherwise stamps
  the modification date from the system clock on save, which made output
  non-deterministic across a one-second boundary — a test that fails
  intermittently is worse than one that fails consistently.
- **Render order is sorted by `(pageNumber, fieldId)`**, not by the caller's
  array. Two fields may overlap and the one drawn second is the one visible;
  iterating the caller's array would make the visible result depend on however
  rows came back from the database, and it would change under an unrelated query
  edit. An architecture guard already asserts the package reads no clock and no
  randomness.
- **The caller's buffer is never mutated.** pdf-lib may retain and write through
  the array it is given, and the caller still needs those bytes to match
  `sourceDocumentHash`.

## What it refuses

Everything below is validated **before a single byte is drawn**. Interleaving
validation with drawing leaves a document half-rendered when the fourth field is
rejected, and lets an unrelated failure mask a placement error that has a much
more specific message.

| Condition | Error | Retryable |
|---|---|---|
| Glyph missing from the face | `UnrenderableTextError` | no |
| Raster not decodable / empty / not PNG | `UnsupportedRepresentationError` | no |
| Typed style outside 0–3 | `UnsupportedRepresentationError` | no |
| Rect non-finite, non-positive, or off-page | `InvalidFieldPlacementError` | no |
| Page number not a positive integer, or past the end | `InvalidFieldPlacementError` | no |
| Same `fieldId` twice | `InvalidFieldPlacementError` | no |
| Not a PDF / no readable page tree / no pages | `InvalidPdfError` | no |
| Encrypted | `UnsupportedPdfError` | no |
| Font file unreadable | `TypefaceUnavailableError` | **yes** |
| Serialization failed | `PdfProcessingError` | **yes** |

Two of these deserve their reasoning restated.

**A typed style index outside 0–3 is refused, not clamped.** Clamping renders a
signature in a style the signer did not choose and records nothing about having
done so.

**A `%PDF-` header with no readable page tree is terminal.** pdf-lib's loader is
tolerant: those bytes parse into a document with no pages, and
`throwOnInvalidObject` does not change it. Unchecked, the failure surfaces much
later during font embedding as a *retryable* processing error, so the pipeline
would retry a permanently malformed file forever.

Geometry is revalidated here even though BACKEND-30 enforces `x + width <= 1` as
a database CHECK. The CHECK constrains what preparation may **write**; it says
nothing about what reached this function after a restore or a hand-edited row.

## Coordinates

Unchanged, and the flip now lives in `internal/geometry.ts` — extracted from
`fields.ts` so the new renderer and the legacy one share **one** implementation.
Two copies is how one path ends up correct and the other upside down, and the
second is only discovered by someone reading a finished document.

Normalized 0–1, origin top-left, `y` to the field's TOP edge, 1-based pages.

## Tests

62, in `packages/sealing/src/node-field-merger.test.ts`.

The ones that matter most assert a **refusal**, because the failure this design
introduces is silent. A suite that only checked the happy path would stay green
through the exact regression the coverage guard exists to prevent.

Note the `rejection()` helper rather than `.catch(e => e)`: the latter resolves
to the *result* when a merge unexpectedly succeeds, and assertions like
`expect(error.message).not.toContain(secret)` then pass vacuously because
`undefined` contains nothing.

`buildTestSignaturePng()` builds a **real** PNG. A fixture of arbitrary bytes
behind a `\x89PNG` prefix is rejected by pdf-lib's decoder, so a test using one
could only ever exercise the failure path and the drawn-signature renderer would
have no positive coverage at all.

## What is NOT built

**The `field-merge` step itself.** The renderer exists; nothing calls it from
the completion pipeline. `processCompletionRun` still records
`step-not-implemented` and returns the run to the claimable pool.

Still needed, and this is the whole of it:

1. Load the source artifact's bytes from storage and **verify the digest**
   against `sourceArtifactId` before rendering onto them.
2. Project accepted field values and representations into `MergeableField[]`.
3. Upload the merged candidate; write the `merged-candidate` artifact row.
4. `acceptStep` with the output artifact id.
5. The two failure windows: uploaded-but-not-recorded (orphan object, OD-160)
   and recorded-but-not-uploaded.
6. Map `SealingError` onto `CompletionFailureCode`. The codes now EXIST
   (migration 027): `unrenderable-value` and `typeface-unavailable`, plus a
   broadened `unsupported-representation`. Only the mapping is left.

**BACKEND-40 remains NOT READY** until step 3 exists, because there is no
`merged-candidate` artifact for the certificate step to sit beside.

## OD-162 — closed, not deferred

`seal()` no longer merges fields. `SealRequest.fields`, `SealableField`, the
private `merge()` and `internal/fields.ts` are gone; `seal()` receives the merged
candidate and adds no marks of its own.

It was closed in this command rather than left to BACKEND-41 because both
renderers now exist, so the double-render window opened the moment `merge.ts`
landed — and a value drawn twice reads as a font-weight artefact, not as an
architecture fault.

Safe because `NodeDocumentSealer` has no production caller; `start-server.ts`
says so, and the other `.seal(` matches in the repo are a different secret-box
sealer for credentials.
