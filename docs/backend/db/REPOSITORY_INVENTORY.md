# Repository Inventory

Every application repository port, classified. **Counts:** IMPLEMENT_NOW 2 ·
FOUNDATION_ONLY 0 · PLANNED 13 · DEFERRED 6.

## Implemented

| Port | Adapter | Scope | Tables | Methods | Transaction |
|---|---|---|---|---|---|
| `ScopedWorkspaceRepository` | `createScopedWorkspaceRepository` | bound workspace | `workspaces` | `find`, `insert` | built by the UoW |
| `ScopedMembershipRepository` | `createScopedMembershipRepository` | bound workspace | `workspace_memberships` | `findMember`, `findByUser`, `list`, `countOwners`, `insert`, `changeRoleIfUnchanged` | built by the UoW |

Both are **FOUNDATION-level**, not feature-complete. BACKEND-25 owns the
workspace feature — invitations, ownership transfer, member removal.

Neither is exported from `@lagda/db`'s entry point. They are constructed by the
unit of work, which is what guarantees they share one transaction; an
independently built repository could hold the pool instead.

## Planned

`UserRepository` (BACKEND-19) · `SessionRepository` (BACKEND-13/19) ·
`InvitationRepository` (BACKEND-25) · `ContactRepository` (BACKEND-28) ·
`DocumentRepository` (BACKEND-29) · `DocumentArtifactRepository` (BACKEND-29/17)
· `SigningRequestRepository` (BACKEND-31) · `RecipientRepository` (BACKEND-31) ·
`TemplateRepository` (BACKEND-33) · `EvidenceRepository` (BACKEND-10/43) ·
`VerificationRepository` (BACKEND-42) · `IdempotencyRepository` (BACKEND-14) ·
`OutboxRepository` (BACKEND-16).

## Deferred

Search projections (BACKEND-48) · report projections (BACKEND-49) · webhook
subscriptions (BACKEND-53) · API keys (BACKEND-52) · billing and usage
(BACKEND-50/51) · administrative cross-tenant repositories (BACKEND-59).

## On the outbox

BACKEND-05 recorded durable follow-up as unsolved and it **remains unsolved**.
The table is not created here because its shape depends on the job system
(BACKEND-16), and guessing it now would produce a schema the queue then has to
migrate around. No use case publishes events, so nothing pretends otherwise.

## Rule

One repository per **aggregate**, not per table. `SigningRequest` will span
`signing_requests`, `recipients` and fields, and should be one repository
because those rows must be consistent together. Table count is not the boundary.


## BACKEND-10 additions

| Repository | Scope | Methods | Status |
|---|---|---|---|
| `ScopedEvidenceRepository` | workspace + transaction | `append`, `listForSigningRequest` | **Implemented.** Append-only — no update or delete exists, and the runtime role has no privilege for either |
| `ScopedArtifactRepository` | workspace + transaction | `insert`, `find`, `listForDocument` | **Implemented.** Insert-only in practice: no UPDATE privilege |
| `ScopedFinalizationRepository` | workspace + transaction | `recordFinalization`, `findBySigningRequest` | **Implemented.** Writes seal + verification together, deliberately as one method |
| `PublicVerificationLookup` | **global, no tenant context** | `findByVerificationId` | **Implemented, unconsumed.** Not on the unit of work — see INV-099/100 |

Three repositories for four tables. Grouping follows aggregates: a seal and its
verification record are always written together, and separate repositories would
make that pairing a convention rather than a signature.

`PublicVerificationLookup` is deliberately off the unit of work. Nothing holding
a workspace transaction can reach it, and nothing holding it can reach anything
else.
