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
