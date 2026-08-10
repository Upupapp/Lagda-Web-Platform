# Idempotent Operation Catalog — BACKEND-14

The five operations handoff §28 requires. **None is implemented** — this command
built the framework, and each operation belongs to its own command.

| Operation | Command | Scope | Key | Fingerprint inputs | Logical completion | Replayable | Retention | Status |
|---|---|---|---|---|---|---|---|---|
| `signingRequest.send` | BACKEND-33 | workspace | required | signingRequestId, recipient set, message, expiry | Request marked sent **and** notification job enqueued — not provider delivery | 202/200 + request state | 24h | FRAMEWORK_READY |
| `workspace.invitation.create` | BACKEND-26 | workspace | required | invitee identity, role, team | Invitation row **and** email job committed | 201 + invitation | 24h | FRAMEWORK_READY |
| `billing.plan.change` | BACKEND-50 | workspace | required | target plan, billing period, seats | **Provider-dependent** — see below | provider-dependent | 24h | PLANNED |
| `signature.submit` | BACKEND-36 | recipient | required | signingRequestId, recipientId, field values, consent version | Submission + evidence persisted, completion scheduled | 200 + submission state | 24h | FRAMEWORK_READY |
| `otp.deliver` | BACKEND-23 | user or recipient | required | challenge/account reference, purpose | Delivery **intent** accepted — not provider delivery | 202 | 24h | PLANNED |

## Scope, per operation

Deliberately not one rule for all of them (§223).

**`signingRequest.send` — workspace, not workspace+actor.** Two authorized
senders retrying the same send should converge on one logical send, not two.
BACKEND-33 confirms; if product semantics turn out to require per-actor
identity, the actor joins the scope rather than the fingerprint.

**`signature.submit` — recipient.** Two different recipients on the same signing
request must never collide, which is why the scope key carries both the signing
request and the recipient.

**`otp.deliver` — challenge or account reference, never an email address.** A
stable identifier, so no plaintext address is stored as a scope key (§124).

**`billing.plan.change` — workspace billing scope.** If the provider supports its
own idempotency keys, BACKEND-50 must **derive** one from LAGDA's operation
identity rather than forwarding the client's key.

## Why two are PLANNED rather than FRAMEWORK_READY

`billing.plan.change` and `otp.deliver` call an **external provider**. The
in-transaction claim cannot span that call — holding a PostgreSQL transaction
open across a network request to a billing API is not acceptable.

Those operations need staged durable state: commit the intent, then let a worker
perform the external call with its own retry semantics. The framework supports
that shape; the operations need designing, and marking them ready would overstate
what exists.

## What "logical completion" means

Repeatedly: **completion is the point at which LAGDA's own state is durable**,
not the point at which a third party confirms.

A send is complete when the request is marked sent and the notification job is
committed. Whether the email provider later delivers is a separate concern with
separate retries — and the framework does not claim exactly-once delivery to any
provider.

## Adding an operation

1. Add the name to `IDEMPOTENT_OPERATIONS` — a closed union, so a typo cannot
   create a second namespace.
2. Choose the scope from the typed variants. Do not add a variant unless a
   genuinely new caller category exists.
3. Decide what belongs in the fingerprint: everything that changes what the
   operation *means*, including path identifiers, and nothing from transport.
4. Confirm the mutation fits one transaction. If not, stage it.
5. Add a row here.


## Workspace invitations (BACKEND-26) — IMPLEMENTED

| Operation | Scope | Fingerprint | Status |
|---|---|---|---|
| `workspace.invitation.create` | `workspace` | normalized invitee email + requested role | **IMPLEMENTED** — required at the route |
| `workspace.invitation.resend` | `workspace` | invitation id | **IMPLEMENTED** — required at the route |

**Workspace-scoped, not user-scoped.** Two managers of one workspace inviting the
same person are the same logical operation, and the handoff already named
`workspace.invitation.create` a workspace concern.

The fingerprint uses the **normalized** address, so two retries differing only in
casing replay rather than conflicting. A different address or a different role is
a different request and produces a 409.

**Why resend needs its own operation.** A network retry of one resend must not
rotate the credential twice — the first rotation already invalidated the link in
the recipient's mailbox — while a later deliberate resend must rotate. The
client's key is what draws that distinction, and two operations keep the two
namespaces apart.

**Completion point:** the invitation state and the durable delivery intent have
committed. It does not wait for an email provider to confirm anything — and
today there is no provider to wait for (OD-098).

**Acceptance takes no key.** It is single-use by construction, and the membership
unique constraint makes a retry converge to `joined: false` rather than
duplicating anything.

## `signingRequest.create` (BACKEND-32)

| Property | Value |
|---|---|
| Operation | `signingRequest.create` |
| Scope | `workspace` |
| Key | **Required** at the route. A missing key is 422 |
| Fingerprint | `{ documentId }` - the document alone |
| Success status | 201 |
| Replay | Returns the originally created request |

