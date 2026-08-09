# Observability Architecture — BACKEND-12

## 1. Three concerns, kept apart

| | What it is | Retention | May contain |
|---|---|---|---|
| **Logs** | Operational diagnosis | Rotated, shipped, sampled | Safe identifiers, error detail |
| **Metrics** | Aggregate behaviour | Downsampled over time | **No** identifiers at all |
| **Evidence** | Business history | Append-only, policy-governed | Signing facts (BACKEND-10) |

The separation is the architecture. Everything below follows from it.

## 2. Logs are not evidence

Pino logs rotate, get sampled, and may be shipped to a third party. Evidence
records are append-only rows the runtime role cannot update or delete.

**An evidence requirement is never satisfied by logging it**, and the reverse
holds too: stack traces, SQLSTATE, retry counts and memory figures do not belong
in `evidence_events` because they help a developer.

Enforced structurally — an architecture test asserts no migration creates an
`application_logs`, `request_logs` or `telemetry` table, and that the schema
declares none.

## 3. Logger

Pino, through Fastify. One root configuration in
`packages/api/src/logging/index.ts`; no package instantiates its own.

Every line carries `service: "lagda-backend"`, `processRole`
(`api` | `worker` | `migration` | `test`) and `environment`. Packages are
modules, not services — nothing logs `service: "@lagda/db"`.

Production is JSON on stdout. Shipping is a deployment concern, and no request
ever waits on a logging vendor.

## 4. Context propagation — AsyncLocalStorage, **for logging only**

**Decision: USE.** The alternative was threading a logger through every
application signature, which would put a Pino type in `@lagda/application` and
make every use case uncallable from the worker without one.

The constraint that makes it safe:

> **If this store vanished, no query would change behaviour and no permission
> would change answer — only the logs would get less useful.**

`workspaceId` here exists so a log line can say which tenant a request concerned.
Data access takes its workspace from the unit of work, which *binds* scope rather
than accepting it (INV-063); RLS reads the transaction-local setting. An
architecture test asserts no `@lagda/db` file reads the store, and names the
three files that may.

Context is **immutable**. `withAddedContext` derives a child; a shared mutable
object would leak one request's workspace into another's log line under
concurrency. A test runs three overlapping requests with different delays and
asserts each sees only its own ID.

## 5. Redaction — what actually holds

BACKEND-11 configured Pino's `redact` paths. BACKEND-12 probed them, and three
things got through:

| Case | Why |
|---|---|
| `{ password: "…" }` | `*.password` does **not** match a top-level key |
| `{ a: { b: { c: { token } } } }` | `*.token` matches **one** level, not any depth |
| `new Error("postgres://u:pw@h")` | a secret in a **message** is not a field |

Pino's path syntax cannot express "any key named `token`, at any depth", and
enumerating paths fails the moment a new shape appears. So:

1. **A deep walk** in `formatters.log` — recursive, key-name based, array-aware,
   bounded in depth (8), breadth (100 keys / 50 items), string length (2 KiB),
   and cycle-safe.
2. **A message scrubber** in `hooks.logMethod` — Fastify sets `msg` to
   `error.message` when logging an unhandled error, and a driver message
   routinely embeds the connection string.
3. **Binary becomes a size marker.** A `Uint8Array` logs as `[binary N bytes]`,
   never as content.
4. The original path list is kept as a cheap first pass.

Key matching normalizes case and separators, so `set-cookie`, `setCookie` and
`set_cookie` are one rule. Suffix rules (`*password`, `*secret`, `*token`,
`*apikey`, `*privatekey`) cover fields nobody has invented yet.

**Deliberately not over-broad.** `code`, `errorCode`, `statusCode`, `sortKey`,
`pageCount` and `sealScheme` are asserted to survive — over-broad redaction
destroys the logs it was meant to protect, and `errorCode` is what every future
alert depends on.

See [LOG_DATA_CLASSIFICATION.md](./LOG_DATA_CLASSIFICATION.md).

## 6. Request logging

Fastify emits `incoming request` and `request completed`. Both are kept: the
pair is what shows a request that *started and never finished*, which a
completion-only model cannot express.

