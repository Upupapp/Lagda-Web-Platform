# Public document verification — product inventory

**Command:** BACKEND-42 §0 · **Date:** 2026-08-11
**Method:** read the LAGDA frontend and the backend as they stand. No public
disclosure invented.

## Unlike BACKEND-40 and 41, the product HAS designed this

`/verify` is a real, public, indexable route — `config/routes.ts:302`:

> `path: "/verify"`, `layout: "public"`, `requiresAuth: false`, `isPublic: true`,
> `isIndexable: true`, `status: "implemented"`,
> *"Verify the authenticity of a LAGDA-signed document using a Verification ID
> or QR code."*

It is linked twice from the public navigation, and there is an **authenticated**
counterpart at `/app/verify` whose own header says it *"Extends the public
/verify experience with richer private context for signed-in users."*

So the product answers §1 directly: **both an ID lookup and a file comparison**,
with a public tier and a richer authenticated tier.

## But everything behind it is SIMULATED

`VerifyPage.tsx` imports `verificationService` from `services/mock/`, and
`DEMO_VERIFICATION_IDS` from `data/mock/`. The status labels say so out loud:

| Value | Label |
|---|---|
| `match` | "File Comparison — **Simulated** Match" |
| `mismatch` | "File Comparison — **Simulated** Mismatch" |

And the page's own header states the constraints it is currently under:

> - Never claim a real verification lookup occurred.
> - Never claim a file was uploaded, hashed, or stored.
> - Never claim cryptographic proof exists.
> - Do not equate found record with matching file.
> - Do not equate matching file with legal validity.
> - Do not equate electronic signing with notarization.

Those last three are not scaffolding — they are the semantics BACKEND-42 must
preserve when it makes the page real. The mock was written by someone who had
already thought about the overclaim problem.

## The finding that changes the implementation

**The product's designed status vocabulary discloses more than the command
permits, and I must not implement it as designed.**

`TransactionRecordStatus` has eleven values, including:

```
record-found-in-progress    record-found-draft       record-found-cancelled
record-found-voided         record-found-expired     record-found-declined
record-found-archived
```

Each of those tells an anonymous caller that a signing request **exists** and
what state it is in. That is tenant information disclosure through a public,
unauthenticated, rate-limited-at-best endpoint:

- §21 — public verification should expose only successfully completed records.
- §22 — a non-completed request "must not verify publicly".
- §19 — avoid distinctions like "this ID existed but was deleted".

A `record-found-declined` response would tell a stranger holding a leaked
verification reference that a named party refused to sign. Nothing in the
completed-document verification use case requires that.

**Resolution:** the public API returns exactly two outcomes —
`record-found-completed` and `record-not-found`. The vocabulary's other values
remain available to the **authenticated** `/app/verify` surface, where the
caller already has workspace authorization and the disclosure is not a leak.
The frontend keeps its union; the public projection uses two members of it.

`record-restricted` already exists in the product's own vocabulary, which
suggests this concern was anticipated.

## The backend already has the read model

| Component | Status |
|---|---|
| `PublicVerificationLookup` port | **EXISTS** — `findByVerificationId` and nothing else. No list, no search |
| `PublicVerificationProjection` | **EXISTS** — an explicit allowlist, built by naming fields |
| `createPublicVerificationLookup` | **EXISTS** in `db/repositories/evidence.ts` |
| A route serving it | **DOES NOT EXIST** — `packages/api/src` has no verification directory and no `/public` namespace |

The existing projection carries `verificationId`, `completedAt`,
`participantCount`, `signedDocumentHash`, `originalDocumentHash`,
`digestAlgorithm`, `sealScheme`, `sealVersion`.

Note `originalDocumentHash` is now correct: BACKEND-41 wired it from the frozen
source artifact, so publishing it is safe. Had the §0 trap of that command not
been caught, this projection would have published the merged candidate's digest
as the original's.

## ⚠ The blocker: no VerificationId generator exists

**`VerificationIdGenerator` has no implementation anywhere** — not in
`packages/db`, not in the API bootstrap, not even in the test fakes. Only the
port, and the one call site BACKEND-41 added.

