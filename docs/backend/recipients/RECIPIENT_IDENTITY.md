# Recipient identity

A recipient is its own kind of thing. This document says what it is not, and
what stops each confusion from being written.

## The five identities LAGDA now has

| Identity | What it is | Lives in |
|---|---|---|
| `UserId` | An account that can sign in | `users` |
| `WorkspaceMemberId` | An account's membership of one workspace, carrying a role | `workspace_memberships` |
| `ContactId` | An address-book entry. Reusable source material | `contacts` |
| `RecipientId` | A participant in ONE preparation | `preparation_recipients` |
| `ArtifactId` | Bytes. Not a person at all | `document_artifacts` |

They are separate brands. Passing one where another belongs is a compile error,
not a review comment.

## Not a contact

A contact is something a workspace keeps. A recipient is something a document
has.

The relationship is one-directional and one-time: `addRecipient` may **copy**
from a contact, and after that the recipient is its own record.
`source_contact_id` records that the copy happened and nothing more.

What holds it:

- An architecture guard asserts the recipient module reads `uow.contacts`
  **exactly once** (`findById`, in `resolveDetails`) and writes it never.
- The same guard forbids `syncFromContact`, `refreshFromContact`,
  `refreshRecipient` and `relinkContact` in every recipient file.
- `ON DELETE SET NULL (source_contact_id)` means a deleted contact leaves the
  recipient standing with its snapshot intact.

See [RECIPIENT_SNAPSHOT_MODEL.md](RECIPIENT_SNAPSHOT_MODEL.md) for the
consequences and
[CONTACT_RECIPIENT_BOUNDARY.md](../contacts/CONTACT_RECIPIENT_BOUNDARY.md) for
the rule as BACKEND-28 first stated it.

## Not a user

A signer usually has no LAGDA account. Someone signing a lease is a tenant, not
a customer.

LAGDA **never** resolves a recipient email to an account. Doing so would:

- leak user existence — "this address is a LAGDA user" is information the
  sender did not have before;
- imply an authentication that has not happened, since matching an address
  proves nothing about who controls the mailbox;
- create a silent authorization path, where being a member of the workspace
  changed what a recipient could do.

What holds it: **the brands**.

```ts
NormalizedEmail    // packages/core/src/auth/email-identity.ts — authenticates an account
ContactEmailKey    // packages/core/src/contacts/index.ts      — finds duplicate address-book entries
RecipientEmailKey  // packages/core/src/recipients/index.ts    — finds duplicate participants in ONE preparation
```

The same fold — trim and locale-independent lowercase — three meanings, three
mutually unassignable types. So

```ts
findUserByNormalizedEmail(recipient.emailKey)   // does not compile
```

An architecture guard additionally asserts the recipient core module mentions
neither of the other two brand names, and that no recipient file calls
`findByNormalizedEmail`.

## Not a workspace member

The person preparing a document is its **author**. They may also be a signer,
and often are — but that is a recipient they added, not a status they have.

Nothing in this command creates a recipient from a membership, and no route
accepts a `userId` or a `memberId`.

## Not an authenticated identity

An email is a **delivery address**. It says where an invitation is intended to
go. It does not say who reads that mailbox, who opens the link, or who signs.

The backend validates syntax only. It does not check that the mailbox exists,
that anyone reads it, or that the person named controls it.

What holds it: **there is nowhere to write the claim.** No
`email_verified`, no `verified_at`, no `access_token`, no `otp`, no
`authenticated_at` — not on the table, not in the port, not in the contract, not
in a request schema. An architecture guard lists all of them and fails on any.

BACKEND-34 owns recipient authentication. When it arrives, it adds the columns
along with the mechanism that earns them.

## The id itself

`recipient_id` is opaque and server-generated. Explicitly **not**:

| Not derived from | Why |
|---|---|
| The email address | A corrected typo would silently become a different participant |
| The order index | Reordering would reassign every field |
| The contact id | It would make the contact the identity, which is the whole thing this avoids |
| A sequence a client can guess | A caller must not be able to name rows |

The API refuses a client-supplied `recipientId` with 422.

## Cross-preparation and cross-tenant

A recipient id is resolved **through its preparation**, never by id alone. A
real id reached through the wrong document is reported as absent — the same
answer as an id that never existed, so the endpoint cannot be used to discover
which ids are real.

Two independent mechanisms, because they catch different things:

| Mechanism | Catches |
|---|---|
| RLS `tenant_isolation` + FORCE | Another tenant's rows, invisible entirely |
| The three-column field FK | Another **preparation's** recipient — in the SAME workspace, where RLS is no help because both rows are legitimately visible |

The second is the one that needed thought. Tenant isolation is not sufficient
for a within-tenant parent relationship, and a two-column key would have looked
correct.
