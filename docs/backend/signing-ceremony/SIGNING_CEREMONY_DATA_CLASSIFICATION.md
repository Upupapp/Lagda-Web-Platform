# Signing ceremony data classification

| Value | Class | Treatment |
|---|---|---|
| `RecipientSigningContext` | SECURITY CONTEXT | server-derived only; never from a request |
| `SigningRequestId` | INTERNAL RESOURCE ID | in the projection; never a metric label |
| `SigningRequestRecipientId` | INTERNAL RESOURCE ID | same |
| `SigningRequestFieldId` | INTERNAL RESOURCE ID | in the projection; BACKEND-36's submission key |
| **PDF bytes** | **HIGHLY SENSITIVE DOCUMENT CONTENT** | streamed, never logged, never buffered into a log line |
| Storage key | SECRET (internal) | never in a DTO, header or log |
| Presigned URL | **NOT APPLICABLE** | none is issued |
| Field geometry | DOCUMENT WORKFLOW METADATA | in the projection; never logged |
| Field label | **POTENTIALLY SENSITIVE** | sender-authored free text that can name a person |
| Recipient name | PII | own name only, in the projection |
| Recipient email | PII | own address only, in the projection |
| Other recipients | PII | **never returned at all** |
| Document title | POTENTIALLY SENSITIVE | frozen at creation; in the projection, never logged |
| Content digest | INTEGRITY IDENTIFIER | in the projection, deliberately |
| `consent_version` | LEGAL/WORKFLOW METADATA | logged — it is the whole record |
| Consent text | **NOT STORED** | see SIGNING_CONSENT.md |
| `accepted_at` | SECURITY/LEGAL EVENT METADATA | backend Clock only |
| `first_entered_at` | WORKFLOW/EVIDENCE METADATA | set once; not proof of reading |
| Session token / CSRF token | SECRET | digests only; never logged |
| Recipient IP / user agent | PII | **not captured** — OD, and BACKEND-43 has not asked |

## The one that surprises people

**A field label is potentially sensitive.** It looks like chrome — "Signature",
"Date" — but it is sender-authored free text and "Maria Santos — Signature" is a
perfectly ordinary thing for a sender to write. It is the specific reason other
recipients' fields are not returned even as anonymous placeholders, and an
integration test asserts the other signer's name is absent from what this
recipient can read.

## The digest, deliberately included

`document.digest` is in the projection. A recipient who records it can later
prove they were shown these exact bytes — worth more to them than the digest is
worth to an attacker who already holds authorized access to the document.

## What is never in telemetry

PDF bytes, storage keys, session or CSRF tokens or their digests, recipient name
or email, document title, field labels, field coordinates, consent text.

The log lines this surface writes carry ids and a consent version. Nothing else.
An architecture guard reads every `request.log` payload in the routes file and
asserts it.
