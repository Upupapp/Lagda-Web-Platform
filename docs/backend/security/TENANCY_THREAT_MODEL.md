# Tenancy Threat Model

Cross-tenant failure modes and the layer that stops each. The point of listing
them is that **no single control covers them all** — several are invisible to
RLS, and several are invisible to repository scoping.

| # | Threat | Primary control | Defence in depth | Status |
|---|---|---|---|---|
| T-1 | **IDOR/BOLA** — caller supplies another workspace's resource ID | Workspace-scoped repository | RLS `USING` | **Tested** |
| T-2 | **Unscoped query** — a repository method forgets its tenant predicate | RLS `USING` | Code review | **Tested** — the one repository scoping cannot catch |
| T-3 | **Cross-tenant relationship** — child in A references parent in B | Compound FK | Application invariant | **Partially** — FK target in place; referencing tables arrive with them |
| T-4 | **Cross-tenant write** — insert or update a row into another workspace | RLS `WITH CHECK` | Repository scope | **Tested** |
| T-5 | **Ownership change** — move a row between workspaces | RLS `WITH CHECK` | No generic setter exists | **Tested** |
| T-6 | **Pooled context leak** — a connection carries A's context into B's request | `SET LOCAL`, transaction-only | Single point of issue | **Tested**, incl. after rollback |
| T-7 | **Missing context** — a bug loses tenant scope entirely | Fail closed: policy matches nothing | — | **Tested** |
| T-8 | **Privileged bypass** — runtime role sees everything | Non-owning role, no `BYPASSRLS`, `FORCE RLS` | — | **Tested** — asserted before any other RLS test |
| T-9 | **Worker loads wrong tenant** | Job payload carries `workspaceId`; worker opens a tenant transaction | RLS | Handoff BACKEND-16 |
| T-10 | **Search/report missing predicate** | Scoped query at SQL level | RLS | Handoff BACKEND-48/49 |
| T-11 | **Cache key missing tenant** | Tenant in every cache key | — | Handoff — no cache exists |
| T-12 | **Storage object mismatch** | DB metadata authoritative; key prefix is not authorization | — | Handoff BACKEND-17 |
| T-13 | **Workspace ID guessing** — enumerate identifiers to find real tenants | Membership check on every request | Opaque server-generated IDs raise the cost | **Tested** — a fabricated ID resolves nothing |
| T-14 | **Cross-tenant existence oracle** — 403 for a real workspace, 404 for a fictional one | One resource-hiding 404 for both | Identical code and message | **Tested** — both responses compared field by field |
| T-15 | **Body workspace spoofing** — a request body names a different tenant from the path | No `workspaceId` on any request schema | `additionalProperties: false` | **Tested** — the payload is a 422 |
| T-16 | **Owner spoofing** — a client nominates someone else as creator | Creator taken from `AuthenticatedActor` | No such field on the input type or the schema | **Tested** — ten privileged payloads rejected |
| T-17 | **Membership bypass** — reaching tenant data without a membership | `resolveWorkspaceAccess` per request | RLS + explicit `user_id` predicate | **Tested** |
| T-18 | **Stale session authority** — a credential keeps granting access after removal | The session carries no workspace state | Membership read per request | **Tested** — removal takes effect on the next call, same session |
| T-19 | **User-context leak** — `lagda.user_id` rides a pooled connection | `set_config(..., true)` | Single point of issue, in the UoW | **Tested** — a later transaction sees nothing |
| T-20 | **Write through the user-scoped path** — using the membership read path to mutate | Policies are `FOR SELECT` | No write repository on `UserUnitOfWork` | **Tested** — UPDATE affects zero rows, INSERT raises |
| T-21 | **Orphan tenant** — a workspace committed without a membership | Both writes in one transaction | FK forces the failure to be real | **Tested** — rollback leaves neither row |
| T-22 | **Duplicate membership** — two rows, two roles, no rule | `UNIQUE(workspace_id, user_id)` | Application pre-check for the message only | **Tested** |
| T-23 | **Ghost membership** — a membership naming a nonexistent account | FK to `users` (migration 013) | — | **Tested** |
| T-24 | **Archived-workspace mutation** | **Not applicable** — there is no archived state | — | **N/A** — WORKSPACE_LIFECYCLE.md |
| T-25 | **Workspace name disclosure via telemetry** | Names never logged, never a label | IDs only, changed-fields only | **Tested** — the full captured log is searched for the name |
| T-13 | **Webhook / API key cross-tenant** | Subscription and key resolve one workspace | RLS | Handoff BACKEND-52/53 |
| T-14 | **Enumeration via error differences** | Cross-tenant reads return not-found, identical to absent | — | **Tested** at application layer |
| T-15 | **Enumeration via unique constraint errors** | Tenant-scoped uniqueness | Generic public errors | Convention |
| T-16 | **Admin/support leakage** | Privileged access is a separate named capability, never a flag | Audit | Handoff BACKEND-59 |
| T-17 | **Idempotency key collision across tenants** | Key identity includes tenant scope | — | Handoff BACKEND-14 |

