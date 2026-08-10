# Ceremony entry and view semantics

Two facts, deliberately separated, each with a meaning narrow enough to defend.

## 1. ENTERED — `signing_recipient_progress.first_entered_at`

**Operational meaning, exactly:** an authenticated recipient session explicitly
requested the ceremony via `POST /signing/ceremony/enter`, the request was
signable, routing had reached this recipient, and the server returned the
ceremony projection. The timestamp is the backend Clock at that moment.

**It does NOT mean:**

- that an email was opened, or that a link preview or scanner fetched anything;
- that a bootstrap credential was exchanged — that is BACKEND-34 and leaves no
  ceremony trace, asserted directly;
- that the document was rendered, or fetched, or that any byte moved;
- **that a human read anything at all.** Not one page, let alone every page.
  §96, and it is the claim most worth refusing;
- that consent was given;
- that anything was signed.

**Set once.** `insert … on conflict do nothing`, so a reload is not a second
entry and two concurrent entries converge on one row and one timestamp with no
lock. The runtime role holds no UPDATE privilege on the table, so the value
cannot be rewritten by any statement it can issue.

**A refused entry records nothing.** The view is built — and throws — before the
write, so a waiting recipient reloading the page does not accumulate a
first-entry time for a ceremony they never entered.

## 2. Document access

No durable record. An operational metric increments; the log line carries ids
only.

The honest reason: the backend knows a byte stream was opened, and nothing more.
Object storage is not transactional (§94) and a stream that begins is not a
document that arrived, let alone one that was displayed. §93 warns against an
event whose name claims more than can be guaranteed across a database and an
object store, and `document-viewed` recorded at the moment a stream opens claims
about half of what its name says.

## Why no `evidence_events` row

`evidence_events` exists, with `document-viewed` and `consent-accepted` already
in its vocabulary. **BACKEND-35 writes neither**, and the reason is consistency
rather than reluctance:

**No use case in this codebase writes an evidence event.** Not request creation,
not send, not access. Writing the first one here would produce an audit trail
whose only entries are ceremony entries — a record with a hole where the
document's creation and dispatch should be, which reads as *missing* rather than
as *not yet built*.

Wiring the lifecycle into evidence is one cross-cutting command's job: it needs
`transaction-created`, `transaction-sent`, `document-viewed`,
`consent-accepted` and `signature-completed` written by the same hand, in one
pass, with one decision about actor types and observed metadata. Recorded as an
open decision.

**The authoritative facts BACKEND-35 does persist** — `first_entered_at` and the
consent rows — are purpose-built, append-only and privilege-locked. They are
better evidence than a generic event row, not worse; what they are not is part
of a unified trail.

## What the sender will eventually see

BACKEND-35 provides the data foundation for a "Viewed" indicator (§176):
`first_entered_at`, readable in the workspace realm through tenant isolation.

Whoever builds that UI must label it accurately. "Opened the signing page" is
true. "Read the document" is not, and the gap between them is the whole reason
this document exists.

## Scanner safety, end to end

| Step | Records |
|---|---|
| Email delivered | nothing |
| Scanner GETs the link | nothing — it targets a frontend route |
| Frontend POSTs `/signing-access/bootstrap` | a session (BACKEND-34) |
| Frontend POSTs `/signing/ceremony/enter` | **first entry** |
| Recipient accepts the disclosure | **consent** |
| Frontend GETs the document | nothing durable |

Only the fourth step records entry, and it requires a session cookie a scanner
cannot obtain and a CSRF token it cannot compute. Asserted: after a bootstrap
exchange and before any ceremony call, both ceremony tables are empty.
