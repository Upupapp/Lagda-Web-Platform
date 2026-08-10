# Signature submission — product inventory

What LAGDA's signing submission actually is, read from the frontend. Every
classification carries its evidence.

| Capability | Status |
|---|---|
| FINAL RECIPIENT SUBMISSION | **IMPLEMENT_NOW** |
| PER-FIELD FINAL SUBMISSION | **NOT_IN_PRODUCT** |
| BATCH FINAL SUBMISSION | **IMPLEMENT_NOW** — this is what atomic means here |
| DRAWN SIGNATURE | **IMPLEMENT_NOW** |
| TYPED SIGNATURE | **IMPLEMENT_NOW** |
| UPLOADED SIGNATURE IMAGE | **NOT_IN_PRODUCT** |
| INITIALS | **IMPLEMENT_NOW** |
| DATE SIGNED | **IMPLEMENT_NOW** — server-derived |
| NAME FIELD | **IMPLEMENT_NOW** — server-derived, no renderer |
| EMAIL FIELD | **IMPLEMENT_NOW** — server-derived, no renderer |
| TEXT FIELD | **IMPLEMENT_NOW** |
| CHECKBOX | **IMPLEMENT_NOW** |
| RADIO | **NOT_IN_PRODUCT** |
| DROPDOWN | **NOT_IN_PRODUCT** |
| PARTIAL AUTOSAVE | **NOT_IN_PRODUCT** |
| SIGNATURE REUSE WITHIN REQUEST | **IMPLEMENT_NOW** |
| SIGNATURE REUSE ACROSS REQUESTS | **NOT_IN_PRODUCT** |
| AMEND AFTER SUBMISSION | **NOT_IN_PRODUCT** |

---

## Submission granularity: ATOMIC_RECIPIENT_SUBMISSION

`RecipientContext.submitFinalAction()` is one function. It validates every
required field, then submits once. There is no per-field finalize anywhere in
the recipient flow — no field-level save, no autosave, no partial commit.

§3 states a preference for atomic; the product independently agrees, so this is
not a preference being applied but a shape being matched.

## The transport does not exist yet, and that is the gap this command fills

`submitAction()` in `services/mock/recipient.service.ts` takes:

```ts
submitAction(request, completedFieldCount, signatureAdopted,
             signatureMethod, consentAccepted, approvalDecision, reviewDecision)
```

A **count**, two booleans and two decisions. It sends no field values and no
signature payload — it builds a demonstration summary.

So the *values* are real product state (`state.fieldValues`,
`state.signature`), and the *transport* is missing. That is precisely what
BACKEND-36 is asked to create; the contract is therefore derived from the
client STATE model, which is real, and not from the mock summary builder,
which is not a transport.

Consistent with BACKEND-35's finding that the frontend has no HTTP client at
all. FRONTEND-01 owns the wiring.

---

## Signature methods: DRAW and TYPE. Not UPLOAD.

`SignatureAdoptionMethod = "typed" | "drawn"`. There is **no file input
anywhere** in `src/app/pages/recipient/` — grepped, none.

§48 says implement only actual modes. Two, then.

### TYPED — `TYPED_SIGNATURE_V1`

`SignatureAdoption` carries `typedText` and `styleIndex` into
`TYPED_SIGNATURE_STYLES`, a **four-entry server-known array**. The client picks
an index, never a font.

That is already the shape §59 asks for — `text` + `styleId` referencing a
server-known finite style — so the representation is the product's, not an
imposition. §60 is satisfied by construction: there is no path by which a font
file or a CSS family could arrive.

### DRAWN — `RASTER_SIGNATURE_V1`

`SignatureAdoptionDialog` draws on a **420 × 120** canvas with
`moveTo`/`lineTo` and produces `canvas.toDataURL("image/png")`.

**It captures no stroke data.** There is no array of points anywhere — the
strokes go straight to the 2D context and only the PNG survives. So §50's
option A, bounded normalized vector strokes, would require the frontend to
capture something it does not capture, which is inventing product rather than
serving it.

Option B, a validated raster, is what the product can actually produce.

§198 is respected: the base64 data URL is **transport formatting, not the
representation.** It is decoded, magic-byte checked, dimension checked, bounded,
and the decoded bytes are what is stored and hashed.

---

## Where the raster lives: PostgreSQL, not object storage

§53 prefers object storage for binary signature assets. This goes the other way
deliberately, and the reason is the failure model rather than the byte count.

**The whole submission commits in one transaction.** §130 – §133 exist to manage
the fact that object storage and PostgreSQL are not atomic together: a pending
asset, a claim step, a commit-order window, and orphan cleanup. Choosing
PostgreSQL makes that entire class of problem *not exist* — and this is the
single most legally consequential write in the system, where removing failure
windows is worth more than architectural tidiness.

Supporting reasons:

- **Size.** A 420 × 120 signature PNG is single-digit kilobytes. §53's warning
  is against "large base64 DB blobs"; this is neither large nor base64, because
  the transport encoding is decoded before storage. Bounded hard at **64 KiB**.
- **Retention.** §121 and §236 require signing records to survive ordinary
  deletion. A table with no DELETE grant gives that for free; an object needs a
  retention policy somebody must not misconfigure.
- **§54.** A signature is not a PDF `DocumentArtifact`. Not reusing that model
  is easier when the bytes are not in the artifact store at all.
- **§134** explicitly blesses a PostgreSQL-contained final mutation.

**When this stops being right:** if UPLOAD mode arrives, or bounds need to
exceed roughly 256 KiB, or signatures start being reused across requests. Then
the pending/claim model in §94 and §130 is the correct answer and this decision
should be revisited rather than stretched.

---

## Signature reuse within one submission

The dialog adopts **one** signature and **one** initials set per ceremony, and
the reducer stores exactly one of each — `state.signature`, `state.initials`.
Every signature field gets the same adopted signature.

So §64/§65 apply directly: a `signing_representations` row scoped to the
submission, referenced by each field value. One raster stored once, however many
signature fields exist.

**Across requests: NOT_IN_PRODUCT.** There is no saved-signature library, no
profile, no reuse affordance. §66 and §67 forbid inventing one, and it would
raise privacy questions nobody has asked.

---

## Field types

Five have recipient input: `signature`, `initials`, `text`, `checkbox`, and
`date-signed` (rendered, but server-owned).

Four are server-derived or unrendered, per BACKEND-35's `FIELD_INPUT_POLICY`:
`date-signed`, `full-name`, `email` are SERVER_DERIVED; `title` and `company`
are recipient-supplied with **no renderer** (OD-149).

`radio` and `dropdown` do not exist in `PREPARATION_FIELD_TYPES` and are not
rendered anywhere. §77 applies only if the product supports them; it does not.

---

## Amendment: NOT_IN_PRODUCT

Nothing in the recipient flow lets a signer revisit a submitted value. §12 says
absent explicit product support, amendment is not implemented, and a correction
becomes an explicit future workflow with new history.

Enforced by a unique constraint, not by a check somebody has to remember.

---

## What this inventory refused to invent

- **Vector stroke capture** — the canvas does not produce it.
- **Signature upload** — no file input exists.
- **Radio and dropdown** — not in the field vocabulary.
- **Draft autosave** — the product says in-memory only, twice.
- **A saved-signature library** — no affordance, and significant privacy weight.
- **Per-field finalization** — one submit function.
