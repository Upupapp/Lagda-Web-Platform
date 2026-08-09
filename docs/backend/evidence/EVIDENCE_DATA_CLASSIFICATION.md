# Evidence Data Classification — BACKEND-10

Every persisted evidence field, classified for privacy, public verification and
certificate rendering.

Nothing is public because verification exists. Public and certificate exposure
are **allowlists**, and the public one is asserted as an exact key set by test.

## Legend

`INTERNAL` · `PII` · `SENSITIVE` · `PUBLIC-SAFE` · `CERTIFICATE-SAFE` ·
`OPERATIONAL`

## `evidence_events`

| Field | Class | Public | Certificate | Notes |
|---|---|---|---|---|
| `evidence_event_id` | INTERNAL | no | no | Opaque, backend-owned |
| `workspace_id` | INTERNAL | **no** | no | Tenant key. Never leaves the backend |
| `signing_request_id` | INTERNAL | no | no | |
| `document_id` | INTERNAL | no | no | |
| `recipient_id` | INTERNAL | no | no | A reference, not an identity |
| `event_type` | INTERNAL | no | **yes** | The certificate shows the action performed |
| `actor_type` | INTERNAL | no | no | |
| `actor_id` | INTERNAL | no | no | Resolved to a display name via the recipient record |
| `occurred_at` | INTERNAL | no | **yes** | Timestamps appear on the certificate |
| `recorded_at` | OPERATIONAL | no | no | Forensic, not evidentiary presentation |
| `client_ip` | **PII / SENSITIVE** | **never** | **never** | Handoff §16 requires collection; nothing requires disclosure |
| `client_user_agent` | **PII-adjacent** | **never** | **never** | Identifying in combination. Untrusted text — escape before any render |
| `details` | varies by event | **never** | selective | Validated per event type; must never carry secrets |
| `details_version` | INTERNAL | no | no | |

`client_ip` is the field to be most careful with. It is collected because the
handoff requires it, and disclosed to nobody — not to the public verification
page, not on the certificate that ships to every participant.

## `document_artifacts`

| Field | Class | Public | Certificate | Notes |
|---|---|---|---|---|
| `artifact_id` | INTERNAL | no | no | |
| `workspace_id` | INTERNAL | no | no | |
| `document_id` | INTERNAL | no | no | |
| `artifact_type` | INTERNAL | no | no | |
| `storage_reference` | **SENSITIVE** | **never** | **never** | A storage path is an attack surface |
| `media_type` | INTERNAL | no | no | |
| `size_bytes` | INTERNAL | no | no | Leaks document characteristics in aggregate |
| `digest` | PUBLIC-SAFE | via seal | **yes** | The point of a verification hash is disclosure |
| `digest_algorithm` | PUBLIC-SAFE | **yes** | **yes** | Needed to interpret the digest |
| `source_artifact_id` | INTERNAL | no | no | |
| `created_at` | INTERNAL | no | no | |

## `document_seals`

| Field | Class | Public | Certificate | Notes |
|---|---|---|---|---|
| `seal_id` | INTERNAL | **no** | no | |
| `workspace_id` | INTERNAL | **no** | no | |
| `signing_request_id` | INTERNAL | **no** | no | |
| `sealed_artifact_id` | INTERNAL | **no** | no | |
| `certificate_artifact_id` | INTERNAL | **no** | no | |
| `seal_scheme` | PUBLIC-SAFE | **yes** | **yes** | A verifier must know which rules produced the artifact |
| `seal_version` | PUBLIC-SAFE | **yes** | **yes** | Same |
| `digest_algorithm` | PUBLIC-SAFE | **yes** | **yes** | |
| `original_document_hash` | PUBLIC-SAFE | **yes** | **yes** | Handoff §17's `documentHash` |
| `signed_document_hash` | PUBLIC-SAFE | **yes** | **yes** | |
| `sealed_at` | PUBLIC-SAFE | no | **yes** | Withheld publicly today only because §17 does not list it |

## `verification_records`

| Field | Class | Public | Certificate | Notes |
|---|---|---|---|---|
| `verification_id` | **PUBLIC** | **yes** | **yes** | The one identifier the public is expected to hold |
| `workspace_id` | INTERNAL | **no** | no | `issuerWorkspaceId` is stored, not published |
| `signing_request_id` | INTERNAL | **no** | no | |
| `document_id` | INTERNAL | **no** | no | |
| `seal_id` | INTERNAL | **no** | no | |
| `completed_at` | PUBLIC-SAFE | **yes** | **yes** | |
| `participant_count` | PUBLIC-SAFE | **yes** | **yes** | A count, not identities |
| `created_at` | OPERATIONAL | no | no | |

## The public projection

Exactly eight fields, and no more:

```
verificationId · completedAt · participantCount · signedDocumentHash
originalDocumentHash · digestAlgorithm · sealScheme · sealVersion
```

Built by naming columns, not by removing fields from a row type. A
`Omit<VerificationRecord, "workspaceId">` would silently start exposing whatever
a later command adds. A test asserts the exact key set, and a second test
asserts the serialized result contains no workspace, document, signing-request,
seal, artifact or storage identifier.

## Three read models, never one DTO

| Model | Audience | Contains |
|---|---|---|
| Public verification projection | anonymous | the eight fields above |
| Completion certificate projection | every participant | names, actions, timestamps, hashes — no IP, no device |
| Internal evidence timeline | workspace Owners and Auditors | full rows, still tenant-scoped |

Reusing one DTO across these is how an IP address ends up on a public page.

## Data minimization

Every persisted field has a named purpose. Fields that are technically available
and were **not** collected: geolocation, device fingerprint, browser/OS
breakdown, referrer, screen dimensions, session identifiers.

Handoff §16 mentions geolocation and device fingerprint in intent, but nothing
derives them and no consumer needs them. They are OD-025 rather than nullable
columns nobody writes.

## Handoffs

**BACKEND-54 (export):** decide which evidence enters a workspace or user export.
`client_ip`, `client_user_agent`, `storage_reference` and `details` must not be
included by default.

**BACKEND-55 (retention and erasure):** owns retention duration, legal hold,
anonymization and the privileged erasure path. Nothing is hardcoded here.
Note that hashing an email or IP does **not** automatically make it anonymous —
it may remain personal data if it is still linkable, and that is a legal
determination, not an engineering one.

**Encryption at rest** is deployment infrastructure. No per-column encryption is
implemented; if a field later warrants it, `client_ip` and `details` are the
candidates.

**Indexes:** none on `client_ip`, `client_user_agent` or `details`. Indexing
sensitive free-form values without a query that needs them adds attack surface
and retention cost for nothing.
