# Request-scoped recipient identity

```
Contact                 workspace address book, mutable, reusable
   │ snapshot (BACKEND-31)
   ▼
PreparationRecipient    one preparation, MUTABLE — edit, delete, reorder
   │ snapshot (BACKEND-32)
   ▼
SigningRequestRecipient one request, IMMUTABLE
```

Two snapshots, one after the other, for the same reason applied at two levels.

## Why a new id

A preparation recipient can be **edited**, **deleted**, **reordered**, or
**reused by a second request**. A signing workflow cannot have its participants
change underneath it.

If the request pointed at `preparation_recipients.recipient_id` as its
historical identity:

- deleting that row would orphan a live signing workflow, or the FK would
  refuse the delete and block ordinary editing;
- reusing it in a second request would make two workflows share a participant
  identity;
- BACKEND-34's access credential, BACKEND-37's ceremony state and BACKEND-43's
  evidence would all be bound to a row a sender may remove.

So each snapshot row gets its own `SigningRequestRecipientId` — a distinct brand,
so passing a preparation recipient where a request recipient belongs does not
compile.

## What downstream commands bind to

| Command | Binds to |
|---|---|
| BACKEND-34 | `SigningRequestRecipientId` — access credentials |
| BACKEND-37 | `SigningRequestRecipientId` — ceremony state |
| BACKEND-38+ | `SigningRequestRecipientId` — who signed what |
| BACKEND-43 | `SigningRequestRecipientId` — evidence |

None of them may bind to `RecipientId` or `ContactId`.

## Provenance

`source_preparation_recipient_id` records which preparation recipient the copy
came from. It is:

- **nullable**, and becomes NULL when that recipient is deleted
  (`ON DELETE SET NULL (source_preparation_recipient_id)` — the column list is
  load-bearing, or a composite SET NULL would null `workspace_id` too and make
  the delete fail);
- **never dereferenced** to resolve a name, an email or anything else;
- **not exposed** on the wire. Unlike a preparation recipient's
  `sourceContactId`, which the editor uses to show "from contacts", there is no
  UI reason for a client to know this — and a client that had it would be one
  step from resolving the snapshot back to mutable state.

An architecture guard asserts the read path never touches `uow.contacts`,
`uow.recipients` or `uow.preparations`.

## Contact provenance stops at the preparation

The chain is `Contact → PreparationRecipient → SigningRequestRecipient`, and the
request keeps only the **second** link.

A `source_contact_id` on the request would be a third pointer to the same
person, and it would tempt exactly the join this aggregate exists to prevent.
Reading a signing request must never require a contact to exist. Contact
provenance is available by following the preparation link — for an operator, in
a support case — and by nothing on the read path.

## The duplicate rule travels with the snapshot

`UNIQUE (workspace_id, signing_request_id, normalized_email)`.

Not a new semantic: BACKEND-31 already refuses two recipients sharing an address
on one preparation. A snapshot that relaxed it would let the constraint hold for
the draft and not for the thing actually sent.

`normalized_email` is retained internally for that rule and for BACKEND-34's
comparison. It never leaves the backend.

## What a request recipient still is NOT

Everything [RECIPIENT_IDENTITY.md](../recipients/RECIPIENT_IDENTITY.md) says
about a preparation recipient holds here too, and more strongly:

- **Not a user.** No lookup from a request recipient's address to an account.
- **Not authenticated.** The email is a delivery address. There is no
  `email_verified`, no `access_token`, no `authenticated_at` — no column to
  write the claim to. BACKEND-34 adds them with the mechanism that earns them.
- **Not a contact.** Two snapshots away from one, and reading it requires
  neither.
