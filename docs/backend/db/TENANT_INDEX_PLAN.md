# Tenant Index Plan

Indexes for current workspace-owned tables. RLS evaluates `workspace_id =
lagda_current_workspace()` on every access, so the tenant predicate is on the hot
path for reads and writes alike — an index that does not lead with `workspace_id`
leaves it unsupported.

| Table | Query | Index | Reason |
|---|---|---|---|
| `workspaces` | by ID | PK `(workspace_id)` | The scope is the key |
| `workspace_memberships` | one member in a workspace | `uq_workspace_memberships_workspace_member` | Serves the lookup **and** is the compound-FK target |
| `workspace_memberships` | is this user a member? | `uq_workspace_memberships_workspace_user` | Enforces one membership per user per workspace and serves the lookup |
| `workspace_memberships` | list members, newest first | `idx_workspace_memberships_workspace_created_at` | `(workspace_id, created_at DESC)` — tenant first, then order |

`member_id` alone is the primary key and is deliberately **not** the lookup path:
resolving a member without a workspace is exactly the query tenancy forbids.

## Rules

Lead with `workspace_id` wherever queries filter by tenant first — which is
everywhere for tenant-owned data. `(created_at, workspace_id)` would be close to
useless for these queries.

Compound FK column order should match a real index, so the constraint check does
not force a scan.

Do not index every column. Each one costs storage and write time, and an index
nobody's query shape uses is pure overhead.

**No partitioning, no per-workspace schemas, no sharding.** Workspace tenancy is
a logical security boundary, not a physical one. Indexes are sufficient until
measurement says otherwise.
