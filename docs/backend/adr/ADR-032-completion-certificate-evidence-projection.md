# ADR-032 — The completion certificate as a curated evidence projection

**Status:** Accepted (BACKEND-40, 2026-08-11)
**Related:** ADR-031, OD-162, OD-167, `completion-certificate/*`

## Context

LAGDA needs a human-readable record of a signing transaction. The danger is not
that it is hard to render — it is that a certificate is read as *evidence*, so
every way of building it that is convenient is also a way of quietly rewriting
history.

Two facts framed this decision.

**The product has no certificate, and denies having one.** The word
"certificate" appears in the LAGDA frontend exactly twice, both times in
disclaimers: "No verification certificate, no 'court-admissible' claims"
(`CompletionPage.tsx:5`) and "It does not constitute a legal certificate or
court-admissible document" (`TransactionDetailPage.tsx:674`). There is no
download, tab or status anywhere. The certificate exists because handoff §15
stores three artifacts and BACKEND-41 needs the third.

**A renderer already existed**, called from inside `DocumentSealer.seal()`, and
it made four claims it had no right to make once lifted into its own step —
"Completed", "Sealed", a verification ID, and a hash labelled "Prepared document
SHA-256" naming an artifact kind LAGDA has never produced.

## Decision

**Build the certificate from authoritative immutable facts, through a curated
versioned model, rendered by a controlled server renderer, into an immutable
artifact.**

```
immutable snapshots + accepted submissions + ceremony/consent facts
  -> CompletionCertificateModelV1   (curated, versioned, fails closed)
  -> CompletionCertificateGenerator (controlled renderer, server fonts)
  -> completion-certificate artifact (new id, private storage, SHA-256)
```

Four properties carry the decision.

### 1. The model is a whitelist, not a view

Nothing reaches the page because it happened to be in a row. The model carries
name, masked email, authentication method, ceremony entry, consent, signed time
— and structurally *cannot* carry IP, user agent, device data, signature
representations, field values, seal metadata, a verification id, a final digest
or `completedAt`.

This is the primary enforcement, and it had to be, because the obvious runtime
check does not work: certificate text is **not byte-searchable** (the embedded
font encodes glyph indices into a compressed stream), so
`expect(bytes).not.toContain("Sealed")` passes vacuously. A field the type
cannot express is a field the renderer cannot draw.

### 2. Authentication describes a mechanism, never an identity

`link-only` renders as "Signing link"; `email-otp` as "Email one-time
passcode". Neither is ever "Verified". The wording is a total `Record` over the
closed vocabulary, so a new mechanism cannot inherit another's description
through a `default` branch — and the most likely default for a
security-adjacent field is the reassuring one.

Both the builder and the renderer fail closed on an unknown method, terminally.

### 3. Facts bind through the accepted submission

`recipient_submissions` carries `authentication_method` and `consent_id`
directly, so the certificate reports the method and consent belonging to *the
signature that exists* — not the recipient's most recent authentication. A
signer who later authenticated more strongly in another session is still
certified under the one they signed with.

All facts are gathered in ONE query, so the same-recipient/same-request
correlation is enforced by a join rather than by application code.

### 4. No circular dependencies

The certificate is produced BEFORE sealing, so it cannot contain the final
sealed digest, seal metadata, or `completedAt` — and it does not pretend to with
a placeholder. Its own digest is artifact metadata, never inside its own bytes.

## Alternatives rejected

**Build from current Contacts and user profiles.** The convenient option, and
the one that silently rewrites history: renaming a contact after signing would
change who a completed document says signed it. Immutable request snapshots are
the whole point of BACKEND-32/33.

**Dump the evidence event store into the PDF.** Generic evidence carries user
agents, internal identifiers and security events. A certificate is the artifact
most likely to be forwarded to third parties, so an automatic projection is a
privacy leak waiting for its first unusual event type. BACKEND-43 owns the
comprehensive audit trail; this is the curated summary, and the two are
different documents on purpose.

**Generate it in the browser.** A certificate the client produces is a
certificate the client controls. Authoritative evidence is server-produced or it
is not evidence.

**Keep rendering it inside `seal()`.** This is what existed, and it is why the
four false claims were there — inside sealing, "Sealed" and "Completed" were
true. Splitting it out is what makes them unsayable. OD-167.

## Consequences

- `seal()` no longer returns a certificate. `SealResult.completionCertificate`,
  `SealRequest.evidence` and the `CompletionEvidence` shapes are removed rather
  than left unread — a field nobody consumes invites the next implementer to
  start consuming it.
- Two versions are recorded, `certificateVersion` and `rendererVersion`, so a
  layout change cannot masquerade as a change in certified facts.
- Recipient email is **masked** on the certificate (owner decision): the name
  identifies the signer, and the full value stays in the immutable snapshot.
- The merged candidate's digest is **internal provenance only** (owner
  decision): two similar hashes on one page invite comparing the wrong one.
- BACKEND-41 receives two immutable artifacts and must regenerate neither.
