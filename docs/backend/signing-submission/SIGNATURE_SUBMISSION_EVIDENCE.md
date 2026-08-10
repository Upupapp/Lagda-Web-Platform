# Signature submission evidence

## The authoritative facts

Persisted on `recipient_submissions`:

| Fact | Column |
|---|---|
| Which request | `signing_request_id` |
| Which recipient | `request_recipient_id` |
| When it was accepted | `accepted_at` — backend Clock, the only timestamp |
| Which session performed it | `signing_session_id` |
| How that session authenticated | `authentication_method` |
| Which disclosure was in force | `consent_id` |

And on `signing_field_values`, one immutable row per accepted value, each
carrying its field, its type, its kind, its source and its value.

**Those rows are the evidence.** They are append-only at the privilege level,
tenant-, request-, recipient- and assignment-bound by foreign key, and they
cannot be rewritten by any statement the runtime role can issue.

## What is NOT duplicated into evidence metadata

The signature payload. §159 says an event may reference identities, counts and
digests rather than copying sensitive content, and the content already has an
authoritative home. Copying a raster into a second table would double the number
of places the most sensitive bytes in the system live, for no gain.

The typed signature text likewise. The `digest` column gives an integrity
reference without a second copy.

## No `evidence_events` row

Consistent with BACKEND-35 and for the same reason: **no use case in this
codebase writes an evidence event** — not request creation, not send, not the
ceremony. Writing the first one here would produce a trail whose only entries
are signature submissions, with holes where the document's creation, dispatch
and viewing should be.

`RECIPIENT_SUBMISSION_ACCEPTED` is the event this would emit, and the vocabulary
in migration 003 has no member for it, so adding it is a deliberate vocabulary
change rather than an insert. OD-145 owns the whole question.

**This is a recorded gap, not an oversight.** The facts above are better
evidence than a generic event row; what they are not is part of a unified,
queryable trail.

## Attribution stays separable

Four different facts, four different records, deliberately not merged:

- **authentication** — the session row (BACKEND-34) says how the recipient
  proved who they were;
- **consent** — the consent row (BACKEND-35) says which disclosure they accepted
  and when;
- **entry** — the progress row says when they began;
- **submission** — this row says what they signed and when.

A certificate that needs all four can join them. A certificate that needs one
does not have to disentangle it from the others (§161, §162, §170).

## IP and user agent: not captured

**NOT CAPTURED**, consistently with BACKEND-34 and BACKEND-35.

§163 permits them if evidence policy requires them, and BACKEND-43 has not said
what a completion certificate contains. Collecting PII for a consumer that may
never want it is collecting first and justifying later. `ObservedRequestMetadata`
exists and is trusted; the day the certificate needs it, the column is one
migration away and the source is already correct.

OD-143 tracks it, now for a third command.

**No geolocation, ever** (§164).

## `acceptedAt` is the one signing instant

One backend Clock reading per submission. `date-signed` field values carry the
same instant, and the submission row carries no second timestamp.

**BACKEND-37 must reuse it** as the recipient's signed-at (§166). Taking a fresh
reading at transition time would give one signing act two different times, and
the gap between them would be a scheduling artefact — how long the transition
took — presented as a fact about when somebody signed.
