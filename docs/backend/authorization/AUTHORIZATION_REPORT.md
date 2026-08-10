# BACKEND-27 — Roles and permissions report

## Product inventory

| Feature | Status |
|---|---|
| **ROLE SET** | **IMPLEMENTED** — 7, from the product |
| **CAPABILITY POLICY** | **IMPLEMENTED** — 10 capabilities, pure, default-deny |
| **MEMBER LIST** | **IMPLEMENTED** |
| **ROLE CHANGE** | **IMPLEMENTED** |
| **MEMBER REMOVAL** | **IMPLEMENTED** |
| **LEAVE WORKSPACE** | **NOT_IN_PRODUCT** — no control exists (OD-102) |
| **OWNERSHIP TRANSFER** | **DEFERRED** — the control says "demonstration only" (OD-101) |
| **MULTIPLE OWNERS** | **NOT_IN_PRODUCT** — `SINGLE_OWNER` |
| **CUSTOM ROLES** | **REQUIRES_REVIEW** — a builder exists over permissions that govern nothing (OD-105) |

→ [AUTHORIZATION_PRODUCT_INVENTORY.md](./AUTHORIZATION_PRODUCT_INVENTORY.md)

## What reading the product changed

BACKEND-25 and BACKEND-26 each wrote a narrow predicate — `canManageWorkspace`,
`canManageInvitations`, `canGrantRole` — and all three were `role === "owner"`,
because neither command had a role model to consult.

**The product's own `ROLE_PERMISSIONS` grants `administrator` both `manage_team`
and `manage_workspace`.** An administrator should have been able to invite
people and rename the workspace since BACKEND-25, and could not. All three
predicates are gone, and an administrator can now do both.

That correction is the reason this command exists, and it is what a
role-model-first approach buys: the answer came from the product rather than
from a third guess.

## The model

Seven roles: `owner`, `administrator`, `member`, `template_administrator`,
`sender`, `reviewer`, `auditor`. No `super_admin`, no `manager`, no `editor`,
no `viewer`, no `support`.

Ten capabilities, each governing an operation that exists. Four roles hold only
`workspace.view` — their powers are over templates, documents and audit history,
which are later commands. That is the honest current answer rather than an
oversight.

`ROLE_CAPABILITIES` is a frozen total `Record`. Adding a role without deciding
its powers is a compile error.

→ [WORKSPACE_CAPABILITY_MATRIX.md](./WORKSPACE_CAPABILITY_MATRIX.md) ·
[ROLE_GRANT_MATRIX.md](./ROLE_GRANT_MATRIX.md)

## Verification

| Gate | Result |
|---|---|
| typecheck (`tsc --build` + tools project) | **PASS** |
| lint | **PASS** |
| build | **PASS** |
| unit tests | **PASS** — 1008 |
| `npm run check` | **PASS** |
| integration | **PASS** — 411, 49 skipped (S3) |
| migration | **N/A** — no schema change |

New coverage: 180 policy, 34 member-administration unit, 11 architecture guards,
20 integration.

## Two things the tests caught

**The architecture guard caught its own false positives.** Its first run flagged
six files, three of which contained only a *comment* explaining that the role
comparison had been removed. A detector that reports the fix as the violation
teaches people to stop writing the explanation, so it strips comments now — and
the remaining three were legitimate (the policy, the ownership invariants, the
migration that builds the CHECK constraint), which is what the allowlist
records with a reason each.

**A stale test import proved the centralization worked.** Deleting
`requireWorkspaceManager` broke exactly one call site outside the code being
changed. If authorization had been scattered, it would have broken dozens.

## Honest gaps

**Ownership never moves.** Nobody may grant `owner`; the owner cannot be demoted
or removed because that would leave zero owners; transfer is deferred because
the product's control says "demonstration only". The invariant holds and nothing
is half-built, but a workspace's owner is permanent — and `DataPrivacyPage.tsx`
already tells users *"Workspace Owners must transfer ownership before closing
their account"*, describing an operation that does not exist. **OD-101, and the
highest-priority gap this command leaves.**

**Member-route CSRF and pre-auth are enforced by composition, not by their own
tests.** The routes sit inside the authenticated scope, whose hook enforces both
for every route in it — proved by the workspace and invitation suites through
the same factory. The member routes have no dedicated assertions. The test
matrix says "by composition" rather than PASS.

**The product's two permission tables disagree** about whether an ordinary
member may see the member directory. The navigation gate — the one that controls
reachability — says no, and that is what the policy implements. OD-100 records
the disagreement rather than resolving it by picking the more permissive
reading.

**Three member actions are deferred.** Suspend, reactivate and deactivate are a
membership *status* model, and adding a status column to the authorization table
is what INV-324 exists to prevent. OD-103.

**OD-069 is unchanged.** Seventeen auth and account routes remain uncomposed, so
a browser still cannot sign in to reach any of this.

## BACKEND-28 handoff

Contacts are workspace-owned tenant resources. The seams are in place:

- add `contact.view`, `contact.create`, `contact.update`, `contact.delete` to
  `WORKSPACE_CAPABILITIES` and to every role's entry in `ROLE_CAPABILITIES` —
  the total `Record` makes omitting a role a compile error;
- call `requireCapability(userId, workspaceId, "contact.view", deps)`. Do not
  compare a role; the architecture guard fails if you do;
- contacts are **not** users and **not** memberships. A contact email must never
  create or invite an account;
- scope every repository method to the workspace with no workspace parameter,
  and give the table `workspace_id` + `tenant_isolation` RLS;
- deletion must not rewrite historical signing-recipient evidence.

The repository is ready. No blocker.
