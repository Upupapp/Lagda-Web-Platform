# Signing field value model

One row per accepted value. Explicit typed columns rather than one JSONB blob
(§111): a checkbox that must be a boolean cannot arrive as the string `"yes"`,
because the column will not hold it.

| Field type | Source | Transport | Validation | Stored as |
|---|---|---|---|---|
| `signature` | RECIPIENT | `{kind:"signature"}` + adopted representation | representation must exist | `value_kind = representation` → `representation_id` |
| `initials` | RECIPIENT | `{kind:"initials"}` + adopted representation | same | same, `purpose = initials` |
| `text` | RECIPIENT | `{kind:"text", text}` | ≤ 2000, no control characters, required ⇒ non-empty | `text_value` |
| `checkbox` | RECIPIENT | `{kind:"checkbox", checked}` | strict boolean; **required ⇒ must be true** | `boolean_value` |
| `title` | RECIPIENT | `{kind:"text", text}` | ≤ 200 | `text_value` |
| `company` | RECIPIENT | `{kind:"text", text}` | ≤ 200 | `text_value` |
| `date-signed` | **SERVER** | *none* | — | `instant_value` = `accepted_at` |
| `full-name` | **SERVER** | *none* | — | `text_value` from the snapshot |
| `email` | **SERVER** | *none* | — | `text_value` from the snapshot |

## Server-owned means no transport at all

The wire contract has **no member** for the three server-derived types. A client
cannot express a value for them, which is stronger than rejecting one.

And if one arrives anyway — a `text` value aimed at a `date-signed` field — it
is **REJECTED**, not ignored. The first implementation ignored it and a test
caught the problem: ignoring hides a client that still believes it set the
signing date, and the disagreement surfaces later when somebody reads the
document (§70, §329).

## `date-signed` timezone

Stored as a **UTC instant** (`timestamptz`), equal to `accepted_at`. Never a
browser-local date string (§69).

A field that visually shows only a date is rendered from that instant at render
time. The rendering timezone is BACKEND-39's decision and it must be recorded
when it is made — deriving a displayed date from an instant is deterministic
only once the zone is fixed.

## Required checkbox

Required means it **must be true**. An acknowledgment nobody ticked is not an
acknowledgment, so "required" is not satisfied by answering `false` (§76).

## Optional and omitted

An omitted optional field produces **no row**. Absence is the record that
nothing was entered; a row holding `""` would claim the signer typed an empty
string (§86, §87).

## Text normalization

Ends trimmed, middle untouched. §73 warns against trimming meaningful internal
whitespace — an address typed across two lines means both lines — while leading
and trailing space is an artefact of a text box.

Control characters other than tab, newline and carriage return are **refused**
rather than stripped. Silently altering what somebody signed is worse than
declining to accept it.

No HTML. Values are plain text; the product has no rich-text field (§74).

## Immutability

`SELECT` and `INSERT` only, on every table. There is no `updateFieldValue` in
any port, no `.updateTable` in the repository, and no UPDATE privilege for the
runtime role — three layers, and integration asserts the third as
`permission denied` rather than as zero rows affected.

## Future rendering

BACKEND-39 reads these rows to place values in the PDF. It needs `field_type`,
the value column its kind selects, and — for representations — the
`representation_type` and its version. Everything it needs is on the row or one
join away, and nothing it needs is recomputed from mutable state.
