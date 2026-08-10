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


## BACKEND-10 — evidence, artifacts and finalization

Defined in `packages/application/src/common/ports/evidence.ts`, re-exported from
`ports/index.ts`. Three scoped repositories join the unit of work
(`uow.evidence`, `uow.artifacts`, `uow.finalizations`), so completion can write
evidence, artifacts, the finalization pair and signing state in one transaction.

| Port | Consumer | Implemented by |
|---|---|---|
| `ScopedEvidenceRepository` | **none yet** — BACKEND-36/38 | `@lagda/db` |
| `ScopedArtifactRepository` | **none yet** — BACKEND-17/38 | `@lagda/db` |
| `ScopedFinalizationRepository` | **none yet** — BACKEND-38 | `@lagda/db` |
| `PublicVerificationLookup` | **none yet** — BACKEND-42 | `@lagda/db` |
| `EvidenceEventIdGenerator`, `ArtifactIdGenerator`, `SealIdGenerator` | as above | composition root |
| `VerificationIdGenerator` | as above | composition root |

`VerificationIdGenerator` is separate from the entity ID generators on purpose:
the value it produces is **published**, so it must be unguessable, while an
entity ID only has to be unique. Merging them would let a routine generator
quietly become the source of a public identifier.

### Backend-owned identifiers

`EvidenceEventId`, `ArtifactId`, `SealId` and `RecipientId` are branded here and
deliberately **not** added to `@lagda/contracts`: none crosses a public boundary.
`VerificationId` is the opposite case and already lives in contracts, because it
is the one identifier the public is expected to hold.

### What a consumer must not do

- Append an evidence event built from client-supplied fields (INV-104). Evidence
  comes from the authenticated actor, the server clock, observed request context
  and authoritative state.
- Expect to correct an evidence row. A correction is a new event.
- Reach `PublicVerificationLookup` from a tenant-scoped path, or widen its
  projection without revisiting INV-099.

## `JobScheduler` — durable background work (BACKEND-16)

Declared in `packages/application/src/common/ports/jobs.ts`. Implemented by
`packages/worker`. The application requests follow-up work through this port and
never imports pg-boss — which is what keeps a use case callable from a test, from
the API and from the worker itself with no queue running.

```ts
enqueue<TPayload>(
  definition: JobDefinition<TPayload>,
  payload: TPayload,
  options?: JobScheduleOptions & { readonly transaction?: unknown },
): Promise<JobReference>;
```

### The `transaction` parameter is the point

Passing the caller's open transaction inserts the job row **inside it**, so
business state and the intent to follow it up commit or roll back together. This
is what removes the need for an outbox table, and it is proven by an integration
test that rolls back and asserts no job exists — see QUEUE_CONSISTENCY.md.

Omitting it is correct when no business write accompanies the job: a maintenance
sweep has no state to be atomic with.

It is typed `unknown` rather than `Transaction<Database>` deliberately.
`@lagda/application` may not name a Kysely type — that would invert the
dependency the architecture rests on. The adapter narrows it.

### What a consumer must not do

- Put resource content, personal data or credentials in a payload. Jobs carry
  identifiers; the handler reloads authoritative state (INV-192). Enqueue refuses
  anything over 16 KiB, but the content rule is not detectable — see
  JOB_DATA_CLASSIFICATION.md.
- Bake a timestamp horizon into a payload. Read the clock in the handler, or a
  job delayed by an outage acts on a stale cutoff (INV-201).
- Assume exactly-once execution. Duplicate delivery is inherent to a durable
  queue; every definition must declare how it stays safe (INV-196).
- Assume ordering. Two jobs enqueued in one transaction may run in either order,
  concurrently. A job that must follow another is enqueued by the first one's
  handler.
- Rename a job type. The name is a persistence contract from the moment a row is
  written (INV-197).

## `ObjectStorage` — document bytes (BACKEND-17)

Declared in `packages/application/src/common/ports/storage.ts`. Implemented by
`packages/storage` over an S3-compatible provider.

```ts
readonly putObject:    (input: PutObjectInput)   => Promise<StoredObject>;
readonly getObject:    (ref: StorageObjectRef)   => Promise<StoredObjectContent | null>;
readonly headObject:   (ref: StorageObjectRef)   => Promise<StoredObjectMetadata | null>;
readonly deleteObject: (ref: StorageObjectRef)   => Promise<void>;
```

Declared as properties rather than method shorthand: no implementation uses
`this`, and a consumer destructuring one capability off an injected object is
doing something normal.

### The split it exists to hold

PostgreSQL owns digest, size, ownership, provenance and creation time. Object
storage owns bytes. A digest in PostgreSQL that no longer describes the stored
bytes is a corrupted document — which is why every round trip is verified by
digest, not by size.

### Types

- `StorageZone` — closed union, `"quarantine" | "artifacts"`. The application
  never names a bucket (INV-208).
- `StorageObjectKey` — branded, one validating constructor. A request-body
  string cannot become one by assignment (INV-205).
- `ByteStream = AsyncIterable<Uint8Array>` — no Node or SDK stream type crosses
  this port (INV-204).
- `ObjectContent` — `bytes` for content already in memory, `stream` for an
  upload.

### `StorageKeyStrategy`

Builds keys from trusted identifiers. Owned as a port because the layout is
infrastructure knowledge: the application knows *which artifact*, not *where
bytes live*.

### What a consumer must not do

- **Accept a key from a client.** Resolve the resource through the tenant-scoped
  repository, take the reference from the record, then call storage. Object
  storage performs no authorization (INV-214).
- **Treat `providerEntityTag` as a digest.** It is an ETag — an MD5, or a
  digest-of-digests, or provider-specific (INV-206).
- **Persist a URL.** The artifact row holds a key. A presigned URL expires and
  is a bearer credential (INV-207).
