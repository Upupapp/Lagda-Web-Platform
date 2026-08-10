# Recipient data classification

A recipient row is the **name and email address of a party to a legal
agreement**. That is more sensitive than a contact — a contact says someone is
in an address book; a recipient says they are signing a specific document.

## The fields

| Field | Class | May appear in a log? | A metric label? |
|---|---|---|---|
| `name` | Personal data | **Never** | Never |
| `email` | Personal data, and a delivery address | **Never** | Never |
| `normalized_recipient_email` | Personal data. Also internal | **Never** — and never leaves the backend at all | Never |
| `organization` | Personal / commercial | **Never** | Never |
| `source_contact_id` | Pseudonymous handle for a person | **Never** — a boolean `fromContact` instead | Never |
| `recipient_id` | Pseudonymous handle for a participant | Yes, in a per-operation line | Never — unbounded |
| `recipient_type` | Vocabulary term, 6 values | Yes | **No** — see below |
| `is_required`, `order_index`, `routing_order` | Structural | Yes, in aggregate | No |
| `workspace_id`, `document_id` | Tenancy and subject | Yes | No — unbounded |

## What is actually logged

Four events, each with counts, ids and vocabulary only.

```
document.recipient.added      recipientId, recipientType, fromContact (boolean)
document.recipient.updated    recipientId, changedFields (sorted key names)
document.recipient.removed    recipientId
document.recipient.reordered  recipientCount
```

Reads are not logged at all. The editor polls the list alongside the layout, and
a line per poll would be noise that also records how often a document is being
worked on.

Three decisions worth naming:

**`fromContact` is a boolean, not the contact id.** A contact id identifies the
person as surely as the address would — it is a stable handle that, joined
against the contacts table, is a name.

**`changedFields` is key names, never values.** "The name was corrected" is an
operational fact. The name is a party to a contract.

**The reorder line carries a count, not the ids.** A recipient id is a stable
pseudonymous handle per party; a log that carries the full ordered list across
every reorder builds a participation graph out of what is supposed to be
structural telemetry.

The route tests assert the whole serialized line, not individual keys, so a
nested field is caught. They inject a real name and address as fixtures and
assert neither reaches the log.

## Why `recipient_type` is a log field but not a metric label

It is bounded — six values — so cardinality is not the objection.

Crossed with `operation` and `result` it multiplies the series count for a
question ("do senders actually use approvers and viewers?") that a product query
answers better and more precisely. Metrics are for operational health; the type
belongs in the log line, where it is read once and in context.

`document_recipient_operations_total` carries `operation`, `result`,
`processRole` and nothing else. An architecture guard pins the label set.

## The API surface

The wire shape excludes:

| Absent | Why |
|---|---|
| `normalizedEmail` / `emailKey` | Internal. A client that had it would eventually compare it to a user's address and conclude something about identity |
| `userId`, `isRegisteredUser` | A recipient is never resolved to an account. Returning one would leak user existence |
| `emailVerified`, `verifiedAt`, `authenticatedAt` | Claims LAGDA has not earned |
| `accessToken`, `otp` | Not issued by this command; a token in a list response is a token in a browser cache |
| `signedAt`, `viewedAt`, `declinedAt`, `emailSentAt` | Ceremony state that does not exist |
| `workspaceId`, `preparationId` | Both in the URL. Echoing tenancy into a body invites a caller to read it off a record |

A test serializes a real response and asserts each string is absent.

Every route sends `Cache-Control: no-store` and `Pragma: no-cache`. A recipient
list is the parties to a contract; it does not belong in a shared cache or a
browser's back-forward store.

## At rest and in transit

- The table is workspace-scoped with `tenant_isolation` and `FORCE ROW LEVEL
  SECURITY`, probed as the runtime role.
- The runtime role holds no `BYPASSRLS` and is not a superuser; the integration
  suite reads `pg_roles` and asserts both.
- Every route sits inside the authenticated scope, so it inherits session
  validation and CSRF from **where it is registered** rather than from a
  per-handler check.
- Nothing is sent anywhere. No email provider was added, and an architecture
  guard asserts no recipient file calls `sendEmail`, a mailer or a job queue.

## Retention and erasure

Recipients are deleted with their preparation (`ON DELETE CASCADE`), and a
preparation with its document.

An individual erasure request — "remove me from this workspace's records" — is
still OD-110, unchanged and unresolved. What BACKEND-31 adds is a second place
such data lives, and the `SET NULL` on `source_contact_id` means erasing a
*contact* would not cascade into recipients. That is correct for record
integrity and is exactly the tension OD-110 has to resolve: a signed agreement's
parties are a legal record, and a right to erasure meets a retention obligation
there.

BACKEND-31 does not resolve it, and does not pretend to.
