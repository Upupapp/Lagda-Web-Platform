# Signing routing state

## Cohorts are one integer

BACKEND-31 persists `routing_order` per recipient, where **equal values mean
parallel**. That single integer expresses all three shapes, so there is no mode
flag to read and no third code path:

| Orders | Shape | Activates at send |
|---|---|---|
| `1, 1, 1` | PARALLEL | all three |
| `1, 2, 3` | SEQUENTIAL | the first only |
| `1, 1, 2` | MIXED | the first two |

`planWorkflowAdvance` is pure and deterministic — same states in, same plan out,
including the ORDER of the lists a caller provisions from.

## A cohort is complete when its REQUIRED signers are done

Not when every member is done. A carbon-copy sitting in cohort 1 can never
finish anything, and waiting for them would stall the request permanently.
Optional participants are treated the same way: they may act, and the workflow
does not wait.

`isRequiredSigningParticipant` = `canHoldFields(type) && isRequired`. Both facts
come from the immutable snapshot; nothing here reads a preparation or a contact.

## The current cohort is the earliest one that still owes something

Not `recipients[0]`, and not the literal `1`. BACKEND-31 deliberately permits a
non-contiguous sequence — deleting the only recipient at step 1 leaves 2 and 3,
and refusing to save that would block ordinary editing to enforce tidiness.
Assuming 1 would then advance nobody.

The check is `routingOrder <= currentCohort` rather than `=`, so a straggler left
behind by an earlier partial state cannot be stepped over.

## A partial cohort never advances

If any required participant at or before the current cohort is still `active`,
the plan is `waiting` and nothing moves. Proven for the three-recipient case the
spec names: A at 1, B at 1, C at 2 — C stays `waiting` until BOTH A and B have
signed, and then activates exactly once.

## Barren cohorts are walked through

A cohort holding only viewers has nothing that could ever complete it, so
stopping there would leave the request stuck with no future trigger. The plan
walks forward until it reaches a cohort containing at least one required
participant, activating each barren cohort on the way. Every one of them is
genuinely activated — a viewer at step 2 does receive the document — they simply
do not become a wall.

## Three outputs, not two

```
active      in the cohort being activated
waiting     a later cohort
provision   active AND of a type that can act
```

The separation between `active` and `provision` is the point, and it is
BACKEND-33's rule unchanged: `viewer` and `carbon-copy` are activated and
receive nothing, because a signing credential is not what they need (OD-135).

## Activation reuses the BACKEND-33 provisioner

`provisionSigningRecipientAccess` was a private function in `send.ts` and is now
exported, with its dependency slice split out as
`SigningAccessProvisioningDependencies`. BACKEND-37 calls **that function**, not
a copy of it, so credential generation, sealing, the digest domain, the TTL and
the never-persist-raw rule cannot drift between the send path and the sequential
path.

An architecture guard asserts the workflow module calls it and that it does NOT
itself call `tokens.issue`, `sealer.seal`, `insertGrant` or
`insertDeliveryIntent`.

## Ordering inside the transaction

```
lock the request (select ... for update)
  -> activate the cohort, conditionally on `waiting`
  -> assert the count matches the plan
  -> provision each member that needs a credential
  -> mark the intents applied
commit
```

The count assertion is a corruption check rather than a race guard — the request
row is locked, so no concurrent advance can be inside this section. If it fires,
provisioning has not happened and the whole transaction rolls back, which is
what stops a cohort activating without a usable way in (§53, §56, §167).

## Idempotency without bookkeeping

The advance reads every recipient's current state and decides what SHOULD be
true. It consumes no event, increments no counter, and does not care how many
times it has run:

- run it on a request whose cohort just finished, and the cohort activates;
- run it again, and those recipients are `active` rather than `waiting`, so
  `activateRecipients` matches zero rows and nothing is provisioned;
- run it on a `completion-ready` request, and the answer is `no-change`.

That is what makes §29, §59, §160, §236 and §239 true without a dedup table.
The unique key on `(signing_request_id, request_recipient_id, trigger_kind)`
means a duplicate delivery cannot even enqueue a second advance.

## Telemetry

`routingShape` — `parallel`, `sequential`, `mixed` — is derived in the domain, so
the route has a bounded metric label. The advance returns a bounded
`WorkflowAdvanceOutcome` plus COUNTS: `activatedCount`, `provisionedCount`,
`intentsApplied`. Never a list of recipients, which would be unbounded
cardinality and a disclosure at once.
