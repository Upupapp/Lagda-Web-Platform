# Evidence & Integrity Architecture — BACKEND-10

## 1. Four questions, four tables

| Table | Answers |
|---|---|
| `document_artifacts` | What bytes exist, and what identifies them |
| `evidence_events` | What happened, who did it, when LAGDA observed it |
| `document_seals` | What finalization procedure produced and interprets a final artifact |
| `verification_records` | The public identity of a completed transaction |

They are not collapsed into one `audit_log`. Their retention, visibility and
immutability requirements differ, and a single table would force the strictest
rule onto all of it — or, more likely, the loosest.

## 2. Evidence is not operational logging

Pino writes operational logs: request traces, errors, latency. Those rotate.

Signing evidence is a business record. Handoff §16 requires "an immutable
activity event" per participant action and §32 an "append-only store". If every
log line were deleted tomorrow, the evidence in these tables would be unaffected,
because it does not live in the log pipeline.

## 3. Evidence is not the whole audit trail

Signing evidence is a **subset** of auditable activity. "User changed a dashboard
preference" is audit; "recipient submitted a signature" is evidence.

The frontend declares 40+ `ActivityEventType` values. Thirteen are persisted here.
Excluded, with reasons:

| Excluded | Why | Owner |
|---|---|---|
| `invitation-delivered`, `-failed`, `-bounced`, `-opened` | Facts about an email provider, not about a signer. Handoff §16 records *participant actions*. | BACKEND-44/45 |
| `reminder-sent`, `routing-step-*` | Workflow mechanics making no evidentiary claim | BACKEND-43 |
| settings, preferences, security config | General audit | BACKEND-43 |

Overlap is expected: BACKEND-43's audit trail may present some of these same
rows. Identity is not.

## 4. Event types

```
transaction-created    transaction-sent       transaction-cancelled
transaction-expired    transaction-completed  invitation-sent
authentication-completed  consent-accepted    document-viewed
signature-completed    participant-declined   document-sealed
verification-record-created
```

Kebab-case, matching the existing LAGDA vocabulary rather than a second
SCREAMING_SNAKE one. Names match `ActivityEventType` wherever an equivalent
already exists.

**An event is not a status.** `document-viewed` is a permanent historical fact;
the recipient's status may still be awaiting-signature afterwards. BACKEND-04
already reached this conclusion from the other direction — it classified
`authentication-completed` as a `NON_LIFECYCLE_STATUS` with the note "an event
about one recipient, not the request". That is this table.

`document-viewed` may legitimately occur many times, so there is no
`UNIQUE (signing_request_id, event_type)`.

## 5. Actors

`workspace-user` · `recipient` · `system`

A recipient is **not** a `UserId`. External signers have no LAGDA account, and
modelling every actor as a user would force either fake user rows or a
meaningless `actor_id` on most signing evidence.

The application type is a discriminated union, so a `system` actor carries no ID
field at all rather than a nullable one, and the database enforces the same:

```sql
CHECK ((actor_type = 'system') = (actor_id IS NULL))
```

Inventing a synthetic user for the expiry worker would make "who did this"
unanswerable for every automated action.

**No actor name is snapshotted.** Historical display identity comes from the
transaction *recipient* record, which is itself historically stable, rather than
from copying a name into every event row. Copying would duplicate PII across the
largest table in the system and create a second thing to erase.

## 6. Timestamps

| Column | Source | Means |
|---|---|---|
| `occurred_at` | application `Clock` | when the business fact happened |
| `recorded_at` | database `now()` | when the row was durably written |

Both exist because they genuinely differ when a worker records an event after the
fact, and the gap is itself forensically meaningful. `recorded_at` is not
settable by the application — "when this row landed" is not something the caller
can honestly claim to know.

Client-supplied time is never authoritative. If it is ever stored it goes in
`details` as an explicitly client-declared value.

## 7. Request context

`client_ip inet` and `client_user_agent varchar(512)`, both nullable, both
**currently unwritten**.

