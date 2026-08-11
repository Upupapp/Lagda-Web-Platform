# Completion certificate — product inventory

**Command:** BACKEND-40 §0 · **Date:** 2026-08-11
**Method:** read the LAGDA frontend and the backend as they stand; classify only
what the product actually has. No terminology imported from DocuSign, Adobe
Sign or Dropbox Sign.

## The finding that shapes everything else

**LAGDA's product contains no completion certificate, and the word
"certificate" appears in it exclusively inside disclaimers.**

Two occurrences, and both are denials:

| Where | Copy |
|---|---|
| `src/app/pages/recipient/CompletionPage.tsx:5` | "No verification certificate, no 'court-admissible' claims, no 'blockchain' claims." |
| `src/app/pages/platform/documents/TransactionDetailPage.tsx:674` | "It does not constitute a legal certificate or court-admissible document." |

There is **no certificate download**, no certificate tab, no certificate status
and no certificate link anywhere in the sender or recipient UI. The recipient
completion screen explicitly routes people to the sender instead:

> "In a live production system, a signed completion record would be provided by
> the sending workspace… Contact the sender directly if you require a copy of
> this document."

The certificate is therefore a **backend architectural artifact**, not a product
feature. Handoff §15 stores "original PDF + signed PDF + completion certificate"
as three things, and BACKEND-41 needs the third to compose. That is the whole of
its current justification.

**Consequences for BACKEND-40, and they are the binding ones:**

1. §164 says use approved product terminology. The only approved terminology is
   negative. So the certificate must be **conservatively worded** — it may
   describe what LAGDA recorded and must not present itself as an instrument.
2. §97 says do not invent legal disclaimer language and use existing approved
   copy. LAGDA has approved copy, and it is a **disclaimer of exactly this kind
   of document**. It belongs on the certificate essentially verbatim.
3. Every field whose only justification would be "certificates usually show
   this" is `DEFER` or `NOT_IN_PRODUCT`. There is no product asking for it.

## Four defects in the certificate renderer that already exists

As in BACKEND-39, this is not a blank sheet.
`packages/sealing/src/internal/certificate.ts` renders a certificate today, and
`DocumentSealer.seal()` calls it. Its current output violates four BACKEND-40
rules.

### 1. It prints a hash under a label that is now WRONG — and I caused it

It renders **"Prepared document SHA-256"**, taking
`SealResult.preparedDocumentHash`.

Two things are wrong with that label:

- **There has never been a "prepared document" artifact.** BACKEND-30 made
  preparation metadata-only — no prepared PDF is ever produced. The label names
  an artifact kind that does not exist.
- **After OD-162 it is actively misleading.** `seal()` no longer merges fields;
  its `preparedDocument` input now carries the **merged candidate**. So the
  field labelled "Prepared document SHA-256" today prints the digest of the
  merged signing candidate. The field name was deliberately kept because
  `preparedDocumentHash` is a published digest name — but the human-visible
  LABEL was not revisited, and it should have been.

This is a regression introduced by BACKEND-39's own change, found by this
inventory. §92 requires accurate wording precisely here.

### 2. It prints "Completed" — §165 forbids it

The certificate renders a `Completed` timestamp. At certificate time the request
is `completion-ready`, **not** `completed`; `completed` is not even admitted by
the request CHECK until BACKEND-41 adds it. §165 and §268 both forbid stating
completion before it is true, and §204 requires a test asserting its absence.

### 3. It prints "Sealed" — §163 forbids it

The certificate renders a `Sealed` line. At BACKEND-40 nothing has been sealed;
seal metadata does not exist until BACKEND-41. §163 and §203 forbid the claim.

(Both 2 and 3 are artefacts of the certificate having been born *inside*
`seal()`, where those facts genuinely did exist. Lifted out into its own step,
it can no longer honestly say either.)

### 4. It prints a Verification ID that BACKEND-40 cannot have

§15 assigns verification identity to BACKEND-41/42 and forbids competing IDs.
Today the id is supplied by `seal()`'s caller. A standalone CERTIFICATE step has
no verification identity to print.

## Classification

Legend: `IMPLEMENT_NOW` · `FOUNDATION_ONLY` · `DEFER` · `NOT_IN_PRODUCT` ·
`REQUIRES_REVIEW`

### Form and output