- **Assume a write and a database write are atomic.** They are not, and never
  will be (INV-215). Write bytes first; an artifact row pointing at nothing is
  far worse than an orphan object.
- **Put a filename, party name or any customer text in a key or in provider
  metadata** (INV-209).
- **Call `deleteObject` from a feature path.** It is a privileged primitive for
  quarantine cleanup and retention workflows.

## Upload ports (BACKEND-18)

Declared in `packages/application/src/common/ports/upload.ts`.

### `DocumentInspector`

`inspect(bytes) => InspectionResult`. Implemented in `@lagda/sealing`, because
INV-001 confines pdf-lib to that package. Returns a detected media type, page
count and page sizes, or a closed failure reason — never a library string, never
a pdf-lib object.

Takes complete bytes rather than a stream: PDF validation needs the
cross-reference table at the end of the file.

### `MalwareScanner`

`scan(input) => MalwareScanResult` and `isAvailable() => boolean`. Implemented in
`@lagda/scanning` over ClamAV's `INSTREAM` protocol.

**Must fail closed.** An implementation that cannot reach its scanner returns
`unavailable`, never `clean` (INV-221). `infected` and `unavailable` are distinct
outcomes because a client may retry one and must never retry the other.

`isAvailable()` never scans a file.

### `ScopedUploadRepository` and `QuarantineCleanupLookup`

Upload processing records, tenant-scoped and part of the `WorkspaceUnitOfWork` —
so an upload row and the artifact it accepts are written on one transaction with
one tenant context. Building the repository separately runs it with no RLS
context at all, which is how the first integration run failed.

`QuarantineCleanupLookup` is deliberately global: cleanup is a system job with no
tenant, and it reads rows rather than listing a bucket.

### What a consumer must not do

- **Trust anything the client said about the file** — filename, extension, media
  type, size, hash (INV-219).
- **Read identity from a multipart field.** Workspace and actor come from the
  authenticated context (INV-224).
- **Treat a non-`clean` scan as acceptable**, or scan failure as clean (INV-221).
- **Write untrusted bytes anywhere but quarantine** (INV-218).
- **Hold a transaction across transfer, inspection or scanning** (INV-227).
- **Log document bytes, a malware payload, or a signature name to a client.**

## MFA ports (BACKEND-23)

| Port | Owns | Implemented by |
|---|---|---|
| `MfaFactorRepository` | factor lifecycle, replay watermark | `@lagda/db` |
| `RecoveryCodeRepository` | issue, consume, count, replace | `@lagda/db` |
| `PendingAuthenticationRepository` | ceremony lifecycle, atomic attempts | `@lagda/db` |
| `SecretSealer` | seal / open, key version | `@lagda/api` (AES-256-GCM) |
| `TotpEngine` | generate, provision, verify, shape | `@lagda/api` (`otpauth`) |
| `RecoveryCodeFactory` | issue a set, digest a submission | `@lagda/api` |
| `PendingAuthCredentialFactory` | issue, digest | `@lagda/api` |

No port exposes a key. `SecretSealer` publishes `keyVersion` and two functions;
the key itself never crosses the boundary.

`TotpEngine` keeps RFC arithmetic and the library's types entirely inside
infrastructure — the application never imports `otpauth`.

**Deliberately no `OtpCodeGenerator` and no `OtpVerifier`.** TOTP issues no code
and stores no verifier; ports for them would have no implementation and no
caller.

## Account ports (BACKEND-24)

| Port | Owns | Notes |
|---|---|---|
| `AccountProfileRepository` | read the current user; write profile; write preferences | **Three methods. No generic patch** — the mass-assignment defence is the absence |
| `AccountCredentialRepository` | read and replace the password hash | Separate on purpose: reaching a hash should need its own import |
| `AccountSessionRepository` | list, revoke one, revoke all others | Every method scoped by `userId` |
| `AccountPendingAuthRevoker` | revoke in-flight MFA ceremonies | Optional, as in password reset |

`UpdatePreferencesDependencies.isKnownTimezone` is a port because zone validity
belongs to the platform's ICU data, not the domain — a hard-coded list would be
wrong the next time the tz database changes. The domain rule that the value must
be an IANA identifier rather than an offset lives in the use case, because
`Intl` accepts offsets and the port alone would let them through.


## Workspace invitation ports (BACKEND-26)

| Port | Purpose |
|---|---|
| `ScopedInvitationRepository` | Management, bound to one workspace and one transaction. Every state transition is a conditional UPDATE, which is the concurrency control rather than a style. |
| `InvitationCredentialLookup` | **One method, one row, read-only.** Resolves an invitation from its digest with no workspace context. The narrow security exception, shaped so it cannot become anything else — no `list`, no `findByWorkspace`, no write. |
| `InvitationCredentialUnitOfWork` | The credential lookup plus `enterWorkspace`, which adds tenant context from the RESOLVED invitation on the same transaction. |
| `InvitationTokenFactory` | `issue()` returns the raw token exactly once; `digest()` returns null for anything that cannot be a token, so a malformed submission is refused by shape before it becomes a query. |
| `InvitationLinkBuilder` | Takes a configured origin and a raw token. **No request parameter** — host-header injection is unexpressible rather than sanitized. |
| `InvitationDeliveryScheduler` | Persists the intent to deliver, inside the transaction. Optional while no notification infrastructure exists (OD-098). |
| `WorkspaceInvitationIdGenerator` | Opaque invitation ids, generated server-side. The id is not the credential. |

`TransactionManager` gains a fourth scope,
`runForInvitationCredential(digest, op)` — the narrowest of the four, and the
only one a non-member can enter.

No provider SDK appears in any of these. The delivery port takes a URL and an
address; what sends it is BACKEND-44/45's problem.
