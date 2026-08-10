# Workspace capability matrix

**Established by:** BACKEND-27, extended by BACKEND-28 (contacts) and
BACKEND-29 (documents). **The canonical mapping lives in
`packages/core/src/authorization/index.ts`.** This document describes it; the
code decides it.

The two are kept in step by 119 table-driven assertions — every role against
every capability — whose expectations are written out by hand rather than
derived from the mapping they check. A test that read `ROLE_CAPABILITIES` would
assert that the policy equals itself.

---

## The matrix

| Capability | owner | administrator | member | template_administrator | sender | reviewer | auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `workspace.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `workspace.update` | ✅ | ✅ | — | — | — | — | — |
| `membership.view` | ✅ | ✅ | — | — | — | — | — |
| `membership.role.change` | ✅ | ✅ | — | — | — | — | — |
| `membership.remove` | ✅ | ✅ | — | — | — | — | — |
| `invitation.view` | ✅ | ✅ | — | — | — | — | — |
| `invitation.create` | ✅ | ✅ | — | — | — | — | — |
| `invitation.resend` | ✅ | ✅ | — | — | — | — | — |
| `invitation.revoke` | ✅ | ✅ | — | — | — | — | — |
| `contact.view` | ✅ | ✅ | — | ✅ | ✅ | — | — |
| `contact.create` | ✅ | ✅ | — | ✅ | ✅ | — | — |
| `contact.update` | ✅ | ✅ | — | ✅ | ✅ | — | — |
| `contact.archive` | ✅ | ✅ | — | ✅ | ✅ | — | — |
| `document.view` | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| `document.create` | ✅ | ✅ | — | ✅ | ✅ | — | — |
| `document.update` | ✅ | ✅ | — | ✅ | ✅ | — | — |
| `workspace.ownership.transfer` | ✅ | — | — | — | — | — | — |

Seventeen capabilities. Seven roles. **Default deny** — an unrecognised role holds
nothing, and a capability absent from a role's list is refused. There is no
wildcard, no inheritance and no numeric rank.

## Notes per capability

| Capability | Note |
|---|---|
| `workspace.view` | Every member. Being in the workspace at all is what it means. |
| `workspace.update` | Renaming. BACKEND-25 restricted this to `owner`; the product's `ROLE_PERMISSIONS` grants `administrator` `manage_workspace`, and BACKEND-27 corrected it. |
| `membership.view` | The member directory, **including email addresses**. Gated to administrators because the product's navigation gates the whole section on `manage_team`. |
| `membership.role.change` | Holding it says you may change roles. WHICH roles you may assign is the separate grant matrix. |
| `membership.remove` | Deletes a membership. Never the account, never another workspace. |
| `invitation.*` | Four separate capabilities though the same two roles hold all four today. Splitting a capability clients already branch on would be a breaking change; splitting one nobody has yet is free. |
| `contact.*` | Four capabilities over the address book, and **the first row of this matrix that an `owner || administrator` check would have got wrong** — see below. `contact.archive` covers restore too: one reversible control, and nothing in the product separates them. There is no `contact.delete`, because there is no delete. |
| `document.*` | Three capabilities, and **the first row where VIEW and WRITE diverge** — see below. There is no `document.delete`, no `document.archive` and no `document.download`: none exists in the product. |
| `workspace.ownership.transfer` | **The one capability with no operation behind it.** The product's transfer control says "demonstration only" (OD-101). It is declared because the ownership model is meaningless without naming who could ever do it. |

## Why `member` holds exactly one capability

Not "everything except ownership" (§4). Two reasons, and they agree:

- **The navigation gate.** `platform.nav.ts` requires `manage_team` for the
  whole workspace-administration section, and `member` does not hold it in
  `ROLE_PERMISSIONS`. A member cannot reach the members page.
- **The data.** A member directory is every colleague's email address.

The product's *second* permission table, `SYSTEM_ROLE_PERMISSIONS`, does list
`members:view` for `role_member`. The two tables disagree; the one that controls
reachability wins, and the disagreement is OD-100 rather than a decision made
by picking the more permissive reading.

## Why the contact row is the interesting one (BACKEND-28)

`template_administrator` and `sender` hold **every** contact capability and
**no** membership capability. `reviewer` and `auditor` hold none at all.

That shape cannot be produced by `role === "owner" || role === "administrator"`,
and it is not a judgement call: `manage_contacts` appears in exactly four roles'
permission sets in `ROLE_PERMISSIONS`, and the navigation gate on
`/app/contacts` is that same permission. `sender` — the role with the least
administrative authority of the four — is the role the address book exists for.

`reviewer` and `auditor` are refused **including `contact.view`**. A read-only
projection would grant something the product does not: they cannot reach the
page, and the address book holds counterparties' names, emails and phone
numbers.

An architecture test asserts the four travel together — every role holds 0 or 4,
never a subset — because there is one product permission behind them, and a role
with `contact.create` but not `contact.view` would be a policy nobody decided.

## Why four roles hold only `workspace.view`

**`member`, `reviewer` and `auditor`** — real product roles whose remaining
powers are over domains that do not exist yet: documents (BACKEND-29/32/33) and
audit history (BACKEND-43).

(`template_administrator` and `sender` held only `workspace.view` when BACKEND-27
wrote this section. BACKEND-28 gave both four contact capabilities, which is what
extending the matrix alongside an operation looks like.)

Listing one capability each is the honest current answer, not an oversight. The
alternative — granting them speculative capabilities so the matrix looks
fuller — would be the policy asserting powers over operations nobody has built.

## Extending this matrix

A future command adds a capability **when it adds the operation the capability
governs**, and:

1. adds the identifier to `WORKSPACE_CAPABILITIES` in `@lagda/core`;
2. adds it to `WORKSPACE_CAPABILITY_NAMES` in `@lagda/contracts` if a client
   needs to see it — an architecture test compares the two lists;
3. adds it to every role's list in `ROLE_CAPABILITIES`, which is a total
   `Record`, so omitting a role is a compile error;
4. extends the `EXPECTED` table in `authorization.test.ts`, which fails if the
   capability count changes without it;
5. updates this table.

A feature use case then calls `requireCapability(userId, workspaceId, "the.new.capability", deps)`.
It does not compare a role — an architecture guard greps every package and
allows exactly four files to do that.

## Canonical vs projection

**Backend policy is canonical.** `GET /workspaces/:id/access` returns the
caller's capability list so a client can hide controls it cannot use. That
projection is **informational**: every mutation re-evaluates the policy against
a membership row read at the time of the write, so a client that fabricated the
list, or cached a stale one, changes nothing about what it may do.


## Where view and write diverge (BACKEND-29)

Contacts move as a block: every role holds all four capabilities or none.
Documents do not, and the split is the product's:

| Product permission | Roles holding it |
|---|---|
| `view_documents` | owner, administrator, template_administrator, sender, **reviewer**, **auditor** |
| `prepare_documents` | owner, administrator, template_administrator, sender |

**`reviewer` and `auditor` may read a document and may not create or rename
one.** A reviewer reads documents for a living and creates none; an auditor
cannot review what happened without reading what it happened to.

That is a third distinct shape after membership (two roles, all capabilities)
and contacts (four roles, all capabilities), and no
`role === "owner" || role === "administrator"` check produces any of the three.

`member` holds no document capability at all, including view. It is not a
`PlatformRole` and has no entry in `ROLE_PERMISSIONS` — the same disagreement as
OD-100, resolved the same way: the table that gates reachability wins.

An architecture test asserts the one incoherent combination cannot arise: **no
role holds write without view.**
