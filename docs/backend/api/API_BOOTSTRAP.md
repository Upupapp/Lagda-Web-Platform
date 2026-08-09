# API Bootstrap

## Two functions, deliberately separate

```
createApp({ config, dependencies })    builds a Fastify instance. Does NOT listen.
startServer()                          reads env → builds infra → creates app → listens
```

`createApp` takes config and dependencies as **values**. It reads no environment,
opens no socket and constructs no database — so a test builds an app with fake
dependencies, calls `app.inject()`, and needs no port, no free-port race and no
cleanup.

`createApp` also does **not** call `app.ready()`. Readying seals the instance
against new routes, which would make the factory untestable for exactly the cases
worth testing — strict validation, response stripping, error mapping — without
inventing product endpoints to probe against. `inject()` and `listen()` both
ready the instance themselves, so nothing is skipped.

Importing `@lagda/api` starts nothing. An architecture test asserts the entry
point contains no call at statement position.

## Startup sequence

1. **Validate configuration** — `loadApiConfig()`. An invalid port, a wildcard
   CORS origin or `TRUST_PROXY=true` throws here, before anything is built.
2. **Load database configuration** — reused from `@lagda/db`, not re-parsed.
3. **Create the database** — pool only.
4. **Bounded connectivity check** — `ping()`. Fails the start rather than joining
   the load balancer and serving 503s.
5. **Create the app.**
6. **Listen.**
7. **Install signal handlers.**

**No migrations.** BACKEND-06 made migration an explicit deployment step. An API
that migrates on boot means every replica races to alter the schema during a
rolling deploy. An architecture test asserts no migration symbol appears in the
package.

Any failure in 1–4 throws, `main.ts` writes one JSON line to stderr and exits
non-zero. A partially configured server never listens.

## Plugin order

| # | Plugin | Why here |
|---|---|---|
| 1 | `@fastify/helmet` | Must cover every response, including errors and 404s |
| 2 | `@fastify/cors` | Before routes, so preflight is handled |
| 3 | `@fastify/swagger` | Must precede the routes it documents |
| 4 | `ApiError` schema | Registered once, referenced by `$ref` |
| 5 | `onRequest` hook | Sets `X-Request-Id` on every response |
| 6 | Error + not-found handlers | |
| 7 | Routes | |

CORS is registered **only** when origins are configured. Registering it with an
empty list would emit CORS headers that allow nothing, which reads as a
misconfiguration rather than an intentional same-origin deployment.

### Where later commands insert

- **BACKEND-13** (cookies, session, CSRF): between 4 and 7, inside an
  encapsulated `register()` scope so public routes stay public. Fastify
  encapsulation is what makes "protected by default within this group" possible
  without a global `preHandler` that every public route must remember to skip.
- **BACKEND-14** (idempotency): a `preHandler` in the same authenticated scope.
  `Idempotency-Key` is already in the CORS allowed-header list.
- **BACKEND-15** (rate limiting): a plugin at position 2, before routes. No
  rate-limit dependency is installed yet — health and readiness need none.
- **BACKEND-27** (authorization): a `preHandler` inside the authenticated scope,
  resolving permissions once rather than per route.

Four route classes will need different treatment, and the encapsulation model
supports all four without a global bypass: workspace-user, recipient/signing
access, public, and system.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `API_HOST` | `127.0.0.1` | Loopback. Binding every interface in dev exposes an unauthenticated service to the LAN |
| `API_PORT` | `8080` | Rejects `8080abc`; `parseInt` would read that as 8080 |
| `NODE_ENV` | `development` | Must be development, test or production |
| `TRUST_PROXY` | none | `true` is **rejected**. See TRUST_PROXY.md |
| `CORS_ORIGINS` | empty | Exact origins. `*` rejected; a path or non-canonical form rejected |
| `LOG_LEVEL` | `info` (`silent` in test) | |
| `REQUEST_BODY_LIMIT` | 1 MiB | JSON only. Uploads get their own limit (BACKEND-18) |
| `REQUEST_TIMEOUT_MS` | 30000 | |
| `SHUTDOWN_TIMEOUT_MS` | 15000 | |

Production additionally refuses a plaintext `http://` CORS origin — session
cookies are Secure, so such an origin could not work anyway.

`process.env` is read in `config/index.ts` and nowhere else. An architecture test
asserts it.

## Dependencies

```ts
interface AppDependencies { databaseHealth: DatabaseHealth }
```

Small, concrete, typed. **Not a service locator** — no
`container.get("DocumentRepository")`, because a string key defers a wiring
mistake to runtime and the whole value of composition is that the compiler sees
it. No DI framework.

`DatabaseHealth` exposes `isReachable(): Promise<boolean>` and nothing else.
Handing the readiness route a `LagdaDatabase` would put a query builder in a
route handler — and make a readiness check capable of reading tenant data.

Routes receive the specific capability they need, never the whole dependency
object.

`NodeDocumentSealer` exists and is deliberately **not** constructed: no use case
takes it, and instantiating a dependency because it is available gives the
process a startup failure mode for a feature it does not have.

## Shutdown

SIGTERM and SIGINT both call one **idempotent** shutdown. An orchestrator
commonly sends SIGTERM then SIGINT moments later, and two concurrent shutdowns
would close the pool twice — the second throwing during cleanup, which is exactly
when a confusing error is least welcome.

Order: **HTTP first, then the database.** Closing the pool first would fail
in-flight requests that were about to succeed.

A failing target does not stop the others; one stuck dependency must not prevent
the rest from releasing their handles.

Bounded by `SHUTDOWN_TIMEOUT_MS`, after which the process logs and exits
non-zero rather than hanging until SIGKILL.

`unhandledRejection` and `uncaughtException` log fatally and terminate. A process
in an unknown state must not keep serving traffic.

## Health and readiness

| | `/health` | `/ready` |
|---|---|---|
| Question | Is the process alive? | Should it receive traffic? |
| Database | **No** | Yes, via `DatabaseHealth` |
| Healthy | 200 `{"status":"ok"}` | 200 `{"status":"ready"}` |
| Unhealthy | — | **503** `{"status":"not-ready"}` |

Liveness must not depend on PostgreSQL: restarting the API does not fix the
database, and an orchestrator that restarts on a database blip turns a
recoverable dependency failure into an outage.

Readiness signals through the **status code**. A 200 carrying
`{"status":"not-ready"}` means every probe passes forever.

Both are `Cache-Control: no-store`, both are unauthenticated, and both disclose
nothing: no version, no `NODE_ENV`, no hostname, no dependency list. A test
asserts the health body's only key is `status`, and that a readiness failure
leaks no `ECONNREFUSED`, host, port or "password".

## OpenAPI

`@fastify/swagger` is registered for **generation only**. No UI plugin, and no
HTTP route is exposed — a test asserts `/documentation`, `/docs`,
`/openapi.json` and `/swagger.json` all 404.

Route schemas are the single source of truth; there is no hand-written spec to
drift from. A `refResolver` keeps registered schema `$id`s as component names —
without it the shared error schema was emitted as `def-0`, and every generated
client would have produced a type called `Def0`.

Publishing the document is a separate decision (OD-029).

## Commands

```bash
npm run dev:api      # tsx watch, TypeScript directly
npm run build && npm run start:api   # compiled output
```

Production runs compiled JavaScript. No transpiler, no watcher.
