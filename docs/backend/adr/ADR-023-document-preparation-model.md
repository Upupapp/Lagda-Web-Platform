# ADR-023 — Document preparation model

**Status:** Accepted · **Date:** 2026-08-10 · **Command:** BACKEND-30

Builds on [ADR-013](./ADR-013-secure-document-upload-pipeline.md) (accepted
bytes), [ADR-022](./ADR-022-document-vs-artifact-identity.md) (document versus
artifact) and the coordinate model BACKEND-09 fixed.

---

## Context

LAGDA must record where a future signer will sign, initial, tick and type, on a
PDF whose bytes are immutable and whose acceptance was expensive to establish.

Two things were already settled and are not revisited here:

- **The coordinate model.** BACKEND-09 fixed it and documented it: normalized
  0–1, top-left origin, `y` to the field's top edge, 1-based pages, out of
  bounds rejected rather than clipped, conversion confined to `toPdfRect`.
- **Artifact immutability.** ADR-022: accepted bytes are never overwritten, and
  any byte-changing operation creates a new artifact.

What needed deciding was where the field definitions live, whether they produce
bytes, and how a drag-and-drop editor's saves are made safe.

## Decision

**Metadata-only preparation: typed `PreparationField` records with canonical
normalized coordinates, attached to one exact immutable source `ArtifactId`, and
replaced as a whole layout under an optimistic revision.**

1. `DocumentPreparation` is a distinct resource — not a document column, not a
   signing request. One per document.
2. It names the **exact** artifact its coordinates target.
3. **No PDF is produced.** No prepared artifact, no bytes, no sealer.
4. **Nine field types**, each renderable by the sealer.
5. **Whole-layout `PUT`** with `expectedRevision`.
6. Two states, `editable` and `locked`, derived from `locked_at` — and nothing
   in this command sets it.
7. Assignment is an **opaque editor slot**, not an identity.
8. **Rotated documents are refused.**

## Alternatives considered

### Write form widgets into the ORIGINAL PDF

The DocuSign-shaped instinct: stamp AcroForm fields into the accepted file.

Rejected outright. It overwrites bytes whose digest is the evidence a completion
certificate rests on (ADR-022), and it would have to happen again on every drag.
The architecture forbids it structurally — the domain imports no PDF library —
rather than by policy.

### Always generate a derived PREPARED artifact

Every save produces a new immutable PDF with the widgets drawn in.

Rejected. Nothing in the product reads one: the frontend renders the original
client-side and draws overlays. It would mean a PDF render per drag, a digest
nobody checks, and a storage object per autosave. §15 prefers metadata-only
unless the flow requires embedding before sending, and it does not.

Kept available: if it is ever needed it gets a new `ArtifactId`, its own
SHA-256, source provenance, and never overwrites the original (§16).

### Store browser pixel coordinates

Whatever the drag handler produced.

Rejected, and it is the failure §62 names. Pixels depend on zoom, device pixel
ratio and CSS page size; the same field would persist differently on a retina
laptop and an external monitor, and correctly nowhere. Normalized 0–1 is
resolution-independent and — the property that keeps paying — makes bounds
validation `x + width <= 1`, expressible as a database CHECK with no page
dimensions.

### A second coordinate model "just for preparation"

Tempting because preparation is authoring and sealing is rendering.

Rejected. A miscomputed rectangle does not crash: it produces a structurally
valid PDF with the signature in the wrong half of the page, passing every
assertion about bytes and page counts. One model, one conversion function, one
document. An architecture guard fails on `bottom-left`, `pixels`, `points` or
`pageIndex` appearing in the preparation contract.

### Per-field CRUD endpoints

`POST /fields`, `PATCH /fields/:id`, `DELETE /fields/:id`.

Rejected for a drag-and-drop autosaving canvas: a request per drag frame,
partial save states, and a layout a reader can observe half-applied. §102
requires choosing one model deliberately.

The cost is accepted and mitigated: whole-layout replace makes a stale tab
capable of erasing work, which `expectedRevision` prevents by refusing with 409
rather than merging or overwriting silently.

### All thirteen editor field types

The editor offers thirteen; the sealer renders five.

Rejected. A field a sender can place but the signed document can never show is a
promise the system cannot keep — an `email` field today would ask the signer for
an address that appears nowhere. Nine are implemented: the five renderable
directly, plus `full-name`, `email`, `title` and `company`, which are
semantically distinct requests that all draw as text.

`radio-group` (option sets, group semantics, plan-gated), `multiline-text` (no
multiline renderer), `acknowledgment` (no renderer) and `sender-text` (different
authority and audit semantics — §39) are deferred with reasons. Adding one means
adding a renderer in the same command.

### A generic `configuration` JSONB column

Rejected (§83). Explicit typed columns; an architecture test asserts the
migration contains no `jsonb`, `config`, `metadata` or `properties`. A bag is
where client-controlled data nobody validates accumulates, and heterogeneity
across nine types does not justify it — they differ by two optional attributes,
not by shape.

### Silently accepting rotated pages

The status quo, and the most consequential thing this command changed.

`page.getSize()` returns the **unrotated** mediabox while a viewer renders the
**rotated** page. On a 90° page, the editor's coordinates are taken against a
landscape view and placed into portrait space — every field lands wrong, with no
error at any layer, on a document someone is about to sign.

Nothing in LAGDA knew a page could be rotated; the inspector never looked. It
does now, and preparation **refuses** rather than misplacing. Unknown rotation
is refused too: assuming unrotated would silently accept the exact case the
check exists to catch.

### Assigning fields to a ContactId or an email

Rejected (§50, §51). A contact is address-book data and an email is mutable
display PII; either as a durable relationship means a corrected typo silently
reassigns a field. The slot is opaque and dereferences nothing until BACKEND-31
gives it a real recipient.

## Consequences

**Good.** The original is untouched by construction rather than by care — three
import guards and a whole-row comparison. One coordinate model, so a signature
cannot be correct on one path and inverted on another. Bounds checking is a
database CHECK. A stale editor tab is told to reload instead of erasing work.
Every field type can actually be rendered. And a rotated-page defect that
predates this command is now visible instead of silent.

**Costs.** Whole-layout replace rewrites every field row on every autosave —
bounded at 500 rows and acceptable, but it is not a targeted update. A stale tab
loses its unsaved edits on 409, which is the honest outcome and still a lost
edit. Nine preparation types map onto five render types, which commits
BACKEND-33's sealer to that mapping.

**A consequence worth stating loudly.** **A document with any rotated page
cannot be prepared at all.** A contract scanned sideways — an ordinary thing —
is refused with a clear message rather than accepted and mis-signed. That is the
right trade and it is a real product limitation, recorded as **OD-124**. Lifting
it means teaching the renderer about rotation, not relaxing the check.
