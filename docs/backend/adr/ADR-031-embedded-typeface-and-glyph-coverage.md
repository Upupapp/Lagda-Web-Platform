# ADR-031 — An embedded typeface, and refusing what it cannot draw

**Status:** Accepted (BACKEND-39, 2026-08-11)
**Supersedes:** the font half of the sealer's original "no font files" stance
**Related:** OD-162, OD-163, ADR-022, `sealing/PDF_COORDINATE_MODEL.md`

## Context

`@lagda/sealing` rendered every field value in `StandardFonts.Helvetica`.

Standard PDF fonts are attractive for a reason the original comment stated
plainly: "No font files, no reliance on fonts installed on whatever machine
happens to run this." That reasoning is sound and this ADR keeps its
conclusion — the font must not come from the host — while rejecting its
mechanism.

Helvetica is **WinAnsi-encoded**. pdf-lib does not substitute a missing
character; it **throws**. So a recipient named *Peñaflor* or *Ángeles* could
not have their document completed at all, and §146 requires those names to
work. That was OD-163.

## Decision

**Embed Noto Sans, and refuse text the embedded face cannot draw.**

Two halves, and the second is the one that is easy to miss.

### 1. The typeface

Three faces — regular, bold, italic — from `@expo-google-fonts/noto-sans`, an
exact-pinned npm dependency, loaded through `@pdf-lib/fontkit`.

**Why an npm dependency rather than a vendored binary.** The bytes must be
identical everywhere, and they must not enter git history where removing them
later needs a rewrite. A pinned package gives both. The alternative — resolving
a host-installed font — was rejected outright: the sealed document's SHA-256 is
its identity, and a host-resolved face produces different bytes on a developer's
machine, in CI, and in a container that ships no fonts at all, where it fails
rather than degrades.

**Why not `@fontsource/noto-sans`,** which was the first choice and is the more
obvious package. Measured, not assumed: fontsource v5 ships WOFF/WOFF2 only, and
its `latin` and `latin-ext` subsets are **disjoint** — `latin` carries ñ and not
₱, `latin-ext` carries ₱ and not ñ. One `PDFFont` embeds one file, so no
combination of them covers a Philippine document containing both a name and a
peso amount. `@expo-google-fonts` ships the complete 4503-glyph faces as TTF.

Two further measurements worth recording, because both would otherwise be
rediscovered painfully:

- **`.woff2` crashes the process.** `@pdf-lib/fontkit` mis-parses it and throws
  a `RangeError` from a deferred queue, outside the promise chain, where no
  `await` can catch it. `.woff` parses correctly. This ADR uses neither — TTF —
  but a future change reaching for a smaller file must not reach for WOFF2.
- **Output is byte-identical across runs** once the modification date is pinned,
  so embedding does not cost determinism.

**Cost:** ~14 MB in `node_modules` (18 faces ship, 3 are used); nothing in the
repository, and nothing in the sealed document beyond the subset of glyphs
actually drawn.

### 2. The coverage guard

**A missing glyph is refused, never drawn.**

This is the half that exists because of what an embedded font does *differently*
from a standard one. Helvetica throws on a character it cannot encode. An
embedded subset font does not — it draws **nothing** and returns a structurally
valid PDF.

Measured during this command: rendering `田中太郎` through a Latin face produced
an empty page and no error of any kind.

So swapping the font, and stopping there, would have converted a loud failure
into a silent one: a recipient would receive a document with a blank signature
box, and the completion pipeline would report success. §22 and §178 both say
that outcome must not be reachable, and it is the one failure that cannot be
walked back.

`fonts.ts` therefore checks every drawn string against the face's character map
before anything is drawn, and throws `UnrenderableTextError` when a code point
has no glyph.

The error names **code points, never the text** — `U+7530`, not the value. A
field value is signer content, and §42 keeps that out of error records, which
are persisted and logged.

## Failure classification

Three new errors, and the split between them is the decision, not the naming.

| Error | Retryable | Why |
|---|---|---|
| `UnrenderableTextError` | **no** | The same value is missing the same glyph forever. Retrying burns the attempt budget that should surface a real outage. |
| `UnsupportedRepresentationError` | **no** | Undecodable bytes stay undecodable; a typed style outside 0–3 stays outside it. |
| `TypefaceUnavailableError` | **yes** | A missing font file is a broken *installation*, not a broken document. It fails identically for every document, so classifying it terminally would permanently fail every request in flight over a fault a redeploy fixes. |

That last row is the same reasoning migration 026 used to classify
`step-not-implemented` as retryable: a build that cannot do the work is not data
that cannot be completed.

## Consequences

- Philippine and international names render. OD-163 closes.
- A document that *cannot* render fails loudly and terminally, with an
  operator-readable reason that contains no signer content.
- `@pdf-lib/fontkit` joins `pdf-lib` behind the sealing boundary. The
  architecture guard was widened to exactly two named entries rather than
  loosened to a prefix match, so a package outside `@lagda/sealing` declaring
  either still fails.
- The certificate renderer was changed too. It carries every participant's name,
  so leaving it on Helvetica would have thrown on precisely the names the merged
  document had just been fixed to accept — and thrown at the *last* step, after
  the document was already rendered.
- The legacy renderer inside `seal()` was moved onto the same faces even though
  BACKEND-41 deletes it. A half-migrated Unicode story — new renderer accepts
  "Peñaflor", live renderer still throws — is worse than either end state,
  because which one is true depends on which file someone reads.

## Alternatives rejected

**Substitute a fallback glyph for missing characters.** Renders a name that is
not the person's name onto a legal document. Refusing is the honest failure.

**Ship every Noto script (CJK, Arabic, Devanagari).** Hundreds of megabytes to
support recipients the product has no other handling for — the signing UI, the
certificate layout and the evidence log are all Latin. When a real requirement
arrives it should arrive with the rest of the internationalisation work, not as
a font drop.

**Detect coverage and silently fall back to a second face.** The fallback would
have to be chosen per character, the document would mix typefaces mid-name, and
the failure it hides is exactly the one worth surfacing.
