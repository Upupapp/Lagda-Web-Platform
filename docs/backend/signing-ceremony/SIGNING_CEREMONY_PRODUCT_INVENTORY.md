# Signing ceremony — product inventory

What LAGDA's ceremony actually is, read from the frontend rather than assumed.
Every classification below is followed by the evidence for it.

| Capability | Status |
|---|---|
| DOCUMENT VIEW | **IMPLEMENT_NOW** (backend), **FOUNDATION_ONLY** (frontend renders no real PDF) |
| CEREMONY ENTRY | **IMPLEMENT_NOW** |
| VIEWED EVENT | **IMPLEMENT_NOW** |
| E-SIGN CONSENT | **IMPLEMENT_NOW** |
| CONSENT DISCLOSURE | **REQUIRES_REVIEW** — a screen exists; its text is demo copy |
| CONSENT ACCEPTANCE | **IMPLEMENT_NOW** |
| SIGNATURE FIELD | **IMPLEMENT_NOW** (definition only) |
| INITIALS FIELD | **IMPLEMENT_NOW** (definition only) |
| DATE SIGNED | **IMPLEMENT_NOW** (definition only) |
| TEXT FIELD | **IMPLEMENT_NOW** (definition only) |
| NAME FIELD | **IMPLEMENT_NOW** (definition only) — backend `full-name`, no frontend renderer |
| EMAIL FIELD | **IMPLEMENT_NOW** (definition only) — backend `email`, no frontend renderer |
| CHECKBOX | **IMPLEMENT_NOW** (definition only) |
| NEXT REQUIRED FIELD | **FOUNDATION_ONLY** — deterministic order returned; no server navigation |
| FIELD PROGRESS | **DEFER** — no authoritative values exist until BACKEND-36 |
| SIGNATURE DRAW | **NOT_IN_PRODUCT** for BACKEND-35 — inventoried, owned by BACKEND-36 |
| SIGNATURE TYPE | **NOT_IN_PRODUCT** for BACKEND-35 — inventoried, owned by BACKEND-36 |
| SIGNATURE UPLOAD | **NOT_IN_PRODUCT** — the product has no upload path at all |
| SIGNATURE ADOPTION | **DEFER** — BACKEND-36 |
| DECLINE | **DEFER** — exists in the UI, excluded from BACKEND-35 by §0 |
| FINISH / SUBMIT | **DEFER** — BACKEND-36 |

---

## The flow, as the product actually defines it

`RecipientRoot.tsx` routes on a step union:

```
initializing → access → auth → consent → review → action → summary → complete
                                                                    ↘ declined
                                        (any point) → unavailable / error
```

`RequestAccessPage.handleBegin()` branches: auth if required, else consent if
required, else review.

**Consent is gated BEFORE the document, not after.** That answers §84 from the
product rather than from preference: LAGDA uses model B. `CONSENT_ACCEPT` sets
`step: "review"`, and `review` is the first step that shows a document.

### The two numbers that settle the biggest questions

In the six shipped scenarios (`src/app/data/mock/recipient.ts`):

- **`consentRequired: true` — 6 of 6.** Consent is not optional in this product.
- **`authRequired: true` — 0 of 6.** No scenario requires recipient
  authentication beyond the link, which is BACKEND-34's LINK_ONLY decision
  arrived at independently from the other end.

---

## DOCUMENT VIEW — backend real, frontend not yet

`DocumentReviewPage.tsx:2` says it plainly: *"Shows fictional CSS page previews
(no real PDF)"*. There is **no PDF library in the frontend** — no `pdfjs-dist`,
no `react-pdf`, nothing in `dependencies`. Pages are CSS boxes at A4
proportions.

So the backend must serve the real bytes and the frontend cannot yet consume
them. Building the authorized read path now is correct — BACKEND-36 and any real
viewer both need it — but the honest classification of the *product* capability
is FOUNDATION_ONLY.

This also decides **Range requests (§128, §255)**: nothing requests ranges
because nothing fetches a PDF. Marked NOT APPLICABLE rather than PASS, with the
delivery model chosen so that adding Range later is a change to one handler.

---

## Field types — the two vocabularies do not match

**Backend** (`PREPARATION_FIELD_TYPES`, carried into the request snapshot), nine:

`signature` · `initials` · `date-signed` · `text` · `checkbox` · `full-name` ·
`email` · `title` · `company`

**Frontend** (`src/app/data/mock/recipient.ts`), six:

`signature` · `initials` · `date` · `text` · `checkbox` · `sender-text`

| Frontend | Backend | Note |
|---|---|---|
| `signature` | `signature` | matches |
| `initials` | `initials` | matches |
| `date` | `date-signed` | same concept, different name |
| `text` | `text` | matches |
| `checkbox` | `checkbox` | matches |
| `sender-text` | **absent** | see below |
| — | `full-name`, `email`, `title`, `company` | no frontend renderer |

### `sender-text` cannot come from a request snapshot

