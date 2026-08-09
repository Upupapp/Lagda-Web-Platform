# Alert Signal Catalog — BACKEND-12

Conditions that *should* be alertable. **This is not alert configuration** —
thresholds, routing and paging are BACKEND-66's, informed by real traffic.

Severity is operational guidance: `IMMEDIATE` (wake someone), `HIGH` (same
business day), `MEDIUM` (triage), `INFORMATIONAL` (dashboard only).

| Signal | Severity | Source | Status |
|---|---|---|---|
| Sustained readiness failure | **IMMEDIATE** | `readiness_check_failures_total`, 503 on `/ready` | SIGNAL_AVAILABLE |
| Database unreachable | **IMMEDIATE** | `dependency=database` error logs, readiness | SIGNAL_AVAILABLE |
| Sustained 5xx rate increase | **IMMEDIATE** | `http_errors_total` / `http_requests_total` | SIGNAL_AVAILABLE |
| Migration failure | **IMMEDIATE** | `event=migration.failed`, non-zero exit | SIGNAL_AVAILABLE |
| Fatal startup failure | **IMMEDIATE** | `fatal` level, process exit ≠ 0 | SIGNAL_AVAILABLE |
| Database connection pool exhaustion | HIGH | pool gauges | SIGNAL_PLANNED — driver hooks not yet wired |
| API latency spike (p95) | HIGH | `http_request_duration_ms` | SIGNAL_AVAILABLE |
| Database latency spike | HIGH | `db_operation_duration_ms` | SIGNAL_PLANNED |
| Document sealing failure rate | HIGH | `document_seal_errors_total` | SIGNAL_PLANNED — no caller until BACKEND-38 |
| Document sealing latency spike | MEDIUM | `document_seal_duration_ms` | SIGNAL_PLANNED |
| Worker queue depth growing | HIGH | queue gauges | SIGNAL_PLANNED — BACKEND-16 |
| Worker dead-letter growth | HIGH | queue counters | SIGNAL_PLANNED — BACKEND-16 |
| Email delivery failure rate | HIGH | `dependency=email` | SIGNAL_PLANNED — BACKEND-44 |
| Storage failure rate | HIGH | `dependency=objectStorage` | SIGNAL_PLANNED — BACKEND-17 |
| Authentication failure rate anomaly | MEDIUM | `security_events_total` | SIGNAL_PLANNED — BACKEND-19 |
| Authorization denial spike | MEDIUM | `security_events_total` | SIGNAL_PLANNED — BACKEND-27 |
| Rate-limit trigger volume | INFORMATIONAL | `security_events_total` | SIGNAL_PLANNED — BACKEND-15 |
| CORS rejection volume | INFORMATIONAL | request logs | SIGNAL_AVAILABLE |

Handoff §31 already names two thresholds — error rate above 1%, p95 above 500ms.
They are recorded as the starting point, not as configured alerts.

## What must NOT page anyone

**A single client error.** An ordinary 400, 404, 409 or 422 is a client telling
the server something the server expected. Paging on those trains people to
ignore pages, which is worse than having none.

**A single failed probe.** Transient. Sustained failure is the signal.

**One slow request.** Latency alerts read percentiles over a window.

## Alerts are built on structured fields

Never on free-text log matching. `event`, `securityEvent`, `errorCategory`,
`errorCode` and `dependency` exist so an alert survives someone improving a
message. A rule matching `msg` prose is a rule that breaks silently.

`event` and `errorCode` are distinct and must not be conflated: `event` is an
operational occurrence, `errorCode` is a specific application failure.
