# Member lifecycle

**Established by:** BACKEND-27.

---

## The implemented lifecycle

```
   (nobody)
      │
      ├── invited ──► INVITATION (a separate table, BACKEND-26)
      │                    │
      │                    └── accepted ──┐
      │                                   ▼
      └── created the workspace ────►  MEMBER  ◄── role change (BACKEND-27)
                                          │           loops here
                                          │
                                          └── removed ──► (row deleted)
                                                              │
                                                              └── may be
                                                                  invited again
```

An **invitation is not a membership** — BACKEND-26's invariant, unchanged. Only
acceptance, or creating the workspace, produces a member.

## Transitions

| Transition | Status | Capability | Notes |
|---|---|---|---|
| create workspace → owner | **IMPLEMENTED** | — | BACKEND-25. The only way an owner exists. |
| accept invitation → member | **IMPLEMENTED** | — | BACKEND-26. Role comes from the invitation. |
| role change | **IMPLEMENTED** | `membership.role.change` | Never to or from `owner`. Never self-targeted. |
| removal | **IMPLEMENTED** | `membership.remove` | Row deleted. Never self-targeted. |
| **leave workspace** | **NOT_IN_PRODUCT** | — | No control exists anywhere in the frontend. OD-102. |
| **ownership transfer** | **DEFERRED** | `workspace.ownership.transfer` | The capability is declared and no operation exists. OD-101. |
| **suspend / reactivate / deactivate** | **DEFERRED** | — | Three further actions the product exposes. OD-103. |

## Removal deletes the row

Not `removed_at`. The alternative was considered and rejected.

**Why.** A membership row means ACTUAL ACCESS — that is the invariant BACKEND-25
built the table around, and it is why there is no `status` column for pending
invitations either (INV-324). A `removed_at` column reintroduces exactly that
problem: every authorization query in the system would need
`AND removed_at IS NULL`, and the one that forgot would authorize someone who
had been removed.

**The conditions §51 sets for a hard delete being acceptable all hold:**

- the administrative action is recorded as a security event;
- no table references `workspace_memberships`, so nothing is orphaned;
- historical signing evidence references users and snapshots, never a live
  membership row — removing one rewrites no history;
- re-inviting a removed person is an ordinary new invitation, with no
  reactivate-or-recreate ambiguity to resolve (§168).

**The cost, stated:** there is no per-tenure record. "Sofia was a member from
March to July" is not answerable from the membership table. If that is ever
required, the migration is a **new table** — a membership-history log — rather
than a nullable column on the one that answers "may this person act here". That
keeps the authorization query unconditional.

An integration test covers the rejoin case: remove, re-add, and the new role
takes effect immediately.

## What removal does not touch

| Not affected | Why |
|---|---|
| the global account | Removal is a tenant operation, not an account action (§52). |
| any login session | Workspace authorization is not in the credential. Revoking sessions would sign the person out of every OTHER workspace to remove them from one (§56, §176). |
| other workspace memberships | Each is a separate row. Tested. |
| historical signing evidence | Evidence references users and snapshots, never a live membership (§53, §170). |
| documents, contacts, templates | Workspace-owned, not member-owned. Nothing is orphaned (§171–§174). |

The removed person's very next request to that workspace resolves no membership
and is refused. No cleanup job, no cache invalidation, no logout.

## Self-targeting is refused

`changeWorkspaceMemberRole` and `removeWorkspaceMember` both refuse when the
actor is the target.

- **Self-promotion** — never allowed, from any role. Tested from all four.
- **Self-demotion** — belongs to leaving or transferring, both of which have
  their own rules. Routing it through a role patch would bypass them.
- **Self-removal** — that is leaving, which is not in the product. Refusing is
  better than quietly treating an administrator's misclick as a departure.

## The owner, in this lifecycle

Under `SINGLE_OWNER` the owner cannot be promoted to, demoted from, or removed.
Every attempt is refused by the last-owner rule or the grant matrix.

So an owner's membership has exactly one transition available today —
none — until ownership transfer exists. OWNERSHIP_MODEL.md says why, and it is
the highest-priority gap this command leaves.

## Deferred: suspend, reactivate, deactivate

`MemberDetailPage.tsx` offers all three alongside remove, and
`WorkspaceMemberStatus` declares `active | suspended | deactivated |
pending-invitation`.

They are a membership **status** model, distinct from a role and from removal:
a suspended member is still a member whose access is paused. Implementing them
means adding the status column this table has deliberately avoided twice, and
deciding what suspension means for in-flight signing requests, for the seat
count, and for whether the person can still be seen in the directory.

Recorded as OD-103. Building it as a fourth timestamp on the authorization
table, without those answers, is how `AND status = 'ACTIVE'` ends up in
eighty queries.
