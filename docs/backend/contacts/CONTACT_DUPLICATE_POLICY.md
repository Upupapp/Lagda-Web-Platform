# Contact duplicate policy

**LAGDA warns about duplicate contacts. It never refuses them.**

## The three options, and why the middle one is wrong

| | Behaviour | Verdict |
|---|---|---|
| **A. Prevent** | `UNIQUE (workspace_id, normalized_contact_email)`; the second create fails with 409 | Rejected |
| **B. Allow silently** | No constraint, no warning | Rejected |
| **C. Warn and allow** | No constraint; the write succeeds and reports the collisions | **Chosen** |

### Why not prevent

**The product does not.** `contacts.service.ts` has `findDuplicates(name, email,
excludeId)` returning *candidates*, `getDuplicateCandidates`, a `duplicates`
list view, and a `review-duplicate` user action. Every one of those is
detection. None is prevention. A backend that refused the second contact would
break a screen whose reason for existing is to show you the duplicates you have.

**And duplicates are frequently correct.** A shared inbox is one mailbox and
several business relationships:

- `legal@reyesandco.ph` — the managing partner and the paralegal who both work
  from it;
- `contracts@ayalaland.com.ph` — a department, not a person;
- `admin@` at a small firm — often literally everyone.

A uniqueness rule would force a user to choose which real person to leave out of
their own address book. And the workaround they would reach for — inventing
`legal+maria@reyesandco.ph` — puts a fake address on a legal document.

### Why not allow silently

Most duplicates are mistakes: the same counterparty added twice by two
colleagues who did not check. Silence means a sender picks one of two records
and never learns the other exists.

### What C looks like

A create or update returns **201/200 with the record**, plus a `duplicates`
array of the other active contacts sharing the address:

```json
{
  "contact": { "contactId": "con_...", "name": "Legal Team PH", "...": "..." },
  "duplicates": [
    { "contactId": "con_...", "name": "Legal Desk", "organization": "Acme" }
  ]
}
```

**Not 409.** The contact was created; reporting a conflict would tell a client
the write failed when it did not, and a client that retried would create a
third.

The warning carries three fields — id, name, organization — and **no email**.
The caller just typed the address; returning it adds nothing, and a warning
payload must not become a way to read contact records one at a time.

## Matching rules

| Rule | Behaviour |
|---|---|
| Compared on | `normalized_contact_email` only |
| Fold | Trim, then lowercase. Nothing else |
| Case | `Legal@Example.com` and `legal@example.com` collide |
| Dots | `john.smith@` and `johnsmith@` are **different** |
| Plus tags | `billing+ph@` and `billing+sg@` are **different** |
| Archived | Excluded |
| Self, on update | Excluded via `excludeContactId` |
| Other workspaces | Never visible — RLS, and the repository is scoped |

**Name is not part of the match.** The product's `findDuplicates` takes both
name and email; the backend compares only the address. Two people can share an
inbox and have different names, and two records for one person routinely have
"Ma. Concepción Reyes-Villanueva" and "Connie Reyes". Fuzzy name matching is a
guess, and a guess in a warning is a warning people learn to dismiss.

**Dots and plus-tags are preserved deliberately.** Gmail treats
`john.smith@gmail.com` and `johnsmith@gmail.com` as one mailbox; most providers
do not. Folding them would report two contacts as duplicates when they may be
two different people at a domain that distinguishes them. `billing+ph@` and
`billing+sg@` are the clearer case: someone created those tags precisely to keep
two things apart.

The same conservatism, and the same reasoning, as account identity — see
`docs/backend/auth/EMAIL_IDENTITY.md`. There the stakes are higher (folding two
mailboxes into one account is an account-takeover primitive); here it is quieter
and still wrong.

**Archived contacts are excluded** because a warning about a record nobody can
select is noise about something that is not in the address book.

## There is no unique constraint, and that is asserted

An architecture test asserts migration 015 contains no unique index over
`normalized_contact_email`, and an integration test inserts two active contacts
with the same address and expects it to succeed. Both exist so the constraint
cannot arrive later as a tidy-up by someone who has not read this page.

A consequence worth stating: **there is no concurrency hazard here to test.**
Two simultaneous creates of the same address both succeed, which is the intended
outcome. The "concurrent duplicate creation" case that BACKEND-26 needed for
invitations is N/A for contacts, and the test matrix says so rather than
claiming a pass.

## Merge is not implemented

The product's action is named `merge-demonstration`, which is the product saying
it is not real. Merging is destructive, has to decide which record's history
survives, and would be the one operation in this domain capable of touching a
record a document was sent from. It needs a product answer that does not exist.
**OD-111.**
