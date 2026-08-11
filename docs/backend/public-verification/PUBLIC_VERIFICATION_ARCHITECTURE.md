# Public document verification — architecture

**Command:** BACKEND-42 · **Date:** 2026-08-11
**Related:** ADR-034, `final-sealing/VERIFICATION_IDENTITY.md`, INV-628–INV-640

## What is new about this surface

Two endpoints, and they are the only ones in LAGDA reachable with **no
credential of any kind**:

```
GET  /public/verifications/:verificationId              no credential
POST /public/verifications/:verificationId/file-check   no credential
```

Every other public path in the codebase carries something. The signing-access
bootstrap holds a signing credential in its body; the invitation preview holds a
token. These hold nothing but an identifier that authorizes nothing.

That single fact shapes every decision below. There is no session to scope a
rate limit by, no workspace to check, no caller to hold accountable, and no way
to take back a disclosure once a search engine has indexed it.

## The layering

```
packages/api/src/verification/public-verification-routes.ts   HTTP, limits, streaming
packages/api/src/verification/verification-file.ts            bounded hashing
packages/application/src/verification/public-verification.ts  the use case
        -> PublicVerificationLookup (port)                    one query, one row
packages/api/src/security/verification-id.ts                  minting (BACKEND-41 gap)
```

`WorkspaceAccessContext` does not appear anywhere in that stack and must not.
There is no workspace to authorize against: the lookup is keyed by the published
identifier alone, and the projection is assembled from a completion record that
has already been decided to be publishable.

## The two-outcome rule

`PublicVerificationResult` has exactly two members:

```ts
| { outcome: "completed"; view: PublicVerificationView }
| { outcome: "not-found" }
```

Absent, malformed, restricted and not-yet-completed all collapse into
`not-found`, and the route returns one byte-identical body for all four.

This is the single most consequential decision in the command, and it is a
deliberate *departure from the designed product*. The frontend's
`TransactionRecordStatus` has eleven members including `record-found-declined`,
`record-found-cancelled`, `record-found-expired` and `record-found-archived`.
Each of those tells an anonymous caller that a signing request exists and what
state it is in. `record-found-declined` in particular would tell a stranger
holding a leaked reference that a named party refused to sign.

The richer vocabulary remains available to the **authenticated** `/app/verify`
surface, whose caller already holds workspace authorization. It has no place on
an unauthenticated one.

## The projection is curated, never serialized

`PublicVerificationView` is an explicit allowlist of six fields. Nothing arrives
because it happened to be on a row. Deliberately absent: workspace id, signing
request id, document id, artifact ids, completion run id, seal id, storage keys,
signer names, signer emails, IP addresses, user agents, signature
representations, field values, and every evidence event.

`participantCount` is the only thing said about the people involved — how many
acted, never who.

The route re-states the same shape as a TypeBox response schema with
`additionalProperties: false`. Two independent statements of the same allowlist:
a field added to the view without being added to the schema is stripped at the
wire rather than published.

## Ordering: resolve before hashing

The file-check route resolves the reference **first**, and only hashes the body
if the reference is known. An unknown reference therefore costs one indexed row
lookup rather than a full 25 MB SHA-256. An attacker who wants to burn server
CPU has to supply a valid reference, which they are unlikely to hold.

## What this surface structurally cannot do

- **Hand over a document.** Neither route returns bytes, a storage key or a URL,
  and there is no route under `/public/verifications` that could. Verification
  tells you what LAGDA recorded; it does not hand over the file.
- **Enumerate.** There is no listing route and no search route. The identifier
  is ~58 bits of rejection-sampled randomness with no workspace encoded in it.
- **Mutate.** No verb other than GET and the one POST exists. Verification
  changes no business state and writes no evidence event — someone verifying a
  document publicly is not a participant in it.
- **Track.** No cookie is set, no session is read, and `Cache-Control: no-store`
  is returned on both routes.
