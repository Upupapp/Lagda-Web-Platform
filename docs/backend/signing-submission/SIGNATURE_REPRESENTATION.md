# Signature representation

Two methods, because the product has two. **No upload path exists anywhere in
`src/app/pages/recipient/`** — grepped, none — so §48 says two.

## TYPED_SIGNATURE_V1

| | |
|---|---|
| Transport | `{ method: "typed", text, styleIndex }` |
| Validation | text 1–200 chars; `styleIndex` 0–3 |
| Stored | `typed_text`, `typed_style_index` |
| Digest | SHA-256 over `{v:1,text,styleIndex}` |

`styleIndex` is an **index into four server-known styles**
(`TYPED_SIGNATURE_STYLES`). The client never names a font, a family or a
stylesheet, and §60 is satisfied by the absence of a property rather than by
sanitising its contents. There is nowhere to put a font.

**The text is not forced to equal the recipient's name.** §61 says use the
product, and the product lets a signer type what they sign as — which is how
handwritten signatures work. The immutable snapshot name is still available
separately as the `full-name` field type, so a document that needs the legal
name can have both.

## RASTER_SIGNATURE_V1

| | |
|---|---|
| Transport | `{ method: "drawn", base64 }` — base64 **without** a data-URL prefix |
| Validation | clean base64 round-trip → PNG magic bytes → IHDR → dimensions ≤ 512 → ≤ 64 KiB |
| Stored | `raster_bytes` (`bytea`), media type, width, height |
| Digest | SHA-256 over the bytes **as stored** |

The product draws on a **420 × 120** canvas and calls
`toDataURL("image/png")`. It captures **no stroke data** — the strokes go
straight to the 2D context and only the PNG survives — so §50's vector option
would require the frontend to capture something it does not.

### The data-URL prefix is refused, not stripped

`data:image/png;base64,…` is transport formatting and proves nothing about
content (§199). The schema pattern rejects it outright, so a client sending one
gets a clear schema error rather than a silent strip that hides a bug.

### PNG only, and no image library

A PNG's dimensions live at a fixed offset in a fixed first chunk, so reading
them is eight bytes of arithmetic. Pulling in a decoder to parse untrusted bytes
would add the exact attack surface this is bounding (§201).

JPEG, WebP, GIF, PDF and **SVG** are all refused. SVG most deliberately: it is a
scriptable document wearing an image's name (§57, §259).

### Bounds in two places

The validator checks them and so does a database CHECK. A validator can be
bypassed by a future caller; a constraint cannot.

## Where the bytes live: PostgreSQL

§53 prefers object storage. This goes the other way, and the reason is the
failure model rather than the size.

Object storage and PostgreSQL are **not atomic together**, so a binary asset
needs a pending row, a claim step, a commit-order window and an orphan sweeper —
the machinery §94 and §130 describe. Choosing the database makes that entire
class of problem not exist, and this is the most legally consequential write in
the product.

Supporting: a signature PNG is single-digit kilobytes; §121 and §236 require
signing records to survive ordinary deletion, which a table with no DELETE grant
gives for free; and a signature is explicitly **not** a `DocumentArtifact`
(§54), which is easier to honour when it is not in the artifact store.

**Revisit when:** upload mode arrives, bounds need to exceed ~256 KiB, or
signatures become reusable across requests. Then the pending/claim model is
right and this decision should be replaced rather than stretched.

## Reuse within one submission

The ceremony adopts **one** signature and **one** set of initials. Each is
stored once per submission and referenced by every field value that uses it
(§65) — `unique (submission_id, purpose)`. Two signature fields share one
representation row, and the raster is stored once.

## No reuse across requests

**NOT_IN_PRODUCT.** There is no saved-signature library, no profile, no reuse
affordance. §66 and §67 forbid inventing one, and it carries privacy weight
nobody has asked for.

## What is deliberately not captured

Pressure, velocity, timing, device motion, per-point timestamps, device
fingerprints (§180 – §182). The product captures none of it, and collecting
biometric-shaped data because a canvas could produce it would be exactly
backwards.

**Language:** this is *sensitive signature content*. It is **not** biometric
identity, and calling it that would overclaim what a mouse-drawn line proves
(§179).
