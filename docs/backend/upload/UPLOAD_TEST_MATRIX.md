# Upload Test Matrix — BACKEND-18

**19 pipeline unit tests + 9 multipart route tests + 20 integration tests
against real PostgreSQL, real MinIO and a real ClamAV daemon.**

## Authentication and request order

| Case | Result |
|---|---|
| Unauthorized caller refused | **PASS** |
| **Refused before any byte is quarantined or scanned** | **PASS** |
| Workspace comes from session context, not the body | **PASS** |
| A `workspaceId` form field is ignored entirely | **PASS** |
| Session / CSRF / rate limit hooks wired to this route | **N/A — test-only route; BACKEND-29 owns the product route** |

## Multipart

| Case | Result |
|---|---|
| One valid file accepted | **PASS** |
| Missing file rejected (422) | **PASS** |
| **Second file refused with `TOO_MANY_FILES` (422)** | **PASS** |
| Abusive field count rejected | **PASS** |
| Oversized body rejected (413) | **PASS** |
| JSON to a multipart endpoint → 415 | **PASS** |
| Response carries no bucket, key, or scanner detail | **PASS** |

## Size and shape

| Case | Result |
|---|---|
| Within limit accepted | **PASS** |
| Oversized stream rejected, nothing written | **PASS** |
| **Oversized stream abandoned, not drained** | **PASS** |
| Zero-byte file rejected | **PASS** |

## Content validation, against a real parser

| Case | Result |
|---|---|
| Real multi-page PDF accepted, page count and sizes returned | **PASS** |
| HTML named `document.pdf` rejected | **PASS** |
| ZIP/DOCX declared `application/pdf` rejected | **PASS** |
| PDF header + garbage body rejected | **PASS** |
| **Truncated real PDF rejected (parser path)** | **PASS** |
| **Valid PDF with zero pages rejected (page-tree path)** | **PASS** |
| Encrypted PDF rejected explicitly | **PASS** |
| Page ceiling enforced | **PASS** |
| Client media type recorded but not trusted | **PASS** |

## Hashing

| Case | Result |
|---|---|
| SHA-256 computed by the backend from exact bytes | **PASS** |
| **Identical digest across 1-byte, 7-byte, 1 KiB and whole-file chunking** | **PASS** |
| Digest survives promotion | **PASS** |
| Stored bytes still hash to the recorded digest | **PASS** |

## Malware, against real ClamAV

| Case | Result |
|---|---|
| Clean file accepted | **PASS** |
| EICAR rejected | **PASS** |
| **EICAR inside a structurally valid PDF rejected — scanner, not parser** | **PASS** |
| Scanner unreachable → refused, fails closed | **PASS** |
| File beyond the scanner's limit → refused, not skipped | **PASS** |
| Health true when live, false when down | **PASS** |
| Accepted object never written when scan is not clean | **PASS** |
| `infected` and `unavailable` distinguished | **PASS** |

## Quarantine and promotion

| Case | Result |
|---|---|
| **Quarantine written before anything else** | **PASS** |
| Inspection before scan, scan before promotion, promotion before commit | **PASS** |
| Quarantine deleted after acceptance | **PASS** |
| Digest re-verified during promotion | **PASS** |
| **Tampered quarantine bytes refuse promotion** | **PASS** |

## Consistency, by failure injection

| Case | Result |
|---|---|
| Accepted-object write fails → no artifact, quarantine kept | **PASS** |
| **Acceptance transaction fails → no artifact, orphan object left private** | **PASS** |
| Quarantine cleanup fails → upload still accepted | **PASS** |
| Cleanup driven by rows, safe to run twice | **PASS** |
| In-flight upload not offered to cleanup | **PASS** |
| DB refuses `accepted` with no artifact | **PASS** |
| DB refuses `rejected` with no reason | **PASS** |

## Tenancy

| Case | Result |
|---|---|
| Workspace B cannot read A's upload row | **PASS** |
| Workspace B cannot read A's artifact | **PASS** |
| Filename never appears in a storage key | **PASS** |
| Filename traversal normalized to metadata | **PASS** |

## Probes — every guarantee verified by breaking it

| Violation | Tests failing |
|---|---|
| Scanner failure treated as clean (fail open) | **4** |
| Untrusted bytes written to the artifact zone first | **13** |
| Trust the client media type instead of detection | **3** |
| Accept unparseable PDFs | **1** |
| Accept a PDF with no pages | **1** |
| Accept encrypted PDFs | **1** |
| Skip digest re-verification during promotion | **1** |
| Scanner health fails open on connection error | **1** |
| Misreport extra files as file-too-large | **1** |
| Baseline (all reverted) | **0** |

Three probes initially caught nothing, and each exposed a **weak test rather
than weak code**:

- *Accept malformed PDFs* — the mutation targeted the parser's failure branch,
  but the fixture was caught by the page-tree check instead. A truncated real
  PDF now exercises the parser path, and a hand-built zero-page PDF exercises
  the other.
- *Silently ignore a second file* — the test asserted only `status >= 400`, so it
  passed when the plugin's file limit fired instead of LAGDA's check. Tightened
  to the exact code, which then revealed the plugin reports a **count** problem
  as `413 file too large`. Fixed to `422 TOO_MANY_FILES`.
- *Zero-page PDF* — `buildTestPdf(0)` produced a **one-page** file, because
  pdf-lib adds a default page when saving an empty document. The helper now
  refuses `pages < 1` rather than quietly lying.

## Import boundaries

| Case | Enforced |
|---|---|
| ClamAV clients only in `packages/scanning` | **ESLint** |
| Multipart only in `packages/api` | **ESLint** |
| `file-type` only in `packages/sealing` | **ESLint** |
| pdf-lib only in `packages/sealing` (INV-001, unchanged) | **ESLint** |
| AWS SDK only in `packages/storage` (INV-203, unchanged) | **ESLint** |

The pdf-lib ban caught a real violation during this command: the integration
test imported pdf-lib to build fixtures. Fixed by moving the fixture builders
into `@lagda/sealing` rather than widening the rule.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` (unit) | **PASS — 472** |
| `npm run test:integration` | **PASS** |
| Migration from zero | **PASS — 7 migrations** |

## Not covered

- **No client-disconnect test.** `app.inject()` cannot simulate a mid-upload TCP
  reset faithfully; a flaky network test would be worse than an honest gap.
  Stream abort is covered structurally by the bounded reader test.
- **No streaming-memory test**, because the pipeline **does not stream** — it
  buffers under a hard bound, which is stated rather than tested around (OD-058).
- **No rate-limit / CSRF / session test on this route**, because it is test-only
  and those hooks belong to the product route (BACKEND-29).
- **No worker cleanup job test**, because the recurring job is not registered —
  only its repository primitive, which is tested.
- **No full-corpus AV signature test.** The scanner runs with a minimal EICAR
  database; signature coverage is a deployment property (OD-060).