### Why the key is required

A lost response is indistinguishable from a failure to the browser that sent it,
and the natural reaction - retry - would create a SECOND immutable signing
workflow over the same document. BACKEND-33 could then send both, and one
agreement would reach its counterparties as two sets of invitations with two
sets of signing positions.

The same reasoning that made `workspace.invitation.create` required, one step
more consequential.

### Why the fingerprint excludes the preparation revision

This is the subtle part. "Create a signing request for document D" is ONE
logical request. Including the revision would make this sequence fail:

```
T0  create with key K          preparation at revision 7
T1  it commits                 SR-1 exists
T2  the sender edits           preparation reaches revision 8
T3  the network retry sends K
```

At T3 the fingerprint would differ and the framework would report a CONFLICT -
for a retry of a request that already succeeded, which the caller cannot act on.

With the document alone, T3 replays SR-1 and the caller learns the id of the
workflow that exists. A unit test walks exactly this sequence and asserts the
replayed snapshot still holds the revision-7 values.

The trade is real and worth stating: a caller who deliberately wants a SECOND
request after editing must send a DIFFERENT key. That is the correct division -
a new key is a new intention, and a repeated key is a repeated attempt.

### The sibling operation

`signingRequest.send` was already in the catalog from the handoff, before
anything could be sent. The two are separate operations deliberately: a retry of
a CREATE must never replay as a SEND.

## `signingRequest.send` (BACKEND-33) - now implemented

Pre-listed from the handoff before anything could be sent. Now in use.

| Property | Value |
|---|---|
| Operation | `signingRequest.send` |
| Scope | `workspace` |
| Key | **Required** at the route. Missing is 422 |
| Fingerprint | `{ signingRequestId }` |
| Success status | 200 |
| Replay | The original `sentAt` and id, and **no new credentials** |
| Retention | The framework's standard window |

### Why the key is required

A double click, or a lost response, would otherwise send a second set of
invitations to the same counterparties carrying different credentials. Unlike a
duplicate workspace, that reaches people outside LAGDA.

### Why the fingerprint is only the request id

BACKEND-33 owns no send-level configuration - the product has no send screen, so
there is no subject or message. If BACKEND-46 adds one it belongs here: sending
the same request with a different message is a different logical request.

Note the consequence, which is fine: the request id is also in the URL, so there
is no input that can change while the key stays the same. A same-key
different-input conflict is therefore unreachable, and that is recorded as N/A
rather than untested.

### Different key after SENT

**Not** a replay - a deliberate second attempt. `409
SIGNING_REQUEST_ALREADY_SENT`, and nothing is minted. The conditional transition
is the backstop that makes it race-safe.

### The sibling

`signingRequest.create` (BACKEND-32) and `signingRequest.send` are separate
operations deliberately: a retry of a CREATE must never replay as a SEND.

## `signature.submit` — IMPLEMENTED (BACKEND-36)

| | |
|---|---|
| Scope | `{ type: "recipient", recipientId, signingRequestId }` |
| Required | **Yes.** A submission without a key is refused with `IDEMPOTENCY_KEY_REQUIRED` |
| Retention | 24 hours |
| Stored result | `201` + `{ submissionId, acceptedAt, acceptedFieldCount }` |

Listed from the handoff by BACKEND-14 and implemented here. The `recipient`
scope variant was added at the same time, with the comment *"signature
submission (BACKEND-36) is performed by an external signer with no workspace
session"* — so both halves of what this command needed were provisioned in
advance, and neither had to be invented.

### Fingerprint

`{ v:1, signingRequestId, recipientId, signatureMethod, initialsMethod,
values[] }` where `values` are the submitted field values **sorted by field id**.

**The signature payload is excluded.** A drawn signature is a canvas
rasterisation, and a retry that re-renders the same strokes can differ by a
byte — antialiasing, device pixel ratio, a repaint. Fingerprinting the pixels
would make every drawn-signature retry a 409, which is exactly the failure the
key exists to prevent. The presence and the method are included, because
typed→drawn is a different act.

Excluded per §33: correlation id, session token, CSRF token, IP, user agent, the
generated submission id, and all backend timestamps.

### Behaviours

| | |
|---|---|
| Same key, same payload | Replays the original `submissionId` and `acceptedAt` |
| Same key, different payload | `409 IDEMPOTENCY_CONFLICT` |
| Same key, in progress | `409` in-progress |
| **New key after acceptance** | **`RECIPIENT_ALREADY_SUBMITTED`** — never a silent second act |

The last row is the one that differs from the other operations in this catalog.
A workspace create with a new key legitimately creates a second workspace; a
signature with a new key cannot legitimately create a second signature, because
there is no such thing.

### Ordering

Authentication, CSRF and the key header are checked **before** the claim.
Possession of a key grants nothing.
