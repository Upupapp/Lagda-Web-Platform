# Role grant matrix

**Established by:** BACKEND-27. Canonical in
`packages/core/src/authorization/index.ts` — `canGrantRole` and
`canGrantInvitationRole`. 49 table-driven assertions cover every combination.

Separate from the capability matrix on purpose. Holding
`membership.role.change` says you may change roles; it does not say **which**
roles you may hand out, and conflating the two is how an administrator ends up
able to mint an owner.

---

## Who may grant what

| Actor role | → owner | → administrator | → member | → template_administrator | → sender | → reviewer | → auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **owner** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **administrator** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| member | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| template_administrator | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sender | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| reviewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| auditor | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

The invitation matrix is identical in shape, keyed on `invitation.create`
instead. Two functions, because the authorities differ even though the same
roles hold both today — the first product change that separates them is a
one-line edit rather than a discovery.

## NOBODY may grant `owner`

Not an administrator. Not the owner. Not an invitation.

A workspace has exactly one owner, and `assertExactlyOneOwner` depends on it.
A role dropdown or an emailed link that could mint a second one would break that
invariant days after anyone reviewed the change, in a transaction nobody is
watching.

Ownership moves through a dedicated transfer operation and nothing else — and
that operation is deferred (OD-101), so today ownership does not move at all.
See OWNERSHIP_MODEL.md.

The rule is enforced at **four** layers:

1. `canGrantRole` returns false for `owner` before checking any capability.
2. `canGrantInvitationRole` does the same.
3. `owner` is absent from `INVITABLE_WORKSPACE_ROLES`, so the invitation request
   schema cannot express it.
4. A database CHECK on `workspace_invitations.requested_role` refuses it.

## An administrator MAY grant `administrator`

This is the one place the conservative default was not taken, and it deserves
the paragraph.

§39 suggests a role should not grant a privilege equal to its own. The product
disagrees: `ROLE_PERMISSIONS` gives `administrator` the `members:invite`
permission, and `InvitationsPage.tsx` offers **Administrator** in its role
selector with no restriction on who is choosing. Refusing peer promotion would
be inventing a restriction the product does not have.

The escalation is bounded:

- an administrator can create peers, never a superior;
- `owner` remains above all of them and can demote any of them;
- self-promotion is impossible regardless — the actor is compared to the target
  before the grant rule runs.

Recorded here rather than in a code comment alone, because it is the kind of
decision a future reviewer should be able to find and reverse deliberately.

## Why not a numeric rank

`OWNER = 3, ADMIN = 2, MEMBER = 1` would be shorter and is rejected (§40).

The roles are **not a hierarchy**. `sender`, `reviewer`, `auditor` and
`template_administrator` are parallel — none outranks another, and none is a
superset of another. A rank would have to invent an ordering between them that
means nothing, and the first time someone compared it the comparison would be
arbitrary.

Explicit rules describe the actual shape: two roles may grant, `owner` may not
be granted, everyone else may grant nothing.

## Self-targeting

`changeWorkspaceMemberRole` refuses when the actor is the target, before the
grant rule runs. That covers both directions:

- **Self-promotion** — never allowed, from any role (§117).
- **Self-demotion** — refused too, because it belongs to leaving or
  transferring, and routing it through a role patch would bypass their rules
  (§116).

Tested from every role.
