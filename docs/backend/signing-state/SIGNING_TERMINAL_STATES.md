# Signing terminal states

Two are implemented, two are not, and each verdict came from the product.

| State | Status | Product evidence |
|---|---|---|
| `declined` | **IMPLEMENTED** | `DeclinePage.tsx` is a complete recipient page; `status-map.ts` marks `declined` terminal |
| `cancelled` | **IMPLEMENTED** | `avail("cancel", isActive && canPrepare)` with a required reason |
| `voided` | **DEFERRED** | `avail("void", isCompleted && canAudit)` — needs `completed`, which BACKEND-37 cannot produce |
| `expired` | **FOUNDATION ONLY** | the lifecycle edge exists; BACKEND-46 owns the schedule (OD-014) |

## Decline — the recipient's refusal

**One participant's decline ends the request for everyone.** OD-017 asked
whether that or "continue for the others" was right, and §54 forbade guessing.
The product answers it twice:

- `status-map.ts:123` — "A recipient declined to sign or approve",
  `isTerminal: true`.
- `signing-workflow.resolver.ts:275` — `documentStatus === "declined"` gives the
  workflow a terminal reason of exactly "A participant declined."

So OD-017 is CLOSED by measurement, not by preference.

Mechanically: the recipient's own row moves `active -> declined` in the
recipient realm with an advance intent beside it; the advance sees the declined
recipient FIRST — before any cohort evaluation — and moves the request to
`declined`. A request cannot activate its next cohort on the same evaluation
that discovers it is over.

**The reason is a closed code.** Five categories, exactly the product's
`DECLINE_REASON_CATEGORIES`. The optional free-text note the page also offers is
NOT stored: §78, and the page's own copy tells the recipient nothing is
persisted.

**A viewer cannot decline.** Refusing requires having been asked for something.

## Cancel — the sender's withdrawal

Capability `signing-request.cancel`, held by exactly the four roles that hold
`document.prepare`, because the product gates the control on `canPrepare` rather
than on an administrative permission. Membership is read INSIDE the transaction:
a sender demoted a moment ago must not withdraw a document under authority they
have lost.

**Only from `sent` and `partially-completed`.** The conditional UPDATE names
them, so a request that reached `completion-ready` is refused with
`all-signatures-collected`. §95 asked for that decision to be explicit; the
product had already made it, and the lifecycle table records it where a reader
will find it.

The reason is REQUIRED and stored, bounded at 200 characters as the product
bounds it — workspace-authored content about the workspace's own document, a
different risk class from a recipient's note. Never logged, never in telemetry.

## What a terminal request denies, and how

| Layer | Effect |
|---|---|
| **state** | `assessSigningEligibility` refuses everyone: not signable, so no entry, no submission, no decline. This is the load-bearing control |
| **grants** | every live `signing_access_grants` row is revoked, so a forwarded link stops resolving at the LOOKUP rather than at the policy |
| **sessions** | every live `recipient_signing_sessions` row is revoked with reason `request-terminal` — the vocabulary BACKEND-34 declared for this moment and that nothing had ever written |
| **routing** | the advance answers `not-advanceable` and activates nobody. Waiting recipients are never provisioned |
| **pending OTP / auth** | denied by the same state check; there is no authentication path that does not pass through it |

Two layers, neither relying on the other (§83, §84, §85, §86).

**Delivery intents already queued are NOT cancelled.** §89 permits deferring
that, and BACKEND-45 owns dispatch; an invitation that arrives for a cancelled
request lands on a page that refuses it. Recorded as an open decision rather
than half-built.

## Expiry

`isExpired` is derived in `lifecycle.ts` and the transition table has the
`expire` edge from both active states. **Nothing schedules it and nothing reads
a deadline in BACKEND-37.** When BACKEND-46 builds it, the terminal behaviour is
the same as cancel's: no submissions, no access, no routing, grants and sessions
revoked.

`expire` is deliberately absent from `completion-ready`. A deadline that passes
after the last signature does not un-sign anything.

## Void

Deferred, and the distinction from cancel is real rather than cosmetic: cancel
stops an in-flight request, void invalidates a finished one. The product gates
them on different states and different permissions (`canPrepare` vs `canAudit`).
Building void now would mean inventing the semantics of invalidating a document
people have already signed, against a `completed` state that does not exist yet.
