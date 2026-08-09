# Evidence Inventory — BACKEND-10

Every evidence-related concept currently specified anywhere in LAGDA, classified.

Classifications: `SIGNING_EVIDENCE` · `GENERAL_AUDIT` · `ARTIFACT_INTEGRITY` ·
`VERIFICATION` · `OPERATIONAL_ONLY` · `REQUIRES_REVIEW`

## 1. From the integration handoff

| Concept | Source | Class | Public | Sensitive | Persist now | Owner |
|---|---|---|---|---|---|---|
| Immutable activity event per participant action | §16 | SIGNING_EVIDENCE | no | yes | **yes** | BACKEND-10 |
| Server timestamp on every event | §16 | SIGNING_EVIDENCE | no | no | **yes** (`occurred_at`) | BACKEND-10 |
| IP on participant actions | §14, §16, §32 | SIGNING_EVIDENCE | no | **PII** | schema only | BACKEND-11/56 writes |
| User-agent on participant actions | §14, §16, §32 | SIGNING_EVIDENCE | no | identifying | schema only | BACKEND-11 writes |
| IP geolocation, city level only | §16 | SIGNING_EVIDENCE | no | **PII** | **no** — OD-025 | deferred |
| Device fingerprint, no biometrics | §16 | REQUIRES_REVIEW | no | identifying | **no** — OD-025 | deferred |
| Signature image | §14, §16 | SIGNING_EVIDENCE | no | **PII** | **no** — belongs to the signing aggregate | BACKEND-36 |
| Field values at signing time | §16 | SIGNING_EVIDENCE | no | **PII** | **no** — signing aggregate | BACKEND-36 |
| Document hash (SHA-256 of original at upload) | §17 | ARTIFACT_INTEGRITY | **yes** | no | **yes** (`original_document_hash`) | BACKEND-10 |
| Signed document hash | §17 | ARTIFACT_INTEGRITY | **yes** | no | **yes** | BACKEND-10 |
| Verification record | §17 | VERIFICATION | **yes** | no | **yes** | BACKEND-10 |
| Verification ID `LAGDA-{ws}-{date}-{random}` | §15 | VERIFICATION | **yes** | no | **yes** | BACKEND-10 |
| `participantCount` | §17 | VERIFICATION | **yes** | no | **yes** | BACKEND-10 |
| `issuerWorkspaceId` | §17 | VERIFICATION | **no** — internal | no | **yes** (`workspace_id`) | BACKEND-10 |
| Original PDF, signed PDF, completion certificate | §15, §9 | ARTIFACT_INTEGRITY | no | yes | **yes** (metadata) | BACKEND-10 / bytes BACKEND-17 |
| Evidence log as a stored package | §15 | SIGNING_EVIDENCE | no | yes | **yes** (as `evidence_events`) | BACKEND-10 |
| Audit log accessible to Owners and Auditors | §32 | GENERAL_AUDIT | no | yes | read model later | BACKEND-43 |
| Audit log append-only | §32 | SIGNING_EVIDENCE | — | — | **yes** — DB privileges | BACKEND-10 |
| Email delivery status webhook | §11 | OPERATIONAL_ONLY | no | no | **no** | BACKEND-44/45 |
| Consent enforced server-side | §895 | SIGNING_EVIDENCE | no | yes | **yes** (`consent-accepted`) | BACKEND-10 |
| Structured request logging, Sentry, metrics | §31 | OPERATIONAL_ONLY | no | no | **no** — never evidence | infra |

## 2. From the frontend

