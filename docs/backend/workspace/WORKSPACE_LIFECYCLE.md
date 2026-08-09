# Workspace lifecycle

**Established by:** BACKEND-25.

---

## The implemented states

```
  (nothing)  ──POST /workspaces──►  ACTIVE
```

**One state.** `ACTIVE` is the only state a LAGDA workspace has ever been in.

There is no `archived_at`, no `deleted_at`, no `lifecycle_state` and no `status`
column on `workspaces` — asserted by an integration test that queries
`information_schema.columns` and checks the table has exactly three:
`workspace_id`, `name`, `created_at`.

## Why there is no archive

The product has no archive action for a workspace. Teams have Archive/Restore
buttons and custom roles have them; `WorkspaceSettingsPage.tsx` has neither, and
neither does any other screen.

`WorkspaceStatus` in `models/workspace-admin.ts` declares `active | suspended |
archived | pending-verification`, and `WorkspaceOverviewPage.tsx` renders the
value as a badge — but no fixture uses `archived` or `suspended`, and no handler
sets one. It is a type with more members than the product has behaviours.

§58 says to implement an archive state only if the product has a lifecycle
action now. It does not. Building the column, the transition, the authorization
rule, the list filter and the "you cannot do this in an archived workspace"
check for an action nobody can trigger would be five untestable claims.

**The seam is named rather than built.** `WORKSPACE_LIFECYCLE_STATES` in
`@lagda/core` is a one-value union, so when the product grows the action there
is an obvious place for it to go.

Recorded as **OD-091**, which also covers the overview page's status badge
having no backend writer.

## Why there is no hard delete

**No `DELETE /workspaces/:id` exists.** A route audit test asserts it: `DELETE`
against a real workspace returns 404, and the workspace is still readable
afterwards.

Deletion has retention consequences nobody has decided. A workspace will own
documents, signing evidence, completion certificates, audit history and billing
records, and "delete the workspace" is not one question — it is a different
question for each of those. BACKEND-55 owns retention and erasure.

The database enforces the same conservatism independently: both foreign keys
into `workspace_memberships` are `ON DELETE RESTRICT`, so deleting a workspace
that still has members fails, and so does deleting an account that still holds
one. Both are asserted.

## Archive is not erasure

Stated here so it is on the record before the feature exists: **if** an archive
state is added, an archived workspace still exists. Its rows, its memberships,
its documents and its evidence remain. Archiving is a change of what may be
*done*, never a deletion of what *happened*.

Any future documentation that describes archive as "deleting a workspace" is
wrong, and this line is what it should be checked against.

## Rename

A rename changes `name`. It does not:

- mint a new `WorkspaceId` — the tenant identity is immutable;
- touch `created_at`;
- affect any membership;
- reach historical signing evidence, which references the stable `WorkspaceId`.

All four are asserted in `workspace.integration.test.ts`.

Renames are **not** globally conflict-checked, because workspace names are not
globally unique and must not be. Many customers legitimately run a workspace
called "Legal" or "Personal Workspace", and a global constraint would tell every
customer which names their competitors had taken. There is no 409 on this path.

## Deferred, with owners

| Transition | Status | Owner |
|---|---|---|
| `ACTIVE → ARCHIVED` | **DEFERRED** | OD-091 — needs a product action first |
| `ARCHIVED → ACTIVE` | **DEFERRED** | follows archive |
| hard delete / erasure | **DEFERRED** | BACKEND-55 |
| ownership transfer | **DEFERRED** | BACKEND-27 |
| leave workspace | **DEFERRED** | BACKEND-26/27 |
| suspension (billing or abuse) | **DEFERRED** | BACKEND-50 |

None of these has a placeholder column, a stub endpoint, a `TODO` on an
implemented path, or a generic `DELETE` that quietly does something softer.
