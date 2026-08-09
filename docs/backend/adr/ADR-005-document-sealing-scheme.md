# ADR-005 — Hash-evidence sealing, with a versioned seam for signatures

**Status:** Accepted · **Date:** 2026-08-09 · **Command:** BACKEND-09
**Supersedes:** nothing · **Related:** ADR-001, OD-013, OD-022, OD-023

## Context

LAGDA must produce a final, distributable artifact when a signing request
completes, plus a verification story for the public verification page.

The obvious question is whether that artifact carries a cryptographic signature —
PAdES, PKCS#7, an X.509 certificate from a recognised authority, an RFC 3161
timestamp, keys in an HSM.

**The specification does not ask for any of it.** The backend integration handoff
contains zero occurrences of PAdES, PKCS, X.509, HSM, PNPKI or RFC 3161. That was
checked by search, not assumed; the fifteen matches elsewhere in `docs/` are all
in documents written during this backend effort, each stating that no PAdES is
required.

What the specification does ask for (§15): store the original PDF, the signed
PDF, a completion certificate and an evidence log; issue a verification ID of the
form `LAGDA-{workspace}-{date}-{random}`.

Meanwhile eNotary — where accreditation and certificate requirements would
plausibly arrive — is Coming Soon and Subject to Supreme Court Accreditation and
applicable rules. Its requirements are not knowable today.

## Decision

**Seal scheme `hash-evidence`, version 1, SHA-256.**

Completion produces a sealed PDF with fields rendered, a separate completion
certificate, and two named digests. Integrity rests on LAGDA holding the digest
of the exact distributed bytes plus the evidence log — not on an offline-
verifiable signature.

**Every artifact records how it was sealed** — `sealScheme`, `sealVersion`,
`digestAlgorithm` — from the first record written.

**One seam.** `DocumentSealer.seal()` is the entire application-facing surface.

## Alternatives considered

**Implement PAdES now.** Rejected: nothing requires it, and the choices it forces
— which CA, revocation strategy, timestamp authority, key custody, whether keys
are per-workspace or per-platform — are unanswerable without a legal position.
Guessing produces a scheme that has to be migrated away from, and the migration
is worse than the absence because artifacts already exist under it.

**Defer sealing entirely.** Rejected: completion cannot ship without a final
artifact, and building it later without the seam is how the PDF library ends up
imported in six places.

**Abstract at a lower level** — ports for `PdfMerger`, `Hasher`,
`CertificateRenderer`. Rejected: three seams with one implementation and one
caller each. This codebase has already shipped decorative architecture once —
`RouteMeta.status`, declared on 225 routes and read by no code, which drifted
until three routes misreported themselves.

**Append the certificate to the sealed document.** Rejected: it changes the
signed document's page count, so the file delivered is not the file participants
signed. Handoff §15 stores them separately in any case.

## Consequences

**Accepted:** the artifact is not independently verifiable offline. Anyone
holding the PDF must ask LAGDA whether it matches. This is a genuine limitation
of `hash-evidence` and is stated in the sealing documentation rather than
implied.

**Accepted:** verification depends on LAGDA's evidence store surviving. A
signature would not.

**Enabled:** because the scheme is recorded per artifact, a second scheme can be
introduced without making existing artifacts ambiguous. This is the single most
important property of the decision and it costs nothing today.

**Enabled:** a Java or .NET signing service replaces `NodeDocumentSealer` by
implementing one interface. Enforced by lint and by architecture tests, each
verified by deliberate violation. What is *not* free is recorded honestly in
REMOTE_SIGNER_MIGRATION.md — latency, retry policy, and who renders the
certificate (OD-023).

**Cost:** documents are held in memory (OD-024). That is the price of passing
bytes rather than storage references, which is what keeps a remote signer
ignorant of LAGDA's storage topology.

## What would trigger revisiting this

- eNotary accreditation defining certificate requirements (OD-013).
- A customer or regulator requiring offline verification.
- A requirement to prove *when* something was signed to a third party, which
  needs a timestamp authority.

In each case `sealVersion` increments and `sealScheme` gains a member. Existing
artifacts stay interpretable.
