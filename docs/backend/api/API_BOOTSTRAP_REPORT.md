# API Bootstrap Report — BACKEND-11

## 1. What exists now

A real Fastify process that starts, serves, and shuts down cleanly — with **no
product endpoints**. Verified by running the compiled output, not only by tests.

```
packages/api/src/
  app/create-app.ts      Fastify factory — does not listen, does not ready
  app/dependencies.ts    typed dependency object (may import @lagda/db)
  config/index.ts        the only reader of process.env
  context/index.ts       observed request metadata, with provenance
  errors/index.ts        the single error-envelope builder
  errors/validation.ts   Ajv → canonical details
  logging/index.ts       Pino options, redaction, serializer allowlists
  routes/health.ts       liveness — no database
  routes/readiness.ts    readiness — database via a narrow port
  server/start-server.ts config → infra → app → listen → signals
  server/shutdown.ts     idempotent, bounded, ordered
  server/main.ts         the executable
  index.ts               re-exports only
```

## 2. Dependencies added

| Package | Version | Runtime | Why |
|---|---|---|---|
| `fastify` | 5.11.3 | production | The HTTP server, decided in BACKEND-00 |
| `@fastify/helmet` | 13.1.0 | production | Security headers. Hand-rolling a dozen headers is how one silently regresses |
| `@fastify/cors` | 11.3.0 | production | CORS with an exact-match function. Hand-rolled preflight handling is a common source of holes |
| `@fastify/type-provider-typebox` | 6.1.0 | production | Makes route schemas from `@lagda/contracts` produce TypeScript types **and** runtime validation from one definition, per BACKEND-02 |
| `@fastify/swagger` | 9.8.1 | production | OpenAPI **generation** from route schemas. No UI plugin, no exposed route |
| `tsx` | latest | dev | `npm run dev:api`. Already the repository's TypeScript runner |

**Not installed**, deliberately: Express, Koa, NestJS, Hapi, Supertest (Fastify's
`inject()` suffices), any DI container, `@fastify/rate-limit` (BACKEND-15),
`@fastify/multipart` (BACKEND-18), `@fastify/cookie` (BACKEND-13),
`@fastify/compress`, `@fastify/swagger-ui`. An architecture test asserts none of
them appear.

Pino comes with Fastify; no separate install.

## 3. Decisions worth arguing about

**`createApp` does not call `ready()`.** Readying seals the instance, and a
sealed app cannot have routes added — which would make the factory untestable for
the cases most worth testing (strict validation, response stripping, error
mapping) without inventing product endpoints to probe. `inject()` and `listen()`
ready it themselves.

**`TRUST_PROXY=true` is rejected, not defaulted away from.** There is no
deployment where "believe the whole X-Forwarded-For chain" is the considered
answer, so accepting it would only ever record a mistake.

**CORS is registered only when origins are configured.** An empty list would emit
headers allowing nothing, which reads as misconfiguration rather than an
intentional same-origin deployment.

**OpenAPI generation without exposure.** The document is built from route schemas
on demand; no HTTP route serves it. Publishing is OD-029, and deferring costs
nothing.

**Helmet's CSP and HSTS are off.** This process serves JSON, never HTML — a CSP
governs what a *document* may load and there is no document. HSTS belongs at the
TLS-terminating proxy; setting it here would have the API asserting a transport
guarantee it does not provide.

## 4. Defects found

### 4.1 Application error categories were missing `gone` and `rate-limit`

BACKEND-05 declared seven categories with a comment saying they matched the API
conventions. The API contract has nine.

`gone` was the one that mattered. API_CONVENTIONS states an expired signing
request "is not 'not found' — the recipient screen needs the difference to
explain what happened". With no `gone` category, a use case could only report
`not-found` or `conflict`, and the 410 the conventions require was **unreachable
from the application layer**.

Caught because the boundary map is written as an explicit total
`Record<ApplicationErrorCategory, ApiErrorCategory>` rather than a cast. Both
categories added.

### 4.2 Two Fastify options were deprecated and removed in v6

`requestIdLogLabel` and `disableRequestLogging` emitted deprecation warnings on
every boot. Both removed: request logging is on by default, and the Pino
serializer emits `requestId` explicitly, so consumers see the canonical name
regardless. `logController` was not adopted — it demands implementing ten members
to override one label.

### 4.3 The shared error schema was emitted as `def-0`

`@fastify/swagger` renames `$id`-registered schemas unless a `refResolver` says
otherwise. Every generated client would have produced a type called `Def0`. Found
by printing the document rather than trusting the registration.

### 4.4 An architecture test was broader than its invariant

BACKEND-09's test asserted `node:crypto` appears in exactly one file. INV-080 is
about **hashing**; request-ID generation legitimately uses `randomUUID`.

Narrowed to `createHash` — the actual concern — rather than adding an allowlist,
which would have loosened the rule instead of correcting it.

