# Preparation field model

Nine field types. Every one of them can be rendered onto a signed PDF, and that
constraint is what chose the list.

## The rule that picked the nine

```
the editor offers 13    the sealer renders 5
```

A field a sender can **place** but the signed document can never **show** is a
promise the system cannot keep. Placing an `email` field today would produce a
document where the signer was asked for an address that appears nowhere.

So the list is: the five the sealer renders directly, plus the four that are
unambiguously text once drawn.

## The types

| Type | Asks the signer for | Renders as | Required |
|---|---|---|---|
| `signature` | Their signature | `signature` | **Always** |
| `initials` | Their initials | `initials` | **Always** |
| `date-signed` | Nothing — the ceremony supplies it | `date` | Configurable |
| `text` | Free text | `text` | Configurable |
| `checkbox` | A tick | `checkbox` | Configurable |
| `full-name` | Their full legal name | `text` | Configurable |
| `email` | Their email address | `text` | Configurable |
| `title` | Their job title | `text` | Configurable |
| `company` | Their organization | `text` | Configurable |

`renderTypeFor` in `@lagda/core/preparation` is the **one place** the
nine-to-five mapping lives, and an architecture test asserts every preparation
type maps onto a `SealableFieldType`. Adding a tenth type without a renderer
fails that test.

### Why the four semantic text fields stay separate

`full-name`, `email`, `title` and `company` all draw as text, so collapsing them
into `text` would lose nothing visually — and would lose the thing that matters:
**what the signer is being asked for**. "Your full legal name" is not "any text".

Keeping them distinct is also what lets a later command prefill an `email` field
from the recipient snapshot without guessing which text fields were meant to be
addresses.

### `date-signed` is not free text

It records that a date is requested **at that spot**. The value comes from the
ceremony, and the sealer renders what it is given — `SealableField` says so:
*"a `date` field shows the value the signer submitted, not today's server
date."*

Preparation stores no date.

### Signature and initials are inherently required

The editor exposes a `required` checkbox on every field, so the flag is stored
for every type. But a signature field with `required: false` is a
contradiction, and `effectiveRequired` resolves it rather than persisting a lie.

## What is stored per field

| | |
|---|---|
| `fieldId` | Opaque, server-generated. Never an array index (§28) |
| `type` | One of the nine. CHECK-constrained |
| `pageNumber` | 1-based |
| `x`, `y`, `width`, `height` | Normalized 0–1, top-left origin |
| `required` | After the inherent rule |
| `label` | Shown in the editor and to the signer. Bounded at 200 |
| `layer` | z-order; higher draws on top. The editor's `layer` |
| `participantSlot` | An opaque editor label, **not an identity** |

Field ids are **stable across a move or resize** (§29): a save may supply an
existing id to preserve identity, and it is honoured only if that id already
belongs to this preparation — an unknown id is rejected rather than adopted,
because adopting would let a caller choose row identifiers.

## What is NOT stored

**No value of any kind.** No signature image, no submitted initials, no typed
text, no date, no checkbox state. `SealableField` has a `value` and
`PreparationFieldRecord` does not, and the difference is the point: preparation
records the **request**, the ceremony records the **response**.

The API rejects `value`, `signatureValue` and `signedAt` with 422 rather than
ignoring them.

**No generic configuration bag** (§83). No `jsonb`, no `metadata`, no
`properties`. Every stored attribute is an explicit typed column, and an
architecture test asserts the migration contains none of those words. A bag
would be a place for client-controlled data nobody validates.

**No option sets**, because no type needs them — which is precisely why
`radio-group` is deferred.

## The four deferred types

| Type | Why |
|---|---|
| `radio-group` | Needs option sets, group semantics and a renderer. The only type behind a paid plan tier |
| `multiline-text` | The sealer has no multiline renderer; single-line text would silently truncate |
| `acknowledgment` | No renderer, and its own participant role suggests semantics nobody has specified |
| `sender-text` | Sender-filled content. §39 — a value the sender supplies has different authority and audit semantics from anything a signer does, and conflating them is how a "pre-filled signature" becomes possible |

Each is refused with 422, and the database CHECK refuses them independently.
Adding one means adding a renderer in the same command.

## Overlap and duplicates

**Permitted.** Two fields may share coordinates, and nothing deduplicates them
(§72, §73). Legal forms legitimately place fields close together, and the editor
has a `layer` for exactly this. Prohibiting overlap would be inventing a rule
the product does not have.

## Ordering

Deterministic and always: **page, then layer, then field id**. Ordered in SQL,
with a matching index.

Never physical row order. A layout whose z-order depended on it would render
differently after a vacuum, and pagination — if a layout ever grows one — would
drop and duplicate fields.
