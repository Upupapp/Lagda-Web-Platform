# Observability Test Matrix — BACKEND-12

**43 observability tests + 10 architecture tests.** Every security-relevant row
was verified by deliberately breaking it — a redaction test that cannot fail
proves nothing about redaction.

## Logging

| Test | Result |
|---|---|
| Structured JSON, parsed as fields not text | **PASS** |
| `service`, `processRole`, `environment` on every line | **PASS** |
| Request ID on request lines | **PASS** |
| Request body absent | **PASS** |
| Response body absent | **PASS** |
| Full headers absent | **PASS** |
| Query string absent | **PASS** |
| Full user-agent absent (presence only) | **PASS** |

## Redaction

| Test | Result |
|---|---|
| `Authorization` header | **PASS** |
| Cookie | **PASS** |
| Password — **top level** | **PASS** *(failed before this command)* |
| Password — nested | **PASS** |
| OTP | **PASS** |
| Signing token — **four levels deep** | **PASS** *(failed before this command)* |
| API key | **PASS** |
| Secret inside an error **message** | **PASS** *(failed before this command)* |
| Secret inside an error **cause chain** | **PASS** |
| Secret inside `msg` | **PASS** *(failed before this command)* |
| Secrets inside an array of objects | **PASS** |
| Document/PDF content (binary → size marker) | **PASS** |
| Presigned-URL signature parameter | **PASS** |
| Connection-string credentials | **PASS** |
| Key matching across case and separators | **PASS** |
| Suffix matching (`*Secret`, `*ApiKey`, `*Token`) | **PASS** |
| **Does NOT over-match** `code`, `errorCode`, `statusCode`, `sortKey`, `pageCount` | **PASS** |
| Long string truncated | **PASS** |
| Circular object survives | **PASS** |
| Repeated sibling not mistaken for a cycle | **PASS** |

## Errors

| Test | Result |
|---|---|
| Unexpected 5xx logged with stack | **PASS** |
| Public 500 body carries no stack or credential | **PASS** |
| Expected client error logged at `info`, not `error` | **PASS** |
| Internal error logged at `error` | **PASS** |
| Success not logged at `info` | **PASS** |

## Context

| Test | Result |
|---|---|
| Empty outside any tracked execution | **PASS** |
| Propagates through nested async work | **PASS** |
| **Three concurrent executions do not leak** | **PASS** |
| Does not leak after completion | **PASS** |
| Enrichment does not mutate the parent | **PASS** |
| Preserved across a thrown error | **PASS** |

## Metrics

| Test | Result |
|---|---|
| Catalog contains no prohibited identifier label | **PASS** |
| Every metric name has declared labels | **PASS** |
| Route label normalized, never a raw URL | **PASS** |
| Status collapsed to three families | **PASS** |
| No request ID in emitted labels | **PASS** |
| Failure labelled by category, never by message | **PASS** |
| Duration recorded per request | **PASS** |
| 5xx counted as an http error | **PASS** |

## Instrumentation semantics

| Test | Result |
|---|---|
| Original result returned unchanged | **PASS** |
| **Original error rethrown by identity** | **PASS** |
| Operation name reaches the ambient context | **PASS** |

## Architecture

| Test | Result |
|---|---|
| `core` imports no logging or metrics library | **PASS** |
| `application` imports no logging or metrics library | **PASS** |
| No use-case signature takes a logger | **PASS** |
| No package declares Pino directly | **PASS** |
| **No `@lagda/db` file reads the observability context** | **PASS** |
| Context consumers are an exact named set | **PASS** |
| No migration creates a log/metric/telemetry table | **PASS** |
| Schema declares no telemetry table | **PASS** |
| No `console.*` in any package source | **PASS** |
| Migration runner emits structured records | **PASS** |

## Probes — verified by breaking

| Violation | Result |
|---|---|
| Deep redaction disabled | **7 tests fail** |
| Message-scrubbing hook removed | 1 fails |
| `workspaceId` added as a metric label | 1 fails |
| `observeOperation` swallows the error | 1 fails |
| Baseline | 43/43 pass |

## Not covered

- **No exporter, so no export test.** Metrics are asserted through the in-memory
  recorder. Whether a real collector scrapes correctly is BACKEND-66's.
- **No worker tests.** The worker does not exist.
- **No DB or sealing instrumentation tests.** The hooks are defined; nothing
  wraps a repository or the sealer yet, and a test for an uncalled wrapper
  asserts nothing about production.
- **No log-volume or performance test** for the deep redaction walk under load.
  It is bounded in depth, breadth and string length, but the cost has not been
  measured.
