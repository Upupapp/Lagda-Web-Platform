# Contact architecture — BACKEND-28

The workspace address book. An ordinary tenant CRUD domain, which is worth
saying plainly: the interesting parts of BACKEND-28 are the two boundaries
([identity](./CONTACT_IDENTITY.md), [recipients](./CONTACT_RECIPIENT_BOUNDARY.md))
and the [duplicate policy](./CONTACT_DUPLICATE_POLICY.md), not the plumbing.

## 1. Shape

```
POST   /workspaces/:workspaceId/contacts                     contact.create
GET    /workspaces/:workspaceId/contacts                     contact.view
GET    /workspaces/:workspaceId/contacts/:contactId          contact.view
PUT    /workspaces/:workspaceId/contacts/:contactId          contact.update
POST   /workspaces/:workspaceId/contacts/:contactId/archive  contact.archive
POST   /workspaces/:workspaceId/contacts/:contactId/restore  contact.archive
```

All six inside the authenticated scope, so each gets a validated session and a
CSRF check **because of where it is registered** rather than because anyone
remembered a flag.

The tenant is a path segment, not a query parameter. Every route has one and no
handler can be written that forgets it; a query parameter is optional by nature
and the request that omitted it would have to be caught at runtime.

## 2. Fields

| Column | Notes |
|---|---|
| `contact_id` | Opaque, server-generated |
| `workspace_id` | First-class tenant column |
| `name` | Required. Trimmed outside only |
| `email` | Required. Stored **exactly as typed**, case preserved |
| `normalized_contact_email` | Folded comparison key. Duplicate detection only |
| `phone` | Optional free text — see below |
| `organization`, `title` | Optional |
| `created_at`, `updated_at` | `updated_at` equals `created_at` on insert |
| `archived_at` | NULL means active. State is derived from it |

**Two email columns, and both are needed.** A contact card that showed
`Maria.Santos@AyalaLand.com.ph` back as lowercase has quietly rewritten
someone's business card, and an address book is exactly where that gets noticed.
The folded key exists only so duplicate detection can work, and it never leaves
the backend.

**Phone is free text, not E.164.** Philippine business numbers are written every
way there is: `0917 123 4567`, `+63 917 123 4567`, `(02) 8123 4567 loc. 210`.
Normalising needs a default region, mangles the extension, and rejects a
landline written the way its owner writes it. Nothing in LAGDA dials a contact,
so strictness buys nothing and loses data.

**`updated_at` equals `created_at` on insert, rather than NULL.** One column
answers both "never edited" and "edited at T", and a nullable one would leave
new contacts in an undefined position under the default sort.

## 3. Validation

`@lagda/core/contacts`, pure, no clock and no I/O.

**Names** reject Unicode `Cc` and `Cf` — the same expression workspace names and
profile text use, because a name is a name and two rules that differ by accident
are two behaviours to explain. `Cc` catches NUL and newline, which break a log
line, a CSV export and a PDF recipient block. `Cf` catches zero-width and
bidirectional overrides, which matter more here than anywhere else in LAGDA: a
recipient name rendered with an RTL override can display as a different person
than the one stored, on a document somebody is about to sign.

Everything else is allowed. `José Ramírez`, `株式会社トヨタ`, `ᜃᜓᜋᜓᜐ᜔ᜆ` are all
valid — an ASCII allowlist would reject a large share of this product's own
customers, and punctuation rejection has never been an XSS defence. Output
encoding is.

Length is counted in **code points**, not `.length`, so a name in a supplementary
plane is not charged double against a limit expressed in characters. The
control-character check runs before the length check, so a long string full of
NULs is reported as the problem it actually has.

**Emails** are checked for syntax only, through `hasEmailSyntax` in
`@lagda/core/common`. BACKEND-28 moved that pattern there from
`email-identity.ts`, where it was private: two unrelated domains now need the
same shape rule, and the alternative was a second copy that agrees until one of
them is edited. The *identity semantics* stayed put — see
[CONTACT_IDENTITY.md](./CONTACT_IDENTITY.md) for why the two keys are separately
branded.

**Optional text** collapses `null`, `undefined` and blank to one `null`. A form
submitting `""` for an untouched field means "not provided", and storing an
empty string would create a second representation of absent that every reader
then has to handle.

