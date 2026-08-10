# LAGDA Backend — Open Decisions

Unresolved decisions, recorded without inventing answers. Product and legal
policy values are **not** guessed here.

An open decision blocks work only where stated. Everything else proceeds.

---

## OD-001 — Cross-border hosting and data residency posture

**Needs:** legal, privacy, and product determination.

LAGDA handles business and legal documents subject to the Philippine Data
Privacy Act (RA 10173). Unresolved: hosting region, controller/processor
obligations, cross-border transfer safeguards, customer requirements,
subprocessors, and any sector-specific restrictions.

**Explicitly not assumed:** that all Philippine personal data must physically
reside in the Philippines. That is a legal question, not a technical default, and
encoding either answer prematurely would be wrong.

**Blocks:** production deployment. **Does not block:** schema design,
application code, or local development.

---

## OD-002 — Document retention rules

**Needs:** product plan terms and legal input.

Retention periods are undefined because plan terms are undefined. Different
artifact types may need different behaviour — an original upload, a signed
document, a completion certificate, and an evidence record are not equivalent.

"Delete" is never interpreted casually for evidence-bearing signed documents;
destruction semantics require an explicit decision.

**Blocks:** retention jobs. **Does not block:** schemas, which are built so
retention can be policy-driven rather than hardcoded.

---

## OD-003 — Transactional email provider

**Needs:** vendor selection.

Delivery requirements are specified; no vendor is. Application code sits behind
a `NotificationPublisher` / mail port, so selection is an adapter decision.

**Blocks:** real delivery. **Does not block:** invitation, reminder, or
completion use cases, which target the port.

---

## OD-004 — Antivirus scanning implementation

**Needs:** infrastructure decision — self-hosted ClamAV versus a managed service.

AV scanning is required and the quarantine/scan architecture is **not** optional
regardless of vendor. The choice affects the upload pipeline's latency budget and
whether scanning is synchronous or a job.

**Blocks:** the AV step's implementation. **Does not block:** the upload pipeline
design, which uses a replaceable scanner interface.

---

## OD-005 — Shared contracts distribution — **STILL OPEN, now precise**

**Needs:** a decision by the user. BACKEND-02 could not resolve it.
**Blocks:** frontend migration to `@lagda/contracts` — and therefore the main
benefit of choosing TypeScript.

`@lagda/contracts` exists and the backend consumes it. The frontend cannot,
because there is no mechanism to deliver it across two repositories:

| Mechanism | Status |
|---|---|
| Private registry / GitHub Packages | Needs publishing; neither repo has a remote |
| Git dependency | Needs a remote; both repos are local-only |
| `file:` path reference | §51 forbids it as a source of truth, and it breaks frontend CI, which checks out only the frontend repo |
| Copying files | Defeats the purpose |

Until this is decided the frontend keeps its own definitions and drift between
the two is possible. That is stated rather than papered over.

**The options, honestly:**

1. **Push both repos to GitHub and use GitHub Packages.** Cleanest long-term;
   needs a remote and publish authorization.
2. **Merge into one monorepo.** Removes the problem entirely — a workspace
   dependency needs no registry. Reverses BACKEND-01's topology, and the reason
   for that topology (frontend CI pins Node 22, backend needs 24) would have to
   be handled.
3. **Stay split and accept drift** for now, revisiting when the backend has
   endpoints the frontend actually calls.

**Decide before:** any command that expects the frontend to consume shared
contracts.

---

## OD-018 — Production PostgreSQL major version

**Needs:** a deployment decision. **Raised by:** BACKEND-06.

Local development and CI are pinned to **PostgreSQL 16**. Production is not
decided, and the code uses no version-specific features. CI and production
majors should match — a feature working on 16 and absent on 15 is found in
production otherwise.

**Blocks:** nothing. **Decide with:** BACKEND-65 deployment.

---

## OD-019 — Row Level Security — **RESOLVED**

**Resolved by:** BACKEND-07. **Decision:** IMPLEMENTED.
**Recorded in:** `adr/ADR-004-workspace-row-level-security.md`.

This **reverses BACKEND-06's deferral**. Its three objections were all cost
rather than blockers: the role split is inside BACKEND-07's scope, the pooling
hazard is manageable because `SET LOCAL` is issued in exactly one place and is
directly testable, and "only two tables" argues for doing it now, since the cost
is mostly fixed and retrofitting across twenty is far worse.

Repository scoping remains mandatory. RLS is defence in depth.

---

## OD-019-original — Row Level Security timing (superseded)

**Needs:** a decision after the schema grows. **Raised by:** BACKEND-06.

Assessed in `db/RLS_ASSESSMENT.md` and **deferred**. RLS needs a per-transaction
`SET LOCAL` which, missed under connection pooling, carries one request's
workspace into the next — a silent, intermittent, load-dependent failure worse
than the one RLS prevents. It also needs a role split that does not exist yet,
and today would guard two tables.

Compound foreign keys do the higher-value work meanwhile: they stop cross-tenant
*writes*, which RLS does not address.

**Blocks:** nothing. **Revisit:** when tenant-owned tables are numerous, or
after BACKEND-07 splits database roles.

---

## OD-020 — Production database hosting topology

**Needs:** resolution of OD-001 first. **Raised by:** BACKEND-06.

Region, managed versus self-hosted, replication and backup topology all depend
on the data-residency posture, which is unresolved. Deliberately not decided
here — the code stays portable PostgreSQL with no vendor-specific APIs, so this
can be settled without touching persistence code.

**Blocks:** production deployment. **Decide with:** OD-001.

---

## OD-013 — `TransactionStatus` conflates lifecycle state with events

**Needs:** a contract decision. **Raised by:** BACKEND-04.

Six of the 14 canonical values are not lifecycle states. `delivered`, `viewed`
and `authentication-completed` are facts that occurred — a viewed request is
still awaiting signature, so the two are not mutually exclusive and cannot share
one field without losing information. `awaiting-signature` and
`awaiting-approval` are derived from outstanding participants.
`failed-delivery` is a delivery-channel outcome.

Core models 8 states and treats the rest as events. The contract union was **not**
redefined — parallel status ownership would be worse than the conflation.

**Blocks:** persistence design. A schema that stores `TransactionStatus` as the
whole truth will lose evidence. **Decide before:** BACKEND-06.

---

## OD-014 — Is expiry derived, or an explicit transition?

**Needs:** a product decision. **Raised by:** BACKEND-04.

`isExpired()` derives expiry from a deadline and a supplied time, and the machine
also has an explicit `expire` action. Whether a scheduled job must transition the
stored status — and what happens to a request that is past its deadline but never
transitioned — is unspecified.

**Blocks:** nothing now. **Decide with:** BACKEND-16 (queues) or BACKEND-37.

---

## OD-015 — Which roles may receive workspace ownership?

**Needs:** a product decision. **Raised by:** BACKEND-04.

`canReceiveOwnership` currently accepts any existing non-owner member. Whether an
auditor or reviewer should be eligible is a product question.

**Blocks:** nothing. **Decide with:** BACKEND-25/27.

---

## OD-016 — May a signing request contain duplicate recipient emails?

**Needs:** a product decision. **Raised by:** BACKEND-04.

The same person may legitimately hold two roles — signer and copy recipient — but
two independent signer slots for one address is likely an error. Nothing in the
handoff settles it, so no invariant was written.

**Blocks:** recipient validation. **Decide with:** BACKEND-31.

---

## OD-017 — What does one participant's decline do to the whole request?

**Needs:** a product decision. **Raised by:** BACKEND-04.

Core takes the conservative reading: any decline blocks completion, so a
transaction a participant refused never completes. Whether the request should
also transition to `declined` automatically — ending it for everyone — or
continue for other participants is genuinely open, and §54 forbids inventing it.

**Blocks:** the decline use case. **Decide before:** BACKEND-37.

---

## OD-012 — Dead `ApiResponse<T>` in the frontend

**Needs:** a small frontend cleanup. **Raised by:** BACKEND-03.

`src/app/models/index.ts` declares `ApiResult<T>`, `ApiError` and
`ApiResponse<T>` using a `{ success: true, data }` wrapper. **Nothing imports
them.** The live convention is `ServiceResult<T>` in `models/errors.ts`, used by
all 24 mock services.

Not deleted here: BACKEND-03 owns API conventions, not frontend cleanup, and
removing frontend types is outside its scope. It carries no compatibility weight
— the canonical API deliberately does not wrap success responses — but leaving
two conflicting conventions in one file invites the wrong one being copied.

**Blocks:** nothing. **Do:** in a frontend command, or the next one that touches
`models/index.ts`.

---

## OD-009 — `AuthMethod` means two different things

**Needs:** product clarification. **Raised by:** BACKEND-02 (conflict C-4).

`AuthMethod` is declared in two files with almost disjoint values:

- `index.ts`: `email-otp, sms-otp, knowledge-based, id-verification, none`
- `recipient.ts`: `invitation-access, email-code, sms-code, authenticator, account-signin, enterprise-idp, none`

These look like two concepts sharing a name — the authentication a *sender
requires* of a recipient, versus how a recipient *actually authenticated*. The
handoff specifies neither, so naming them by guess would set API semantics by
accident.

**Blocks:** extraction of the recipient and prepare domains.

---

## OD-010 — Status near-synonyms across domains

**Needs:** per-domain resolution as each is extracted. **Raised by:** BACKEND-02
(conflict C-6).

Across 284 string-literal unions: `completed`(15) vs `complete`(3);
`cancelled`(13) vs `voided`(8) vs `revoked`(1); `declined`(10) vs `rejected`(4)
vs `failed`(1); `active`(18) vs `in-progress`(9).

Whether these are synonyms or genuinely distinct states is a domain question per
union. §12 forbids normalizing by guessing, so nothing was changed.

**Blocks:** nothing now. **Resolve with:** each domain's extraction, and
BACKEND-07's state machines.

---

## OD-011 — Cross-repository contract CI

**Needs:** resolution alongside OD-005. **Raised by:** BACKEND-02.

The strongest argument for a shared package is that changing a contract fails CI
when the frontend stops compiling. With two repositories and no shared CI, that
guardrail does not exist. Backend CI checks the contracts package thoroughly;
nothing checks the frontend against it.

**Blocks:** nothing. **Resolve with:** OD-005.

---

## OD-021 — ORM / query-builder — **RESOLVED**

**Resolved by:** BACKEND-06. **Decision:** Kysely over `pg`, with Kysely's
migrator and hand-maintained row types.
**Recorded in:** `adr/ADR-003-postgresql-query-layer.md`.

Chosen because tenant integrity must be expressible as compound foreign keys and
because a security reviewer has to be able to read what a query does. Prisma's
generated types would leak across boundaries; Drizzle's generated migrations are
harder to review, and for tenant constraints the diff is the review.

---

## OD-007 — Runtime schema library — **RESOLVED**

**Resolved by:** BACKEND-02. **Decision:** TypeBox.
**Recorded in:** `adr/ADR-002-contract-runtime-schema-strategy.md`.

Chosen on architecture fit: Fastify validates with JSON Schema natively and
TypeBox *is* JSON Schema, so contract schemas reach routes with no conversion
layer. Zod has better ergonomics and was rejected for needing that layer at every
route.

