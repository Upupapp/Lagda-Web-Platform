# Preparation data classification

A field layout is not obviously sensitive, and that is exactly why it needs
classifying: it looks like coordinates.

**A layout says where every signature on a contract goes, and its labels name
the parties.** "Mabini Holdings guarantor signature" at page 4 discloses that
there is a guarantor, who it is, and that page 4 is where the obligation sits.
Together with page count and field density it reconstructs the document's
structure without anyone reading the PDF.

## Classification

| Item | Class | Handling |
|---|---|---|
| `PreparationId` | Internal identifier | Safe in logs. Opaque |
| `PreparationFieldId` | Internal identifier | Safe in logs. Opaque |
| `DocumentId` | Resource identifier | Safe in logs |
| `WorkspaceId` | Tenant identifier | Safe in logs. Never in a response body |
| `sourceArtifactId` | Internal identifier | **Never leaves the backend** |
| Page number | Document structure | Response only |
| Geometry (`x`, `y`, `width`, `height`) | **Document structure** | Response only. Never logged |
| Field type | Workflow metadata | Response. `fieldCount` is safe in logs; the type list is not |
| **`label`** | **POTENTIALLY SENSITIVE** | Response only. Never logged, never a metric label |
| `required`, `layer` | Workflow metadata | Response |
| **`participantSlot`** | **PII once BACKEND-31 lands** | An opaque label today; becomes a recipient reference. Treat as PII now so the rule does not have to change later |
| `revision` | Concurrency metadata | Safe in logs |
| **Document bytes** | **HIGHLY SENSITIVE** | **Not stored here at all** |

## Why geometry counts as document structure

Coordinates alone are dull. Coordinates plus labels plus page numbers are a map
of the agreement: how many parties, where each signs, whether there is a
guarantor block, whether page 7 carries initials (so page 7 matters).

For a legal-technology product that is enough to be worth withholding, and §188
says so directly. It costs nothing: no consumer of LAGDA's logs needs a
rectangle.

## What is logged

One event, on save:

```json
{
  "event": "document.preparation.saved",
  "workspaceId": "ws_…", "documentId": "doc_…", "preparationId": "prep_…",
  "actorUserId": "usr_…", "revision": 8,
  "fieldCount": 12, "pagesUsed": 3
}
```

Counts answer "is the editor saving, and how big are layouts" without any of the
content. Both are computed **before** the log call so the payload object
references no field data at all — an architecture guard reads these payloads
literally, and an expression like `fields.map(f => f.label).length` inside one
would be indistinguishable from logging the labels.

**Reads are not logged.** The editor polls `GET`, and a line per poll would be
noise that also records how often a particular document is being worked on.

**Metric labels** are `operation`, `result`, `processRole` — three closed sets.
Not `documentId`, not `preparationId`, and **not `fieldCount`**: a count as a
label is unbounded cardinality (§194). If field-count distribution is ever
wanted it is a histogram, not a label.

## What never appears anywhere

| Never | Why |
|---|---|
| Document bytes | Not in this layer at all — no storage client, no PDF library |
| Storage reference | An internal capability-bearing key (INV-205) |
| Artifact digest | Nothing displays one; publishing it because a column holds it is the §194 accident |
| `sourceArtifactId` | A client knowing it is one step from asking for its key |
| Field labels or geometry in logs | Above |
| A signer's submitted value | Preparation stores none — there is nothing to leak |

Enforced by: the read model having no field for the first four (the exclusion is
upstream, in the projection, not a delete-list at the serializer); two
architecture guards over the route source; and a route test that serializes a
real Pino line and asserts the fixture's label words are absent.

Every response is `Cache-Control: no-store`.

## Retention

A preparation lives as long as its document, which is indefinitely (BACKEND-29).
Fields cascade when a preparation is deleted — the schema's only cascade — but
nothing deletes preparations today.

Erasure inherits **OD-119**: LAGDA has no data-subject erasure operation, and a
layout is a small part of a much harder problem. A preparation holds no personal
data of its own today beyond labels a sender wrote; once `participantSlot`
becomes a recipient reference (BACKEND-31), that changes and this table joins
the erasure question properly.
