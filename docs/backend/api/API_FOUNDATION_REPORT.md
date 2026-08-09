# API Foundation Report — BACKEND-03

Audit record for the cross-cutting API conventions. Conventions themselves are
in [`API_CONVENTIONS.md`](./API_CONVENTIONS.md).

---

## 1. Correction to the BACKEND-02 report

BACKEND-02 stated: *"No pagination convention exists to inherit — so BACKEND-03
chooses rather than preserves."* **That was wrong.**

`backend-integration-handoff.md` §27 specifies pagination precisely:

```
?page=1&perPage=20   (default perPage 20, max 100)
{ items, total, page, perPage, hasNextPage }
```

and the frontend's `PaginatedResult<T>` in `src/app/models/errors.ts` implements
it field for field. Both sides already agree. Had the earlier claim stood,
BACKEND-03 would have invented a convention that contradicted working code —
the exact drift this sequence exists to prevent.

The §3 audit is why it surfaced: searching the handoff for pagination terms
before designing, rather than after.

---

## 2. Handoff compatibility matrix

| Concern | Handoff | Frontend | BACKEND-03 decision | Migration |
|---|---|---|---|---|
| Error envelope | Codes + statuses (§26), no envelope shape | `ServiceResult<T>` (`ok`/`data`) — service layer, not wire | `{ error: { code, message, details?, requestId? } }` | None |
| Error code format | **lowercase snake_case** (`auth_required`) | `LagdaErrorCode` UPPER_SNAKE | **Follow the handoff.** Frontend maps on arrival | None |
| Validation status | `validation_error → 422` | — | **422**; 400 only for uninterpretable requests | None |
| Gone semantics | `410` for expired/cancelled | `REQUEST_EXPIRED`, `REQUEST_CANCELLED` | **410 retained** | None |
| Success wrapper | Not specified | Dead `ApiResponse<T>` (`success: true`), **0 consumers** | **No wrapper** | None |
| Pagination | `page`/`perPage`, flat, 20/100 (§27) | `PaginatedResult<T>` — identical | **Preserved exactly** | None |
| Sorting | Not specified | `InboxSortOrder` is a UI sort, different semantics | `asc`/`desc` + per-endpoint whitelist | None |
| Search | Not specified | — | `q`, 1–200 chars | None |
| Timestamps | ISO 8601 UTC | ISO strings | RFC 3339 UTC, `pattern`-validated | None |
| Request ID | `requestId` appears (6×) | — | `X-Request-Id`, server-generated | None |
| Idempotency | 5 operations (§28) | — | `Idempotency-Key`, ≤255 | None |
| Empty responses | Not specified | — | `[]` not `null`; 204 for deletes | None |

**No frontend migration is required.** Every canonical decision either matches
what the frontend already does or concerns wire behaviour it does not yet
consume.

---

## 3. Duplicate definitions found (§175–§177)

| Definition | Location | Status | Action |
|---|---|---|---|
| `PaginatedResult<T>` | `models/errors.ts` | **Live**, matches handoff §27 | Canonical shape adopted verbatim |
| `ApiResult<T>` / `ApiError` / `ApiResponse<T>` | `models/index.ts:25-40` | **Dead — zero consumers** | Flagged, not deleted (OD-012) |
| `ServiceResult<T>` / `LagdaErrorCode` | `models/errors.ts` | **Live**, 24 mock services | Frontend service layer; not a wire format |
| `InboxSortOrder` | `models/inbox.ts` | Live | Left alone — a UI sort (`received`/`due-date`/`alphabetical`), not a direction |

The dead `ApiResponse<T>` matters because it is exactly the `{ success: true,
data }` wrapper §8 and §156 warn against. Since nothing consumes it, it carries
no compatibility weight and was not adopted.

---

## 4. Conflicts and how they were resolved

**Error code casing.** BACKEND-03 §11 prefers UPPER_SNAKE_CASE on the wire; the
handoff already specifies lowercase snake_case and lists ten codes. Resolved in
favour of the handoff under §9 — renaming published wire values for style would
be breaking with no product benefit. The UPPER_SNAKE form remains the
*frontend's* mapped representation.

**Validation status.** §29 offers 400 or 422 as a policy choice. The handoff
already answers it: 422. No choice was needed.

**410 Gone.** The status list this command asked to document (§28) omits 410,
but the handoff uses it for expired and cancelled requests. Included, because
collapsing it into 404 would lose a distinction the recipient experience needs.

---

## 5. What was built

`packages/contracts/src/api/`, exported as `@lagda/contracts/api`:

| Module | Contents |
|---|---|
| `errors/` | `ApiErrorSchema`, `ApiErrorDetailSchema`, `ApiErrorCodeSchema`, 13 common codes, `CODE_CATEGORY`, `CATEGORY_HTTP_STATUS`, `MAX_ERROR_DETAILS` |
| `pagination/` | `PageRequestSchema`, `PageMetaSchema`, `PaginatedResponse(itemSchema)`, defaults and limits |
| `sorting/` | `SortOrderSchema`, `sortSchema(keys)`, `SearchQuerySchema`, `TimeRangeFilterSchema` |
| `headers/` | `RequestId`, `IdempotencyKey`, `CsrfToken`, header name constants |

22 schema tests, including the negative cases that matter: unknown properties
rejected on every request schema, `sortBy: "id; DROP TABLE documents"` rejected,
`perPage: 1000000` rejected, an error carrying `stack`/`sql`/`path` rejected,
and a validation detail carrying the submitted value rejected.

Error codes are a **validated string**, not a closed union — domain commands must
add codes without editing the common file, and a client meeting an unrecognised
code should degrade gracefully rather than fail to parse.

---

## 6. Deferred to later commands

- **BACKEND-05** — typed application error architecture. BACKEND-03 defines
  categories and the mapping; the error classes belong with use cases.
- **BACKEND-11** — Fastify wiring: request-ID generation, translating TypeBox
  errors into `ApiErrorDetail`, response-schema serialization, body limits.
- **BACKEND-14** — idempotency storage, fingerprinting, replay.
- **BACKEND-15** — rate-limit behaviour and `Retry-After`.
- Per-endpoint filters, sort whitelists, and sort defaults belong to the
  commands that own those endpoints. §147 forbids inventing them here.

---

## 7. Not decided, deliberately

ETags and optimistic concurrency (§86–87): the handoff requires neither, and
signing-state safety comes from transactions and explicit state checks. Recorded
rather than pre-built.

Response validation in production (§168): schemas are declared, but whether
responses are validated at runtime beyond Fastify's serialization is BACKEND-11's
call.
