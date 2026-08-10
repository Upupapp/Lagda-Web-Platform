# Contacts are not identities

The single most important document in this folder. Everything else in
BACKEND-28 is an ordinary CRUD domain; this is the part that would be expensive
to get wrong.

## The claim

> A contact is a name and an email address somebody typed into an address book.
> LAGDA has authenticated none of it.

Not the mailbox — nobody sent a confirmation. Not the name — nobody checked it
against an identity document. Not consent — the person at that address was never
asked and never agreed to anything.

## Why it matters here specifically

LAGDA's product is proof. A completion certificate says who signed. If
address-book data could quietly become identity data, the chain from "someone
typed a name into a form" to "this person signed this document" would have no
link in it where anybody verified anything.

The failure is not hypothetical, and it is not exotic. It is the natural
consequence of one reasonable-sounding feature request:

> *"When you add a contact whose email matches a LAGDA user, link them so we can
> show their avatar."*

Accept that, and a contact now has a `user_id`. The next request adds
`verified: true` because the linked account is verified. The one after that
pre-fills a signer's legal name from the contact. Now a name a colleague typed —
possibly a typo, possibly out of date, possibly the wrong Maria Santos — is
appearing on legal evidence.

## The four enforcement layers

### 1. The schema has no link

`contacts` has no `user_id`, no `membership_id`, no `invitation_id`, no
`verified_at` and no `account_id`. Exactly **one** foreign key: `workspace_id`.

An architecture test reads migration 015 and asserts each of those column names
is absent, plus that there is exactly one `addForeignKeyConstraint`.

### 2. The types make the account lookup uncompilable

This is the strongest guarantee in the domain, because it does not depend on
anyone reading this document.

```ts
// @lagda/application — the ACCOUNT identity key.
export type NormalizedEmail = string & { readonly __brand: "NormalizedEmail" };

// @lagda/core/contacts — the CONTACT comparison key.
export type ContactEmailKey = string & { readonly __brand: "ContactEmailKey" };
```

Two brands, mutually unassignable. So:

```ts
findUserByNormalizedEmail(contact.emailKey)   // ← a type error
```

"Look up the LAGDA account behind this contact" is not a discouraged call. It is
a call that does not compile.

The two folds are byte-for-byte identical — trim, then lowercase — and that is
the point of separating them by TYPE rather than by value. Nothing about the
string distinguishes them; only the brand does.

### 3. The contact module cannot reach an identity repository

`packages/application/src/contacts/contacts.ts` touches exactly one repository:
`uow.contacts`. It reads exactly one membership row —
`uow.memberships.findByUser(actor.userId)` — to resolve **the actor's own**
authority, which is the same thing every workspace operation does.

An architecture test asserts the module contains no `uow.invitations`, no
`memberships.insert`, no `memberships.changeRoleIfUnchanged`, no
`memberships.removeIfRole`, and no `findByNormalizedEmail` / `normalizeEmail` /
`assertNormalized` / `NormalizedEmail` anywhere in the contact files.

### 4. Behaviour is asserted, not assumed

Two unit tests state the claim as an outcome rather than a structure:

- creating a contact leaves the membership list, the invitation list and the
  invitation-digest map untouched;
- **creating a contact whose email is a real LAGDA user's — a user who is a
  member of this very workspace — still creates nothing.** No link, no
  notification, no promotion, and not even a duplicate warning, because an
  account is not a contact.

## What LAGDA never does with a contact address

| Never | Why |
|---|---|
| Look up whether it belongs to a user | The type error above |
| Create an account from it | A contact did not register or accept terms |
| Send it a workspace invitation | Being in someone's address book is not being invited |
| Email it at all | Nobody consented; and no delivery infrastructure exists anyway (OD-003) |
| Treat it as verified | Nothing verified it |
| Use it to authenticate anyone | It is display text |

## The one thing a contact address IS used for

Duplicate detection and exact-match search, within one workspace, through
`normalized_contact_email`. That column is deliberately **not** named
`normalized_email`: at a call site the two would be indistinguishable, and
`users.normalized_email` is an authentication identity with a unique constraint
and entirely different guarantees. There is no unique constraint on the contact
one.

The folded key never leaves the backend. `ContactSummary` and the HTTP response
both omit it, asserted by a test that pins the exact key set of the response
body. A client that received it would eventually compare it to something.

## Related

- [CONTACT_RECIPIENT_BOUNDARY.md](./CONTACT_RECIPIENT_BOUNDARY.md) — the other
  half: why editing a contact cannot rewrite signing evidence.
- [CONTACT_DATA_CLASSIFICATION.md](./CONTACT_DATA_CLASSIFICATION.md) — what a
  contact record is, as personal data.
- `docs/backend/auth/EMAIL_IDENTITY.md` — the account-identity rules this
  document is defined against.
