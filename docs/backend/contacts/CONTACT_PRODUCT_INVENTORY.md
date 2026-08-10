# Contact product inventory — BACKEND-28

What the LAGDA frontend actually contains for contacts, and what BACKEND-28
built from it. Read before changing anything in `docs/backend/contacts/`.

Sources read in full:

| File | What it gave |
|---|---|
| `src/app/models/contacts.ts` | the `Contact` shape, `ContactStatus`, `ContactScope`, `ContactActionId`, `ContactCreateInput`, `ContactListQuery`, `DEFAULT_CONTACT_QUERY` |
| `src/app/services/mock/contacts.service.ts` | every operation the product performs, and — more usefully — the ones it does not |
| `src/app/models/index.ts` | `ROLE_PERMISSIONS`, where `manage_contacts` appears |
| `src/app/config/platform.nav.ts` | the navigation gate on `/app/contacts` |

## Classification

| Feature | Classification | Why |
|---|---|---|
| **CREATE CONTACT** | **IMPLEMENT_NOW** | `createContact` + a full create form |
| **LIST CONTACTS** | **IMPLEMENT_NOW** | `listContacts` with filters, sort and paging |
| **GET CONTACT** | **IMPLEMENT_NOW** | `getContact` |
| **UPDATE CONTACT** | **IMPLEMENT_NOW** | `updateContact` |
| **ARCHIVE CONTACT** | **IMPLEMENT_NOW** | `archiveContact` / `restoreContact`, and `archive`/`restore` in `ContactActionId` |
| **DELETE CONTACT** | **NOT_IN_PRODUCT** | There is no delete action and no `deleteContact` service method. See below — this is the most consequential finding in this document |
| **SEARCH CONTACTS** | **IMPLEMENT_NOW** | `ContactListQuery.search` |
| **PHONE** | **IMPLEMENT_NOW** | `ContactCreateInput.phone` |
| **COMPANY** | **IMPLEMENT_NOW** | `ContactCreateInput.organization` |
| **JOB TITLE** | **IMPLEMENT_NOW** | `ContactCreateInput.title` |
| **NOTES** | **NOT_IN_PRODUCT** | The model annotates `note` as *"internal note, never stored in real persistence"*. The product is telling us not to persist its own field |
| **FAVORITES** | **NOT_IN_PRODUCT** | No favourite flag anywhere |
| **TAGS / GROUPS** | **DEFER** | Modelled (`tagIds`, `groupIds`, tag and group services) and governed by no operation. Their own command |
| **BULK CREATE** | **NOT_IN_PRODUCT** | No bulk form exists |
| **CSV IMPORT** | **DEFER** | No import UI. Would be an unbounded write loop with no rate limit designed for it — OD-112 |
| **EXTERNAL SYNC** | **NOT_IN_PRODUCT** | Nothing in the product suggests it |
| **DUPLICATE DETECTION** | **IMPLEMENT_NOW** | `findDuplicates`, `getDuplicateCandidates`, a `duplicates` view and a `review-duplicate` action |
| **MERGE DUPLICATES** | **REQUIRES_REVIEW** | The action is literally named `merge-demonstration` — OD-111 |
| **PERSONAL vs WORKSPACE SCOPE** | **REQUIRES_REVIEW** | A second ownership axis over tenancy — OD-107 |
| **USAGE TRACKING** (`lastUsedAt`, `usageCount`, recent/frequent views) | **DEFER** | Nothing would write them: recipient creation does not exist yet — OD-108 |
| **`invalid` / `restricted` STATUS** | **DEFER** | No operation sets either; they exist only in mock fixture data — OD-109 |

## The three decisions this inventory drove

### 1. Delete does not exist. Archive does.

`ContactActionId` is `view | edit | archive | restore | review-duplicate |
merge-demonstration | …`. There is no `delete`. The mock service has
`archiveContact` and `restoreContact` and no `deleteContact`.

So the backend has `archived_at` and no delete — and it goes further than the
product had to: **the runtime database role has no `DELETE` grant on
`contacts`.** Omitting a repository method is a convention; a missing grant is
enforcement, and it is asserted by an integration test that issues a raw
`DELETE` as `lagda_app` and expects `permission denied`.

The capability is named `contact.archive` rather than `contact.delete` for the
same reason: naming a capability after an operation that does not exist invites
someone to build it.

### 2. Duplicates are warned about, never refused.

The product **detects** duplicates and surfaces them: `findDuplicates(name,
email, excludeId)` returns *candidates*, there is a `duplicates` view, and
`review-duplicate` is a user action. Nothing prevents the second contact.

That is also correct on the merits. `legal@example.com` is one mailbox and
several business contacts at a law firm, and refusing the second would make the
address book wrong in order to keep it tidy.

Consequence: **no unique constraint on the contact email.** An architecture test
asserts its absence, so it cannot be added later as a tidy-up.
CONTACT_DUPLICATE_POLICY.md has the full reasoning.

### 3. Contacts are held by a wider set of roles than members are.

`manage_contacts` appears in four roles' permission sets: `owner`,
`administrator`, `template_administrator`, `sender`. The navigation gate on
`/app/contacts` is that same permission.

`template_administrator` and `sender` hold every contact capability and **no**
membership capability. That shape is impossible to produce with a `role ===
"owner" || role === "administrator"` check, and it would have been wrong for
exactly the two roles that use the address book most — `sender` is the role it
exists for. It is the clearest payoff yet from BACKEND-27's capability model.

`member`, `reviewer` and `auditor` hold none, **including `contact.view`**. The
address book holds counterparties' names, emails and phone numbers, and the
product does not give these roles the permission that gates the page.

## What was deliberately not built, and why

**`scope: personal | workspace` plus `ownerId`.** A second ownership axis
layered over tenancy: "mine within this workspace" is a concept the capability
model has no vocabulary for. Implementing it would mean inventing an
authorization rule here rather than reading one from the product — is a personal
contact visible to an owner? editable by an administrator? what happens when its
creator is removed? None of those has a product answer. Every contact
BACKEND-28 creates is workspace-scoped. **OD-107.**

**`note`.** The product's own model says it is never persisted. Adding a column
would contradict an explicit instruction about its own field.

**`source`.** Four of its six values (`import`, `csv`, `participant`, `sync`)
describe flows that do not exist, so the column would be constant.

**`lastUsedAt` / `usageCount`, and the `recent` and `frequent` views.** Nothing
in this backend writes them — a contact is "used" when it becomes a document
recipient, and recipients arrive with BACKEND-30. Sorting by either today would
order every contact identically and look broken. **OD-108.**
