# Workspace context

**Established by:** BACKEND-25.

How a request comes to be operating inside a tenant, and what is trusted at each
step.

---

## 1. The chain

```
  session cookie          →  UserId            AUTHENTICATION   (who)
  path segment            →  requested tenant  ADDRESSING       (which)
  membership lookup       →  WorkspaceAccessContext             (may you)
  runForWorkspace(id)     →  repositories + RLS  SCOPING        (what)
```

Each arrow is a distinct check against distinct state. None of them is skipped
because an earlier one succeeded.

## 2. Active workspace is context, not a claim

The frontend's `PlatformContext` holds a `currentWorkspace` and
`switchWorkspace(id)` changes it. That value is a **navigation hint**. It tells
the client which workspace to put in the next URL. It authorizes nothing.

The backend validates the workspace on **every** request that names one. There
is no request in this command that reads an "active workspace" from anywhere
other than the path.

## 3. The session contains no workspace authority

`AuthenticatedActor` is `{ actorType, userId, sessionId }`. Since BACKEND-13 it
has carried no `workspaceId`, no role and no permission list, and BACKEND-25
does not add one.

`user_sessions` has no `workspace_id` column.

Four consequences, each asserted:

| Property | Why it holds |
|---|---|
| Switching workspaces does not rotate the session | there is nothing workspace-shaped in the credential to invalidate |
| Removing a membership takes effect on the next request | the membership row is read every time, not cached and not carried |
| A stale client cannot act on a workspace it was removed from | the path ID resolves no membership, and the answer is 404 |
| A session stolen from workspace A grants nothing extra in workspace B | it grants the *user*, and the user's memberships are what they are |

The membership-removal case is a real integration test: read a workspace
successfully, delete the membership row out of band, and the very next call is
refused — no re-login, no cache expiry, no delay.

### A deliberate divergence from the handoff

`backend-integration-handoff.md` §5 says the session "must include: userId,
workspaceId, role, permissions, plan", and §60 says it "must include all
accessible workspace IDs".

**Not implemented.** A session carrying a workspace list and a role is exactly
the stale-authorization credential this design exists to avoid. `GET /workspaces`
returns the same information, freshly, whenever the client needs it. The
divergence is recorded rather than silently dropped.

## 4. No authorization cookie

There is no `lagda_current_workspace` cookie, httpOnly or otherwise. A
non-httpOnly preference cookie would be client-writable and therefore untrusted
anyway, which makes it a value that looks authoritative and is not — the worst
combination. The URL already carries the selection and survives a page reload,
a bookmark and a shared link.

## 5. No server-side "current workspace" preference

Not stored on the user, not stored on the session. The product has no
cross-device "remember my workspace" requirement, and adding one would create a
field that reads like authorization and is not.

If it is ever added, it stays a **preference**: a default for a client with no
better idea, never a value that skips a membership check.

## 6. `X-Workspace-ID` was not invented

`API_CONVENTIONS` never chose a workspace header, so BACKEND-25 did not create
one. The path segment is explicit: it appears in the route pattern, the
normalized metric label, the access log and the request log, and a reader of any
of those can see which tenant a request addressed.

Should a header ever be introduced, it must be validated **exactly** like a path
ID — resolved to a `WorkspaceId`, then a membership lookup — and it must never
override a path or a resolved context.

## 7. AsyncLocalStorage is for logging only

The observability store carries `requestId` and, after session resolution,
`userId`. It may carry a workspace ID for correlation.

It is **never** read to decide what data may be accessed (INV-135). Tenant scope
is an explicit argument to `runForWorkspace`, and RLS reads the transaction-local
setting that method sets. Nothing in the authorization path touches ALS.

## 8. Transaction-local, never session-level

Both settings are established with `set_config(name, value, true)` — the `true`
is `is_local`. They die at `COMMIT` or `ROLLBACK`.

A session-level `SET` would ride a pooled connection into the next request, and
the next request would silently inherit the previous tenant's context. There is
an integration test for the absence of exactly that: after a user-scoped read
completes, a fresh transaction on the same pool sees nothing.

`set_config` is also parameterized, which `SET LOCAL x = '...'` cannot be — so a
workspace ID can never be concatenated into SQL.

## 9. Workers and system actors

A worker operating on workspace data receives an explicit `workspaceId` in its
job payload and runs under `runForWorkspace`. It does **not** resolve a human
membership: a scheduled expiry sweep is not a person, and reusing the
membership check for it would either require a fake user or a bypass flag.

There is no bypass flag, no `skipMembershipCheck`, no `bypassTenant` and no
support-actor path anywhere in the codebase.
