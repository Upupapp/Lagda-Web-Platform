# Document data classification

Documents are the most sensitive data LAGDA holds. A PDF in this system is a
lease, an NDA, an employment contract or a deed of sale — and its **title alone**
identifies the client, the counterparty and often the value of the transaction.

## Classification

| Item | Class | Handling |
|---|---|---|
| `DocumentId` | Internal resource identifier | Safe in logs and URLs. Opaque, no meaning |
| `WorkspaceId` | Tenant identifier | Safe in logs. Never in a response body |
| **`title`** | **BUSINESS-SENSITIVE** | Response only. Never logged, never a metric label |
| **`originalFilename`** | **BUSINESS-SENSITIVE** | Response only. Same rules as the title |
| `createdByUserId` | Internal identifier | Safe in logs. Audit metadata, not authorization |
| `ArtifactId` | Internal identifier | Safe in logs. **Never in a response** |
| SHA-256 digest | Integrity metadata | Internal. Not published by this command |
| `sizeBytes` | Technical metadata | Response |
| `pageCount` | Technical metadata | Response |
| `mediaType` | Technical metadata | Response |
| **Storage reference** | **SENSITIVE INTERNAL** | Never leaves the backend. A capability-bearing key (INV-205) |
| **Document bytes** | **DOCUMENT CONTENT — HIGHLY SENSITIVE** | Never in this layer at all |

## Why the title is treated as sensitive

Because it is not a filename — it is a matter name. From the product's own
fixtures:

> "Retainer Agreement — Mabini Business Services"

That single string discloses that a named business has legal representation, the
nature of the engagement, and which firm is handling it. A log aggregator holds
it centrally, retains it for months, and is readable by anyone with operational
access.

So log payloads carry `titleLength` instead: enough to answer "did a rename
happen and was it substantive" without saying to what. The length is computed
before the log call so the payload object references the title nowhere — a
detail that exists because an architecture guard reads these payloads literally.

## Document content

**Never enters the document domain.** There is no byte-handling code path here:
no storage client, no PDF library, no sealer, asserted by three architecture
guards across every file in the domain.

Bytes are handled only by BACKEND-18's upload pipeline (which streams, hashes
and discards) and BACKEND-09's sealer. Neither logs content, and BACKEND-18's
suite already asserts a synthetic byte marker never reaches a log.

A PDF may contain names, addresses, government identifiers, salary figures,
medical detail and bank accounts. **No metadata extraction happens** — LAGDA
does not read the document's text, its embedded `/Title`, `/Author` or any other
field into the database (§227, §228). The only thing derived from the bytes is
the page count, and that is a number.

## The digest is not published

Nothing in the product displays one. `TransactionFile.integrityState` is an enum
whose values are `"…-demo"`, so the UI has no real integrity display yet.

Publishing a SHA-256 because a column happens to hold one is the accident §194
warns about. When verification needs it (BACKEND-42), it is published
deliberately, from the seal, on a path designed for it.

## Where a document's details may appear

**Response bodies**, to a caller holding `document.view` in that workspace — six
of the seven roles.

**Nowhere else.** Not logs, not metric labels, not error messages, not cache
headers, not another workspace. Every response is `Cache-Control: no-store`,
asserted by counting handlers against `noStore` calls.

## Enforcement

| Control | How |
|---|---|
| Tenant isolation | `tenant_isolation` + FORCE RLS; scoped repository; compound FK on artifacts. Probed as the runtime role |
| Capability gate | `document.view` for reads, `document.create`/`document.update` for writes |
| No storage key in responses | The read model has no field for it; response key set pinned by test |
| No digest in responses | Same |
| No title in logs | Route test over a real Pino line, plus a source guard |
| No title in metrics | Guard pinning the label set |
| No content anywhere | Three import guards |
| No caching | `no-store` on every handler, asserted by count |

## Retention and erasure

**Indefinite, and there is no erasure operation.** Archiving does not exist at
document level and the runtime role cannot delete.

This is harder than the contact case (OD-110) and worth stating plainly: a
document's **content** is simultaneously personal data and the evidence a
signature attests to. Erasing it destroys the thing a completion certificate
certifies. The Data Privacy Act's erasure right is not absolute and a signed
contract has a strong competing retention basis — but LAGDA has no operation at
all, so nothing is being weighed.

**OD-119**, owned by BACKEND-55.
