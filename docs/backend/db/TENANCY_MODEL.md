# Tenancy Model

**Workspace is LAGDA's tenant boundary.** Every application resource is global,
user-scoped, or workspace-scoped — and which one is a decision recorded here, not
inferred later.

## Classification of current tables

| Table | Class | `workspace_id` | Tenant unique key | Tenant FK | Tenant index | RLS | Repository scoped |
|---|---|---|---|---|---|---|---|
| `workspaces` | WORKSPACE_SCOPED (is the scope) | PK | — | — | PK | **yes** | yes |
| `workspace_memberships` | WORKSPACE_SCOPED | yes | `(workspace_id, member_id)`, `(workspace_id, user_id)` | → `workspaces` RESTRICT | `(workspace_id, created_at DESC)` | **yes** | yes |
| `workspace_invitations` | WORKSPACE_SCOPED (+ a credential read path) | yes | `(workspace_id, invitation_id)`, partial unique on the live invitee address | → `workspaces` RESTRICT | `(workspace_id, created_at DESC)` | **yes** | yes |
| `contacts` | WORKSPACE_SCOPED | yes | `(workspace_id, contact_id)` — and deliberately **no** unique key on the email | → `workspaces` RESTRICT | `(workspace_id, updated_at DESC)`, `(workspace_id, normalized_contact_email)`, `(workspace_id, name)` | **yes** | yes |
| `documents` | WORKSPACE_SCOPED | yes | `(workspace_id, document_id)` — and no unique key on the title | → `workspaces` RESTRICT | `(workspace_id, created_at desc, document_id desc)` | **yes** | yes |
| `document_artifacts` | WORKSPACE_SCOPED | yes | `(workspace_id, artifact_id)`; partial unique on one ORIGINAL per document | → `workspaces`, `documents`, self — all RESTRICT | `(workspace_id, document_id, artifact_type)` | **yes** | yes |
| `document_preparations` | WORKSPACE_SCOPED | yes | `(workspace_id, preparation_id)`; `(workspace_id, document_id)` unique — one per document | → `documents`, `document_artifacts`, both RESTRICT | PK | **yes** | yes |
| `preparation_fields` | WORKSPACE_SCOPED | yes | `(workspace_id, field_id)` | → `document_preparations` **CASCADE** — the only one in this schema | `(workspace_id, preparation_id, page_number, layer, field_id)` | **yes** | yes |
| `kysely_migration` / `_lock` | SYSTEM_INTERNAL | n/a | — | — | — | no | n/a |

**Counts.** WORKSPACE_SCOPED 8 · SYSTEM_INTERNAL 2 · GLOBAL 0 · USER_SCOPED 0 ·
REQUIRES_REVIEW 0.

