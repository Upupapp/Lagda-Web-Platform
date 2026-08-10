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


## Document preparation (BACKEND-30)

| Threat | Control | Status |
|---|---|---|
| Cross-tenant preparation read or edit | Scoped repository + `tenant_isolation` FORCE RLS + hidden 404 | **ENFORCED** — probed as the runtime role |
| Cross-tenant artifact targeting | Compound FK `(workspace_id, source_artifact_id)` | **ENFORCED BY THE DATABASE** — probed |
| Cross-tenant field attachment | Compound FK `(workspace_id, preparation_id)` | **ENFORCED BY THE DATABASE** — probed |
| Malicious out-of-page coordinates | Domain rule, request schema and database CHECK | **ENFORCED** — partial overflow refused too, never clipped |
| NaN / Infinity geometry | Explicit finite check BEFORE any comparison | **ENFORCED** — a comparative check alone would pass NaN |
| Browser-pixel coordinate confusion | Contract accepts only normalized 0–1 | **PARTIALLY ENFORCED** — the backend cannot tell a correct conversion from a lucky one; OD-126 |
| **Page rotation mismatch** | Inspector records rotation; preparation REFUSES rotated and unknown | **ENFORCED** — previously silent misplacement; OD-124 |
| Field type or config tampering | Closed union, `additionalProperties: false`, database CHECK | **ENFORCED** — 422, and no generic config bag exists |
| Client state spoofing | `state`, `lockedAt`, `revision`, `sourceArtifactId`, `workspaceId`, `preparationId` all refused | **ENFORCED** — 422 each, probed |
| Submitted-value injection | No value column; `value`/`signatureValue`/`signedAt` refused | **ENFORCED** — 422 |
| Editing a frozen preparation | `locked_at is null` inside the claiming UPDATE | **ENFORCED** — probed by locking a row directly |
| Stale-tab overwrite | `expectedRevision` in the same UPDATE | **ENFORCED** — 409, newer work preserved |
| Source artifact replacement race | Preparation names the exact artifact | **DOCUMENTED** — detection is possible; the migration policy is OD-115 |
| PDF overwrite | No PDF library, no storage client, no sealer in the domain | **ENFORCED** — three guards; whole artifact row compared before/after |
| Field layout or label in logs | Counts only, computed before the log call | **ENFORCED** — two guards plus a live serialized-log assertion; reads unlogged |
| Assignee PII in logs | The slot is never logged | **ENFORCED** — becomes more important once BACKEND-31 makes it a real identity |
| Stale-role editing | Authority read inside the mutation transaction | **ENFORCED** — demotion mid-flight probed |

The one worth singling out is **page rotation**. It was not a new risk this
command introduced — it has been latent since the sealer was written, because
`page.getSize()` returns the unrotated mediabox while every viewer renders the
rotated page. Nothing in LAGDA had ever looked at rotation, so a sideways-scanned
contract would have had every field placed into the wrong coordinate space with
no error anywhere. It is now inspected, persisted, and refused.

## Recipients (BACKEND-31)

