# Workspace data classification

**Established by:** BACKEND-25. Companion to
[LOG_DATA_CLASSIFICATION.md](../observability/LOG_DATA_CLASSIFICATION.md) and
[ACCOUNT_DATA_CLASSIFICATION.md](../account/ACCOUNT_DATA_CLASSIFICATION.md).

Classes: **IDENTIFIER** (opaque, safe in logs) · **BUSINESS_SENSITIVE**
(customer-confidential) · **PERSONAL** (identifies a person) ·
**AUTHORIZATION_STATE** (decides access) · **SECRET** (never leaves the server).

---

| Datum | Class | Response | Log | Metric label | Notes |
|---|---|---|---|---|---|
| `WorkspaceId` | IDENTIFIER | yes | yes | **no** | Opaque and server-generated. Safe in a log because it names a tenant without describing one. Unbounded, so never a label. |
| **`workspaces.name`** | **BUSINESS_SENSITIVE** | to members only | **no** | **no** | See below. |
| `WorkspaceMemberId` | IDENTIFIER | own membership only | yes | **no** | |
| `UserId` | PERSONAL (pseudonymous) | own only | yes | **no** | Already the established log field for an actor. |
| membership `role` | AUTHORIZATION_STATE | **own role only** | yes | no | Returning your own role is your own state. Returning someone else's is a member-directory disclosure — BACKEND-26. |
| `created_at`, `joinedAt` | IDENTIFIER | yes | yes | no | |
| RLS setting names, DB role, policy names | SECRET-adjacent | **never** | never | never | Publishing them tells an attacker what to look for. |
| Idempotency key digest, request fingerprint | SECRET | never | never | never | |

## Why a workspace name is business-sensitive

It is the single most revealing field in this table, and the least obviously so.

Real LAGDA workspace names will look like *Reyes & Santos — Ortigas*,
*Everest Acquisition Holdings*, *Litigation — Dela Cruz v. NPC*. A name can
disclose:

- **who a customer's clients are** — a law firm's workspace per matter;
- **that a transaction exists at all** — an acquisition codename in a log
  aggregator is a leak before any document is signed;
- **a legal posture** — a workspace named after a dispute names both parties.

So:

- **Never in a routine operational log.** Lifecycle events carry the
  `WorkspaceId`, the actor and an outcome. `workspace.updated` carries
  `changedFields: ["name"]` and not the value. Both are asserted by tests that
  create a workspace with a distinctive name and grep the entire captured log
  output for it.
- **Never a metric label.** Unbounded cardinality *and* business data.
- **Returned only to members**, through the membership check, with
  `Cache-Control: no-store` so a shared proxy cannot hold one tenant's list.
- **Not globally unique**, because a uniqueness error is itself a disclosure:
  it would tell every customer which names their competitors had taken.

## Deliberate absences from the response

`GET /workspaces/:id` returns `workspaceId`, `name`, `role`, `createdAt` and
nothing else. A test enumerates the response keys and asserts the exact set.

Never present: `ownerUserId`, other members, member counts, storage prefixes,
plan, billing email, RLS context, database role, API keys, permission matrices.

`ownerUserId` deserves its own line: it is absent because the column is gone
(migration 013), and because "who owns this workspace" is a member-directory
question that belongs to BACKEND-26 rather than something every member of every
workspace receives on every read.

## Retention

Workspace and membership rows have **no retention policy yet** — OD-002 and
BACKEND-55. Nothing in this command deletes either, and no scheduled cleanup
touches them. That is the correct behaviour while the question is open: a
destructive default nobody chose is worse than data nobody has expired.

## Cross-border

No new processor and no new infrastructure. Workspace metadata lives in the
primary PostgreSQL database, under OD-001 like everything else.
