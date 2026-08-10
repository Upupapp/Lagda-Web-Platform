# Signing request data classification

A signing request is the **names and email addresses of the parties to a legal
agreement, plus where each of them signs**. It is the most sensitive aggregate
LAGDA has built: more than a contact (someone in an address book), more than a
preparation recipient (someone a draft names), because a request is a durable
record that these specific people were asked to sign this specific document.

## The fields

| Field | Class | In a log? | A metric label? | On the wire? |
|---|---|---|---|---|
| `signing_request_id` | Internal resource id | Yes | **No** — unbounded | Yes |
| `workspace_id` | Tenant id | Yes | **No** | **No** — it is the URL |
| `document_id` | Resource id | Yes | **No** | Yes |
| `source_artifact_id` | Internal artifact id | **No** | No | **No** — one step from a storage key |
| `source_preparation_id` / `_revision` | Internal provenance | **No** | No | **No** |
| `document_title` | **Business-sensitive** — a legal matter name identifies a client and a transaction | **Never** | Never | Yes, to workspace members |
| `created_by_user_id` | Actor id | Yes | No | **No** |
| `state` | Workflow state | Yes | No | Yes |
| recipient `name` | **PII** | **Never** | Never | Yes |
| recipient `email` | **PII**, and a delivery address | **Never** | Never | Yes |
| `normalized_email` | **PII**, and internal | **Never** | Never | **Never leaves the backend** |
| recipient `organization` | PII / commercial | **Never** | Never | Yes |
| `recipient_type` | Workflow metadata, 6 values | Yes | **No** — see below | Yes |
| `order_index`, `routing_order` | Workflow metadata | Aggregate only | No | Yes |
| `source_preparation_recipient_id` | Pseudonymous handle | **Never** | Never | **No** |
| field geometry | Document workflow metadata | **Never** | Never | Yes |
| `field_type`, `required`, `layer` | Workflow metadata | Aggregate only | No | Yes |
| field `label` | **Business-sensitive** — "Guarantor signature" names a party | **Never** | Never | Yes |
| `source_preparation_field_id` | Internal handle | **Never** | Never | **No** |

## What is actually logged

One event, with counts and ids only.

```
signing_request.created
  workspaceId, documentId, signingRequestId, actorUserId,
  state, recipientCount, fieldCount
```

Reads are **not logged at all**. A sender reviewing a request before sending it
would otherwise produce a line per refresh, and each line would record which
agreement they are looking at and when.

The route test asserts the whole serialized line against real PII fixtures — a
name, an address, a matter title and a field label — so a nested field is
caught rather than a top-level key.

### Why the counts are in the log

"Are requests being created, and how big are they" is an operational question
with an operational answer. Two integers answer it and identify nobody.

### Why `recipientType` is not even in this log line

Unlike the recipient surface, where it is included: here the same request may
carry six of them, so a single scalar would be arbitrary and an array would be a
step toward logging the recipient list. The counts suffice.

## Metrics

`signing_request_operations_total`, labelled `operation`, `result`,
`processRole`, and nothing else.

Deliberately **not** `signingRequestId`, `documentId`, `workspaceId`,
`recipientCount` or `fieldCount`. The first three are unbounded. The last two
are unbounded too, and would turn "how many parties does a typical agreement
have" into a new time series per answer — a product query, not a counter. They
are in the log line, where a number is a number rather than a dimension.

An architecture guard pins the label set.

## The API surface

Creation returns **counts, not the snapshot**. The caller just supplied the
preparation it was built from; echoing every party's name and address back adds
nothing and puts the participants of a contract in one more place.

`GET` returns the full snapshot to workspace members with `signing-request.view`,
and excludes:

| Absent | Why |
|---|---|
| `sourceArtifactId` | A client holding it is one step from asking for its storage key |
| `sourcePreparationId`, `sourcePreparationRevision` | Operator provenance |
| `sourcePreparationRecipientId`, `sourcePreparationFieldId` | Provenance, and an invitation to resolve back to mutable state |
| `normalizedEmail` | Internal comparison value |
| `createdByUserId` | The sender knows who they are; a colleague's request names that colleague to everyone who can read it |
| `userId`, `isRegisteredUser` | A recipient is never matched to an account — that would leak user existence |
| `accessToken`, `signingUrl`, `otp` | Not issued, and a token in a list response is a token in a browser cache |
| `sentAt`, `viewedAt`, `signedAt`, `deliveryStatus` | Nothing has been sent |
| `workspaceId` | It is the URL |

Both a use-case test and a route test serialize a real response and assert each
string is absent.

Every route sends `Cache-Control: no-store` and `Pragma: no-cache`.

## At rest

- All three tables carry `tenant_isolation` with `FORCE ROW LEVEL SECURITY`,
  probed as the runtime role.
- The runtime role holds no `BYPASSRLS` and is not a superuser; the integration
  suite reads `pg_roles` and asserts both.
- The two snapshot tables have **no `UPDATE` grant**.
- Every route is inside the authenticated scope, so it inherits session
  validation and CSRF from where it is registered.

## Retention and erasure

A signing request is retained with its document; both snapshot tables cascade
from the request.

OD-110 (individual erasure) now has a **third** place to reach, and the hardest
one: a contact can arguably be erased, a preparation recipient is a draft, but a
signing request is the record that a named person was asked to sign a named
agreement. Erasing it destroys the record; retaining it retains personal data.

BACKEND-32 does not resolve that and does not pretend to. What it does do is
make the tension explicit and make the provenance links `SET NULL`, so erasing
upstream data does not silently corrupt or delete a workflow record.