## Things that are not tenancy controls

**Frontend route guards.** UI that cannot navigate somewhere is not a backend
boundary; an API client ignores it entirely.

**CORS.** Governs which origins may read a response. It is not authentication,
authorization, or tenancy.

**Opaque IDs.** Unguessable identifiers raise the cost of an attack. They are not
access control — T-1 assumes the attacker has the ID.

**Storage key prefixes.** `workspaces/{id}/…` helps operations. Anyone who can
name the key can fetch it unless the database says otherwise.

## Tenancy is not authorization

Tenant scope answers *whose data is this?* Authorization answers *may this actor
do this?* Both are required, and BACKEND-27 owns the second. A workspace owner is
powerful **inside** their workspace and has no standing outside it — no role
grants cross-tenant reach.


## Workspace invitations (BACKEND-26)

A non-member can now interact with a tenant-scoped table through a credential.
That is a new shape in this threat model and it gets its own rows.

| # | Threat | Primary control | Defence in depth | Status |
|---|---|---|---|---|
| T-26 | **Invitation token guessing** | 256 bits from a CSPRNG | IP rate limit on preview and accept | **Tested** — entropy and format asserted |
| T-27 | **Token theft or forwarding** | Acceptance requires a session whose canonical email matches | The token alone previews four fields and grants nothing | **Tested** |
| T-28 | **Enumeration through the credential path** | Policy matches equality on a UNIQUE column, so at most one row | Digest lookup, never an id | **Tested** — a predicate-free SELECT returns exactly one row |
| T-29 | **RLS bypass through the credential path** | The policy is `FOR SELECT`; no `BYPASSRLS`, no `SECURITY DEFINER` | Writes still require tenant context | **Tested** — an UPDATE from the credential scope affects zero rows |
| T-30 | **Credential context leak across pooled connections** | `set_config(..., true)` | Single point of issue, in the unit of work | **Tested** |
| T-31 | **Role tampering at acceptance** | Role read from the persisted invitation | No `role` field on the accept schema | **Tested** — 422 |
| T-32 | **Workspace tampering at acceptance** | Workspace resolved from the invitation | No workspace field on the accept schema | **Tested** — 422 |
| T-33 | **Owner escalation by invitation** | `owner` absent from the invitable union | Independent database CHECK | **Tested** at both layers |
| T-34 | **Cross-tenant invitation access** | Scoped repository with no workspace parameter | `tenant_isolation` | **Tested** |
| T-35 | **Duplicate membership through concurrent acceptance** | Conditional UPDATE on four terminal timestamps | `UNIQUE(workspace_id, user_id)` | **Tested** — two concurrent acceptances, one membership |
| T-36 | **Email bombing through create or resend** | Four fail-closed policies, per user and per workspace | Create refuses a live duplicate | **Partially** — policies bound, no 429 test |
| T-37 | **Link-scanner acceptance** | No GET route consumes or previews | Preview creates nothing | **Tested** — four GET shapes, all 404 |
| T-38 | **Stale or superseded links** | Resend rotates the digest in place | Exactly one valid link at any moment | **Tested** |
| T-39 | **Resend stranding the invitee** | Rotation and scheduling share a transaction | — | **Tested** in memory and on PostgreSQL |
| T-40 | **Host-header injection into an invitation link** | The link builder takes a configured origin and has no request parameter | — | **Enforced by construction** |
| T-41 | **Archived-workspace acceptance** | **Not applicable** — there is no archived state | — | **N/A** |
| T-42 | **Invitation history erasure** | The runtime role has no `DELETE` grant | Revocation is a timestamp | **Tested** |

**The limit, stated plainly.** If an attacker controls the invited mailbox AND
an account for that address, they can accept. No email-based invitation can
distinguish them from the legitimate owner. What the design buys is that BOTH
are required — reading the email is not enough and holding an account is not
enough.

## Authorization (BACKEND-27)

Tenancy answers *whose data*. These are the *what may you do* threats, and they
live inside a tenant the actor is legitimately in.

