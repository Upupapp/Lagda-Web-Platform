# Signing ceremony architecture

## The chain

```
recipient session cookie  (lagda_signing_session)
      -> RecipientSigningContext          BACKEND-34, six fields
      -> runForRecipientSession(digest)   sets lagda.recipient_session_digest
      -> enterWorkspace(ws, request, recipient)   SAME transaction
      -> the immutable request snapshot
         + this recipient's row
         + this recipient's fields
         + the exact source artifact
      -> a recipient-scoped ceremony projection
```

Every step narrows. Nothing widens.

## Where identity comes from

The session, and only the session. There is no `:requestId` path parameter to
compare against and no recipient id in any body — §6 offers the option of
accepting one and validating it, and the stronger form is not to have one at
all. A parameter that cannot be expressed cannot be tampered with.

## The five checks

`assessCeremonyAccess` in `core/src/signing/ceremony.ts`, pure and total:

| Check | Source | On failure |
|---|---|---|
| Request state is signable | `signing_requests.state` | `request-not-signable` |
| Routing has reached this recipient | activation row | `routing-waiting` |
| Recipient type | snapshot row | shapes what they may do |
| Consent, if required | `signing_recipient_consents` | gates document + fields |
| Session valid | BACKEND-34 | `RecipientSessionInvalidError` |

**Signable states are a closed set of one: `sent`.** `partially-completed` is
the obvious next member and is deliberately absent — nothing can produce it
until BACKEND-36 accepts a submission and BACKEND-37 writes the transition, and
a permission granted before the thing it permits is a permission nobody
reviewed. The four terminal states are excluded *by the set being closed*
rather than by an exclusion list, which is the difference between forgetting a
future state and being unable to.

**Every request revalidates.** A session says who is asking. It never says the
request is still signable, and a test asserts a session resolves normally after
its request moves back to `draft` — making that stop is BACKEND-36's and
BACKEND-37's job, not a defect here.

## Errors are NOT collapsed, unlike BACKEND-34

BACKEND-34 returns one indistinguishable error for six causes because a
bootstrap caller holds a credential that may have been stolen.

A ceremony caller has already authenticated as this specific recipient of this
specific request. Telling them "the sender cancelled this" or "you are waiting
for an earlier signer" discloses nothing they are not entitled to, and
withholding it produces a product where a legitimate signer stares at a blank
refusal. The vocabulary is bounded at three values so the reason can never
widen into free text.

## The two writes

| Fact | Where | Privilege |
|---|---|---|
| Entered the ceremony | `signing_recipient_progress.first_entered_at` | SELECT, INSERT |
| Accepted a disclosure version | `signing_recipient_consents` | SELECT, INSERT |

No UPDATE and no DELETE on either. The runtime role cannot rewrite a first-entry
time or amend an acceptance because it has no statement that could — a
privilege-level guarantee rather than a convention.

## What the ceremony never touches

Contacts, preparations, preparation fields, the document's current artifact,
workspace membership, capabilities, other recipients, other requests, the PDF
bytes' content, the sealer.

Most of these are impossible rather than forbidden: the ceremony repository has
no method for them, and the recipient unit of work exposes one repository.

## The BACKEND-36 boundary

BACKEND-35 stops at *presenting*. It says what each field expects, who owns its
future value, and whether the recipient may proceed. It persists no value of any
kind. `SIGNING_FIELD_INPUT_POLICY.md` is the handoff.