Fields: `requestId`, `method`, path, `statusCode`, `responseTime`.

**Never**: request body, response body, headers, query string, full user-agent.
The `req` serializer is an explicit allowlist — Pino's default includes every
header, and a default that logs everything is one new header away from logging a
credential.

The user-agent records only `userAgentPresent: true`. It is high-cardinality and
identifying (§61), and its absence is the operationally interesting case.

Health and readiness routes are registered at `logLevel: "warn"`, so probes every
few seconds do not bury real traffic. Failures still log — the error handler is
independent of the route's level.

## 7. Error telemetry

| Situation | Level | Carries the error object |
|---|---|---|
| Validation, 404, 409, 401, 403 | `info` | **No** — the message may name a resource |
| Dependency unavailable | `error` | Yes |
| Unexpected / internal | `error` | Yes, with stack and cause |
| Startup or fatal | `fatal` | Yes, then terminate |

A mistyped email is not a production incident. Alerting on 404s trains people to
ignore alerts.

Server logs carry the stack; **public responses never do** — BACKEND-11's
guarantee, re-asserted by a test here because observability is exactly where it
would be eroded.

## 8. Operation instrumentation

`observeOperation` wraps a use case from the **outside**, at composition, so
`@lagda/application` keeps no logger and no metrics dependency.

It records duration (monotonic `performance.now()`, not wall-clock subtraction),
result, and error **category** — never inputs, never results, never the message.

**It rethrows the original error, unchanged.** A wrapper that swallows a failure
to log it has converted an outage into a silent wrong answer. A test asserts
identity (`rejects.toBe(original)`), and a probe that replaces the rethrow with a
return makes it fail.

Success logs at `debug`, not `info`: one info line per successful use case is
volume without information once metrics exist.

## 9. Metrics — instrumented, no exporter

Names are a **closed union**, not strings. A `record(name: string)` API permits
`increment(\`workspace.${id}.requests\`)` — unbounded cardinality expressed as a
name instead of a label, which a string parameter cannot prevent and a union can.

Labels are allowlisted per metric and are all bounded: method, normalized route,
status family, use-case name, error category, repository, process role.

**Prohibited as labels**: `requestId`, `workspaceId`, `userId`, `documentId`,
`signingRequestId`, `verificationId`, `email`, `ipAddress`. Each is unbounded —
one series per tenant per resource is the textbook cardinality explosion — and
each is PII or PII-linked. Metrics are the one surface that should carry none.
An audit test asserts the catalog contains none of them.

See [METRIC_CATALOG.md](./METRIC_CATALOG.md). Status:
**INSTRUMENTED_NO_EXPORTER**. Nothing claims collection is happening.

## 10. Tracing — deferred

Request ID plus structured operation context is sufficient correlation for a
modular monolith with two process roles.

`requestId` and `traceId` are **different things** and must not share a name:

- `requestId` — LAGDA's correlation identifier, in the response header and every
  error body. Client-visible.
- `traceId` — a future telemetry system's distributed trace. Internal.

Adding one later does not replace the other. No OpenTelemetry packages are
installed for a possibility.

## 11. Failure policy

| Failure | Behaviour |
|---|---|
| Root logger cannot initialize at startup | **Fatal.** Never fall back to unstructured console output |
| A metric emission fails | Must not fail the business operation |
| Log shipping unavailable | Irrelevant to the request path — stdout first |

Observability never changes a transaction boundary, and never writes to
PostgreSQL on the request path.

## 12. Process roles

`api` today. `migration` now emits structured records too — it previously wrote
`[migrate] applied 003_x`, which no aggregator can filter on and which is exactly
what someone searches for during an incident. `worker` inherits all of this
(BACKEND-16); `test` exists so suites do not pollute output.

## The worker process role (BACKEND-16)

`processRole` now has a third value: `"api"`, `"migration"`, `"worker"`.

The worker emits the same structured JSON envelope — `level`, `time`, `service`,
`processRole`, `event` — so a job failure is findable next to the request that
caused it. It writes those fields directly rather than importing `@lagda/api`,
because the worker may not depend on the HTTP package (INV-190). The duplication
is a few lines; the coupling would not be.

