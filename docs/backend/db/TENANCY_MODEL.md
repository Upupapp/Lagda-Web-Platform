# Tenancy Model

**Workspace is LAGDA's tenant boundary.** Every application resource is global,
user-scoped, or workspace-scoped — and which one is a decision recorded here, not
inferred later.

## Classification of current tables

| Table | Class | `workspace_id` | Tenant unique key | Tenant FK | Tenant index | RLS | Repository scoped |
|---|---|---|---|---|---|---|---|
| `workspaces` | WORKSPACE_SCOPED (is the scope) | PK | — | — | PK | **yes** | yes |
| `workspace_memberships` | WORKSPACE_SCOPED | yes | `(workspace_id, member_id)`, `(workspace_id, user_id)` | → `workspaces` RESTRICT | `(workspace_id, created_at DESC)` | **yes** | yes |
| `kysely_migration` / `_lock` | SYSTEM_INTERNAL | n/a | — | — | — | no | n/a |

**Counts.** WORKSPACE_SCOPED 2 · SYSTEM_INTERNAL 2 · GLOBAL 0 · USER_SCOPED 0 ·
REQUIRES_REVIEW 0.

No table is unclassified.

## Classification for tables not yet created

Recorded so the decision is not made accidentally by whoever writes the migration.

**WORKSPACE_SCOPED:** invitations · contacts · documents · document versions and
artifacts · signing requests · recipients · templates · evidence · webhooks ·
API keys · in-app workspace notifications · reports · usage records.

**GLOBAL / USER_SCOPED:** user accounts · sessions · MFA configuration · password
credentials · account-security notifications.

Membership is the **edge** between them: a global user related to one workspace.
The membership row is workspace-scoped; the user row is not.

**Nullable `workspace_id` is prohibited** as a way to mix global and tenant rows
in one table. It forces policies like `workspace_id = current OR workspace_id IS
NULL`, which are easy to get subtly wrong. Separate the resource types instead.

## Rules

1. A workspace-owned table carries `workspace_id` **directly**. Ownership is
   never derived through a chain of joins — repositories scope on it, indexes
   lead with it, RLS reads it.
2. `workspace_id` is **immutable**. There is no generic reassignment, and the RLS
   `WITH CHECK` rejects an update that would move a row to another workspace.
3. Relationships between workspace-owned records preserve tenant identity:
   `UNIQUE (workspace_id, id)` on the parent, `FOREIGN KEY (workspace_id,
   parent_id)` on the child.
4. Uniqueness is per workspace unless a value is genuinely global.
5. Indexes lead with `workspace_id` where queries filter by tenant first.
6. Every workspace-owned repository method requires workspace scope. No optional
   tenant parameter, no `skipTenantCheck`.
7. A resource in another workspace is **not found**, never "forbidden" — the
   difference would confirm it exists.

## Adding a workspace-owned table

Required, not optional:

- [ ] Add it to the table above.
- [ ] `workspace_id` column, `NOT NULL`.
- [ ] `UNIQUE (workspace_id, id)` if anything will reference it.
- [ ] Compound FK to any workspace-owned parent.
- [ ] Index leading with `workspace_id`.
- [ ] `ENABLE` + `FORCE ROW LEVEL SECURITY`, and the `tenant_isolation` policy.
- [ ] `GRANT` to `lagda_app`.
- [ ] Repository methods take workspace scope **and** the transaction.
- [ ] Cross-tenant tests, added to `../security/TENANCY_TEST_MATRIX.md`.

## The user-scoped read path (BACKEND-25)

One question is not tenant-scoped: *which workspaces do I belong to?* It cannot
begin by choosing a workspace, because finding them is the point.

Migration 013 adds a second, narrower context alongside the tenant one:

| Setting | Policies | Reads | Writes |
|---|---|---|---|
| `lagda.workspace_id` | `tenant_isolation` on both tables | rows in that workspace | rows in that workspace |
| `lagda.user_id` | `member_self_read`, `member_workspace_read` | your own memberships, and their workspaces | **none — `FOR SELECT`** |

`TransactionManager.runForUser` sets the user setting and **not** the workspace
one, so `tenant_isolation` matches nothing for the transaction's whole lifetime
and the only policies in play are the two read-only ones. The scope cannot write
to either table — an `UPDATE` matches zero rows and an `INSERT` raises, and both
are asserted.

`member_workspace_read`'s subquery over `workspace_memberships` is itself
subject to `member_self_read`, so it cannot answer "is someone *else* a member
of workspace X" — the rows that would answer are invisible to the query asking.

**This is not a second tenant mechanism.** It establishes no workspace context
and exposes no tenant repository. It exists because the alternatives were
`BYPASSRLS` on the runtime role, or an application-side filter over a result set
containing every tenant's rows.

Both settings remain transaction-local via `set_config(name, value, true)`.


## The invitation credential path (BACKEND-26)

`workspace_invitations` is **WORKSPACE_SCOPED** for every management operation:
create, list, resend and revoke all run under tenant context with
`tenant_isolation`, exactly like any other workspace-owned table.

Acceptance is the exception, and it is narrow by construction. An invitee is not
a member, has no tenant context, and cannot be given one before the invitation
says which tenant. Migration 014 adds a **third** transaction-local setting:

| Setting | Policy | Reads | Writes |
|---|---|---|---|
| `lagda.workspace_id` | `tenant_isolation` | rows in that workspace | rows in that workspace |
| `lagda.user_id` | `member_self_read`, `member_workspace_read` | your own memberships and their workspaces | **none** |
| `lagda.invitation_digest` | `invitation_credential_read` | **one invitation, by digest** | **none** |

```sql
create policy invitation_credential_read on workspace_invitations
for select
using (token_digest = lagda_current_invitation_digest())
```

Two facts carry the whole argument:

1. **Equality against a UNIQUE column** matches at most one row. The scope
   cannot enumerate, cannot scan a workspace, and cannot answer any question
   except "the invitation whose credential I already hold".
2. **`FOR SELECT`.** Every write still requires tenant context.

`TransactionManager.runForInvitationCredential` sets the digest and no workspace,
then `enterWorkspace` adds tenant context **from the resolved invitation** on the
same transaction — so validating the invitation and creating the membership
commit or roll back together, and the workspace is never a client input.

No role gains `BYPASSRLS` and no `SECURITY DEFINER` function was introduced. The
integration suite proves the boundary by issuing `SELECT * FROM
workspace_invitations` with no predicate, in a workspace holding two
invitations, and asserting one row.

## Tenancy is not authorization (BACKEND-27)

Stated here because the two are easy to conflate, and conflating them is how a
role matrix ends up half in SQL.

| Question | Mechanism | Where |
|---|---|---|
| Which tenant does this row belong to? | `workspace_id`, scoped repositories, RLS | database + repository |
| May this actor perform this action? | capability policy | `@lagda/core/authorization` |

RLS stops workspace A reading workspace B. It says nothing about whether a
`member` of A may remove someone from A — and it should not.

**The complete role matrix is deliberately NOT duplicated into RLS.** A policy
per capability would be a second implementation, in a different language,
deployed by migration rather than code review, and the two would drift. What is
in the database is what belongs there: tenant isolation, plus the CHECK
constraint that bounds the role vocabulary.

Repositories enforce tenant scope. They do not decide business authorization —
`may this person invite` is not a question a SQL adapter should answer (§86).
