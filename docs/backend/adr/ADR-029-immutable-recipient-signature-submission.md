# ADR-029 — Immutable recipient signature submission

**Status:** Accepted (BACKEND-36)
**Date:** 2026-08-10
**Related:** ADR-028 (ceremony), ADR-027 (signing access), BACKEND-14
(idempotency), BACKEND-32 (snapshot)

## Context

A recipient must commit authoritative signing values in a way that a network
retry, a second browser tab, a later ceremony edit or a change to mutable
authoring state cannot alter.

Three properties have to hold simultaneously, and each is easy alone: the act
must be **idempotent** (retries are indistinguishable from failures), the values
must be **immutable** (a signature is not a draft), and the field set must be
**owned** (one signer must not be able to sign another's field).

## Decision

**An idempotent atomic `RecipientSubmission` writing immutable
`SigningFieldValue` rows, with typed representations and no PDF work.**

1. **Atomic per recipient**, because the product submits once.
2. **A four-column foreign key** from every value to the field *assignment*, so
   cross-recipient submission has no referent.
3. **SELECT and INSERT only** on all three tables — immutability as a privilege.
4. **Unique per recipient and per field**, so a second act violates.
5. **BACKEND-14's `signature.submit` and `recipient` scope**, both of which were
   added in advance for this command.
6. **A fingerprint over logical values, not pixels.**
7. **Typed and drawn only**, because the product has no upload.
8. **The raster in PostgreSQL**, because object storage is not atomic with it.
9. **`accepted_at` is the one instant**, and BACKEND-37 must reuse it.

## Alternatives rejected

**Write values onto the request fields.** Rejected: it would make the immutable
snapshot mutable, and BACKEND-32's entire premise is that a sent request stops
depending on anything that can change. The field says what was *asked*; the
value says what was *given*.

**Mutable field values.** Rejected: "the signer corrected it" and "somebody
changed what they signed" are indistinguishable afterwards. Correction, if the
product ever needs it, must be a new act with its own history — which an
immutable table permits and a mutable one destroys.

**Per-keystroke or per-field authoritative values.** Rejected on two grounds:
the product has one submit button, and a partially finalized recipient is a
state with no legal meaning. What is half a signature?

**PDF merge during submission.** Rejected, and this is the separation that
matters most. Merging couples the correctness of a *legal record* to the
correctness of a *rendering*: a PDF library failure would then mean the
signature was not accepted, and a rendering change later could not be re-run
against what was actually signed. Logical values first, rendering after, is what
makes the second replayable and the first durable.

**Object storage for the raster.** Rejected *here*, not in general. Storage and
the database are not atomic together, so it needs a pending row, a claim step, a
commit-order window and an orphan sweeper — four moving parts on the most
legally consequential write in the product, to hold a few kilobytes. The
threshold at which that trade flips is written down.

**A generic `value JSONB` column.** Rejected: it would accept a checkbox as the
string `"yes"` and a signature as anything at all. §111, and explicit columns
mean the database rejects a shape the validator missed.

**Silently converging a new idempotency key onto the existing submission.**
Rejected: a client that generates a new key believes it is performing a new act,
and telling it "accepted" when nothing happened is a lie that surfaces later.

**Ignoring client values for server-owned fields.** Rejected after being
implemented — a test caught it. Ignoring hides a broken client; rejecting makes
the disagreement visible while it is still cheap.

## Consequences

**Good**

- Cross-recipient submission is impossible rather than refused, and integration
  proves it against a bypassed application layer.
- A retry can never double-sign; a second act can never overwrite the first.
- Rendering can change without touching what was signed.
- BACKEND-37 receives one authoritative timestamp and cannot invent a second.

**Costs**

- Signature bytes live in PostgreSQL, which is unusual and bounded at 64 KiB.
  A larger format forces the migration this avoided.
- No amendment at all. A typo in a text field means a new request.
- The intermediate state is real until BACKEND-37 lands.
- The submission-versus-cancellation window is narrow and open until the state
  machine takes the request lock.

**Left open**

OD-150 (amendment and reissue), OD-151 (the cancellation lock order),
OD-152 (`date-signed` rendering timezone), OD-153 (signature retention and
erasure), plus OD-143 and OD-145 carried forward.