| Concept | Source | Class | Persist now |
|---|---|---|---|
| `ActivityEvent` (id, type, category, timestamp, actor, severity) | `transaction-detail.ts` | mixed | 13 of 40+ types |
| `ActivityEventCategory` (9 values) | same | display grouping | **no** — derivable |
| `hasEvidence: boolean` | same | display hint | **no** — derivable |
| `severity` (info/warning/error/success) | same | display | **no** — presentation, not fact |
| `EvidencePrivacyLevel` (3 levels) | same | classification | informs the projection design |
| `DeviceNetworkSummary.networkRegion` | same | SIGNING_EVIDENCE | **no** — OD-025 |
| `DeviceNetworkSummary.device/browser/os` | same | REQUIRES_REVIEW | **no** — OD-025 |
| `VerificationRecord` (authenticated view) | `verification.ts` | VERIFICATION | partly — see §4 |
| `TransactionRecordStatus` (11 values) | same | VERIFICATION | **no** — derived from request state |
| `FileMatchStatus` (9 values) | same | VERIFICATION | **no** — computed per lookup |
| `EvidenceAvailabilitySummary` | same | VERIFICATION | **no** — derived |
| `VerificationHistoryItem` | same | GENERAL_AUDIT | **no** — a user's own lookup history |
| `demonstrationOnly: true` | throughout | — | **no** — a fixture marker |

`severity` is worth naming: it is a **presentation** attribute. Persisting it
would freeze today's UI styling into permanent evidence, and a later decision
that declines are "warning" rather than "error" would make historical rows
disagree with current ones for no evidentiary reason.

## 3. From the backend

| Concept | Source | Class | Notes |
|---|---|---|---|
| `Sha256Digest` | `@lagda/contracts` | ARTIFACT_INTEGRITY | **now branded** — see OD-022, closed |
| `VerificationId` | `@lagda/contracts` | VERIFICATION | already branded; the one public identifier |
| `SealResult` | `@lagda/application` | ARTIFACT_INTEGRITY | mapped in EVIDENCE_ARCHITECTURE §17 |
| `SealMetadata` (scheme/version/algorithm) | BACKEND-09 | ARTIFACT_INTEGRITY | persisted from the first row |
| `CompletionEvidence` (certificate input) | BACKEND-09 | SIGNING_EVIDENCE | a projection, not a table |
| `NON_LIFECYCLE_STATUSES` | `@lagda/core` | SIGNING_EVIDENCE | BACKEND-04 already called these events, not statuses |
| Pino operational logs | infra | OPERATIONAL_ONLY | explicitly not evidence |

## 4. Concepts deliberately NOT persisted

| Concept | Why |
|---|---|
| Signature image / field values | Belong to the signing aggregate. Duplicating binary PII into evidence rows makes it twice as hard to erase and twice as easy to leak. Evidence references the submission. |
| Device fingerprint, geolocation | Specified in intent, but nothing can derive them and no consumer exists. OD-025. |
| Raw signing token, session secret, OTP | Never. Reference the recipient or access record instead. |
| `created_by` on every row | The actor model already expresses provenance. A second column would be decorative duplication. |
| Verification `status` | The product has no revocation semantics. A lifecycle nothing transitions is decoration. |
| Delivery outcomes | Facts about an email provider, not a signer. BACKEND-44/45. |
| Request ID | Useful for correlation, but not evidence identity and never public. Deferred until an investigation workflow needs it. |

## 5. Deliberate deviations from the command's suggested shape

| Suggestion | What was done | Why |
|---|---|---|
| §55 — `verification_id` on the seal record | Omitted; verification FKs to the seal | §65 forbids two independently writable copies of one value. The verification page and the seal must not be able to disagree. |
| §8 — `recipient_id` and `metadata` columns | Kept, plus `details_version` | Bounded and versioned per §34/§166 |
| §81 — `sequence_no` | Omitted | Ordering is satisfied by `(occurred_at, evidence_event_id)`. Safe allocation needs a lock that serializes concurrent signers, which §128 warns against. OD-026. |
| §108 — "may combine some tables" | All four kept | Each answers a different question and has different visibility. Collapsing seal into artifact would make the future signing migration ambiguous. |
| §20 — actor display snapshot | Omitted | §185 prefers referencing the historically stable recipient record over copying live contact data. |
