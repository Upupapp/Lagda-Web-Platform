# Signature submission data classification

| Value | Class | Treatment |
|---|---|---|
| `RecipientSubmissionId` | INTERNAL | in the response; never a metric label |
| `SigningFieldValueId` | INTERNAL | never leaves the backend |
| `SigningRequestFieldId` | INTERNAL RESOURCE ID | the client's submission key |
| **Drawn signature bytes** | **SENSITIVE SIGNING CONTENT** | `bytea`, bounded, never logged, never returned |
| **Typed signature text** | **SENSITIVE SIGNING CONTENT / PII** | it is usually a person's name |
| Initials representation | SENSITIVE SIGNING CONTENT | same treatment as a signature |
| **Text field values** | **POTENTIALLY HIGHLY SENSITIVE DOCUMENT DATA** | see below |
| Checkbox values | SIGNING CONTENT | an acknowledgment is a legal answer |
| Server-derived name / email | PII | from the immutable snapshot |
| `accepted_at` | EVIDENCE METADATA | the authoritative signing instant |
| Signature digest | INTEGRITY METADATA / SENSITIVE CONTEXT | stored; never a metric label |
| `signing_session_id` | SECURITY CONTEXT | attribution only, never returned |
| IP / user agent | **NOT CAPTURED** | OD-143, for the third command |

## The one people underestimate

**A text field value can be anything.** It is a free-text box on a legal
document: a salary, a medical detail, a bank account, a settlement figure. It
gets the same handling as the signature itself — never logged, never echoed,
never a metric label — and the classification says HIGHLY SENSITIVE rather than
"user input" so nobody later decides a debug log of submitted values would be
convenient.

## Language: not biometric

A drawn signature is **sensitive signature content**. It is not biometric
identity, and calling it that would overclaim what a line drawn with a mouse
proves (§179).

Nothing captures pressure, velocity, timing, per-point timestamps or device
motion (§180 – §182). The product does not, and adding it because a canvas
could would be collecting biometric-shaped data nobody asked for.

## Sender access

**No workspace endpoint returns a raw signature** (§177). A workspace role does
not confer the right to download a counterparty's signature image, and the
intended surface is the completed document (BACKEND-39) rather than the asset.

## Erasure

Signing values must survive ordinary deletion of contacts, profiles, documents
and sessions (§121, §236). Two mechanisms: no DELETE grant on any of the three
tables, and no cascade from any mutable resource.

Retention and any privileged erasure path are BACKEND-55's, and must weigh legal
retention against a deletion request rather than treating a signature as
ordinary personal data.

## Never in telemetry

Signature bytes, typed text, any field value, the digest, the storage of any
kind, recipient name or email, the request body, the session credential, the IP.

Log lines from this surface carry: an event name, a submission id, a field
count, a replay flag, and a bounded rejection reason. An architecture guard
reads every `request.log` payload and asserts it.
