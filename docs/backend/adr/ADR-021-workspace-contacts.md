# ADR-021 — Workspace contacts as non-identity address-book data

**Status:** Accepted · **Date:** 2026-08-10 · **Command:** BACKEND-28

Builds on [ADR-018](./ADR-018-workspace-tenant-lifecycle.md) (membership as the
tenant edge) and [ADR-020](./ADR-020-workspace-role-capability-authorization.md)
(capability authorization).

---

## Context

LAGDA needs an address book: a sender picking recipients should not retype a
name and an email every time. The frontend has one — a list page, a create form,
a duplicate-review view, archive and restore.

The mechanical part is a tenant-scoped CRUD table, and the patterns for that
were settled in BACKEND-25. The decision worth recording is a different one, and
it is about what a contact must never become.

**A contact is a name and an email somebody typed in. LAGDA has authenticated
none of it.** Not the mailbox, not the name, not consent. But it is shaped
exactly like an identity — same fields, often the same values — and the pressure
to connect the two arrives as one reasonable feature request:

> *"When you add a contact whose email matches a LAGDA user, link them so we can
> show their avatar."*

Accept it, and the contact has a `user_id`. Then `verified: true`, because the
linked account is verified. Then a signer's legal name pre-filled from the
contact. Now a name a colleague typed — possibly a typo, possibly the wrong
Maria Santos — is on legal evidence, and no step in that chain looked wrong on
its own.

For a product whose output is proof of who signed what, that is the failure mode
worth designing out rather than reviewing for.

## Decision

**Contacts are workspace-owned address-book data, structurally separated from
identity, and removed only by reversible archiving.**

1. **No link to identity.** `contacts` has no `user_id`, no `membership_id`, no
   `invitation_id`, no `verified_at`. One foreign key: `workspace_id`.

2. **The comparison key is a distinct BRAND.** `ContactEmailKey` and
   `NormalizedEmail` are the same fold and are mutually unassignable types, so
   `findUserByNormalizedEmail(contact.emailKey)` is a compile error. The column
   is named `normalized_contact_email` so the two cannot be confused by eye
   either.

3. **Archive, never delete.** `archived_at`, and **no `DELETE` grant** for the
   runtime role.

4. **Warn about duplicates, never refuse them.** No unique constraint on the
   email. A create or update succeeds and reports the collisions.

5. **Four capabilities in the BACKEND-27 policy**, held by the four roles the
   product grants `manage_contacts`.

6. **Ordinary tenant isolation.** `tenant_isolation` RLS with `FORCE`, and no
   new transaction scope.

## Alternatives considered

### Link a contact to a matching user account

The request that will actually be made, so it deserves the most space.

Rejected. The linkage is unverifiable in the direction it would be used: knowing
that `maria@ayalaland.com.ph` is both a contact and a LAGDA account does not
establish that the person in the address book is the person who owns the
account, or that either is the person who will sign. Two people share a shared
inbox; a departing employee's address is reassigned; a colleague types the wrong
Maria Santos.

The avatar is worth having and does not need a stored link. If a display layer
wants one, it can be resolved at render time, in a read path, with no persisted
claim — and then the system never asserts a relationship it cannot support.

The `ContactEmailKey` brand is what makes the rejection durable. A rule in a
document survives until someone has a deadline; a type error survives.

### A unique constraint on `(workspace_id, email)`

The obvious data-modelling instinct, and wrong twice.

The product contradicts it: `findDuplicates` returns *candidates*, there is a
`duplicates` view and a `review-duplicate` action. Every one is detection, none
is prevention, and a backend that refused the second contact would break the
screen whose purpose is showing you the duplicates you have.

And duplicates are frequently correct. `legal@reyesandco.ph` is one mailbox and
several business relationships. Uniqueness would force a user to leave a real
person out of their own address book, and the workaround they would reach for —
`legal+maria@` — puts a fake address on a legal document.

An architecture test asserts the constraint's absence so it cannot arrive later
as a tidy-up.

### Hard delete

Rejected on three counts. The product has no delete action. A contact may be the
source of a recipient on a signed document — the snapshot means deletion would
not corrupt the evidence, but it would destroy the workspace's own record of who
they had been dealing with, on a platform whose product is proof. And reversible
removal costs one nullable timestamp.

Enforced at the database rather than by convention: no `DELETE` grant, so
erasure is unavailable to application code even by mistake. Data Privacy Act
erasure is a deliberate compliance operation with its own authority and audit
trail (OD-110), not this button.

### A `status` column instead of `archived_at`

Rejected for the reason ADR-019 rejected it for invitations: two representations
of one fact drift, and the denormalised one is always the one that drifts. Here
the derivation is a null check, which makes a status column purely a way to be
wrong.

### `scope: personal | workspace` with an `ownerId`

The frontend models it, so this is the alternative with real product evidence
behind it.

Deferred. It is a **second ownership axis layered over tenancy**, and the
capability model has no vocabulary for "mine, within this workspace". Is a
personal contact visible to the owner? Editable by an administrator? What
happens when its creator is removed from the workspace? None has a product
answer, and shipping it would mean inventing an authorization rule here rather
than reading one — which is precisely the mistake BACKEND-27 was written to
correct. **OD-107.**

Every contact is workspace-scoped. Adding a scope later is a nullable column and
a policy decision; removing one that people have used is a data migration and a
conversation.

### E.164 phone normalization

Rejected. It needs a default region, mangles `loc. 210`, and rejects a landline
written the way its owner writes it. Nothing in LAGDA dials a contact, so the
strictness buys nothing and loses data. Free text with a generous bound.

### A `contacts:read` capability separate from `contacts:write`

Rejected as finer than the product. `manage_contacts` is one permission, and it
is also the navigation gate — a role without it cannot reach `/app/contacts` at
all, so a read-only projection would grant something the product does not.

The four capabilities are still declared separately, and an architecture test
asserts they travel together (every role holds 0 or 4). The split costs nothing
now and is what makes the first product change that differentiates them a
one-line edit rather than a breaking change to a capability clients branch on.

### PATCH with partial semantics

Rejected. Absent-means-unchanged cannot express "clear the phone number" without
a null that means something different from absent, and that ambiguity is what
makes partial-update APIs subtly wrong. PUT is unambiguous, naturally
idempotent, and matches the product's form, which submits every field.

The repository port keeps the partial shape internally — it is the right
vocabulary for a `SET` clause — and distinguishes absent from null explicitly.

## Consequences

**Good.** A contact cannot become an identity, and the strongest guarantee of
that is a type error rather than a paragraph. A contact cannot be erased by
ordinary application code. Duplicate handling matches what the product's own
screens are for. Four capabilities slot into an existing policy with no new
mechanism, and their role assignment is read from the product rather than
guessed. Tenancy needed no new machinery at all — the third consecutive command
to reuse `tenant_isolation` unchanged.

**Costs.** Two email columns per contact, one of which never leaves the backend.
No uniqueness means an application-level warning path on every create and
update, which is one extra indexed read per write. Archived contacts accumulate
with no retention policy. And PUT semantics mean a client that omits `phone`
clears it — correct, unambiguous, and a real trap for a hand-written client.

**A consequence worth stating loudly.** LAGDA now stores personal data about
people who are not its users, did not consent, and do not know the record
exists — and has **no erasure operation at all**. Archiving is a timestamp; the
runtime role cannot delete. A data-subject request under the Data Privacy Act
would reach the workspace as controller, who would find that archiving is the
strongest thing their software can do.

That is coherent with the design and it is a real gap. **OD-110**, and the
highest-priority thing this command leaves open.