| Threat | Control | Status |
|---|---|---|
| Reading another tenant's recipients | `tenant_isolation` + FORCE; scoped repository | **ENFORCED** - probed as the runtime role |
| Assigning a field to another PREPARATION's recipient, same tenant | Three-column foreign key | **ENFORCED** - the case RLS cannot catch; probed with a sibling preparation |
| Naming another tenant's preparation or contact on a recipient | Compound foreign keys | **ENFORCED** - probed as the runtime role |
| Probing which recipient ids exist | Resolution through the preparation; absent and forbidden are one answer | **ENFORCED** - a real id via the wrong document is a 404 |
| Client-chosen recipient id | Server generator; 422 on any supplied id | **ENFORCED** |
| Forged provenance ("this came from contact X") | `sourceContactId` excluded from `RecipientUpdate` and both request schemas | **ENFORCED** - 422 |
| Enumerating LAGDA accounts through a recipient address | No lookup exists; the brands make one a compile error | **ENFORCED BY TYPES** |
| Claiming an unearned verification or signature | No column, no field, no route accepts one | **ENFORCED BY ABSENCE** - eleven identifiers guarded |
| Two invitations to one mailbox for one document | Unique index on the folded address | **ENFORCED** - concurrent inserts probed |
| Bypassing the duplicate rule by add-then-rename | The same check on PATCH, plus the index | **ENFORCED** |
| Silent destruction of placed fields | RESTRICT, plus a count for the message | **ENFORCED** - fields asserted present after a refused delete |
| Demoting a signer out from under their fields | `canHoldFields` checked before the type change | **ENFORCED** - refused with the count |
| Participant PII in logs or metrics | Counts, ids and vocabulary only | **ENFORCED** - whole serialized lines asserted against real PII fixtures |
| Recipient details in a shared cache | `no-store` on every route | **ENFORCED** |
| Unbounded writes from one request | 50-recipient ceiling; `maxItems` on the order route | **ENFORCED** |
| Stale-role editing | Authority read inside the mutation transaction | **ENFORCED** - the same pattern as every other domain |

The one worth singling out is the **within-tenant parent**. Every tenancy
control before this command answered "is this row mine?", and the answer was
always the workspace. A field naming a recipient of a different document in the
same workspace passes that question and is still wrong. It is the first place
LAGDA needed a containment check *below* the tenant, and it is worth assuming it
will not be the last: any future reference into a preparation, a signing request
or a ceremony needs the parent in its key, not just the workspace.

## Signing requests (BACKEND-32)

| Threat | Control | Status |
|---|---|---|
| Mutable preparation changing a historical request | Everything is COPIED; the read path touches no mutable repository | **ENFORCED** - eight independence tests plus a positional architecture guard |
| Mutable Contact changing recipient identity | Two snapshots away; no recipient file references contacts at all | **ENFORCED** |
| Mixed-revision snapshot | All reads and writes on one unit of work | **ENFORCED** - both interleavings with a concurrent save are coherent; atomicity probed |
| A field assigned to another REQUEST's recipient | Three-column foreign key | **ENFORCED BY THE DATABASE** - the case RLS cannot catch |
| Cross-tenant request, document, artifact or preparation | Compound foreign keys plus RLS | **ENFORCED** - probed as the runtime role |
| Client injecting recipients or fields | An EMPTY closed creation body | **ENFORCED** - 422 |
| Client choosing the source artifact | Resolved from the preparation; no input field exists | **ENFORCED** |
| Client spoofing the state | 422 at the schema, and a CHECK admitting only `draft` | **ENFORCED** twice |
| Client claiming another creator | Taken from the session | **ENFORCED** |
| Idempotent retry creating a duplicate workflow | Required key; claim inside the business transaction | **ENFORCED** - concurrent same-key produces exactly one request |
| Retry after an edit creating a SECOND workflow from the new revision | The fingerprint is the document alone | **ENFORCED** - the T0-T3 sequence is a test |
| Editing a snapshot after creation | No UPDATE grant on either snapshot table | **ENFORCED BY PRIVILEGE** - attempted write returns permission denied |
| A workflow that can never complete becoming durable | The readiness gate, before any id is generated | **ENFORCED** - seven blockers |
| Stale-role authorization | Membership read inside the mutation transaction | **ENFORCED** |
| Request snapshot PII in logs | Counts and ids only | **ENFORCED** - whole serialized line against real fixtures; reads unlogged |
| Storage key reaching a client | Not in any projection | **ENFORCED** - `sourceArtifactId` is not even exposed |
| Probing which request ids exist | Scoped lookup; absent and forbidden are one answer | **ENFORCED** - hidden 404 |

The one worth singling out is **the read path**. Every other control here fails
loudly: a constraint violates, a schema rejects, a grant denies. A `getSigningRequest`
that joined to `contacts` to resolve a display name would fail nothing. Every
independence test would still pass, because they assert on stored rows. The
snapshot would be intact and the API would quietly serve current data.

