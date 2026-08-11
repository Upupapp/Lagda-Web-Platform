# Final document sealing — product inventory

**Command:** BACKEND-41 §0 · **Date:** 2026-08-11
**Method:** read the schema, the sealer, and the LAGDA frontend as they stand.
No compliance or cryptographic capability inferred.

## The finding BACKEND-41 must not walk into

**`SealRecord.originalDocumentHash` means something the pipeline no longer
produces, and nothing has written it yet — so the mistake is still available.**

The field is documented in `evidence.ts` as:

> `/** Handoff §17's 'documentHash' — the original file at upload. */`

and it persists to `document_seals.original_document_hash`, which feeds
`verification_records` and therefore BACKEND-42's public verification.

Meanwhile `SealResult.preparedDocumentHash` — the obvious thing to wire into it,
by name and by position — is **no longer the original file's digest**. OD-162
removed field merging from `seal()`, so its `preparedDocument` input now carries
the **merged candidate**, and BACKEND-39 deliberately kept the *result field's*
name because `preparedDocumentHash` was a published digest name.

So the naive wiring:

```
sealResult.preparedDocumentHash  ->  seal.originalDocumentHash
```

persists the **merged candidate's** digest into a column meaning **the original
uploaded file**, permanently, in the record a public verifier will read.

`recordFinalization` currently has **no caller**. This is latent, not live —
which is exactly why it belongs in the §0 inventory rather than a bug report.

**Correct wiring for BACKEND-41:** `originalDocumentHash` must come from the
request's frozen `sourceArtifactId` artifact row, which is available and is
genuinely the original. `signedDocumentHash` is the final sealed bytes.

This is the third appearance of one defect class — a digest whose *label*
stopped matching its *contents* when OD-162 moved what `seal()` receives.
BACKEND-40 found it on the certificate's visible label; this is the persisted
one.

## What already exists — most of the schema does

| Table | Status |
|---|---|
| `document_seals` | **EXISTS** (migration 003): `seal_id`, `sealed_artifact_id`, `certificate_artifact_id`, `seal_scheme`, `seal_version`, `digest_algorithm`, `original_document_hash`, `signed_document_hash`, `sealed_at` |
| `verification_records` | **EXISTS**: `verification_id`, `seal_id`, `completed_at`, `participant_count` |
| `signing_request_completions` | **EXISTS** (BACKEND-38): `completion_run_id`, `final_artifact_id`, `certificate_artifact_id`, `completed_at`, `seal_scheme`, `seal_version`, `digest_algorithm`, `pipeline_version` |

**Missing, and needing a migration:**

- **`completed` is NOT in the request state CHECK.** Measured: the constraint
  admits `draft`, `sent`, `partially-completed`, `completion-ready`, `declined`,
  `cancelled` — and deliberately not `completed` (migration 025's recorded
  decision: the value arrives with the code that earns it).
- **`signing_requests` has no `completed_at` column.**
- **`signing_request_completions` has no `merged_artifact_id`** — §131 wants the
  merged relation in provenance, and today only `certificate_artifact_id` and
  `final_artifact_id` exist.

## Product language

| Signal | Finding |
|---|---|
| `completed` as a state | **REAL.** `dashboard.ts` counts `completed` alongside `partially-completed` |
| Verification | **REAL as a capability.** `auth.ts:186` — `"verify-documents": "Verify completed documents"` |
| Download | **NOT FUNCTIONAL.** `DocumentsPage.tsx:1748`: "This preview does not generate, download, or deliver any files." A `Download` icon is imported in `TransactionDetailPage` but no working download exists |
| PKI / PAdES / TSA / HSM | **ABSENT.** No occurrence anywhere in the product |

So the product expects a completed state and anticipates verification, but has
no working final-document download. §156's "if current sender UX immediately
needs download" is therefore **not** satisfied — there is no UX to satisfy.

## Classification

### Composition and output

