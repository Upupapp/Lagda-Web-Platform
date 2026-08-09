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

