# Routing activation

## The model: one integer

BACKEND-31 persists `routing_order` per recipient, where **equal values mean
parallel within a step**. There is no mode flag, because no backend command
persists one — the frontend's richer `PrepRoutingConfig` (mode, named groups,
`requiredCompletionRule`) is in-memory preparation state that nothing writes
down.

That single integer expresses all three shapes:

| Orders | Shape | Activates at send |
|---|---|---|
| `1, 1, 1` | **PARALLEL** | all three |
| `1, 2, 3` | **SEQUENTIAL** | the first only |
| `1, 1, 2` | **MIXED** | the first two |

So "which mode is this product in" is not a question with an answer. The
product's default is `routingOrder: 1` for everyone, which makes the common case
parallel; a sender who sets distinct values gets sequencing with nothing else
changing.

## The rule

**The earliest cohort PRESENT, and every recipient holding it.**

Not `recipients[0]`, and **not the literal value 1**. BACKEND-31 deliberately
permits a non-contiguous sequence — deleting the only recipient at step 1 leaves
2 and 3, and refusing to save that would block ordinary editing to enforce
tidiness. Assuming 1 would then activate nobody.

`planActivation` is pure and deterministic: same input, same plan, every time.

## Three outputs, not two

```
active      in the earliest cohort
waiting     a later cohort
provision   active AND of a type that can act
```

The separation between `active` and `provision` is the point.

Every recipient gets an **activation row**, active or waiting, so a later cohort
advance has somewhere to look and "who is outstanding" is answerable without
recomputing routing.

Only `provision` gets a **credential and a delivery intent**.

## Who is provisioned

Exactly the types that can hold fields — `signer`, `approver`, `reviewer`,
`acknowledgment-recipient`. Delegating to `canHoldFields` rather than restating
the list, because "can be asked to do something" and "needs a way in" are the
same question and two lists would drift.

`viewer` and `carbon-copy` are **activated but receive nothing**. They cannot
hold fields, so a signing credential is not what they need; what they need is a
document-VIEW credential, which does not exist. **OD-135.**

## Waiting recipients hold no credential

A bearer secret minted now for a turn that may be days away is a secret sitting
in a database for no reason. Sequential recipients are provisioned when they
activate, through the same `provisionSigningRecipientAccess` that Send calls —
one implementation, so the digest domain, the TTL and the never-persist-raw rule
cannot drift between the two moments.

## What BACKEND-37 must do

Activating the next cohort needs to know what "the current one finished" means,
which is ceremony state. When it does:

1. Read the activation rows for the request.
2. Decide the cohort is complete, by its own semantics.
3. Call `provisionSigningRecipientAccess` for each newly eligible recipient.
4. Update their activation rows to `active` with a timestamp.

The `UPDATE` grant on `signing_request_recipient_activation` exists for step 4.
Nothing in BACKEND-33 uses it.

## Telemetry

`routingShape` — `parallel`, `sequential` or `mixed` — is derived in the domain
and returned so the route has a **bounded** metric label. The route does not
infer it from the waiting count, which cannot tell sequential from mixed and
would make the label lie on a three-cohort request.
