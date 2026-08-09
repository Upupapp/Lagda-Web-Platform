# Observability Foundation Report — BACKEND-12

## 1. What was built

| Artifact | Location |
|---|---|
| Deep redaction + message scrubbing | `packages/api/src/logging/redaction.ts` |
| Logger configuration | `packages/api/src/logging/index.ts` |
| Log-capture harness | `packages/api/src/logging/testing.ts` |
| Observability context (AsyncLocalStorage) | `packages/api/src/observability/context.ts` |
| Metric catalog + recorder port | `packages/api/src/observability/metrics.ts` |
| Operation instrumentation | `packages/api/src/observability/observe.ts` |
| Tests (43) | `packages/api/src/observability.test.ts` |
| Architecture tests (10) | `tests/architecture/observability.test.ts` |
| Structured migration logs | `infra/migrate.ts` |

**No new production dependency.** Pino arrives with Fastify; the metrics port has
no vendor type.

## 2. The finding this command exists for

BACKEND-11 marked log redaction **PARTIALLY ENFORCED** and handed the assertion
work here. Building the harness showed the configuration was weaker than that
label implied — three categories of secret reached the output:

| Case | Why it leaked |
|---|---|
| `{ password: "…" }` | `*.password` does **not** match a top-level key |
| `{ a: { b: { c: { token } } } }` | `*.token` matches exactly **one** level |
| `new Error("postgres://u:pw@h")` | a secret in a **message** is not a field at all |

Worse, Fastify sets `msg` to `error.message` when logging an unhandled error, so
the credential was published in the message field while the object was clean.

Pino's path syntax cannot express "any key named `token`, at any depth", and
enumerating paths fails on the next new log shape. Replaced with a bounded deep
walk (`formatters.log`) plus a message scrubber (`hooks.logMethod`).

**The lesson generalises**: "configured and reviewed" is not enforcement. The
matrix said so honestly, and building the test is what turned an honest label
into a fixed defect.

## 3. Other defects found

### 3.1 The log serializer could throw — and tests could not see it

The `req` serializer read `request.headers["user-agent"]` unguarded. Fastify
passes different shapes at different log sites; at `incomingRequest` the object
had no `headers`, so the serializer **threw inside the logger** and failed the
request.

It survived BACKEND-11 because the test configuration runs at `LOG_LEVEL=silent`
— serializers never executed. Every logging test in that command was passing over
code that never ran.

Now defensive about its input, with a `raw` fallback.

### 3.2 `req.url` was silently empty

The same shape mismatch meant `method` and `url` were undefined, so every request
line carried `"url":""`. It looked like a working log.

### 3.3 The migration runner produced unfilterable output

`[migrate] applied 003_x` — text no aggregator can query, for the process whose
failures someone searches for at 3am. Converted to structured records with
`service`, `processRole: "migration"` and `event`, and verified against a live
database.

## 4. Decisions

**AsyncLocalStorage: USE, for observability only.** The alternative put a Pino
type in `@lagda/application` and made every use case uncallable from the worker
without one. The safety test: *if this store vanished, no query would change
behaviour and no permission would change answer.* An architecture test asserts no
`@lagda/db` file reads it, and names the three files that may.

**Metrics: catalog and port, no exporter (§74 option B).** `prom-client` today
would be a production dependency whose output nothing collects. Metric names are
a **closed union** so a per-tenant dynamic name is not expressible.

**Tracing: deferred.** `requestId` and `traceId` are different identifiers with
different audiences; adding one later does not replace the other.

**No `@lagda/observability` package.** One process role uses this. Extract when
the worker genuinely shares it, not before.

## 5. Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | **312 passed** (was 259) |
| `npm run build` | PASS |
| `npm run test:integration` | **95 passed** |
| Migration runner, live database | PASS — structured output verified |

### Probes

| Violation | Result |
|---|---|
| Deep redaction disabled | **7 tests fail** |
| Message-scrubbing hook removed | 1 fails |
| `workspaceId` added as a metric label | 1 fails |
| `observeOperation` swallows the error | 1 fails |
| Baseline | 43/43 pass |

## 6. Risks

**R-1 — Redaction cost is unmeasured.** The walk runs on every log line. It is
bounded in depth (8), breadth (100 keys / 50 items) and string length (2 KiB),
and is cycle-safe — but the per-line cost under load has not been measured.
BACKEND-61 should measure it.

**R-2 — Suffix matching can over-redact.** `csrfTokenPresent: true` would be
redacted by the `*token` rule. The alternative — an exact list — misses every
secret field nobody has invented yet. Nine diagnostic fields are pinned by test;
the trade is deliberate.

**R-3 — Nothing collects a metric.** INSTRUMENTED_NO_EXPORTER, stated rather than
implied.

**R-4 — DB and sealing instrumentation are hooks, not wiring.** No repository is
wrapped and no sealing call exists. A wrapper for an uncalled operation would be
code nothing executes.

**R-5 — Security events are all PLANNED.** None of those features exists.

**R-6 — Logs are in privacy scope and no vendor is chosen (OD-030).** They carry
`userId`, `workspaceId` and, in security flows, IP. Any aggregator is a
processor.

**R-7 — Duplicate request lines are intentional.** Fastify emits both `incoming
request` and `request completed`. Kept: the pair is what reveals a request that
started and never finished, which a completion-only model cannot express. It
doubles request log volume, and BACKEND-66 may sample.

## 7. BACKEND-13 handoff — Session & CSRF Security

**Available now:**

- One correlation ID across response header, error body and every log line.
- `withAddedContext({ userId, workspaceId, actorType })` — call it once the
  session resolves, and every subsequent log line carries the actor. It is
  **logging only**; authorization must read the resolved session directly
  (INV-135).
- Redaction already covers `cookie`, `set-cookie`, `authorization`,
  `x-csrf-token`, `sessionToken`, `sessionSecret`, `resetToken`, and anything
  ending `token`/`secret`. A new session field is covered by suffix rule on
  arrival.
- `security_events_total` with a `securityEvent` label, and catalog entries for
  `session_created`, `session_revoked`, `csrf_rejected`,
  `authentication_failed`.
- `@fastify/cors` already allows `X-CSRF-Token` and sets `credentials: true`.

**Required of BACKEND-13:**

1. **Never log a session token, CSRF token or password** — including the
   *expected* value in a mismatch. Log the outcome, not the comparands.
2. Emit `security.session_created` / `security.session_revoked` /
   `security.csrf_rejected` with `userId` and `requestId`, never the credential.
3. Authentication failures log at `info` with a security event, not at `error` —
   a wrong password is not a server incident. Detection of *repeated* failure is
   an aggregate concern (BACKEND-15).
4. Enrich the observability context immediately after session resolution, using
   `withAddedContext`, so every later line in the request carries the actor.
5. Register cookie/session plugins inside an **encapsulated** scope so public
   routes stay public — the insertion point is documented in API_BOOTSTRAP.
6. **OD-028 blocks cookie attributes.** Same-origin versus subdomain deployment
   determines `SameSite`, domain and whether CORS credentials are needed at all.

**Readiness: READY.** Security events can be emitted safely, secrets are provably
redacted, actor context can be attached without touching application signatures,
and no blocker exists — except that OD-028 must be answered before cookie
attributes are finalized, which is a product/deployment decision rather than a
code one.
