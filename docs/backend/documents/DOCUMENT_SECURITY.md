# Document security

The threats this domain is built against, and the control for each. Every row
says what enforces it, not what was intended.

## 1. Cross-tenant document read

**Threat.** Workspace B reads, lists, or renames Workspace A's documents.

**Controls.** Three, independently:

- the repository is bound to one workspace and no method takes a workspace
  argument, so the call cannot be typed;
- `tenant_isolation` RLS with `FORCE`, so the runtime role sees nothing outside
  its transaction-local context;
- the hidden 404, so a caller cannot distinguish "another tenant's document"
  from "no such document".

**Proved by** integration tests as the runtime role: cross-tenant `findById`,
`list` and `rename` all miss, a raw INSERT naming another tenant is refused by
the policy, and a transaction with no tenant context sees zero rows.

## 2. Cross-tenant artifact linking

**Threat.** A document in Workspace A gains an artifact belonging to Workspace
B — reading another tenant's bytes through a document the caller owns.

**Control.** A **compound foreign key**, added by migration 016:

```sql
foreign key (workspace_id, document_id)
  references documents (workspace_id, document_id)
```

This is the most consequential line in the command. From migration 003 until
now, `document_artifacts.document_id` was `NOT NULL` with **no foreign key at
all** — a client-supplied string naming nothing, with only application code
between it and a cross-tenant link.

A single-column reference would not have closed it: `document_id` alone can name
a document in any workspace. The compound form cannot.

**Proved by** an integration test that inserts an artifact in B's tenant context
naming A's document, as the runtime role, and expects a constraint violation.

## 3. Storage-key injection

**Threat.** A client supplies a storage key, bucket or object path and reads or
overwrites arbitrary objects.

**Controls.** The create schema has one property — `title` — with
`additionalProperties: false`, so `storageKey`, `bucket`, `artifactId`,
`uploadId`, `sha256`, `sizeBytes`, `mediaType`, `pageCount` and
`malwareScanStatus` are all **rejected with 422**, not ignored. Keys are derived
from authorized identifiers (BACKEND-17), never accepted.

**Proved by** a route test that submits each of ten forbidden properties and
asserts 422 with nothing written, plus an architecture guard scoped to the
request-schema declarations.

## 4. Storage-key leakage

**Threat.** A storage reference reaches a response body and becomes a capability
a client can use or forward.

**Control.** The application read model has no field for it. `DocumentSummary`
and `DocumentSourceView` carry media type, size, page count and upload time —
the projection is the exclusion, so there is nothing at the serializer to forget
to strip.

**Proved by** a use-case test asserting the serialized document contains no
`artifactId`, `storageReference`, `digest` or `workspaceId`; a route test pinning
the exact key set; and a guard asserting neither string appears in the use case
or the routes at all.

## 5. Upload-pipeline bypass

**Threat.** A document acquires bytes that were never scanned, inspected or
hashed — a malicious PDF entering as a legitimate original.

**Controls.** There is no code path from the document domain to storage. The
only writer of an `original` artifact is `processUpload`, after quarantine,
validation, inspection, malware scan and digest. Document creation writes one
metadata row and touches nothing else.

The new foreign key tightens this further in the other direction: an upload
naming a document that does not exist now fails at commit rather than writing a
dangling artifact.

**Proved by** architecture guards (no storage client, no PDF library, no sealer
in any document file) and a use-case test asserting creation writes no artifact
and no upload row.

## 6. Artifact overwrite

**Threat.** A metadata operation rewrites accepted bytes, destroying the
evidence of what was signed.

**Controls.** Renaming writes one `varchar` column. The domain cannot reach
storage. Any future byte-changing operation must create a new artifact, and
`document_artifacts_one_original_idx` prevents a second `original` from
displacing the first.

**Proved by** an integration test comparing the **entire** artifact row before
and after a rename, and a second asserting a second original is refused.

## 7. Client-supplied integrity metadata

**Threat.** A client declares a SHA-256, size or page count and LAGDA treats it
as authoritative — a forged integrity claim.

**Controls.** None of those fields exists on any request schema. The digest and
size are computed by the upload pipeline from received bytes; the page count
comes from the inspector. Before BACKEND-29 the page count was computed and
**discarded**, which left the product's display with no server-side source —
persisting it on the artifact closes that without trusting anyone.

## 8. Mass assignment

**Threat.** `updateDocument(request.body)` lets a caller set `workspaceId`,
`createdAt`, `createdByUserId` or a status.

**Controls.** The port has `rename(documentId, title, now)` — a named operation,
not a patch object. There is no generic update anywhere, and the request schema
is closed.

**Proved by** route tests submitting each field, and a guard asserting the port
declares no `setStatus`, `archive`, `restore` or `delete`.

## 9. Destructive deletion

**Threat.** A delete destroys documents that signing evidence references, or
cascades into immutable artifacts.

**Controls.** No DELETE grant for the runtime role; no repository method; no
route; `ON DELETE RESTRICT` on every reference and no `CASCADE` or `SET NULL`
anywhere in migration 016.

**Proved by** an integration test issuing a raw `DELETE` as `lagda_app` and
expecting `permission denied`, plus an `information_schema` assertion that the
grants are exactly SELECT, INSERT, UPDATE.

## 10. Document content and title in logs

**Threat.** A legal matter name — which identifies the client, the counterparty
and often the transaction — reaches logs or a metrics store.

**Controls.** Log payloads carry ids, outcomes and `titleLength`. The length is
computed before the call so the payload references the title nowhere. Metric
labels are three closed sets. No document bytes exist in this layer to log.

**Proved by** a route test that serializes a real Pino line and asserts the
fixture title's distinctive words are absent, plus two guards over the route
source.

## 11. Stale-role authorization

**Threat.** A contributor demoted mid-request commits under authority they no
longer hold.

**Control.** The actor's membership is read **inside the mutation transaction**,
the same shape member administration and contacts use.

**Proved by** a use-case test that demotes an administrator to `auditor` between
requests and asserts the next create fails.

## 12. Document-id enumeration

**Threat.** Guessing ids to reach other tenants' documents.

**Controls.** Ids are opaque and server-generated — but that is obfuscation, not
authorization. The real controls are the scoped repository, RLS and the hidden
404, all of which hold whether or not an id is guessed. Stated so nobody treats
opacity as the defence.

## 13. Pre-auth and CSRF

**Threat.** A half-finished MFA credential, or a cross-site form post, mutates
documents.

**Controls.** All four routes are inside the authenticated scope, whose hook
enforces both.

**Proved by** route tests through the real `createApp`: anonymous gets 401 on
every route with nothing written, and a session without a CSRF token gets 403 on
both mutations. The **pre-auth** case is enforced by composition and has no
dedicated assertion here — the same honest label BACKEND-27 and BACKEND-28 used.

## Threats explicitly out of scope

- **Presigned-URL leakage** — no download endpoint exists, so no URL is
  generated, logged or persisted (OD-114).
- **Server-side PDF rendering** — not built; the frontend previews client-side.
- **Upload-cleanup race** — not reachable: cleanup deletes quarantine objects,
  and an accepted artifact never appears on its candidate list. See
  DOCUMENT_DELETION_POLICY.md.
