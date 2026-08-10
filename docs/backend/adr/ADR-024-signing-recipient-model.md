# ADR-024 — The signing recipient model

**Status:** Accepted (BACKEND-31)
**Date:** 2026-08-10
**Supersedes in part:** ADR-023's participant slot
**Related:** ADR-021 (contacts), ADR-022 (document vs artifact identity),
ADR-023 (preparation model)

## Context

BACKEND-30 could place a signature field but could not say who signs it. It left
`preparation_fields.participant_slot`: a nullable, bounded, opaque string with
no foreign key, mirroring the editor's local `"P1"` labels. Nothing
dereferenced it.

BACKEND-31 has to give that a real referent, and in doing so decide what a
signing participant *is* — a question with four plausible wrong answers already
present in the schema.

## Decision

### 1. A recipient is its own identity, scoped to one preparation

Not a `ContactId`, not a `UserId`, not a `WorkspaceMemberId`. A new
`preparation_recipients` table with an opaque, server-generated `recipient_id`,
belonging to exactly one `document_preparation`.

Scoped to the preparation rather than the document because a document may back
more than one signing request over its life, and the two sets of parties are not
one list.

### 2. Name, email and organization are a SNAPSHOT

Copied at creation — from a contact or typed — and never dereferenced again.
`source_contact_id` is provenance only, and `ON DELETE SET NULL
(source_contact_id)` leaves the recipient standing when the contact goes.

A live reference would let an unrelated address-book edit rewrite who signed a
document in March.

### 3. An email is a delivery address, not an identity

No lookup from a recipient email to a LAGDA account, ever. Enforced by a third
email brand — `RecipientEmailKey`, beside `NormalizedEmail` and
`ContactEmailKey` — so the cross-domain call does not compile.

No `email_verified`, no token, no `authenticated_at`: there is nowhere to write
the claim. BACKEND-34 adds the columns with the mechanism that earns them.

### 4. Duplicates are REFUSED, unlike contacts

`UNIQUE (workspace_id, preparation_id, normalized_recipient_email)`. Two
invitations to one mailbox for one document is a correctness problem, not an
untidy address book.

### 5. Field assignment is constrained on THREE columns

`(workspace_id, preparation_id, recipient_id)`. Tenant isolation cannot catch a
field naming another *preparation's* recipient — both rows are legitimately
visible to the same tenant.

`ON DELETE RESTRICT`, never cascade: removing the wrong party must not silently
destroy positioned signature blocks.

### 6. No new capability

`document.view` to read, `document.prepare` to change — the same two as the
layout.

## Alternatives rejected

**Reference the contact instead of copying.** Rejected: it makes a legal record
mutable by an address-book edit, and it forces every signer to exist in the
address book first.

**Reuse `ContactId` as the participant identity.** Rejected for the same reason,
plus it conflates "someone we know" with "someone signing this". ADR-021 already
drew that line; this is its second consumer.

**Resolve the recipient email to a `UserId` when one matches.** Rejected on
three grounds: it leaks user existence to the sender, it implies an
authentication that has not happened, and it creates a silent authorization path
where workspace membership changes what a recipient can do.

**A `recipient.manage` capability.** Rejected: it would create a role that may
place a signature field but not name who signs it — not a product state
(OD-128).

**Warn on duplicates, as contacts do.** Rejected: the consequence is different.
See RECIPIENT_DUPLICATE_POLICY.md.

**Cascade field deletion when a recipient is removed.** Rejected: silent
destruction of positioned work with no undo.

**Keep `participant_slot` alongside `recipient_id` for the editor.** Rejected:
two ways to say who fills a field is one too many, and the second would drift.

**Sparse ordering (10, 20, 30).** Rejected: recipients are not reordered by
single-row updates, so the argument for gaps does not apply, and gaps drift
until the numbers stop meaning anything.

**A whole-set `PUT` for recipients, matching the layout.** Rejected: the
editor's recipient list is a form, not an autosaving canvas. Per-row operations
give specific errors and avoid a lost-update problem. Reorder is the one
whole-set operation and has a whole-set route.

## Consequences

**Good**

- A signed document keeps saying who signed it, whatever happens to the address
  book afterwards.
- Three email brands make the identity boundary a compile error rather than a
  review comment.
- Cross-preparation assignment is refused by the database, independently of any
  application check.
- The address book stays optional: a sender can type a participant without
  growing it.

**Costs**

- Correcting a person's details in two places when they are both a contact and a
  live recipient. This is the price of the snapshot and is accepted.
- One more table on the tenancy surface, with its own RLS policy and grants.
- Recipients are unversioned while the layout is revisioned. Two people editing
  the same participant is last-write-wins per field. Both are the sender's own
  edits, so a revision would add ceremony without preventing loss.

**Left open**

- OD-127 — readiness validation belongs to the send flow.
- OD-128 — recorded as decided-for-now, revisit if the product grows a distinct
  "manage recipients" permission.
- OD-110 — individual erasure now has a second place to reach, and a
  `SET NULL` that deliberately does not cascade into it.