---

## OD-006 — Identifier branding strategy

**Needs:** decision during BACKEND-02 contract extraction.
**Source:** `architecture.md` §7 finding F-1.

91 branded ID types exist, but the tenant key is a plain `string` in roughly 78%
of its declarations, and `transactionId`, `documentId` and `userId` have no
branded type at all. Extraction must decide:

1. which identifiers are branded in `@lagda/contracts`;
2. whether branding is applied consistently to every workspace-owned reference
   (see INV-016);
3. whether opaque public identifiers differ from internal primary keys, so that
   sequential database IDs never appear in public contracts.

**Blocks:** repository interface design (INV-003 is only compiler-checkable once
`WorkspaceId` is branded and applied). **Decide in:** BACKEND-02.

---

## OD-008 — Location of the backend architecture documents

**Needs:** a decision once BACKEND-02 settles how the two repositories share code.
**Raised by:** BACKEND-01.

BACKEND-00 created these documents in the frontend repository. BACKEND-01 then
established the backend as a **separate repository** at `Desktop/lagda-backend`,
so the architecture documents and the code they govern now live apart. A
developer cloning only the backend does not get them; the backend README links to
them instead.

Options are to move them to the backend repository, keep them here and link, or
publish them alongside `@lagda/contracts`. The right answer depends on OD-005,
so it is deliberately not decided now — and duplicating them into both
repositories is the one option to avoid, since drift between two copies of the
rules is worse than a link.

**Blocks:** nothing. **Decide with:** OD-005, in BACKEND-02.

---


## OD-022 — `Sha256Digest` is unbranded — **RESOLVED**

**Raised by:** BACKEND-09. **Needs:** a decision on changing a shared contract.

Every ID type in `@lagda/contracts` is branded (`Branded<"TransactionId">`), but
`Sha256Digest` is `Static<Type.String>` — a plain alias for `string`.

So `preparedDocumentHash` and `signedDocumentHash` are mutually assignable, and
swapping them in `SealResult` would compile silently. That swap publishes the
input's digest as the verification value for the output, and verification then
fails for every document with no visible cause.

Found because ESLint flagged `as Sha256Digest` in the digest helper as an
unnecessary assertion — it was, and the reason it was is the problem.

**RESOLVED by BACKEND-10.** `Sha256Digest` is now branded, with `toSha256Digest`
as the single validating constructor.

**The deferral reason was wrong.** It claimed `@lagda/contracts` is shared with
the frontend and that branding would be a breaking contract change. The frontend
consumes **nothing** from the package — OD-005 records exactly that, and a search
of `src/` confirms zero imports. So the change cost nothing, and every command
that persists a digest would have made it more expensive.

The prompt to recheck was ESLint flagging `as Sha256Digest` as an unnecessary
assertion in the new repository mapper — the assertion did nothing because the
type was `string`, at the precise moment two hashes were being mapped into
adjacent columns.

Branding required exactly one code change: the sealer's digest helper now returns
through the validating constructor. Nothing else in the backend produces a digest.

**Interim mitigation.** Both tests compare each digest against one computed
independently from the artifact it describes, so a swap fails the suite even
though it compiles.

**Options.** (a) Brand `Sha256Digest` and add a validating constructor; (b) leave
it and rely on tests; (c) brand per-artifact types (`PreparedDocumentHash`,
`SignedDocumentHash`), which prevents the swap outright but multiplies types.

## OD-023 — Who renders the completion certificate after a remote signer arrives

**Raised by:** BACKEND-09. **Needs:** OD-013 (certificate-backed signing) first.

`SealResult` returns the sealed document and the certificate together. A signing
service that only signs — the likely shape of a PAdES implementation — would not
render LAGDA's certificate.

Either the renderer stays in Node while signing moves out, splitting one
operation across two runtimes, or the remote service takes on LAGDA-specific
layout and copy.

**Deliberately not decided.** Extracting a `CertificateRenderer` port now would
create a second seam with one implementation and one caller, which is the
decorative-architecture failure recorded against `RouteMeta.status`. The
certificate being a separate artifact already means moving its production later
does not change the sealed document's bytes.

## OD-024 — Large-document memory behaviour

**Raised by:** BACKEND-09. **Needs:** real document-size data from production.

`SealRequest` carries document bytes in memory rather than a storage reference.
That is what keeps a future remote signer ignorant of LAGDA's storage topology,
and it is the right trade today — but a very large PDF is held entirely in
memory, twice during sealing (source plus output).

No limit is enforced, and no measurement exists. Stating it as unmeasured rather
than asserting it is fine.

## OD-025 — Device and location evidence

**Raised by:** BACKEND-10. **Needs:** a product decision and a derivation capability.

Handoff §16 lists "IP geolocation (city level only)" and "device fingerprint (no
biometrics)" in the evidence package. The *meaning* is settled — the frontend's
`DeviceNetworkSummary` states `networkRegion` is "never lat/lng or exact IP", so
this is IP-derived, city-level, and not browser geolocation.

**Not persisted.** Nothing can derive either value: geolocation needs a lookup
service that does not exist, and device categorisation needs a parser nobody has
chosen. Adding nullable columns with no writer is the failure this codebase
already shipped once — `RouteMeta.status`, declared on 225 routes and read by no
code, which drifted until three routes misreported themselves.

Adding these columns later is a cheap migration precisely because no rows exist
yet. The seal-metadata argument for writing fields early does not apply: those
are unrecoverable if omitted, these are not.

**Open:** whether city-level geolocation is wanted at all under RA 10173 data
minimization, and which device attributes have evidentiary value rather than
merely being collectable.

## OD-026 — Strict per-request evidence sequencing

**Raised by:** BACKEND-10. **Needs:** a requirement that ordering be strict, not merely deterministic.

Evidence is ordered by `(occurred_at, evidence_event_id)`, which is a total order
and is tested. It is not a *gapless sequence*.

A `sequence_no` would give one, but concurrency-safe allocation requires either a
row lock or a counter row — both of which serialize concurrent recipients, which
is precisely what parallel signing must not do. `SELECT MAX(seq)+1` without
locking is unsafe and is not an option.

