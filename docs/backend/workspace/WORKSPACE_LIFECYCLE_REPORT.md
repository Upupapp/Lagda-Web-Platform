# BACKEND-25 — Workspace lifecycle report

## Product inventory

| Feature | Status |
|---|---|
| **CREATE WORKSPACE** | **IMPLEMENTED** |
| **LIST MY WORKSPACES** | **IMPLEMENTED** |
| **GET WORKSPACE** | **IMPLEMENTED** |
| **UPDATE WORKSPACE** | **IMPLEMENTED** — `name` only, of seven fields on the settings form |
| **ARCHIVE** | **DEFERRED** — the product has no archive action for a workspace (OD-091) |
| **RESTORE** | **DEFERRED** — follows archive |
| **HARD DELETE** | **DEFERRED** — BACKEND-55 |
| **OWNERSHIP TRANSFER** | **DEFERRED** — the button says "demonstration only" (BACKEND-27) |
| **LEAVE WORKSPACE** | **DEFERRED** — no self-service leave exists (BACKEND-26/27) |
| **SLUG** | **DEFERRED** — displayed and editable, but no route resolves one (OD-089) |

→ [WORKSPACE_PRODUCT_INVENTORY.md](./WORKSPACE_PRODUCT_INVENTORY.md)

## Schema (migration 013)

Four changes, each closing a specific gap:

1. **`workspaces.owner_user_id` DROPPED.** A second authority on ownership
   alongside the `owner` membership row.
2. **`workspace_memberships.user_id` gains its foreign key** to `users`, missing
   since 001 because `users` arrived in 008. `ON DELETE RESTRICT`.
3. **`lagda_current_user_id()` and two `FOR SELECT` policies** —
   `member_self_read` and `member_workspace_read` — so "list my workspaces" is
   answerable without `BYPASSRLS`.
4. **`idx_workspace_memberships_user`**, leading with `user_id`, which is the
   opposite of every other index on the table and is what the cross-tenant
   membership query needs.

`workspaces` now has exactly three columns: `workspace_id`, `name`,
`created_at`. No `updated_at` (nothing reads one), no `archived_at`, no
`status`, no `slug`.

## Verification

| Gate | Result |
|---|---|
| typecheck (`tsc --build` + tools project) | **PASS** |
| lint | **PASS** |
| build | **PASS** |
| unit tests | **PASS** — 713 |
| `npm run check` | **PASS** |
| integration | **PASS** — 358, 49 skipped (S3) |
| migration from zero | **PASS** — 13 migrations on a clean database |
| migration re-run | **PASS** — no-op |

Integration ran against PostgreSQL 16, connecting as the runtime role
`lagda_app` — verified in-suite to be neither superuser nor `BYPASSRLS`.

## What changed beyond the feature

**OD-069 narrows for the first time.** The authenticated scope now exists in
`createApp`, and the four workspace routes are inside it. Their 401s, 403s and
429s are asserted against real requests through the real factory — not through a
test double, which is how the seventeen auth and account routes still stand.
Those seventeen plug into the same scope; that is now a wiring job rather than a
design one.

**A fixture class was fixed.** Seven integration suites each listed the
dependents of `users` inline. Adding an eighth dependent broke all seven, in a
way that reads like a defect in the feature. There is now one `truncateAll` and
one edit next time.

## What probing found

**A real design flaw, fixed:** the first implementation returned the locally
built result on an idempotent replay, so a retry would have received a workspace
ID that was generated for that attempt and never written — while the workspace
the first request created sat under a different ID the caller never learned. The
stored body wins now, and a test asserts the two IDs match.

**Two tests were vacuous before being rewritten.** "The user-scoped transaction
cannot write" asserted a throw; an `UPDATE` with no permitting policy matches
zero rows *silently*, so the assertion would have passed for the wrong reason
and kept passing if a policy were later widened to `ALL`. It now asserts zero
rows affected AND that an `INSERT` raises.

**The database caught two fixture shortcuts**, which is the schema doing its
job: a placeholder password hash failed `users_password_argon2id`, and an
8-character test digest failed `idempotency_records_key_digest_format`. Both
fixtures were made to match the production shape rather than the constraints
relaxed.

## Honest gaps

**OD-069 is not closed.** Seventeen auth and account routes remain uncomposed.
Until they are, a real browser cannot sign in to reach the workspace surface —
the workspace routes are demonstrated through `app.inject()` with a session
issued directly by the service.

**The overview page renders a status badge the backend cannot fill.** Same shape
as BACKEND-24's OD-087 (the sessions page showing device and region). Recorded
as OD-091 rather than answered by inventing a lifecycle.

**`workspace_operations_total` is instrumented and collects nothing.** No
exporter exists until BACKEND-66 — the pre-existing INSTRUMENTED_NO_EXPORTER
status, unchanged.

**Six of seven settings fields are not implemented.** Each is listed in the
product inventory with the command that owns it. The settings page will save one
field and silently do nothing with the rest until those commands land.
