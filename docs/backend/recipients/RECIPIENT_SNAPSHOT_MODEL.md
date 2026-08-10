# The recipient snapshot model

A recipient's `name`, `email` and `organization` are **copies**, taken once, at
creation. Nothing reads them from a contact again.

## Why a copy rather than a reference

A document signed in March must keep saying who signed it after everyone's
details change.

Consider the reference version. Maria Santos signs a lease in March as General
Counsel at Ayala Land. In June she moves firms, and someone updates her contact
entry. With a live reference, the March lease's completion record now says she
signed as counsel at a firm she had not joined — a document about a past event
silently rewritten by an unrelated address-book edit.

The snapshot version records what was true when the document was prepared, which
is the only thing a legal record can honestly claim.

## What is copied, and what is not

| Contact field | Copied? | Why |
|---|---|---|
| `name` | Yes | It is who the participant is |
| `email` | Yes | It is where the invitation goes |
| `organization` | Yes | It is the capacity they act in |
| `title` | **No** | A recipient has no such column. A snapshot copies what a recipient *is*, not everything the source happened to hold |
| `phone` | **No** | Nothing in the signing flow uses it, and copying PII with no consumer is a liability with no benefit |
| `emailKey` | **No** — recomputed | It is a `ContactEmailKey`. The recipient needs a `RecipientEmailKey`, and the brands do not interchange |

The values are also **re-validated**, not trusted. A contact was validated by
its own rules on its own day; a stored value that no longer satisfies today's
rules must not enter a new record unchecked.

## When the copy is taken

Inside the same transaction as the insert. The contact is read and the recipient
written on one unit of work, so the snapshot cannot be taken from a contact a
concurrent edit has already changed.

This is why `recipients` sits beside `contacts` on the workspace unit of work
rather than being reached through a service.

## What propagates: nothing

| Event | Effect on an existing recipient |
|---|---|
| The contact is renamed | None |
| The contact's email is corrected | None |
| The contact's organization changes | None |
| The contact is archived | None |
| The contact is **deleted** | `source_contact_id` becomes NULL. Name, email, organization, type, order all intact |
| The recipient is renamed | **No effect on the contact.** The address book is not updated |
| The recipient's email is corrected | No effect on the contact |

Every row is a test in `packages/application/src/recipients/recipients.test.ts`.

## `source_contact_id` is provenance

It exists so the editor can show "from contacts" and offer re-picking. It is
exposed on the wire for that reason.

It is **never** dereferenced to obtain a value. The guard that keeps it that way
is a count, not a convention: the recipient use-case module contains exactly one
`uow.contacts.*` call.

It is also not editable. `RecipientUpdate` names every changeable field, and
`sourceContactId` is not among them — a caller that could set it could claim a
snapshot came from a contact it never did. The PATCH schema rejects it with 422.

## `ON DELETE SET NULL (source_contact_id)`

The one `SET NULL` in the schema, and the column list is load-bearing.

A bare `ON DELETE SET NULL` on a **composite** foreign key nulls *every*
referencing column — here `workspace_id` as well as `source_contact_id`.
`workspace_id` is `NOT NULL`, so deleting a contact would not forget the
provenance: it would fail outright with a not-null violation, and the recipient
would sit behind an error nobody could act on.

Naming the column (PostgreSQL 15+) sets only that one.

This was a real defect. It shipped in the first draft of migration 018 and was
found by the integration test that deletes a contact and asserts the recipient
survives with its tenancy intact — which is the whole reason that test exists.

Contacts cannot currently be deleted at all: BACKEND-28 granted the runtime role
no `DELETE`. The clause says what happens if that ever changes — the erasure
operation OD-110 anticipates — rather than leaving a `RESTRICT` that would block
it.

## What BACKEND-32 inherits

A preparation recipient is still **authoring** state. A sender may rename, remove
or reorder participants freely, because nothing has been sent.

The moment a signing request is created, that stops being true, and BACKEND-32
must snapshot the recipient set the same way a recipient snapshots a contact —
for the same reason, one level up. A sender editing a draft on Tuesday must not
change who a recipient saw on Monday's invitation.

The pattern is already written twice now. It should be written the same way a
third time.
