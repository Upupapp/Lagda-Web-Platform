# Upload Foundation Report — BACKEND-18

## What was built

The boundary where an untrusted browser file becomes a trusted, immutable LAGDA
artifact.

```
receive (bounded) → quarantine → hash → inspect → SCAN → promote → commit → cleanup
```

| Piece | Package | New? |
|---|---|---|
| `MalwareScanner`, `DocumentInspector`, upload ports, pipeline | `@lagda/application` | yes |
| ClamAV `INSTREAM` adapter | `@lagda/scanning` | **new package** |
| PDF inspection | `@lagda/sealing` | yes — pdf-lib already lived there |
| Multipart adapter + test route | `@lagda/api` | yes |
| `document_uploads` table + repository | `@lagda/db` | migration 007 |

## The scanner is real

A genuine ClamAV 1.4.2 daemon runs in the integration suite, speaking the real
`INSTREAM` protocol over a socket, with the published EICAR test pattern in a
minimal signature database. No mock, no allow-all fake, and no
`AllowAllMalwareScanner` anywhere in the tree.

The most important test in the command: a **structurally valid PDF containing
the EICAR pattern**. It passes inspection completely and is caught only by the
scanner — which is the proof that inspection and scanning are genuinely separate
controls rather than one dressed as two.

## Numbers

- **19 pipeline unit tests + 9 multipart route tests + 20 integration tests**
- **472 unit tests overall**, all passing
- **9 security probes**, every one catching
- **3 new dependencies**: `@fastify/multipart`, `file-type`, and no scanner
  client (the protocol is implemented directly)
- **1 migration**, applied from zero

## Defects found

**`isAvailable()` reported a healthy scanner as down.** The check compared
`reply.trim() === "PONG"`, and clamd terminates its reply with a NUL, which
`trim()` does not strip. It failed closed, so nothing unsafe happened — it would
simply have disabled every upload while looking like a scanner outage.

**A second uploaded file was reported as "file too large".** The multipart
plugin's `files: 1` limit fires before LAGDA's own check, and its error was
mapped to 413. A user with two files would have been told to shrink one.
Now `422 TOO_MANY_FILES`.

**`request.file()` silently ignored extra files.** It returns the first file and
never sees the rest. The route now iterates every part.

**`@lagda/storage`'s index re-exported a test suite that imports `vitest`** — so
importing the storage package pulled a test framework into production. Introduced
in BACKEND-17, found here when a plain Node script failed to load it.

## Three tests that proved nothing until probed

- The **malformed-PDF** test was caught by the page-tree check, so the parser's
  own rejection branch was covered by nothing. A truncated real PDF now covers
  it.
- The **multiple-files** test asserted `status >= 400`, so it passed when the
  plugin rejected for a different reason than LAGDA's check. Tightening it is
  what revealed the wrong 413 above.
- The **zero-page PDF** fixture produced a **one-page** file, because pdf-lib
  adds a default page when saving an empty document. `buildTestPdf` now refuses
  `pages < 1` instead of quietly lying.

## Decisions worth naming

**Quarantine-first, synchronously.** Justified in ADR-013 against three
alternatives, including direct-to-bucket uploads and scan-after-acceptance.

**Stream-and-re-put promotion**, not server-side copy — so the accepted
artifact's digest is verified against the bytes actually written, and no generic
"copy any key" capability has to exist.

**PDF inspection in `@lagda/sealing`.** A second PDF parser elsewhere would mean
two libraries with the same CVE surface and would turn INV-001 into a rule with
an exception.

**A new `@lagda/scanning` package**, so ClamAV is confined the way pg, pdf-lib
and the AWS SDK already are.

## What does NOT exist

- **No product route.** `POST /documents` is P0-16, owned by BACKEND-29. The
  route here is test-only, and session/CSRF/rate-limit hooks are not attached to
  it.
- **No document model.** `documentId` is supplied by the caller; no `documents`
  table was invented.
- **No logging or metrics in the upload path.** Classification and catalogues are
  written; the statements belong with the product route.
- **No sanitization of active PDF content** (OD-059) — stated plainly rather
  than implied.
- **No registered cleanup schedule** (OD-062) — primitive built and tested.
- **No streaming.** The file is buffered under a hard bound (OD-058).
- **No document workflow, preparation, recipients, signing or downloads.**

## eNotary

Untouched. No upload path, artifact type or rejection reason references it.
LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and
applicable rules.

## Reading order

1. **ADR-013** — why quarantine-first, and what was rejected
2. **UPLOAD_ARCHITECTURE.md** — the lifecycle, trust boundary, buffering
3. **FILE_ACCEPTANCE_POLICY.md** — what is accepted, limits, sanitization status
4. **MALWARE_SCANNING.md** — the port, fail-closed rules, deployment obligations
5. **UPLOAD_CONSISTENCY.md** — every failure window, explicitly
6. **UPLOAD_DATA_CLASSIFICATION.md** — what may be stored, logged, returned
7. **UPLOAD_TEST_MATRIX.md** — what is proven, and what is not
