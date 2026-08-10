# Authorization architecture

**Established by:** BACKEND-27. Read with
[WORKSPACE_CAPABILITY_MATRIX.md](./WORKSPACE_CAPABILITY_MATRIX.md),
[ROLE_GRANT_MATRIX.md](./ROLE_GRANT_MATRIX.md),
[OWNERSHIP_MODEL.md](./OWNERSHIP_MODEL.md) and
[ADR-020](../adr/ADR-020-workspace-role-capability-authorization.md).

---

## 1. The rule

> A role is an **assignment**. A capability is what that assignment permits.
> Feature code asks for a capability; it never compares a role name.

`packages/core/src/authorization/index.ts` is the only file in the backend that
knows which roles have which powers. Everything else — routes, use cases,
repositories — names a capability and gets a boolean or an error.

## 2. Two separate controls

| Question | Answered by | Mechanism |
|---|---|---|
| Which tenant does this belong to? | **tenancy** | `workspace_id`, scoped repositories, RLS |
| May this actor do this here? | **authorization** | the capability policy |

They are not substitutes. RLS stops workspace A reading workspace B; it says
nothing about whether a `member` of A may remove someone from A. Conversely a
capability check says nothing about which tenant's rows a query touches.

**The complete role matrix is deliberately NOT duplicated into RLS.** A policy
per capability would be a second implementation in a language with different
semantics, deployed by migration rather than by code review, and the two would
drift. RLS keeps doing tenant isolation; the application decides actions.

## 3. Where the pieces live

```
@lagda/core/authorization      the policy. Pure: no Fastify, no PostgreSQL,
                               no clock, no environment. 180 tests, nothing
                               mocked.
@lagda/contracts               capability NAMES only, for the projection a
                               client receives. Never the mapping.
@lagda/application             resolves membership, calls the policy, runs
                               the use case.
@lagda/api                     routes. No role, no capability decision.
```

An architecture test asserts the policy file contains none of `fastify`,
`kysely`, `pg`, `node:crypto`, `process.env` or `Date.now`.

## 4. The chain

```
  session cookie      →  UserId              AUTHENTICATION
  path segment        →  requested tenant    ADDRESSING
  membership lookup   →  WorkspaceAccessContext { workspaceId, userId,
                                                  membershipId, role }
  capability policy   →  allow / deny        AUTHORIZATION
  use case            →  the operation
```

`WorkspaceAccessContext` is obtainable only from `resolveWorkspaceAccess`, which
reads the authoritative membership row. There is no constructor a route can
reach and no way to assert one into existence from client input.

## 5. Nothing authoritative is in the session

`AuthenticatedActor` is `{ actorType, userId, sessionId }`. No role, no
capability list, no workspace — since BACKEND-13, and an architecture test
asserts it stays that way.

Four consequences, each tested:

| Property | Why it holds |
|---|---|
| A role change takes effect on the next request | the role is read from the database every time |
| A demotion removes authority immediately | same |
| Removal revokes access with no logout | the membership row is gone; the session is untouched |
| Removal from one workspace leaves the others alone | the session authenticates a **user**, not a tenant |

## 6. Two authorization shapes, and when to use which

**Reads and simple mutations** — `requireCapability(userId, workspaceId,
capability, deps)`. Resolves membership, checks the policy, returns the context.
Used by workspace read/update and all four invitation operations.

**Member administration** — the actor's membership is read **inside** the
mutation's own transaction, alongside the target's row and the owner count:

```
begin
  load the ACTOR's membership     ← authority, read now
  require the capability
  load the TARGET's membership
  enforce the ownership invariants ← owner count, read now
  mutate conditionally on the role that was checked
commit
```

The race this closes: an administrator demoted while their "remove this member"
request is in flight. A pre-transaction check saw the old role; the write lands
afterwards with authority they no longer have. Small window, most destructive
operations — the combination worth closing (§149, §150). Proved against
PostgreSQL by demoting them and watching the next write fail.

Not every operation needs it. A rename that commits under a role revoked
milliseconds earlier is a cosmetic problem; a removal is not.

## 7. Denials are hidden 404s

A member without a capability gets the same `ResourceNotFoundError` as a
non-member and as someone naming a workspace that does not exist. Three cases,
one answer, so no endpoint distinguishes them — and no response ever explains
the role policy (§77).

The cost is that a legitimate member who genuinely lacks a capability sees a 404
rather than a 403. That is the deliberate trade, and the capability projection
is what stops them getting there: a client hides controls it cannot use.

`RoleGrantDeniedError` (403) and `LastOwnerViolationError` (409) are the
exceptions, and both are reachable only by a caller who has **already** proved
they may administer members — so neither discloses anything they could not
already infer, and both describe a failure retrying will not fix.

## 8. The capability projection

`GET /workspaces/:workspaceId/access` returns the caller's role, membership id
and capability list.

**Informational.** Every mutation re-evaluates the policy against a membership
row read at the time of the write. A client that fabricated the list, cached a
stale one, or skipped the call entirely changes nothing about what it may do.

Any member may ask what **they** can do — that needs no capability, because a
member who could not discover their own authority could not render a usable
interface, and the answer discloses nothing about anyone else.

A TypeScript monorepo would make it easy to share the policy code itself with
the browser. That is deliberately not done: a frontend evaluating the policy is
a second implementation to keep in step, and treating its answer as a control
would put the browser in the enforcement path.

## 9. System actors are a different realm

A background job has no membership and is never given one. `SystemActor` is
`{ kind: "system", reason }` — no role field, asserted by an architecture test.

A worker that needed a fake `owner` membership to pass a human authorization
check would be a real membership with real authority, indistinguishable in the
database from a person. System execution gets explicit narrow use cases instead
(BACKEND-16).

The same separation is why platform administration (BACKEND-59) and future API
keys (BACKEND-52) will not be workspace roles. The architecture should eventually
support several actor types; today only human membership is implemented, which
is what the product has.

## 10. Extending this

A future command adds a capability **when it adds the operation**:

1. `WORKSPACE_CAPABILITIES` in `@lagda/core`;
2. `WORKSPACE_CAPABILITY_NAMES` in `@lagda/contracts` if a client needs it — a
   test compares the two lists;
3. every role's entry in `ROLE_CAPABILITIES`, a total `Record`, so omitting one
   is a compile error;
4. the `EXPECTED` table in `authorization.test.ts`;
5. WORKSPACE_CAPABILITY_MATRIX.md.

Then `requireCapability(..., "the.new.capability", deps)`. **Not** a role
comparison — an architecture guard greps every package for one and permits
exactly four files.

## 11. If custom roles are ever needed

Recorded so the path exists without being built (§159).

Today: `WorkspaceRole` is a column value; capabilities derive from it in code.

Then: a `workspace_roles` table of role definitions and a
`role_capabilities` table of assignments, with the seven current roles seeded as
system rows. `hasCapability` becomes a lookup against loaded definitions instead
of a frozen map, and its signature does not change — which is why every caller
naming a capability rather than a role matters.

That is a substantial change and it needs an ADR. It is not warranted now: the
frontend's custom-role builder composes permissions over documents, templates,
contacts and billing, and 26 of its 30 permissions govern operations that do not
exist. OD-105.
