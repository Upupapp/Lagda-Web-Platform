# Completion certificate — content policy

**Command:** BACKEND-40 · **Applies to:** `completion-certificate-v1`
**Read with:** `COMPLETION_CERTIFICATE_PRODUCT_INVENTORY.md`,
`CERTIFICATE_AUTHENTICATION_LANGUAGE.md`, ADR-032

Every field the certificate shows, what it means, and — the column that matters
most — **what it does not prove**.

## The rule this document exists to enforce

> The completion certificate reports authoritative LAGDA signing facts. It must
> never overstate what LAGDA actually verified.

LAGDA's own product says the same thing twice, in `CompletionPage.tsx:5` ("No
verification certificate, no 'court-admissible' claims") and
`TransactionDetailPage.tsx:674` ("It does not constitute a legal certificate or
court-admissible document"). The certificate is a record of what was recorded.
Nothing more is claimed anywhere on it.

## Visible fields

### Document

| | |
|---|---|
| **Label** | Document |
| **Source** | `signing_requests.document_title` — the title FROZEN at send |
| **Required** | Yes. A missing snapshot FAILS the step |
| **Privacy** | Business content |
| **Does not prove** | That the file is unchanged — that is the digest's job, below |

The current `documents` row is never read. Renaming a document after signing
must not rewrite what the certificate says was signed, so an absent snapshot is
a failure rather than an invitation to substitute today's name (§22).

### Signing source document SHA-256

| | |
|---|---|
| **Label** | Signing source document SHA-256 |
| **Source** | The digest of the request's frozen `sourceArtifactId` |
| **Required** | Yes |
| **Privacy** | Integrity metadata |
| **Does not prove** | Anything about the FINAL sealed document, which does not exist yet |

Named "signing source", not "prepared" — LAGDA has never produced a prepared
artifact, and the previous label said so falsely. See the inventory's defect 1.

### Participant name

| | |
|---|---|
| **Label** | (rendered as the heading of each participant block) |
| **Source** | `signing_request_recipients.name` — the immutable request snapshot |
| **Required** | Yes |
| **Privacy** | PII |
| **Does not prove** | That the named person is who they claimed to be. LAGDA verifies no legal identity |

Never a Contact, never a current user profile. Changing either after signing
leaves the certificate untouched, and that is the point.

### Participant email (masked)

| | |
|---|---|
| **Label** | (rendered under the name) |
| **Source** | `signing_request_recipients.email`, masked to `j***@example.com` |
| **Required** | Yes, where an address exists |
| **Privacy** | PII, minimised |
| **Does not prove** | That the mailbox was read, or that delivery succeeded |

**Masked by owner decision, 2026-08-11.** The name already identifies the
signer; the address is supporting delivery identity, and a certificate is the
artifact most likely to be forwarded onward. The full value stays in the
immutable request snapshot, so audit loses nothing.

The mask is deterministic: first character (only when the local part is longer
than one), then a **fixed** three asterisks so the hidden length does not leak,
then the full domain. A malformed address masks entirely — this function is
never the thing that lets an unmasked value through.

### Signed

| | |
|---|---|
| **Label** | `Signed: YYYY-MM-DD HH:mm:ss UTC` |
| **Source** | `recipient_submissions.accepted_at` |
| **Required** | Yes. A participant with no signing time FAILS the step |
| **Privacy** | Evidence metadata |
| **Does not prove** | Where the signer was, or what device they used |

The authoritative signing instant, never regenerated at certificate time (§8).

### Authentication

| | |
|---|---|
| **Label** | `Authentication: Signing link` / `Authentication: Email one-time passcode` |
| **Source** | `recipient_submissions.authentication_method` |
| **Required** | Yes |
| **Privacy** | Security/evidence metadata |
| **Does not prove** | **Identity.** See `CERTIFICATE_AUTHENTICATION_LANGUAGE.md` |

Read off the SUBMISSION, so it is the method used for the accepted signing —
not the recipient's most recent authentication (§150).

### Signing session entered

| | |
|---|---|
| **Label** | `Signing session entered: YYYY-MM-DD HH:mm:ss UTC` |
| **Source** | `signing_recipient_progress.first_entered_at` |
| **Required** | No. Omitted entirely when absent |
| **Privacy** | Workflow/evidence metadata |
| **Does not prove** | **That anyone read the document.** It means an authenticated recipient opened the signing ceremony |

§7. The wording says "entered", never "viewed" or "read", and it must not drift.
First entry only — not every reload (§152).

### Consent

| | |
|---|---|
| **Label** | `Consent (<type> <version>): YYYY-MM-DD HH:mm:ss UTC` |
| **Source** | `signing_recipient_consents`, bound via `recipient_submissions.consent_id` |
| **Required** | No — but ALL-OR-NOTHING |
| **Privacy** | Legal/evidence metadata |
| **Does not prove** | That the disclosure was read or understood |

Absent consent is legitimate: not every recipient is asked. **Partial** consent
is not — a type with no version, or a version with no time, fails the step.
Certifying "consented" without saying to what or when is precisely the overclaim
§40 guards against.

### Certificate generated / Certificate version

| | |
|---|---|
| **Label** | `Certificate generated` · `Certificate version` |
| **Source** | The step's clock; the two version constants |
| **Required** | Yes |
| **Privacy** | Provenance metadata |
| **Does not prove** | Anything about the signing. It is a fact about this page |

§9: deliberately distinct from any signing time and from completion time.

### The disclaimer

Verbatim from the product's approved copy, with the middle sentence taken
directly from `TransactionDetailPage.tsx`:

> This certificate records the completion evidence held by LAGDA for the
> document identified above. **It does not constitute a legal certificate or
> court-admissible document**, and does not itself attest to signer identity.
> Authentication describes the mechanism used to reach the signing session; it
> is not verification of legal identity.

§97 forbids inventing legal language. LAGDA already had copy disclaiming exactly
this kind of document, which makes it the single most important line here rather
than boilerplate.

## Deliberately absent, each with its reason

| Field | Why not |
|---|---|
| `completedAt` | The request is not completed. Requiring it would make the certificate depend on a step that depends on the certificate (§167) |
| Final sealed digest | Does not exist yet. No placeholder either (§162) |
| Seal metadata / "Sealed" | Nothing is sealed at this point (§163) |
| Verification ID | BACKEND-41/42 own verification identity (§15) |
| Merged candidate digest | **Owner decision:** internal provenance only. Two similar hashes invite comparing the wrong one, and the term is not explicable to a signer |
| The certificate's own digest | Cannot be inside itself without circularity. It is artifact metadata (§95) |
| IP address | **LAGDA stores none as evidence.** The only `ipAddress` is a rate-limit bucket scope, which BACKEND-13 hashes. Measured, not merely declined |
| User agent | Stored on evidence events; omitted by policy (§36) |
| Device / geolocation | No derivation exists and none may be invented (§37, §158) |
| Raw signature | The signed document already renders the mark (§43) |
| Field values | The certificate summarizes evidence; it is not a second copy of the form data (§44) |
| OTP codes, tokens, session ids, storage keys | Never (§85–§87) |
| Status label | Nothing may claim completion before it is true (§165) |
| Non-signing recipients | The certificate records signing evidence (§49) |
| QR code | No product requirement and no verification identity (§16) |

## Ordering and formatting

**Participants** are ordered by `routingOrder`, then `orderIndex`, then
`recipientId` — the request's own immutable ordering, never the database's
natural order (§50).

**Times** render as `YYYY-MM-DD HH:mm:ss UTC`. Locale-independent, and the zone
is on the page rather than assumed. The server's locale never participates
(§53).

**Long values wrap; they are never truncated.** A signer's identity being
silently shortened to fit a layout would be a worse defect than an ugly page
(§105).

## Enforcement

These are not conventions. The model type carries no field for anything in the
"deliberately absent" table, so the renderer cannot draw one; a source scan
asserts the renderer contains no forbidden literal; and the builder throws on
every required-but-missing fact rather than rendering a placeholder.

Note the testing constraint recorded in the suite: certificate text is **not**
byte-searchable, because the embedded font encodes glyph indices into a
compressed stream. Assertions of absence are made against the model and the
renderer source, both of which can actually fail.
