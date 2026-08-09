# Sealing Foundation Report — BACKEND-09

## 1. What was built

| Artifact | Location |
|---|---|
| The port | `packages/application/src/common/ports/sealing.ts` |
| The implementation | `packages/sealing/src/node-document-sealer.ts` |
| Digesting | `packages/sealing/src/internal/digest.ts` |
| Field rendering + coordinate flip | `packages/sealing/src/internal/fields.ts` |
| Completion certificate | `packages/sealing/src/internal/certificate.ts` |
| Error taxonomy | `packages/sealing/src/errors/index.ts` |
| Behavioural tests (29) | `packages/sealing/src/node-document-sealer.test.ts` |
| Architecture tests (13) | `tests/architecture/sealing.test.ts` |

`pdf-lib ^1.17.1` installed into `@lagda/sealing` only. 0 vulnerabilities.

## 2. The decisions that were not guesses

Four things this command needed were **found**, not assumed:

**No crypto is required.** `grep -ciE "pades|pkcs|x\.509|x509|hsm|pnpki|rfc 3161"`
over the backend integration handoff returns **0**. The fifteen matches elsewhere
in `docs/` are all documents written during this backend effort, each saying no
PAdES is required. Recorded as ADR-005.

**Coordinates are documented.** `src/app/models/field-editor.ts` states the
origin is top-left with normalized 0–1 values on an A4 page. PDF's origin is
bottom-left, so a Y-flip is required — documentable rather than guesswork.

**The certificate is separate.** Handoff §15 stores "original PDF + signed PDF +
completion certificate + evidence log" — four artifacts. So it is not appended.

**The verification ID is the application's.** Handoff §15 specifies
`LAGDA-{workspace}-{date}-{random}`. It contains randomness and belongs to
LAGDA's namespace, so the application generates it and passes it in.

## 3. Defects found and fixed

### 3.1 A permanent failure was classified as retryable

pdf-lib's loader is tolerant: `%PDF-1.7` followed by garbage parses into a
document with no page tree, and `throwOnInvalidObject: true` does not change
that. The failure surfaced much later, during font embedding, as a generic
`PdfProcessingError` — marked **retryable**.

A corrupt upload would have been retried indefinitely, failing identically every
time.

Fixed by verifying the page tree immediately after load. The page-count read is
itself guarded, because on such a document `getPageCount()` throws a raw
`TypeError` from inside pdf-lib — an unguarded call there leaked a library error
through the seam, exactly what INV-008 forbids.

### 3.2 Four lint rules were silently dead

`no-restricted-imports` is **last-wins per file**, not additive. The config had
overlapping blocks, so the last one matching a package replaced every earlier
one. Probing found:

- `@lagda/contracts` could import `react` and `vite`
- `@lagda/application` could import `@lagda/api` and `@lagda/worker`
- `@lagda/sealing` was **forbidden** from importing `pdf-lib` — and told
  "Database access belongs in `@lagda/db`" when it tried

The last one was invisible because the package had no source files until now.

Fixed by giving each package exactly one rule built from groups that keep their
own messages. Verified with 17 probes — 14 must-block, 3 negative controls. All
correct.

The enforcement matrix previously recorded a related symptom as a harmless
"known imprecision", reasoning about the config rather than executing it. That
entry is now corrected in place.

### 3.3 The import detector missed bare imports

The architecture test's regex matched only `from "…"`. `import "pdf-lib";` — the
one form with no `from` — was invisible, and two probes passed that should have
failed. Fixed and re-probed.

### 3.4 A detector matched its own documentation

The `Buffer` check flagged the comment explaining why `Buffer` is forbidden.
Comments are now stripped before identifier checks.

### 3.5 A missing database was reported as a test failure

`contract.integration.test.ts` registered its suite inside a bare `if`, so a
machine without a database registered no suite at all — and Vitest fails a file
containing no tests. The gate reported a hard failure indistinguishable from
broken code. Changed to `describe.skipIf`, matching the other two integration
files.

## 4. Gate results

| Gate | Result |
|---|---|
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm test` | **198 passed**, 11 files |
| `npm run test:integration` | **47 skipped, 0 failed** — no database credentials available this session |
| Architecture probes | 4/4 fire, baseline clean |
| Lint probes | 17/17 correct, including 3 negative controls |

**The integration suite was not executed.** PostgreSQL 16 is running locally, but
no `DATABASE_TEST_URL` is set and I do not have the credentials; I did not guess
passwords. BACKEND-09 adds no database code, so nothing here should affect it —
but the `describe.skipIf` change in §3.5 touches how that suite registers, and
that change has only been verified in the skipped path.

To verify:
```bash
DATABASE_TEST_URL=postgresql://USER:PASSWORD@localhost:5432/lagda_test \
  npm run test:integration
```

## 5. Risks

**R-1 — `Sha256Digest` is unbranded.** `preparedDocumentHash` and
`signedDocumentHash` are mutually assignable, so swapping them compiles. The
tests defend the ordering by computing each digest independently. OD-022.

**R-2 — No visual verification.** Nothing asserts a signature *looks* right, only
that its rectangle is computed correctly. A rendering regression inside pdf-lib
would not be caught.

**R-3 — `UnsupportedPdfError` is untested.** Reachable by inspection, but
generating an encrypted PDF requires a capability pdf-lib does not provide.

**R-4 — Memory, unmeasured.** Documents are held in memory, twice during sealing.
No limit is enforced and no measurement exists. OD-024.

**R-5 — Still no consumer.** `DocumentSealer` has no caller and will not until
BACKEND-38. That remains correct, but it means the seam's ergonomics are
unproven against a real use case.

**R-6 — Certificate content is a projection.** It carries names, actions and
timestamps, deliberately not IP addresses or device data, since it ships to every
participant. If a legal review later requires more, the certificate changes and
`sealVersion` increments.

## 6. Handoff — BACKEND-10

Sealing is complete as a capability and wired to nothing.

`DocumentSealer` is the only sealing surface; INV-070–083 govern it. Nothing may
import a PDF library outside `packages/sealing`, hash outside
`internal/digest.ts`, or invoke sealing inside a database transaction.

When evidence work begins: the certificate is a **projection** of the evidence
record, not the record. The evidence log is the authority; the certificate is
what participants receive. Changing what the certificate shows is a
`sealVersion` change.

`verificationId` is generated by the application in the format
`LAGDA-{workspace}-{date}-{random}` and passed into sealing. Verification lookup
(BACKEND-42) resolves that ID to the artifacts and their digests — and it is
**unauthenticated**, so it must expose nothing beyond what the certificate
already shows to every participant.
