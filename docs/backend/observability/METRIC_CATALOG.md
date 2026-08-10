# Metric Catalog — BACKEND-12

**Status: INSTRUMENTED_NO_EXPORTER.** Instrumentation exists and is tested; no
exporter collects it. BACKEND-66 attaches one. Nothing here claims metrics are
being gathered.

Defined in `packages/api/src/observability/metrics.ts`. Names are a closed union,
labels are allowlisted per metric, and both are asserted by test.

## Catalog

| Metric | Type | Labels | Status |
|---|---|---|---|
| `http_requests_total` | counter | `method`, `route`, `statusFamily`, `processRole` | **IMPLEMENTED** |
| `http_request_duration_ms` | histogram | `method`, `route`, `processRole` | **IMPLEMENTED** |
| `http_errors_total` | counter | `method`, `route`, `errorCategory`, `processRole` | **IMPLEMENTED** |
| `application_use_case_duration_ms` | histogram | `useCase`, `result`, `processRole` | **INSTRUMENTED** — no use case has a caller yet |
| `application_errors_total` | counter | `useCase`, `errorCategory`, `processRole` | **INSTRUMENTED** |
| `db_operation_duration_ms` | histogram | `repository`, `operation`, `result`, `processRole` | **PLANNED** — hooks defined, repositories not yet wrapped |
| `db_errors_total` | counter | `repository`, `operation`, `errorCategory`, `processRole` | **PLANNED** |
| `document_seal_duration_ms` | histogram | `sealScheme`, `result`, `processRole` | **PLANNED** — no sealing caller until BACKEND-38 |
| `document_seal_errors_total` | counter | `errorCategory`, `processRole` | **PLANNED** |
| `readiness_check_failures_total` | counter | `dependency`, `processRole` | **PLANNED** |
| `security_events_total` | counter | `securityEvent`, `result`, `processRole` | **PLANNED** — BACKEND-13/15/27 |

"Instrumented, no caller" is stated rather than rounded up to implemented. A
metric nothing emits is the same failure as a field nothing reads.

## Label values are bounded

| Label | Values |
|---|---|
| `method` | the HTTP verbs |
| `route` | Fastify's route **pattern** — `/documents/:documentId` |
| `statusFamily` | `2xx`, `4xx`, `5xx` — three, not six hundred |
| `result` | `success`, `failure` |
| `errorCategory` | the nine application categories |
| `useCase` | names from USE_CASE_CATALOG |
| `repository`, `operation` | class and method names |
| `dependency` | `database`, later `objectStorage`, `queue`, `email` |
| `sealScheme` | `hash-evidence` |
| `processRole` | `api`, `worker`, `migration` |

## Prohibited as labels

```
requestId  workspaceId  userId  documentId  signingRequestId
verificationId  email  ipAddress  recipientId
```

Two reasons, either sufficient. **Cardinality**: a series per tenant per resource
is the textbook explosion that takes a time-series database down. **Privacy**:
metrics are the one telemetry surface that should carry no personal data at all.

An audit test iterates the catalog and asserts none appears. A probe that adds
`workspaceId` to `http_requests_total` makes it fail.

## Dynamic metric names are prohibited

```ts
metrics.increment(`workspace.${workspaceId}.requests`)   // NOT POSSIBLE
```

This is unbounded cardinality expressed as a *name* rather than a label, and a
`name: string` parameter cannot prevent it. That is why `MetricName` is a closed
union — the compiler refuses.

## Route normalization

Fastify supplies the pattern. Where it does not, `normalizeRoute` replaces
identifier-shaped segments with `:id`, so a raw URL never becomes a label.

## Histogram buckets

Not defined. Buckets tuned without traffic are guesses that have to be changed
once real latency is known — BACKEND-66 sets them from measurement.

## No `/metrics` endpoint

None is exposed. The scrape-versus-push decision belongs with the collector, and
an endpoint serving an in-memory registry nothing scrapes would be a public
surface with no consumer (OD-031).

## The in-memory recorder

`createInMemoryMetrics()` exists for tests and local diagnosis. It is bounded by
the name union and label allowlist, but is still unbounded in distinct label
*combinations* and must never become a production store.

## Send (BACKEND-33)

| Metric | Labels |
|---|---|
| `signing_request_send_results_total` | `result`, `routingShape`, `processRole` |

`routingShape` is `parallel`, `sequential` or `mixed` - three bounded values,
derived in the DOMAIN from the recipient set and returned by the use case.

The route does not infer it from the waiting count. A count cannot tell
sequential from mixed, and a label that is wrong on a three-cohort request is
worse than no label.

**Deliberately not labels:** the recipient count, the activated count, the cohort
number, the request id, the workspace id. The first three are unbounded; the
last two would make one time series per document. The counts are in the log
line, where a number is a number rather than a dimension.

**And emphatically never** a credential, a digest or a URL. A metric label is
the most widely replicated string in an observability stack.

Provider delivery metrics - accepted, bounced, failed - belong to BACKEND-45.

## Recipient signing access (BACKEND-34)

| Metric | Labels |
|---|---|
| `signing_access_attempts_total` | `operation`, `result`, `processRole` |

`operation` is one value today (`bootstrap`) and `result` is two
(`success`, `denied`).

**The failure REASON is deliberately not a label.** The public error is
collapsed precisely so a caller cannot distinguish "expired" from "unknown"; a
metric that split them would rebuild that oracle for anyone who can read a
dashboard. The bounded reason is in the log line, which is not public.

Never a request id, a recipient id, a workspace id, a session id, an IP address,
an email or any digest. The first four would make one time series per document
or per signer; an IP is PII; and a digest as a metric label would put a
credential-derived value in the most widely replicated string store in an
observability stack.
