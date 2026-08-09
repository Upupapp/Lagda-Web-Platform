# LAGDA Backend — Enforcement Matrix

What actually executes, versus what is written down. Updated by each
`BACKEND-XX` command that changes an invariant's enforcement.

**Enforcement values**

- **ENFORCED** — a tool fails when the rule is violated, and that has been
  demonstrated by deliberately violating it.
- **PARTIALLY ENFORCED** — some violations are caught, others are not. The gap
  is stated.
- **DOCUMENTED ONLY** — nothing fails automatically. A human or a reviewing
  command must catch it.

The distinction is the point. This repository has already shipped a rule that
existed and executed nothing (`RouteMeta.status`, declared on 225 routes, read by
no code, drifted until three routes misreported themselves). A matrix that
overstates enforcement would repeat exactly that failure.

| Invariant | Rule | Enforcement | Tool | Command | Completed by |
|---|---|---|---|---|---|
| **INV-001** | PDF/signing libraries confined to `packages/sealing` | **ENFORCED** | ESLint `no-restricted-imports` | `npm run lint` | BACKEND-01 |
| **INV-002** | Only signing completion invokes `DocumentSealer` | DOCUMENTED ONLY | — | — | BACKEND-09 |
| **INV-003** | Workspace-owned access is workspace scoped | DOCUMENTED ONLY | — | — | BACKEND-06/07 |
| **INV-004** | Routes contain no primary domain logic | DOCUMENTED ONLY | — | — | BACKEND-11 |
| **INV-005** | `core` does not depend on infrastructure | **ENFORCED** | ESLint `no-restricted-imports` | `npm run lint` | BACKEND-01 |
| **INV-006** | Frontend source is not a backend dependency | **ENFORCED** | Vitest architecture test | `npm test` | BACKEND-01 |
| **INV-007** | Shared contracts originate from `@lagda/contracts` | **PARTIALLY ENFORCED** — `contracts` is barred from importing frameworks, DB, queue, PDF, storage and React. Nothing yet asserts that shared types *originate* there; that needs contracts to exist. | ESLint | `npm run lint` | BACKEND-02 |
| **INV-008** | Public API types expose no infrastructure-library types | DOCUMENTED ONLY | — | — | BACKEND-09/11 |
| **INV-009** | eNotary is out of scope | DOCUMENTED ONLY | — | — | — |
| **INV-010** | Original uploaded documents are immutable | DOCUMENTED ONLY | — | — | BACKEND-05 |
| **INV-011** | Operational logs and evidence records are separate | DOCUMENTED ONLY | — | — | BACKEND-11/12 |
| **INV-012** | Retry-sensitive operations have durable idempotency | DOCUMENTED ONLY | — | — | BACKEND-03 |
| **INV-013** | State transitions are explicit and validated | DOCUMENTED ONLY | — | — | BACKEND-07 |
| **INV-014** | Tenant isolation is tested, not assumed | DOCUMENTED ONLY | — | — | BACKEND-07 |
| **INV-015** | Architectural change needs an ADR | Process | — | — | — |
| **INV-016** | `WorkspaceId` is branded and used for every workspace-owned reference | DOCUMENTED ONLY | — | — | BACKEND-02 |
| **INV-017** | Backend redactor matches by pattern and recurses through arrays | DOCUMENTED ONLY | — | — | BACKEND-11 |
| **INV-018** | Transition rules are owned by `core` | DOCUMENTED ONLY | — | — | BACKEND-07 |
| **INV-019** | No invariant without a named enforcing command | **ENFORCED** by this table's `Completed by` column | Review | — | BACKEND-00 |
| **INV-020** | No package dependency cycles; `package.json` deps and tsconfig references agree | **ENFORCED** | Vitest architecture test | `npm test` | BACKEND-01 |

## Enforcement added by BACKEND-01

Four rules became executable. Each was verified by deliberately violating it and
confirming the failure — a rule that has only been seen passing has not been
tested.

| Probe | Expected | Result |
|---|---|---|
| `import "pdf-lib"` in `packages/core` | lint error | error raised |
| `import "fastify"` in `packages/core` | lint error | error raised |
| `import "pdf-lib"` in `packages/sealing` | **no error** — this is its permitted home | no error raised |
| Cycle `contracts → core → contracts` | test failure | failed with the trail `contracts → core → contracts` |

The negative case matters as much as the positive ones: a rule that blocks the
allowed location too would push PDF work back out of the seam.

### Known imprecision

Inside `packages/core`, a PDF import reports the **INV-005** message rather than
INV-001, because the core-specific restriction block overrides the general PDF
block for the same rule. The import is still blocked; only the citation is less
specific. Both statements are true — a PDF library is infrastructure — so this is
recorded rather than worked around with a more fragile configuration.
