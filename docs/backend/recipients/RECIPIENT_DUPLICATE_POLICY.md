# The recipient duplicate policy

**One delivery address, one recipient, per preparation. Refused, not warned.**

## The decision

BACKEND-28 decided the opposite for contacts: a duplicate address-book entry
produces a **warning alongside a successful create**, never a refusal.

The two decisions differ because the two problems differ.

| | Duplicate contact | Duplicate recipient |
|---|---|---|
| What it is | Two entries for one person in an address book | Two invitations to one mailbox for one document |
| Consequence | Untidiness. The sender picks the wrong one occasionally | The recipient receives two links, holds two signing positions, and cannot tell which one they are |
| Legitimate? | Yes — a shared `info@` address, two people at one firm, a person recorded twice by two colleagues | No coherent reading |
| Answer | Warn | **Refuse** |

The deciding question is whether a correct system could produce the state. Two
contacts sharing an address is something a careful user might genuinely want.
Two participants in one agreement sharing a mailbox is not a thing anyone means.

## The scope of the rule

**Per preparation.** Not per workspace, not per document across time.

One person signs many contracts. The same address appearing on a different
document is normal and permitted, and the unique index includes
`preparation_id` for exactly that reason.

## The comparison

The folded key: trimmed, lowercased with a fixed `en-US` locale.

Deliberately **not** normalized further:

- **No Gmail dot-stripping.** `j.dela.cruz@` and `jdelacruz@` compare as
  different. Dot-equivalence is a Gmail convention, not an internet rule, and
  applying it universally would refuse a second legitimate recipient at a
  provider that treats dots as significant.
- **No plus-tag removal.** `juan+lease@` and `juan@` compare as different. Tag
  stripping merges mailboxes different people may control — a shared corporate
  address with per-department tags is a real arrangement.

Both aggressive folds fail in the same direction: they refuse someone who should
be allowed to sign, and they do it with an error the sender cannot act on.

The **display** address is stored separately and unmodified. An invitation goes
to what was typed; rewriting a delivery address to satisfy a comparison would be
changing where mail goes.

Locale is pinned because `toLowerCase()` varies with the ambient locale for a
few characters. A comparison key that changes with the server's locale finds
different duplicates on different machines.

## Where it is enforced

Two places, doing two different jobs.

**The unique index** `UNIQUE (workspace_id, preparation_id,
normalized_recipient_email)` is the enforcement. It is what makes the rule hold
under concurrency: two simultaneous adds of one address both pass an application
check and one fails on commit. The integration suite runs two genuinely
concurrent transactions and asserts exactly one survives.

**The application check** is the message. Without it a sender gets a constraint
violation; with it they get "This document already has a recipient with that
email address."

Both cases produce the same `DuplicateRecipientError`, so a caller cannot tell
whether they lost a race.

## Editing counts

The rule applies to `PATCH` exactly as to `POST`. Without that it is bypassed
trivially — add with one address, rename to another's.

The check excludes the row being edited, or correcting a name would be refused
for clashing with itself.

## The error names no address

`DuplicateRecipientError`'s message contains no email, and a test asserts it.

This is the one place an error would echo a participant's contact details back
to whoever typed them — and in a product where a "recipient" is a party to a
legal agreement, an error page is not where that belongs. The sender already
knows the address they just entered; the message does not need to repeat it, and
an error surfaced in a screenshot, a support ticket or a log should not carry
it.

## HTTP

`409 Conflict`, code `duplicate_recipient_email`. Not 422: the request is
well-formed and the conflict is with server state.

## What is deliberately not deduplicated

- **Names.** Two people can be called Juan dela Cruz. Refusing the second would
  be absurd.
- **Organizations.** Several parties routinely act for one company.
- **Across documents.** Covered above; it is the normal case.
- **Against the address book.** A recipient whose address matches a contact is
  the *expected* case — that is what the contact path produces.
- **Against `users`.** A recipient is never compared to an account. See
  [RECIPIENT_IDENTITY.md](RECIPIENT_IDENTITY.md); the brands make it a compile
  error.
