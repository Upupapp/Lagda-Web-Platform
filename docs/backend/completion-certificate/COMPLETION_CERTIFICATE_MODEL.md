# CompletionCertificateModelV1

**Command:** BACKEND-40
**Code:** `packages/application/src/common/ports/completion-certificate.ts`

The curated projection the renderer receives — a deliberate selection, not a
view over the evidence store. Generic evidence carries user agents, internal
identifiers and security events that must not reach a page which gets forwarded
to third parties.

## Shape

```ts
CompletionCertificateModelV1 {
  certificateVersion: "completion-certificate-v1"
  signingRequestId: string          // provenance; not rendered
  documentTitle: string             // frozen at send
  sourceDocumentDigest: Sha256Digest
  participants: CertifiedParticipantV1[]    // >= 1
  generatedAt: number
}

CertifiedParticipantV1 {
  recipientId: string               // ordering + provenance; not rendered
  name: string                      // immutable snapshot
  maskedEmail: string               // masked in the BUILDER, never the renderer
  routingOrder: number
  orderIndex: number
  authenticationMethod: "link-only" | "email-otp"
  firstEnteredAt: number | null     // ceremony ENTRY, not "read"
  consent: { consentType, consentVersion, acceptedAt } | null
  signedAt: number                  // REQUIRED
}
```

## Required vs optional, and why the line is where it is

`signedAt` is REQUIRED and not nullable. A participant reaches this model by
having an accepted submission, so a missing signing time means the submission
row is corrupt — not that the person has not signed yet.

`firstEnteredAt` and `consent` are optional because they are optional in the
product: not every recipient is asked for consent, and ceremony progress may not
have been recorded. They render as ABSENCES, never as "Unknown" or "N/A" (§78).

`consent` is **all-or-nothing**. Partial consent fails the build: certifying
"consented" without saying to what or when is an overclaim.

## Why masking lives in the model

`maskedEmail` is produced by the builder, so the renderer never holds a full
address. A future layout change therefore cannot print one by accident — the
value simply is not there.

The mask keeps the first character (only when the local part is longer than
one), a FIXED three asterisks so the hidden length does not leak, and the full
domain. A malformed address masks entirely.

## What the type deliberately cannot express

No `completedAt`, no seal metadata, no verification id, no merged digest, no
certificate self-digest, no IP, no user agent, no device data, no signature
representation, no field values.

**This is the primary enforcement.** The renderer cannot draw a field the model
does not carry — a stronger guarantee than any string search over the output,
and a necessary one, because certificate text is not byte-searchable: the
embedded font encodes glyph indices into a compressed stream.

## Fail-closed reasons

The builder throws `CertificateFactMissingError` with a bounded reason and never
the offending value (§42 — these messages are logged):

`no-signed-participants` · `missing-signed-at` ·
`unsupported-authentication-method` · `incomplete-consent` ·
`missing-document-title` · `missing-source-digest`
