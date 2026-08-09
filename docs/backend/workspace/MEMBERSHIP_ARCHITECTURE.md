# Membership architecture

**Established by:** BACKEND-25. Expanded by BACKEND-26 (invitations) and
BACKEND-27 (roles and permissions).

---

## 1. What a membership is

A row in `workspace_memberships` means **actual access, right now**. It is the
authoritative user-to-tenant edge, and it is the only thing that authorizes
entry to a tenant.

It is not a claim in a token, not a field on a user, and not a cached list. Every
workspace-scoped operation reads it.

## 2. Why not `users.workspace_id`

Because a user belongs to several workspaces, and a column cannot hold that. The
moment it needs to, the fix is a join table — which is this one, added late,
with a migration that has to invent memberships for existing rows.

## 3. Why not `workspaces.owner_user_id` either

That column existed from BACKEND-05 and **migration 013 drops it**.

It was a second authority on who owns a workspace, alongside the `owner`
membership row the same transaction writes. Two authorities agree until one is
updated alone — which is precisely what an ownership transfer does — and then
"who owns this workspace?" has two answers and no rule for choosing between
them.

Ownership is now a membership whose `role` is `owner`. It is read from
`workspace_memberships` or it is not read at all. An integration test asserts
the column is gone by querying `information_schema`.

## 4. Identity

| Column | Purpose |
|---|---|
| `member_id` | Opaque primary key. Addressable in a future member API and in audit records, where "the membership between user X and workspace Y" is an awkward way to name a thing that changed. |
| `UNIQUE(workspace_id, user_id)` | The relation. One user, one membership, per workspace. |
| `UNIQUE(workspace_id, member_id)` | Redundant today and deliberate: the target a compound foreign key needs, so a child table can reference a member without a row in workspace A pointing at a member of workspace B. |

Both a surrogate key and a natural unique constraint, because they answer
different questions and the second is what survives two concurrent requests. An
application pre-check improves the error message; only the constraint prevents
the row.

## 5. Foreign keys

```sql
FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE RESTRICT  -- 001
FOREIGN KEY (user_id)      REFERENCES users (user_id)           ON DELETE RESTRICT  -- 013
```

The `user_id` reference was **missing until migration 013** — the column has
existed since 001, and `users` only arrived in 008. Without it, a membership
could name an account that does not exist: a row that authorizes nobody and that
nothing would have flagged.

`RESTRICT` on both, never `CASCADE`. This is a legal-evidence system, and
deletion semantics are unresolved until BACKEND-55. A cascade would answer that
question in the destructive direction by default: deleting a user row would
silently remove their memberships and, with them, the record of who could reach
a tenant. A workspace whose only owner vanished would become permanently
unreachable with no trace of why.

## 6. Roles

`WORKSPACE_ROLES` in `@lagda/contracts`:

```
owner · administrator · template_administrator · sender · reviewer · auditor
```

Six values, taken from the frontend's nine-value `PlatformRole`, adopted by
BACKEND-05, enforced by a database CHECK and validated again at the mapping
boundary (`row.role as WorkspaceRole` would accept anything the column held).

**BACKEND-25 only ever writes `owner`.** It is the only role any endpoint here
can produce, because the only membership this command creates is the creator's.
The other five exist so BACKEND-26 can request one and BACKEND-27 can give it
meaning, without a migration that rewrites the constraint.

The list was **not narrowed to `owner` alone**. §16 forbids *inventing* roles;
these were not invented, they are the product's own vocabulary and were already
a constraint and a mapping guard. Removing them would be a migration that
deletes vocabulary the product uses in order to satisfy a minimalism rule aimed
at the opposite problem.

The vocabulary moved from `@lagda/core` to `@lagda/contracts` because a role
appears in a response body, and INV-007 says shared contracts originate there.
Core re-exports it, so there is one declaration rather than two that agree by
convention.

### The authorization seam

One predicate, in `@lagda/core`:

```ts
canManageWorkspace(role) // owner only
```

Not a permission matrix, not a capability set, not a `canX` family. BACKEND-27
replaces it with the real policy derived from the product's `ROLE_PERMISSIONS`
table.

`owner` only, even though the product's own table grants `workspace:manage` to
`administrator` too — because BACKEND-25 cannot produce an administrator
membership, and extending a rule to a role no code can create would be an
untestable claim.

## 7. Timestamps

`created_at` only. It orders the switcher ("newest membership first") and
records when someone joined. There is no `updated_at`, because nothing in this
command changes a membership after it is written; BACKEND-27 adds one when role
changes arrive and something reads it.

## 8. There is no status column

No `ACTIVE`, `PENDING`, `INVITED` or `REMOVED`. **A membership represents actual
access.**

A status column would put pending invitations into the authorization table, and
then every authorization query in the system would need `AND status = 'ACTIVE'`
— a filter that one caller eventually forgets, in a query that then grants
access to someone who was invited and never accepted.

**An invitation is not a membership.** BACKEND-26 gives invitations their own
table with their own lifecycle, and acceptance creates a membership
transactionally.

The creator is the one exception, and it is not an exception to the rule: they
already authenticated and explicitly created the tenant. There is nothing to
accept.

## 9. The last-owner invariant

> A non-archived workspace must never end up with zero owners.

**An application invariant, not a database constraint.** A relational CHECK
cannot express "at least one row in this group satisfies a predicate" without a
trigger or a materialized counter, and both are worse than checking it at the
one place that can change the answer.

`assertExactlyOneOwner` and `wouldOrphanWorkspace` live in `@lagda/core` and are
pure. No endpoint in BACKEND-25 can violate the invariant: the only membership
write is the creator's `owner` row, and there is no removal or role-change
endpoint.

**BACKEND-26/27 must call them** before committing any membership removal, role
change or ownership transfer. That is the handoff, and it is stated here because
the code that will need it does not exist yet.

## 10. What BACKEND-26 and BACKEND-27 inherit

- A unique, foreign-keyed membership relation that survives concurrency.
- A closed role vocabulary with room to grow and no migration required.
- One narrow authorization predicate to replace, not a matrix to unpick.
- Two pure last-owner functions, written and tested, with no caller yet.
- A creation transaction that already demonstrates atomic membership writing.
