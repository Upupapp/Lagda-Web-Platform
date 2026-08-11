# BACKEND-40 — completion certificate report

**Date:** 2026-08-11 · **Backend:** `abc0bd7` · **Docs:** this commit
**Status:** complete. BACKEND-41 unblocked.

## What was built

A `certificate` step in the CompletionRun that reads authoritative immutable
facts, builds a curated versioned model, renders it through a controlled server
renderer, and persists it as an immutable `completion-certificate` artifact.

```
immutable snapshots + accepted submissions + ceremony/consent facts
  -> CompletionCertificateModelV1   (curated, versioned, fails closed)
  -> CompletionCertificateGenerator (server renderer, vendored fonts)
  -> completion-certificate artifact (new id, private, SHA-256, size)
  -> CERTIFICATE step accepted
```

## The §0 inventory changed the command

LAGDA's product has **no completion certificate**, and the word "certificate"
appears in the frontend only inside disclaimers — `CompletionPage.tsx:5` and
`TransactionDetailPage.tsx:674`. There is no download, tab or status anywhere.

That settled three things on facts rather than taste: the wording must be
conservative (§164 has only negative approved terminology to work from), the
disclaimer must be the product's own approved copy (§97), and every field
justified only by "certificates usually show this" is DEFER or NOT_IN_PRODUCT.

## Four defects fixed in the renderer that already existed

`packages/sealing/src/internal/certificate.ts` was called from inside `seal()`.

| Printed | Why it was wrong |
|---|---|
| "Completed" | The request is `completion-ready`; `completed` is not admitted by the request CHECK until BACKEND-41 |
| "Sealed" | Nothing is sealed at this point |
| "Verification ID" | BACKEND-41/42 own verification identity |
| "Prepared document SHA-256" | Names an artifact kind LAGDA has NEVER produced — and after OD-162 it printed the MERGED digest under that label |

The first three were honest while the certificate lived inside `seal()`, where
those facts existed. Lifting it into its own step is what makes them unsayable.

The fourth was half BACKEND-39's own doing: `preparedDocumentHash` was
deliberately kept as a published digest NAME, but the human-visible LABEL was
not revisited when the input changed meaning.

## Decisions taken (owner-confirmed)

- **Recipient email: MASKED** — `j***@example.com`, fixed-width mask, full
  domain. The name identifies the signer; a certificate is the artifact most
  likely to be forwarded onward. Full value stays in the immutable snapshot.
- **Merged digest: internal provenance only** — two similar hashes on one page
  invite comparing the wrong one.
- **Title: "Certificate of Completion"** — descriptive, asserts no legal
  standing.
- **OD-167 closed** — `seal()` no longer renders a certificate either.

## Three findings worth keeping

**A retryability bug the tests caught.** The renderer re-threw only
`UnsupportedRepresentationError`, so `UnrenderableTextError` — raised by the
coverage guard inside the same `try` — became `PdfProcessingError`, which is
RETRYABLE. The pipeline would have retried a signer name that can never render,
forever.

**Certificate text is not byte-searchable.** Measured: searching output for
"Certificate of Completion", a string definitely drawn, finds nothing, because
the embedded font encodes glyph indices into a compressed stream. Every
`expect(bytes).not.toContain("Sealed")` would pass vacuously. Absences are
asserted against the model and against a renderer source scan — whose positive
control immediately caught its own regex bug (`[^"\\]` matches newlines, so it
swallowed whole code blocks as single "strings").

**Two schema facts learned by running.**
`signing_recipient_consents_type_check` admits exactly one value, so the
certificate's consent TYPE is effectively constant and the VERSION carries the
information. And `recipient_signing_sessions.source_grant_id` has an FK chain,
so the session row was dropped from the fixture and the test renamed to match
what it actually proves.

## Verification

| Gate | Result |
|---|---|
| typecheck | **PASS** |
| lint | **PASS** 0 errors / 0 warnings |
| unit | **PASS** 2176 |
| build | **PASS** |
| integration | **PASS** 632 / 49 skipped |
| certificate model + builder | **PASS** 32 |
| renderer + generator | **PASS** 36 |
| certified-facts query (real PostgreSQL) | **PASS** 11 |
| architecture / boundary guards | **PASS** |
| migration suite | **N/A** — no schema change needed |

No migration was required: the `completion-certificate` artifact kind and the
CERTIFICATE step already existed in the BACKEND-38/39 schema.

## Dependencies added

**None.** No second PDF library, no QR library, no headless browser, no external
certificate service. The vendored Noto Sans faces and `@pdf-lib/fontkit` from
BACKEND-39 are reused.

## Boundary confirmation

- **DocumentSealer: NOT CALLED**
- **SigningRequest COMPLETED: NOT SET**
- **Public verification: NOT IMPLEMENTED**
- **Notifications: NONE**
- No submission, field value, recipient state or routing was modified.

## BACKEND-41 handoff

One CompletionRun now yields two immutable artifacts:

| Artifact | Kind | Carries |
|---|---|---|
| merged signed candidate | `merged-candidate` | digest, size, source provenance |
| completion certificate | `completion-certificate` | digest, size, `certificateVersion`, `rendererVersion` |

BACKEND-41 must consume both accepted step outputs by identity, regenerate
neither, compose them, invoke `DocumentSealer` exactly once through the
established seam, persist a new immutable final artifact with its own digest,
and only then transition the request to `completed` with its own
backend-authoritative `completedAt`.

It must not claim PAdES, X.509, PNPKI, TSA or HSM semantics; the seal remains
the accurately described hash/evidence seal.

**Readiness: READY.**

## Still open

Genuine future questions only — see `OPEN_DECISIONS.md`: final composition
model, verification ID and QR placement, final digest display, `completedAt`
presentation, public certificate download authorization, the relationship to
BACKEND-43's audit trail, and signer-timezone capture (OD-166's real fix).