The backend excludes it deliberately, and the reason is recorded at the
declaration: *"sender-filled content, which carries different authority and
audit semantics from anything a signer supplies."*

`signing_request_fields.request_recipient_id` is **NOT NULL** — every field in a
snapshot belongs to exactly one recipient. There is no such thing as an
unassigned or system field, which answers §51 by absence: there are none to
decide about.

The frontend's three `sender-text` fixtures therefore describe content this
backend cannot produce. Recorded, not built — §0 forbids inventing ceremony
features not present in LAGDA, and this is the mirror case: a frontend feature
with no backend concept behind it.

---

## Field visibility — own fields only

`DocumentReviewPage.tsx:4` says *"Other participants' fields are shown as
read-only overlays"*, and the renderer exists at line 123: a grey dashed box
displaying `field.label`, with `aria-label` "… assigned to another
participant". It never shows who that participant is — no name, no email.

**The ceremony returns only the authenticated recipient's own fields.** Reasons,
in order of weight:

1. The grey box displays a **sender-authored label**. "Maria Santos —
   Signature" is a label a sender can write, and shipping it to a counterparty
   is a PII leak in service of a decoration.
2. §45 and §47 both prefer hidden.
3. The affordance is unexercised: of three unassigned fixtures, all three are
   `sender-text` — a type the backend cannot emit. The renderer has never had a
   real other-recipient field to draw.

**If product asks for the placeholders**, the shape to add is geometry + type +
`assignedToCurrentRecipient: false`, with no label, no recipient id and no name
— the grey box can label itself from the type. Recorded in
CEREMONY_FIELD_VISIBILITY.md so the next person does not have to re-derive it.

---

## Consent — real feature, demo text

`ConsentPage.tsx` is a complete screen: a scrollable disclosure, a checkbox that
is never pre-checked, an "I Agree and Continue" button and a "Decline" button.
It is reached before the document and it gates the flow. **The feature is real.**

The **text is not**. It closes with: *"This disclosure is provided for
demonstration purposes only. No legally binding electronic signature transaction
is created by participating in this demonstration."* The body covers the right
subjects — right to paper copies, system requirements, withdrawal, data handling
— in copy that is explicitly labelled as not operative.

So the backend records **`consentType` + `consentVersion` + `acceptedAt`**, and
stores **no legal text at all**. §74 warns against storing `accepted = true`
without knowing what was accepted; §134 says a stable version reference can be
better than duplicating text into every row. Both point the same way here, and
storing demo copy as though it were a legal record would be the worse failure —
it would look like evidence.

The version identifier is configured, not hardcoded from frontend copy. When
counsel supplies operative text, it lands as a new version and every prior
acceptance stays bound to what it actually accepted (§135, §136).

**Consent type:** one — `electronic-records-and-signature`. The screen presents
one disclosure and one checkbox. §73 warns against merging distinct consents
into a boolean blindly; the inverse applies too, and modelling four consent
types where the product shows one would be inventing product.

---

## Signature adoption — inventoried, not built

`SignatureAdoption` supports `typed` and `drawn`. **No upload path exists**
anywhere in the product.

`drawnDataUrl: string | null; // in-memory only; never stored or uploaded` — the
model comments its own boundary, and `ConsentPage.tsx:3` says *"No consent data
is persisted"*.

This settles §64/§65 from the product: **in-progress input stays client-side.**
No draft autosave, no `RecipientDraftFieldValue` table. §66 says prefer defer
unless product requires it, and the product explicitly does the opposite of
requiring it.

---

## Multiple documents per request

`RecipientRequest.documents: RecipientDocument[]` — the frontend models a
request as carrying several documents, with per-document pages and
`RecipientField.documentId` scoping fields to one of them.

The backend snapshot has exactly one `sourceArtifactId`
(`signing_requests.source_artifact_id`), and `signing_request_fields` has
`page_number` but no document reference.

**One document per request is the backend's model** and BACKEND-35 does not
change it. The ceremony returns one document descriptor. Recorded as an open
question rather than resolved here: multi-document requests are a snapshot-model
change, which is BACKEND-32 territory, not ceremony territory.

---

## Roles

Six in the frontend: `signer`, `approver`, `reviewer`,
`acknowledgment-recipient`, `viewer`, `copy-recipient`.

The backend request-recipient model carries its own role vocabulary from
BACKEND-31. §52/§53 require that non-signers not be issued signature fields —
which holds automatically here, because fields are assigned per recipient at
preparation time and the ceremony filters on assignment rather than on role. A
viewer with no assigned fields receives an empty field list, which is the
correct view-only ceremony without a special case.

---

## What this inventory refused to invent

- **`sender-text` fields** — no backend type, deliberately.
- **Multi-document ceremonies** — the snapshot holds one artifact.
- **Draft autosave** — the product says in-memory only, twice.
- **Signature upload** — no path exists.
- **A second consent type** — one screen, one checkbox.
- **Operative legal copy** — §76, and the product's own text disclaims itself.
