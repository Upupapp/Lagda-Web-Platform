# Workspace test matrix

**Established by:** BACKEND-25. Statuses are what the suites actually report,
measured on 2026-08-10 against PostgreSQL 16.

- **unit** — `npm test`, 713 tests, no database.
- **integration** — `npm run test:integration`, 358 tests, real PostgreSQL,
  connecting as the runtime role `lagda_app`.

| Area | Case | Result | Where |
|---|---|---|---|
| Create | authenticated owner | **PASS** | unit + route + integration |
| Create | anonymous refused, nothing written | **PASS** | route |
| Create | pre-auth MFA credential refused | **PASS** | route |
| Create | owner membership committed atomically | **PASS** | integration |
| Create | transaction rollback leaves NEITHER row | **PASS** | integration |
| Create | creator taken from the actor | **PASS** | unit |
| Create | `ownerUserId` in the body rejected | **PASS** | route |
| Create | 10 privileged fields each rejected | **PASS** | route |
| Create | client cannot choose the WorkspaceId | **PASS** | route (schema) |
| Create | rate limited at 10/hour per user | **PASS** | route |
| Create | rate limit counts per user, not globally | **PASS** | route |
| Create | Idempotency-Key required | **PASS** | route |
| Create | idempotent retry replays the same workspace | **PASS** | unit + route + integration |
| Create | whitespace-only difference replays | **PASS** | unit |
| Create | same key + different name → 409, nothing created | **PASS** | unit + route + integration |
| Create | concurrent identical retries → one tenant | **PASS** | integration |
| Create | rollback frees the key | **PASS** | integration |
| Create | keys scoped per user | **PASS** | unit |
| Create | no external side effect in the transaction | **PASS** | by construction — no port for one exists on the use case |
| Name | Unicode business names accepted | **PASS** | unit |
| Name | control characters rejected | **PASS** | unit |
| Name | bound counted in code points | **PASS** | unit |
| Name | outer whitespace trimmed, inner preserved | **PASS** | unit |
| Name | blank name rejected at the database too | **PASS** | integration |
| Name | error names the rule, never echoes the value | **PASS** | unit |
| Membership | `UNIQUE(workspace_id, user_id)` enforced | **PASS** | integration |
| Membership | FK to `users` enforced | **PASS** | integration |
| Membership | role CHECK rejects an invented role | **PASS** | integration |
| Membership | one user, several independent workspaces | **PASS** | unit + integration |
| Membership | one account row, never duplicated per tenant | **PASS** | integration |
| Membership | `owner_user_id` column is gone | **PASS** | integration |
| List | only the caller's workspaces | **PASS** | unit + route + integration |
| List | no post-filtering — user-scoped transaction | **PASS** | unit |
| List | empty array, never null | **PASS** | route |
| List | deterministic ordering, fake and SQL agree | **PASS** | contract (both adapters) |
| List | carries own role, no matrix, no member data | **PASS** | route |
| Get | own workspace | **PASS** | unit + route + integration |
| Get | other tenant's workspace hidden | **PASS** | unit + route + integration |
| Get | real-foreign and fictional answer identically | **PASS** | unit + route |
| Get | response has exactly 4 keys | **PASS** | route |
| Update | owner allowed | **PASS** | unit + route + integration |
| Update | non-owner member denied, can still read | **PASS** | unit + integration |
| Update | non-member denied | **PASS** | unit + route + integration |
| Update | CSRF required | **PASS** | route |
| Update | `workspaceId` in body rejected | **PASS** | route |
| Update | lifecycle/role/plan fields rejected | **PASS** | route |
| Update | authorization checked before validation | **PASS** | unit |
| Update | tenant identity and `created_at` unchanged | **PASS** | integration |
| Update | memberships intact after rename | **PASS** | integration |
| Update | scoped repository cannot rename another workspace | **PASS** | contract |
| CSRF | create without a token → 403, nothing written | **PASS** | route |
| CSRF | create with a wrong token → 403 | **PASS** | route |
| CSRF | reads exempt | **PASS** | route |
| Context | membership validated on every request | **PASS** | integration |
| Context | no workspace authority in the session | **PASS** | by construction — `AuthenticatedActor` has no field, `user_sessions` has no column |
| Context | membership removal takes effect with no re-login | **PASS** | integration |
| Context | no membership cache | **PASS** | by construction — no cache exists; the removal test would fail if one did |
| RLS | runtime role is not superuser and lacks BYPASSRLS | **PASS** | integration |
| RLS | cross-tenant read blocked with no predicate at all | **PASS** | integration |
| RLS | another user's memberships invisible under user context | **PASS** | integration |
| RLS | no context at all sees nothing (fail closed) | **PASS** | integration |
| RLS | user-scoped transaction cannot UPDATE or INSERT | **PASS** | integration |
| RLS | context does not leak to the next pooled transaction | **PASS** | integration |
| Lifecycle | archive | **N/A** | not implemented — see WORKSPACE_LIFECYCLE.md |
| Lifecycle | no hard-delete route | **PASS** | route audit |
| Lifecycle | no archive/restore/leave/transfer/member/invite route | **PASS** | route audit, 8 paths |
| Lifecycle | no `archived_at` / `status` / `deleted_at` column | **PASS** | integration, `information_schema` |
| Lifecycle | cannot delete a workspace with members | **PASS** | integration |
| Lifecycle | cannot delete an account with a membership | **PASS** | integration |
| Logging | workspace name never in a routine log line | **PASS** | route (greps full captured output) |
| Logging | `workspace.created` carries id, actor, outcome | **PASS** | route |
| Logging | `workspace.updated` carries changed FIELDS not values | **PASS** | route |
| Logging | `tenant_access_denied` on a cross-tenant read | **PASS** | route |
| Metrics | no tenant/user/name label | **PASS** | route (asserts the exact label set) |
| Evidence | rename does not rewrite history | **PASS** | integration — stable id, untouched `created_at`; and no workspace module imports an evidence table |
| Migration | from zero on a clean database | **PASS** | 13 migrations, verified on a fresh `lagda_zero_test` |
| Migration | re-run is a no-op | **PASS** | `migration.up_to_date` |
| Contract | fake and PostgreSQL agree | **PASS** | 25 cases × 2 adapters |
| Boundary | workspace work does not touch password/MFA/email | **PASS** | by construction — no workspace module imports an account repository |

## Honest notes

**"By construction" is not "tested".** Four rows above say so explicitly. Each
describes an absence the type system or the module graph enforces, which is
stronger than a test — but it is a different claim, and it is labelled
differently.

**The unit suite does not prove atomicity.** `FakeTransactionManager` restores a
snapshot, which shows the use case stops at a failure. That PostgreSQL rolls
back is proved only in `workspace.integration.test.ts`, and no assertion in the
unit file may be read as evidence of it.

**49 integration tests are skipped**, in the storage and upload suites. They
need S3-compatible object storage, which is unrelated to this command and was
skipped before it.
