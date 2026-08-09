# Error Mapping

One envelope, one mapper, one place a status code is decided.

## The pipeline

```
throw
  ↓
Fastify error handler
  ├─ error.validation present?       → validationFailed(details)  → 422
  ├─ recognised Fastify error CODE?  → HttpError                  → 400 / 413 / 415
  ├─ ApplicationError?               → category lookup            → 401…503
  └─ anything else                   → generic internal           → 500
  ↓
mapError(error, requestId)   ← the ONLY builder of an error body
  ↓
{ "error": { "code", "message", "details"?, "requestId" } }
```

**Nothing reads an error message to decide.** `message.includes("not found")` is
how mapping silently breaks when someone improves the copy. Branching is on
`instanceof`, on `error.validation`, and on Fastify's `error.code`.

## Categories

| Application category | Status | Logged at |
|---|---|---|
| `validation` | **422** | info |
| `authentication` | 401 | info |
| `authorization` | 403 | info |
| `not-found` | 404 | info |
| `gone` | **410** | info |
| `conflict` | 409 | info |
| `rate-limit` | 429 | info |
| `dependency-unavailable` | 503 | error |
| `internal` | 500 | error |

The map is an explicit **total** `Record<ApplicationErrorCategory,
ApiErrorCategory>`, not a cast. Adding a category to either side fails the build
rather than silently mapping to 500.

That is not hypothetical. It is what caught BACKEND-05's application categories
missing `gone` and `rate-limit` while their own comment claimed to match the API
conventions. `gone` mattered: API_CONVENTIONS states an expired signing request
"is not 'not found' — the recipient screen needs the difference to explain what
happened", and without the category the required 410 was unreachable from the
application layer.

## HTTP-layer errors

| Condition | Status | Why not something else |
|---|---|---|
| Malformed JSON | **400** | The request could not be interpreted at all. 422 means valid JSON, invalid content. |
| Wrong content type | 415 | |
| Body over the limit | 413 | |
| Unknown route | 404 | Canonical envelope, never Fastify's default |
| Schema validation | 422 | Handoff §26 maps `validation_error → 422` |

## Validation details

Ajv's error objects are a library shape. They are translated, never returned: a
validator upgrade must not become a breaking API change, and clients must not end
up parsing `"must have required property 'email'"`.

- Field paths become `recipients[0].email` — dotted, with bracketed indices.
- `additionalProperties` and `required` are reported against the **offending
  property**, not its parent. Ajv points `instancePath` at the container, so
  without this a client is told "unknown field" with an empty field path.
- Messages are LAGDA's own wording and **never echo the submitted value**. Ajv's
  sometimes do, and a rejected password in an error body ends up in the client's
  error reporting.
- Constraint values render only when primitive. `String(unknown)` on an object
  gives `[object Object]`, and "Must be at least [object Object] characters" is a
  message that reached a user. ESLint caught this one.
- At most 25 details.

A test asserts no validator internals (`instancePath`, `schemaPath`, `keyword`,
`ajv`) appear in a response.

## Internal errors

The client receives:

```json
{ "error": { "code": "internal_error",
             "message": "An unexpected error occurred. Please try again.",
             "requestId": "req_…" } }
```

Identical for every cause. No stack, no SQL, no file path, no library message —
the envelope has no field to put one in.

The **log** gets everything: the error, its stack, its cause, the route, and the
same request ID. That is the trade — the client gets a correlation key, support
gets the detail.

A test throws an error whose message contains
`postgres://lagda:hunter2@10.0.0.5/lagda` and asserts none of it reaches the
response. Deliberately violating the mapper makes that test fail, which is how we
know it is doing work.

An `ApplicationError` categorised `internal` also gets the generic body — its
message was written for developers.

## Logging severity

4xx is **info**. A client sending a malformed body is not a server incident, and
alerting on 404s trains people to ignore alerts.

5xx is **error**, with the full cause.

Health and readiness are registered at `logLevel: "warn"` so probes running every
few seconds do not bury real traffic. Failures still surface: the error handler
logs independently of the route's level.

## Anti-enumeration

Sign-in, recovery, OTP and signing access will deliberately collapse distinct
internal reasons into one public response. The mapper supports this — a use case
returns whichever error it wants published, and nothing here forces an internal
distinction to become a distinct public code.

## What must not be added

- A second envelope. `reply.send(error)` anywhere is a bug.
- Status codes chosen in route handlers.
- Branching on error text. Add a category or a code instead.
