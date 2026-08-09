# ADR-013 — Quarantine-first secure upload pipeline

**Status:** Accepted
**Date:** 2026-08-09
**Command:** BACKEND-18

## Context

LAGDA accepts PDFs from browsers and turns them into immutable signing evidence.
The uploader may be a workspace owner, and that changes nothing: a workspace
owner can upload malware by accident just as easily as an attacker can on
purpose.

Handoff §7 requires virus/malware scanning and §320 requires "magic byte check +
AV scan". BACKEND-17 provided quarantine and accepted-artifact storage zones,
immutable artifact semantics and a provider-neutral storage port. BACKEND-10
defined artifact metadata and integrity records. What was missing: the boundary
where untrusted bytes become a trusted artifact.

## Decision

**Authenticated and authorized upload → quarantine → server-side content
inspection → SHA-256 → mandatory malware scan → promotion to an immutable
accepted artifact → short metadata transaction.**

Synchronous processing. ClamAV over `INSTREAM` behind a `MalwareScanner` port.
PDF inspection behind a `DocumentInspector` port, implemented in
`@lagda/sealing` because pdf-lib already lives there.

## Alternatives considered

**Browser uploads directly to the accepted bucket (presigned PUT).** Cheapest
for LAGDA's servers, and genuinely attractive at scale. **Rejected**: it puts
unvalidated bytes in the immutable zone by construction. Size enforcement,
completion notification, scan triggering and orphan cleanup all become
callback-shaped problems, and until the scan completes the object is sitting
where accepted artifacts live. Revisit only with a quarantine bucket and a
completion callback, which is a different design.

**Validate by extension and `Content-Type`.** What most upload endpoints do.
**Rejected outright**: both are attacker-chosen strings. Tested — an HTML file
named `contract.pdf` and declared `application/pdf` is refused.

**Scan after acceptance, asynchronously.** Faster responses. **Rejected**: there
is a window where an accepted artifact is malware, and everything downstream —
preparation, sending, signing — treats accepted artifacts as trusted. A signing
request could reach a recipient before the scan returned.

**Quarantine + validation + AV, synchronously.** Chosen.

**Asynchronous processing via the queue.** Genuinely better under load, and
BACKEND-16 makes it available. **Deferred**: it needs an upload-status resource
and a polling contract that the frontend does not have, and building both would
invent product API ahead of BACKEND-29. The payload shape is already known —
`{ workspaceId, uploadId }`, never bytes (OD-057).

## Consequences

**Good**

- No file becomes an artifact without passing every check. The pipeline fails
  closed at every branch, verified by nine probes.
- The scanner, the parser and the storage provider are all replaceable behind
  ports.
- The digest recorded in PostgreSQL describes exactly the bytes in object
  storage, re-verified during promotion.
- A rejected upload leaves a durable record of *why*, which is what an incident
  review needs.

**Costs and constraints**

- **A request is held for the whole pipeline.** Bounded by the scan timeout, but
  a slow scanner is a slow upload.
- **The file is buffered, not streamed** — bounded at 25 MB per upload in
  flight. Stated in the architecture rather than glossed (OD-058).
- **Bytes are transferred twice** (quarantine, then promotion). That is the price
  of re-verifying the digest against the bytes actually written, and it is the
  right trade for evidence.
- **ClamAV becomes a hard production dependency.** No scanner means no uploads.
  That is deliberate — the alternative is uploads that are unscanned — but it
  makes scanner availability and signature freshness operational obligations
  (OD-060).
- **Active PDF content is not removed.** AV plus parsing is not sanitization, and
  the codebase does not claim otherwise (OD-059).
- **Two orphan windows remain** where an object outlives its row. Both leave
  private, unreferenced objects; neither is auto-reconciled (OD-061).

## Revisit when

- Measured scan latency or document size makes a synchronous request untenable.
- The frontend gains an upload-status UI, which makes the asynchronous pipeline
  cheap.
- A sanitization requirement arrives, which introduces a *second* artifact rather
  than rewriting the first.
