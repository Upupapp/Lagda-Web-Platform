# ADR-034 — Public document verification

**Status:** Accepted (BACKEND-42, 2026-08-11)
**Related:** ADR-005, ADR-033, OD-168, OD-169, OD-170, `public-verification/*`

## Context

BACKEND-41 made completion real: a signing request can now reach `completed`,
and each completion mints exactly one `VerificationId`. Nothing consumed it. The
product, meanwhile, has had a designed, public, **indexable** `/verify` route
since long before any backend existed — with a mock service, demo identifiers,
and a status vocabulary of eleven members.

So unlike BACKEND-40 and BACKEND-41, this command did not have to invent a
product surface. It had to decide how much of an already-designed one may
truthfully and safely be made real.

Two things make that decision unlike every other route in LAGDA.

**There is no caller.** These are the only endpoints reachable with no
credential of any kind — not an account, not an invitation, not a signing link.
There is no session to scope a rate limit by, no workspace to authorize against,
and nobody to hold accountable for a request.

**Disclosure is irreversible.** `isIndexable: true` means anything returned here
is a candidate for a search index. Deleting a row later does not undelete a
search result.

## Decision

**Expose exactly one thing — that a completed record exists and what its bytes
hash to — through a curated projection with two outcomes, and structurally
prevent the surface from doing anything else.**

```
GET  /public/verifications/:id              -> completed | not-found
POST /public/verifications/:id/file-check   -> compared(matches) | not-found
```

Five properties carry it.

### 1. Two outcomes, not eleven

`PublicVerificationResult` is `completed | not-found`. Absent, malformed,
restricted and not-yet-completed all collapse into one byte-identical response.

This is a **deliberate departure from the designed product**, and the decision
in this ADR most worth revisiting with product input (OD-168). Seven of the
frontend's eleven statuses — `record-found-declined`, `-cancelled`, `-expired`,
`-archived` and others — confirm to an anonymous caller that a signing request
exists and report its state. `record-found-declined` tells a stranger holding a
leaked reference that a named party refused to sign.

A caller who can distinguish "no such reference" from "exists but is not
completed" holds an oracle for other people's documents. The richer vocabulary
stays available to the authenticated `/app/verify` surface, whose caller already
holds workspace authorization.

### 2. A curated projection, never a serialized row

Six fields, chosen individually, stated twice — once as
`PublicVerificationView`, once as a TypeBox response schema with
`additionalProperties: false`. A field added to one without the other is
stripped at the wire rather than published.

`participantCount` is the only thing said about people: how many, never who.

Notably excluded is `originalDocumentHash`, which is on the record and would be
easy to include. It identifies the file *before* signing, and publishing it
would let a holder of the original confirm that it became a completed LAGDA
document — a disclosure about a transaction they may no longer be party to.

### 3. The comparison is a byte comparison, and nothing more

The uploaded file is streamed through SHA-256 and discarded. It creates no
`Document`, no `Artifact`, no object, and is never written to disk. It is also
**never parsed** — no PDF library, no rendering, no text extraction. Comparing
bytes needs none of that, and each would be a path by which a stranger's file
reaches code that does something other than add to a digest.

The digest is computed server-side. A client-supplied hash is a claim about a
file nobody checked.

A mismatch is a **200**: the comparison succeeded, the bytes differ. It is not
an error, and it is not evidence of forgery — the commonest cause is a viewer
that re-saved the PDF.

### 4. The identifier is unguessable but not a credential

Ten characters over a 55-character alphabet, rejection-sampled — about 58 bits.
Not cryptographic-key strength, and it does not need to be: possessing one
permits a curated public lookup and nothing else.

It excludes `0`, `O`, `1`, `I`, `l` and `_`, because the reference is read
aloud, printed, and typed back in. **The workspace is deliberately not encoded**
— a tenant-derived prefix would let anyone holding two references tell whether
they came from the same tenant.

### 5. The surface cannot grow into a download

There is no route under `/public/verifications` that returns bytes, a storage
key or a URL; no listing route; no search route; no mutating verb. The tests
assert each absence directly rather than trusting that nobody will add one.

## Consequences

**Accepted.** A member of the public with a valid reference learns strictly
less than the designed UI would have shown. Someone checking why a document
"isn't verifying" gets no explanation — by design, because the explanation is
tenant state.

**Accepted.** No caching, so every lookup is a database read. The record is
immutable and caching would be safe in the ordinary sense; it is refused until
the disclosure model is mature enough to distribute copies (OD-170).

**Gained.** The two-outcome shape means a future contributor cannot casually
widen disclosure: adding a state to the response requires adding a member to a
union that currently has two, which is a visible decision rather than a field
appended to a serializer.

**Closed.** `VerificationIdGenerator` had no implementation anywhere;
BACKEND-41's tests passed on an inline stub. This ADR's fourth property is that
gap being closed.

**Still open, and larger than this ADR.** Implementing the generator does not
make it reachable: nothing *constructs* it, and nothing constructs
`createPublicVerificationLookup` either. The §284 audit traced that to
`createProductionDependencies`, which supplies only `databaseHealth` while
`create-app` gates seven feature families on optional dependencies. The routes
this ADR describes are therefore complete, tested, and **not served by a
production process** — along with every other feature route in the backend.
Recorded as OD-171; deliberately out of scope here, because the partial fix
would make an anonymous public surface the only route production serves.
