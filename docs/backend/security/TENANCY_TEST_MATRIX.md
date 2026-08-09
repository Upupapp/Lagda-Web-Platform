# Tenancy Test Matrix

Coverage for every workspace-owned resource that **currently exists**. Future
resources are listed as PLANNED, never as tested.

Tests run against real PostgreSQL 16 as the **runtime role** (`lagda_app`), not
the table owner — an owner bypasses RLS unless FORCE is set, so a suite
connecting as `postgres` would pass while production leaked.

## Current resources

| Check | `workspaces` | `workspace_memberships` |
|---|---|---|
| Same-workspace read | PASS | PASS |
| Cross-workspace read by ID | PASS | PASS |
| Cross-workspace read with **no predicate** | PASS | PASS |
| Collection isolation | PASS | PASS |
| Cross-workspace insert | PASS | PASS |
| Cross-workspace update | PASS | PASS |
| Move row between workspaces | PASS | PASS |
| Cross-workspace delete | N/A (no delete path) | PASS |
| Missing tenant context — read | PASS | PASS |
| Missing tenant context — write | PASS | PASS |
| Pooled context leak | PASS | PASS |
| Context leak after rollback | PASS | PASS |
| Repeated alternating transactions | PASS | PASS |
| FK to non-existent workspace | N/A | PASS |
| Repository-level isolation (no RLS) | PASS | PASS |
| Application-level not-found parity | PASS | PASS |

## Preconditions

Asserted **before** any RLS test, because every later assertion depends on them:

| Check | Status |
|---|---|
| Runtime role is not superuser | PASS |
| Runtime role lacks `BYPASSRLS` | PASS |
| Runtime role does not own the tables | PASS |
| `FORCE ROW LEVEL SECURITY` enabled | PASS |

## Planned

Every resource below needs the full column of checks above when it is created:
invitations · contacts · documents · document artifacts · signing requests ·
recipients · templates · evidence · webhooks · API keys · workspace notifications
· reports · usage records.

**Compound-FK cross-tenant attack** — a child row in workspace A referencing a
parent in workspace B — is **PLANNED**, not tested. The unique target
(`workspace_id, member_id`) exists, but no referencing table does yet, so there
is nothing to attack. It becomes required with the first child table.

## Rule

Adding a workspace-owned table without adding its row here is incomplete work.

