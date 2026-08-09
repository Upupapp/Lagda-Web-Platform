# Use Case Catalog

Known application operations. **Cataloguing is not scheduling** — feature work follows `backend-implementation-priority.md`, which this does not reorder.

**Counts.** FOUNDATION_IMPLEMENTED 2 · PLANNED 24 · DEFERRED 6 · OUT_OF_SCOPE 4.

## Foundation-implemented

These prove the pattern. They are **not** feature-complete.

| Use case | Type | Actor | Scoped | Key ports | Tx | Idempotent | Command |
|---|---|---|---|---|---|---|---|
| `CreateWorkspace` | command | user | n/a | workspaces, memberships, tx, clock, ids | yes | no | BACKEND-25 completes |
| `GetWorkspaceMember` | query | user | **yes** | memberships | no | n/a | BACKEND-25 completes |

## Planned

| Use case | Type | Scoped | Tx | Idempotent | Command |
|---|---|---|---|---|---|
| `RegisterUser` | command | no | yes | no | BACKEND-19 |
| `SignIn` | command | no | no | no | BACKEND-19 |
| `RequestPasswordReset` | command | no | yes | no | BACKEND-20 |
| `VerifyEmail` | command | no | yes | no | BACKEND-19 |
| `InviteWorkspaceMember` | command | yes | yes | **yes** | BACKEND-25 |
| `AcceptInvitation` | command | yes | yes | no | BACKEND-25 |
| `TransferWorkspaceOwnership` | command | yes | yes | no | BACKEND-25 |
| `RemoveWorkspaceMember` | command | yes | yes | no | BACKEND-25 |
| `UploadDocument` | command | yes | yes | no | BACKEND-18 |
| `GetDocument` | query | yes | no | n/a | BACKEND-29 |
| `ListDocuments` | query | yes | no | n/a | BACKEND-29 |
| `PrepareDocument` | command | yes | yes | no | BACKEND-30 |
| `CreateSigningRequest` | command | yes | yes | no | BACKEND-31 |
| `SendSigningRequest` | command | yes | yes | **yes** | BACKEND-33 |
| `CancelSigningRequest` | command | yes | yes | no | BACKEND-35 |
| `ResolveSigningAccess` | query | n/a | no | n/a | BACKEND-34 |
| `SubmitSignature` | command | yes | yes | **yes** | BACKEND-36 |
| `DeclineSigningRequest` | command | yes | yes | no | BACKEND-37 |
| `CompleteSigningRequest` | command | yes | yes | **yes** | BACKEND-38 |
| `ExpireSigningRequests` | command | system | yes | yes | BACKEND-16 |
| `GetPublicVerification` | query | **unauthenticated** | no | n/a | BACKEND-42 |
| `CreateContact` / `ListContacts` | both | yes | mixed | no | BACKEND-28 |
| `CreateTemplate` / `UseTemplate` | both | yes | yes | no | BACKEND-33 |
| `SendReminder` | command | yes | yes | yes | BACKEND-46 |

Idempotency requirements are the five from handoff §28 — send, invite, plan change, signature submission, OTP delivery — plus completion, which must not produce two final artifacts. None invented.

## Deferred

Reports and analytics (BACKEND-49) · global search (BACKEND-48) · bulk send (BACKEND-33+) · document collaboration · workflow automation (enterprise-preview) · billing and usage (BACKEND-50/51).

## Out of scope

eNotary: notarial certificate issuance · remote online notarization · notary commissioning · PNPKI integration. INV-009 — no backend work before accreditation.

## Frontend resolver → future use case

| Frontend resolver | Future use case | Status |
|---|---|---|
| `signing-workflow.validation.ts` | `SendSigningRequest` (domain rules already in `@lagda/core`) | rules promoted BACKEND-04 |
| `signing-workflow.resolver.ts` | `SubmitSignature`, `CompleteSigningRequest` | rules promoted BACKEND-04 |
| `collaboration.resolver.ts` | collaboration use cases | deferred; backend must enforce independently, never trust the client resolver |
| `capability-resolver.ts` | none — frontend release mechanism | stays frontend |
| `preparation-resolution.ts` | `PrepareDocument` | BACKEND-30 |
| 24 `services/mock/*` | the corresponding use cases | replaced per feature command |

## Handoff endpoint → use case

`POST /api/workspaces` → `CreateWorkspace` · `POST /api/documents` → `UploadDocument` · `POST /api/signing-requests` → `CreateSigningRequest` · `POST /api/signing-requests/:id/send` → `SendSigningRequest` · `POST /api/sign/:requestId/submit` → `SubmitSignature` · `GET /verify/:verificationId` → `GetPublicVerification` (unauthenticated).
