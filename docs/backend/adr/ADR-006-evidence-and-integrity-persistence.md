# ADR-006 — Append-only evidence, with artifact, seal and verification separated

**Status:** Accepted · **Date:** 2026-08-09 · **Command:** BACKEND-10
**Related:** ADR-004 (RLS), ADR-005 (sealing scheme), OD-025, OD-026

## Context

Handoff §16 requires "an immutable activity event" for every participant action
and §32 an "append-only store" whose contents "cannot be modified or deleted".
§17 requires a verification record; §15 requires three stored artifacts.

The tempting shape is one `audit_log` table with a JSONB payload. It is one
migration, one repository, and it answers every question badly.

## Decision

**Four tables**, because four different questions are being asked:
`document_artifacts` (what bytes exist), `evidence_events` (what happened),
`document_seals` (what procedure produced a final artifact),
`verification_records` (the public identity of a completion).

**Append-only through database privileges.** The runtime role `lagda_app` holds
`INSERT` and `SELECT` on all four and is explicitly revoked `UPDATE` and
`DELETE`.

**Typed columns for core facts, bounded versioned JSONB for event-specific
detail.** Not one JSONB bag, and not thirty globally nullable columns.

**Signing evidence is a subset of audit.** Thirteen event types, not the
frontend's forty.

## Alternatives considered

**One `audit_log` table.** Rejected: retention, visibility and immutability
requirements differ per concern, so a single table forces the strictest rule onto
everything — or, in practice, the loosest. It also makes "which rows are legally
significant evidence" a query rather than a schema fact.

**A trigger rejecting UPDATE and DELETE.** Rejected: a trigger blocks *every*
role, including whichever one must perform legally required erasure (BACKEND-55).
Privileges close the path to the application while leaving a separate privileged
path open. Immutability must not become an obstacle to a legal obligation.

**Repository discipline alone.** Rejected as the only control: it is one
careless method from being untrue, and the property is worth a mechanism that
does not depend on future reviewers.

**A cryptographic hash chain over events.** Deferred, explicitly. The handoff
requires append-only, not tamper-evident chaining. Chaining imposes a total order
on concurrent recipient actions, complicates erasure, and makes migrations
invasive. No blockchain, Merkle tree or ledger — nothing asks for one.

**A `sequence_no` per signing request.** Rejected: safe allocation needs a lock
that serializes concurrent signers, and `(occurred_at, evidence_event_id)`
already gives a total order. OD-026.

**Copying the hashes onto `verification_records`.** Rejected: two independently
writable copies of one digest drift on the first partial write, and the
verification page and seal record must never disagree about what was signed. The
verification record reaches them through `seal_id`.

**Snapshotting actor display names onto every event.** Rejected: it duplicates
PII across the largest table in the system and creates a second thing to erase.
The transaction recipient record is itself historically stable and is the right
place for historical identity.

## Consequences

**Accepted:** the application cannot repair a bad evidence row. A correction is a
new event, which is what append-only means.

**Accepted:** `truncateAll` in tests runs as a superuser, because the runtime
role genuinely cannot delete. A harness able to clean up through the normal role
would mean the control was not real.

**Accepted:** this is an *operational* control. It does not prove a database
administrator could never alter a row, and must not be described as
cryptographic non-repudiation.

**Enabled:** because `seal_scheme`, `seal_version` and `digest_algorithm` are on
every row from the first write, certificate-backed signing can arrive later
without making existing artifacts ambiguous.

**Cost:** `document_id`, `signing_request_id` and `recipient_id` carry no foreign
key, because those tables do not exist yet. Mitigated by requiring each future
parent table to carry `UNIQUE (workspace_id, <id>)`, making the constraint a pure
`ALTER TABLE`. The exact statements are recorded in EVIDENCE_ARCHITECTURE.md §14.

## What would trigger revisiting this

- A requirement for tamper-*evident* evidence, not merely append-only.
- A legal determination that erasure must be physically impossible — which would
  conflict directly with BACKEND-55's obligations and needs resolving, not coding.
- Evidence volume making a single `evidence_events` table impractical, at which
  point partitioning by workspace or time is the answer, not a schema change.
