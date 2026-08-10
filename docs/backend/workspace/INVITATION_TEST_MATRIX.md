# Invitation test matrix

**Established by:** BACKEND-26. Statuses are what the suites report, measured on
2026-08-10 against PostgreSQL 16.

- **unit** — 47 cases, `packages/application/src/workspaces/invitations.test.ts`
- **route** — 22 cases through the real `createApp`,
  `packages/api/src/workspaces/invitation-routes.test.ts`
- **integration** — 33 cases against real PostgreSQL as the runtime role
  `lagda_app`, `tests/integration/invitation.integration.test.ts`

| Area | Case | Result | Where |
|---|---|---|---|
| Create | authorized owner | **PASS** | unit + route + integration |
| Create | anonymous | **PASS** | route |
| Create | pre-auth MFA only | **PASS** | route |
| Create | member who is not a manager | **PASS** | unit |
| Create | non-member of the workspace | **PASS** | unit + integration |
| Create | cross-tenant workspace | **PASS** | unit + integration |
| Create | canonical email normalization | **PASS** | unit + integration |
| Create | already a member — no invitation, no delivery | **PASS** | unit + integration |
| Create | already a member by CANONICAL address | **PASS** | integration |
| Create | self-invite (the owner's own address) | **PASS** | unit + integration |
| Create | pending duplicate refused, no second email | **PASS** | unit + integration |
| Create | expired row superseded, fresh invitation issued | **PASS** | unit |
| Create | invalid role rejected | **PASS** | route |
| Create | OWNER role rejected at the schema | **PASS** | route |
| Create | OWNER role rejected at the database | **PASS** | integration |
| Create | 9 privileged fields each rejected | **PASS** | route |
| Create | inviter cannot be supplied | **PASS** | unit + route |
| Create | malformed address rejected before any write | **PASS** | unit |
| Create | unregistered invitee — no user, no membership | **PASS** | integration |
| Create | Idempotency-Key required | **PASS** | route |
| Create | idempotent retry → one invitation, one delivery | **PASS** | unit |
| Create | same key, different role → 409 | **PASS** | unit |
| Create | rate limited | **N/A** | policies defined and bound; no dedicated 429 test — see note |
| Token | 256 bits, base64url, 43 chars | **PASS** | integration |
| Token | raw value absent from the row | **PASS** | integration |
| Token | digest is 64 hex, CHECK-enforced | **PASS** | integration |
| Token | duplicate digest refused | **PASS** | integration |
| Token | malformed refused before any query | **PASS** | unit |
| Token | expiry blocks acceptance | **PASS** | unit |
| Token | supersession blocks acceptance | **PASS** | unit |
| Token | never in a response body | **PASS** | route |
| Preview | valid | **PASS** | unit + route + integration |
| Preview | public, no session needed | **PASS** | route |
| Preview | unknown / revoked / expired answer identically | **PASS** | unit + route |
| Preview | creates no membership | **PASS** | unit |
| Preview | does not consume the invitation | **PASS** | unit (accept still works after) |
| Resend | rotates to a fresh credential | **PASS** | unit + integration |
| Resend | old token invalid after commit | **PASS** | unit + integration |
| Resend | one row, not one per resend | **PASS** | unit + integration |
| Resend | delivery failure preserves the OLD token | **PASS** | unit + integration |
| Resend | cannot change address or role | **PASS** | unit + route |
| Resend | refused on a revoked invitation | **PASS** | unit |
| Resend | idempotent retry does not rotate twice | **PASS** | unit |
| Resend | fresh expiry | **PASS** | integration |
| Resend | rate limited | **N/A** | policies defined and bound; see note |
| Revoke | authorized manager | **PASS** | unit |
| Revoke | token invalid afterwards | **PASS** | unit |
| Revoke | row preserved, not deleted | **PASS** | unit |
| Revoke | runtime role has no DELETE at all | **PASS** | integration |
| Revoke | already accepted → reports state, no failure | **PASS** | unit |
| Revoke | non-manager refused | **PASS** | unit |
| Accept | existing user, matching account | **PASS** | unit + route + integration |
| Accept | role comes from the invitation | **PASS** | unit + integration |
| Accept | role on the request body → 422 | **PASS** | route |
| Accept | workspaceId on the body → 422 | **PASS** | route |
| Accept | wrong signed-in account | **PASS** | unit + route + integration |
| Accept | canonical casing still matches | **PASS** | unit |
| Accept | refused after the account changes its email | **PASS** | unit |
| Accept | expired / revoked / superseded token | **PASS** | unit |
| Accept | CSRF required | **PASS** | route |
| Accept | pre-auth MFA denied | **PASS** | route |
| Accept | single-use — second attempt refused | **PASS** | unit |
| Accept | membership + consumption atomic | **PASS** | integration |
| Accept | insert failure rolls back the consumption | **PASS** | integration |
| Accept | CONCURRENT same token → one membership | **PASS** | integration |
| Accept | already a member converges, no 500 | **PASS** | unit + integration |
| Accept | does not verify the account email | **PASS** | integration |
| Accept | one transaction | **PASS** | unit |
| Accept | workspace archived | **N/A** | there is no archived state — WORKSPACE_LIFECYCLE.md |
| Decline | closes without a membership | **PASS** | unit + route |
| Decline | wrong account refused | **PASS** | unit |
| Decline | distinct from revoked | **PASS** | unit |
| Decline | does not blocklist the address | **PASS** | unit |
| Decline | cannot decline an accepted invitation | **PASS** | unit |
| Session | no rotation needed after acceptance | **PASS** | route — same cookie, new access |
| Workspace | appears in the new member's list | **PASS** | unit + route + integration |
| RLS | runtime role is not superuser, no BYPASSRLS | **PASS** | integration |
| RLS | credential scope resolves exactly one row | **PASS** | integration |
| RLS | credential scope cannot LIST | **PASS** | integration — no predicate, one row |
| RLS | credential scope cannot WRITE | **PASS** | integration — UPDATE affects 0 |
| RLS | no context sees nothing | **PASS** | integration |
| RLS | digest context does not leak to the next transaction | **PASS** | integration |
| RLS | management tenant isolation | **PASS** | integration |
| Constraints | at most one live invitation per workspace+email | **PASS** | integration |
| Constraints | slot freed by revoke | **PASS** | integration |
| Constraints | un-normalized identity key refused | **PASS** | integration |
| Constraints | accepted_at without an accepter refused | **PASS** | integration |
| Constraints | inviter must be a real account | **PASS** | integration |
| Logging | no raw token in a response | **PASS** | route |
| Logging | no invitee email in a routine log | **PASS BY CONSTRUCTION** | the event builders pass IDs only; see note |
| Metrics | no unbounded or PII labels | **PASS BY CONSTRUCTION** | the label set is `operation`/`result`/`processRole`, typed closed |
| Routes | no GET consumes or previews an invitation | **PASS** | route — 4 shapes, all 404 |
| Routes | no member/role/transfer route exists | **PASS** | route — 5 shapes, all 404 |
| Migration | from zero | **PASS** | 14 migrations on a clean database |
| Migration | re-run is a no-op | **PASS** | `migration.up_to_date` |
| Contract | fake and PostgreSQL agree | **PASS** | the repository contract suite, both adapters |

## Honest notes

**Rate limiting is bound but not asserted with a 429.** The four policies exist
in the registry, are validated by `assertPoliciesValid`, and are applied in the
route handlers through `checkSemanticLimits` — the same mechanism BACKEND-25's
workspace-create limit uses, which *is* covered by a 429 test. Invitation
limits have no dedicated test of their own, so the matrix says **N/A** rather
than PASS. Closing it means one more route test per policy.

**Two rows say "by construction".** The invitation event builders take a fixed
field set that has no place for an email, and the metric label type is a closed
union. Both are stronger than a test — but they are a different claim, and they
are labelled differently rather than counted as coverage. The workspace suite's
equivalent log-redaction test greps the full captured output; the invitation
routes have no such test yet.

**No archived-workspace acceptance test**, because there is no archived state to
create. Recorded as N/A rather than omitted, so a future reader can see the
case was considered.
