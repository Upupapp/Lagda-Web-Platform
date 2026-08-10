# Field assignment

BACKEND-30 left `preparation_fields.participant_slot`: an opaque editor label
with no foreign key, because there was nothing to point at. Migration 018 drops
it and adds a real `recipient_id`.

Two ways to say who fills a field is one way too many, so the slot is gone
rather than deprecated. An architecture guard asserts `participantSlot` appears
nowhere in the preparation use cases, the schema or the routes.

## The three-column foreign key

```sql
alter table preparation_fields
  add constraint preparation_fields_recipient_fk
  foreign key (workspace_id, preparation_id, recipient_id)
  references preparation_recipients (workspace_id, preparation_id, recipient_id)
  on delete restrict
```

Three columns, and the third is the interesting one.

Tenant isolation cannot make this check. Two preparations in one workspace are
both visible to RLS — legitimately, they belong to the same tenant — so nothing
about tenancy stops a field on document A naming a recipient of document B. A
two-column key `(workspace_id, recipient_id)` would look correct and permit
exactly that.

The integration suite asserts it directly: a recipient created on the *other*
preparation of the *same* workspace, assigned to a field on the first, is a
foreign-key violation.

## The application check, beside the constraint

`saveDocumentPreparation` reads the preparation's own recipients inside the
transaction and validates each field's `recipientId` against them.

It exists for the message. A caller gets

```
fields[3].recipientId: unknown
```

rather than a constraint violation, and gets it alongside every other problem in
the layout, since validation reports all issues at once.

The constraint is what makes it race-safe. A recipient deleted between the read
and the insert makes the insert fail, so the check is a better error rather than
the enforcement.

## Which recipients may hold fields

`viewer` and `carbon-copy` may not. The other four may.

This is the product's answer, not an invention: `FIELD_ELIGIBLE_ROLES` lists
neither for any field type, and the role descriptions say why — both "do not
block completion". A viewer with a required signature field would be a
participant the workflow simultaneously waits for and does not.

Which *specific* field types each of the other four may hold is a finer question
the product answers per type. BACKEND-37 will need it when it knows what an
approver's approval does. Today the coarse rule is the one that can be enforced
honestly.

`canHoldFields` is a total function over the six types, and a test asserts
exactly four pass — so a seventh type cannot be added without a decision.

## Unassigned is allowed

`recipient_id` is nullable. The editor permits placing a field before deciding
who fills it, and refusing that would make the canvas unusable.

`fieldRequiresRecipient` says every implemented field type needs an assignee
**at readiness** — all nine ask a participant for something, and `sender-text`
was deferred precisely because it is sender-filled.

Readiness itself is not enforced here. "Every required field has an assignee" is
a rule someone must be able to act on, which means it belongs to the send flow —
BACKEND-32. Enforcing it at save time would block the ordinary act of building a
layout.

## Changing a recipient's type

Demoting a signer that holds fields to a `viewer` is **refused**, with the
count, not silently applied.

The alternative is a preparation containing fields assigned to a participant who
may not hold them — a state nothing else in the system expects, discovered later
by whatever tries to render or send it.

## Deleting a recipient

`ON DELETE RESTRICT`, not `CASCADE`.

A cascade would silently destroy placed work. A sender who removes the wrong
party loses the signature blocks they spent an afternoon positioning, with no
undo and no message.

The refusal carries the count, so the sender knows what to clear:

```
RecipientHasFieldsError { assignedFields: 3 }
```

`409`, code `recipient_has_assigned_fields`.

The application counts first for the message; the constraint refuses a field
assigned between the count and the delete. PostgreSQL's foreign-key locking
serializes the two directions properly: whichever of "assign a field" and
"delete the recipient" commits first, the other fails.

## After a successful delete

The remaining recipients are renumbered densely — removing the second of four
leaves 0, 1, 2 rather than 0, 2, 3.

Sparse numbering would still sort correctly. It would also drift further apart
with every deletion until the numbers stopped meaning anything, and there is no
argument for gaps here: recipients are not reordered by single-row updates.

Only rows whose index actually changes are written, so `updated_at` stays honest
for the rest.

## Display order is not routing order

Two separate columns, and reordering the list touches only the first.

`order_index` is how the editor lists participants. `routing_order` is who waits
for whom. Equal routing values mean **parallel within a step** — the meaning has
to be stated because a reader could as easily assume a conflict.

Reordering a list for readability must not silently rewrite the signing
sequence, so `PUT /recipients/order` changes `order_index` alone, and a test
asserts a recipient's `routingOrder` survives a reorder.

Routing orders need not be contiguous. Deleting the only recipient at step 2
leaves 1 and 3; refusing to save that would block ordinary editing to enforce
tidiness. What a gap means for the ceremony is BACKEND-37's question.
