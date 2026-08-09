# ADR-012 — S3-compatible object storage behind an application-owned port

**Status:** Accepted
**Date:** 2026-08-09
**Command:** BACKEND-17

## Context

LAGDA stores PDFs: uploaded originals, sealed finals, completion certificates.
They are signing evidence — immutable, integrity-checked, and in some cases the
only record that a transaction occurred.

BACKEND-10 already established that PostgreSQL holds artifact metadata: digest,
size, media type, provenance, ownership, and a `storage_reference` column that
until now had no defined contents. BACKEND-09 established that the sealer
produces exact bytes whose SHA-256 is computed before storage. BACKEND-16
established that job payloads carry identifiers, never bytes.

What was missing: where the bytes actually live.

## Decision

**Private S3-compatible object storage, behind an `ObjectStorage` port owned by
`@lagda/application`, implemented in `@lagda/storage` over `@aws-sdk/client-s3`.**

Two zones (`quarantine`, `artifacts`) mapped to two buckets. Keys derived from
LAGDA identifiers. `AsyncIterable<Uint8Array>` as the binary abstraction. No
presigned URLs yet.

## Alternatives considered

**PostgreSQL blobs (`bytea` or large objects).** Genuinely tempting: it would
make artifact metadata and bytes atomic, which removes the entire failure-window
problem below. Rejected because document bytes would then sit in every backup,
every replica and every restore of the transactional database — turning a 50 MB
database into a 50 GB one, making backups slow enough to skip, and putting
multi-megabyte payloads through the connection pool that also serves requests.
The atomicity is real and the cost is worse.

**Local filesystem.** Simplest, and adequate for one server. Rejected because it
makes a second application instance impossible without shared storage, makes
backup a separate manual problem, and would have to be replaced before the first
horizontal scale — while holding the only copy of legally significant documents.

**A provider-specific API (Linode Object Storage's own SDK, or similar).**
Rejected for the reason the whole port exists: it would put a vendor type in the
application layer, and the production provider is not yet chosen (OD-050).

**S3-compatible, chosen.** Deployable against AWS S3, Linode Object Storage,
MinIO, Wasabi and others with a configuration change and no code change.

## Consequences

**Good**

- Bytes leave the transactional database. Backups stay proportional to metadata.
- The provider is a deployment decision, not an architectural one. Proven by
  running the same adapter and the same contract suite against MinIO.
- Documents can be streamed without buffering, which BACKEND-18 needs.
- Object storage decides no authorization, so tenancy stays in one place — the
  tenant-scoped repository — rather than being partially delegated to a prefix.

**Costs and constraints**

- **Storage and PostgreSQL are not transactionally atomic, and never will be.**
  Two failure windows exist. Bytes-first ordering makes the worse one (metadata
  pointing at nothing) avoidable; the milder one (an orphan object) is accepted
  and reconciled later. No code in this repository claims otherwise.
- **Create-once is not provider-atomic.** Measured: MinIO accepted six
  concurrent conditional creates of the same key. The guarantee rests on
  globally unique artifact ids, with the conditional and a HEAD check as guards
  against retries and mistakes. If artifact ids ever became content-derived or
  reusable, this decision would need revisiting.
- **S3-compatible is a family, not a standard.** Conditional requests,
  checksums, versioning and presigning all differ. Only broadly supported
  operations are used, and the tested subset is recorded in
  STORAGE_TEST_MATRIX.md.
- **A second system to secure, back up and pay for**, with its own bucket
  policy, credentials and retention. BACKEND-60 must cover object durability and
  restore verification separately from PostgreSQL backups.
- **Region and provider are unresolved** and carry the same data-residency
  review as the database (OD-050).

## Revisit when

- The production provider is chosen and its conditional-write and versioning
  behaviour can be measured for real.
- A download path needs presigned URLs for performance rather than streaming
  through the API.
- Retention or erasure requirements make object lock or versioning a legal
  question rather than an operational one.