| Item | Class | Basis |
|---|---|---|
| CERTIFICATE PDF | **IMPLEMENT_NOW** | Handoff §15 stores it as one of three artifacts; BACKEND-41 needs it to compose. A renderer already exists. |
| SEPARATE CERTIFICATE ARTIFACT | **IMPLEMENT_NOW** | §57, §122, §265 all prefer it: independent digest, clean step output, retry reuse, clean BACKEND-41 input. |
| CERTIFICATE EMBEDDED PAGE | **DEFER** | §121/§264 — composition is BACKEND-41's decision. BACKEND-40 must not preempt it. |

### Identity and reference

| Item | Class | Basis |
|---|---|---|
| DOCUMENT TITLE | **IMPLEMENT_NOW** | `signing_requests.document_title` is a real historical snapshot taken at send. Satisfies §22 without touching the mutable Document. |
| SIGNING REQUEST ID | **DEFER** | §89 permits it; nothing in the product displays one, so there is no product need. Internal provenance is on the artifact record regardless. |
| VERIFICATION ID | **DEFER** | §15. Owned by BACKEND-41/42. **Removing it from the existing renderer is required**, not optional. |
| COMPLETION RUN ID | **NOT_IN_PRODUCT** | §90 — internal provenance only. |
| QR CODE | **NOT_IN_PRODUCT** | §16 requires an explicit product requirement and a verification identity. Neither exists. |

### Participants

| Item | Class | Basis |
|---|---|---|
| RECIPIENT NAME | **IMPLEMENT_NOW** | `signing_request_recipients.name` — immutable snapshot. The certificate's core content. |
| RECIPIENT EMAIL | **REQUIRES_REVIEW** | §31 demands a deliberate choice. Recommendation below: **masked**. |
| RECIPIENT TYPE | **DEFER** | §48 — include only if multiple participant types make it useful. Signer is the only type that acts. |
| NON-SIGNING RECIPIENTS | **DEFER** | §49 — the certificate is a record of signing evidence. |
| RECIPIENT / SIGNING ORDER | **FOUNDATION_ONLY** | §46/§50: ordering must be deterministic (`routingOrder`, `orderIndex`, `recipientId`) and IS. Displaying "Signer 1/2" labels is not something the product does — §47. |

### Evidence facts

| Item | Class | Basis |
|---|---|---|
| SIGNED TIME | **IMPLEMENT_NOW** | `RecipientSubmission.acceptedAt`, the authoritative signing instant (§8). Never regenerated. |
| AUTHENTICATION METHOD | **IMPLEMENT_NOW** | `RECIPIENT_AUTHENTICATION_METHODS = ["link-only", "email-otp"]` — a real bounded vocabulary. |
| EMAIL OTP INDICATOR | **IMPLEMENT_NOW** | Not a separate field: it is the `email-otp` member above. A second boolean would be a second source of truth. |
| CEREMONY VIEWED TIME | **IMPLEMENT_NOW** | `CeremonyProgressRecord.firstEnteredAt` exists. **Wording is constrained by §7**: it means an authenticated recipient entered the ceremony. It does NOT mean anyone read the document. |
| CONSENT TIME + VERSION | **IMPLEMENT_NOW** | `CeremonyConsentRecord` carries `consentType`, `consentVersion`, `acceptedAt` — exactly what §40/§41 ask for. |
| AUTHENTICATION TIME | **REQUIRES_REVIEW** | §39 warns against using session creation time as authentication time unless they are intentionally equivalent. Needs a read of BACKEND-34's semantics before it is printed. |
| SIGNATURE METHOD | **DEFER** | Typed vs raster exists (BACKEND-36), but §42 requires an actual product need and there is none. The signed PDF already shows the mark. |

### Privacy-sensitive

| Item | Class | Basis |
|---|---|---|
| IP ADDRESS | **NOT_IN_PRODUCT** | **Measured: LAGDA does not store an IP as evidence at all.** The only `ipAddress` in the codebase is a rate-limit bucket scope, and BACKEND-13 hashes it precisely so no reversible IP is retained. There is nothing to print, which settles §34 on facts rather than on policy. |
| USER AGENT | **DEFER** | `evidence_events.client_user_agent` IS stored and nullable. §36 omits it by default; nothing in the product displays it. Stays in the evidence store. |
| DEVICE INFORMATION | **NOT_IN_PRODUCT** | §37/§159. No derivation exists and none may be invented. |
| GEOLOCATION | **NOT_IN_PRODUCT** | §158. Never derived. |
| RAW SIGNATURE | **NOT_IN_PRODUCT** | §43/§199. The merged document already renders the mark. |
| FIELD VALUES | **NOT_IN_PRODUCT** | §44/§198. The certificate summarizes evidence; it is not a copy of the form data. |
| PHONE | **NOT_IN_PRODUCT** | §33. No phone participates in signing. |

