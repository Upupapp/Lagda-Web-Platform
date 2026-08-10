# Signing request state machine

## Today

```
        create
          │
          ▼
      ┌───────┐
      │ draft │        ← the only state BACKEND-32 can produce
      └───────┘
          │
          ┆ send  (BACKEND-33 — NOT IMPLEMENTED)
          ▼
       [ sent ]
```

One state. Not a state machine — a starting point.

## The two vocabularies, and why they differ

**The type** carries the whole lifecycle: `draft`, `ready-to-send`, `sent`,
`partially-completed`, `completed`, `declined`, `cancelled`, `expired`. That
union was derived from the product's `TransactionStatus` by an earlier command
and lives in `@lagda/contracts` since BACKEND-32 persists and returns it.

**The database** admits `draft` and nothing else:

```sql
constraint signing_requests_state_check check (state in ('draft'))
```

The split is deliberate. A response schema that admitted one value would need
widening in lockstep with every future transition, and a client generated from
it would break on the first `sent` request it saw. A CHECK that admitted eight
would let a bug write a request claiming something nobody did.

So the type is the vocabulary and the **database is the gate**. Widening the
CHECK is a one-line migration that BACKEND-33 performs alongside the mechanism
that earns the value.

The integration suite asserts the gate directly: an `UPDATE … set state = 'sent'`
as the runtime role is a constraint violation today.

## Why `draft` and not `ready-to-send` or `created`

`ready-to-send` exists in the product's `TransactionStatus` and **nothing in the
frontend can produce it** — it appears only on fixture documents. Adopting it
would mean claiming a readiness assertion the product never makes.

`created` is not in the product's vocabulary at all.

`draft` is in the vocabulary, is the state fixtures use for un-sent
transactions, and says the true thing: configured, not sent.

## Six canonical values that are deliberately NOT states

Recorded by the earlier lifecycle work and unchanged:

| Value | Why it is not a state |
|---|---|
| `delivered` | An event. Delivery does not change what the request waits for |
| `viewed` | An event. A viewed request is still awaiting its recipients |
| `authentication-completed` | An event about one recipient, not the request |
| `awaiting-signature` | Derived from which participants remain outstanding |
| `awaiting-approval` | Derived, as above |
| `failed-delivery` | A delivery-channel outcome, not a lifecycle state |

A status field with one slot cannot hold a history. Storing `viewed` would
overwrite the knowledge that the request is still waiting.

## No transition is implemented

There is no `transitionState`, no `send`, no `cancel`, no `void`. The port
declares none, the repository issues no `UPDATE` against `signing_requests`, and
the API exposes no `PATCH`, `PUT` or `DELETE`.

The `UPDATE` **grant** exists on the request row, and only there — that is the
seam BACKEND-33 uses, and the reason the two snapshot tables were granted
`INSERT`/`SELECT`/`DELETE` and no more.

## What BACKEND-33 must do here

1. Widen the CHECK to admit `sent`.
2. Add `sent_at` — with the send that writes it, not before.
3. Transition transactionally, conditioned on the current state, in the same
   statement that claims it. The pattern is BACKEND-30's `replaceLayout`: check
   and claim in one `UPDATE`, so a concurrent send matches zero rows rather than
   sending twice.
4. Refuse to send anything not in the exact send-eligible state.
5. Use its own capability, `signing-request.send`. Create does not imply send.

---

# Updated by BACKEND-33

```
        create                       send
          │                            │
          ▼                            ▼
      ┌───────┐   SendSigningRequest  ┌──────┐
      │ draft │ ────────────────────► │ sent │
      └───────┘   conditional, atomic └──────┘
                                          │
                                          ┆ BACKEND-37
                                          ▼
                            [ partially-completed, completed,
                              declined, cancelled, expired ]
```

**Two states.** The CHECK now admits `draft` and `sent`, and nothing else. The
remaining five in the type are still claims nothing can make true.

## The transition

```sql
update signing_requests set state = 'sent', sent_at = $1
 where workspace_id = $2 and signing_request_id = $3 and state = 'draft'
```

Conditional in the statement, not before it. Two sends racing under different
keys would both read `draft`; the second matches zero rows.

A CHECK refuses `state = 'sent'` with a NULL `sent_at`, and the reverse.

## What `sent` means, precisely

The sender committed the request, and the durable work required for initial
recipient access was written.

**Not** delivered, opened, viewed, authenticated or signed. Provider delivery
state is BACKEND-45's and lives in a different subsystem.

## One-way

There is no `sent → draft`. A request that has been sent cannot be un-sent;
cancel, void and reissue are future transitions with their own semantics, not a
rollback.

## Recipient activation is a separate machine

```
waiting ──► active
```

Two values, on `signing_request_recipient_activation`. Neither is a ceremony
state: this table answers "should this recipient currently be able to reach the
document", and nothing else. BACKEND-37 adds `viewed`, `signed` and `declined`
to its own table.


---

# Updated by BACKEND-37

```
   draft ──send──► sent ──first signature, work remains──► partially-completed
                     │                                            │
                     └──────── every required signer signed ──────┤
                                                                  ▼
                                                        completion-ready
                                                                  │
                                                                  ┆ BACKEND-38
                                                                  ▼
                                                            [ completed ]

   sent / partially-completed ──decline──► declined      (a participant refused)
   sent / partially-completed ──cancel───► cancelled     (the sender withdrew)
   sent / partially-completed ──expire───► [ expired ]   (edge exists, BACKEND-46 schedules)
```

**Six states in the CHECK**: `draft`, `sent`, `partially-completed`,
`completion-ready`, `declined`, `cancelled`. `completed` and `expired` are still
in the type and still cannot be written — the type is the vocabulary and the
database is the gate, exactly as before.

## `completion-ready`, and why it is not `completed`

The one value in the union that is NOT from the product's `TransactionStatus`.
The product conflates two facts that fail independently — everyone signed, and
the completed document exists — and PDF merge, certificate generation and
sealing all happen afterwards. `completed` is terminal and legally significant,
so a request that reached it wrongly could not be walked back.

**BACKEND-37 REMOVED the `sent --complete--> completed` edge** that BACKEND-04's
table carried. `complete` now has exactly one source, `completion-ready`, and
BACKEND-37 holds no path to it.

## `partially-completed` is the product's IN_PROGRESS

`status-map.ts` — "Partially Signed / Some but not all recipients have completed
their actions." The trigger is the first accepted submission that is not the
last. It is a real product status with real copy, so it is used rather than
invented around.

## What `cancel` cannot do

`cancel` is absent from `completion-ready`, and it is the product's rule:
`transaction-detail.service.ts` offers cancel only while a transaction is
active, and a request whose signatures are all collected is not. `expire` is
absent for the same reason — a deadline that passes after the last signature
does not un-sign anything.

## Recipient activation is no longer a separate machine

BACKEND-33 wrote that `signing_request_recipient_activation` held "two values,
and neither is a ceremony state". BACKEND-37 widened the column to four and
renamed it `recipient_state`: once `signed` exists, whose turn it is and what
they did are the same question. See `../signing-state/RECIPIENT_STATE_MACHINE.md`.
