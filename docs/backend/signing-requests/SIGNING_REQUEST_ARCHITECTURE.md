# Signing request architecture

A **signing request** is an immutable snapshot of one coherent preparation
state. It is what BACKEND-33 will send, what BACKEND-38 will complete against,
and what BACKEND-43 will cite as evidence.

## The boundary this crosses

```
MUTABLE AUTHORING                        IMMUTABLE WORKFLOW

Document                    ──┐
DocumentPreparation rev N     │ snapshot   SigningRequest
PreparationRecipient[]        ├──────────► SigningRequestRecipient[]
PreparationField[]            │            SigningRequestField[]
source ArtifactId           ──┘            + the exact source ArtifactId

… continues to rev N+1                    … unchanged, forever
```

Everything before this line is state a sender edits: they move a field, correct
a name, rename the document. That is correct while nothing has been sent.

Everything after it is a record. A document signed in March must keep saying who
was asked, for what, and where — after the address book, the layout and the
document's title have all moved on.

## Four identities, four meanings

| Identity | What it is | Outlives |
|---|---|---|
| `DocumentId` | A reusable workspace resource | every request over it |
| `ArtifactId` | Exact immutable bytes | every request that names it |
| `PreparationId` | Mutable authoring state, revisioned | — |
| `SigningRequestId` | One signing workflow | the preparation it came from |

Separate brands. Passing one where another belongs is a compile error.

## The tables

`signing_requests` (migration 019):

| Column | Meaning |
|---|---|
| `signing_request_id` | Opaque, server-generated |
| `workspace_id`, `document_id` | Tenancy and the business relationship |
| `source_artifact_id` | The EXACT bytes the geometry applies to |
| `source_preparation_id`, `source_preparation_revision` | Provenance. Never read to reconstruct |
| `state` | `draft`, and the CHECK admits nothing else |
| `document_title` | The title AS IT WAS |
| `created_by_user_id` | From the session. Audit provenance |

`signing_request_recipients` and `signing_request_fields` carry the snapshot
itself — see [SIGNING_REQUEST_SNAPSHOT_MODEL.md](SIGNING_REQUEST_SNAPSHOT_MODEL.md)
for every column and why it is there.

### Constraints that carry rules

| Constraint | The rule |
|---|---|
| `state in ('draft')` | BACKEND-32 cannot produce a request that claims something happened |
| FK → `documents` / `document_artifacts` / `document_preparations`, RESTRICT | Nothing upstream may delete a signing workflow out from under itself |
| Recipient/field FK → request, CASCADE | A snapshot row has no meaning without its request |
| Field FK on **three** columns, RESTRICT | A field cannot name another request's recipient |
| `request_recipient_id NOT NULL` on fields | An unassigned field is an impossible workflow |
| `UNIQUE (workspace_id, signing_request_id, normalized_email)` | The preparation's duplicate rule, preserved |
| Provenance FKs `ON DELETE SET NULL (column)` | The mutable side stays editable |
| **No** `UPDATE` grant on the snapshot tables | Immutability as a privilege |

## No unique constraint on `document_id`

More than one request per document is permitted. The evidence for 1:1 was a
frontend fixture shape and a `CONFLICT` rule about a *different* aggregate
(`SigningWorkflow`).

The decision is asymmetric: forbidding a second request the product wants blocks
a legitimate action and needs a migration; permitting one it does not want costs
a single application condition, against zero existing rows.

## Layers

| Layer | File |
|---|---|
| Contract | `packages/contracts/src/signing-requests/index.ts` |
| Domain | `packages/core/src/signing/snapshot.ts` (readiness), `lifecycle.ts` (states) |
| Ports | `packages/application/src/common/ports/signing-requests.ts` |
| Use cases | `packages/application/src/signing-requests/signing-requests.ts` |
| Adapter | `packages/db/src/repositories/signing-requests.ts` |
| HTTP | `packages/api/src/signing-requests/signing-request-routes.ts` |

## The API

```
POST /workspaces/:w/documents/:d/signing-requests    Idempotency-Key required
GET  /workspaces/:w/signing-requests/:id
```

Create is nested under the document, so the document is in the URL where no body
can override it. Read is not: a request outlives its relationship to the
authoring flow, and BACKEND-33 and BACKEND-34 will hold a request id without
necessarily holding the document's.

**The creation body is empty and closed.** `additionalProperties: false` rejects
`recipients`, `fields`, `sourceArtifactId`, `preparationId`, `state`,
`documentTitle`, `createdByUserId`, `signingRequestId`, `subject`, `message`,
`expiresAt`, `reminders` and `authMethod` with 422. A client that could supply
its own recipient array could create a workflow that does not match the document
anyone reviewed.

## Authorization

`signing-request.create` to create, `signing-request.view` to read.

Create follows `document.prepare` — the same four roles. Separate anyway,
because the consequence differs: preparing is reversible and creating is not.

View follows `document.view` — six roles including `reviewer` and `auditor`. An
auditor who could not see what was asked of whom could not audit anything that
happened to it.

## Idempotency

Required, like invitations. Operation `signingRequest.create`, scoped to the
workspace, fingerprinted on the **document alone** — see
[SIGNING_REQUEST_CREATION_CONSISTENCY.md](SIGNING_REQUEST_CREATION_CONSISTENCY.md)
for why the preparation revision is deliberately excluded.

## Handoffs

- **BACKEND-33 (send)** must act on the snapshot alone and never re-read
  preparation. It widens the `state` CHECK when it earns `sent`.
- **BACKEND-34 (access)** issues credentials against `SigningRequestRecipientId`.
- **BACKEND-37 (ceremony)** evolves state against request-scoped identities.
- **BACKEND-38 (completion)** uses `source_artifact_id` plus the field snapshot.
- **BACKEND-43 (evidence)** cites all three request-scoped ids.
