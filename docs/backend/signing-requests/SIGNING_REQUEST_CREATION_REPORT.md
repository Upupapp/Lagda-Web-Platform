# BACKEND-32 report — signing request creation

**Backend:** `0045697` · **Migration:** 019 · **Date:** 2026-08-10

## What was built

The authoring/workflow boundary. Three tables, two routes, one use case, and the
rule that a signing request is an immutable snapshot of one coherent preparation
revision.

- `signing_requests`, `signing_request_recipients`, `signing_request_fields` —
  all RLS + FORCE, and the two snapshot tables with **no `UPDATE` grant**.
- Request-scoped `SigningRequestId`, `SigningRequestRecipientId`,
  `SigningRequestFieldId`.
- A three-column assignment key.
- Required idempotency, fingerprinted on the document alone.
- Two capabilities: `signing-request.create`, `signing-request.view`.
- 114 new assertions.

## The product finding that shaped everything

**The frontend has no send action.** No button, route, service method or type
named `send`, `sendForSignature` or `createSigningRequest` exists in `src/`. The
prepare wizard's seven steps end at a confirmation page whose primary button is:

```tsx
onClick={() => {
  // No signing request is created. This marks the end of the demonstration.
  navigate("/app/documents");
}}
```

So the contract could not come from the send UI. It came from
`docs/backend-integration-handoff.md` §10 (the endpoint, the idempotency
requirement, three validation rules) and from `RecipientRequest`
(`src/app/models/recipient.ts:196-211`), which is the closest thing the product
has to a signing-request type and tells us what a request must be able to
display — including `transactionTitle`, which is why the document title is
snapshotted.

Several sub-features are therefore **NOT_IN_PRODUCT** rather than deferred: a
separate request title, edit-after-create, delete-before-send, a request list.

**A documentation correction:** `docs/frontend-known-limitations.md:37` states
that "the Send action in the Prepare workflow simulates request creation". There
is no Send action to simulate. Worth fixing in that file.

## Two consolidations, not new declarations

**`SIGNING_REQUEST_STATES`** was declared in `core/src/signing/lifecycle.ts` by
an earlier command, derived from the product's `TransactionStatus`. BACKEND-32
persists and returns it, so it moved to `@lagda/contracts` and `lifecycle.ts`
re-exports. One declaration — the same trap BACKEND-31 fixed for `RecipientId`,
caught before it shipped this time.

**The readiness rules** joined `core/src/signing/` as `snapshot.ts` rather than
opening a second `core/src/signing-requests/` directory for the same aggregate.

## Decisions and where they are recorded

| Decision | Document |
|---|---|
| Snapshot, not reference | ADR-025, SNAPSHOT_MODEL |
| Request-scoped recipient ids | RECIPIENT_MODEL |
| Request-scoped field ids, three-column key | FIELD_MODEL |
| ORIGINAL artifact, not PREPARED | SNAPSHOT_MODEL |
| Initial state `draft` alone | STATE_MACHINE |
| Multiple requests per document permitted | PRODUCT_INVENTORY, ADR-025 |
| Preparation is NOT frozen | IMMUTABILITY |
| Fingerprint is the document alone | CREATION_CONSISTENCY |
| Two new capabilities | ADR-025, WORKSPACE_CAPABILITY_MATRIX |

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass — build graph and the tools project |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1608 passed, 54 files** |
| `npm run build` | Pass |
| `npm run test:integration` | **520 passed, 49 skipped** (storage/upload need object storage) |
| Migration from zero | Verified twice — `lagda_zero3_test` and `lagda_test`, both rebuilt from 001 |
| Migration `down` | Written; drops all three tables and their policies |

One integration run reported two pre-existing idempotency failures while
`npm run build` shared the shell invocation; three subsequent runs were clean and
it was not reproduced. Recorded in the test matrix rather than dismissed.

## Honest gaps

**Nothing can call this yet.** There is no frontend send flow, so the routes are
correct and unexercised by a real client. Whoever builds the UI must not send
hidden recipient or field arrays — the schema rejects them with 422, which is
the intended way to find that out.

**No archived-document check.** BACKEND-29 has no archive: `documents` has no
`archived_at` and no archive operation. The command asked for the rejection; the
state does not exist to reject.

**Readiness is coarse.** "At least one signing field per signer" is enforced.
Whether an *approver* needs a field, whether routing must be contiguous, and
what a `carbon-copy` recipient with no field means are all product questions
BACKEND-37 will have to answer with the ceremony's semantics.

**No snapshot digest.** Deferred deliberately — there is no consumer, and a hash
with no validator is decoration.

**No rate limiting.** A normal authenticated write with no external work.

**A rotated source blocks creation.** OD-124's refusal propagates: a document
with rotated pages cannot be prepared and therefore cannot become a request.

## What BACKEND-33 inherits

1. **Act on the snapshot alone.** Never re-read `preparation_recipients`,
   `preparation_fields` or `contacts` to decide who to send to, what to ask for,
   or which bytes to attach. An architecture guard already forbids those imports
   in the request module; extend it to the send module.
2. **Widen the `state` CHECK** to admit `sent`, and add `sent_at` with the send
   that writes it.
3. **Transition conditionally, in one statement.** The pattern is BACKEND-30's
   `replaceLayout`: check the current state and claim the new one in a single
   `UPDATE`, so a concurrent send matches zero rows rather than sending twice.
4. **Its own capability**, `signing-request.send`. Create does not imply send.
5. **Its own idempotency operation.** `signingRequest.send` is already in the
   catalog from the handoff; a retry of a CREATE must never replay as a SEND.
6. **No provider call inside the transaction.** Commit the durable intent, then
   deliver — and never claim exactly-once delivery from a provider that does not
   offer it.
7. **Decide where access credentials come from.** Either Send issues them
   through BACKEND-34's architecture, or Send persists a durable
   access-provisioning intent and BACKEND-34 fulfils it. Both are defensible;
   the decision must be explicit and must bind to
   `SigningRequestRecipientId`.
8. **Never log a raw credential.**
9. **Routing decides who is activated.** Equal `routing_order` means parallel;
   the lowest step activates first. The plan is stored — executing it is
   BACKEND-33's and BACKEND-37's.
