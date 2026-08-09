# LAGDA Domain State Machines

Input to BACKEND-37. Implemented in `packages/core/src/signing/lifecycle.ts`.

## Signing request

**Modelled states (8).** All drawn from the canonical `TransactionStatus`; none invented.

| State | Allowed actions | Resulting state | Terminal |
|---|---|---|---|
| `draft` | `markReadyToSend` · `cancel` | `ready-to-send` · `cancelled` | No |
| `ready-to-send` | `returnToDraft` · `send` · `cancel` | `draft` · `sent` · `cancelled` | No |
| `sent` | `recordParticipantCompletion` · `complete` · `decline` · `cancel` · `expire` | `partially-completed` · `completed` · `declined` · `cancelled` · `expired` | No |
| `partially-completed` | same as `sent` | same | No |
| `completed` | — | — | **Yes** |
| `declined` | — | — | **Yes** |
| `cancelled` | — | — | **Yes** |
| `expired` | — | — | **Yes** |

Anything absent from the table is forbidden and throws
`InvalidStateTransitionError`. Terminal states have an explicitly empty action
set rather than being omitted, so a missing state is a compile error.

`sent → completed` directly is intentional: a single-participant request
finishes in one action without passing through `partially-completed`.

## Canonical statuses NOT modelled as states

| Value | Why |
|---|---|
| `delivered` | An event. Delivery does not change what the request waits for. |
| `viewed` | An event. A viewed request is still awaiting its recipients. |
| `authentication-completed` | An event about one recipient, not the request. |
| `awaiting-signature` | Derived from outstanding participants. |
| `awaiting-approval` | Derived, as above. |
| `failed-delivery` | A delivery-channel outcome; notification infrastructure. |

See OD-013. The contract union was not redefined — parallel status ownership
would be worse than the conflation.

## Participant lifecycle — deliberately not a machine

`ParticipantStatus` is `pending · delivered · viewed · completed · declined ·
expired`. Four of those six are events, so modelling them as mutually exclusive
states would lose history the same way.

The domain instead uses two booleans — `completed` and `declined` — because
those are the only facts any rule consults. Delivery and view are evidence
events (BACKEND-10/43). Adding a participant state machine before evidence
exists would encode the same conflation a second time.

## Invariant matrix

| Invariant | Enforced by | Test | Source |
|---|---|---|---|
| Terminal states never reactivate | `TRANSITIONS` table | "never lets a terminal request become active again" — every terminal × every action | §19 |
| Cannot send without a blocking participant | `evaluateSendReadiness` | "cannot send to viewers alone" | C37 validation |
| Sign requires an assigned signature field | `requiresSignatureField` | "cannot send when a signer has no signature field" | C37 `actionAlwaysRequiresSignature` |
| Viewers cannot require a signature | `requiresSignatureField` throws | "refuses to require a signature from a viewer" | C37 |
| Signing order 1-based, contiguous | `evaluateSendReadiness` | order-start and gap tests | Frontend + assumption (report §10) |
| Later participants wait for earlier | `evaluateRecipientEligibility` | "makes a later participant wait" | C37 resolver |
| Same-position participants are parallel | same | "does not make same-position participants wait" | C37 |
| Completion needs all blocking participants | `evaluateCompletionEligibility` | "cannot complete while a required participant is pending" | C37 |
| A decline blocks completion | same | "cannot complete once a participant declined" | Conservative reading — OD-017 |
| Expiry never applies to terminal requests | `isExpired` | "does not expire a request that already finished" | §19 |
| Exactly one workspace owner | `assertExactlyOneOwner` | three ownership tests | Product model |
