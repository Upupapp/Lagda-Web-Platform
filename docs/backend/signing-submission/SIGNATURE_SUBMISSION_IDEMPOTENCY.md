# Signature submission idempotency

**Mandatory.** A lost response is indistinguishable from a failure to the
browser that sent it, and the natural reaction — retry — would otherwise create
a second signing act. There is no un-signing.

## The operation and the scope

| | |
|---|---|
| Operation | `signature.submit` |
| Scope | `{ type: "recipient", recipientId, signingRequestId }` |

**Both already existed.** BACKEND-14 listed `signature.submit` from the handoff,
and added the `recipient` scope variant with the comment: *"signature submission
(BACKEND-36) is performed by an external signer with no workspace session — the
framework must not depend on `AuthenticatedActor.userId`."*

Inventing `signing_recipient.submit` beside it would have split one namespace
across two, which is exactly what the closed union exists to prevent.

Recipient scope is more precise than workspace scope (§31): two recipients of
the same request are two signers, and a key one uses must not collide with the
other's.

## Authorization first

The recipient session is resolved **before** the key is claimed. Possession of a
key grants nothing (§32) — a caller with a valid key and no session fails at
authentication.

## The fingerprint

Over: the request id, the recipient id, the submitted values **sorted by field
id**, and the signature/initials **method**.

### What is excluded, and why each one

**The signature payload.** A drawn signature is a canvas rasterisation, and a
retry that re-renders the same strokes can differ by a byte — antialiasing,
device pixel ratio, a repaint. Fingerprinting the pixels would turn every
drawn-signature retry into a 409, which is the precise failure this mechanism
exists to prevent. The **presence** and the **method** are included, because
switching typed→drawn is a different act; the bytes are not.

**Array order.** §34: two submissions of the same values in a different order
are the same act, and a client that rebuilds its array on retry must not get a
spurious conflict. Sorting by field id before hashing makes order irrelevant —
asserted directly.

**Per §33:** the HTTP correlation id, the session token, the CSRF token, the IP,
the user agent, the generated submission id and every backend timestamp. All of
them differ between two attempts at the same act.

## The four outcomes

| Situation | Behaviour |
|---|---|
| **Same key, same payload** | Replays the original `submissionId` and `acceptedAt`. No new rows. |
| **Same key, different payload** | `409 IDEMPOTENCY_CONFLICT`. Nothing is overwritten. |
| **Same key, still running** | `409` in-progress. The concurrent attempt owns it. |
| **New key, already submitted** | **`RECIPIENT_ALREADY_SUBMITTED`.** |

### Why a new key is refused rather than converged

§38 offers convergence when the data matches; §39 states the preference and this
follows it. A client that generates a **new** key believes it is performing a
**new** act. For an immutable signing record there is no such thing as a second
one, so saying so plainly is the only honest answer — and silently returning the
first submission would tell a client its second signature was accepted when it
was not.

## Lost response

The canonical case, and the reason the whole mechanism exists: the transaction
committed, the response never arrived. The retry carries the same key, finds a
completed record, and receives **the original result including the original
`acceptedAt`**. A test asserts the timestamp does not move even when the clock
has.

## Completion is in the same transaction

`idempotency.complete()` runs on the transaction that wrote the submission. A
key completed separately could mark an act done whose mutation rolled back —
and every later retry would then replay a submission that never happened.

## Retention

24 hours by default. Long enough for any realistic retry, short enough that the
table does not accumulate. Expiry is swept off the request path.