### 4.5 My own entry-point test was a brittle line-shape heuristic

The first version classified lines and broke on multi-line export blocks. The
tempting fix was to keep loosening it until it passed. Replaced with a check of
the real property: no call expression at statement position.

### 4.6 `String(unknown)` would have printed `[object Object]` to a user

ESLint caught it. `Must be at least ${params.limit}` renders an object as
`[object Object]` — a message that would have reached a user in a validation
error, and a log line whose cause was the one useful field.

## 5. Gates

| Gate | Result |
|---|---|
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm test` | **259 passed** (was 204) |
| `npm run test:integration` | **95 passed** |
| Migration from zero | PASS (unchanged) |
| Live process | **PASS** — see below |

### Live verification

The compiled server was started against real PostgreSQL and exercised:

- `GET /health` → 200 with helmet headers (`nosniff`, `X-Frame-Options`,
  `Referrer-Policy`, COOP/CORP)
- `GET /ready` → 200 `{"status":"ready"}`
- `GET /documents` → the canonical JSON envelope, `not_found`, with a request ID
- Structured JSON logs, the **same** request ID on the response and both log
  lines
- SIGTERM → exited cleanly

A green build is not a running server; this is the difference.

### Probes — every security claim verified by breaking it

| Violation introduced | Result |
|---|---|
| `removeAdditional: true` (strip unknown fields) | 1 test fails |
| Trust the whole proxy chain | 1 fails |
| Substring CORS matching | 1 fails |
| Adopt the client's `request-id` header | 1 fails |
| Return `error.message` in a 500 | 2 fail |
| Executable call in the entry point | 2 fail |
| `import "fastify"` in `@lagda/application` | 1 fails |
| `createHash` outside sealing | 1 fails |
| 9 route-import probes (6 block, 3 allow) | all correct |

## 6. Risks

**R-1 — Log redaction is configured but unverified.** The paths are set and
bodies are never serialized at all, but nothing asserts a log line containing a
cookie comes out without it. That needs a log-capture harness — BACKEND-12's.

**R-2 — Production proxy topology is unknown (OD-027).** The architecture is
default-deny and `true` is rejected, so the failure mode is a useless IP rather
than a false one. Forwarded IP must not be called evidence until BACKEND-65
verifies the topology end to end.

**R-3 — Same-origin vs subdomain is undecided (OD-028).** It constrains
BACKEND-13's cookie attributes. Nothing is hardcoded either way.

**R-4 — Response-schema coverage is per-file, not conceptual.** The count test
fails a new route with no schema; it cannot check the schema is *correct*.

**R-5 — No route yet exercises the application layer.** Error mapping for
`ApplicationError` is unit-tested through the mapper, but no HTTP route has ever
invoked a use case. The first feature command is where that integration is
proven.

**R-6 — Two pre-read documents named in the command do not exist.**
`api/ERROR_TAXONOMY.md` and `evidence/VERIFICATION_MODEL.md` were never created;
their content lives in API_CONVENTIONS §3 and EVIDENCE_ARCHITECTURE §10 plus
EVIDENCE_DATA_CLASSIFICATION. Recorded so a later command does not assume a
missing file means missing work.

## 7. BACKEND-12 handoff — Logging, Errors & Observability

**Already in place:** structured Pino JSON via Fastify; one server-generated
request ID on every response, in every error body, and in every log line;
explicit serializer allowlists (`req`, `res`, `err`); redaction with
`remove: true`; no body serializer at all; 4xx logged at info and 5xx at error
with stack and cause; health/readiness at `logLevel: "warn"`.

**What BACKEND-12 must build:**

1. **Assert redaction.** Capture log output and prove a cookie, an
   `Authorization` header and a CSRF token never appear. This is the largest gap
   in the matrix and it is yours.
2. **Enrich context after BACKEND-13.** `workspaceId`, `userId` and the use-case
   name belong in the log line once resolved. Keep cardinality bounded — no
   document IDs, no free-form input.
3. **Correlate across boundaries.** The request ID must reach application, DB and
   worker logs. The worker has no HTTP request, so it needs an equivalent
   correlation key, and the two must be distinguishable.
4. **Error telemetry.** Sentry or equivalent for unexpected 5xx, using the same
   request ID. It must never receive request bodies — the same reason they are
   not logged.
5. **Metrics.** p50/p95/p99 per route, error rate, readiness failures. Handoff
   §31 asks for exactly these plus alerting at error rate > 1% and p95 > 500ms.
6. **Never let logs become a second evidence store.** Evidence lives in
   `evidence_events` with its own retention and immutability. Logs rotate. INV-011
   exists for this and BACKEND-12 is where it is most tempting to break.

**Readiness:** the repository is ready for BACKEND-12. There is a real HTTP
process with structured logs and a working correlation ID, and no blocker.
