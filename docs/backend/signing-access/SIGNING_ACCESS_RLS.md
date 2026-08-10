# The narrow public credential path

## The problem

A recipient has no LAGDA account, no membership and no workspace context. Every
existing read path starts from workspace context. Something has to establish it,
and the only thing the recipient holds is a credential.

The lazy answers are all bad: `BYPASSRLS` on the runtime role, a privileged
service account, or a repository that takes a workspace id from a request body.

## The answer, and it is not new

BACKEND-26 solved this shape for workspace invitations. Migration 021 follows it
exactly.

```sql
create or replace function lagda_current_signing_access_digest() returns text
language sql stable
as $$ select nullif(current_setting('lagda.signing_access_digest', true), '') $$;

create policy signing_access_credential_read on signing_access_grants
for select
using (credential_digest = lagda_current_signing_access_digest());
```

**Three properties carry the whole argument:**

1. **Equality on a UNIQUE column** matches at most one row. The policy cannot
   enumerate, cannot scan a workspace, and cannot answer any question except
   "the grant whose credential I already hold".
2. **`FOR SELECT`** — it cannot write. Every mutation still requires tenant
   context, which is established only after the credential has resolved the
   workspace.
3. **`current_setting(name, true)`** returns NULL when the setting is missing,
   and NULL matches nothing. A transaction that forgot to set the digest sees
   zero rows rather than all of them. **Fail closed.**

`STABLE`, not `IMMUTABLE`: the value varies per transaction, and a planner that
cached it across transactions would be the leak this prevents.

## Three companion policies

The grant alone is not enough — the ceremony needs the request's state and
title, the recipient's own name, and the routing row. Each gets a policy that
`exists`-joins back to the same digest:

| Table | Shows |
|---|---|
| `signing_requests` | the ONE request the grant names |
| `signing_request_recipients` | the ONE recipient the grant names |
| `signing_request_recipient_activation` | the ONE activation row |

Note the second: **not every recipient of the request.** A signer must not learn
who else was asked.

## Proven, not asserted

The integration suite runs as the `lagda_app` runtime role and demonstrates the
consequence directly:

| Assertion | Result |
|---|---|
| Unfiltered `select * from signing_access_grants` inside a credential transaction | **1 row** (two exist) |
| Unfiltered counts of requests / recipients / activations | **1 / 1 / 1** (two of each exist) |
| The same query with NO setting | **0 rows** |
| Asking for tenant B's digest while A's is set | **null** |
| A second recipient added to the SAME request | **still 1 row** |
| `update signing_access_grants` inside the path | **0 rows affected** |
| Inserting a session before `enterWorkspace` | **policy violation** |
| `rolbypassrls` / `rolsuper` on `lagda_app` | **false / false** |

## The tenant transition

```
runForSigningCredential(digest)
  ├─ access.findByCredentialDigest()        no workspace context
  └─ enterWorkspace(grant.workspaceId)      SAME transaction
       └─ recipientSessions.insert()
```

The workspace comes from the **resolved grant**. There is no parameter a request
body could reach, which makes workspace tampering unexpressible rather than
merely rejected.

Same transaction, because two would leave a window in which a session exists and
the grant it came from has been revoked.

## The narrow unit of work

`enterWorkspace` hands over `RecipientWorkspaceUnitOfWork`, not
`WorkspaceUnitOfWork`. It has one repository: recipient sessions.

**The guarantee is not "a recipient must not call `uow.documents`" — it is that
`uow.documents` does not exist on what they hold.** An architecture guard reads
the interface body and fails on any of `documents`, `contacts`, `memberships`,
`preparations`, `artifacts`, `evidence` or `workspaces`.

## A third realm for the session

An established session has the same problem: a cookie arrives with no workspace
context. So a third setting, `lagda.recipient_session_digest`, with the same
shape.

Three settings, three realms, and a test proves they do not cross: setting the
bootstrap digest makes zero sessions visible.

## What BACKEND-35 must do

The ceremony needs to read the source artifact and the recipient's assigned
fields. Both need policies of the same shape, keyed off the **session** digest —
not the workspace, and not a widened version of these.

`signing_request_fields` in particular must be visible only for the fields
assigned to *that* recipient. A policy showing every field of the request would
tell a signer what everyone else was asked for.
