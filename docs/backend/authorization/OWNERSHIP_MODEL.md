# Ownership model

**Established by:** BACKEND-27. Stated in code as
`OWNERSHIP_MODEL = "SINGLE_OWNER"` so this document and the policy cannot
disagree about which model is in force.

---

## SINGLE_OWNER

**A LAGDA workspace has exactly one owner, always.**

Not a configuration flag and not a default that could be relaxed by a setting.
`assertExactlyOneOwner` has encoded it since BACKEND-05, the frontend's role
description says *"Full control of the workspace. Can transfer ownership…"* in
the singular, and nothing in the product suggests two.

## The lifecycle of ownership

| Transition | Status | How |
|---|---|---|
| **Creation** | **IMPLEMENTED** | Whoever creates a workspace becomes its owner, in the same transaction (BACKEND-25). This is the only way an owner comes into existence. |
| **By invitation** | **IMPOSSIBLE** | `owner` is absent from `INVITABLE_WORKSPACE_ROLES`; the schema cannot express it and a database CHECK refuses it. |
| **By role change** | **IMPOSSIBLE** | `canGrantRole` returns false for `owner` before checking any capability. Nobody may grant it, including the owner. |
| **Demotion** | **REFUSED** | Would leave zero owners. `wouldRemoveLastOwner` returns true for every attempt, because there is never a second owner to fall back on. |
| **Removal** | **REFUSED** | Same rule, same reason. |
| **Transfer** | **DEFERRED** | OD-101. The product's control says "demonstration only". |

## The consequence, stated plainly

**Today, ownership never moves.** Once a workspace is created, its owner is its
owner permanently: no operation in the system can promote anyone else, demote
them, or remove them.

That is a coherent state — the invariant holds, and nothing is half-built — but
it is a real product limitation and it is the highest-priority gap this command
leaves. `DataPrivacyPage.tsx` already tells users *"Workspace Owners must
transfer ownership before closing their account"*, which describes an operation
that does not exist.

It is recorded here, in the report, and as OD-101 rather than left for someone
to discover when an owner leaves a company.

## The last-owner invariant

> A live workspace must never reach zero owners.

Enforced in two places, deliberately:

**In the domain.** `wouldRemoveLastOwner({ currentRole, ownerCount })` is pure —
it takes the count and decides what it means. `assertOwnerRemains(count)` throws
rather than returning a boolean, because reaching a state with no owner is not a
condition to branch on.

**In the transaction.** Every operation that could reduce the owner count reads
`countOwners()` **inside** its own transaction, alongside the actor's authority
and the target's role, and writes conditionally on the role it checked. A count
read before the transaction is a check against state that may have changed by
the time the write lands (§44, §141).

### Concurrency

Two integration tests, both against real PostgreSQL as the runtime role:

- a demotion and a removal aimed at the same owner, launched concurrently —
  both refused, one owner remains;
- ten rounds of three concurrent operations racing each other — the count is
  asserted to be exactly one after every round.

Under `SINGLE_OWNER` no lock is strictly required: both transactions read a
count of one and the pure rule refuses each independently. The tests exist to
prove the **outcome** rather than to assert a mechanism, and they are what would
catch a future change that moved the count read outside the transaction.

If the ownership model ever becomes `MULTIPLE_OWNERS`, that stops being true —
two transactions could each see a count of two and each remove one. At that
point the count read needs `FOR UPDATE` or an equivalent serialization, and this
paragraph is the note saying so.

## What ownership is NOT

`owner` is **workspace authority**. It is not:

- a platform or system administrator — that is BACKEND-59, and it is a different
  security realm entirely;
- a support or impersonation role — not implemented, and no such role exists in
  `WORKSPACE_ROLES`;
- a database superuser — the runtime role holds neither `SUPERUSER` nor
  `BYPASSRLS`, asserted before every tenancy test;
- cross-tenant anything — an owner of workspace A has no standing in workspace B
  whatsoever, and the member-administration tests prove it with a real
  membership id from another tenant.

A background worker is likewise never given `owner`. System execution is a
separate context (BACKEND-16), and an architecture test asserts `SystemActor`
carries no role field — a worker that needed a fake owner membership to pass a
human authorization check would be a real membership with real authority.

## When transfer arrives

BACKEND-27's successor should implement it as a **dedicated atomic operation**,
not a role patch:

```
begin
  load the actor's membership          ← must be the current owner
  load the target's membership         ← must be an existing active member
  target  → owner
  actor   → administrator              ← or another valid role, product's choice
  assertOwnerRemains(count)
commit
```

Never an intermediate committed state with two owners or none. The target must
already be a member — `canReceiveOwnership` exists for that check and has no
caller yet. And it warrants a security event, because it is the highest-impact
change anyone can make to a tenant.