Handoff §16 requires IP and user-agent on participant actions, so the schema
carries them. Nothing populates them yet, and that is deliberate: correct client
IP derivation depends on trusted proxy configuration that BACKEND-11/56 has not
established. An `X-Forwarded-For` recorded before then is attacker-controlled
text wearing the costume of evidence.

`inet` rather than text, so a malformed value cannot be stored at all.

System and worker events legitimately have no client. The columns are NULL, never
a placeholder.

**No `location` column.** Handoff §16 specifies "IP geolocation (city level
only)" and the frontend's `DeviceNetworkSummary` says `networkRegion` is "never
lat/lng or exact IP" — so the meaning is settled, but nothing can derive it and
a column with no writer is the failure this codebase already shipped once
(`RouteMeta.status`, 225 routes, read by no code). Recorded as **OD-025**.

## 8. Artifacts

Three types: `original`, `sealed`, `completion-certificate`.

**There is no `prepared` type.** Handoff §8 merges fields "AFTER signing", and §9
versions storage as "original + signed final". Preparation produces field
placement metadata, not a new PDF — so a `prepared` artifact would be a row
describing bytes that never exist.

This also resolves a mapping question: BACKEND-09's `preparedDocumentHash` is the
digest of the bytes handed to the sealer, and since preparation adds no bytes,
that value **is** handoff §17's `documentHash` — the SHA-256 of the original file
at upload. Persisted as `original_document_hash`.

One row per byte-distinct artifact. Never one row whose digest and storage key
get overwritten: an overwritten digest destroys the only evidence that the
earlier bytes existed.

Provenance is a **relation** (`source_artifact_id`), tenant-safe by compound FK,
never inferred from naming. A self-referencing artifact is rejected.

`UNIQUE (digest)` is deliberately absent. Two identical PDFs legitimately share a
SHA-256; the digest is content identity, not row identity, and a unique
constraint would reject the second workspace to upload the same standard form.

The digest CHECK is **algorithm-aware**, not a bare 64-character rule:

```sql
CHECK (digest_algorithm = 'sha-256' AND digest ~ '^[a-f0-9]{64}$')
```

Introducing SHA-512 extends the disjunction. A fixed-length check would have to
be *dropped*, and dropping a CHECK is how historical rows stop being validated.

## 9. Seals

The artifact row says what bytes exist. The seal says what procedure produced
them: `seal_scheme`, `seal_version`, `digest_algorithm`, written from the first
row, never defaulted and never inferred from the application version.

`seal_version` is constrained `> 0`, not `= 1`. Pinning it to the current version
would make introducing version 2 a schema change under load. An unknown
`seal_scheme` is rejected outright rather than silently read back as
hash-evidence.

`UNIQUE (workspace_id, signing_request_id)` — one finalization per request.
Resealing is not a product feature; a completion retry must converge on the
existing row rather than mint a competing verification identity.

## 10. Verification

Handoff §17 specifies the record as "verificationId, documentHash,
signedDocumentHash, completedAt, participantCount, issuerWorkspaceId".

The two hashes are reached **through** `seal_id`, not copied into this table.
BACKEND-10's §55 suggested carrying them here; §65 forbids "two independently
writable copies that can drift". §65 wins — the verification page and the seal
record must never be able to disagree about what was signed.

There is **no `status` column**. The product has no revocation or invalidation
semantics, and a lifecycle nothing transitions is decorative metadata.

Format is validated in the database:

```sql
CHECK (verification_id ~ '^LAGDA-[A-Za-z0-9]+-[0-9]{8}-[A-Za-z0-9]{6,}$')
```

so a database serial or a guessable value cannot be stored as one. Generation
belongs to the application (`VerificationIdGenerator`), kept separate from the
entity ID generators because a published identifier must be unguessable while an
entity ID only has to be unique.

**A verification ID is not authentication.** Holding one permits a curated public
lookup and nothing else — never document access, never signing access.

## 11. Immutability — exactly what enforces it

Four mechanisms are possible. What is actually in place:

