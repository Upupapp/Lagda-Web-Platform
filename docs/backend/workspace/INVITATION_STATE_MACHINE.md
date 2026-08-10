# Invitation state machine

**Established by:** BACKEND-26.

---

## The states

```
                          ┌──────────────► ACCEPTED    accepted_at, accepted_by_user_id
                          │                            (terminal — a membership exists)
                          │
                          ├──────────────► DECLINED    declined_at
                          │                            (the invitee said no)
   created ──► PENDING ───┤
                          ├──────────────► REVOKED     revoked_at
                          │                            (the workspace withdrew it)
                          │
                          ├──────────────► SUPERSEDED  superseded_at
                          │                            (a newer invitation took the slot)
                          │
                          └── time ──────► EXPIRED     expires_at <= now
                                                       (nothing is written)
```

Only `PENDING` is redeemable. Every other state refuses acceptance, decline,
resend and preview alike, through one predicate: `isInvitationRedeemable`.

## There is no `status` column

State is **derived** from five timestamps plus the clock:

```ts
deriveInvitationState({ expiresAt, acceptedAt, revokedAt, declinedAt, supersededAt }, now)
```

A `status` column and a set of timestamps are two representations of one fact,
and they drift the first time a code path writes one without the other.

`EXPIRED` settles the argument on its own: it is a function of the current time.
A stored value would be wrong from the moment the invitation lapses until
whatever job noticed — and a security decision made against a stale column is
exactly the failure worth designing out. There is no expiry sweep, and none is
needed.

## Precedence

Terminal states win over expiry, because they are facts about what happened
rather than about the clock: an invitation accepted on Monday is `accepted`
forever, not `expired` next week.

Among the terminal states the order is fixed —
`accepted → revoked → declined → superseded` — so that two timestamps set by
different code paths can never produce two different answers on two different
reads. In practice more than one is unreachable: every transition is a
conditional `UPDATE` requiring all four to be null.

## Transitions

| From | To | Trigger | Who | Conditional on |
|---|---|---|---|---|
| — | `PENDING` | `createWorkspaceInvitation` | workspace manager | the active slot being free |
| `PENDING` | `ACCEPTED` | `acceptWorkspaceInvitation` | the invitee, authenticated and matching | all four timestamps null |
| `PENDING` | `DECLINED` | `declineWorkspaceInvitation` | the invitee, authenticated and matching | all four null |
| `PENDING` | `REVOKED` | `revokeWorkspaceInvitation` | workspace manager | all four null |
| `PENDING` | `SUPERSEDED` | a later `create` for the same address | workspace manager | all four null |
| `PENDING` | `EXPIRED` | the clock | nobody | — |

Every row in that table except the last is a single conditional `UPDATE`. That
is the concurrency control: of two concurrent attempts, exactly one matches a
row and the other learns it lost. There is no read-then-write anywhere in the
lifecycle.

**Resend is not a transition.** It replaces the credential of a `PENDING`
invitation and extends its expiry. The state before and after is `PENDING`; what
changes is which token resolves it.

## What no transition can do

- **Revive.** Nothing moves out of a terminal state. A revoked invitation cannot
  be resent — a manager creates a new one, which supersedes nothing because the
  slot is already free.
- **Undo a membership.** Revoking an accepted invitation reports
  `{ outcome: "not-pending", state: "accepted" }` and changes nothing. Removing
  a member is a different operation and does not exist yet (BACKEND-27).
- **Change the granted role.** The role is fixed at creation. There is no edit
  operation, and resend carries the original role — OD-096 records that the
  product has no role-edit control either.
- **Retarget the address.** Same reasoning. A different address is a different
  invitation.

## The active slot

A partial unique index enforces at most one live invitation per
`(workspace_id, invitee_normalized_email)`:

```sql
UNIQUE (workspace_id, invitee_normalized_email)
WHERE accepted_at IS NULL AND revoked_at IS NULL
  AND declined_at IS NULL AND superseded_at IS NULL
```

It deliberately does **not** mention `expires_at`. A predicate containing
`now()` is not immutable and PostgreSQL will not index on it, and a partial
index whose membership changed with the clock would be a constraint that
silently stopped applying.

The consequence is deliberate: a logically **expired** row still occupies the
slot. Create supersedes it explicitly inside its transaction before inserting —
so the slot is freed by code that meant to free it, rather than by time passing.

## Retention

Terminal invitations are **never deleted**. The runtime role has no `DELETE`
grant on the table at all, so revocation is a timestamp rather than an erasure —
enforced by PostgreSQL, not by the repository omitting a method.

Invitation history is security history: who was offered access to a tenant, by
whom, and whether they took it. How long it is kept is unresolved — OD-097, and
ultimately BACKEND-55. Nothing in this command expires or removes a row.
