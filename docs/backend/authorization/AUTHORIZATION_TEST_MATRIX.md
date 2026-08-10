# Authorization test matrix

**Established by:** BACKEND-27. Statuses are what the suites report, measured on
2026-08-10 against PostgreSQL 16.

- **policy** — 180 cases, `packages/core/src/authorization/authorization.test.ts`
- **unit** — 34 cases, `packages/application/src/workspaces/members.test.ts`
- **architecture** — 11 static guards, `tests/architecture/authorization.test.ts`
- **integration** — 20 cases against real PostgreSQL as `lagda_app`,
  `tests/integration/authorization.integration.test.ts`

| Area | Case | Result | Where |
|---|---|---|---|
| Roles | exactly the product's seven, no speculative additions | **PASS** | policy |
| Roles | ownership model stated in code | **PASS** | policy |
| Policy | exhaustive role × capability matrix (70) | **PASS** | policy |
| Policy | unknown capability denied | **PASS** | policy |
| Policy | unknown role denied every capability | **PASS** | policy |
| Policy | no wildcard, no inherited grant | **PASS** | policy |
| Policy | projection is a copy the caller cannot mutate | **PASS** | policy |
| Policy | deterministic across repeated calls | **PASS** | policy |
| Grant | exhaustive actor × target matrix (49) | **PASS** | policy |
| Grant | nobody may grant `owner`, including the owner | **PASS** | policy + unit + integration |
| Grant | administrator may create a peer, never a superior | **PASS** | policy |
| Grant | no ordinary role may grant anything | **PASS** | policy |
| Invite | invitation grant matrix | **PASS** | policy |
| Invite | `administrator` may now invite — owner-only rule gone | **PASS** | unit |
| Invite | ordinary member refused | **PASS** | unit |
| Invite | demoted inviter loses authority with no re-login | **PASS** | unit |
| Workspace | update capability, by role | **PASS** | unit |
| Workspace | archive capability | **N/A** | no archive exists — WORKSPACE_LIFECYCLE.md |
| Members | list authority, every role | **PASS** | unit + integration |
| Members | ordinary member refused the directory | **PASS** | unit + integration |
| Members | outsider and under-privileged member answer identically | **PASS** | unit |
| Members | directory returns real addresses to an administrator | **PASS** | integration |
| Members | directory exposes no security state | **PASS** | unit |
| Members | directory ordering deterministic | **PASS** | integration |
| Role change | owner and administrator may | **PASS** | unit |
| Role change | ordinary member refused | **PASS** | unit |
| Role change | **self-promotion denied, from every role** | **PASS** | unit + integration |
| Role change | self-demotion denied | **PASS** | unit |
| Role change | granting `owner` denied for every actor | **PASS** | unit + integration |
| Role change | no-op reported without writing | **PASS** | unit |
| Role change | one transaction | **PASS** | unit |
| Role change | takes effect immediately, no new session | **PASS** | unit |
| Role change | demotion removes authority immediately | **PASS** | unit |
| Role change | client cannot send capabilities or permissions | **PASS** | schema, `additionalProperties: false` |
| Removal | member loses access on the next call | **PASS** | unit + integration |
| Removal | ordinary member refused | **PASS** | unit |
| Removal | self-removal refused | **PASS** | unit |
| Removal | account not deleted | **PASS** | integration |
| Removal | other workspaces untouched | **PASS** | unit + integration |
| Removal | rejoin works with no ambiguity | **PASS** | integration |
| Leave | — | **N/A** | not in the product — OD-102 |
| Owner | last-owner demotion denied | **PASS** | unit + integration |
| Owner | last-owner removal denied | **PASS** | unit + integration |
| Owner | **concurrent demotion + removal, owner survives** | **PASS** | integration |
| Owner | ten rounds of three racing operations | **PASS** | integration |
| Owner | invalid role refused by the CHECK constraint | **PASS** | integration |
| Ownership | transfer | **N/A** | deferred — OD-101 |
| TOCTOU | demoted actor cannot commit under old authority | **PASS** | integration |
| TOCTOU | removed actor refused immediately | **PASS** | integration |
| Tenant | cross-workspace role change denied, real membership id | **PASS** | unit + integration |
| Tenant | cross-workspace removal denied | **PASS** | unit + integration |
| Tenant | cross-workspace member list denied | **PASS** | integration |
| RLS | runtime role is not superuser, no BYPASSRLS | **PASS** | integration |
| RLS | all prior tenancy suites still pass | **PASS** | 411 integration total |
| Session | no role or capability in the actor contract | **PASS** | architecture |
| Session | role change needs no session regeneration | **PASS** | unit |
| Architecture | role compared in exactly four allowed files | **PASS** | architecture |
| Architecture | **no role comparison in any route file** | **PASS** | architecture |
| Architecture | capability list defined once (contracts = core) | **PASS** | architecture |
| Architecture | policy free of infrastructure imports | **PASS** | architecture |
| Architecture | no per-member capability column or permission blob | **PASS** | architecture |
| Architecture | no external policy engine dependency | **PASS** | architecture |
| Architecture | no workspace role on the account profile | **PASS** | architecture |
| Architecture | system actor carries no role | **PASS** | architecture |
| Architecture | projection cannot exceed the policy | **PASS** | architecture |
| Migration | from zero | **N/A** | no schema change — the role vocabulary was widened by BACKEND-26's migration 014 |
| CSRF | member mutations protected | **PASS BY COMPOSITION** | see note |
| MFA | pre-auth credential denied | **PASS BY COMPOSITION** | see note |
| Logging | denial telemetry carries no PII | **PASS BY CONSTRUCTION** | see note |
| Metrics | bounded labels only | **PASS BY CONSTRUCTION** | the label type is a closed union |

## Honest notes

**"By composition" is not the same as a dedicated test.** The member routes are
registered inside the authenticated scope `createApp` builds, and that scope's
`requireSession` hook enforces both CSRF and the pre-auth refusal for every
route in it — proved by the workspace and invitation route suites, which run
through the same factory and assert 401 and 403. The member routes inherit the
protection structurally rather than having their own assertions. A dedicated
member-route test file would close it, and there is not one.

**"By construction"** means the type system or the module graph enforces it —
stronger than a test, and a different claim. The metric label type is a closed
union; the event builders take a field set with no place for an email.

**No migration.** BACKEND-27 changes no schema. `member` joined the role CHECK
in BACKEND-26's migration 014, and the capability model persists nothing —
which is the point of deriving capabilities from the role rather than storing
them.

**Two N/A rows are consequences, not gaps in coverage.** There is no archive to
test and no transfer to test, because neither operation exists. Both are
recorded as open decisions rather than omitted.