| Mechanism | Status |
|---|---|
| Repository API omits update/delete | **Yes** — and asserted by test |
| DB privilege separation | **Yes** — `lagda_app` holds INSERT and SELECT only |
| Trigger rejecting mutation | **No** — see below |
| RLS | Yes, for tenancy; it is not an immutability control |

Privilege separation was chosen over a trigger because a trigger blocks *every*
role, including the one that will have to perform legally required erasure
(BACKEND-55). Privileges close the path to the application while leaving a
separate privileged path open.

Verified by asking PostgreSQL directly — `has_table_privilege('lagda_app',
'evidence_events', 'UPDATE')` is `false`, with a negative control confirming the
same call returns `true` for `workspaces`.

**This is an operational control, not cryptographic non-repudiation.** It does
not prove a database administrator could never alter a row, and nothing here
should be described as though it did.

## 12. Cryptographic evidence chaining — **DEFERRED**

Not implemented. Stated explicitly so the absence is a decision rather than an
omission.

The handoff requires an append-only, non-modifiable activity log. It does not
require tamper-*evident* chaining, and chaining carries real costs: it imposes a
total order on concurrent recipient actions, complicates the erasure obligations
BACKEND-55 has to define, and makes migrations invasive.

If stronger integrity becomes required, the options are event chaining, an
external timestamp service, signed evidence manifests, or WORM storage. **No
blockchain, Merkle tree or distributed ledger** — nothing in the specification
asks for one.

## 13. Ordering

`ORDER BY occurred_at ASC, evidence_event_id ASC`.

The second key is not decoration: two recipients can act in the same
millisecond, and timestamp-only ordering leaves the planner free to return them
in either order. PostgreSQL insertion order is never a timeline.

**No `sequence_no`.** Concurrency-safe allocation needs either a lock that
serializes concurrent signers or a counter row that becomes a contention point —
and the ordering requirement is satisfied by the total order above. Recorded as
**OD-026** should strict per-request sequencing later be required.

Both the fake and the PostgreSQL adapter implement this ordering independently
(JavaScript sort vs SQL), and the shared contract suite is what would catch them
diverging.

## 14. Tenancy

Every table carries `workspace_id` as a first-class column, never inferred
through a signing-request join. Evidence is the most sensitive data LAGDA holds,
and a join is one refactor away from being an outer join that leaks.

All four tables have RLS enabled and **forced**, with the same policy as
migration 002.

### The FK gap, stated plainly

Only `workspaces` exists today. `document_id`, `signing_request_id` and
`recipient_id` therefore carry **no foreign key** — there is nothing to point at
until BACKEND-29/30/31.

Every other relationship *is* compound-FK constrained now: artifact provenance,
seal→artifact, verification→seal. Cross-workspace attempts on those are rejected
by PostgreSQL, and tests prove it.

To make the future constraints a pure `ALTER TABLE` that touches no evidence
code, each parent table **must** be created with `UNIQUE (workspace_id, <id>)`:

```sql
-- BACKEND-30, when `documents` exists:
ALTER TABLE document_artifacts
  ADD CONSTRAINT document_artifacts_document_fk
  FOREIGN KEY (workspace_id, document_id)
  REFERENCES documents (workspace_id, document_id) ON DELETE RESTRICT;

-- BACKEND-31, when `signing_requests` exists:
ALTER TABLE evidence_events
  ADD CONSTRAINT evidence_events_request_fk
  FOREIGN KEY (workspace_id, signing_request_id)
  REFERENCES signing_requests (workspace_id, signing_request_id) ON DELETE RESTRICT;
-- and the same for document_seals and verification_records.
```

## 15. Deletion

`ON DELETE RESTRICT` everywhere. Never CASCADE.

Signing evidence must not vanish because a parent document or workspace was
deleted. What *should* happen instead — retention windows, legal hold,
anonymization, privileged erasure — is BACKEND-55's to define, and inventing it
here would be inventing policy.

## 16. Public verification is not public evidence access

A public verifier holds a verification ID and no workspace, so the ordinary
tenant repositories cannot serve them. That exception is made as narrow as it can
be:

- One method, `findByVerificationId`, on a port with nothing else on it.
- It selects **exactly** the public columns by name — not `selectAll()` with a
  mapper, which is one careless spread from returning the whole row and would
  silently widen when a later command adds a column.
