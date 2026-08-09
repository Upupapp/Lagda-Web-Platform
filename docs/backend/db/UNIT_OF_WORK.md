# Unit of Work

```ts
await transactions.runForWorkspace(workspaceId, async uow => {
  await uow.workspaces.insert(workspace);
  await uow.memberships.insert(membership);
});
```

## What it guarantees

**One transaction.** Every repository reachable from a `uow` is built on the
same Kysely transaction. The previous shape — separate repository instances each
handed a context — let one use the pool while another used the transaction,
producing atomicity that looked correct and was not.

**One workspace.** Scope is bound, not passed. `findMember(id)` takes no
workspace argument, so a read against another tenant is **not expressible**.
Previously it was — RLS caught it, but the API allowed writing it.

**Tenant context.** `runForWorkspace` issues `SET LOCAL lagda.workspace_id`
before the operation, so RLS applies to every query inside. This happens in one
place; issuing it anywhere else reopens the pooled-connection hazard.

## Two modes, both explicit

| Method | Scope | Repositories |
|---|---|---|
| `runForWorkspace(id, op)` | one workspace, RLS context set | workspace + memberships |
| `runGlobal(op)` | none | **none** |

`runGlobal` exposes no tenant repositories at all. Global mode is not a route to
workspace data — under RLS it would see nothing anyway, and this makes that
structural rather than incidental.

There is deliberately no `run(workspaceId?)`. With an optional workspace,
*forgetting the argument* would mean unrestricted access.

## Commit and rollback

Kysely commits when the callback resolves and rolls back when it throws,
releasing the pooled connection either way. Verified against real PostgreSQL,
including that fifteen consecutive failures do not exhaust the pool.

## Lifetime

**Do not retain a `uow` past its callback.** Its repositories are bound to a
transaction that has committed; using them afterwards is a use-after-commit bug.
Return plain data from the callback instead.

## What it must not do

No email, no storage, no `DocumentSealer`, no HTTP, no queue publishing. A
transaction held open across a network call lasts as long as the network takes
and cannot be rolled back once the commit fails.

Writing a durable follow-up row would be a legitimate exception — it is another
database write — but no outbox exists yet.
