# Domain Model Inventory — BACKEND-04

Classification of business concepts across the 27 frontend model files
(11,280 LOC), the integration handoff, and the C33–C37 resolver contracts.

**Counts.** DOMAIN_STATE 3 · DOMAIN_POLICY 6 · VALUE_OBJECT 1 ·
SHARED_CONTRACT_ONLY 9 · APPLICATION_CONCEPT 11 · INFRASTRUCTURE_CONCEPT 7 ·
FRONTEND_ONLY 8 · REQUIRES_REVIEW 6 · ENTITY 0 · DOMAIN_EVENT 0.

**No entities were created.** Every rule needed today is expressible with
immutable read models and pure functions (§13). An entity becomes justified when
something owns mutable state across a lifecycle — that arrives with persistence
in BACKEND-06/07, not before.

**No domain events were created.** Deferred: no consumer exists. Events would be
speculative structure, and §39 warns against turning every method call into one.
The transition table already names the facts (`send`, `decline`, `complete`), so
introducing events later is additive.

## Implemented

| Concept | Category | Where | Source |
|---|---|---|---|
| Signing request lifecycle | DOMAIN_STATE | `signing/lifecycle.ts` | `TransactionStatus`, C37 |
| Participant action semantics | DOMAIN_STATE | `signing/participants.ts` | `StageParticipantAction` |
| Terminal-state protection | DOMAIN_STATE | `signing/lifecycle.ts` | §19 |
| Send readiness | DOMAIN_POLICY | `signing/policies.ts` | `signing-workflow.validation.ts` |
| Recipient eligibility | DOMAIN_POLICY | `signing/policies.ts` | `signing-workflow.resolver.ts` |
| Completion eligibility | DOMAIN_POLICY | `signing/policies.ts` | C37 |
| Signing order | DOMAIN_POLICY | `signing/policies.ts` | frontend + assumption |
| Progress | DOMAIN_POLICY | `signing/policies.ts` | C37 |
| Workspace ownership | DOMAIN_POLICY | `workspaces/index.ts` | product model |
| `Instant` | VALUE_OBJECT | `common/index.ts` | deterministic time |

## Not implemented, with reason

| Concept | Category | Why not |
|---|---|---|
| Document, DocumentVersion | REQUIRES_REVIEW | `documents.ts` declares no status union; whether document and transaction lifecycles differ is unresolved (BACKEND-29/30) |
| Field definition / assignment / submitted value | REQUIRES_REVIEW | Coordinate semantics — origin, units, page indexing — undocumented (BACKEND-02 F-3, BACKEND-30) |
| Recipient / participant entity | APPLICATION_CONCEPT | Needs repository identity; policies take read models today |
| Template, TemplateVersion | REQUIRES_REVIEW | Version-preservation semantics unresolved (BACKEND-33) |
| Contact | APPLICATION_CONCEPT | Address-book record; no invariant beyond persistence uniqueness (BACKEND-28) |
| Evidence event | REQUIRES_REVIEW | Forensic schema not specified; provenance must come from trusted observation (BACKEND-10/43) |
| Verification record | SHARED_CONTRACT_ONLY | Fully covered by contracts; hash comparison is BACKEND-09/10 |
| `AuthMethod` | REQUIRES_REVIEW | Declared twice with disjoint values (OD-009) |
| Role / permission policy | APPLICATION_CONCEPT | 24 permissions exist, but authorization needs session context (BACKEND-27) |
| Plan / entitlement | APPLICATION_CONCEPT | Commercial packaging, not signing correctness (§111) |
| Notification type | INFRASTRUCTURE_CONCEPT | Delivery orchestration (BACKEND-44/45) |
| Session, MFA, reset token | INFRASTRUCTURE_CONCEPT | Security infrastructure (BACKEND-19+) |
| Signing access token | INFRASTRUCTURE_CONCEPT | A secret; the domain references participant identity instead (§82) |
| Report, saved view, search | FRONTEND_ONLY / later | Presentation and query concerns (BACKEND-48/49) |
| Wizard step, tab, board, filter state | FRONTEND_ONLY | Presentation |
| eNotary concepts | Out of scope | INV-009 |

## Rules found only in frontend code

The §76 audit. Full promotion table in `DOMAIN_FOUNDATION_REPORT.md` §2 — twelve
rules, all now represented in core, all still enforced client-side for UX.

The concentration is in two files: `services/signing-workflow.validation.ts`
(522 lines) and `services/signing-workflow.resolver.ts` (381 lines). Both were
written as frontend services and both encode genuine business rules that any
non-UI caller would otherwise bypass.
