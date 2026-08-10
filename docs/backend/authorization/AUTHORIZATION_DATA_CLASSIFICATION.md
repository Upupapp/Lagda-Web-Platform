# Authorization data classification

**Established by:** BACKEND-27.

Nothing here is a secret. Authorization data is not credentials — but roles are
security state, and a member directory is personal data.

---

| Datum | Class | Response | Log | Metric label |
|---|---|---|---|---|
| `WorkspaceRole` | **AUTHORIZATION_STATE** | yes | yes | **yes** — a seven-value closed set |
| `WorkspaceCapability` | **AUTHORIZATION_STATE** | to the caller, about themselves | yes | **yes** — a ten-value closed set |
| `membershipId` | INTERNAL | yes | yes | **no** — unbounded |
| `userId` | PERSONAL (pseudonymous) | in the directory | yes | **no** — unbounded |
| `workspaceId` | INTERNAL | yes | yes | **no** — unbounded |
| **member email** | **PII** | to `membership.view` holders only | **no** | never |
| **member display name** | **PII** | same | **no** | never |
| role-change events | AUDIT | no | yes — ids and role values | as `operation` |
| authorization denials | SECURITY SIGNAL | no | yes — capability and outcome | as `capability` |

## Roles and capabilities ARE safe metric labels

The only two in this table that are, and the reason is the same for both: they
are **closed sets defined in code**. Seven roles, ten capabilities. A time-series
database given either produces at most seventy series, which is a dimension
rather than a cardinality problem.

They are also the most useful dimension a denial has. `authorization_denials_total{capability}`
answers "what are people being refused", which is the question worth asking; the
same metric keyed on `workspaceId` would answer "which tenant" and fall over.

Every id is excluded. No `workspaceId`, no `userId`, no `membershipId` — all
unbounded, and one series per tenant is how a metrics backend dies (§187, §249).

## Why the member directory returns emails and logs never do

An administrator is entitled to see who is in their workspace: `MembersPage.tsx`
renders the address under every name, and a directory without it cannot do its
job. It is gated behind `membership.view`, which only `owner` and
`administrator` hold.

That entitlement is **scoped to the response**. An email address in an
operational log is personal data in a system that retains logs differently from
tenant data, ships them to places nobody reviewed for PII, and grants access to
them on a different basis. Member-administration events carry `membershipId`
and `targetUserId`; the address stays in the database and in the
administrator's browser.

## Successful authorization checks are not logged

Deliberately (§183). One log line per authorized request is noise that buries
the signal, and the signal here is refusal.

`authorization.denied` carries the capability, the outcome, and the request
context the logger already attaches. Not the request body, not the target's
details, not what the caller would have needed to pass.

A single denial is not an incident — a stale browser tab after a demotion
produces one. A sustained spike from one actor is worth an alert, and the
bounded `capability` label is what a rule would be written against.
Thresholds belong with BACKEND-66.

## Role-change history

There is none, beyond the security events.

`workspace_memberships` stores the CURRENT role. A role-change log — who changed
whose role, from what, to what, when — would be genuinely useful for a
legal-technology product, and it is not built here: it belongs with the
workspace activity feed the frontend already designs (24 event types), which is
BACKEND-43's territory.

The events are emitted with everything such a log would need, so nothing is
lost that would have to be reconstructed. OD-106.

## Not signing evidence

Role changes, removals and authorization denials are **workspace administration**
(§73, §300). They are not eSignature signing evidence and are never written to
`evidence_events`.

The boundary is architectural: no authorization or member module imports an
evidence repository, and mutable membership state cannot rewrite who signed a
document last year — evidence references users and snapshots, never a live
membership row.