Validation reports **all** problems at once, and every issue names a field and a
reason — `email: too-long` — never the value. An error message is a poor place
for an email address; it reaches logs, error reporting and sometimes a
screenshot.

## 4. Tenancy

The ordinary pattern, and nothing more:

```sql
create policy tenant_isolation on contacts
using (workspace_id = lagda_current_workspace())
with check (workspace_id = lagda_current_workspace());
```

with `FORCE ROW LEVEL SECURITY` so the table owner is subject to it too.

**No new transaction scope, no new RLS exception.** BACKEND-26 needed a fourth
scope because an invitee is not a member and had to resolve a tenant before
having one. Contacts have no such caller: every request is an authenticated
member with tenant context. An architecture test asserts no `BYPASSRLS`, no
`SECURITY DEFINER`, and no use of `runGlobal` or `runForInvitationCredential`
from any contact file — so a later change that needs one has to be a deliberate
decision rather than a quiet import.

`ScopedContactRepository` takes no workspace argument on any method. "Read
another tenant's address book" is not a call that can be typed, and RLS refuses
it independently if one ever were.

## 5. Authorization

Four capabilities — `contact.view`, `contact.create`, `contact.update`,
`contact.archive` — added to the BACKEND-27 policy alongside the operations they
govern, which is the intended way to extend that list.

| Role | Contact capabilities |
|---|---|
| `owner` | all four |
| `administrator` | all four |
| `template_administrator` | all four |
| `sender` | all four |
| `member` | none |
| `reviewer` | none |
| `auditor` | none |

Taken from `ROLE_PERMISSIONS`, where `manage_contacts` appears in exactly those
four, and from the navigation gate on `/app/contacts`, which is the same
permission.

**This is the shape a role check could not have produced.**
`template_administrator` and `sender` hold every contact capability and no
membership capability. A `role === "owner" || role === "administrator"` check
would have been wrong for precisely the two roles that use the address book
most — `sender` is the role it exists for.

`reviewer` and `auditor` are refused **including read**, because
`manage_contacts` gates the page itself and the address book holds
counterparties' names, emails and phone numbers.

A capability test asserts the four travel together: every role holds 0 or 4,
never a subset, because there is one product permission behind them and a role
with `contact.create` but not `contact.view` would be a policy nobody decided.

Denial is the **hidden 404**, the same as everywhere else, so "not your
workspace" and "you may not do that here" are one answer and no response
explains the role policy.

Authority is read **inside the mutation transaction**, the same shape member
administration uses: a contributor demoted mid-request cannot commit under
authority they just lost. One indexed query per operation.

## 6. Listing

Page-based, `page` / `perPage`, defaults 1 and 20 — matching the product's
`DEFAULT_CONTACT_QUERY` and the canonical convention. Bounds are enforced at the
schema: `perPage=1000000` is a valid integer and an invalid request, and putting
the bound in the schema means no handler can be the one that forgets.

Sort is a **closed whitelist** — `name | organization | updatedAt` — and each has
a supporting index. An arbitrary column name is an injection surface; an
un-indexed one turns a cheap listing into a full-table sort that only shows up
under real volume.

`lastUsedAt` and `usageCount` are omitted although the product offers them:
nothing writes them yet, so sorting by either would order every contact
identically and look broken (OD-108).

**Three details that would each be a real defect:**

- **NULLS LAST in both directions.** `organization` is nullable, and PostgreSQL
  puts nulls first on `DESC` — so reversing the sort would fill the top of the
  page with contacts that have no organization.
- **A tie-breaker on `contact_id`, always.** Without it, two contacts with the
  same name have an unspecified relative order, and PostgreSQL may return them
  differently on page 1 and page 2 — which silently drops rows from a paginated
  listing and duplicates others.
- **The count uses the same filter builder as the page**, so the two cannot
  describe different states.

