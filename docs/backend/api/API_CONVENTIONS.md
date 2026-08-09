# LAGDA API Conventions

**Established by:** BACKEND-03. **Authoritative** for every endpoint command.

Before adding an endpoint, read this and use `@lagda/contracts/api`. Do not
define a route-local error shape, pagination structure, sort type, request-ID
convention, idempotency header, or timestamp format. Changing anything here
requires an ADR.

Most of this was **derived from `backend-integration-handoff.md`, not chosen**.
Where the handoff specifies a convention it wins, even over this command's own
stated preferences — §9 says not to impose a suggested shape where a
specification already exists.

---

## 1. Transport

JSON over HTTP. `application/json` where a body exists. File upload and download
are the documented exceptions (§10).

Property names are **camelCase**. Database `snake_case` never reaches the wire;
mapping belongs to persistence.

## 2. Success responses

Return the resource directly. **No envelope.**

```json
{ "id": "doc_123", "name": "Agreement.pdf", "status": "draft" }
```

Not `{ "success": true, "data": {…} }`. HTTP status already says whether the
request succeeded. The frontend has a dead `ApiResponse<T> = { success: true,
data }` type in `models/index.ts` with **zero consumers** — it is not a
convention to preserve.

Note the frontend's *service layer* uses `ServiceResult<T>` (`ok` / `data`).
That is an internal result type, not a wire format; the API adapter maps HTTP
responses into it.

## 3. Errors

One envelope, everywhere:

```json
{
  "error": {
    "code": "validation_error",
    "message": "One or more fields contain invalid values.",
    "details": [
      { "field": "recipients[0].email", "code": "validation_error",
        "message": "Enter a valid email address." }
    ],
    "requestId": "req_abc123"
  }
}
```

**Codes are lowercase `snake_case`**, exactly as handoff §26 specifies —
`auth_required`, `permission_denied`, `validation_error`. The frontend's
`LagdaErrorCode` is UPPER_SNAKE and is what the *client* maps to on arrival;
it is not the wire format. (This command suggested UPPER_SNAKE for the wire.
The handoff already specified otherwise and ten codes are already published.)

Rules:

- **Clients branch on `code`, never on `message`.** Message text is a developer
  aid and a display fallback; copy and localization will change it.
- `message` never contains a stack trace, SQL, file path, internal topology, or
  a secret. The envelope has no field to put one in.
- Validation `details` are **library-independent**. TypeBox errors are
  translated, never returned raw — clients must not break when the validator
  changes.
- Field paths use dotted notation with bracketed indices:
  `recipients[0].email`.
- **Details never echo the submitted value.** `Password "Secret123!" failed`
  puts a secret into logs and error reporting. Return field and rule only.
- At most **25** details per response.

### Categories → HTTP

Application errors carry a category; the HTTP layer maps it. Domain code never
returns a status, and the mapper never inspects a message —
`error.message.includes("not found")` is how mapping silently breaks when copy
changes.

| Category | Status | Meaning |
|---|---|---|
| `validation` | **422** | Valid JSON, invalid content |
| `authentication` | 401 | No identity, or expired |
| `authorization` | 403 | Identity known, permission denied |
| `not-found` | 404 | Not resolvable in the caller's scope |
| `gone` | **410** | Existed, no longer actionable — expired or cancelled |
| `conflict` | 409 | Valid request, incompatible current state |
| `rate-limit` | 429 | |
| `dependency-unavailable` | 503 | Retry may succeed |
| `internal` | 500 | Safe generic body; detail to logs only |

**422, not 400**, for validation — handoff §26 maps `validation_error → 422`.
400 is reserved for a request that cannot be interpreted at all (malformed JSON,
wrong content type).

**410 matters.** An expired signing request is not "not found"; the recipient
screen needs the difference to explain what happened.

401 is never used for ordinary authorization failures. Authorization policy may
deliberately return **404 instead of 403** to avoid confirming another
workspace's resource exists — decided per endpoint, not globally.

## 4. Validation

```
HTTP parse → schema validation → authentication → authorization
           → domain validation → persistence
```

Schema validation does not replace domain rules. A schema checks that an email
is syntactically valid; only the domain knows it is already registered.
Database-dependent decisions never enter shared schemas.

