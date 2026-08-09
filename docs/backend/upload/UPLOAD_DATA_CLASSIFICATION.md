# Upload Data Classification — BACKEND-18

## What each field is, and where it may go

| Field | Classification | Persisted | Logged | Returned to client |
|---|---|---|---|---|
| Document bytes | **Customer confidential** | object storage only | **NEVER** | only via an authorized future download |
| `originalFilename` | **Customer sensitive** — can name a case, a party, a dispute | yes, as display metadata | **no** | yes, echoed back |
| `clientMediaType` | Untrusted claim | yes, diagnostics | yes | no |
| `detectedMediaType` | LAGDA's determination | yes, authoritative | yes | yes |
| `byteSize` | Operational | yes | yes | yes |
| `digest` (SHA-256) | Integrity evidence | yes, authoritative | yes | yes |
| `uploadId` | Internal identifier | yes | yes | yes |
| `quarantineReference` | **Internal infrastructure** | yes | no | **NEVER** |
| `acceptedArtifactId` | Internal identifier | yes | yes | yes |
| `scanOutcome` | Security telemetry | yes | yes | no |
| Malware signature name | **Security telemetry** | no | yes (internal) | **NEVER** |
| `workspaceId` / `uploaderUserId` | Tenant identity | yes | yes | no |
| Storage credentials, scanner config | **Secret** | no | **NEVER** | **NEVER** |

## Never logged

- **Document content**, in any encoding. Not a Buffer, not base64, not a
  fragment, not "the first 100 bytes for debugging".
- **The malware payload.** A rejected file's bytes are not written to a log,
  which would put the payload somewhere with weaker handling than the quarantine
  bucket it came from.
- **Storage or scanner credentials.**
- **Presigned URLs** (none exist yet — BACKEND-17 deferred them).
- **The scanner's raw response.** The outcome and, internally, the signature
  name; not the wire text.

## The filename deserves its own note

`Complaint against <name> — confidential.pdf` is a filename LAGDA will genuinely
receive. It is treated as:

- **display metadata**, echoed back to the user who sent it;
- **normalized** — control characters stripped, path separators replaced, length
  bounded to 255;
- **never a storage key**, never a path, never a type signal, never an
  authorization input;
- **not logged**, because a log aggregator is a wider audience than the
  workspace that owns the document.

Because storage keys are built from opaque identifiers, an entire class of path
traversal is impossible rather than defended against.

## Upload records are not signing evidence

`document_uploads` is operational and security history. A rejected upload is not
an event in a signing transaction, and nothing in this pipeline appends to
`evidence_events`.

That boundary matters: signing evidence is append-only, legally significant, and
surfaced in verification. An upload rejection is neither. Business audit of
document activity, if the product wants it, is BACKEND-43.

The scan record (`scan_outcome`, `scanned_at`) is deliberately minimal — an
outcome and a time. It is **not** presented as legal evidence that a document was
malware-free at signing: it records what LAGDA's scanner said, with the
signatures it had, at that moment.

## Metrics

Safe labels: `result`, `reason`, `detected_type`, `scan_outcome`.

Never a label: `workspaceId`, `userId`, `artifactId`, `uploadId`, filename,
digest, IP. All are unbounded, and an unbounded label is how a metrics backend
falls over.

Byte size is a numeric observation, not a label.
