# Recipient architecture

A **recipient** is a participant in one document's preparation. It holds a
snapshot of a name, an email address and an organization, plus what that
participant is expected to do and when their turn comes.

It is not a contact, not a user, and not an authenticated identity. Those three
sentences are the whole design; everything below is how each one is held by
something that fails rather than by a comment.

## Where it sits

```
Workspace
 └── Document                     BACKEND-29   identity, title
      └── DocumentPreparation     BACKEND-30   one per document, revisioned
           ├── PreparationField   BACKEND-30   what is asked for, and where
           └── Recipient          BACKEND-31   who is asked
```

A field points at a recipient of the **same** preparation. Nothing points the
other way: a recipient does not know which fields name it, and asks the field
table when it needs to know (`countAssignedFields`).

### Why recipients hang off the preparation, not the document

A document may back more than one signing request over its life — a lease sent
to one tenant in March and re-sent to a replacement in June. Hanging recipients
off the *document* would make those two sets of parties one list.

Hanging them off the *preparation* keeps the authoring set together with the
layout it belongs to, which is also the set BACKEND-32 will snapshot when it
creates a request. The preparation is the draft; the request is what was sent.

## The tables

`preparation_recipients` (migration 018):

| Column | Meaning |
|---|---|
| `recipient_id` | Opaque, server-generated. Never derived from an email or an index |
| `workspace_id`, `preparation_id` | Tenancy and parent, both part of every key |
| `source_contact_id` | **Provenance only**, nullable, `ON DELETE SET NULL (source_contact_id)` |
| `name`, `email`, `organization` | The **snapshot**. Copied once |
| `normalized_recipient_email` | The fold, for the duplicate rule only |
| `recipient_type` | One of six, CHECK-constrained |
| `is_required` | Whether the workflow waits for this participant |
| `order_index` | Display order. Dense, 0-based |
| `routing_order` | The step. Equal values mean parallel |

Read the absences: no `user_id`, no `email_verified`, no `access_token`, no
`signed_at`, no `email_sent_at`. Each would be a claim LAGDA has not earned.

### Constraints that carry rules

| Constraint | The rule it holds |
|---|---|
| `UNIQUE (workspace_id, preparation_id, normalized_recipient_email)` | One delivery address, one recipient per document — race-safe |
| `UNIQUE (workspace_id, preparation_id, recipient_id)` | The target of the field assignment key |
| FK → `document_preparations` `ON DELETE CASCADE` | A recipient has no meaning outside its preparation |
| FK → `contacts` `ON DELETE SET NULL (source_contact_id)` | A deleted contact forgets provenance and destroys nothing |
| `preparation_fields` FK on three columns, `ON DELETE RESTRICT` | A field names a recipient of its OWN preparation, and an assigned recipient cannot be deleted |

The contact FK's column list is load-bearing and was a real defect before the
integration suite caught it — see [the report](RECIPIENT_REPORT.md).

## Layers

| Layer | File | What it holds |
|---|---|---|
| Contract | `packages/contracts/src/recipients/index.ts` | The six types, the wire shape, the limits |
| Domain | `packages/core/src/recipients/index.ts` | Validation, `RecipientEmailKey`, `canHoldFields`, ordering |
| Ports | `packages/application/src/common/ports/recipients.ts` | `ScopedRecipientRepository`, bound to one workspace |
| Use cases | `packages/application/src/recipients/recipients.ts` | Add, update, remove, reorder, list |
| Adapter | `packages/db/src/repositories/recipients.ts` | Every query scoped by workspace AND preparation |
| HTTP | `packages/api/src/recipients/recipient-routes.ts` | Five routes, nested under the document |

## The API shape, and why it differs from preparation

The layout is a single whole-set `PUT`. Recipients are per-row.

The editor's recipient list is a form with add and remove buttons — not a
drag-and-drop canvas that autosaves. Per-row operations match how it is used,
produce specific errors ("that address is already a recipient", naming the right
row), and avoid the lost-update problem a whole-set replace creates when two
people edit different participants.

Reordering is the exception: it *is* a whole-set operation, so it has a
whole-set route.

```
GET    /workspaces/:w/documents/:d/recipients
POST   /workspaces/:w/documents/:d/recipients
PATCH  /workspaces/:w/documents/:d/recipients/:recipientId
DELETE /workspaces/:w/documents/:d/recipients/:recipientId
PUT    /workspaces/:w/documents/:d/recipients/order
```

`/order` is a fixed sub-path, so it can never be shadowed by a recipient whose
id happens to be `order`.

## Authorization

Reads need `document.view`. Mutations need `document.prepare`. No third
capability was added.

A `recipient.manage` would create a role that may place a signature field but
not say who signs it — not a state the product has a screen for. Naming
participants and placing their fields are one act in the editor, so they are one
capability here (OD-128).

## Concurrency

The layout has a revision because it is replaced wholesale. Recipients do not,
because each operation addresses one row.

| Race | What happens |
|---|---|
| Two adds of the same address | The unique index; one wins, the other gets 409. Proven with two genuinely concurrent transactions |
| Two edits of one recipient | Last write wins, per field. Both are the sender's own edits |
| Rename onto another's address | Checked in the use case, enforced by the index |
| Delete while a field is being assigned | PostgreSQL's foreign-key locking serializes it: whichever commits first, the other fails. The application check is the better message, not the enforcement |

## What this command deliberately did not build

- **Invitation delivery.** No email provider was added. A recipient row says
  where an invitation is *intended* to go.
- **Recipient authentication.** BACKEND-34. There is no column to write it to.
- **Signing state.** BACKEND-37. No `signedAt`, no `declinedAt`.
- **Routing execution.** The plan is stored; who is unblocked when is the
  ceremony's question.
- **Readiness validation.** "Every required field has an assignee" is a rule
  someone must be able to act on, which needs the send flow — BACKEND-32.
