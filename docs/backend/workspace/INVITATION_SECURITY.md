# Invitation security

**Established by:** BACKEND-26.

An invitation is the only credential in LAGDA that grants access to a **tenant**
rather than to an account, and the only one deliberately sent to someone who may
have no relationship with the system yet. This is what it defends against.

---

## Threats and controls

| # | Threat | Controls |
|---|---|---|
| I-1 | **Token guessing** | 256 bits from `randomBytes`, base64url. Unguessable on its own. IP rate limiting on preview and accept is defence in depth and is explicitly NOT what makes guessing infeasible — the limiter fails **open**, and that is only acceptable because the entropy stands alone. |
| I-2 | **Token theft or forwarding** | Acceptance requires a session whose canonical email matches the invitation. Possession of the link is not enough; whoever receives a forwarded message still cannot authenticate as the invited address. Tested. |
| I-3 | **Token in a URL** | The token travels in the email link because there is no other channel — the recipient may have no account. Every backend route takes it in a POST **body**, so it never enters an access log, a route pattern or a referrer on this side. A route audit asserts four plausible GET shapes all 404. Frontend mitigations in §"Frontend obligations". |
| I-4 | **Link-scanner acceptance** | Mail security scanners fetch every link in a message before a human sees it. No GET route consumes an invitation; preview is a POST and creates nothing. |
| I-5 | **Account mismatch** | Canonical email of the invitation vs canonical email of the **account, read at acceptance time**. Not from the session, which carries no email; not from the request, which would let the caller nominate an identity. |
| I-6 | **Email change reassignment** | An invitation addressed to a former address does **not** follow the person. Matching by the `UserId` that mailbox once belonged to would let an invitation land on an address the inviter never chose. Tested. |
| I-7 | **Role tampering** | The role is read from the persisted invitation. There is no `role` field on the accept request — a body carrying one is a 422 at the schema. |
| I-8 | **Workspace tampering** | The workspace comes from the resolved invitation. There is no workspace parameter on accept or decline; a body carrying one is a 422. |
| I-9 | **Owner escalation** | `owner` is absent from `INVITABLE_WORKSPACE_ROLES`, so the schema union cannot express it, and a database CHECK on `requested_role` refuses it independently. Two layers, neither of which is a runtime comparison someone could delete. |
| I-10 | **Cross-tenant invitation access** | Management repositories are workspace-scoped with no workspace parameter, plus `tenant_isolation` RLS. A manager of A sees nothing of B — tested with a raw query under B's context. |
| I-11 | **Enumeration through the credential path** | The policy matches equality on a UNIQUE column, so at most one row is ever visible. A `SELECT` with no predicate at all returns exactly one row; the integration suite runs precisely that query. |
| I-12 | **RLS bypass through the credential path** | The policy is `FOR SELECT`. No `BYPASSRLS`, no superuser, no `skipTenant` flag anywhere. An UPDATE from the credential scope affects zero rows — asserted. |
| I-13 | **Email bombing** | Four rate-limit policies: create and resend, each per-user and per-workspace, all fail-**closed**. Per-user alone is defeated by colluding managers; per-workspace alone by one manager across tenants. Resend is tighter than create because it needs no new record and leaves no new row. |
| I-14 | **Duplicate membership** | `UNIQUE(workspace_id, user_id)` is the final authority. Acceptance also checks and converges. Two concurrent acceptances of one token produce exactly one membership — tested against PostgreSQL. |
| I-15 | **Stale or superseded links** | Resend rotates the digest in place, so the old token stops resolving at commit. Exactly one valid link at all times. |
| I-16 | **Resend stranding the invitee** | Rotation and delivery scheduling share a transaction. If scheduling fails, the rotation rolls back and the recipient keeps the working link — tested both in memory and against PostgreSQL. |
| I-17 | **Host-header injection** | The link builder takes a configured origin and a token. It has **no request parameter**, so `request.hostname` cannot be reached from it. Not sanitized — unreachable. |
| I-18 | **Invitation replay** | Single-use, enforced by a conditional UPDATE on the four terminal timestamps rather than a read-then-write. |
| I-19 | **Credential disclosure at rest** | Digest only, `lagda.workspace-invitation:` domain, CHECK-constrained to 64 hex. A database dump contains no usable invitation credential — asserted by scanning the stored row for the raw value. |
| I-20 | **Credential disclosure in responses** | No route returns the raw token or the digest. Asserted on both create and list. |
| I-21 | **Pre-auth MFA acceptance** | Accept and decline live inside the authenticated scope, so the scope hook refuses a pre-auth credential before any invitation is looked up. |
| I-22 | **CSRF** | Same: every mutating invitation route is inside the scope. A create without a token is 403 and writes nothing; an accept without one is 403 before any membership mutation. |
| I-23 | **Invitation history erasure** | The runtime role has no `DELETE` grant on `workspace_invitations`. Revocation is a timestamp; erasing who was offered a tenant is not a statement the application can issue. |

## The limit this design does not exceed

**If an attacker controls the invited mailbox *and* an account for that address,
they can accept.** No email-based invitation can distinguish them from the
legitimate mailbox owner.

What the design does buy is that BOTH are required. Reading the email is not
enough, and holding an account is not enough. Stated here rather than implied
away, because a security document that claims more than the mechanism delivers
is worse than one that claims less.

One related protection does hold: an attacker cannot simply register the invited
address to claim an invitation, because normalized-email uniqueness means the
address already belongs to whoever registered it first.

## Why some errors are collapsed and one is not

Unknown, expired, revoked, superseded and consumed all produce
`invalid_or_expired_invitation`. Telling an anonymous caller that a token was
*revoked* rather than *unknown* confirms it once existed, which turns preview
into an oracle for guessed tokens — and no legitimate invitee needs the
distinction, since every one of those states means "ask for a new invitation".

`invitation_account_mismatch` is **distinct**, deliberately. The caller has
already proved possession of a live credential, so they learn nothing new about
whether it exists — and they genuinely need to be told to switch accounts. It
carries no detail about the invited address.

On the management side, `invitation_already_pending` and
`already_workspace_member` are both specific, because the caller is an
authorized manager of that workspace and is already entitled to know its
invitation and membership state.

## Frontend obligations

The backend cannot enforce these; they are recorded so they are not forgotten.

- **Strip the token from the URL once captured.** `history.replaceState` after
  reading `?token=`, so it does not sit in the address bar, in history, or in a
  referrer.
- **Never send a token-bearing URL to analytics**, error reporting, or session
  replay.
- **Keep it ephemeral.** In component state through the register/login handoff,
  never in `localStorage`, `sessionStorage` or a persisted preference.
- **POST it.** The backend accepts it nowhere else.

## Telemetry

Events carry IDs, roles and outcomes. **Never** the raw token, the digest, the
full invitation URL, or the invitee's email address.

Metric labels are `operation`, `result` and `processRole` — all bounded, all
code-defined. No workspace, user or invitation ID, no address, no digest.
