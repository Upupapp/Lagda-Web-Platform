# ADR-003 — Kysely as the PostgreSQL query layer

- **Status:** Accepted
- **Established by:** BACKEND-06 (BACKEND-01 deliberately deferred it)
- **Resolves:** the ORM/query-builder open decision

---

## Decision

**Kysely** over the `pg` driver, with Kysely's migrator for schema changes.
Database row types are **hand-maintained** in `@lagda/db`, not generated.

---

## Context

LAGDA's persistence requirements are unusual in one specific way: **tenant
integrity has to be expressible at the database level**. The architecture calls
for compound foreign keys — `FOREIGN KEY (workspace_id, parent_id) REFERENCES
parent (workspace_id, id)` — so that a row in one workspace cannot reference a
parent in another even if application code is wrong.

That, plus the fact that this is a legal-evidence system where a security
reviewer must be able to read what a query actually does, made SQL visibility
the deciding criterion rather than developer convenience.

---

## Alternatives

**Prisma.** Rejected. Its generated client types would need mapping at every
boundary to avoid leaking into application and contracts, which is work Kysely
does not create. Compound foreign keys and partial indexes are awkward or need
escape hatches. Its migration model generates SQL from a schema file, which
inverts the source of truth: the schema file becomes authoritative and the
migration becomes a derived artifact nobody reads.

**Drizzle.** A genuine contender — good typing, real SQL, lighter than Prisma.
Rejected on migration reviewability: generated migration artifacts are harder to
review line by line, and for schema changes touching tenant constraints, the diff
is the review.

**Raw `pg`.** Rejected. It gives maximum control and demands hand-written row
typing and result parsing everywhere in exchange. Kysely is a thin layer over
the same driver that removes that burden without hiding the SQL — the control
argument for raw `pg` mostly survives the choice.

**Kysely.** Typed query building that still reads as SQL, arbitrary DDL in
migrations (so compound FKs, partial indexes and CHECK constraints are all
expressible), a transaction API that wraps cleanly behind the application's
port, and a raw-SQL escape hatch for anything it does not model — RLS policies
included.

---

## Consequences

### Positive

- Compound tenant foreign keys are ordinary DDL, not a workaround.
- Query shape stays visible, so tenant scoping can be reviewed by reading it.
- The transaction adapter hides Kysely entirely: `@lagda/application` sees an
  opaque context and never learns what database it is talking to.
- No code generation step, so no workflow where types silently drift from schema
  until someone remembers to regenerate.
- Thin over `pg`, which keeps pool behaviour and SQLSTATE handling accessible.

### Trade-offs

- **More manual work than Prisma.** No generated client, no automatic
  migrations, no studio. Accepted: the mapping is explicit anyway, because an
  automatic mapper is how an unreviewed field reaches a legal document.
- **Row types are hand-maintained**, so a migration and its type must change
  together. Chosen over generation deliberately: generation makes the live
  database the source of truth for types while migrations are the source of
  truth for schema — two sources that drift the moment someone skips a step.
  Here they change in one commit, and the integration tests fail if they
  disagree.
- Kysely 0.29 moved migration exports to a `kysely/migration` subpath — a small
  version-sensitivity worth knowing about.

### Reversibility

Kysely is confined to `@lagda/db`, enforced by ESLint (INV-046). No Kysely type
crosses into application, core or contracts. Replacing it would mean rewriting
repository internals and the transaction adapter, and nothing above them.

---

## Related decisions

**PostgreSQL 16** for local development and CI, pinned in both. `postgres:latest`
would make CI results depend on when the workflow happened to run. The production
major is a deployment decision (OD-018).

**One schema (`public`)**, not a `lagda` namespace. Multiple schemas add
operational complexity with no benefit at this size.

**No extensions.** No `citext`, `pgcrypto`, `uuid-ossp` or `pg_trgm` — each
would need a reason, and none has one yet. Email normalization strategy belongs
to the auth commands; search extensions to BACKEND-48.
