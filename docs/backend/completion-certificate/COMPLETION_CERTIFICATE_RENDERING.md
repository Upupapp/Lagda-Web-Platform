# Completion certificate — rendering

**Command:** BACKEND-40 · **Code:** `packages/sealing/src/internal/certificate.ts`
**Renderer version:** `certificate-renderer-v1`

## Package boundary

Rendering lives inside `@lagda/sealing`, the approved PDF boundary. No PDF
library type crosses into application, api, worker or db, and an architecture
guard asserts it. `pdf-lib` and `@pdf-lib/fontkit` remain the only PDF
dependencies — **no second PDF library was added** (§68, §240).

## Layout

A4 portrait (595.28 × 841.89 pt), 56 pt margins, matching the frontend's stated
page geometry.

Sections in order: heading; Document; Signing source document SHA-256; Signing
participants; Certificate generated / Certificate version; disclaimer.

Each participant block renders name, masked email, `Signed:`,
`Authentication:`, then `Signing session entered:` and `Consent (…)` when those
exist.

## Pagination

Deterministic. A new page begins when the next line would cross the bottom
margin, and each participant block reserves room first so a signer's name and
their signing time do not land on different pages.

Measured: 30 participants produce 5 pages. Nobody is dropped — §107 forbids a
one-page layout that truncates participants.

## Fonts and Unicode

The vendored Noto Sans faces from BACKEND-39
(`packages/sealing/assets/fonts/`), embedded via fontkit and subset on embed.
Server-controlled: no client font, no HTML, no CSS, nothing scriptable enters
rendering (§100, §103).

**Coverage is checked before anything is drawn.** An embedded font does not
throw on an uncovered glyph — it draws NOTHING — so a certificate could
otherwise be produced with a signer's name missing and still look complete. A
name the face cannot draw FAILS the step (§178). Tofu boxes are never rendered.

Long names WRAP; they are never truncated (§105). A digest is one unbreakable
64-character token, which is why the wrapper handles mid-token breaks at all.

## Time format

`YYYY-MM-DD HH:mm:ss UTC`. Locale-independent, explicitly labelled, and the
server's locale never participates (§52, §53). Changing this format changes
`rendererVersion` (§54).

## Determinism

Proven, not claimed (§113): the same model renders byte-identical output. Both
PDF dates are pinned from `model.generatedAt`, so nothing reads a clock.

A companion test asserts the output CHANGES when the model changes — otherwise
the determinism test would pass just as happily on a renderer that ignored its
input entirely.

## What the renderer refuses

| Condition | Error | Retryable |
|---|---|---|
| Glyph missing from the face | `UnrenderableTextError` | no |
| Authentication method with no wording | `UnsupportedRepresentationError` | no |
| Zero participants | `InvalidSealInputError` | no |
| Model from another schema version | `InvalidSealInputError` | no |
| Serialization failure | `PdfProcessingError` | yes |

**A bug these tests caught, worth recording.** The renderer originally re-threw
only `UnsupportedRepresentationError`, so `UnrenderableTextError` — raised by
the coverage guard inside the same `try` — was rewrapped as
`PdfProcessingError`, which is RETRYABLE. The pipeline would have retried a
signer name that can never render, forever. Any `SealingError` now passes
through unchanged.

## Testing constraint, measured

Certificate text is **not** byte-searchable. Searching the output for
"Certificate of Completion" — a string the renderer definitely draws — finds
nothing, because the embedded subset encodes text as glyph indices and the
content stream is compressed.

So `expect(bytes).not.toContain("Sealed")` would pass **vacuously** on a
document saying it in 72-point type. Absences are asserted two ways that can
actually fail:

1. against the MODEL, which carries no such field (compile-time), and
2. against the renderer SOURCE, scanned for forbidden literals — with a
   positive control proving the scan finds literals that ARE present.

That positive control earned itself immediately: the first scan regex used
`[^"\\]`, which matches newlines, so it paired each closing quote with the next
opening quote and swallowed whole blocks of code as single "strings". The
control failed and the detector was fixed.