| # | Threat | Primary control | Defence in depth | Status |
|---|---|---|---|---|
| T-43 | **Vertical escalation** — a member acts as an administrator | Capability policy, default-deny | Hidden 404 discloses nothing | **Tested** — every role against every capability |
| T-44 | **Self-promotion** | Actor compared to target before the grant rule | No capability permits it either | **Tested** from every role |
| T-45 | **Peer escalation to OWNER** | `canGrantRole` refuses `owner` first, unconditionally | Invitable list, database CHECK | **Tested** — four layers |
| T-46 | **Client-supplied capabilities** | No capability or permission field on any schema | `additionalProperties: false` | **Tested** |
| T-47 | **Horizontal escalation** — administering another tenant's member | Workspace-scoped repository with no workspace parameter | `tenant_isolation` RLS | **Tested** with real ids from another tenant |
| T-48 | **Stale role in a session** | No role in the credential | Membership read per operation | **Enforced by construction** + architecture test |
| T-49 | **Stale authorization pre-check (TOCTOU)** | Actor's membership read inside the mutation transaction | Conditional write on the checked role | **Tested** — demoted actor's next write fails |
| T-50 | **Last-owner deletion** | `wouldRemoveLastOwner`, count read in-transaction | Conditional write | **Tested** — two concurrency tests |
| T-51 | **Owner-removal race** | Both transactions read the count and refuse | — | **Tested** — ten rounds of three racing operations |
| T-52 | **Member-removal race** | Conditional delete on the expected role | — | **Tested** |
| T-53 | **System actor impersonating an owner** | `SystemActor` has no role field | Separate execution context | **Enforced architecturally** + test |
| T-54 | **Role policy disclosure** | One hidden 404 for non-member and under-privileged alike | No response explains the policy | **Tested** — identical code and message |
| T-55 | **Persisted per-member override** | Capabilities derive from the role; nothing is stored | — | **Tested** — schema scanned |
| T-56 | **Member directory disclosure** | `membership.view`, held by two roles | Emails never logged or labelled | **Tested** |

**The residual risk.** An administrator can create peer administrators. That is
the product's own model — its permission table grants `members:invite` and its
invite form offers Administrator — and the escalation is bounded: never a
superior, and the owner can demote any of them. ROLE_GRANT_MATRIX.md records it
as a deliberate choice rather than an oversight.


## Documents and artifacts (BACKEND-29)

| Threat | Control | Status |
|---|---|---|
| Cross-tenant document read / list / rename | Scoped repository (no workspace parameter) + `tenant_isolation` FORCE RLS + hidden 404 | **ENFORCED** — probed as the runtime role |
| **Cross-tenant artifact linking** | **Compound FK `(workspace_id, document_id)`** on `document_artifacts`, added by migration 016 | **ENFORCED BY THE DATABASE** — probed with a B-context insert naming an A document |
| Artifact-id guessing | Scoped artifact repository; a document resolves only artifacts in its own tenant | **ENFORCED** — a foreign-workspace artifact never resolves as a source |
| Storage-key injection | One-property request schemas, `additionalProperties: false`; keys derived from authorized ids | **ENFORCED** — ten forbidden properties, each 422 |
| Storage-key leakage | The read model has no field for it; the exclusion is in the projection, not the serializer | **ENFORCED** — response key set pinned |
| Malware / quarantine upload bypass | No storage path in the document domain; only `processUpload` writes an `original` | **ENFORCED** — three import guards; creation writes no artifact |
| Client hash spoofing | Digest, size and media type are server-observed; page count comes from the inspector | **ENFORCED** — no such field on any schema |
| Document metadata mass assignment | Named `rename` operation, not a patch object | **ENFORCED** — no generic update exists |
| Artifact overwrite | Rename writes one varchar; no storage client; one-ORIGINAL index | **ENFORCED** — whole artifact row compared before/after |
| Unsafe delete cascade | RESTRICT everywhere; no DELETE grant | **ENFORCED** — raw DELETE refused as the runtime role |
| Document content in logs | No bytes exist in this layer | **N/A** |
| Document TITLE in logs | `titleLength` logged instead, computed before the call | **ENFORCED** — live serialized-log assertion plus two source guards |
| Presigned-URL leakage | No download endpoint; no URL is generated | **N/A** — OD-114 |
| Stale-role authorization | The actor's membership is read inside the mutation transaction | **ENFORCED** — demotion mid-flight probed |
| Document-id enumeration | Opaque ids, but the real controls are RLS, the scoped repository and the hidden 404 | **ENFORCED** — opacity is not treated as the defence |

The one worth singling out is **cross-tenant artifact linking**. It was open
from migration 003 until now: `document_artifacts.document_id` was `NOT NULL`
with no foreign key, and BACKEND-18 then wrote that caller-supplied value into
the storage key. Nothing but application code stood between it and a document in
one workspace pointing at bytes in another. It is now a constraint violation.