| Item | Class | Basis |
|---|---|---|
| MERGED + CERTIFICATE COMPOSITION | **IMPLEMENT_NOW** | §17/§20 prefer it, and both inputs exist as accepted artifacts |
| CERTIFICATE EMBED (append pages) | **IMPLEMENT_NOW** | §18: signed pages first, certificate last. One downloadable file that carries its own completion record |
| FINAL DOCUMENT ARTIFACT | **IMPLEMENT_NOW** | The authoritative completed document |
| FINAL SHA-256 | **IMPLEMENT_NOW** | Over the exact stored bytes |
| SEAL SCHEME | **IMPLEMENT_NOW** | `hash-evidence` — the existing constant. Not renamed |
| SEAL VERSION | **IMPLEMENT_NOW** | `1` — existing |
| COMPLETED STATE | **IMPLEMENT_NOW** | Migration required; the product counts it |
| COMPLETED AT | **IMPLEMENT_NOW** | Migration required; finalization-transaction time |

### Verification

| Item | Class | Basis |
|---|---|---|
| VERIFICATION ID | **IMPLEMENT_NOW** | `verification_records` exists and `SealRequest` already takes a `verificationId`. One per request, generated before sealing, reused on retry (§61–§63) |
| PUBLIC VERIFICATION | **DEFER** | BACKEND-42 (§58) |
| QR CODE | **NOT_IN_PRODUCT** | §64 needs an actual product requirement; none exists. Also avoids the ordering problem entirely |
| SEAL VISUAL MARK | **DEFER** | No approved design. §66 requires documented meaning, and inventing one risks implying PKI |

### Cryptographic scope — all absent, all must stay absent

| Item | Class | Basis |
|---|---|---|
| CRYPTOGRAPHIC PDF SIGNATURE | **NOT_IN_PRODUCT** | Not implemented. The seal is hash/evidence |
| PAdES | **NOT_IN_PRODUCT** | §29 |
| PNPKI | **NOT_IN_PRODUCT** | §30 |
| RFC3161 TSA | **NOT_IN_PRODUCT** | §31. Backend timestamps are not TSA tokens |
| HSM | **NOT_IN_PRODUCT** | §32 |

### Download

| Item | Class | Basis |
|---|---|---|
| FINAL DOCUMENT DOWNLOAD | **DEFER** | §156 conditions it on current UX needing it. The product explicitly disclaims generating or delivering files. Building an unused download path now would be a foundation without callers |

## Two more things worth recording before implementation

**`SealRequest` has no certificate input.** After OD-167 it carries
`preparedDocument`, `verificationId`, `sealedAt` and the identifiers — nothing
for the certificate. §21 asks where composition lives; since the seam must stay
library-neutral (§22) and low-level page appending must not escape the sealing
package (§21), composition belongs **inside `@lagda/sealing`**, with
`SealRequest` gaining a semantic `completionCertificate` byte input rather than
an `appendPages()` API.

**`SealResult.preparedDocumentHash` is now misnamed at the type level.** It is
the merged candidate's digest. BACKEND-41 should rename it to say so — the
reason for keeping it in OD-162 was that it was published, and BACKEND-41 is the
command that first publishes it, so this is the last moment renaming is free.

## What this inventory obliges BACKEND-41 to do

1. Wire `originalDocumentHash` from the **frozen source artifact**, never from
   `preparedDocumentHash`.
2. Rename `preparedDocumentHash` to reflect that it is the merged candidate.
3. Migrate: `completed` into the state CHECK, `completed_at` onto
   `signing_requests`, and `merged_artifact_id` onto the completion record.
4. Compose merged + certificate inside the sealing package; extend `SealRequest`
   semantically, not with a page-level API.
5. Generate the verification id **before** sealing, one per run, reused on retry.
6. Claim nothing about PAdES, PKI, TSA or HSM — none exists.
7. Build no download path: the product has no UX for one.
