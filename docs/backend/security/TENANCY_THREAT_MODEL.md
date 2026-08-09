# Tenancy Threat Model

Cross-tenant failure modes and the layer that stops each. The point of listing
them is that **no single control covers them all** — several are invisible to
RLS, and several are invisible to repository scoping.

| # | Threat | Primary control | Defence in depth | Status |
|---|---|---|---|---|
| T-1 | **IDOR/BOLA** — caller supplies another workspace's resource ID | Workspace-scoped repository | RLS `USING` | **Tested** |
| T-2 | **Unscoped query** — a repository method forgets its tenant predicate | RLS `USING` | Code review | **Tested** — the one repository scoping cannot catch |
| T-3 | **Cross-tenant relationship** — child in A references parent in B | Compound FK | Application invariant | **Partially** — FK target in place; referencing tables arrive with them |
| T-4 | **Cross-tenant write** — insert or update a row into another workspace | RLS `WITH CHECK` | Repository scope | **Tested** |
| T-5 | **Ownership change** — move a row between workspaces | RLS `WITH CHECK` | No generic setter exists | **Tested** |
| T-6 | **Pooled context leak** — a connection carries A's context into B's request | `SET LOCAL`, transaction-only | Single point of issue | **Tested**, incl. after rollback |
| T-7 | **Missing context** — a bug loses tenant scope entirely | Fail closed: policy matches nothing | — | **Tested** |
| T-8 | **Privileged bypass** — runtime role sees everything | Non-owning role, no `BYPASSRLS`, `FORCE RLS` | — | **Tested** — asserted before any other RLS test |
| T-9 | **Worker loads wrong tenant** | Job payload carries `workspaceId`; worker opens a tenant transaction | RLS | Handoff BACKEND-16 |
| T-10 | **Search/report missing predicate** | Scoped query at SQL level | RLS | Handoff BACKEND-48/49 |
| T-11 | **Cache key missing tenant** | Tenant in every cache key | — | Handoff — no cache exists |
| T-12 | **Storage object mismatch** | DB metadata authoritative; key prefix is not authorization | — | Handoff BACKEND-17 |
| T-13 | **Webhook / API key cross-tenant** | Subscription and key resolve one workspace | RLS | Handoff BACKEND-52/53 |
| T-14 | **Enumeration via error differences** | Cross-tenant reads return not-found, identical to absent | — | **Tested** at application layer |
| T-15 | **Enumeration via unique constraint errors** | Tenant-scoped uniqueness | Generic public errors | Convention |
| T-16 | **Admin/support leakage** | Privileged access is a separate named capability, never a flag | Audit | Handoff BACKEND-59 |
| T-17 | **Idempotency key collision across tenants** | Key identity includes tenant scope | — | Handoff BACKEND-14 |

## Things that are not tenancy controls

**Frontend route guards.** UI that cannot navigate somewhere is not a backend
boundary; an API client ignores it entirely.

**CORS.** Governs which origins may read a response. It is not authentication,
authorization, or tenancy.

**Opaque IDs.** Unguessable identifiers raise the cost of an attack. They are not
access control — T-1 assumes the attacker has the ID.

**Storage key prefixes.** `workspaces/{id}/…` helps operations. Anyone who can
name the key can fetch it unless the database says otherwise.

## Tenancy is not authorization

Tenant scope answers *whose data is this?* Authorization answers *may this actor
do this?* Both are required, and BACKEND-27 owns the second. A workspace owner is
powerful **inside** their workspace and has no standing outside it — no role
grants cross-tenant reach.
