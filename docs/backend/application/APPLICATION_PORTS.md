# Application Ports

Interfaces the application requires. Infrastructure implements them.

**The inversion is the point.** `@lagda/db` imports these definitions; application never imports `@lagda/db`. ESLint enforces it, and the composition roots (`api`, `worker`) are the only packages allowed to import both sides.

Every port below has a named consumer except one, which is called out.

| Port | Purpose | Consumer today | Future adapter | Tenant scope | Transactional |
|---|---|---|---|---|---|
| `Clock` | The only source of "now" | `CreateWorkspace` | trivial system adapter (BACKEND-11) | n/a | no |
| `WorkspaceIdGenerator` | New workspace identity | `CreateWorkspace` | BACKEND-06 | n/a | no |
| `WorkspaceMemberIdGenerator` | New membership identity | `CreateWorkspace` | BACKEND-06 | n/a | no |
| `TransactionManager` | Group writes atomically | `CreateWorkspace` | BACKEND-08 | n/a | yes |
| `WorkspaceRepository` | Workspace persistence | `CreateWorkspace` | BACKEND-08 | **is** the scope | writes |
| `WorkspaceMembershipRepository` | Membership persistence | `CreateWorkspace`, `GetWorkspaceMember` | BACKEND-08 | **scoped** | writes |
| `DocumentSealer` | Document finalization seam | **none yet** | `@lagda/sealing` (BACKEND-09) | workspace in request | no |

## Why separate ID generators

Not one `generateId(): string`. A single generator returning a bare string hands back a value assignable to *any* branded ID, which quietly undoes the branding BACKEND-02 introduced. These are for **entity identity only** — security tokens (reset, session, signing access, OTP) need unguessability guarantees an entity ID does not, and get their own ports in the commands that need them.

## Tenancy in repository ports

`WorkspaceRepository.findById(workspaceId)` takes no extra scope — a workspace *is* the scope, and a redundant parameter would make the rule look ceremonial.

`WorkspaceMembershipRepository` is scoped by construction. There is deliberately **no** `findByMemberId(memberId)`: such a method would resolve a member from any workspace, and a caller who forgot to check ownership would read across tenants silently. Absence returns `null`, so a membership in another workspace is indistinguishable from one that does not exist.

## Transaction style — one, chosen

Repositories take the context as an explicit final parameter:

```ts
await transactions.run(async tx => {
  await workspaces.save(workspace, tx);
  await memberships.save(membership, tx);
});
```

The alternative — a transaction-scoped repository set (`tx.workspaces`) — reads better but requires every adapter to rebuild its whole repository surface per transaction. **Mixing both styles is what makes transaction boundaries impossible to audit**, so only this one is used.

`TransactionContext` carries nothing. A `PoolClient` here would put a driver type in every repository signature and application would depend on PostgreSQL through the back door.

## DocumentSealer — the one port with no consumer

Stated rather than hidden. It exists now because §148 asked to fix its ownership, and because inverting a dependency before the implementation exists is exactly what a port is for.

- **Owned by** application. It needs the capability, so it declares the interface.
- **Implemented by** `@lagda/sealing` (BACKEND-09).
- **Consumed by** signing completion only (BACKEND-38, INV-002).
- **One operation.** `mergeFields`, `hashDocument` and `signPdf` stay internal to the sealing package; exposing them would give twenty callers a reason to reach past the seam.
- `SealRequest`/`SealResult` are LAGDA-owned. No `pdf-lib` type crosses (INV-008) — which is what makes a later Java or .NET implementation a substitution rather than a rewrite.

## Ports deliberately NOT created

`ObjectStorage`, `MalwareScanner`, `NotificationPublisher`, `PasswordHasher`, `TokenGenerator`, `BackgroundWorkScheduler`, `EvidenceRepository`, `AuthorizationService`.

Each is genuinely needed later, and none has a consumer today. Creating them now would produce exactly the decorative architecture this repository has already shipped once. Each belongs to the command that first needs it: BACKEND-17/18 (storage, AV), BACKEND-44 (notifications), BACKEND-19/20 (auth), BACKEND-16 (jobs), BACKEND-10/43 (evidence), BACKEND-27 (authorization).
