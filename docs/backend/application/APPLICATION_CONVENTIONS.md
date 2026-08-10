# Application Layer Conventions

Rules for `@lagda/application`. Authoritative for every use-case command.

## Shape

A class with explicit constructor dependencies and one `execute(input)` method.

```ts
const useCase = new CreateWorkspace({ workspaces, memberships, transactions, clock, workspaceIds, memberIds });
await useCase.execute({ ownerUserId, name });
```

No inheritance, no base class, no command bus, no mediator, no DI container. Manual constructor injection is enough, and it keeps invocation obvious — a reader can see every capability a use case has by reading its constructor.

**Each use case receives only the ports it needs.** No `ApplicationServices` bag: a use case that can reach storage, email and the queue is a use case whose blast radius nobody can bound.

## Command vs query

Naming and responsibility discipline, not CQRS. **Commands** change state and usually need a transaction (`CreateWorkspace`). **Queries** read (`GetWorkspaceMember`). Same database, same package.

## Time and identity

`Clock` supplies "now"; the use case passes the value into pure domain functions. No `Date.now()` in a use case where time affects behaviour.

Explicit generators supply entity IDs. Generating before persistence lets the workspace and its membership be built and written together, and lets a test predict both.

**Client-supplied `signedAt`/`completedAt` is never authoritative.** Server clock stamps evidence-relevant events.

## Actor context

Resolved identity, never transport. Three kinds, deliberately separate:

- `UserActor` — authenticated user inside a workspace they belong to
- `RecipientActor` — external signer holding access to one transaction, **not** a workspace member with fields missing
- `SystemActor` — scheduled work, with a `reason`, rather than borrowing a human's ID

Collapsing them into one optional-field context makes "who did this?" unanswerable in evidence.

`ObservedRequestEvidence` (IP, user-agent) is separate again, passed only where needed. **Server-observed only** — a client-declared IP in a request body is a claim, not evidence.

**Workspace scope comes from the actor, not the request.** A caller-supplied workspace ID would be a client-controlled tenant boundary.

## Errors

Typed, HTTP-independent, carrying a `category` that BACKEND-03 already maps to a status. No status code, no header, no log level in an application error — that is what lets one use case serve an HTTP route, a worker, and a future partner API.

Domain failures are **translated**, not re-thrown: an `InvalidStateTransitionError` becomes a `ResourceConflictError`, so an internal domain vocabulary never reaches a client and can change without breaking one.

Never branch on message text. `cause` is kept for diagnosis and is never serialized.

Messages name resources by kind, never by value — no email addresses, no tokens, no document names.

## Ordering

Cheap validation → authorization → load and validate state → persist → follow-up. Nothing irreversible happens before a check that could have prevented it: no email before discovering the request cannot be sent.

**External side effects do not belong inside a transaction.** Email delivery and storage uploads hold it open for as long as the network takes and cannot be rolled back when the commit later fails.

## Events

Do not publish before the state they describe is durably committed — a `SigningRequestSent` event followed by a failed save tells the world about something that did not happen. Publishing *after* commit with no outbox drops the event if the process dies in between.

**Neither is solved.** BACKEND-06/16 must provide transactional outbox semantics. Until then, no use case claims durable follow-up.

## Reliability

Assume **at-least-once** execution. Never claim exactly-once. Retry safety comes from idempotent processing against authoritative state, transactional consistency, and deduplication.

## Testing

Instantiate directly with fakes. No database, no HTTP server, no network. Fakes respect tenancy exactly as the real ports demand — a permissive fake would let a cross-tenant bug pass its own test.

Fixed clocks and sequential ID generators, so assertions mean the same thing in any year.

## Prohibited

`fastify` · `pg` · `pg-boss` · `pdf-lib` · AWS SDK · `pino` · `process.env` · `node:fs` · and LAGDA's own `@lagda/db`, `@lagda/storage`, `@lagda/sealing`.

The last three are easy to miss: they *implement* application's ports, so importing them inverts the dependency the architecture is built on. Enforced by ESLint, with the composition roots exempted.

## Authorization (BACKEND-27)

**A feature use case declares the CAPABILITY it needs. It does not name a role.**

```ts
const access = await requireCapability(
  userId, workspaceId, "contact.create", deps);
```

Not `if (access.role === "administrator")`. Which roles hold a capability is the
policy's question, and it is answered in exactly one place —
`packages/core/src/authorization/index.ts`. An architecture guard greps every
package for a role comparison and permits four files.

The one exception is an operation whose SUBJECT is the role itself — changing a
member's role, counting owners. There the role is the thing being modified, not
the authority being checked.

**Authorization lives at the application boundary, not only in a route hook.** A
worker, a partner API and a CLI can all invoke a use case, and none has a
request. A route may resolve the context early for efficiency; the use case must
not become unsafe when called from anywhere else.

**Sensitive mutations read the actor's authority inside their own transaction.**
For member administration and anything that could reduce the owner count, resolve
the actor's membership through the same unit of work as the write. A
pre-transaction check can commit under authority that was revoked in between —
AUTHORIZATION_ARCHITECTURE.md §6 has the shape.

Ordinary reads and simple mutations do not need it. A rename that commits under
a role revoked milliseconds earlier is cosmetic; a removal is not.
