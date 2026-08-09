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

## OD-005 — Shared contracts distribution

**Needs:** confirmation during BACKEND-02.

Preferred direction is a versioned `@lagda/contracts` consumed by both frontend
and backend. Unconfirmed: whether that is a path reference, a published package,
or a generation step — which determines whether the two repositories can silently
drift.

**Blocks:** nothing yet. **Decide in:** BACKEND-02.

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

## OD-007 — Runtime schema library

**Needs:** decision during BACKEND-02/03.

The architecture requires schema-first contracts with types derived from
schemas, so that validation, typing, and generated API documentation share one
definition. The specific library is not chosen.

**Blocks:** nothing yet.
