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