(The table lists the workspace-domain tables. Account, session, evidence and
operational tables are classified in their own commands' documents.)

No table is unclassified.

## Classification for tables not yet created

Recorded so the decision is not made accidentally by whoever writes the migration.

**WORKSPACE_SCOPED:** document versions · signing requests · recipients · templates · evidence · webhooks ·
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


## Contacts: the ordinary case, and why that is worth recording (BACKEND-28)

`contacts` is **WORKSPACE_SCOPED** with nothing special about it:

```sql
create policy tenant_isolation on contacts
using (workspace_id = lagda_current_workspace())
with check (workspace_id = lagda_current_workspace());
```

plus `FORCE ROW LEVEL SECURITY`, a `workspace_id` foreign key, and a repository
whose methods take no workspace argument.

**No fourth setting, no new scope, no exception.** BACKEND-26 needed one because
an invitee is not a member and had to resolve a tenant before having one. Every
contact caller is an authenticated member with tenant context already
established, so the ordinary mechanism is sufficient — and an architecture guard
asserts the absence of `BYPASSRLS`, `SECURITY DEFINER`, `runGlobal` and
`runForInvitationCredential` in every contact file, so adding one later has to
be a deliberate decision rather than a quiet import.

Two details of the table are tenancy decisions rather than schema taste:

**`UNIQUE (workspace_id, contact_id)`** is redundant today — `contact_id` is the
primary key — and exists as the target of a future tenant-safe reference:

```sql
FOREIGN KEY (workspace_id, source_contact_id)
  REFERENCES contacts (workspace_id, contact_id)
```

A signing recipient referencing `contact_id` alone could point at another
workspace's contact, with nothing but application code to stop it. Rule 4 of
this document, applied before there is anything to apply it to.

**There is deliberately no unique key on the email.** Duplicate contacts are
warned about, never refused — see CONTACT_DUPLICATE_POLICY.md. The index on
`(workspace_id, normalized_contact_email)` is for detection and exact-match
search, and an architecture test asserts it is not unique so the constraint
cannot arrive later as a tidy-up.

**Every index leads with `workspace_id`.** Every contact query is tenant-scoped
first; an index that did not lead with the tenant would be close to useless for
the queries this system actually runs.


## Documents, and the reference that was missing (BACKEND-29)

`documents` is **WORKSPACE_SCOPED** with the ordinary pattern — `tenant_isolation`
with `FORCE`, a `workspace_id` foreign key, a scoped repository whose methods
take no workspace argument, and no new transaction scope.

The part worth recording is not the new table. It is what the new table let
migration 016 add to an old one.

### `document_artifacts.document_id` had no foreign key for thirteen migrations

Migration 003 created it `NOT NULL` and said so explicitly: there was no
`documents` table to point at, so the column held whatever the caller passed.
BACKEND-18 then made that caller-supplied value part of the **storage key**, and
its route recorded the debt rather than hiding it.

Migration 016 settles it:

```sql
alter table document_artifacts
  add constraint document_artifacts_document_fk
  foreign key (workspace_id, document_id)
  references documents (workspace_id, document_id) on delete restrict;
```

**Compound, and that is the whole point.** A reference on `document_id` alone
would let a Workspace A artifact name a Workspace B document — the exact
cross-tenant link Rule 4 of this document exists to prevent, and one that
application code alone had been standing between since BACKEND-10.

This is the first place in the schema where the compound-key discipline paid out
against a reference that already existed rather than one being created, which is
why every table here carries `UNIQUE (workspace_id, <id>)` whether or not it has
a dependant yet.

### Document ids are globally unique

`document_id` is the PRIMARY KEY, so the same id cannot exist in two workspaces.
The compound key is a *tenant-safety* device, not a scoping device: it makes a
reference prove both halves rather than making ids per-tenant.

Two test fixtures had to be corrected for this — both were seeding one id into
two workspaces — and an integration test now asserts it.

### One ORIGINAL artifact per document

```sql
create unique index document_artifacts_one_original_idx
  on document_artifacts (workspace_id, document_id)
  where artifact_type = 'original';
```

Partial, covering `original` only. `sealed` and `completion-certificate` are
left unconstrained because nobody has decided a document has at most one of
either, and a constraint promising something undecided is one that gets dropped
later.


## Preparation, and the one cascade (BACKEND-30)

`document_preparations` and `preparation_fields` are **WORKSPACE_SCOPED** with
the ordinary pattern — `tenant_isolation` with `FORCE`, scoped repositories with
no workspace parameter, and no new transaction scope.

Two things about the foreign keys are worth recording.

### Three compound references, not one

A preparation names both a document and an artifact, and a field names a
preparation:

```sql
foreign key (workspace_id, document_id)        references documents (workspace_id, document_id)
foreign key (workspace_id, source_artifact_id) references document_artifacts (workspace_id, artifact_id)
foreign key (workspace_id, preparation_id)     references document_preparations (workspace_id, preparation_id)
```

All three compound, for the reason migration 016 established: a single-column
reference would let a preparation in one workspace target another tenant's
document or bytes, with only application code in the way.

The artifact reference is the one that would be easiest to get wrong, because it
looks redundant — the document already constrains the tenant. It is not: the
artifact is named independently, so without the compound form a preparation
could target a valid document and a foreign artifact.

### The schema's only ON DELETE CASCADE

`preparation_fields → document_preparations`.

Every other reference in LAGDA is RESTRICT, deliberately: they protect records
something else references, and a cascade would let one delete destroy evidence.

A preparation field is different. It has no meaning without its preparation, no
independent history, and **nothing references it** — a signing request will
SNAPSHOT these values, not point at them (PREPARATION_EDITABILITY.md). A
soft-delete would have to be filtered out of every read and every future
snapshot.

An architecture test asserts there is exactly ONE cascade in the migration and
no `SET NULL`, so a later addition has to be deliberate.
