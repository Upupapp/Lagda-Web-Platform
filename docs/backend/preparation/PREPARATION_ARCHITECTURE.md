# Preparation architecture — BACKEND-30

Read [PREPARATION_PRODUCT_INVENTORY.md](./PREPARATION_PRODUCT_INVENTORY.md)
first — it explains what the editor actually contains and what the three
decisions were.

## 1. The aggregate

```
Workspace
  └── Document (doc_…)                       BACKEND-29
        ├── ORIGINAL artifact (art_…)        BACKEND-18 — immutable bytes
        └── DocumentPreparation (prep_…)     ← this command
              ├── sourceArtifactId ─────────▶ that exact artifact
              ├── revision
              ├── lockedAt (nothing sets it)
              └── PreparationField[] (pf_…)
```

Three ideas that are deliberately not one:

| | Is | Mutability |
|---|---|---|
| **Document** | The workspace library resource | Title only |
| **Artifact** | One exact sequence of bytes | Never |
| **Preparation** | What will be asked for, and where | Freely, until frozen |

## 2. Shape

```
GET /workspaces/:workspaceId/documents/:documentId/preparation   document.view
PUT /workspaces/:workspaceId/documents/:documentId/preparation   document.prepare
```

Two routes, inside the authenticated scope.

Nested under the document because a preparation has no identity apart from one —
there is at most one per document, so addressing it by its own id would add a
lookup and a way to get it wrong.

## 3. The source artifact, and why naming it matters

A preparation targets **one exact `ArtifactId`**, not "the document's current
PDF".

Coordinates are meaningful only against the geometry they were authored on. If a
source artifact is ever replaced (OD-115), a layout built for artifact A may be
nonsense for artifact B even though both belong to one document — different page
count, different page sizes, different content under the same rectangle.

Naming the artifact is what lets a later command **detect** that instead of
silently reusing geometry against different bytes. Today it also gives the page
count its authority: the bound comes from the artifact's inspection metadata,
never from a client (§57).

Both references are compound foreign keys — `(workspace_id, document_id)` and
`(workspace_id, source_artifact_id)` — so a preparation cannot target another
tenant's document or bytes, and the database says so rather than the
application.

## 4. Metadata only — no prepared artifact

**Decision: METADATA ONLY** (§15).

Nothing in the product generates a prepared PDF, and nothing needs one: the
frontend renders the original client-side and draws field overlays on top of it.
Producing a derived PDF at this stage would create an artifact nobody reads,
with a digest nobody checks, that would have to be regenerated on every drag.

The original is untouched by construction, not by care:

- the domain imports **no PDF library, no storage client and no sealer** —
  three architecture guards over every file;
- an integration test compares the **whole artifact row** before and after a
  layout save;
- `DocumentSealer` is never invoked (§17), asserted separately.

If a prepared artifact is ever needed it gets a **new `ArtifactId`**, its own
SHA-256 and source provenance, and it never overwrites the original (§16).

## 5. Coordinates

Not defined here. [PREPARATION_COORDINATES.md](./PREPARATION_COORDINATES.md)
records how preparation uses the model BACKEND-09 fixed: normalized 0–1,
top-left origin, 1-based pages.

The one thing worth repeating at architecture level: **normalization is why
bounds validation needs no page dimensions**, which is why `x + width <= 1` is a
database CHECK and not merely application logic.

## 6. Field types

Nine, chosen by a single rule: every one must be renderable onto a signed PDF.
[PREPARATION_FIELD_MODEL.md](./PREPARATION_FIELD_MODEL.md).

## 7. Mutation model — whole-layout PUT

**One replace, not per-field CRUD** (§102).

The editor is a drag-and-drop canvas that autosaves. Per-field endpoints would
mean a request per drag frame, partial save states, and a layout a reader can
observe half-applied. One idempotent replace matches how the editor thinks and
commits atomically.

The cost — a stale tab could erase another's work — is what `revision` exists to
prevent, and [PREPARATION_EDITABILITY.md](./PREPARATION_EDITABILITY.md) covers
it in full.

Three statements in one transaction: claim the revision, delete the old fields,
insert the new. The claim carries **both** the revision check and the
editability check, so a freeze committing between a check and a write cannot
slip through.

## 8. Lazy creation

No preparation row exists until the first save (§92). `GET` on a
never-prepared document returns an empty layout at revision 0 and writes
nothing — creating a row because someone looked would leave an empty preparation
behind every uploaded document.

`UNIQUE (workspace_id, document_id)` means the create race converges: one insert
wins, the loser re-reads.

## 9. Authorization

| Operation | Capability |
|---|---|
| Read the layout | `document.view` |
| Save the layout | `document.prepare` |

Reading is deliberately the weaker gate: seeing where a document's signatures go
is part of reading the document, and a `reviewer` who may read it may see the
layout. Changing it is the product's own `prepare_documents` permission, held by
`owner`, `administrator`, `template_administrator` and `sender`.

A guard asserts no role holds `document.prepare` without `document.view`.

Authority is read **inside the mutation transaction**, as everywhere since
BACKEND-27.

## 10. Tenancy

`tenant_isolation` with `FORCE` on both tables, scoped repositories with no
workspace parameter, and **no new transaction scope** — every caller is an
authenticated member.

The schema's only `ON DELETE CASCADE` is preparation → fields, justified because
a field has no meaning without its parent and nothing references one. A guard
asserts there is exactly one cascade and no `SET NULL`.

## 11. What preparation is not

**Not a signing request.** No `sentAt`, no `expiresAt`, no signing status, no
recipient authentication, no reminders. A document may back more than one
signing request (§104), so a status here would be wrong as soon as there are
two. An architecture guard fails on any signing-status literal in the domain.

**Not evidence.** Dragging a field is not an event in a signing transaction
(§267). Nothing writes to `evidence_events`, asserted.

**Not a form builder.** Nine types, explicit columns, no configuration bag.

## 12. Telemetry

One event, `document.preparation.saved`, carrying `fieldCount` and `pagesUsed`
and **never the layout**.

A field layout says where every signature on a contract goes, and the labels
name the parties — "Mabini Holdings guarantor signature". Coordinates plus
labels reconstruct the document's structure and its participants (§188).

Reads are not logged at all: an editor polls this route, and a line per poll
would be noise that also records how often a document is being worked on.

## 13. What was not built

| | Why |
|---|---|
| Per-field CRUD | The other mutation model — §102 says pick one |
| Ready / lock operation | The product has a Review step, not a lock — OD-125 |
| Prepared PDF artifact | Nothing needs one — §15 |
| Recipient assignment | An opaque slot only. BACKEND-31 — PREPARATION_RECIPIENT_HANDOFF.md |
| `radio-group`, `multiline-text`, `acknowledgment`, `sender-text` | No renderer |
| Field duplicate / reorder | No control in the editor model |
| Preparation hash | Nothing consumes one yet — §161 |
| Rate limiting | Normal authenticated write; the expensive limiter stays on upload |
| Rotated-page support | Refused rather than misplaced — OD-124 |
