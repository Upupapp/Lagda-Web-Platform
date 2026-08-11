# Data classification — public verification

**Command:** BACKEND-42 · **Date:** 2026-08-11

Every value reachable from the completion record, classified by whether it may
cross the public boundary. `PublicVerificationView` is the allowlist; this table
is the reasoning.

| Value | Class | Public? | Reason |
|---|---|---|---|
| `verificationId` | Published identifier | **Yes** | The caller supplied it; ~58 bits, authorizes nothing |
| `completedAt` | Record fact | **Yes** | LAGDA's completion instant, not a person's action time |
| `participantCount` | Aggregate | **Yes** | How many, never who |
| `signedDocumentHash` | Integrity value | **Yes** | The value a holder's copy must hash to; public by construction |
| `sealScheme` / `sealVersion` | Scheme metadata | **Yes** | Describes the process, not the parties |
| `originalDocumentHash` | Integrity value | **No** | Identifies the pre-signature file; would confirm a transaction to a holder of the original |
| Workspace id / name | Tenant identity | **No** | Would link references to a tenant; also not encoded in the identifier itself |
| Signing request id | Internal identity | **No** | Enumerable surface into authenticated routes |
| Document id / title / filename | Tenant content | **No** | A filename routinely carries counterparty, matter and amount |
| Artifact ids, storage keys, bucket | Storage internals | **No** | Would imply a retrieval path that must not exist |
| Completion run id, seal id | Internal identity | **No** | Pipeline internals |
| Recipient names | Personal data | **No** | Indexable and irreversible |
| Recipient email addresses | Personal data | **No** | Same, plus a spam and phishing vector |
| Per-signer timestamps | Behavioural data | **No** | Discloses individual conduct |
| IP addresses, user agents | Behavioural data | **No** | Evidence-record only |
| Signature images / typed values | Personal data | **No** | Reusable representation of a person's signature |
| Field values | Tenant content | **No** | Arbitrary document content |
| Evidence events | Audit record | **No** | Authorization-gated in full |
| Request state (`declined`, `cancelled`, …) | Tenant state | **No** | Collapsed into `not-found`; see the two-outcome rule |
| Uploaded file bytes | Transient input | **N/A** | Hashed and discarded; never persisted, never parsed |
| Uploaded file digest | Transient result | **Echoed only** | Returned to the caller who supplied the file; never stored or logged |

## Retention

Nothing this surface receives is retained. The uploaded file is not written
anywhere; its digest is returned in the response and held nowhere else. The two
counters retain only bounded labels.