- It returns `null` for absent **and** for anything restricted, so an anonymous
  caller cannot use it as an oracle for which verification IDs exist.

The projection is an explicit allowlist, asserted as an exact key set by test:
`verificationId`, `completedAt`, `participantCount`, `signedDocumentHash`,
`originalDocumentHash`, `digestAlgorithm`, `sealScheme`, `sealVersion`.

Never exposed: evidence events, IP addresses, user agents, storage references,
recipient identities, workspace ID, internal IDs.

BACKEND-42 builds the endpoint. It does not get a new database role here — RLS is
not weakened for it.

## 17. `SealResult` → persistence

| BACKEND-09 `SealResult` | Persisted as | Required | Public |
|---|---|---|---|
| `sealedDocument` (bytes) | object storage; row in `document_artifacts` (`sealed`) | yes | no |
| `completionCertificate` (bytes) | object storage; **separate** row (`completion-certificate`) | yes | no |
| `preparedDocumentHash` | `document_seals.original_document_hash` | yes | yes |
| `signedDocumentHash` | `document_seals.signed_document_hash` | yes | yes |
| `verificationId` | `verification_records.verification_id` | yes | yes |
| `seal.sealScheme` | `document_seals.seal_scheme` | yes | yes |
| `seal.sealVersion` | `document_seals.seal_version` | yes | yes |
| `seal.digestAlgorithm` | `document_seals.digest_algorithm` | yes | yes |
| — | `document-sealed` evidence event | yes | no |

`preparedDocumentHash` maps to `original_document_hash` because preparation
produces no bytes (§8 above).

## 18. Storage is not transactional with PostgreSQL

An artifact row is written only once its bytes are authoritative in storage.
There is no `pending` state and no way to fill the storage reference in later —
the runtime role has no UPDATE privilege, which *forces* the correct ordering
rather than trusting a caller to follow it.

BACKEND-17/38 own the choreography and must handle both failure windows: storage
succeeds then the database fails (an orphaned object — reconcilable), and the
database succeeds then storage fails (a row pointing at nothing — which the
ordering above makes impossible).

Sealing must never run inside a database transaction (INV-082).

## 19. Foundation status

Storage does not exist. `storage_reference` currently holds synthetic values in
tests (`lagda://foundation/...`). This is **FOUNDATION** — the schema and
repositories are real and tested; the storage layer they reference is BACKEND-17.

## `storage_reference` — defined by BACKEND-17

The column has existed since BACKEND-10 as `varchar(512) NOT NULL`. BACKEND-17
defines what goes in it. **No migration was required.**

It holds an internal object key:

```
workspaces/{workspaceId}/documents/{documentId}/artifacts/{artifactId}.pdf
```

Typed as a branded `StorageObjectKey` with one validating constructor — the
port previously declared a bare `string` with a comment claiming it was opaque,
and nothing enforced the claim. The row-to-record mapping now goes through the
constructor rather than a cast, because a row written by an older deployment is
still input.

**The zone is not stored.** An artifact row describes ACCEPTED bytes, and those
always live in the `artifacts` zone. Quarantine objects have no artifact row,
because an unvalidated upload is not yet an artifact. If a second accepted zone
ever exists, a zone column is a purely additive migration.

**Never a URL.** Not a presigned URL — those expire and are bearer credentials —
and not a permanent one, which would imply a readable bucket (INV-207). A test
asserts the persisted value contains no scheme, signature or query string.

**The key is stable.** It is not recomputed on read: a derived key would break
every historical artifact at once the moment the derivation changed. A provider
migration copies bytes, verifies the digest, and updates the reference under
controlled change — artifact identity and digest never move, because they are
what evidence refers to.

**The digest stays authoritative here, not in storage.** The adapter may write
LAGDA's SHA-256 as provider metadata for operator diagnosis, and nothing reads
it back as truth. Provider `ETag` is never a LAGDA digest (INV-206), and
provider `LastModified` is never artifact creation time (§173).
