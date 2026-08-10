# Signing request immutability

## What can change after creation

**The `state` column, and `updated_at`.** Nothing else.

The request row is not fully immutable, and should not be: BACKEND-33 will
transition `draft → sent`, and BACKEND-37 will move it further. Its
**configuration** columns are immutable; its lifecycle position is not.

The two snapshot tables are wholly immutable.

## What cannot change, and what enforces it

| Immutable | Enforcement |
|---|---|
| `document_id`, `source_artifact_id` | No update path in the port, the repository or the API |
| `source_preparation_id`, `source_preparation_revision` | Same |
| `document_title` | Same |
| `created_by_user_id`, `created_at` | Same |
| Every recipient column | **The runtime role holds no `UPDATE` grant on `signing_request_recipients`** |
| Every field column | **No `UPDATE` grant on `signing_request_fields`** |

The grant is the point. A missing method is a convention a future author can add
back; a missing privilege fails at the database. The integration suite proves it
twice — by reading `information_schema.role_table_grants`, and by attempting an
`UPDATE` as the runtime role and asserting `permission denied`.

## What later changes to mutable state do

Every row is a test.

| Event | Effect on the request |
|---|---|
| The contact is renamed | **None** |
| The contact is deleted | **None** |
| The preparation recipient is renamed, re-typed, re-ordered | **None** |
| The preparation recipient is deleted | Provenance becomes NULL. The snapshot is intact |
| The field is moved or resized | **None** |
| The field is deleted | Provenance becomes NULL. The snapshot is intact |
| The field is reassigned to someone else | **None** |
| The whole layout is cleared | **None** |
| The document is renamed | **None** — `document_title` is the snapshot |
| The preparation advances to a new revision | **None** |
| A source artifact is later replaced | **None** — the request names the old one |

## Preparation is NOT frozen

Creating a request leaves `locked_at` NULL. A sender may keep editing.

This is a decision, and it reverses a seam BACKEND-30 and BACKEND-31 built in
anticipation. The reasoning:

- The schema permits **more than one request per document**. Freezing would make
  the second one impossible.
- The product has no "this document is now finished authoring" control, and
  inventing one would be inventing the UX that explains it.
- Nothing is lost. The request already holds everything it needs; the mutable
  side changing is precisely the case the snapshot handles.

`locked_at` therefore still has no writer, and every preparation mutation still
conditions on it. `PreparationNotEditableError` exists and remains unreachable.
The freeze is one statement whenever a command arrives that genuinely needs it.

### The consequence a UI must understand

A sender can edit a preparation after a request exists, and **the request does
not change**. If a send UI is ever built, it must not pretend otherwise. The
honest flow is:

```
edit preparation → create a NEW request
```

not "edit and the request updates". Recorded here because the frontend has no
send UI today, and whoever builds one will need this sentence.

## There is no edit, no delete, no cancel

Not implemented, because the product has none of them:

- **Edit after create** — nothing creates a request in the frontend, so nothing
  edits one. What IS editable is the preparation draft, which is the right place.
- **Delete before send** — `discardDraft` deletes a *preparation* draft. There
  is no unsent-request list and no delete affordance for one.
- **Cancel before send** — `cancelTransaction` exists but is gated on
  `isActive`: a post-send action on fixture data.

If an abandon-unsent control appears, `DELETE` is already granted on all three
tables and the CASCADE is in place. No schema change would be needed — only a
use case, a route, and a decision about whether an abandoned request is deleted
or tombstoned.

## Historical authority

After creation, **the request snapshot — not the current preparation or
contact — is the authority** for:

- intended recipient identity (name, address, organization, type);
- field geometry, type and requiredness;
- field-to-recipient assignment;
- routing configuration;
- the source artifact;
- the document title as the signer will see it.

An architecture guard asserts the read path touches none of `uow.contacts`,
`uow.recipients`, `uow.preparations`, `uow.documents` or `uow.artifacts` — by
position, so a join added later to `getSigningRequest` fails the guard rather
than passing review.