**Unknown properties in request bodies are rejected** (`additionalProperties:
false`). Silently stripping them hides stale clients and typos, and rejecting is
the cheapest defence against mass assignment. **Responses stay
forward-compatible** — a client must not break when a response gains a field.

Strings are not globally trimmed or lowercased. Normalization is domain-aware,
and **passwords are never trimmed or Unicode-normalized** — that changes what
the user typed.

Enum values are **exact and case-sensitive**: `"Completed"` is rejected where
the canonical value is `"completed"`. Unknown filter values are rejected rather
than ignored.

Sensitive operations — sign-in, account recovery, OTP, invitations, signing
access — may return deliberately unspecific errors to prevent enumeration, even
when the server knows more.

## 5. Pagination

**Page-based**, exactly as handoff §27 specifies and the frontend's
`PaginatedResult<T>` already implements:

```
GET /documents?page=1&perPage=20
```

```json
{ "items": [], "total": 42, "page": 1, "perPage": 20, "hasNextPage": true }
```

- 1-indexed. Default `perPage` **20**, maximum **100**.
- Field names are the existing ones: `perPage` not `pageSize`, `hasNextPage`
  not `hasMore`, `total` not `totalItems`.
- Metadata is **flat**, not nested under `pagination` — the frontend already
  destructures this shape.
- A page beyond the end returns **200 with `items: []`**, never 404.
- Empty collections are `[]`, never `null`.

Cursor pagination would scale better and is the wrong choice here: it would
break an agreement both sides already implement, for a volume problem nobody has
measured. `total` is kept for the same reason.

## 6. Sorting, filtering, search

`sortBy` is a **closed union per endpoint**, never a free string:

```ts
const DocumentSort = sortSchema(["createdAt", "name", "status"]);
```

A sort key reaching a repository as free text becomes `ORDER BY ${input}` — the
shortest path from a query parameter to SQL injection and to leaked column
names. Repositories map whitelisted keys to explicit SQL expressions.

`sortOrder` is `asc` | `desc`. Where a sort key is not unique, repositories
append a tie-breaker (`createdAt DESC, id DESC`) or pagination will repeat and
skip rows.

Filters are explicit typed parameters per endpoint. There is no generic filter
language. Time filters use `createdAfter` / `createdBefore`, never `from` / `to`.

Free-text search uses **`q`**, 1–200 characters. Search text is **data, never
SQL** — repositories use parameterized queries and no application code escapes
it by hand.

## 7. Timestamps

RFC 3339, UTC, trailing `Z`: `2026-08-09T04:57:00.000Z`.

Never a JavaScript `Date` in a contract — `JSON.stringify` produces a string, so
a `Date`-typed field describes something the wire never carries.

Validated by `pattern`, **not** `format`: TypeBox rejects unregistered formats
while Ajv ignores them, so `format` alone behaves differently in the two
validators (ADR-002).

Named for the event — `createdAt`, `sentAt`, `signedAt`, `completedAt`,
`expiresAt` — never bare `date` or `timestamp`.

**Server-owned timestamps are never accepted as request fields.** This is a
reason request and response contracts stay separate types rather than one entity
shape reused in both directions.

## 8. Null vs omitted

- **Omitted** — not supplied, not applicable.
- **`null`** — present and explicitly empty.

Not interchangeable, and `exactOptionalPropertyTypes` keeps them apart. For
future PATCH operations the distinction is security-sensitive: "leave unchanged"
and "clear this" must be distinguishable, and `Partial<T>` expresses neither.
Each mutation contract states which fields may be replaced and which cleared.

## 9. Headers

| Header | Purpose |
|---|---|
| `X-Request-Id` | Correlates one HTTP attempt with logs. On every response and in error bodies. **The server always generates it** — a client value is untrusted input that flows into logs. |
| `Idempotency-Key` | Identifies a logical mutation. Opaque, ≤255 chars. |
| `X-CSRF-Token` | Required on state-changing browser requests. |

**Request ID is not an idempotency key.** Request ID answers "which attempt is
this?" and is new every time. An idempotency key answers "which operation does
this retry belong to?" and is deliberately the *same* across retries. A client
generating a fresh key per retry has disabled idempotency while appearing to use
it.

Reusing a key with materially different content must **fail**, not silently
return the first result (BACKEND-14).