That is why the guard for it is positional rather than textual: it slices the
use-case file at `getSigningRequest` and forbids `uow.contacts`,
`uow.recipients`, `uow.preparations`, `uow.documents` and `uow.artifacts` after
that point. Any future read that reaches for mutable state fails a test rather
than passing review.

## Send (BACKEND-33)

| Threat | Control | Status |
|---|---|---|
| Duplicate send from a double click | Required idempotency key | **ENFORCED** - replay mints nothing |
| Duplicate send under a different key | `where state = 'draft'` in the claiming UPDATE | **ENFORCED** - 409, counts unchanged; concurrent case probed |
| A retry creating a second signing link | One active grant per recipient; one intent per grant | **ENFORCED BY THE DATABASE** |
| Sending after the sender lost the capability | Membership read inside the transaction | **ENFORCED** - removed-member test |
| Client choosing who receives a link | Routing policy derives the cohort; empty closed body | **ENFORCED** - 422 |
| Client supplying recipients, fields or state | Same | **ENFORCED** |
| Mutable preparation reread at send | Module-path architecture guard | **ENFORCED** - the guard that would fail silently otherwise |
| Cross-tenant send | Scoped repositories, RLS, membership | **ENFORCED** in the use case; no end-to-end route assertion |
| Cross-request access grant | Three-column foreign key | **ENFORCED BY THE DATABASE** |
| Raw bootstrap token leaking into the grant table | Digest-only column with a shape CHECK | **ENFORCED** - and the assertion caught a bad test double |
| Raw token leaking into logs or metrics | Payload-scoped guard; bounded labels only | **ENFORCED** |
| Signing URL leaking anywhere | Only the TOKEN is sealed; the URL is built at render time | **ENFORCED** - never stored, never logged, never returned |
| Host-header link injection | The builder takes no request and cannot see one | **ENFORCED** |
| Insecure secret storage | AES-256-GCM, own key, key-versioned | **ENFORCED** - no key means Send fails, tested |
| A request marked SENT with no durable access | The transition is the LAST statement in the transaction | **ENFORCED** - positional guard + rollback tests |
| Sequential routing activating the wrong recipients | `planActivation`, pure and deterministic | **ENFORCED** - four routing tests |
| A waiting recipient holding a long-lived secret | `provision` is a strict subset of `active` | **ENFORCED** |
| Provider duplicate delivery | Not prevented, and not claimed | **ACCEPTED** - delivery is at-least-once; both copies carry the same valid credential |
| Email scanner opening a link | Not BACKEND-33's control | **DOCUMENTED** - BACKEND-34 owns scanner-safe bootstrap |
| Outbound email abuse | Two fail-closed policies, checked before credential generation | **ENFORCED** |
| Credential guessing | 256 bits | **ENFORCED** - the rate limit bounds volume; entropy is what makes guessing infeasible |

## The bootstrap credential's own threat model

| Threat | Control | Owner |
|---|---|---|
| Token guessing | 256 bits of CSPRNG | BACKEND-33 |
| Token theft from the database | Digest only in the grant; the recoverable copy is encrypted under a separate key | BACKEND-33 |
| URL leakage via referrer or logs | Path segment, never stored, never logged; strip after bootstrap | BACKEND-33 / **BACKEND-34** |
| Cross-recipient use | Three-column FK binds a grant to one recipient | BACKEND-33 |
| Cross-request use | Same | BACKEND-33 |
| Expired token | `expires_at` NOT NULL, 14 days | BACKEND-33 provisions; **BACKEND-34** enforces at lookup |
| Revocation | `revoked_at` column and a partial index that permits reissue | BACKEND-33 provides; **BACKEND-34** operates |
| Scanner opening the link | — | **BACKEND-34** |
| Possession mistaken for identity | — | **BACKEND-34** |

The one worth singling out is **the recoverable secret**. Every other LAGDA
credential is a one-way digest, and this is the second exception after a TOTP
seed. The mitigations are that it is encrypted with authenticated encryption
under a key that is not the MFA key, that the key version is stored so rotation
is possible, that a missing key fails the operation rather than degrading it,
and that the value has a 14-day life. The alternative was a signing link nobody
could ever build.
