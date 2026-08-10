# The contact / recipient boundary

Two records that look almost identical and mean entirely different things.

| | Contact | Signing recipient |
|---|---|---|
| What it is | An address-book entry | Part of a document's evidence |
| Lifetime | Edited and archived freely | Fixed at send time, forever |
| Owner | The workspace's address book | The signing transaction |
| Mutable | Yes | **No** |
| Exists today | Yes (BACKEND-28) | No — BACKEND-30 |

## The rule

> Editing or archiving a contact may never change who a document was sent to,
> what name appeared on it, or any part of the eSignature evidence.

## Why it is structural rather than careful

When BACKEND-30 builds recipients, a recipient must carry a **snapshot** — the
name and email COPIED at send time into the signing record — and must not
reference `contacts.contact_id` as the source of those values.

The difference plays out on an ordinary Tuesday:

> Maria Santos signs an NDA in March. In June she marries and a colleague
> updates her contact to "Maria Santos-Cruz" with a new work address.

With a snapshot, the March document still says Maria Santos at her March
address, which is who signed it. With a reference, the completion certificate
for a document signed in March silently now names someone at an address that
did not exist then — and the audit trail, whose entire purpose is to say what
happened, says something that did not.

The same applies to archiving. A contact leaving the address book must not make
a signed document's recipient disappear or render as "unknown".

Note that a snapshot is not merely a safety measure against edits. It is what
the evidence IS: at the moment of sending, the system asserted "this document is
going to this name at this address", and that assertion has to be preserved
whether or not the address book later agrees with it.

## Today, the boundary holds because there is nothing on the other side

`contacts` has no inbound foreign key. Nothing references it. BACKEND-28 built
the address book and no recipient model, so no edit here can reach evidence.

That is a weak guarantee — it holds by absence — and this document exists so
BACKEND-30 does not have to rediscover the requirement.

## What BACKEND-30 must do

1. **Copy, do not reference.** A recipient row stores `recipient_name` and
   `recipient_email` as values. If a `source_contact_id` column is wanted for
   analytics, it must be nullable, informational, and never read when rendering
   a document or a certificate — and that has to be enforced, not intended.

2. **Use the compound key if it references at all.** Migration 015 already
   carries `UNIQUE (workspace_id, contact_id)` for exactly this. It is redundant
   today — `contact_id` is the primary key — and it is what a tenant-safe
   reference needs:

   ```sql
   FOREIGN KEY (workspace_id, source_contact_id)
     REFERENCES contacts (workspace_id, contact_id)
   ```

   A reference on `contact_id` alone could point at another workspace's contact,
   with nothing but application code to stop it.

3. **Never `ON DELETE CASCADE`, and never `ON DELETE SET NULL`** from a
   recipient to a contact. Neither is reachable today — the runtime role has no
   `DELETE` grant on `contacts` — and both would be a way for address-book
   maintenance to touch evidence.

4. **Add the architecture test.** The one that would have caught the mistake:
   assert no signing or evidence module imports a contact repository, mirroring
   INV-379 for member state.

5. **Do not make archiving conditional on recipient history.** "You cannot
   archive this contact, they are on 12 documents" gets the relationship exactly
   backwards. The evidence is independent of the contact; that is the whole
   point.

## Related invariants

- **INV-379** — mutable role and membership state can never rewrite historical
  signing evidence. Same rule, different mutable state.
- **INV-390** (BACKEND-28) — the contact form of it.
