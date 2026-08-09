# Storage Key Strategy — BACKEND-17

## The keys

```
workspaces/{workspaceId}/documents/{documentId}/artifacts/{artifactId}.pdf
quarantine/{workspaceId}/uploads/{uploadId}
```

Every variable segment is an opaque LAGDA identifier.

## Keyed by ARTIFACT, not document

One document has several byte-distinct artifacts — `original`, `sealed`,
`completion-certificate`. Keying by document id would make the sealed PDF
overwrite the original, destroying the only evidence the original bytes ever
existed. A test asserts two artifact ids under one document produce different
keys.

## No customer filename. Ever.

This is the rule with the sharpest real-world consequence, so it is stated
plainly:

```
BAD:  workspaces/ws_1/documents/d_1/Complaint against <name> - confidential.pdf
GOOD: workspaces/ws_1/documents/d_1/artifacts/art_9f2b.pdf
```

A filename in an object key is readable in provider access logs, admin consoles,
billing exports, bucket listings and support tooling — none of which LAGDA
controls, and all of which would then hold the subject of a legal document
(INV-209).

The `.pdf` suffix is present for operator clarity when browsing a bucket. It is
a label, never evidence of type: BACKEND-18 determines media type from magic
bytes, never from an extension.

A test asserts the generated key contains no filename-like fragment and consists
only of the permitted character set. Injecting a filename into the pattern makes
five tests fail.

## Workspace prefix is organisation, NOT authorization

The workspace id appears in the key because it is genuinely useful: listing one
tenant's objects, scoping a lifecycle rule, spotting a stray object, and a
cheap sanity check during diagnosis.

**It is not a permission.** Anyone holding a key can read that object; object
storage performs no tenant check whatsoever. What actually prevents cross-tenant
access is that the key is never reachable:

```
authenticated user
  → session, workspace membership
  → tenant-scoped artifact repository (RLS enforced)
  → storage reference
  → storage.getObject(ref)
```

Never:

```
client sends a key → storage.getObject(key)
```

Proven by test: workspace B asking for workspace A's artifact id gets `null`
from the repository, so B never obtains a reference to hand to storage — and B's
own key strategy addresses a different object entirely, even when every other
identifier matches.

## Keys are derived, never accepted

`StorageObjectKey` is a branded type with one validating constructor. A string
from a request body cannot become one by assignment. Since no untrusted input
ever reaches key construction, a validation failure is a **bug**, not an attack
— but the validation exists anyway because the cost of being wrong is writing
into another tenant's prefix.

`toStorageObjectKey` rejects:

| Rejected | Why |
|---|---|
| Empty, or over 512 characters | The column that stores it is `varchar(512)` |
| Characters outside `[A-Za-z0-9._/-]` | Control characters, spaces, encoded tricks |
| `..` anywhere | Traversal |
| `//` | Empty segment |
| Leading `/` | Absolute path |
| Trailing `/` | Prefix, not an object |

Identifier segments are separately checked against
`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$` — note the separator is excluded, so an id
containing `/` cannot silently add a path level.

Removing either check makes tests fail.

## Quarantine keys carry an UPLOAD id

Not an artifact id. Untrusted bytes must not be given the identity of an
accepted artifact before anything has validated them. Promotion mints a fresh
artifact identity; it does not rename a quarantine object into the artifact
namespace (§163).

## Keys are stable

Once written to `document_artifacts.storage_reference`, a key does not change.
It is not recomputed on read — a key derived at read time would silently break
the moment the derivation changed, and every historical artifact would become
unreachable at once.

A provider or bucket migration copies exact bytes, verifies the digest, and
updates the stored reference under a controlled migration. **Artifact identity
and digest never change**, because they are what evidence refers to.

## Portability

The layout uses only characters that are safe in every S3-compatible provider's
key space, and no provider-specific features. Nothing about it depends on AWS.
