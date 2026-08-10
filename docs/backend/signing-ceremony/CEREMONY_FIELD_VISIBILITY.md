# Ceremony field visibility

**A recipient receives exactly the fields assigned to them. Nothing else.**

## Why there is no third category

`signing_request_fields.request_recipient_id` is **NOT NULL**. Every field in a
snapshot belongs to exactly one recipient, so the request's fields partition
completely and there are no system, shared or unassigned fields to decide about.
§51 asks what to do with them; the answer is that they cannot exist.

## The `sender-text` gap

The frontend renders a `sender-text` field type — read-only sender content, three
fixtures, `layer: 0`. **The backend has no such type**, and the exclusion is
deliberate and documented at the declaration: *"sender-filled content, which
carries different authority and audit semantics from anything a signer
supplies."*

So the frontend's read-only sender notes cannot come from a request snapshot.
Recorded, not built.

## Other recipients' fields: not returned

`DocumentReviewPage.tsx:4` says *"Other participants' fields are shown as
read-only overlays"*, and the renderer exists at line 123: a grey dashed box
displaying `field.label`.

They are still not returned, for three reasons in order of weight:

1. **The label is sender-authored.** "Maria Santos — Signature" is a label a
   sender can write, and shipping it to a counterparty is a PII leak in service
   of a decoration. An integration test asserts the other signer's name does not
   appear.
2. §45 and §47 both prefer hidden.
3. **The affordance has never had a real field to draw.** All three unassigned
   fixtures are `sender-text` — a type the backend cannot emit.

### If product asks for the placeholders

Return geometry + type + `assignedToCurrentRecipient: false`. **No label, no
recipient id, no name** — the grey box can label itself from the type. Recorded
here so the next person does not have to re-derive it.

## Three independent enforcements

| Layer | Mechanism |
|---|---|
| Type | `listAssignedFields()` takes no argument — the wrong recipient is unexpressible |
| Query | `.where("request_recipient_id", "=", recipientId)` |
| Database | restrictive policy binds fields to the session's recipient |

The third is the one that survives a refactor of the first two. Integration
measures it: two fields exist on the request, the recipient realm sees one.

## What each field carries

Geometry **unchanged** — normalized 0–1, top-left origin, `y` to the field's
top, 1-based pages. §109 forbids transforming to viewport pixels, and
`DocumentReviewPage.tsx:89` already multiplies by its own page size, so a
backend transform would be a second and conflicting source of truth about where
a signature goes.

Plus `required`, `label`, `layer`, and three values echoed from
`FIELD_INPUT_POLICY`: `valueAuthority`, `valueKind`, `maxLength`.

## Ordering

Page, then down, then across, then layer, then id. Reading order, so a "Next
field" button is `index + 1` and needs no server round trip (§111). The final
tiebreak on id makes it total — two fields at identical coordinates are unusual
but legal, and without a last resort their order would depend on how the rows
came back.

## Gated behind consent

A signer sees no fields and no document until they accept the disclosure. That
is the product's own step order (`RequestAccessPage.handleBegin`), not an added
restriction. A viewer needs no consent and sees the document immediately.