### Integrity

| Item | Class | Basis |
|---|---|---|
| SOURCE ARTIFACT HASH | **IMPLEMENT_NOW** | Available and meaningful before sealing. **Must be relabelled** — see defect 1. Accurate wording per §92: *signing source document*, since the request's source is the ORIGINAL artifact, there being no prepared artifact. |
| MERGED ARTIFACT HASH | **REQUIRES_REVIEW** | §93 doubts it belongs on a human-facing certificate at all. Recommendation below: **internal provenance only**. |
| CERTIFICATE SELF HASH | **NOT_IN_PRODUCT** (inside the bytes) | §95/§13. Stored as artifact metadata, never printed into itself — it cannot be, without circularity. |
| FINAL SEALED HASH | **DEFER** | §14/§162. Does not exist yet. No placeholder. |
| SEAL METADATA | **DEFER** | §163. Nothing is sealed at BACKEND-40. **Removing "Sealed" from the existing renderer is required.** |

### Framing

| Item | Class | Basis |
|---|---|---|
| LEGAL DISCLAIMER | **IMPLEMENT_NOW** | §97 says use existing approved copy rather than invent. LAGDA has approved copy and it disclaims exactly this: "It does not constitute a legal certificate or court-admissible document." Given the product's stance, this is the single most important line on the page. |
| CERTIFICATE TITLE | **REQUIRES_REVIEW** | The existing renderer says "Certificate of Completion". That is defensible and unglamorous, and §164 forbids anything grander. But the product elsewhere denies having a certificate, so the title deserves an explicit decision rather than inheritance. |
| STATUS LABEL | **NOT_IN_PRODUCT** | §165/§166. Nothing may claim completion at this point. |
| LAGDA LOGO / BRANDING | **DEFER** | §98–§101. Assets exist but no certificate design has been approved; workspace branding raises mutable-asset history problems (§101). |

## Recommendations on the three REQUIRES_REVIEW items

Stated as recommendations because §31 and §93 require a deliberate choice, and
because these are product calls rather than engineering ones.

**RECIPIENT EMAIL → MASKED.** §32's reasoning applies directly: the name already
identifies the signer, and the email is supporting delivery identity. The full
value stays in the immutable request snapshot, so nothing is lost for audit. A
certificate is the artifact most likely to be forwarded to third parties, which
is the argument against printing full addresses on it.

**MERGED ARTIFACT HASH → INTERNAL PROVENANCE, not visible.** §93/§94. Two
similar-looking hashes on one page invites a reader to compare the wrong one,
and "merged signing candidate" is not explicable to a signer. It goes on the
artifact record where BACKEND-41 and BACKEND-42 can use it.

**CERTIFICATE TITLE → keep "Certificate of Completion".** It is what the code
already says, it is descriptive rather than grand, and it does not assert legal
standing. Paired with the approved disclaimer, the page describes itself
honestly.

## Explicitly NOT imported

No terminology was taken from DocuSign, Adobe Sign or Dropbox Sign. In
particular these were considered and rejected as having no LAGDA equivalent:
"Certificate of Authenticity", "Signature Certificate", "Audit Certificate",
"Envelope ID", "Identity verified", "Signer authentication: verified",
"court-admissible", and any PKI/X.509/PAdES/qualified-signature framing (§3,
§4, §5).

## What this inventory obliges BACKEND-40 to do

1. Build the CERTIFICATE step producing a **separate immutable artifact**.
2. **Fix the four defects above** in the renderer it inherits — the mislabelled
   hash, "Completed", "Sealed", and the verification ID.
3. Carry the **approved disclaimer** copy.
4. Take everything from immutable snapshots, and nothing from Contacts,
   Preparation, current profiles or the current Document.
5. Answer OD-162's twin: `seal()` still renders a certificate of its own. Once
   the CERTIFICATE step produces one, `seal()` must stop — or completion
   produces two certificates and composes the wrong one.
