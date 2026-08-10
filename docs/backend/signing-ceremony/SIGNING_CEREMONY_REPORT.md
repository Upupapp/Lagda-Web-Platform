# BACKEND-35 report — the recipient signing ceremony

**Backend:** `4d21d81` · **Migration:** 022 · **Date:** 2026-08-10

## What was built

Four endpoints, two tables, six restrictive RLS policies, two core modules, one
narrow repository, 86 assertions. No new dependency.

```
POST /signing/ceremony/enter      session + recipient CSRF
GET  /signing/ceremony            session
GET  /signing/ceremony/document   session, streams the frozen PDF
POST /signing/ceremony/consent    session + recipient CSRF
```

## The decision that carries the most weight

**RESTRICTIVE row-level security.**

PostgreSQL ORs permissive policies together. A narrow policy added beside
`tenant_isolation` would therefore WIDEN access, not narrow it: once the
recipient realm enters a workspace, tenant isolation alone lets it read every
row of that tenant — every request, every recipient, every field.

Six restrictive policies AND instead, each keyed off the session digest with an
`is null` arm that makes them inert in the workspace and bootstrap realms.

The consequence is that **field filtering is a database property**. Measured, in
the recipient realm, as the runtime role:

| Table | Rows present | Rows visible |
|---|---|---|
| `signing_requests` | 2 | **1** |
| `signing_request_recipients` (same request) | 2 | **1** |
| `signing_request_fields` (same request) | 2 | **1** |
| `document_artifacts` (same document) | 2 | **1** — the frozen one |

With an unknown session: **0**. In the workspace realm: **2 and 2**, unchanged.

## The type system carries the same property

`RecipientCeremonyRepository` is bound at construction to one workspace, one
request and one recipient, and its read methods **take no identifying
arguments**. `listAssignedFields()` cannot be called with the wrong recipient
because there is no parameter. `getSourceArtifact()` cannot return the
document's current artifact because the join key is `source_artifact_id`.

Three independent layers say the same thing, and none relies on the others.

## Product decisions, read rather than assumed

**Consent is real and gated BEFORE the document.** `RequestAccessPage` goes
access → consent → review; `CONSENT_ACCEPT` sets `step: "review"`. Six of six
scenarios require consent, and the four roles that require it are exactly
`canHoldFields` — viewer and copy-recipient do not. BACKEND-31's predicate,
arrived at from the other end.

**The disclosure text is not stored.** The product's copy closes with *"provided
for demonstration purposes only"*. Storing that as evidence would be worse than
storing nothing, because it would look like a legal record. A type and a version
are stored; the default version is named `v0-demonstration` for the same reason.

**In-progress input stays client-side.** The model comments its own boundary —
*"in-memory only; never stored or uploaded"* — so a draft table would have no
writer.

**The document is streamed, not presigned.** `ObjectStorage` has four operations
and none mints a URL. §25 permits presigning only if the storage architecture
supports it, and it does not.

## Findings

**The frontend renders a field type the backend cannot produce.** `sender-text`
is excluded from `PREPARATION_FIELD_TYPES` deliberately — *"sender-filled
content, which carries different authority and audit semantics"* — and the
frontend has three fixtures of it.

**Four field types have no recipient renderer.** `full-name`, `email`, `title`,
`company`. Two are server-derived and fine; `title` and `company` are not, so a
preparation can place a field no signer can fill.

**The frontend models multiple documents per request**
(`RecipientRequest.documents[]`); the backend snapshot has one
`source_artifact_id`. Recorded, not resolved — that is BACKEND-32 territory.

**No `senderWorkspaceDisplayName` is available.** `SignPage` shows one; nothing
snapshotted it at send, and reading the workspace's current name would both
widen the recipient realm and make ceremony history depend on a mutable value.

**A document cannot have two `original` artifacts.**
`document_artifacts_one_original_idx` already forbids it, so artifact drift
cannot arise from a re-upload at all. The test had to use a `sealed` artifact.

**Five architecture guards were narrowed during the run**, each with the reason
recorded at the assertion — including a `SESSION_COOKIE_NAME` guard that failed
because `RECIPIENT_SESSION_COOKIE_NAME` contains it, and a slice boundary
written as a comment, which `code()` strips. Both are traps this codebase has
recorded before.

**The first version of the integration counts was wrong in an instructive way.**
The queries ran on `app.db` outside the transaction, so no settings were set,
every count was zero, and the tests would have "passed" for entirely the wrong
reason had the expectations been zero. They now set both settings explicitly.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1804 passed, 60 files** (+67) |
| `npm run build` | Pass |
| `npm run test:integration` | **581 passed, 49 skipped** (+19) |
| Migration from zero | Verified — `lagda_zero6_test`, `lagda_zero7_test` |

One earlier integration run reported 2 failures of 630 that the filtered output
did not name; the two following runs were green. Recorded in the test matrix
rather than dismissed.

## Honest gaps

**No HTTP route suite**, for the third command running. The 401 body, the 403 on
a missing CSRF token, the document headers and the rate-limit rejection are
covered by source-reading and by the use cases underneath, not by requests.
Worth one pass of its own.

**No evidence event is written**, deliberately — nothing in this codebase writes
one, and adding the first here would produce a trail with a hole in the middle.

**No IP or user agent captured.** BACKEND-43 has not said what a certificate
contains, and collecting PII for a consumer that may never want it is collecting
first and justifying later.

**Range requests unsupported** — honestly signalled as `Accept-Ranges: none`
rather than claimed. Nothing fetches a PDF today because the frontend has no
viewer.

## What BACKEND-36 inherits

A stable `RecipientSigningContext`, a signability policy that revalidates, a
consent record to re-check, a complete field input policy naming the three
server-derived types, and a database that will not return another recipient's
field even if the query asks for it.