**Open:** whether any legal or product requirement needs gap detection ("was an
event removed?"). Note that append-only privileges already make removal
impossible for the application, so the gap this would close is a
database-administrator threat — the same one INV-085 says this design does not
claim to address.

## OD-027 — Production reverse-proxy topology — **architecture decided, value open**

**Raised by:** BACKEND-11. **Needs:** BACKEND-65 deployment.

The *architecture* is settled and not open: **default deny**, explicit
configuration required, `TRUST_PROXY=true` rejected outright. What remains open
is the production **value**, which depends on how many proxies terminate the
connection before the API.

Until it is set and verified end to end, forwarded IP must not be described as
authoritative evidence — see [api/TRUST_PROXY.md](./api/TRUST_PROXY.md) for the
four-step verification.

## OD-028 — Same-origin or separate subdomain deployment — **NO LONGER BLOCKS COOKIES**

**Raised by:** BACKEND-11. **Needs:** BACKEND-65, and it constrains BACKEND-13.

If the frontend and API share an origin, CORS is unnecessary and session cookies
are simple. If they are `app.lagda.io` and `api.lagda.io`, CORS with credentials
is mandatory and the cookie needs a deliberate domain and `SameSite` decision.

Nothing is hardcoded either way: CORS is configuration-driven and registered only
when origins are present. BACKEND-13 cannot finalize cookie attributes until this
is answered.

## OD-029 — Whether to expose the OpenAPI document over HTTP

**Raised by:** BACKEND-11.

Generation is implemented; **exposure is not**. No `/documentation`,
`/openapi.json` or UI route exists, and a test asserts they 404.

Open: whether to serve it in production at all, and if so whether behind
authentication. A public document enumerates every endpoint and field name, which
is a reconnaissance aid; an internal one still needs an access decision. Deferring
costs nothing because the document is generated from route schemas on demand.

## OD-030 - Observability vendors are processors, and logs are in privacy scope

**Raised by:** BACKEND-12. **Needs:** the cross-border data decision (OD-001), then BACKEND-66.

Operational logs contain `userId`, `workspaceId` and - in security flows - IP
addresses. That makes any log aggregator, APM or error-tracking vendor a
**processor of personal data**, in scope for RA 10173 alongside the database.

No vendor is selected. The baseline is provider-neutral JSON on stdout, and
nothing in the backend requires a vendor to function.

**Open:** which vendors, in which region, under what subprocessor terms. Logs
must not be treated as outside privacy scope because they are "just diagnostics".

## OD-031 - Metrics exporter and scrape mechanism

**Raised by:** BACKEND-12. **Needs:** BACKEND-66.

Instrumentation and a typed catalog exist; nothing collects them. The port has
three methods and no vendor type, so an implementation is a small adapter.

**Open:** Prometheus scrape versus push, OpenTelemetry, or a vendor SDK; whether
a `/metrics` endpoint is exposed and how it is protected; histogram buckets,
which should come from measured traffic rather than a guess.

## OD-032 - Retention for logs, security events, metrics and traces

**Raised by:** BACKEND-12. **Needs:** BACKEND-55 (privacy) and BACKEND-66.

Four separate durations, and all four are separate from document and evidence
retention. Nothing is hardcoded.

Security events plausibly need longer retention and tighter access than ordinary
operational logs. Today they share one pipeline; whether they should is part of
this decision.

### OD-028 update (BACKEND-13)

Recorded at the end of BACKEND-12 as blocking session cookie attributes. **It
does not.**

SameSite is evaluated per *site* (registrable domain), not per *origin*.
`app.lagda.io` calling `api.lagda.io` is same-site, so `SameSite=Lax` is correct
under **both** candidate deployments. Only a frontend on a different registrable
domain would need `None`, and none has been proposed.

The deployment question remains open for CORS origin configuration and
operational topology. It no longer blocks session security.

## OD-033 — Absolute session lifetime

**Raised by:** BACKEND-13. **Needs:** a product/security decision.

Handoff §3 specifies the **idle** timeout ("default 8 hours idle") and says
nothing about an absolute ceiling. One is required regardless: idle expiry alone
lets a stolen cookie live indefinitely through use.

**Current:** 7 days, configurable via `SESSION_ABSOLUTE_LIFETIME_MS`. A
conservative default, not an invented business rule.

**Open:** whether 7 days is right for a legal-document product, and whether a
"remember me" option should extend it — which must be a longer *session policy*,
never a weaker cookie.

## OD-034 — Session security metadata

**Raised by:** BACKEND-13. **Needs:** a decision on account-security UI.

`created_ip` and `user_agent` are **not** stored. They were not collected merely
because they are available, and no consumer exists.

They become necessary if an account-security screen lists "your active sessions"
with device and location — a real product feature the handoff does not currently
specify.

**Note:** they must remain *context*, never validity requirements. Binding a
session to an IP or user-agent produces false logouts as users change networks,
while barely inconveniencing an attacker on the same network.

## OD-035 — Session cleanup and retention

**Raised by:** BACKEND-13. **Needs:** BACKEND-16 (worker) and BACKEND-55 (privacy).

Expired and revoked rows accumulate. A partial index on `expires_at` exists for a
future cleanup job; no job runs, and cleanup deliberately does not happen on the
request path.

**Open:** how long revoked sessions are retained — long enough to answer "when
was this session ended, and why" during an incident, and not forever. Separate
from document and evidence retention.

## OD-036 — Origin and Fetch-Metadata validation

**Raised by:** BACKEND-13. **Needs:** BACKEND-56.

Not implemented. The session-bound CSRF token is the control; `Origin` and
`Sec-Fetch-Site` would be additional defence in depth.

Deferred because the compatibility surface needs review — non-browser clients and
some proxies omit `Origin`, and a check that rejected a missing header would
break them. Recorded rather than half-implemented.

## OD-037 - In-progress HTTP semantics

**Raised by:** BACKEND-14. **Needs:** the first feature route (BACKEND-33).

Under the in-transaction claim a concurrent duplicate **blocks** on the unique
index and then replays, so the `in-progress` outcome is not normally reachable.
It becomes reachable for the staged operations that call external providers.

**Current:** `IdempotencyInProgressError`, category `conflict` -> 409.

**Open:** whether those responses should carry `Retry-After`, and whether a
bounded server-side wait is ever preferable to an immediate 409. Not decided
speculatively - it depends on how long the staged operations actually take, and
BACKEND-14 deliberately implements no waiting (a held HTTP connection waiting on
another request is a resource an attacker can exhaust).

## OD-038 - Idempotency retention duration

**Raised by:** BACKEND-14. **Needs:** product input on client retry behaviour.

**Current:** 24 hours, configurable.

Long enough for any realistic network or browser retry; short enough that a
stored response containing PII does not linger. **Unrelated to evidence,
session or document retention** - conflating them is the mistake this note
exists to prevent.

**Open:** whether any operation needs materially longer. Per-operation retention
was deliberately not built, since one default is simpler and nothing yet
requires otherwise.

## OD-039 - Thresholds the handoff does not specify

**Raised by:** BACKEND-15. **Needs:** each feature command, with product input.

Eight policies are implemented with handoff-sourced thresholds. Eleven more
operations are catalogued with **TBD** rather than a guessed number - password
recovery, invitations, sending, signing access, uploads, reports and API keys.

Deliberately not invented. An unsourced threshold is one nobody can defend when
it starts blocking a customer, and validation rejects a policy with an empty
source.

## OD-040 - Edge and WAF limits

**Raised by:** BACKEND-15. **Needs:** BACKEND-65.

A reverse proxy or CDN can shed volumetric load before it reaches Node, which
application-level counting cannot.

**Open:** whether to add one, and where. **Not open:** whether it would replace
these controls. It could not - an edge does not know what an account or a
challenge is, so it cannot express "5 attempts per account". Complementary, not
substitutive.

If an edge stores IP data it becomes a processor and belongs in the cross-border
review (OD-030).

## OD-041 - General authenticated read ceiling

**Raised by:** BACKEND-15.

`api.write.user` is 100/min per handoff §317. Whether a *read* ceiling is also
wanted is unanswered - a document editor issues many reads legitimately, and a
number set without measuring real client behaviour would break normal use.

Deliberately not guessed. BACKEND-61 can measure; until then no read policy
exists rather than a wrong one.

## OD-042 - No dead-letter handling or failure alerting

**Raised by:** BACKEND-16.

A job that exhausts its attempts becomes state `failed` and stays in
`pgboss.job`, durable and completely invisible. Nothing alerts, nothing
summarises, and an operator would have to know to run a query.

This is a gap, not a decision. The likely answer is a metric on failed-job count
plus an entry in ALERT_SIGNAL_CATALOG.md, but metrics are not wired to an
exporter yet, so an alert would fire into nothing. Deferred to the command that
wires the exporter rather than half-built here.

## OD-043 - Job execution is not in the metric catalog

**Raised by:** BACKEND-16.

BACKEND-12 defined `MetricName` as a closed union in `@lagda/api`. The worker
cannot import it - correctly, per INV-190 - so job duration, attempt count and
failure count are emitted as log fields only.

Either the metric vocabulary moves somewhere both roles can reach, or the worker
declares its own. Both are defensible; picking one without a metrics exporter to
validate against would be guessing.

## OD-044 - Worker concurrency and database load are unmeasured

**Raised by:** BACKEND-16.

`concurrency: 1` on both jobs, `QUEUE_POOL_MAX=4`. Conservative defaults chosen
so nothing is starved, not numbers derived from measurement.

Queue polling and job churn land on the application database (ADR-011). The total
connection count across API replicas, the worker application pool and the pg-boss
pool is a real production constraint. BACKEND-61 can measure it.

## OD-045 - No workspace-scoped job exists

**Raised by:** BACKEND-16.

Both jobs are `system`. `WorkspaceJobContext` exists with a non-optional
`workspaceId`, but nothing constructs one.

The unanswered question is how a worker establishes RLS tenant context for a job:
the API does it per request from the session, and a worker has no session. It
will most likely set the tenant GUC from the job's declared workspace inside the
unit of work, but that is a design to write with the first workspace job, not to
speculate into the foundation.

## OD-046 - How the API obtains a JobScheduler

**Raised by:** BACKEND-16.

The API is banned from importing `@lagda/worker`, and the pg-boss adapter lives
there. When the first route needs to enqueue, the adapter has to move somewhere
both composition roots can reach - a small `@lagda/queue` package is the obvious
shape.

Not done now, because building a package for a caller that does not exist is how
foundations acquire dead code. The ban is deliberately in place *first*, so the
question is forced rather than answered by an accidental import.

## OD-047 - Signal handling is unverified

**Raised by:** BACKEND-16.

`SIGTERM` and `SIGINT` both route to one idempotent `close()`, and `close()`
itself is verified - called twice, emitting `worker.stopping` / `worker.stopped`
then silence.

The signal *delivery* is not verified. Development is on Windows, which does not
deliver these signals to a Node process the way production Linux will. Stated
rather than assumed working; a Linux CI job or a container smoke test closes it.

## OD-048 - TerminalJobError does not stop retries

**Raised by:** BACKEND-16.

The name says the failure will not succeed on retry. The behaviour sets
`errorCategory: "terminal"` in the log and then lets the job consume its
remaining attempts exactly like any other failure.

Short-circuiting requires pg-boss's failure semantics or an explicit
`boss.fail()`, and neither is wired. Recorded prominently because a reader could
reasonably infer the opposite from the type name - which is precisely how a
documented-only rule turns into a believed-enforced one.

## OD-049 - Worker output is not redacted

**Raised by:** BACKEND-16.

BACKEND-12 built a deep recursive redactor and `scrubSecretsFromText()` for the
API's logger. The worker writes structured JSON directly and applies neither,
because it cannot import `@lagda/api` (INV-190).

The worker logs no payload today, so nothing leaks today. But `error` carries an
exception message, and a handler that interpolates a payload value into an error
would leak it with nothing to stop it. The redactor belongs in a package both
roles can import - the same move OD-046 needs.

## OD-050 - Production object-storage provider and region

**Raised by:** BACKEND-17.

The adapter is S3-compatible and hard-codes no provider: not `amazonaws.com`,
not `linodeobjects.com`, no bucket, no region. The deployment decides.

Unresolved deliberately. Object storage will hold the same regulated documents
as the database, so region and provider carry the same privacy,
controller/processor and customer review already identified for PostgreSQL.
Choosing a region because another project uses one would be exactly the wrong
way to decide it (OD-039 covers the equivalent database question).

Co-locating the database and object storage in one region is likely right for
latency and residency simplicity, but that is a deployment and privacy decision,
not an architectural one.

## OD-051 - Conditional-write behaviour on the production provider

**Raised by:** BACKEND-17.

MEASURED on MinIO: `IfNoneMatch: "*"` is honoured for a key that already exists,
and provides NO serialisation of concurrent creates - six simultaneous writers
all succeeded.

AWS S3 documents stronger behaviour. Whether the chosen provider enforces the
conditional atomically changes create-once from "guarded" to "guaranteed", and
it can only be measured against the real service.

LAGDA does not depend on the answer: globally unique artifact ids make a genuine
collision impossible, and a true race for one key means one artifact written
twice, where converging is correct. The measurement should still be repeated on
the production provider and recorded here.

## OD-052 - Multipart upload thresholds and cleanup

**Raised by:** BACKEND-17.

The SDK may switch to multipart for large objects. Nothing in LAGDA exposes
multipart mechanics - it is adapter-internal and must stay that way - but
incomplete multipart uploads consume storage until removed.

That is a provider lifecycle rule rather than application code. Deferred to the
deployment command (BACKEND-65) rather than solved with a manual cleaner nothing
has yet needed. The 3 MB integration object is below any multipart threshold, so
multipart is currently untested.

## OD-053 - Bucket versioning and server-side encryption

**Raised by:** BACKEND-17.

Versioning: RECOMMENDED FOR PRODUCTION as recovery from accidental overwrite or
deletion, and explicitly NOT a substitute for immutable keys. LAGDA does not
depend on it.

Server-side encryption: use whatever the provider supports. Deliberately not
specified as AWS KMS, because S3-compatible providers differ and a KMS-shaped
configuration would fail on the provider actually chosen.

Object lock / WORM: NOT enabled, and not to be enabled without a legal retention
requirement - it conflicts directly with erasure obligations.

Both are deployment settings, so neither is application code. Recorded here so
BACKEND-58/65 pick them up deliberately.

## OD-054 - Whether an ArtifactContentStore abstraction is wanted

**Raised by:** BACKEND-17.

A thin application service mapping artifact identity to bytes -
`ArtifactContentStore.get(artifactId)` - would keep storage references out of
feature code entirely.

NOT built, because it would have zero callers today, and this project has
already documented what foundations without callers cost. The existing pieces
already compose correctly: the tenant-scoped artifact repository yields a
reference, and the storage port takes it, which is proven end to end by an
integration test.

BACKEND-18 is the first command with a real caller and should decide then, with
a concrete use case rather than a guess.

## OD-055 - Orphan object reconciliation

**Raised by:** BACKEND-17.

Storage and PostgreSQL are not atomic. Writing bytes first means the failure
window produces an ORPHAN OBJECT (bytes with no metadata) rather than the worse
alternative (metadata with no bytes).

An orphan wastes storage and nothing else. No scanner is built: reconciling
"objects with no artifact row" requires listing a bucket, and doing that
carelessly against live data is a good way to delete something real. It also
cannot be written safely until BACKEND-18 defines when a partial upload is
genuinely abandoned.

BACKEND-55 or BACKEND-60 owns it. Until then orphans accumulate slowly and
harmlessly, which is the right trade for the alternative.

## OD-056 - Maximum document size

**Raised by:** BACKEND-18.

Handoff §7 says "Maximum file size: to be determined (suggest 25MB)". The
suggestion is implemented as the configurable default, and the multipart limit,
the pipeline bound and the scanner limit are all derived from it.

Still a PRODUCT decision. It interacts with three things: request duration under
a synchronous pipeline, memory (the file is buffered, OD-058), and the scanner's
own StreamMaxLength. Raising it materially should be a deliberate choice across
all three rather than a config edit.

## OD-057 - Synchronous versus asynchronous processing

**Raised by:** BACKEND-18. **Decided for now: SYNCHRONOUS.**

The request stays open through quarantine, inspection, scanning and promotion.
Justified by a 25 MB ceiling and sub-second local scans, and by the absence of
any upload-status API for a client to poll.

What would change it: measured scan latency, larger documents, or a frontend
that gains a processing state. The move is cheap - BACKEND-16 provides the
queue, and the payload is already known to be `{ workspaceId, uploadId }`, never
bytes. Recorded so the choice is revisited on evidence rather than drifting.

## OD-058 - The upload is buffered, not streamed

**Raised by:** BACKEND-18.

The file is held in memory under a hard bound rather than streamed to
quarantine. Two causes: the storage port's stream variant needs a content length
that multipart does not trustworthily supply, and PDF inspection needs the
cross-reference table at the end of the file regardless.

Cost: up to the maximum upload size per upload in flight. Mitigated by the bound
itself, by abandoning oversized uploads immediately, and by rate limiting.

Fixing it properly means unknown-length streaming through S3 multipart, which is
a change to the BACKEND-17 storage contract. BACKEND-61 should measure before
that is worth doing.

## OD-059 - Active PDF content is not sanitized

**Raised by:** BACKEND-18.

PDFs can carry JavaScript, launch actions, embedded files and external
references. LAGDA refuses what a real antivirus engine flags and what a real
parser cannot read, and never executes or renders a PDF - but it removes
nothing.

AV plus parsing is NOT sanitization, and no code or document claims it is.

Real sanitization produces DIFFERENT BYTES, which under LAGDA's integrity model
is a different artifact with its own digest and provenance - not a quiet rewrite
of the original. BACKEND-56 owns the decision, and it is a product and legal
question as much as a technical one.

## OD-060 - Production malware scanner deployment

**Raised by:** BACKEND-18.

The adapter is provider-neutral and proven against a real ClamAV daemon. What is
unresolved is how one runs in production: sidecar process, dedicated host, or a
managed scanning service.

Whatever is chosen must also answer signature freshness (freshclam scheduled and
MONITORED - an engine with stale signatures answers "clean" confidently),
resource limits, and StreamMaxLength at least the upload maximum.

Uploads are unavailable when the scanner is, by design. That makes scanner
availability a product availability concern, which is a deployment decision
rather than a code one.

## OD-061 - Orphan objects with no row

**Raised by:** BACKEND-18.

Two windows leave an object that row-driven cleanup cannot see: an upload row
insert failing after the quarantine write, and the acceptance transaction
failing after the accepted-object write.

Both leave PRIVATE, UNREFERENCED objects - nothing serves them, because serving
requires an artifact row behind a tenant-scoped lookup. The cost is storage, not
exposure.

Not auto-deleted, deliberately: deleting on an uncertain transaction outcome is
how a real artifact gets destroyed. A quarantine-bucket lifecycle rule handles
the first cheaply and is a deployment setting; the second needs the
reconciliation job already recorded as OD-055.

## OD-062 - Quarantine retention duration

**Raised by:** BACKEND-18.

The cleanup primitive is built, horizon-bounded, idempotent and tested. The
recurring job is NOT registered, because registering it requires choosing how
long a quarantine object may live.

Deliberately not guessed. Too short and an in-flight upload loses its bytes; too
long and rejected uploads - including malware - sit in a bucket longer than
necessary. A few hours is the likely answer, and it should be chosen alongside
the incident-response question of how long a rejected sample is worth keeping.

## OD-063 - Password minimum length

**Raised by:** BACKEND-19. **Current answer: 8, from the frontend.**

MEASURED from `isPasswordAcceptable` in the real registration form. The handoff
specifies no password policy, so the UI is the only stated requirement, and a
server minimum stricter than the UI would reject passwords the UI accepted.

Recorded rather than presented as a security target: 8 is on the low side of
modern guidance. Raising it is a product decision with a migration question
attached - existing accounts would keep shorter passwords until they change them,
so a raise needs a policy for what happens at login.

## OD-064 - Registration rate-limit thresholds

**Raised by:** BACKEND-19. **Chosen, not measured.**

The handoff gives thresholds for sign-in, OTP and verification but NOT for
registration. Rather than leave account creation unlimited, two policies were
chosen - 5 per 10 minutes per IP, 3 per 10 minutes per account identity - and
their `source` field says plainly that they were chosen here.

They bound the two real risks: mass account creation, and Argon2id cost as a DoS
primitive. Whether they are right for a legitimate office behind one NAT address
is a product question that real traffic should answer.

## OD-065 - Verification token lifetime

**Raised by:** BACKEND-19. **Configurable; no product answer exists.**

The handoff says "password reset via time-limited secure token" but specifies no
duration for email verification. The TTL is a parameter of the use case rather
than a constant, so it is deliberate at the composition root.

Needs a product answer alongside BACKEND-21's resend flow: too short and users
returning the next morning are stuck, too long and a leaked link stays useful.

## OD-066 - May unverified accounts log in?

**Raised by:** BACKEND-19. **Unresolved, and BACKEND-20 must answer it.**

The frontend has an `email-verification-required` auth status and a
`/verify-email` page, which suggests an unverified user reaches a limited state
rather than being refused outright. But no product rule says which actions are
restricted.

This is the single most important decision for BACKEND-20. It cannot be inferred
from registration, and getting it wrong in either direction is visible: refusing
login entirely strands anyone whose verification mail was lost, while allowing
full access makes verification decorative.

## OD-067 - Production verification email delivery

**Raised by:** BACKEND-19. **BLOCKING for the feature, not for BACKEND-20.**

Registration creates a verification challenge and returns the raw token for
delivery. Nothing delivers it, because notification infrastructure is
BACKEND-44/45.

The raw token was deliberately NOT parked in a queue payload or an outbox row in
the meantime: a one-time credential in general-purpose storage has weaker
handling than the account it protects, and that is the insecure workaround this
command was told not to invent.

Until delivery exists, registered accounts cannot be verified.

## OD-068 - Stale unverified accounts

**Raised by:** BACKEND-19.

An unverified account holds a normalized email forever, so a real owner of that
address can never register it. Nothing expires or reclaims them.

Deliberately not solved by deletion in registration - that would be an account
takeover primitive. It needs a retention policy alongside BACKEND-21's resend and
BACKEND-55's erasure work, and the answer probably involves an expiry window plus
a way for the genuine owner to claim the address through verification rather than
through re-registration.

## OD-066 - RESOLVED: unverified accounts may not log in

**Raised by:** BACKEND-19. **Resolved by:** BACKEND-20.

MEASURED from `SignIn.tsx`: `platform.signIn(...)` - the call that establishes an
authenticated session - runs only in the `standard` case. The
`email-verification` case navigates to `/verify-email` and establishes nothing.

So a correct password on an unverified account creates NO session and returns
`403 EMAIL_VERIFICATION_REQUIRED`. Being specific is safe there only because the
caller already proved control of the credential; a wrong password never produces
that response.

## OD-069 - Login rate limits are not yet bound to the route

**Raised by:** BACKEND-20.

`auth.signin.ip` and `auth.signin.account` exist with handoff-sourced thresholds,
and the ORDERING - limiter before Argon2id - is proven with a hook. But the real
limiter plugin is attached during app composition, and neither auth route is
wired into `createApp` yet.

Until they are, the routes are protected by nothing but their own schema in a
running application. This is the single most important item to close when the
routes are composed, because Argon2id without a limiter in front of it is a
memory-hard DoS primitive.

## OD-070 - Frontend cookie-session migration

**Raised by:** BACKEND-20.

The frontend still calls its mock auth service. Switching it to the real
endpoints needs credentialed requests, a CSRF header read from the readable
cookie on mutations, and 401 handling that routes to sign-in.

Deliberately not done here: it is frontend work, and doing it blind - without a
running backend to test against - would produce a client nobody has verified.
No backend change is required to enable it.

## OD-071 - Sign out of all devices

**Raised by:** BACKEND-20.

`revokeAllForUser` exists in the session repository and is unused. BACKEND-22
will need it, because a password reset must invalidate every existing session.

Whether it is also a product feature - a "sign out everywhere" button in account
settings - is a UX decision nobody has made. The capability is ready either way.

## OD-072 - Account lockout is deliberately absent

**Raised by:** BACKEND-20.

Only temporary rate-limit cooldown protects against brute force. There is no
permanent lockout and no `failedLoginCount` column.

That is a decision, not an omission: permanent lockout is weaponizable, because
anyone who knows an email address can lock that account out by guessing at it.
Revisit only if a product or compliance requirement demands it, and pair it with
a self-service unlock so the weapon is blunted.

## OD-065 - RESOLVED: verification credential lifetime

**Raised by:** BACKEND-19. **Resolved by:** BACKEND-21.

24 hours, configurable through `EMAIL_VERIFICATION_TTL_MS`. Long enough that
someone registering in the evening can finish the next morning; short enough that
a code sitting in a mailbox does not stay useful indefinitely.

Expiry is DERIVED from `expires_at` rather than stored as a status, so no job has
to keep a column honest.

## OD-073 - RESOLVED: the credential is a typed code

**Raised by:** BACKEND-21.

BACKEND-19 generated a 43-character base64url link token. The product collects a
TYPED code - `VerifyEmail.tsx` has an input field and the auth service takes
`verifyEmail(code)`. Nobody types 43 characters of base64url.

Now a 12-character Crockford base32 code (~60 bits), grouped `XXXX-XXXX-XXXX`,
canonicalized on input. Confirmed with the product owner before building. See
ADR-015.

## OD-074 - Challenge record retention

**Raised by:** BACKEND-21.

Consumed, expired and superseded challenges are never deleted. Their non-secret
history - that a code was issued, rotated or redeemed and when - is useful to an
account-security review, and the CREDENTIAL is already dead in every case, so
retaining the row leaks nothing.

But rows accumulate forever, and "useful history" is not a retention policy.
BACKEND-16's cleanup foundation can remove them once someone decides how long
that history is worth keeping - which is a privacy question as much as a storage
one, and belongs alongside BACKEND-55's erasure work.

Deliberately separated from credential lifetime: the code dies in 24 hours; the
record does not have to.

## OD-075 - Email change must invalidate active challenges

**Raised by:** BACKEND-21. **For BACKEND-24.**

A challenge references a USER, not a specific address, because email is
currently immutable after registration - there is no change flow.

When BACKEND-24 adds one, a challenge issued for the old address must not be
able to verify a new one. Changing an email MUST supersede every active
challenge for that user, and issue a fresh one for the new address.

The repository primitive already exists: `supersedeActiveForUser`. Recorded here
so it is a requirement rather than something discovered later.

## OD-076 - The frontend's "locked" account state has no backend

**Raised by:** BACKEND-21.

`VerifyEmail.tsx` and the sign-in mock both handle a `locked` outcome, and
`/auth/account-locked` is a real route. No account status column exists, and
BACKEND-19 deliberately did not invent one.

So `locked` is currently unreachable from the backend. Either the product wants
account suspension - which needs a state model, an operator flow, and a
deliberate decision about whether login reveals it - or the UI state is
aspirational and should be recorded as such.

Not invented here: an account-state machine nobody has specified is exactly the
kind of thing that becomes load-bearing before anyone defines it.

## OD-069 — UPDATED: no auth route is composed

**Raised by:** BACKEND-20. **Still open after BACKEND-22.**

Seven auth routes now exist across four commands. None is registered in
`createApp`. Each is tested through a Fastify instance built in its own test,
which proves the handler and proves nothing about a running application.

The consequence compounds with every command: eleven rate-limit policies are
now defined for auth flows and **not one is attached**. The password-recovery
limits are the first where the gap is directly exploitable — an unbound
forgot-password endpoint is an email-bombing tool.

This is composition work, and it is now the largest single gap in the auth
surface.

## OD-077 — Reset challenge record retention

**Raised by:** BACKEND-22.

Consumed and superseded reset challenges are never deleted. The credential is
dead in every case, so the row leaks nothing, and "a reset was requested and
redeemed at this time" is exactly what an account-security review wants.

But rows accumulate forever. BACKEND-16's cleanup foundation can remove them
once someone decides how long that history is worth keeping — a privacy question
as much as a storage one, and one that belongs alongside OD-074 (the identical
question for verification challenges) and BACKEND-55's erasure work.

Deliberately separate from credential lifetime: the token dies in an hour, the
record does not have to.

## OD-078 — Password-changed security notification

**Raised by:** BACKEND-22.

A "your password was changed" email is a standard control: it tells a user who
did **not** initiate the reset that their account was taken, at the one moment
they can still act.

Not implemented, because there is no notification infrastructure to implement it
on and §77 says not to build one speculatively. When it exists, the message must
contain no password and no reset link, must go out after commit through the
durable queue, and must not be conflated with the reset-request delivery.

## OD-079 — The frontend's three reset-link states have one backend answer

**Raised by:** BACKEND-22.

`ResetPassword.tsx` renders distinct `expired`, `used` and `invalid` screens.
It selects between them from a `?state=` URL parameter **it sets itself** — a
demo affordance, not an API contract.

The backend collapses all five internal failures into
`INVALID_OR_EXPIRED_RESET_TOKEN`, per §120, and the frontend's `invalid` copy
already covers every case.

There is a defensible argument for distinguishing "already used": unlike login,
a reset token is 256 bits and identifies no public account, so telling its holder
that it is spent reveals nothing they could not already determine by trying. It
would be a genuine UX improvement. It would also tell a token thief whether their
stolen link is live.

Not decided unilaterally. Recorded so the choice is made deliberately rather
than discovered when someone wires the real API to the demo's three screens.

## OD-076 — UPDATED: the `locked` account state is now load-bearing in two flows

**Raised by:** BACKEND-21.

Unchanged, and now more visible: sign-in, verification and — implicitly —
recovery all have UI for an account state the backend cannot produce. §32 asked
whether account-state restrictions gate reset eligibility. They cannot, because
no account state exists. Recorded, not invented.

## OD-069 — ESCALATED: no auth route is composed, and it now hides a security guarantee

**Raised by:** BACKEND-20. **Escalated by:** BACKEND-23.

Eleven auth routes now exist across five commands. None is registered in
`createApp`. Fourteen rate-limit policies are defined and none is attached.

BACKEND-23 makes this qualitatively worse. `registerMfaRoutes` takes
`authenticatedUser` and `issueSession` as OPTIONS, so "a pre-authentication
credential cannot resolve a user on the settings routes" is currently a property
of a test double. The cookie's `Path=/auth` scoping is real and enforced by
browsers; the route-level refusal is not demonstrated anywhere a request
actually flows.

**This should be the next composition command.** Everything below it is built.

## OD-081 — MFA key management

**Raised by:** BACKEND-23.

TOTP secrets are encrypted with AES-256-GCM using one key from
`MFA_SECRET_KEY`, with a version label stored beside each ciphertext.

There is no KMS, no envelope encryption, no automatic rotation and no escrow.
The version column makes rotation possible without a migration; nothing performs
one. Consequences:

- the key sits in the application environment, so a host compromise yields both
  ciphertext and key;
- losing the key makes every enrolled factor undecryptable, leaving affected
  users dependent on recovery codes;
- rotating it needs a re-encryption pass nobody has written.

This was a deliberate choice over two alternatives: storing plaintext (rejected
outright) and blocking TOTP entirely for want of a KMS (rejected because it would
have left the product's whole MFA surface unusable). Recorded so the gap is
visible rather than implied by its absence.

## OD-082 — MFA account recovery when both factors are lost

**Raised by:** BACKEND-23.

A user who loses their authenticator AND their recovery codes is locked out.
Password reset is deliberately not a bypass (§197 Model A) — if it were, the
second factor would only ever be as strong as the mailbox.

There is no support-mediated recovery path, because designing one means deciding
what proof a human operator may accept, and that is a product and legal
question, not a coding one. Recorded rather than solved by weakening the factor.

BACKEND-59's support tooling is where this belongs.

## OD-083 — Step-up authentication

**Raised by:** BACKEND-23.

`authentication_method` is recorded on the pending authentication, and
`completeMfaChallenge` reports `PASSWORD_PLUS_TOTP` or
`PASSWORD_PLUS_RECOVERY_CODE`. That is as far as it goes.

No assurance level is stored on the session and no operation requires recent-MFA
re-proof, because no product operation asks for one today. Building an AAL
framework with no consumer is the failure this codebase has already recorded
under "foundation without callers".

When a sensitive operation genuinely needs it — deleting a workspace, changing
billing — the pieces are here to extend.

## OD-084 — The `/mfa` challenge route is marked `status: "planned"`

**Raised by:** BACKEND-23.

`routes.ts` marks `/mfa` as `planned` while `/mfa/setup` and `/mfa/recovery` are
`implemented`, and `MfaChallenge.tsx` exists and works.

The backend now implements the full login challenge, so the route metadata is
behind reality. Worth correcting — and a reminder of the `RouteMeta.status`
drift already recorded for the frontend.

## OD-076 — RESOLVED: the `locked` state is now reachable

**Raised by:** BACKEND-21. **Resolved by:** BACKEND-23.

`MfaChallenge.tsx` renders a `locked` outcome, and until now no backend state
produced one.

It does now: exhausting the five attempts on a ceremony returns
`MFA_ATTEMPTS_EXHAUSTED` and clears the pre-auth cookie, which is exactly the
"too many incorrect attempts" state the UI describes.

Note what this is NOT: an account lockout. The ceremony dies, not the account —
the user signs in again with their password. An indefinite account lock would be
a denial-of-service anyone could trigger by knowing an email address.

The `locked` state in SIGN-IN and email verification remains unreachable, and
that part of OD-076 stands.

## OD-069 — ESCALATED AGAIN: seventeen uncomposed routes

**Raised by:** BACKEND-20. **Escalated by:** BACKEND-23 and BACKEND-24.

Six account routes added, none registered in `createApp`. The running total is
seventeen auth and account routes and roughly fourteen rate-limit policies,
none attached to anything.

BACKEND-24 adds three more controls that exist only as route options: the
refusal of a pre-auth credential at `/me`, CSRF on account mutations, and a rate
limit on password change. Each is specified, each is designed, and none is
demonstrated where a request actually flows.

**This should be the next command.** Everything it needs is built; nothing else
should be layered on top first.

## OD-085 — RESOLVED: email change is not a product feature

**Raised and resolved by:** BACKEND-24.

`ProfilePage.tsx` renders the address read-only: *"Contact support to change
your account email."* The product routes this through support.

No endpoint was built. The full security requirements for a future one — ten of
them, from reauthentication through to notifying the old address — are recorded
in ACCOUNT_SECURITY_BOUNDARIES.md so they exist before the feature does.

If the product later wants self-service email change, that is a command of its
own, not an addition to a profile form.

## OD-086 — Avatar upload

**Raised by:** BACKEND-24.

`ProfilePage.tsx` has an avatar control that previews a local object URL and
persists nothing. `UserProfile` has no avatar field.

Deliberately not built. An avatar is an image-upload security problem in its own
right — content-type verification, decompression bounds, stripping EXIF (which
carries GPS coordinates), and a serving path that cannot become stored XSS. It
must not reuse the document pipeline, which is tuned for PDFs and quarantine
scanning.

Worth doing properly when the product commits to it.

## OD-087 — The sessions page shows device and region; nothing records them

**Raised by:** BACKEND-24.

`ActiveSession` carries `deviceLabel`, `deviceType`, `browser` and `region`.
`user_sessions` has no user-agent and no IP column — BACKEND-13 chose not to
collect them.

The projection returns what exists and does not invent the rest. Closing the gap
means deciding to store a user-agent string and derive a coarse region, which is
a privacy decision with retention consequences, not a mapping exercise. The
product's own page already says it shows "no full IP addresses, exact
locations", so whatever is added must stay coarse.

Until then the settings page has fields the backend cannot fill.

## OD-088 — Notification preferences belong to BACKEND-44

**Raised by:** BACKEND-24.

`NotificationsPage` exists. Its preferences were deliberately not folded into
account preferences: they describe which messages a user receives, which is
notification-domain state, and there is still no notification infrastructure to
receive them.

Recorded so they are not accidentally implemented twice.

## OD-069 — NARROWED: the authenticated scope now exists

**Raised by:** BACKEND-20. **Escalated by:** BACKEND-23, BACKEND-24.
**Narrowed by:** BACKEND-25.

BACKEND-25 built the authenticated scope in `createApp` and registered four
workspace routes inside it. For the first time in this repository, a pre-auth
refusal, a CSRF rejection and a rate-limit 429 are asserted against a request
flowing through the real application factory rather than a test double.

**Still open:** the seventeen auth and account routes remain uncomposed. Until
they are, a real browser cannot sign in to reach the workspace surface — the
workspace tests issue a session directly from the session service.

What changed is the nature of the work. It was "design a protection model and
prove it protects"; it is now "call `registerXRoutes(scope, …)` inside the
callback that already exists, and supply the dependencies". The pattern, the
encapsulation and the hook ordering are settled and tested.

**This should still be the next composition task.**

## OD-089 — Workspace slug

**Raised by:** BACKEND-25.

`WorkspaceOverviewPage.tsx` displays `/{workspace.slug}` and
`WorkspaceSettingsPage.tsx` lets it be edited, with help text saying "Changing
affects all deep links".

**No route resolves a slug.** There is no `/w/:slug` segment anywhere in
`routes.ts` or `router.tsx`, and no deep link uses one. §9 says to build slug
infrastructure only where the product actually routes on it.

Two things must be decided before it is built:

1. **Uniqueness scope.** Globally unique makes it an enumerable public
   namespace and leaks which names are taken. Unique per nothing makes it
   useless for routing. There is no third option that is also a URL.
2. **Rename semantics.** If deep links contain slugs, a rename breaks every
   saved link unless old slugs are retained and redirected — which is a second
   table and a retention question.

Neither is a technical default. Until they are answered, a slug is decoration
the backend does not store.

## OD-090 — Workspace entitlements and plan limits

**Raised by:** BACKEND-25.

There is no maximum number of workspaces per user, and no plan check on
creation. §24 and §73 forbid inventing one before billing exists.

The `workspace.create.user` rate limit — 10 per hour — is an **abuse control**,
not a product limit. It bounds a runaway client; it does not express an
entitlement, and it must not be mistaken for one when BACKEND-50 arrives. The
lifecycle is arranged so an entitlement check can be added before the
transaction opens without restructuring anything.

## OD-091 — Workspace lifecycle states the product does not have

**Raised by:** BACKEND-25.

`WorkspaceStatus` declares `active | suspended | archived |
pending-verification`, and `WorkspaceOverviewPage.tsx` renders the value as a
badge. **No screen can set any of them**, no fixture uses `archived` or
`suspended`, and there is no archive, suspend, restore or delete action anywhere
in the workspace UI — while teams and custom roles have Archive/Restore buttons.

The backend has one state, `active`, and no column implying otherwise.

This is the same shape as OD-087 (the sessions page showing device and region
that BACKEND-13 never records): a page with a field the backend cannot fill.
Closing it means the product deciding what archiving a workspace *does* — to its
documents, its signing evidence, its members' access, and its billing — which is
a retention decision (OD-002, BACKEND-55), not a column.

## OD-092 — Per-workspace session timeout

**Raised by:** BACKEND-25.

`WorkspaceSettingsPage.tsx` offers a session timeout of 1, 4, 8 or 24 hours.

A session is **global to the user** (BACKEND-13), and a user may belong to
several workspaces with different values. Which one applies? The strictest? The
active one — so switching workspaces changes when you are signed out? Per
workspace, meaning one browser holds several sessions?

Not implemented, because each answer is a different session architecture and
none is a default. BACKEND-13's global policy stands.

## OD-093 — RESOLVED: invitation lifetime, authority and role policy

**Raised and resolved by:** BACKEND-26.

Every question the invitation lifecycle needed answered, and the answer:

| Question | Decision |
|---|---|
| Credential lifetime | **7 days.** Not specified by the product or the handoff, so CHOSEN and marked as chosen: long enough that a Friday invitation survives a holiday week, short enough that a forwarded mailbox does not carry a live credential for months. The frontend's own list flags "expiring" inside two days, which is consistent with this order and not with a much shorter one. |
| Who may invite | **`owner` only**, through `canManageInvitations` — the minimum authority BACKEND-25 established. Deliberately a separate predicate from `canManageWorkspace`, because the product's own table grants `members:invite` more widely and BACKEND-27 will likely split them. |
| Which roles may be invited | **Every canonical role except `owner`.** |
| May OWNER be invited | **No.** Absent from the schema union and refused by a database CHECK. A workspace has exactly one owner; an emailed link is not an ownership transfer. |
| One active invite per address | **Yes**, enforced by a partial unique index over the four terminal timestamps. |
| Create vs resend | **Separate operations.** Create refuses a live duplicate rather than silently resending, so a double-submitted form cannot mail twice. |
| Resend credential rotation | **Rotates in place**, one row. The old digest stops resolving at commit: exactly one valid link at any moment. |
| Acceptance authentication | **A full session.** A pre-auth MFA credential is refused by the authenticated scope before any lookup. |
| Email/account matching | **Current canonical email of the account vs the invitation**, read at acceptance time. |
| Unverified accounts | **No special rule.** Invitation acceptance follows whatever the normal login path already requires; there is no verification bypass and no verification side effect. |
| Already a member | **Converges.** The invitation is consumed and `joined: false` is reported, so no live credential dangles for access that already exists. |
| Rate limits | Four fail-closed policies: create and resend, each per-user and per-workspace. |
| Idempotency | Required on create and resend, workspace-scoped, with distinct operations so a retry and a later deliberate resend are distinguishable. |

## OD-094 — RESOLVED: `member` is a real membership role

**Raised and resolved by:** BACKEND-26.

`WORKSPACE_ROLES` had six values and none of them was the one the product's
invite form defaults to. `InvitationsPage.tsx` selects `role_member`, and
`SYSTEM_ROLE_PERMISSIONS` defines `role_member`.

`member` was added in migration 014. Not invented — adopted from the product,
which is the distinction §14 draws.

## OD-095 — Reviewer or auditor?

**Raised by:** BACKEND-26.

The invite form offers a single option, **"Reviewer / Auditor"**
(`role_reviewer_auditor`). `WORKSPACE_ROLES` has both `reviewer` and `auditor`
as separate values, with different permission sets in the frontend's own table:
an auditor gets `view_audit`, a reviewer gets `verify_documents`.

One UI option, two canonical roles, and nothing in the product says which one an
invitation should grant.

Not guessed. Both roles are invitable, so the API can express either; the
frontend cannot currently ask for a specific one. Closing this means the product
deciding whether they are one role or two — which is BACKEND-27's question,
since it is really a question about what the permissions are.

## OD-096 — Editing a pending invitation's role

**Raised by:** BACKEND-26.

There is no edit control on `InvitationsPage.tsx` — a pending row offers Resend
and Revoke, and nothing else.

So there is no role-edit operation, and resend deliberately carries the original
role: a resend that could silently change what the recipient is being granted
would be a new offer wearing an old audit trail (§79, §90).

If the product wants it, the safe shape is already visible: revoke the
invitation and create a replacement, which supersedes the credential and records
both events. Whether that is enough UX, or whether an explicit edit is wanted,
is a product decision.

## OD-097 — Invitation history retention

**Raised by:** BACKEND-26.

Two clocks that must not be conflated:

- **Credential validity** — 7 days, settled.
- **Invitation history retention** — undecided.

Terminal invitations (accepted, revoked, declined, superseded) are retained
indefinitely, and the runtime role has no `DELETE` grant, so nothing in the
application can remove one. That is the right default while the question is
open: invitation history is security history — who was offered access to a
tenant, by whom, and whether they took it.

It is also personal data. Invitation records belong in BACKEND-54's export
review and BACKEND-55's erasure review, and a cleanup job (BACKEND-16) can
enforce whatever BACKEND-55 decides. Nothing in this command expires or removes
a row.

## OD-098 — Invitation delivery is BLOCKED

**Raised by:** BACKEND-26. **Depends on:** OD-003, BACKEND-44/45.

`scheduleDelivery` is called inside the creation and rotation transactions — the
placement that guarantees a failed enqueue rolls the invitation back rather than
stranding it. It is **optional**, exactly as the equivalent seams in email
verification and password reset are, because there is no notification
infrastructure.

**A production invitee cannot currently receive a link.** The complete secure
lifecycle exists behind that seam; a provider and a template do not.

One design question is deferred with it, and it is not trivial: the raw token
exists for the length of one transaction and is never persisted, so a background
worker cannot recover it to build a link later. Whichever notification
architecture BACKEND-44/45 chooses has to hand the secret to the renderer inside
that window, or encrypt it the way BACKEND-23 encrypts TOTP secrets. Recorded
here so the constraint is not discovered late.

## OD-099 — RESOLVED: the workspace role and capability model

**Raised and resolved by:** BACKEND-27.

| Question | Decision |
|---|---|
| Role set | Seven, from the product: `owner`, `administrator`, `member`, `template_administrator`, `sender`, `reviewer`, `auditor`. No speculative additions. |
| Role-to-capability matrix | Ten capabilities, one frozen total `Record` in `@lagda/core`. WORKSPACE_CAPABILITY_MATRIX.md. |
| Default behaviour | **Deny.** Unknown role, unknown capability, unmapped combination. |
| Invitation grant matrix | `invitation.create` holders may grant any invitable role. Nobody may grant `owner`. |
| Workspace-settings authority | `workspace.update` — `owner` and `administrator`. **Corrected from BACKEND-25's owner-only**, which contradicted the product's own table. |
| Member-list authority | `membership.view` — `owner` and `administrator`, matching the navigation gate. |
| Role change | **Implemented.** Never to or from `owner`, never self-targeted. |
| Member removal | **Implemented.** The row is deleted; MEMBER_LIFECYCLE.md says why. |
| Ownership model | `SINGLE_OWNER`, stated in code as a constant. |
| Owner invitation | Refused at four layers. |
| Last-owner behaviour | Demotion and removal both refused, transactionally. |

## OD-100 — The product's two permission tables disagree

**Raised by:** BACKEND-27.

`ROLE_PERMISSIONS` (`models/index.ts`) is keyed on `PlatformRole` and drives the
navigation gate and the capability registry. `SYSTEM_ROLE_PERMISSIONS`
(`models/workspace-admin.ts`) is keyed on custom-role ids and drives the
custom-role builder, and is marked `demonstrationOnly`.

They disagree about the member directory: `SYSTEM_ROLE_PERMISSIONS` gives
`role_member` the `members:view` permission, while `ROLE_PERMISSIONS` withholds
`manage_team` from every non-administrative role — and `manage_team` is what
gates the whole workspace-administration section.

The backend implements the navigation gate's answer, because it is the one that
controls what a user can actually reach, and because a member directory is every
colleague's email address. Recorded rather than resolved by picking the more
permissive reading. The product should decide whether an ordinary member sees
the member list.

## OD-101 — Ownership transfer, and the consequence of not having it

**Raised by:** BACKEND-25. **Escalated by:** BACKEND-27.

`WorkspaceSettingsPage.tsx` has one control: *"Transfer ownership (demonstration
only)"*. There is no target picker and no flow.

BACKEND-27 makes the consequence concrete rather than theoretical:

- nobody may grant `owner` — not an invitation, not a role change, not the owner;
- the owner cannot be demoted or removed, because either would leave zero owners.

**So ownership never moves.** A workspace's owner is its owner permanently.

That is coherent — the invariant holds and nothing is half-built — and it is a
real limitation. `DataPrivacyPage.tsx` already tells users *"Workspace Owners
must transfer ownership before closing their account"*, describing an operation
that does not exist.

**This is the highest-priority gap the workspace commands leave.** The shape it
should take is in OWNERSHIP_MODEL.md: a dedicated atomic operation, never a role
patch, with the target already a member and a security event recorded.

## OD-102 — Leave workspace

**Raised by:** BACKEND-27.

There is no leave control anywhere in the product. A member cannot leave; an
administrator removes them.

Not built. If it is ever added, the owner edge case is the whole difficulty:
under `SINGLE_OWNER` an owner cannot leave without transferring first, which
means leave depends on OD-101.

## OD-103 — Suspend, reactivate, deactivate

**Raised by:** BACKEND-27.

`MemberDetailPage.tsx` offers three member actions beyond removal, and
`WorkspaceMemberStatus` declares `active | suspended | deactivated |
pending-invitation`.

They are a membership **status** model — a suspended member is still a member
whose access is paused — and implementing them means adding the status column
that INV-324 exists to prevent, plus deciding what suspension means for
in-flight signing requests, for seat counts, and for directory visibility.

Not built. Building it as a fourth timestamp on the authorization table, without
those answers, is how `AND status = 'ACTIVE'` ends up in eighty queries.

## OD-104 — The `viewer` role

**Raised by:** BACKEND-27.

`PlatformRole` includes `viewer` with `view_dashboard` and `view_documents`. It
overlaps `member` and `reviewer`, and nothing reachable in the product
distinguishes the three.

Not added to `WORKSPACE_ROLES`. Adding a fourth read-only role whose difference
from the other three nobody can state would be vocabulary without meaning.

## OD-105 — Custom roles

**Raised by:** BACKEND-27.

`RolesPage.tsx` has a working custom-role builder: name, description, and a
checkbox per permission across all 30 `WorkspacePermission` values.

Not built. **26 of the 30 permissions govern documents, templates, contacts and
billing — operations that do not exist.** A customer could compose a role
granting `documents:send` and it would mean nothing.

The migration path is recorded in AUTHORIZATION_ARCHITECTURE.md §11 and needs
its own ADR. The important property is already in place: every caller names a
**capability**, so `hasCapability` could become a database lookup without
changing a single call site.

## OD-106 — Role-change history

**Raised by:** BACKEND-27.

`workspace_memberships` stores the current role. Who changed whose role, from
what, to what and when exists only as security events.

A durable audit trail would be genuinely useful for a legal-technology product,
and the frontend already designs one — `WorkspaceActivityEvent` has 24 event
types including `member-role-changed` and `ownership-transferred`. That is a
workspace activity feed, which is BACKEND-43's territory.

The events are emitted with everything such a log would need, so nothing is lost
that would have to be reconstructed.

## OD-107 - Personal vs workspace contact scope

**Raised by:** BACKEND-28.

The frontend's `Contact` model has `scope: "personal" | "workspace"` and an
`ownerId`. BACKEND-28 implemented neither: every contact is workspace-scoped.

It is a **second ownership axis layered over tenancy**, and the capability model
has no vocabulary for "mine, within this workspace". The questions it raises
have no product answer:

- Is a personal contact visible to the workspace owner?
- Editable by an administrator?
- What happens to it when its creator is removed from the workspace?
- Does it participate in the duplicate check against workspace contacts?

Answering those here would mean inventing an authorization rule rather than
reading one from the product, which is exactly the mistake BACKEND-27 exists to
correct.

Adding a scope later is a nullable column plus a policy decision. Removing one
that people have already used is a data migration and a conversation.

## OD-108 - Contact usage tracking

**Raised by:** BACKEND-28.

`lastUsedAt`, `usageCount`, and the `recent` and `frequent` list views are all in
the product model, and `ContactSortField` offers both fields.

Not built, because **nothing would write them**. A contact is "used" when it
becomes a document recipient, and recipients arrive with BACKEND-30. Sorting by
either today would order every contact identically and look broken.

The command that creates recipients from contacts is the one that should add
them, in the same transaction that creates the recipient.

## OD-109 - `invalid` and `restricted` contact statuses

**Raised by:** BACKEND-28.

`ContactStatus` in the product is `active | archived | invalid | restricted`. The
backend implements the first two.

No operation in the product sets either of the others; they appear only in mock
fixture data. A state the system can never enter is a state machine with an
unreachable node.

`invalid` would plausibly mean "delivery bounced", which needs delivery
infrastructure (OD-003). `restricted` would plausibly mean a compliance block,
which needs a compliance model. Each arrives with the mechanism that sets it.

## OD-110 - Contact erasure under the Data Privacy Act

**Raised by:** BACKEND-28. **The highest-priority gap this command leaves.**

LAGDA now stores personal data - name, email, phone, employer, job title - about
people who are **not LAGDA users**, never consented, and do not know the record
exists. The workspace is the controller; LAGDA is a processor.

**There is no erasure operation.** Archiving sets a timestamp and the row
survives; the runtime role has no `DELETE` grant on `contacts`. A data-subject
request would reach the workspace, who would find that archiving is the
strongest thing their software can do.

That is coherent with the design - see ADR-021 for why hard delete was rejected
as an ordinary button - and it is still a gap. A real erasure operation needs:

- an authority model: a workspace administrator, or a LAGDA platform operator
  acting on a verified request?
- an audit trail of the erasure that does not itself retain what was erased;
- a decision about signing evidence. A contact who signed a document appears in
  that document's recipient snapshot, and eSignature evidence has a legitimate
  competing retention basis. Erasing the address-book entry must not - and need
  not - touch it;
- a `DELETE` grant, currently and deliberately absent.

A compliance command, not a contact-page button.

## OD-111 - Merging duplicate contacts

**Raised by:** BACKEND-28.

The product's duplicate view offers an action named `merge-demonstration`, which
is the product saying it is not real.

Not built. Merging is destructive, has to decide which record's history survives,
and would be the one operation in this domain capable of touching a record a
document was sent from. Every question it raises is a product question: which
name wins, what happens to the other id, and whether anything that referenced
the loser follows.

Detection and review are implemented; the resolution step is not, and the
address book is fully usable without it.

## OD-112 - Bulk contact creation and CSV import

**Raised by:** BACKEND-28.

No import UI exists in the product, and no bulk create form.

Not built. Driving it through the single-contact path would be an unbounded write
loop with no rate limit designed for it - and contact writes are currently
unlimited precisely because the only path is one member creating one contact.

**An import feature is the change that makes a rate limit mandatory**, and it
would also need a file-size bound, a row cap, per-row validation reporting, and a
decision about how duplicates inside one file interact with the
warn-but-never-refuse policy.

## OD-113 - Document archive and delete

**Raised by:** BACKEND-29. **Resolved for now: NEITHER.**

The product archives and deletes *transactions*, not documents.
`TransactionFile` has no `archivedAt` and no delete action, and
`document.service.ts` has no `deleteDocument`.

So `documents` has no `archived_at`, no `status`, and the runtime role has no
DELETE grant. If a document-level archive is ever wanted it is almost certainly
an archive flag on a transaction, which the product already has.

The genuinely open part is what BACKEND-32 does when a transaction referencing a
document is cancelled or archived - and the answer must not be a cascade.

## OD-114 - Download original

**Raised by:** BACKEND-29.

Not built. `TransactionDetailPage.tsx` imports a `Download` icon and never uses
it: one import, zero call sites.

When it is built it needs a decision this command deliberately did not make:
**stream through the backend, or issue a short-lived presigned URL.** They have
different security properties. A presigned URL is a bearer credential that must
never be logged, never persisted, and generated only after the authorization
check - and it leaves the backend unable to revoke access for its lifetime.
Streaming costs bandwidth and holds a connection.

Whichever is chosen, the storage key must not reach the client, and the download
must be gated on `document.view` or a dedicated capability.

## OD-115 - Source replacement and versioning

**Raised by:** BACKEND-29.

No replace control exists in the product. If one appears, the decision is
whether replacing a draft's PDF keeps the same `DocumentId` with a new source
artifact, or creates a new document.

The schema does not foreclose either: artifact lineage (`source_artifact_id`)
already models derivation, and `document_artifacts_one_original_idx` would need
revisiting because it permits exactly one `original` per document.

**Whatever is decided, the previous original is never overwritten.**

## OD-116 - Document search

**Raised by:** BACKEND-29.

Not built. `DocumentListQuery.q` searches transactions, and BACKEND-48 owns
broader search.

If a document-level title search is ever needed it is a tenant-scoped `ILIKE`
with escaped metacharacters - the shape BACKEND-28 already used for contacts -
not a search subsystem.

## OD-117 - Documents that never receive their bytes

**Raised by:** BACKEND-29.

Document-first creation means a document exists before its upload. If the upload
is rejected (malware, wrong type) or the user abandons the flow, a metadata row
remains with no artifact.

Harmless and visible: it costs one row, no storage, and `source: null` renders
as "awaiting file". Nothing cleans it up.

Whether that needs a sweeper depends on how often the prepare flow is abandoned,
which nobody has measured. Recorded so it is a decision rather than an
accumulation nobody noticed.

## OD-118 - Renaming a document attached to a sent transaction

**Raised by:** BACKEND-29.

The product's action is `rename-draft`, implying drafts only. But "draft" there
is a `TransactionStatus`, and BACKEND-29 deliberately does not know about
transaction status.

BACKEND-32 can make this decision with the state to make it. Note it is about
tidiness, not integrity: renaming cannot corrupt anything, because the artifact
digest is untouched and evidence snapshots its own display text.

## OD-119 - Document erasure under the Data Privacy Act

**Raised by:** BACKEND-29. **The highest-priority gap this command leaves.**

Harder than the contact case (OD-110), because the two purposes conflict rather
than merely coexist.

A document's content is personal data - names, addresses, government
identifiers, salary figures, sometimes medical or financial detail. It is also
**the evidence a signature attests to**. Erasing it destroys the thing a
completion certificate certifies.

The erasure right is not absolute and a signed contract has a strong competing
retention basis. But LAGDA has **no operation at all**, so nothing is being
weighed. A real answer needs:

- who may erase, and on what verified request;
- whether erasure means the bytes, the metadata, or both;
- what a completion certificate says about a document that no longer exists;
- how it interacts with the immutable artifact chain and the seal.

BACKEND-55.

## OD-120 - N+1 artifact lookup in document listing

**Raised by:** BACKEND-29.

`listDocuments` resolves each row's original artifact individually. Bounded by
`perPage <= 100`, so it is bounded work rather than unbounded - but it is one
query per row.

The alternative considered was omitting page count and file size from the list
response, which the product displays (`TransactionFile`), so the list would not
render.

The fix is a batch repository method - `listOriginalsForDocuments(ids)` - and it
is a pure addition. Recorded rather than left for someone to discover under
load.

## OD-121 - Preparation field types beyond the renderable nine

**Raised by:** BACKEND-30. **Partially resolved.**

The editor offers thirteen field types; the sealer renders five. Nine are
implemented - the five renderable directly, plus `full-name`, `email`, `title`
and `company`, which are semantically distinct requests that all draw as text.

Four are deferred, each needing work in the same command that adds them:

- `radio-group` - option sets, group semantics, a renderer, and it is the one
  type behind a paid plan tier;
- `multiline-text` - no multiline renderer; single-line text would truncate
  silently;
- `acknowledgment` - no renderer, and its own participant role implies semantics
  nobody has specified;
- `sender-text` - sender-filled content, which carries different authority and
  audit semantics from anything a signer supplies (§39).

`renderTypeFor` is the single mapping, and a guard asserts every preparation
type maps onto a `SealableFieldType`. Adding a tenth without a renderer fails
the build.

## OD-122 - Preparation snapshot representation

**Raised by:** BACKEND-30. **BACKEND-32 must resolve.**

A signing request must not read live preparation after it is created - a sender
editing on Tuesday would change what a recipient saw on Monday.

What is decided: it is a SNAPSHOT, not merely a lock, for the reasons in
PREPARATION_EDITABILITY.md. What is not: the representation. Copied rows, a
serialized document, or a hashed canonical form are all viable, and the choice
depends on what evidence needs to prove.

Canonical serialization is already in place should hashing be wanted: stable
ordering, explicit types, no arbitrary maps, coordinates at a fixed precision.
No hash is computed today because nothing consumes one (§161).

## OD-123 - Whether one document may be sent more than once

**Raised by:** BACKEND-30. **BACKEND-32 must resolve, and it decides two other
things.**

Nothing in the product says a document is sent once. BACKEND-30 deliberately did
not encode either assumption: preparation is per-document and carries no signing
state.

The answer determines:

- whether recipients belong to the preparation or to the signing request
  (BACKEND-31 cannot settle this alone);
- whether `locked_at` is a per-send lock or a permanent one.

## OD-124 - Rotated pages cannot be prepared

**Raised by:** BACKEND-30. **The highest-priority gap this command leaves.**

`page.getSize()` returns the UNROTATED mediabox; a viewer renders the rotated
page. So on a 90-degree page the editor's normalized coordinates are taken
against a landscape view and placed into portrait space - every field lands
wrong, with no error at any layer.

Nothing in LAGDA knew a page could be rotated; the inspector never looked. It
does now, and preparation REFUSES rather than misplacing.

**This is a real limitation.** A contract scanned sideways - an ordinary thing -
cannot be prepared. Lifting it means teaching `toPdfRect` and the renderer about
rotation, then relaxing `canPlaceFields`, in that order. Not the reverse.

Artifacts inspected before this are `null` and are refused too: assuming
unrotated would silently accept the exact case the check exists to catch.

## OD-125 - A ready or lock control

**Raised by:** BACKEND-30. **Resolved for now: NEITHER.**

The prepare flow's steps are upload, participants, routing, authentication,
settings, review, fields. A **Review** step is a page you look at, not a lock
you set, and there is no "Ready to send" control that changes server state.

Building one would mean inventing the validation it gates (§111) and the rule
about whether READY can return to EDITABLE (§116) - two product decisions with
no product answer.

`locked_at` exists as the freeze seam and nothing sets it. The real immutability
moment is signing-request creation.

## OD-126 - Frontend coordinate fixtures

**Raised by:** BACKEND-30.

The backend cannot detect a bad viewport-to-normalized conversion: `0.5` looks
identical whether it was computed correctly or by luck.

Whoever wires the editor to these routes must add the shared fixtures §285 asks
for - known page dimensions, known viewport dimensions, known rectangle,
expected canonical coordinates - plus a zoom-invariance test (§286). A field
whose persisted geometry changes when the user zooms is a bug only the frontend
can catch.

Not applicable this command: no frontend contract changed, and these are new
backend routes the frontend does not yet call.

## OD-127 - Readiness validation

**Raised by:** BACKEND-31. **Deferred to the send flow.**

`fieldRequiresRecipient` says every implemented field type needs an assignee at
readiness. Nothing enforces it, because enforcing it at save time would block
the ordinary act of building a layout: an editor places a field before deciding
who fills it, and that is a permitted state (INV-429's successor).

Readiness is a gate on SENDING, and a gate needs someone who can act on it. The
full rule that BACKEND-32 must decide and enforce:

- every required field has an assignee;
- at least one participant blocks completion;
- the routing plan terminates - no step waits on a step that never runs.

The last is the interesting one, and it needs the ceremony's semantics to state
precisely.

## OD-128 - A separate recipient capability

**Raised by:** BACKEND-31. **Resolved for now: NO.**

Recipients are governed by `document.view` and `document.prepare`, the same two
capabilities as the field layout.

A `recipient.manage` would create a role that may place a signature field but
not say who signs it, which is not a state the product has a screen for. The
prepare flow treats participants and fields as one act.

Revisit if the product grows a distinct "manage recipients" permission - for
instance a coordinator who assembles the party list while someone else places
the fields. Adding a capability later is additive; splitting one that turned out
to be two is not.

## Resolved by BACKEND-32

These were open going into the command and are now decided. Recorded here so a
reader does not reopen them:

| Question | Resolution | Where |
|---|---|---|
| Initial request state | `draft` alone, with a CHECK admitting one value | SIGNING_REQUEST_STATE_MACHINE.md |
| Request-scoped RecipientId | New brand, provenance kept as SET NULL | SIGNING_REQUEST_RECIPIENT_MODEL.md |
| Request-scoped FieldId | New brand, three-column assignment key | SIGNING_REQUEST_FIELD_MODEL.md |
| Source artifact basis | ORIGINAL + field metadata. There is no PREPARED artifact | SIGNING_REQUEST_SNAPSHOT_MODEL.md |
| Preparation revision model | Snapshotted as provenance, not as authority | SNAPSHOT_MODEL |
| Request title | No separate title. The DOCUMENT title is snapshotted, because the signer sees it and it is mutable | PRODUCT_INVENTORY |
| One vs many requests per document | Many. No unique constraint | ADR-025 |
| Immutable request vs editable draft | Immutable. Editing stays in preparation | SIGNING_REQUEST_IMMUTABILITY.md |
| Create capability | `signing-request.create`, separate from `document.prepare` | ADR-025 |
| View capability | `signing-request.view`, following `document.view` | ADR-025 |
| Idempotency scope and fingerprint | Workspace scope; the DOCUMENT alone | SIGNING_REQUEST_CREATION_CONSISTENCY.md |

## OD-129 - Send metadata ownership

**Raised by:** BACKEND-32. **Deferred to BACKEND-33.**

`settings.invitation.{subject, message, senderDisplayName}` exist in the prepare
wizard and are persisted by NO backend command. There is nothing to snapshot
today, and email copy belongs with the send that uses it.

BACKEND-33 must decide whether they are configured at send time, or persisted on
the preparation first and snapshotted onto the request. If the latter, note the
tension: they would be the only MUTABLE thing a request carries, and
SIGNING_REQUEST_IMMUTABILITY.md would need an explicit exception rather than a
quiet one.

## OD-130 - Expiration and reminders

**Raised by:** BACKEND-32. **Deferred to BACKEND-46.**

`settings.expiration.{enabled, expiresAt}` and `settings.reminders.*` exist in
the wizard (`maxReminders` has no UI control at all) and are persisted nowhere.
The master sequence places both in BACKEND-46.

Whichever command implements them must decide whether expiry is a property of
the REQUEST (snapshotted, immutable) or of the SEND (set when it goes out, and
extendable). The product's expiry is an absolute date on a preparation, which
suggests the second.

## OD-131 - Recipient authentication policy

**Raised by:** BACKEND-32. **Deferred to BACKEND-34.**

`PrepAuthConfig` exists in the wizard with a default method and per-participant
overrides. Persisted by no backend command.

BACKEND-34 must decide whether the policy is snapshotted onto the request - so
the rule a signer faces cannot change after they were invited - or read live.
The snapshot answer is almost certainly right, for the same reason everything
else here is snapshotted.

## OD-132 - Signing-link credential lifetime

**Raised by:** BACKEND-32. **BACKEND-34.**

Nothing in this command issues a credential. When one exists, its lifetime,
rotation on resend, and behaviour after expiry are all open.

## OD-133 - Post-send amendment, cancel and void

**Raised by:** BACKEND-32.

A request is immutable and there is no way to abandon an unsent one, because the
product has no such control. Once BACKEND-33 can send, three questions arrive at
once:

- can a sent request be cancelled, and what does a recipient holding a link see?
- is an amended agreement a NEW request, or a revision of one?
- `void` exists in the product's vocabulary for COMPLETED transactions and means
  something different from `cancel`.

The schema is ready for any of them: `DELETE` is granted, the CASCADE is in
place, and the state CHECK is one line to widen.

## Resolved by BACKEND-33

| Question | Resolution | Where |
|---|---|---|
| SENT semantics | Workflow committed for delivery. Not delivered, viewed or signed | SIGNING_REQUEST_STATE_MACHINE.md |
| Send capability | `signing-request.send`, separate from create | ADR-026 |
| Send idempotency scope and fingerprint | Workspace scope; `{ signingRequestId }` | SEND_CONSISTENCY |
| Routing activation semantics | Earliest cohort present; one integer expresses all three shapes | ROUTING_ACTIVATION |
| Bootstrap credential format | Opaque 256-bit base64url, own digest domain. Not a JWT | SIGNING_ACCESS_PROVISIONING |
| Access credential TTL | 14 days, configurable, always set | SIGNING_ACCESS_PROVISIONING |
| One-active-grant policy | Partial unique index on `revoked_at is null` | SIGNING_ACCESS_PROVISIONING |
| **Secure delivery-secret mechanism** | **AES-256-GCM `SecretBox`, own key. This resolves OD-098 for signing** | ADR-026 |
| Signing-link canonical URL | Configured base only; the builder takes no request | SIGNING_ACCESS_PROVISIONING |
| Subject / message ownership | NOT_IN_PRODUCT at send. Nothing persists them | SEND_PRODUCT_INVENTORY |
| Delivery intent persistence model | A narrow signing-specific table, not a generic outbox | ADR-026 |

### OD-098 is partially resolved

It recorded that invitation delivery is blocked because a raw token cannot
survive its transaction, and named encryption as the fix. BACKEND-33 built that
for signing.

**Invitations, email verification and password reset still drop their raw
secrets.** They are now the odd ones out, and the mechanism that would fix them
is proven and in the codebase. OD-098 stays open for those three.

## OD-134 - Splitting create from send

**Raised by:** BACKEND-33. **Resolved for now: same four roles.**

`signing-request.create` and `signing-request.send` are separate capabilities
held by identical role sets, which makes the matrix look redundant. It is not:
assembling a document and releasing it to counterparties are different acts with
different consequences, and an assistant-drafts / partner-releases split is the
most likely first differentiation a real deployment asks for. A one-line change
when it does.

## OD-135 - How viewers and carbon-copies learn about a document

**Raised by:** BACKEND-33.

`viewer` and `carbon-copy` cannot hold fields, so a SIGNING credential is not
what they need - handing one to a participant the ceremony does not involve
would be wrong. They are activated, so a later command can find them, and they
receive nothing.

Which means today they learn nothing at all. Three questions:

- do they receive an invitation at send, or a copy at completion?
- do they need a document-VIEW credential, which does not exist?
- is a carbon-copy recipient a delivery target at all, or a completion-copy
  target?

The product's role descriptions say carbon-copy "receives a copy of the
completed document", which suggests completion rather than send - but nothing
implements completion yet.

## OD-136 - Resend

**Raised by:** BACKEND-33. **BACKEND-34/45.**

Transport retry is not resend: a retry reuses the same intent and the same
credential, which is enforced. A deliberate resend is a different operation and
must decide whether it rotates the credential. The partial index already permits
reissue after revocation.

## OD-137 - Cancel and void after send

**Raised by:** BACKEND-33.

A sent request cannot be un-sent. When cancellation arrives it must revoke
outstanding grants and mark pending intents undeliverable, and it must decide
what a recipient holding a live link sees. `void` in the product's vocabulary
applies to COMPLETED transactions and means something different again.

## OD-138 - Sender display name

**Raised by:** BACKEND-33. **Deferred to BACKEND-45.**

The delivery intent snapshots a `sender_display_name`, and today it is the
WORKSPACE name. The request's creator is a `UserId`, there is no profile read on
the send path, and an email saying "usr_3f2a invited you to sign" would be worse
than one saying the firm did.

If a real person's name should appear, whoever writes the renderer must snapshot
it deliberately at send - reading a mutable profile at render time would make a
retry render different content from the first attempt.

## OD-139 - Dispatched-intent retention

**Raised by:** BACKEND-33.

A delivery intent holds a recipient's email and name in a record whose purpose
is operational. Once dispatched, the snapshot has no further use.

Clearing dispatched intents after a window would reduce the PII surface without
touching the legal record. Not implemented; recorded as a concrete option
OD-110 can take.
