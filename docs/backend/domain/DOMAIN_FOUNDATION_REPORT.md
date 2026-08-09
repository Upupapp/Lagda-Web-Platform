# Domain Foundation Report — BACKEND-04

The important artifact here is §2: the business rules that look correct in the
UI today and would be **bypassable the moment a real API exists**.

---

## 1. The headline finding — `TransactionStatus` conflates state with events

The canonical union has 14 values:

```
draft · ready-to-send · sent · delivered · viewed ·
authentication-completed · awaiting-signature · awaiting-approval ·
partially-completed · completed · declined · cancelled · expired ·
failed-delivery
```

Six of those are not lifecycle states.

`delivered`, `viewed` and `authentication-completed` are **facts that
occurred**. A request whose recipient has viewed it is *still awaiting
signature* — the two are not mutually exclusive, so they cannot both be values
of a single status field without losing information. Storing `viewed`
overwrites the knowledge that the request is still waiting. `awaiting-signature`
and `awaiting-approval` are **derived** from which participants remain
outstanding. `failed-delivery` is a delivery-channel outcome belonging to
notification infrastructure.

The domain therefore models **8 lifecycle states** drawn from the same union and
records the rest as events. The contract union was **not redefined** — parallel
status ownership would be worse than the conflation. Recorded as **OD-013**.

This matters beyond tidiness: a status field with one slot cannot hold a
history, so any persistence design that treats `TransactionStatus` as the whole
truth will lose evidence.

---

## 2. Frontend rules promoted to backend domain

These are enforced today **only in client code**. Each would be bypassable by
any caller that does not go through the UI.

| Rule | Frontend location | Now in core | Frontend keeps it? |
|---|---|---|---|
| View and receive-copy never hold up a request | `models/signing-workflow.ts` `BLOCKING_ACTIONS` | `signing/participants.ts` `isBlockingAction` | Yes — UX |
| Sign always requires the participant's own signature field | `models/signing-workflow.ts` `actionAlwaysRequiresSignature` | `signing/participants.ts` | Yes |
| Approve / review / acknowledge may *optionally* require a signature | same | `actionMayRequireSignature`, `requiresSignatureField` | Yes |
| A viewer cannot be given a signature requirement | implicit | `requiresSignatureField` throws | No — impossible state |
| Cannot send without a blocking participant | `signing-workflow.validation.ts` | `evaluateSendReadiness` | Yes |
| Cannot send with an unassigned required signature field | same | `evaluateSendReadiness` | Yes |
| Signing order must be 1-based and contiguous | same | `evaluateSendReadiness` | Yes |
| A participant may act only after earlier positions finish | `signing-workflow.resolver.ts` | `evaluateRecipientEligibility` | Yes |
| Same-position participants act in parallel | same | same | Yes |
| Cannot complete while a blocking participant is outstanding | same | `evaluateCompletionEligibility` | Yes |
| Completed / cancelled / expired / declined are terminal | `CONFIGURATION_LOCKED_STATUSES` | `signing/lifecycle.ts` `isTerminal` | Yes |
| A workspace has exactly one owner | UI affordances only | `workspaces/assertExactlyOneOwner` | Partially |

**Nothing was deleted from the frontend.** Backend authority and client feedback
are different concerns, and removing the UI checks would be a UX regression with
no security benefit (§179).

## 3. Frontend rules deliberately NOT promoted

Wizard step progression, button disabled states, tab and filter state, board
drag-and-drop, `action-required` badges (a derived display condition, not a
persisted state), table sort direction, modal behaviour, and the
`*-demo` / `demonstrationOnly` fixture markers — all presentation.

---

## 4. What was built

```
packages/core/src/
  common/index.ts          PolicyResult, DomainError, Instant, assertNever
  signing/participants.ts  action semantics — the promoted C37 rules
  signing/lifecycle.ts     8 states, transition table, terminal protection, expiry
  signing/policies.ts      send readiness, recipient eligibility, completion, progress
  workspaces/index.ts      exactly-one-owner invariant
```

