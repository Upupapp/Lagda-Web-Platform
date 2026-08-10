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
