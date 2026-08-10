# BACKEND-28 — Contacts and address book report

## Product inventory

| Feature | Status |
|---|---|
| **CREATE / LIST / GET / UPDATE** | **IMPLEMENTED** |
| **ARCHIVE / RESTORE** | **IMPLEMENTED** — the product's removal, and the only one |
| **SEARCH** | **IMPLEMENTED** — name, email, organization, title |
| **PHONE / COMPANY / JOB TITLE** | **IMPLEMENTED** |
| **DUPLICATE DETECTION** | **IMPLEMENTED** — warn, never refuse |
| **DELETE** | **NOT_IN_PRODUCT** — no action, no service method, and now no DB grant |
| **NOTES** | **NOT_IN_PRODUCT** — the model says "never stored in real persistence" |
| **FAVORITES / BULK CREATE / EXTERNAL SYNC** | **NOT_IN_PRODUCT** |
| **MERGE** | **REQUIRES_REVIEW** — the action is named `merge-demonstration` (OD-111) |
| **PERSONAL SCOPE** | **REQUIRES_REVIEW** — a second ownership axis (OD-107) |
| **TAGS / GROUPS · CSV IMPORT · USAGE TRACKING** | **DEFER** — OD-108, OD-112 |

→ [CONTACT_PRODUCT_INVENTORY.md](./CONTACT_PRODUCT_INVENTORY.md)

## What reading the product changed

**Three times, and each changed the shape of the implementation.**

**Delete does not exist.** `ContactActionId` has `archive` and `restore` and no
`delete`; the service has `archiveContact`/`restoreContact` and no
`deleteContact`. A backend written from the CRUD instinct would have shipped
`DELETE /contacts/:id`. Instead: `archived_at`, and **no `DELETE` grant for the
runtime role** — so erasure is unavailable to application code even by mistake.

**Duplicates are detected, not prevented.** `findDuplicates` returns
*candidates*, there is a `duplicates` view and a `review-duplicate` action. The
data-modelling instinct — `UNIQUE (workspace_id, email)` — would have broken the
screen whose purpose is showing you the duplicates you have, and would have
forced a law firm to leave a real person out of their own address book because
they share `legal@`.

**Contacts belong to a wider set of roles than members do.** `manage_contacts`
is held by `owner`, `administrator`, `template_administrator` and `sender`, and
the nav gate on `/app/contacts` is the same permission. So
`template_administrator` and `sender` hold every contact capability and no
membership capability — a shape `role === "owner" || role === "administrator"`
cannot produce, and one that would have been wrong for exactly the two roles
that use the address book most.

That third one is BACKEND-27 paying for itself. Adding four capabilities to a
frozen total `Record` and calling `requireCapability` was the whole authorization
change; the correct role assignment came from the product rather than from a
fourth guess.

## The boundaries

Two, and they are what this command is actually about.

**A contact is never an identity.** No `user_id`, no `verified_at`, no
membership or invitation reference — one foreign key, to `workspaces`. And the
guarantee that does not depend on anyone reading a document: `ContactEmailKey`
and `NormalizedEmail` are mutually unassignable brands, so
`findUserByNormalizedEmail(contact.emailKey)` **does not compile**. The two folds
are byte-identical; only the type separates them.

Asserted behaviourally too: creating a contact whose email is a real member's
account address creates nothing, links nothing, and does not even warn.

→ [CONTACT_IDENTITY.md](./CONTACT_IDENTITY.md)

**Editing a contact can never rewrite signing evidence.** It holds today by
absence — nothing references `contacts` — which is a weak guarantee, so the
requirement is written down for BACKEND-30 rather than left to be rediscovered:
recipients carry a **snapshot**, and the compound key
`UNIQUE (workspace_id, contact_id)` is already in migration 015 as the target
for a tenant-safe reference if one is ever wanted.

→ [CONTACT_RECIPIENT_BOUNDARY.md](./CONTACT_RECIPIENT_BOUNDARY.md)

## Verification

| Gate | Result |
|---|---|
| typecheck (`tsc --build --force` + tools project) | **PASS** |
| lint | **PASS** |
| build | **PASS** |
| unit tests | **PASS** — 1139 |
| `npm run check` | **PASS** |
| integration | **PASS** — 432, 49 skipped (S3) |
| migration up + down | **PASS** — 015 applied against PostgreSQL 16 |