Search is `ILIKE` over name, email, organization and title, with `%`, `_` and
`\` escaped so they match literally. That is not injection defence — the value
is a bound parameter — it is pattern escaping *inside* an already-safe
parameter, which is a quieter problem: unescaped, a search for `%` returns every
contact in the workspace.

A blank or whitespace-only search becomes `null`, not `""`. An empty pattern
would produce `ILIKE '%%'`, whose result set differs subtly from no filter at
all around NULL columns.

Active and archived are separate listings. A combined one would offer archived
contacts as selectable recipients, which is what archiving them was meant to
stop.

## 7. Mutation

Every write is a **conditional UPDATE**, never a read followed by a write:

| Method | Condition |
|---|---|
| `updateIfActive` | `archived_at is null` |
| `archiveIfActive` | `archived_at is null` |
| `restoreIfArchived` | `archived_at is not null` |

Two concurrent requests both observing an active contact would both write, and
one would silently resurrect a record the other archived. Here the second
matches zero rows, and zero rows is deliberately ambiguous — absent, another
tenant, or changed concurrently — so the caller reports none of those
distinctions.

`ContactUpdate` names every field it may change. Not `Partial<ContactRecord>`,
which would let a caller pass `{ workspaceId }` and move a contact between
tenants or `{ createdAt }` and rewrite history — the mass-assignment shape
INV-306 already banned on accounts.

An absent key means "leave unchanged"; an explicit `null` means "clear it". Two
distinct intentions, and collapsing them would make clearing a phone number
impossible. The repository builds its `SET` clause from present keys only —
assigning `undefined` wholesale would have Kysely write NULL over columns nobody
asked to change.

**PUT, not PATCH,** at the HTTP layer. A partial update whose absent keys mean
"leave alone" cannot express "clear the phone number" without a null that means
something different from absent, which is the ambiguity that makes partial-update
APIs subtly wrong. A full replacement is unambiguous, naturally idempotent, and
matches the product's form, which submits every field.

Archived contacts are read-only. Restore first — maintaining a record nobody can
select is work with no result, and permitting it would let an archived contact
be quietly edited into a different person.

## 8. Archive, and the absence of delete

The product has `archive` and `restore` and no delete. The backend follows, and
goes one layer further: **the runtime role has no `DELETE` grant on
`contacts`.** Omitting a repository method is a convention; a missing grant is
enforcement, asserted by an integration test that issues a raw `DELETE` as
`lagda_app` and expects `permission denied`.

`POST .../archive`, not `DELETE .../:id`. Naming it DELETE would tell every
client author the row is gone, and would be the obvious place for someone to
later "fix" it into a real delete.

State is derived from `archived_at`, never stored as a `status` column. Two
representations of one fact drift, and the denormalised one is always the one
that drifts — here the derivation is a null check, which makes a status column
purely a way to be wrong.

Hard deletion for a Data Privacy Act erasure request is a deliberate compliance
operation with its own authority, audit trail and interaction with signing
evidence. Not this button. **OD-110.**

## 9. Telemetry

Four events — `contact.created`, `contact.updated`, `contact.archived`,
`contact.restored` — carrying **ids and outcomes only**. Never the contact's
name, email, phone, organization or title.

A contact record is somebody else's personal data: a counterparty who is not a
LAGDA user and consented to nothing. A log line is the easiest place in the
system for it to end up somewhere nobody classified.

`duplicateCount` is a **number**, not the matching contacts — it answers "is the
duplicate warning firing in production" without putting a second person's
details in a log to do it.

`contact_operations_total` has three labels: `operation`, `result`,
`processRole`. All closed sets. No `contactId`, no `workspaceId`, no email — the
first two are unbounded cardinality and the third would be a PII leak into a
store that is retained longer and read more widely than logs.

Two architecture tests enforce this by reading the route source: one scans every
`record(request, …)` payload for a contact field name, the other checks the
metric's label set.

Every response is `Cache-Control: no-store`.

## 10. What was not built

| | Why |
|---|---|
| Delete | Not in the product; no DELETE grant — OD-110 |
| Merge | The product's action is `merge-demonstration` — OD-111 |
| CSV import / bulk create | No UI; an unbounded write loop with no rate limit designed for it — OD-112 |
| Tags and groups | Modelled in the frontend, governed by no operation |
| Personal scope + `ownerId` | A second ownership axis the capability model has no vocabulary for — OD-107 |
| Usage tracking, recent/frequent | Nothing writes them until recipients exist — OD-108 |
| `invalid` / `restricted` status | No operation sets either — OD-109 |
| Notes | The product's model says it is never persisted |
| Rate limiting | Not applied. Contacts are member-only writes with no outbound email; see the report's honest gaps |
