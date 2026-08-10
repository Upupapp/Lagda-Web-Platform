# BACKEND-36 report — recipient signature submission

**Backend:** `697e29c` · **Migration:** 023 · **Date:** 2026-08-10

## What was built

One endpoint, three tables, one use case, 68 assertions, no new dependency.

```
POST /signing/submission   session + recipient CSRF + Idempotency-Key
```

## The submission model, decided by the product

**ATOMIC_RECIPIENT_SUBMISSION.** `RecipientContext.submitFinalAction()` is one
function that validates every required field and submits once. There is no
per-field finalize anywhere in the recipient flow, so §3's preference and the
product agree.

## The strongest control: a four-column foreign key

Every value points at a field **assignment** —
`(workspace_id, signing_request_id, request_field_id, request_recipient_id)` —
against a unique key this migration adds to `signing_request_fields`.

Submitting another recipient's field is therefore not "rejected by a check". It
**has no referent**. Integration proves it the only way worth proving it: R1's
session, R2's field, every application-layer check bypassed by calling the
repository directly, and PostgreSQL still refuses the row.

## Immutability is a privilege, not a convention

All three tables are `SELECT` and `INSERT` only. There is no statement the
runtime role can issue that would rewrite an accepted signing value — asserted
as `permission denied`, not as zero rows affected.

`recipient_submissions_one_per_recipient` and
`signing_field_values_one_per_field` mean a second submission **violates**
rather than overwrites.

## Idempotency was already provisioned for this command

BACKEND-14 listed `signature.submit` from the handoff and added the `recipient`
scope variant with the comment *"signature submission (BACKEND-36) is performed
by an external signer with no workspace session"*. Both are reused; inventing a
second operation name would have split one namespace in two.

**The fingerprint deliberately excludes the signature payload.** A drawn
signature is a canvas rasterisation and a retry that re-renders the same strokes
can differ by a byte; hashing the pixels would turn every drawn-signature retry
into a 409 — the precise failure the mechanism exists to prevent. Presence and
method are in; bytes are out. Array order is normalized away, and a test asserts
reordering does not conflict.

## Signature representation, read from the product

**Typed and drawn. No upload — there is no file input anywhere in the recipient
pages.**

Typed is `text` + an index into the four server-known styles, which is already
the shape the frontend has, so a client cannot name a font because there is
nowhere to put one.

Drawn is the 420 × 120 canvas PNG: decoded, magic-byte checked, IHDR-parsed,
dimension bounded, byte bounded at 64 KiB, stored as `bytea`, hashed over the
stored bytes. The data-URL prefix is **refused** rather than stripped — a silent
strip hides a client bug.

### Why the raster is in PostgreSQL

§53 prefers object storage; this went the other way, and the reason is the
failure model rather than the size. Object storage and the database are not
atomic together, so a binary asset needs a pending row, a claim step, a
commit-order window and an orphan sweeper. **Choosing the database makes that
entire class of problem not exist**, on the most legally consequential write in
the product. The threshold at which that flips is recorded.

## Findings

**Server-owned values were being ignored, not rejected.** The first
implementation derived them and silently discarded any client value; a test
caught it. Ignoring hides a client that still believes it set the signing date,
so they are now refused with `field-server-owned`. This is the defect this
command actually found in itself.

**`truncateAll` needed six new tables in a load-bearing order.** The
assignment key means `signing_request_fields` cannot be deleted while a value
points at it — the constraint working exactly as intended, surfacing as thirteen
failing tests until the teardown was unwound in the reverse order.

**Two architecture guards were narrowed**, each with the reason recorded at the
assertion: one looked for a literal table name in a grant the migration issues
through a loop, and one matched `acceptedAt` in the *response* schema where it
legitimately belongs.

**A control-character regex could not survive lint or scripted editing.**
Replaced with a code-point test, which says the same thing in a form a reviewer
can actually see.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1858 passed, 62 files** (+54) |
| `npm run build` | Pass |
| `npm run test:integration` | **595 passed, 49 skipped** (+14) |
| Migration from zero | Verified — `lagda_zero8_test` |

One integration run reported 2 failures of 644 that the filtered output did not
name; the following run was green. Recorded in the test matrix.

## Honest gaps

**No HTTP route suite**, for the fourth command running. The largest single
testing gap in the signing stack now.

**No PNG validator unit suite.** Its magic-byte, IHDR and bounds logic is
asserted by reading the source, not by feeding it a truncated PNG or an SVG.
Cheap to add and genuinely missing.

**No evidence event**, deliberately and consistently with BACKEND-35 — nothing
in this codebase writes one (OD-145).

**No IP or user agent**, for the third command (OD-143).

**The submission-versus-cancellation race is narrow but real** and is closed by
BACKEND-37's lock order, documented in SIGNATURE_SUBMISSION_CONSISTENCY.md
rather than claimed impossible.

**The intermediate state is live**: an accepted submission can exist while the
recipient's workflow state says nothing happened. Expected per §151, and the
feature is not externally production-ready until BACKEND-37 consumes it.

## What BACKEND-37 inherits

An immutable, idempotent, concurrency-safe record of exactly what each recipient
submitted and when — with `accepted_at` as the one timestamp it must reuse.
