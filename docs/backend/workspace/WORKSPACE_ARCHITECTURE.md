# Workspace architecture

**Established by:** BACKEND-25. Read with
[WORKSPACE_CONTEXT.md](./WORKSPACE_CONTEXT.md),
[MEMBERSHIP_ARCHITECTURE.md](./MEMBERSHIP_ARCHITECTURE.md) and
[ADR-018](../adr/ADR-018-workspace-tenant-lifecycle.md).

---

## 1. The rule everything else follows from

> A workspace is a tenant. A session authenticates the **user**; membership in
> the target workspace authorizes access to that **tenant**.

Two questions, two answers, two pieces of state:

| Question | Answered by | Lives in |
|---|---|---|
| Who are you? | the session cookie | `user_sessions` |
| May you enter this workspace? | the membership row | `workspace_memberships` |

Collapsing them is the mistake that makes every later problem hard: a session
that carries workspace authority keeps granting it after the membership is
revoked, and the only fix is to invalidate sessions on every membership change —
which means logging people out of unrelated workspaces to remove them from one.

## 2. Three identities

```
UserId          global. One per person. Created by BACKEND-19, never per tenant.
WorkspaceId     the tenant boundary. Opaque, server-generated, immutable.
WorkspaceMemberId  one edge: this user, in this workspace, with this role.
```

```
   users                     workspace_memberships                 workspaces
  ┌────────────┐            ┌──────────────────────┐            ┌───────────────┐
  │ user_id  PK│◄───────────┤ user_id           FK │            │ workspace_id  │
  │ email      │  RESTRICT  │ workspace_id      FK ├───────────►│ name          │
  │ …          │            │ member_id         PK │  RESTRICT  │ created_at    │
  └────────────┘            │ role      CHECK      │            └───────────────┘
                            │ created_at           │
                            └──────────────────────┘
                             UNIQUE(workspace_id, user_id)
```

One user, many memberships, many workspaces. A user is never duplicated per
tenant, and a workspace never stores "its" user.

## 3. Workspace identity

`WorkspaceId` is generated server-side by `WorkspaceIdGenerator`, before the
transaction opens. It is not derived from the name, the creator, an email, a
slug or a sequence, and no request schema in this command has a field that could
supply one.

**Immutable.** A rename changes `name`. It does not mint a new tenant, does not
touch `created_at`, and does not affect any membership — asserted in
`workspace.integration.test.ts`. Future signing evidence references the
`WorkspaceId`, so a rename cannot reach backwards into history.

## 4. Creation is one transaction

```
authenticated UserId
        │
        ├─ validate the name              (nothing generated yet)
        ├─ generate WorkspaceId, MemberId (server-side, from ports)
        │
        ├─ BEGIN, SET LOCAL lagda.workspace_id = <the new id>
        │     claim the idempotency key   (same transaction)
        │     INSERT workspaces
        │     INSERT workspace_memberships (role = owner, user = the actor)
        └─ COMMIT
```

The tenant context is bound to the workspace **being created**, which is why the
RLS `WITH CHECK` clause permits both inserts. Creating a tenant needs no global
escape, no `BYPASSRLS` and no privileged repository.

**The invariant:** workspace committed ⇔ owner membership committed. A workspace
with no membership is an inaccessible orphan — no endpoint can reach it, and
there is no deletion endpoint to remove it. Proved by forcing the membership
insert to fail with PostgreSQL's own foreign key and asserting neither row
survives.

Nothing external happens inside the transaction: no bucket, no billing customer,
no email, no job. Each would either hold a transaction open across a network
call or be lost on rollback, and the product requires none of them.

## 5. Authorization on every request

`resolveWorkspaceAccess(userId, workspaceId)` opens a transaction bound to the
**requested** workspace and reads the membership for that user.

Binding tenant context to a client-supplied ID before checking anything is safe
because RLS context only ever *restricts*: the query additionally names
`user_id`, so a row comes back only when the membership genuinely exists. A
guessed or fabricated ID yields a transaction that can see nothing.

The result is a `WorkspaceAccessContext` — `{ workspaceId, userId, membershipId,
role }`. Semantic, application-owned, obtainable only from the resolver. There
is no constructor a route can reach and no way to assert one from client input.

It lives in the application layer, not in a Fastify hook, because a worker, a
future partner API and a CLI can all invoke a workspace use case and none of
them has a request. The API *calls* the resolver; it is not the resolver.

## 6. Row Level Security

Two policy families, both transaction-local, both fail-closed.

| Setting | Policies | Reads | Writes |
|---|---|---|---|
| `lagda.workspace_id` (002) | `tenant_isolation` on both tables | rows in that workspace | rows in that workspace |
| `lagda.user_id` (013) | `member_self_read`, `member_workspace_read` | your own memberships, and their workspaces | **none — `FOR SELECT`** |

`current_setting(name, true)` returns NULL when unset, so a missing setting
matches nothing rather than everything.

The `member_workspace_read` subquery over `workspace_memberships` is itself
subject to `member_self_read`, so it cannot be used to ask whether *someone
else* is a member of a workspace — the rows that would answer are invisible to
the query asking.

`runForUser` sets user context and **not** workspace context, so
`tenant_isolation` matches nothing for its whole lifetime and the only policies
in play are the two `FOR SELECT` ones. The scope is structurally read-only:
an `UPDATE` matches zero rows and an `INSERT` raises. Both are asserted.

RLS is **defence in depth**. Every repository still names its predicate
explicitly (INV-058): a reader must be able to see the scope without knowing a
policy exists.

## 7. The three transaction scopes

Each is a separately named method on `TransactionManager`. Never one method with
an optional argument — omitting it would silently mean unrestricted access.

| Method | Context | Repositories |
|---|---|---|
| `runForWorkspace(id)` | `lagda.workspace_id` | every tenant repository, plus idempotency |
| `runForUser(id)` | `lagda.user_id` | the caller's own membership edges, read-only |
| `runGlobal()` | none | none — accounts and system records only |

## 8. The API

All four routes live inside `createApp`'s **authenticated scope**, where
`requireSession` is called directly on the scope (not registered as a plugin,
which would give it its own encapsulation context and protect nothing).
Protection is a property of *where* a route lives.

| Method | Path | Auth | CSRF | Rate limit | Idempotency |
|---|---|---|---|---|---|
| `POST` | `/workspaces` | session | yes | `workspace.create.user` 10/h | **required** |
| `GET` | `/workspaces` | session | n/a | — | n/a |
| `GET` | `/workspaces/:workspaceId` | session + membership | n/a | — | n/a |
| `PATCH` | `/workspaces/:workspaceId` | session + **owner** | yes | `workspace.update.user` 30/min | not applied |

The workspace is a **path segment**, not a header. A header tenant boundary does
not appear in a route pattern, a metric label or an access log. No request body
in this command carries a `workspaceId`, so a body value cannot disagree with the
path and there is no reconciliation rule to get wrong.

Cross-tenant access returns **404**, identically to a workspace that never
existed — asserted by comparing both responses, not by checking one.

## 9. What this command did not build

Invitations, invitation acceptance, member directories, member removal, role
assignment, custom roles, the permission matrix, teams, contacts, billing,
storage provisioning, ownership transfer, leave, archive, restore and hard
delete. Each belongs to a named later command, and none has a placeholder,
a stub or a `TODO` on an implemented path.
