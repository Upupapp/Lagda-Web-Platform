# Upload Architecture — BACKEND-18

## The lifecycle

```
receive (bounded)
  → QUARANTINE          untrusted bytes, private bucket
  → hash                SHA-256 of exactly those bytes
  → inspect             real content detection + real PDF parse
  → SCAN                real ClamAV, over INSTREAM
  → promote             copy to the immutable artifact key, digest re-verified
  → commit              artifact row + upload status, ONE short transaction
  → cleanup             delete quarantine, best effort
```

Every stage operates on the **same quarantined bytes**, so "what was scanned",
"what was hashed" and "what was stored" cannot diverge.

**The pipeline fails closed at every branch.** A file is accepted only by
reaching the end. There is no path where an error, a timeout, an unrecognised
scanner reply or an unexpected state produces acceptance.

## Processing mode: SYNCHRONOUS

The HTTP request stays open through the whole pipeline.

**Why.** The maximum document is 25 MB; a real clamd scan of that size over a
local socket is well under a second in measurement here. More decisively, an
asynchronous pipeline needs an upload-status resource, a polling contract and a
client that understands "processing" — none of which exist, and inventing them
would be inventing product API ahead of BACKEND-29.

**What this costs.** A slow scanner holds a request. The scan is bounded by
`MALWARE_SCANNER_TIMEOUT_MS` (default 30 s) so it cannot hold one indefinitely,
and a timeout fails closed. If real-world scan latency or document sizes grow,
the pipeline moves to the BACKEND-16 queue with `{ workspaceId, uploadId }` as
the payload — never bytes. Recorded as OD-057.

## Trust boundary

**Everything the client sends about the file is untrusted:**

| Client says | LAGDA uses |
|---|---|
| `filename` | Display metadata only. Never a key, never a type signal. |
| `.pdf` extension | Nothing. |
| `Content-Type: application/pdf` | Recorded for diagnosis. Never for acceptance. |
| `Content-Length` | Nothing — the streamed byte count is enforced. |
| any hash | Nothing. The backend computes SHA-256. |
| a `workspaceId` form field | **Nothing.** Identity comes from the session. |

The route reads identity from the authenticated context and never from the body.
It cannot do otherwise: `attachFieldsToBody` is false, so `request.body` does not
exist on this route.

## Request order

```
rate limit → session → CSRF → workspace authorization → multipart → pipeline
```

Everything before `multipart` is an `onRequest` hook and rejects without reading
a byte. That ordering is what stops LAGDA being used as a free malware-scanning
and PDF-parsing service by anonymous callers. Proven by test: an unauthorized
request writes zero objects and performs zero scans.

**Session, CSRF and rate limiting are not wired to this route yet**, because the
route is test-only — see below. The hooks exist (BACKEND-13, BACKEND-15) and the
ordering is a route-registration concern for BACKEND-29.

## Multipart bounds

| Limit | Value | Why |
|---|---|---|
| `fileSize` | 25 MB (configurable) | Handoff §7 suggests 25 MB; it is not decided (OD-056) |
| `files` | **1** | An extra file is refused, never ignored |
| `fields` | 10 | Bounded text parts |
| `fieldSize` | 4 KiB | |
| `parts` | 15 | |
| `headerPairs` | 200 | |

A second file is refused with `422 TOO_MANY_FILES`. It was previously reported
as `413 file too large`, which is simply the wrong cause and would send a user
to shrink a file that was never the problem.

## The route is TEST-ONLY

`POST /documents` is **P0-16** in the implementation priority — a Documents
phase endpoint, which BACKEND-29 owns. This command registers the pipeline
behind a test route so it can be exercised end to end, and stops there.

Shipping the product route now would mean returning a document identity before
a document model exists. `documentId` is therefore supplied by the caller of
`registerUploadRoute`, not invented by the route.

## Buffering, stated plainly

**The file is held in memory, bounded by the maximum upload size. It is not
streamed to quarantine.** Two things force this:

- `ObjectContent`'s stream variant requires `contentLength` up front, and a
  multipart upload supplies no length that may be trusted. Streaming an unknown
  length needs S3 multipart, which would change the BACKEND-17 storage contract.
- PDF structural inspection needs the cross-reference table at the **end** of the
  file, so inspection buffers regardless.

The cost is bounded: 25 MB per upload in flight. The bound is enforced before
any allocation grows past it, and an oversized upload is **abandoned rather than
drained** — continuing to receive bytes already refused is free work for an
attacker. Recorded as OD-058 rather than described as streaming.

## Promotion

**Stream-and-re-put**, not server-side copy.

A server-side `CopyObject` would be cheaper, but it would require exposing a
generic copy capability on the storage port — precisely the "promote arbitrary
key" primitive that must not exist — and it would move bytes LAGDA never
re-examined. Re-reading and re-hashing means the accepted artifact's digest is
**verified against the bytes actually written**, not merely inherited.

If the digest has changed between the scan and the copy, promotion fails with
`integrity-failure` and no artifact is created. That is the time-of-check to
time-of-use window, closed.

## Separation of concerns

| Capability | Owns | Does NOT |
|---|---|---|
| `DocumentInspector` | type detection, structure, page count | say anything about malice |
| `MalwareScanner` | malicious content | say anything about usability |

Neither answers the other's question. A structurally perfect PDF can carry a
dropper; a corrupt file is unusable whether or not it is infected. Merging them
would let one passing imply the other — proven by a test where a **valid PDF
containing the EICAR pattern** passes inspection and is caught only by the
scanner.

## Where each piece lives

| Concern | Package | Why there |
|---|---|---|
| Ports, pipeline | `@lagda/application` | no framework, no SDK, no parser |
| PDF inspection | `@lagda/sealing` | INV-001 confines pdf-lib to one package |
| Malware scanning | `@lagda/scanning` | new adapter package, ClamAV confined |
| Multipart | `@lagda/api` | the only place a web framework belongs |
| Upload records | `@lagda/db` | tenant-scoped, in the unit of work |

All four boundaries are ESLint-enforced.
