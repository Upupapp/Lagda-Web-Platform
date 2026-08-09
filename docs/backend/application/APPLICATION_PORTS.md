# Application Ports

Interfaces the application requires. Infrastructure implements them.

**The inversion is the point.** `@lagda/db` imports these definitions; application never imports `@lagda/db`. ESLint enforces it, and the composition roots (`api`, `worker`) are the only packages allowed to import both sides.

Every port below has a named consumer except one, which is called out.

| Port | Purpose | Consumer today | Future adapter | Tenant scope | Transactional |
|---|---|---|---|---|---|
| `Clock` | The only source of "now" | `CreateWorkspace` | trivial system adapter (BACKEND-11) | n/a | no |
| `WorkspaceIdGenerator` | New workspace identity | `CreateWorkspace` | BACKEND-06 | n/a | no |
| `WorkspaceMemberIdGenerator` | New membership identity | `CreateWorkspace` | BACKEND-06 | n/a | no |
| `TransactionManager` | Group writes atomically **and establish tenant context** | `CreateWorkspace`, `GetWorkspaceMember` | BACKEND-06 ✅ | `runForWorkspace` / `runGlobal` | yes |
| `WorkspaceRepository` | Workspace persistence | `CreateWorkspace` | BACKEND-06 ✅ | **is** the scope | reads + writes |
| `WorkspaceMembershipRepository` | Membership persistence | `CreateWorkspace`, `GetWorkspaceMember` | BACKEND-06 ✅ | **scoped, required** | reads + writes |
| `DocumentSealer` | Document finalization seam | **none yet** | `NodeDocumentSealer` in `@lagda/sealing` (BACKEND-09) | workspace in request | no |

## Why separate ID generators

Not one `generateId(): string`. A single generator returning a bare string hands back a value assignable to *any* branded ID, which quietly undoes the branding BACKEND-02 introduced. These are for **entity identity only** — security tokens (reset, session, signing access, OTP) need unguessability guarantees an entity ID does not, and get their own ports in the commands that need them.

## Tenancy in repository ports

`WorkspaceRepository.findById(workspaceId)` takes no extra scope — a workspace *is* the scope, and a redundant parameter would make the rule look ceremonial.

`WorkspaceMembershipRepository` is scoped by construction. There is deliberately **no** `findByMemberId(memberId)`: such a method would resolve a member from any workspace, and a caller who forgot to check ownership would read across tenants silently. Absence returns `null`, so a membership in another workspace is indistinguishable from one that does not exist.

## Reads take the transaction too

Every workspace-owned method takes the transaction context — **reads included**,
which looks redundant until you know why. RLS tenant context is transaction-local
(`SET LOCAL`), so a read issued on a pooled connection carries no context and,
because the policy fails closed, returns nothing.

Found by a test that expected a workspace to see its own members and got an empty
list. See ADR-004.

## Transaction scope — two explicit methods

```ts
runForWorkspace(workspaceId, op)   // ordinary path
runGlobal(op)                      // user accounts, sessions, system records
```

Never `run(workspaceId?)`. With an optional workspace, forgetting the argument
means unrestricted access — the most dangerous possible default.

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

## DocumentSealer — implemented, still with no consumer

Stated rather than hidden. BACKEND-09 built the implementation; nothing calls it yet, and that stays correct until signing completion exists (BACKEND-38, INV-002).

- **Owned by** application. It needs the capability, so it declares the interface.
- **Defined in** `packages/application/src/common/ports/sealing.ts` — the single declaration in the codebase, asserted by test (INV-071). `ports/index.ts` re-exports it rather than restating it.
- **Implemented by** `NodeDocumentSealer` in `@lagda/sealing`.
- **Consumed by** signing completion only (BACKEND-38, INV-002).
- **One operation** (INV-070). `mergeFields`, `hashDocument` and `renderCertificate` stay private to the sealing package; exposing them would give twenty callers a reason to reach past the seam. A test counts the methods.
- `SealRequest`/`SealResult` are LAGDA-owned. No `pdf-lib` type crosses (INV-008), and document bytes are `Uint8Array` rather than Node's `Buffer` (INV-072) — which is what makes a later Java or .NET implementation a substitution rather than a rewrite.

### What a consumer must supply

The port deliberately pushes three things onto its caller, and a future use case has to provide all three:

- **The document bytes.** The sealer never fetches from object storage, so a remote signer needs no knowledge of LAGDA's storage topology (and no credentials for it).
- **`verificationId`.** Its format is `LAGDA-{workspace}-{date}-{random}`; randomness and identifier namespaces belong to the application, not to a sealing service.
- **`sealedAt`.** From the `Clock` port, so output stays reproducible.

### What a consumer must not do

Call `seal()` inside a database transaction (INV-082). It is slow, it is external, and it cannot be rolled back when the commit later fails.

Full detail in [`docs/backend/sealing/`](../sealing/SEALING_ARCHITECTURE.md).

## Ports deliberately NOT created

`ObjectStorage`, `MalwareScanner`, `NotificationPublisher`, `PasswordHasher`, `TokenGenerator`, `BackgroundWorkScheduler`, `EvidenceRepository`, `AuthorizationService`.

Each is genuinely needed later, and none has a consumer today. Creating them now would produce exactly the decorative architecture this repository has already shipped once. Each belongs to the command that first needs it: BACKEND-17/18 (storage, AV), BACKEND-44 (notifications), BACKEND-19/20 (auth), BACKEND-16 (jobs), BACKEND-10/43 (evidence), BACKEND-27 (authorization).
