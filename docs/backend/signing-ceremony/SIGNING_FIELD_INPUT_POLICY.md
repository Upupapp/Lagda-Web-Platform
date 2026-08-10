# Signing field input policy

**This is the BACKEND-36 handoff.** One table saying, for every field type a
request snapshot can hold, who supplies the final value and what shape it takes.

BACKEND-35 persists none of it. The ceremony must tell the frontend what each
field expects and BACKEND-36 must decide what it will accept, and those are the
same question — answering it once is what stops the two answers from drifting
(§161).

## The table

`FIELD_INPUT_POLICY` in `core/src/signing/field-input-policy.ts`, typed as
`Record<PreparationFieldType, FieldInputPolicy>` so adding a tenth field type to
the contract **fails this file to compile**. A partial map with a default case
would let a new type arrive with no decision made about who owns its value.

| Type | Authority | Value | Max | Renderer | Note |
|---|---|---|---|---|---|
| `signature` | RECIPIENT | signature-representation | — | yes | typed or drawn; no upload path exists |
| `initials` | RECIPIENT | signature-representation | — | yes | same machinery |
| `date-signed` | **SERVER** | date | — | yes | the moment the signature is accepted |
| `text` | RECIPIENT | text | 2000 | yes | snapshot has no multiline flag |
| `checkbox` | RECIPIENT | boolean | — | yes | required means TRUE, not merely answered |
| `full-name` | **SERVER** | text | 200 | **no** | the frozen recipient name |
| `email` | **SERVER** | text | 320 | **no** | the frozen delivery address |
| `title` | RECIPIENT | text | 200 | **no** | no snapshot column to derive from |
| `company` | RECIPIENT | text | 200 | **no** | `organization` can seed it; the signer may correct it |

## Server-derived means no input at all

Not "validated input", not "input we overwrite" — **no input**.
`date-signed` is the signing time, `full-name` and `email` are the immutable
recipient snapshot.

**BACKEND-36 must REJECT a client-supplied value for these, not ignore it.**
Ignoring hides the bug; rejecting surfaces a client that is broken or lying.

`date-signed` deserves the emphasis: the frontend renders a date box, which is
exactly why this must be written down. A client-supplied signing date is a
client-chosen one.

`company` is deliberately RECIPIENT even though `organization` exists on the
snapshot: it can seed a default, but a signer who corrects it makes the final
value theirs.

## Four types have no recipient renderer

`full-name`, `email`, `title` and `company` can be placed by a preparation and
have no input anywhere in the recipient UI. That is a real gap, not a formality
— a sender can build a request whose fields no signer can fill.

Two of the four are server-derived and therefore fine. `title` and `company` are
not, and BACKEND-36 will need either a renderer or a product decision.

## Bounds

`text` 2000, names 200, email 320, short text 200. A bound now is worth more
than a better bound later (§166): what matters is that BACKEND-36 does not
inherit an unbounded payload. An architecture guard asserts every text-shaped
value has one.

Signature payload size is deliberately **unbounded here and must be bounded
there** — the representation is BACKEND-36's decision and a limit on a shape
nobody has chosen would be a guess.

## What BACKEND-35 does not decide

The signature representation — data URL, vector path, or reference. §165 asks
for the forms to be inventoried, not fixed, and pretending to know would produce
a contract the next command has to break.

Whether submission is per-field, batched, or one atomic completion (§113).

Amendment: whether an accepted value can be changed before completion.
