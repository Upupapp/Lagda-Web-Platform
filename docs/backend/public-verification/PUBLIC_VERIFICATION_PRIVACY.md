# Privacy posture

**Command:** BACKEND-42 · **Date:** 2026-08-11

## The asymmetry

`/verify` is `isPublic: true` **and** `isIndexable: true` in the product's route
config. Anything this endpoint returns is a candidate for a search index, and a
disclosure through it cannot be withdrawn by later deleting a row.

Every decision below follows from that, not from a general preference for
caution.

## No identity is established, on either side

**The document's signers** are never named. `participantCount` says how many
acted; nothing says who.

**The verifier** is never identified either, and this is the half that gets
forgotten. The routes:

- set no cookie and read no session;
- create no `Document`, `Artifact` or evidence event;
- record no "viewed" fact against the signing request.

Someone verifying a document publicly is **not a participant in it**. A
verification lookup must not appear in the audit trail as though a party had
opened the document, and a workspace owner must not be able to learn from the
evidence record that a third party checked their document.

## Caching

`Cache-Control: no-store` on both routes.

The record is immutable, so caching the metadata would be *safe* in the ordinary
sense. It is refused anyway: a shared proxy holding verification responses is a
privacy surface nobody has reviewed, and the disclosure model is too young to
start distributing copies of it. Revisit when it is mature, not before.

## Telemetry

Two counters, with bounded labels only:

```
public_verification_requests_total     { result, mode }
public_verification_file_checks_total  { result, mode }
```

`result` ranges over `completed | not-found | match | mismatch | too-large |
invalid`. The **verification identifier is never a metric label** — it is
unbounded cardinality and it is also the one piece of caller-supplied data on
this surface. Nor is the caller's IP, nor any digest.

Uploaded bytes, their digest, and the document's digest are never logged.

## What an anonymous caller can learn, in total

Given a valid reference they already hold: that a completed LAGDA record exists,
when LAGDA completed it, how many parties acted, the completed document's
SHA-256, and the seal's scheme and version.

Given a file as well: whether that file is byte-identical to the completed one.

Given anything else — an invalid reference, a valid-looking one they guessed, a
reference to a cancelled or in-progress request — a single `404` that is
byte-identical in all cases.