New coverage: **124** — 20 core, 44 use-case, 18 route, 21 architecture, 21
integration.

→ [CONTACT_TEST_MATRIX.md](./CONTACT_TEST_MATRIX.md)

## Three things the tests caught

**The exhaustive capability matrix caught the change, as designed.** Adding four
capabilities broke 18 assertions in `authorization.test.ts` — the hand-written
`EXPECTED` table and the `WORKSPACE_CAPABILITIES.length` guard both refused to
accept a policy change nobody had stated. That is the second command in a row
where BACKEND-27's "write the expectations by hand" decision has paid out.

**The new architecture guard flagged its own explanation.** The assertion that
no unique index exists over `normalized_contact_email` failed on the migration's
*comment* saying the index is deliberately not unique — the same trap
`authorization.test.ts` recorded, where the detector reports the fix as the
violation and the tempting response is to delete the prose. Switching to the
comment-stripping `code()` helper fixed it, and the reason is written at the
assertion.

**Kysely's deprecated `orderBy` surfaced only against real PostgreSQL.** The
`sql.raw(\`${direction} nulls last\`)` form typechecked, passed the fakes, and
printed a deprecation warning on the first integration run. It also interpolated
a direction into SQL — safe here because the value comes from a closed union,
and not a shape worth leaving for someone to copy somewhere the value is not.
Replaced with the modifier callback.

## Honest gaps

**There is no way to erase a contact.** LAGDA now stores personal data — name,
email, phone, employer, job title — about people who are **not LAGDA users**,
never consented, and do not know the record exists. Archiving is a timestamp;
the runtime role cannot delete. A Data Privacy Act erasure request would reach
the workspace as controller, who would find that archiving is the strongest
thing their software can do.

This is coherent with the design (ADR-021 rejects hard delete as an ordinary
button, for good reasons) and it is still a real gap. **OD-110, and the
highest-priority thing this command leaves open.**

**Contact writes are unrate-limited.** Not "untested" — **not applied.**
Member-only writes with no outbound email, so the abuse surface that made
invitation limits necessary does not exist here; a runaway client can still
insert without bound. OD-112 (CSV import) is the change that would make a limit
mandatory.

**Pre-auth refusal on contact routes is enforced by composition, not asserted.**
The routes sit inside the authenticated scope, whose hook enforces it for
everything in it. Anonymous-401 and missing-CSRF **are** asserted directly
against the real `createApp`; the half-finished-MFA case is not. The same label
BACKEND-27 used for member routes.

**No production ID generator exists.** `ContactIdGenerator` is a port, and the
only implementation is the test one — exactly as `WorkspaceIdGenerator` and
`WorkspaceInvitationIdGenerator` have been since BACKEND-25. The server
bootstrap wires no workspace dependencies at all, so nothing regressed; it is
one more thing the command that closes OD-069 will need.

**OD-069 is unchanged.** Seventeen auth and account routes remain uncomposed, so
a browser still cannot sign in to reach any of this.

**A flake was found and fixed, not tolerated.** Adding a fourth API suite made a
pre-existing timing problem recur on roughly half of full runs: an
invitation-route test hit Vitest's 5-second default while the first
`app.inject()` in a suite was still transforming the whole application graph.
Nothing was wrong with that test — a compile-bound limit disguised as a
behavioural one produces failures that point at an innocent test and change with
machine load. `testTimeout` is now 20 s with the reasoning at the setting, and
three consecutive `npm run check` runs are clean at 1139/1139.

## BACKEND-29 handoff

Documents are workspace-owned tenant resources. Everything they need is in
place:

- add capabilities to `WORKSPACE_CAPABILITIES` **alongside the operations they
  govern**, and to every role's entry in the total `Record` — omitting a role is
  a compile error, and the `EXPECTED` table in `authorization.test.ts` fails if
  the count changes without it;
- read the product's `ROLE_PERMISSIONS` before assigning them. It has been right
  and non-obvious twice now;
- `tenant_isolation` + `FORCE RLS` + a scoped repository with no workspace
  parameter. Three commands running, unchanged;
- every index leads with `workspace_id`;
- conditional UPDATEs, never read-then-write;
- **if documents reference contacts in any way, read
  [CONTACT_RECIPIENT_BOUNDARY.md](./CONTACT_RECIPIENT_BOUNDARY.md) first.**

The repository is ready. No blocker.