Its own comment states the requirement:

> *"this value is published, so it must be unguessable. An entity ID only has to
> be unique. Merging them would let a routine ID generator quietly become the
> source of a public secret-adjacent value."*

Two consequences, and the first is not BACKEND-42's problem to discover:

1. **BACKEND-41's finalization cannot actually run in production yet.** It
   injects `nextVerificationId` and nothing supplies it. My final-seal tests
   pass because the harness stubs it inline. This is the same class as OD-069 —
   ports whose only implementations are test ones.
2. **BACKEND-42's anti-enumeration requirement (§7, §104) is unmet until that
   generator exists and is measured**, because the thing being protected does
   not yet exist.

**And the product's format may be too weak.** `VER_ID_RE =
/^LAGDA-VER-\d{4}-\w{4,10}$/i` allows as few as 4 alphanumerics after a year —
roughly 1.7 million values at the low end, which is enumerable at any plausible
public rate limit. If that regex is authoritative for display, the generator
must produce values at the **upper** end of it, and even 10 alphanumerics
(~10^15) should be checked rather than assumed sufficient.

This is the one item that must be resolved before `/verify` can be public, and
it belongs to whoever writes the generator — not to the endpoint that consumes
it.

## Classification

| Item | Class | Basis |
|---|---|---|
| VERIFICATION ID LOOKUP | **IMPLEMENT_NOW** | `/verify` is a real public route; the port and read model exist |
| FILE UPLOAD HASH CHECK | **IMPLEMENT_NOW** | `FileComparisonRequest`/`Result` and nine `FileMatchStatus` values are already designed |
| ID + FILE COMBINED | **IMPLEMENT_NOW** | The product's flow is ID first, then optional file — which is also §86's narrower model |
| FINAL SHA-256 | **IMPLEMENT_NOW** | Already in the projection; not a credential |
| SEAL SCHEME / SEAL VERSION | **IMPLEMENT_NOW** | Already in the projection |
| COMPLETED AT | **IMPLEMENT_NOW** | Already in the projection |
| PUBLIC SIGNER NAMES | **DEFER** | The projection deliberately carries `participantCount`, not names. §35's baseline is "no signer PII"; nothing in the public page needs more, and adding names to a public endpoint is not reversible once indexed |
| PUBLIC SIGNER EMAILS | **NOT_IN_PRODUCT** | §36 default, and BACKEND-40 already masked them on the certificate for the weaker case of a forwarded file |
| PUBLIC AUDIT SUMMARY | **DEFER** | BACKEND-43 owns the audit trail. `EvidenceAvailabilitySummary` exists in the model but says only whether events *exist* — a separate decision |
| CERTIFICATE DOWNLOAD | **NOT_IN_PRODUCT** | §54 default. Verification does not imply download |
| FINAL DOCUMENT DOWNLOAD | **NOT_IN_PRODUCT** | §55 default, and BACKEND-41's inventory already found the product disclaims delivering files |
| QR CODE | **DEFER** | The route description mentions QR, but BACKEND-41 put no QR in the sealed document, so nothing generates one yet. The endpoint serves the same lookup either way |
| HASH-ONLY REVERSE LOOKUP | **NOT_IN_PRODUCT** | §85/§87. Would let anyone probe whether LAGDA holds a document by hash |

## What this inventory obliges BACKEND-42 to do

1. **Mode: `ID_AND_FILE_HASH_CHECK`** — both, ID first.
2. **Return only two public outcomes.** Completed, or not found. Never
   in-progress, cancelled, declined, expired or archived.
3. **No signer PII.** `participantCount` is the disclosure; names are not.
4. **Check the verification ID's real entropy** against the product's regex
   before the endpoint goes public.
5. **Preserve the mock page's stated semantics** — a found record is not a
   matching file, and a matching file is not legal validity.
6. **Serve `/verify` and `/app/verify` from the same lookup**, with the
   authenticated tier free to disclose more because its caller is authorized.
