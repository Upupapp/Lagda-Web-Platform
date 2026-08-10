# Preparation state machine

Two states, one transition, and **nothing in BACKEND-30 performs it**.

```
          ┌────────────┐                      ┌──────────┐
  create  │  EDITABLE  │ ──── BACKEND-32 ───▶ │  LOCKED  │
 ────────▶│            │      (no writer yet) │          │
          └────────────┘                      └──────────┘
```

| State | `locked_at` | Layout mutable? |
|---|---|---|
| `editable` | `NULL` | Yes |
| `locked` | a timestamp | No |

**Derived, never stored.** `derivePreparationState(lockedAt)` is a null check.
The same rule invitations, contacts and documents follow: two representations of
one fact drift, and the denormalised one is the one that drifts.

## Why `locked` exists with no writer

Nothing in this command sets `locked_at`. That is a deliberate half-measure, and
the alternative was worse.

§23 and §24 require a freeze seam so a future signing request can stop the
layout moving underneath it. The seam could have been:

- **a column added later** — then BACKEND-32 has to retrofit the conditional
  write into every mutation, auditing each one to be sure none was missed;
- **a column now, conditioned on now** — the discipline is built and tested
  from the start, and the transition is a single `UPDATE … SET locked_at`.

The second is what exists. `replaceLayout` already refuses when `locked_at` is
not null, an integration test sets the column directly and asserts the refusal,
and BACKEND-32 adds one statement.

BACKEND-28 taught that a column with no writer is a risk. The difference here is
that this column has a **reader** in every write path, and the reader is tested.

## No signing states

Not `SENT`, `VIEWED`, `SIGNED`, `COMPLETED`, `DECLINED` or `EXPIRED`. Those
belong to a signing request, and a document may back more than one — a single
status on the preparation would be wrong as soon as there are two.

An architecture guard fails on any of those literals appearing in the domain.

## No READY state

§19 and §110 permit one *if the product needs a prepare/finalize distinction*.
It does not. The prepare flow's steps are `upload → participants → routing →
authentication → settings → review → fields` — a **Review** step, which is a
page you look at, not a lock you set. There is no "Ready to send" control that
changes server state.

Inventing one would mean inventing the validation it gates (§111) and the rule
about whether READY can return to EDITABLE (§116) — two product decisions with
no product answer. **OD-125.**

The consequence: preparation stays editable until the real immutability moment,
which is signing-request creation.

## The true immutability moment

**Not here.** It is BACKEND-32's snapshot, and PREPARATION_EDITABILITY.md
explains why a snapshot rather than a lock is the right shape.

A lock alone would mean the signing request reads live preparation and merely
forbids further edits. That is fragile: it makes every future edit path a place
where the lock could be forgotten, and it gives a completed transaction no
record of what it actually asked for. A snapshot makes the question moot.

## The editability rule lives in one place

`isPreparationEditable(lockedAt)` — a single predicate (§21), asked by every
mutation rather than each testing the timestamp itself.

And the check happens **inside the write**:

```sql
update document_preparations
   set revision = :next, updated_at = :now
 where preparation_id = :id
   and revision = :expected
   and locked_at is null      -- ← here, not in a prior SELECT
```

A freeze committing between a separate check and the write is exactly the race
§158 and §159 describe. In one statement it cannot happen.