**No entities or value-object classes were created.** Plain immutable read
models plus pure functions cover every rule needed today, and §13 explicitly
permits this. Entities become justified when something owns mutable state across
a lifecycle — that arrives with persistence in BACKEND-06/07.

**Zero new dependencies.**

## 5. Error strategy

Two mechanisms, chosen by whether the caller can act on the failure:

- **`PolicyResult`** — a question with a possibly-negative answer, returning
  *all* reasons. Send readiness reports four problems at once, because reporting
  one at a time turns a single fix into four round trips. Never throws.
- **`DomainError`** — an operation against an impossible state. Completing a
  cancelled request is a caller bug, not a form problem. Thrown.

Domain codes are internal and carry no HTTP status, no log level, no severity.
Mapping them to API error codes is BACKEND-05's, and keeping the vocabularies
separate means an internal code can change without breaking a client.

## 6. Rule ownership matrix

| Rule | Owner | Implemented | Command |
|---|---|---|---|
| Blocking vs non-blocking actions | Domain | **Yes** | BACKEND-04 |
| Signature field requirements | Domain | **Yes** | BACKEND-04 |
| Signing order / parallel positions | Domain | **Yes** | BACKEND-04 |
| Terminal state protection | Domain | **Yes** | BACKEND-04 |
| Completion eligibility | Domain | **Yes** | BACKEND-04 |
| Exactly one workspace owner | Domain | **Yes** | BACKEND-04 |
| Document artifact exists in storage | Application | No | BACKEND-05/18 |
| Recipient email uniqueness within a request | **Unresolved** | No | OD-016 |
| Workspace quota / plan entitlement | Application | No | BACKEND-50 |
| Who may cancel or send | Authorization | No | BACKEND-27 |
| Unique membership, tenant-scoped keys | Database | No | BACKEND-06/07 |
| Idempotent signature submission | Application | No | BACKEND-14 |
| AV scan before acceptance | Application | No | BACKEND-18 |
| Session, CSRF, rate limits, signing tokens | Security infra | No | BACKEND-11/15/19 |

## 7. Handoff to BACKEND-05

Rules deliberately left out of core because they need I/O:

- repository lookups (does this document exist, is this member real);
- transaction boundaries around multi-record changes;
- a `Clock` to supply `now` — core takes it as a parameter and never reads it;
- ID generation — core generates nothing;
- notification dispatch from domain facts;
- `DocumentSealer` invocation, strictly **after** completion eligibility passes.

The sequence is fixed: domain eligibility → application orchestration → sealer →
evidence. Core never calls the sealer.

## 8. Handoff to BACKEND-06/07/08

Pure checks do not replace database constraints. Persistence must independently
enforce: one owner per workspace, unique membership per (workspace, user),
tenant-scoped unique keys, foreign-key integrity, and non-negative signing
order.

## 9. Open decisions raised

**OD-013** state/event conflation in `TransactionStatus` ·
**OD-014** whether expiry is derived or requires an explicit transition ·
**OD-015** which roles may receive ownership ·
**OD-016** whether duplicate recipient emails are permitted ·
**OD-017** what one participant's decline does to the whole request.

On OD-017 the domain currently treats any decline as blocking completion, which
is the conservative reading — it never completes a transaction a participant
refused. Whether the *request* should also transition to `declined`
automatically is a product decision, and §54 forbids inventing it.

## 10. Assumptions made, and flagged

Two, both minimal and reversible:

1. **Signing order is 1-based and contiguous.** The frontend uses 1-based
   ordering; contiguity is my addition, because a gap is genuinely ambiguous —
   `[1, 3]` could be two sequential steps or a deleted middle step. Rejecting it
   is the safe reading, and relaxing it later breaks nothing.
2. **Direct `sent → completed` is allowed.** A single-participant request
   finishes in one action without ever being partially complete.
