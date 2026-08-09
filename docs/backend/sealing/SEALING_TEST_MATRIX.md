# Sealing Test Matrix

**42 tests.** 29 behavioural (`packages/sealing/src/node-document-sealer.test.ts`),
13 architectural (`tests/architecture/sealing.test.ts`).

No PDF library is mocked. A test that stubs pdf-lib and asserts it was called
passes just as happily when the output is unopenable, which is the only failure
that matters here.

## Digest

| Case | Asserts |
|---|---|
| Empty-input vector | `e3b0c442…b855`, the published SHA-256 of zero bytes |
| `"abc"` vector | `ba7816bf…15ad`, the published vector |
| Encoding | lowercase hex, exactly 64 characters |

Known-answer vectors, not self-consistency. Comparing the implementation against
itself would pass with the wrong algorithm and the wrong encoding.

## Coordinate conversion

| Case | Asserts |
|---|---|
| Mid-page rectangle | `x` unchanged; `y` inverted **and** height-adjusted, against hand-computed values |
| Field at page top | maps near the top of PDF space |
| Field at page bottom | maps to the PDF origin |

The boundary cases exist because the common bug — inverting the axis but not
subtracting the field height — is correct at zero height and wrong everywhere
else.

## Sealing behaviour

| Case | Asserts |
|---|---|
| Prepared hash | equals an independently computed digest of the caller's bytes |
| Signed hash | equals a digest of the returned bytes — §97's ordering rule |
| Output differs from input | the two digests are not equal |
| **Input not mutated** | the caller's buffer is byte-identical afterwards, and its digest still matches |
| Output re-parses | reopened as a PDF, same page count as the source |
| Certificate re-parses | opens independently, at least one page |
| Certificate not appended | sealed page count unchanged; artifacts differ |
| Verification ID | echoed, never regenerated |
| Metadata | exactly `{hash-evidence, 1, sha-256}` |
| Determinism | the same request twice yields the same digest |
| All five field types | signature, initials, text, date, checkbox all render and re-parse |
| No fields | a receive-a-copy recipient still seals and still hashes |

The mutation test matters more than it looks: pdf-lib may write through the array
it is handed, and if it did, `preparedDocumentHash` would describe bytes the
caller no longer holds — a verification failure with no visible cause.

## Failures

| Case | Expected |
|---|---|
| Page 9 of a 2-page document | `InvalidFieldPlacementError` |
| Page 0 (a 0-based caller) | `InvalidFieldPlacementError` |
| Field past the page edge | `InvalidFieldPlacementError` — rejected, not clipped |
| Zero-area field | `InvalidFieldPlacementError` |
| `NaN` geometry | `InvalidFieldPlacementError` |
| Not a PDF | `InvalidPdfError` |
| Empty input | `InvalidSealInputError` |
| Truncated PDF with valid header | a `SealingError` — magic bytes alone are not enough |
| `%PDF-1.7 garbage` | a LAGDA error type, never a pdf-lib one |
| Any malformed document | `retryable === false` |
| All error types | distinct, stable, machine-readable `code` values |

The `%PDF-1.7 garbage` case is the one that found a real defect. See
[SEALING_ARCHITECTURE.md §8](./SEALING_ARCHITECTURE.md).

## Architecture

Every rule below was verified by **deliberately violating it** and confirming the
test fails — a boundary test that cannot fail proves nothing.

| Rule | Probe |
|---|---|
| No PDF library outside `packages/sealing` | appended `import "pdf-lib";` to application → failed |
| Sealing **does** import pdf-lib | negative control; without it the check passes on a deleted sealer |
| `pdf-lib` declared only in sealing's manifest | exact-equality on the collected list |
| Seam names no PDF type | comment-stripped source |
| Seam uses `Uint8Array`, not `Buffer` | appended `export type Legacy = Buffer;` → failed |
| Seam imports only `@lagda/contracts` | exact-equality on external imports |
| `DocumentSealer` has one method | added `hashDocument` → failed |
| Application never imports `@lagda/sealing` | appended the import → failed |
| Core never imports `@lagda/sealing` | same detector |
| `DocumentSealer` declared in exactly one file | exact path equality |
| `node:crypto` used in exactly one file | exact path equality |
| Sealer reads no clock/randomness/env | comment-stripped source |

### Two detector defects the probes exposed

**The import detector missed bare imports.** It matched only `from "…"`, so
`import "pdf-lib";` — the one form with no `from` — was invisible. Two probes
passed that should have failed. Fixed, re-probed, both now fail correctly.

**A detector matched its own documentation.** The `Buffer` check flagged the
comment explaining why `Buffer` is forbidden. Comments are stripped before
identifier checks, so documenting a rule no longer violates it.

Both are the same class of error: a regex over source text answering a question
about *code* while reading *prose*, or reading only the syntax you happened to
think of.

## Lint boundaries

17 probes across every package, each asserting blocked **or** allowed:

- blocked: `react`/`vite`/`pg` in contracts; `pg`/`pdf-lib` in core; `pdf-lib`,
  `@lagda/db`, `@lagda/api`, `@lagda/worker` in application; `pg` and
  `@lagda/db` in sealing; `pdf-lib` in db, api and cross-cutting tests
- **allowed (negative controls):** `pdf-lib` in sealing, `pg` in db,
  `@lagda/db` in api

All 17 behave correctly. Four of them did not before this command — see
[ENFORCEMENT_MATRIX.md](../ENFORCEMENT_MATRIX.md).

## Not covered

- **No integration test needs a database.** Sealing touches none.
- **No visual verification.** Nothing asserts a signature *looks* right, only
  that its rectangle is computed correctly. A rendering regression inside pdf-lib
  would not be caught here.
- **No large-document performance test.** Memory behaviour on very large PDFs is
  a recorded limitation, not a measured one.
- **No encrypted-PDF fixture.** `UnsupportedPdfError` is reachable by code
  inspection but is not exercised by a test, because generating an encrypted PDF
  requires a capability pdf-lib does not provide. Stated rather than implied by
  the table above.
