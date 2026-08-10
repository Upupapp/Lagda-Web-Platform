# Contact data classification

A contact record is **personal data about someone who is not a LAGDA user**.

That is what makes this domain different from every other one in the backend so
far. A user's own profile is data they gave us about themselves. A contact is
data a third party gave us about a fourth party — a counterparty who never
visited LAGDA, never agreed to terms, and does not know the record exists.

Under the Philippine Data Privacy Act of 2012, the workspace is the personal
information controller for its address book and LAGDA is a processor. LAGDA is
not the party with the lawful basis; it is the party that must not make things
worse.

## The record

| Field | Classification | Handling |
|---|---|---|
| `contact_id` | Internal identifier | Safe in logs and URLs. Opaque, no meaning |
| `workspace_id` | Tenant identifier | Safe in logs. Never in a response body |
| `name` | **Personal data** | Response only. Never a log field, never a metric label |
| `email` | **Personal data** | Response only. Never a log field, never a metric label |
| `normalized_contact_email` | **Personal data, internal** | Never leaves the backend at all |
| `phone` | **Personal data** | Response only |
| `organization` | Business data | Response only. Treated as personal because it is attached to a named individual |
| `title` | Business data | Same |
| `created_at`, `updated_at`, `archived_at` | Operational | Safe |

Nothing here is **sensitive personal information** as the DPA defines it (health,
genetics, offences, government identifiers). A name and a work email are
ordinary personal information — which still has obligations, just not the
heightened ones.

## Where a contact's details may appear

**Response bodies**, to a caller holding `contact.view` in that workspace. Four
of the seven roles.

**Nowhere else.** Specifically not:

| Never | Why |
|---|---|
| Application logs | Retained centrally, read widely, hard to redact after the fact |
| Metric labels | Retained longer than logs, read by more people, and unbounded cardinality besides |
| Error messages | They reach logs, error reporting, and sometimes a user's screenshot |
| Cache headers / URLs | `contact_id` is in the path; no field ever is |
| Another workspace | RLS, plus a scoped repository |

Validation issues name a field and a reason — `email: too-long` — and never the
value. Tested: a rejected over-long address does not appear in the error's
message or its issue list.

The duplicate warning carries id, name and organization, and deliberately **no
email**. The caller just typed the address, so returning it adds nothing, and a
warning payload must not become a way to read contact records one at a time.

## Enforcement

| Control | How |
|---|---|
| Tenant isolation | `tenant_isolation` RLS with `FORCE`, plus a scoped repository with no workspace parameter. Proved as the runtime role |
| Capability gate | `contact.view`, held by four roles. Read is refused to the other three |
| No PII in logs | Architecture test scans every `record(request, …)` payload for a contact field name; behavioural test serializes a real log line and asserts the fixture's name, email, phone, organization and title are absent |
| No PII in metrics | Architecture test pins the label set to `operation`, `result`, `processRole` |
| Comparison key never leaves | A response-shape test pins the exact key set of the body |
| No caching | Every handler sets `no-store`; asserted by counting handlers against `noStore` calls |
| No account linkage | Four layers — see [CONTACT_IDENTITY.md](./CONTACT_IDENTITY.md) |

## Retention and erasure

**Retention: indefinite, and reversible removal only.** Archiving is a
timestamp; the row survives. The runtime role cannot delete a contact at all.

**This is a deliberate open gap, not an oversight.** A data subject — the
contact, not the LAGDA user — may request erasure under the DPA, and LAGDA
currently has no operation that satisfies it. The request would reach the
workspace (the controller), who would find that archiving is the strongest thing
their software can do.

That is **OD-110**, and it is the highest-priority gap BACKEND-28 leaves. What a
real erasure operation needs, none of which exists:

- an authority model — a workspace administrator, or a LAGDA platform operator
  acting on a verified request?
- an audit trail of the erasure that does not itself retain what was erased;
- a decision about signing evidence. A contact who signed a document appears in
  that document's recipient snapshot, and eSignature evidence has a legitimate
  competing basis for retention. Erasing the address-book entry must not, and
  need not, touch it — see
  [CONTACT_RECIPIENT_BOUNDARY.md](./CONTACT_RECIPIENT_BOUNDARY.md);
- a `DELETE` grant, which is currently and deliberately absent.

Erasure is a compliance operation with its own command, not a button on the
contact page.

## What LAGDA never does with contact data

- Email it. No delivery infrastructure exists (OD-003), and consent was never
  obtained regardless. Adding a contact notifies nobody.
- Cross-reference it against user accounts. Structurally impossible — the
  `ContactEmailKey` brand makes the lookup a type error.
- Share it across workspaces, including between two workspaces of one customer.
- Use it for analytics, enrichment, or any purpose other than the address book
  it was typed into.
