# LAGDA Backend — Architecture Invariants

Rules every `BACKEND-XX` command checks before modifying backend code.

**Enforcement column is honest.** "Documentation" means a human or a reviewing
command must catch a violation — nothing fails automatically. This repository has
already shipped one contract that existed but was never consumed
(`RouteMeta.status`, declared on 225 routes, read by no code, drifted until three
routes misreported themselves). Invariants become executable as the packages they
govern are created; until then the column says so rather than implying safety
that does not exist.

| ID | Invariant | Enforcement today |
|---|---|---|
| **INV-001** | No PDF library import outside `packages/sealing`. | **ESLint** (active) |
| **INV-002** | Only the signing-completion use case may invoke `DocumentSealer`. | Documentation → lint at BACKEND-01 |
| **INV-003** | Workspace-owned data access must be workspace scoped at the repository boundary. | Documentation → repository interface shape at BACKEND-04 |
| **INV-004** | API routes may not contain primary domain logic. | Documentation → review |
| **INV-005** | `core` may not depend on infrastructure packages. | Documentation → package boundary lint at BACKEND-01 |
| **INV-006** | Frontend source files are not backend runtime dependencies. | Documentation → package manifests at BACKEND-01 |
| **INV-007** | Shared API/domain contracts originate from `@lagda/contracts`. | Documentation → BACKEND-02 |
| **INV-008** | Public API types may not expose infrastructure-library types. | Documentation → review |
| **INV-009** | eNotary implementation is outside current scope. | Documentation + frontend disclosure tests |
| **INV-010** | Original accepted uploaded documents are immutable. | Documentation → storage design at BACKEND-05 |
| **INV-011** | Operational logs and evidence/audit records are separate concerns. | Documentation |
| **INV-012** | Retry-sensitive operations must support durable idempotency. | Documentation → middleware + table at BACKEND-03 |
| **INV-013** | Business state transitions must be explicit and validated. | Documentation → `core` transition tables |
| **INV-014** | Tenant isolation is tested, not assumed. | Documentation → required test fixture at BACKEND-04 |
| **INV-015** | Later architectural changes require an ADR or an explicit backend command. | Process |

## Additional invariants from repository inspection

These were derived from findings in
[`architecture.md` §7](./architecture.md#7-repository-findings), not from the
generic rule set.

| ID | Invariant | Why | Enforcement today |
|---|---|---|---|
| **INV-016** | `WorkspaceId` is a branded type and is used for every workspace-owned reference in `@lagda/contracts`. | The tenant key is currently a plain `string` in ~78% of its declarations (F-1). Branding it is what makes INV-003 checkable by the compiler rather than by review. | Documentation → **BACKEND-02 blocker** |
| **INV-017** | The backend redactor matches sensitive keys by substring/pattern and recurses through arrays. | The frontend redactor does neither: `resetToken` and `sessionToken` pass through, and arrays are returned unredacted (F-2). Server logs are persistent, so porting it verbatim would be worse than having none. | Documentation → unit test at BACKEND-01 |
| **INV-018** | Status transition rules are owned by `core`. Frontend `*Status` unions are vocabulary, not lifecycle authority. | 50 status unions exist with zero transition tables (F-3). There is no state machine to port. | Documentation → `core` |
| **INV-019** | No invariant may be recorded here without an enforcement plan naming the command that makes it executable. | Prevents this file becoming the next `RouteMeta.status` (F-4). | This table's enforcement column |

## Rules for future `BACKEND-XX` commands

1. Read this file and the applicable ADRs before changing backend code.
2. Preserve package boundaries.
3. Report — do not silently proceed — if the requested task would violate an
   invariant.
4. Modify an invariant only when explicitly instructed, and record the change in
   an ADR.
5. Add or update tests for any architectural behaviour touched.
6. Avoid opportunistic unrelated refactors.
7. When an invariant's enforcement column says "Documentation", and the command
   creates the package that governs it, **make it executable in that command**.