### Worker events

| Event | Level | Fields |
|---|---|---|
| `worker.started` | info | `jobTypes`, `schedulesEnabled` |
| `worker.stopping` / `worker.stopped` | info | — |
| `worker.signal` | info | `signal` |
| `worker.queue_error` | error | `error` |
| `worker.start_failed` | fatal | `error` |
| `worker.stop_failed` | error | `error` |
| `worker.job_completed` | info | `jobId`, `jobType`, `attempt`, `durationMs`, `result`, plus the handler's result shape |
| `worker.job_failed` | error | as above, plus `errorCategory` (`terminal` \| `retryable`) and `error` |

`job.data` is never logged — only the result shape. A payload may carry resource
identifiers, and a full dump is how those reach log aggregation (INV-198).

### Two honest gaps

**No metrics.** `MetricName` is a closed union in `@lagda/api`, which the worker
cannot import. Job duration, attempts and failures exist as log fields only. The
vocabulary has to move somewhere both roles reach, or the worker declares its own
(OD-043).

**No redaction.** The deep redactor and `scrubSecretsFromText()` built in
BACKEND-12 are not applied to worker output, for the same import reason. Nothing
leaks today because no payload is logged, but `error` carries an exception
message and a handler that interpolates a payload value into one would leak it
with nothing to stop it (OD-049).

## Object storage signals (BACKEND-17)

Safe to record for a storage operation: `operation` (`put` / `get` / `head` /
`delete`), `durationMs`, `byteSize`, `result`, `errorCategory`, `storageZone`,
and the provider request id on failure — which is what a provider support ticket
needs.

Never: a signed URL, an access key, a secret key, an `Authorization` header, a
response body, or any decoded document content. Byte count is a numeric
observation, not a label.

Suggested bounded metrics, when an exporter exists:
`storage_operations_total`, `storage_operation_duration_ms`,
`storage_bytes_transferred_total`, `storage_failures_total` — labelled by
`operation`, `result` and `zone` only. Never by artifact or workspace id, which
are unbounded.

Alert signals for the catalog: storage failure rate, timeout spike,
access-denied or configuration errors (usually a credential or bucket problem,
not load), and **integrity mismatch, which is high severity** — it means stored
bytes no longer match what LAGDA recorded about them.

**Not wired.** BACKEND-17 adds no instrumentation, because no route or job
performs a storage operation yet. The adapter itself logs nothing; operational
logging belongs at the composition boundary that calls it, which does not exist
until BACKEND-18.

## Upload signals (BACKEND-18)

Events the upload path should emit once it is wired to a product route:
`upload.accepted`, `upload.rejected`, `upload.malware_detected`,
`upload.scan_failed`, `upload.integrity_failed`.

Safe fields: `requestId`, `workspaceId`, `userId`, `uploadId`, `artifactId`,
`result`, `reason`, `byteSize`, `detectedMediaType`, `durationMs`,
`scanOutcome`. Internally also the malware signature name — never to a client.

**Never**: document bytes in any encoding, the malware payload, the original
filename, the quarantine key, storage credentials, or the scanner's raw reply.

Metrics: `upload_requests_total`, `upload_bytes_total`,
`upload_processing_duration_ms`, `upload_rejections_total`,
`malware_scan_duration_ms`, `malware_scan_results_total`. Labels limited to
`result`, `reason`, `detected_type`, `scan_outcome` — never workspace, user,
artifact, filename, digest or IP, all of which are unbounded.

Alert signals: a malware-detection spike, scanner unavailability, stale scanner
signatures where the engine exposes them, and **integrity mismatch, which is high
severity** — it means stored bytes stopped matching what LAGDA recorded. An
ordinary unsupported-file rejection must not page anyone.

**Not wired.** BACKEND-18 adds no log statement or metric to the upload path,
because the route is test-only. There is consequently no redaction test here —
there is nothing logged to redact, and asserting otherwise would be the kind of
claim this project keeps deleting.
