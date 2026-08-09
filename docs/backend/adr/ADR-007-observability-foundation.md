# ADR-007 — Structured stdout logs, catalog-first metrics, no tracing yet

**Status:** Accepted · **Date:** 2026-08-09 · **Command:** BACKEND-12
**Related:** ADR-006 (evidence), OD-030, OD-031, OD-032

## Context

BACKEND-11 produced a real HTTP process with structured request logs and request
IDs. It left one gap, stated honestly in the enforcement matrix: redaction was
configured and reviewed, but nothing asserted it worked.

BACKEND-12 probed it. Three categories of secret got through — a top-level
`password`, a token nested beyond one level, and a credential inside an error
message. The configuration was weaker than "PARTIALLY ENFORCED" implied.

## Decision

**Pino, structured JSON on stdout, one root configuration.** No second logger,
no vendor SDK.

**Redaction by a bounded deep walk, plus a message scrubber**, because Pino's
path syntax cannot express "any key named `token`, at any depth" and enumerating
paths fails the moment a new log shape appears.

**AsyncLocalStorage for observability context only** — never for authorization or
tenancy.

**Metrics: a typed catalog and a recorder port, with no exporter.** Reported as
INSTRUMENTED_NO_EXPORTER.

**Tracing deferred.** Request ID plus operation context is sufficient correlation
for a modular monolith with two process roles.

**No new production dependency.**

## Alternatives considered

**Enumerate more Pino redact paths.** Rejected: the probe showed the failure is
structural, not a missing entry. Each new log shape would need new paths, and the
gap only surfaces once a secret is already in production logs.

**Thread a logger through application signatures.** Rejected: it puts a Pino type
in `@lagda/application` and makes every use case uncallable from the worker
without one. Wrapping from the outside keeps the layer provider-independent, and
an architecture test asserts no use-case signature takes a logger.

**Install `prom-client` now.** Rejected: a production dependency whose output
nothing collects. Scrape-versus-push belongs with the collector, and BACKEND-66
implements the port against whichever it selects.

**Install OpenTelemetry for future tracing.** Rejected: several packages for a
possibility. The architecture permits adding `traceId` later without replacing
`requestId` — they are different identifiers with different audiences.

**A `@lagda/observability` package.** Rejected for now: one process role uses it.
When the worker exists and genuinely shares the logger factory, redaction rules
and metric catalog, that is the moment to extract it — not before (§135).

**Log to a PostgreSQL table.** Rejected outright. Writing operational logs to the
database on the request path risks recursion during exactly the outage they exist
to explain, and confuses them with evidence, which has entirely different
retention. An architecture test enforces the absence.

## Consequences

**Accepted:** the deep redaction walk runs on every log line. It is bounded in
depth, breadth and string length, and cycle-safe — but its cost under load has
not been measured. Recorded as a risk.

**Accepted:** suffix matching can over-redact a field like `csrfTokenPresent`.
The alternative — an exact list — misses every secret field nobody has invented
yet. A test pins the fields that must survive.

**Accepted:** metrics exist and collect nothing. Stated as
INSTRUMENTED_NO_EXPORTER rather than implied to be live.

**Enabled:** BACKEND-66 attaches an exporter, an aggregator and alerts against a
catalog that already exists, without touching instrumented code.

**Enabled:** BACKEND-13's security telemetry has a defined shape, a catalog entry
and a redaction guarantee before the first session token exists.

## What would trigger revisiting this

- A second process role sharing this code — extract the package then.
- Measured redaction cost that matters under load.
- A vendor whose own instrumentation is cheaper than the port.
- A tracing requirement, which adds `traceId` alongside `requestId` rather than
  replacing it.