Authentication is a secure httpOnly session cookie, so CSRF protection is
required. **CORS is not a substitute** — it governs who may *read* a response,
while a cross-origin POST is sent regardless. Origin control, authentication,
authorization and CSRF are four different problems.

## 10. Methods, statuses, bodies

`GET` retrieve · `POST` create or action · `PATCH` partial update · `PUT`
full replacement (rare) · `DELETE` remove or revoke. Workflow actions may use
explicit action endpoints where the handoff specifies them; CRUD is not forced.

**`GET` never mutates.** A signature is never submitted by fetching a URL.

`201` on creation with the created resource. `204` for a deletion with nothing
useful to say — not `{ "success": true }`. `202` only when the logical operation
genuinely completes later; not merely because a worker was involved.

Downloads return binary with appropriate content type and disposition, outside
the JSON conventions. Uploads use `multipart/form-data`; raw bytes never appear
in `@lagda/contracts`. JSON endpoints get a small body limit and must not
inherit an upload-sized one.

## 11. Response contracts are a security boundary

Every route declares a response schema. This is not only documentation: Fastify
serializes to the declared schema, so an undeclared field is dropped rather than
leaked.

**Handlers map domain results into declared response contracts.** A database row
is never serialized directly — that is how persistence-only and secret fields
escape.

Review every response contract for PII, secrets, workspace scope, and internal
identifiers. "The frontend does not display it" is not security: if the API
sends it, the client has it.

Never exposed: bucket names, object storage keys, filesystem paths, storage
credentials, sequential database IDs. Use opaque branded IDs and dedicated
access endpoints.

`ipAddress` and `userAgent` are **server-observed**, never trusted from a
request body. A client-declared field is not forensic evidence.

Public verification IDs and signing access tokens are different things with
different security properties and never share a contract type.

## 12. Compatibility

Breaking: removing a field, changing a type, changing a serialized status value,
changing nullability, changing meaning, changing pagination indexing, renaming an
error code. Additive optional response fields are usually safe.

The backend has no external clients yet, so clean breaks are acceptable while
frontend and backend change together. That ends when external clients exist.

Deprecate with `@deprecated`, a replacement, and a removal plan. No zombie
fields, and no `metadata: {}` or `extra: {}` escape hatches — an untyped bag
becomes permanent contract debt.

No URL versioning (`/v1`) yet; nothing requires it and the structure allows
adding it later.

## Account endpoints are never cacheable (BACKEND-24)

`/me`, `/me/profile`, `/me/preferences`, `/me/password` and `/me/sessions` all
send `Cache-Control: no-store`.

`no-store`, not `no-cache`: the latter permits a shared cache to KEEP the
response and merely revalidate it. These bodies carry an email address, MFA
status and session metadata, and a proxy holding one user's `/me` for another to
receive is exactly the failure to avoid.

**No account route takes a user id.** Identity comes from the validated session,
so there is no `:userId` segment and no `userId` request field. "User A edits
user B" is not expressible, which is stronger than an authorization check that
compares them.

## 20. Tenant-scoped routes (BACKEND-25)

Workspace-owned resources nest under the workspace:

```
POST   /workspaces
GET    /workspaces
GET    /workspaces/:workspaceId
PATCH  /workspaces/:workspaceId
       /workspaces/:workspaceId/<resource>…   ← every future tenant resource
```

**A path segment, not a header.** No `X-Workspace-ID` exists. A header tenant
boundary does not appear in a route pattern, a normalized metric label or an
access log, so "which tenant did this request address" becomes unanswerable from
the places an operator actually looks. If a header is ever introduced it must be
resolved and membership-checked exactly like a path ID, and must never override
one.

**No request body carries a `workspaceId`.** A body value that could disagree
with the path is a reconciliation rule waiting to be written the wrong way
round. The field simply does not exist on any schema.

**A path ID is addressing, never authorization.** The segment says which tenant;
`requireWorkspaceAccess` says whether the caller may enter it, by reading the
authoritative membership on every request.

**Cross-tenant access returns 404**, using the discretion §3 already grants —
"authorization policy may deliberately return 404 instead of 403 to avoid
confirming another workspace's resource exists". A real foreign workspace and a
fictional one must be indistinguishable in status, code and message.

**Tenant responses are `Cache-Control: no-store`.** Not `no-cache`, which lets a
shared cache keep the response and merely revalidate it.
