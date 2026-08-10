# Send architecture

**Send is a durable workflow-state transition, not an email call.**

```
immutable SigningRequest (draft)
     │
     ├─ authorize            signing-request.send, read INSIDE the transaction
     ├─ eligibility          from the SNAPSHOT, never from preparation
     ├─ activation plan      the earliest routing cohort
     ├─ per active recipient
     │     ├─ bootstrap credential   opaque, 256 bits
     │     ├─ grant                  the DIGEST only
     │     └─ delivery intent        the SEALED raw credential + a snapshot
     └─ markSentIfDraft      conditional, LAST
commit
```

No provider is contacted inside that transaction, and none is contacted anywhere
in this command.

## What SENT means

The sender committed the request, and every piece of durable work required for
initial recipient access was written.

It does **not** mean an email was delivered, opened, viewed, authenticated
against or signed. There is no column for any of those, and the event is named
`signing_request.sent` rather than `delivered` for that reason.

Provider delivery state — `QUEUED`, `PROVIDER_ACCEPTED`, `DELIVERED`, `BOUNCED`
— belongs to BACKEND-45's notification subsystem and never redefines
`SigningRequest.state`.

## The snapshot is the only source

Send reads `signing_requests`, `signing_request_recipients` and
`signing_request_fields`. It reads `contacts`, `preparation_recipients` and
`preparation_fields` **never**.

A contact renamed, a preparation recipient edited, a field moved or deleted, the
document retitled — none of it changes what is delivered. Tests prove it and an
architecture guard enforces it by **module path**:

> The first version of that guard forbade the substring `RecipientRecord` and
> failed immediately, on `SigningRequestRecipientRecord` — which is the
> request's own snapshot type and exactly what send is supposed to use. A
> detector that cannot tell the two apart teaches someone to rename the right
> thing. Import paths are unambiguous.

The source artifact comes from `request.sourceArtifactId`. Its existence is
verified; **no bytes are read and no PDF is parsed**.

## Authorization

`signing-request.send`, held by the same four roles as create today and declared
separately regardless — create-without-send is the first differentiation a real
deployment is likely to want (OD-134).

The actor's membership is read **inside the transaction**. A sender demoted a
moment before the commit does not send.

## Rate limiting

`signing-request.send.user` (20/hour) and `signing-request.send.workspace`
(50/hour), both **fail-closed** like every other outbound policy, and both
checked **before any credential is generated**.

Send is amplified in a way an invitation is not: one call can produce up to 50
invitations. The per-workspace budget counts SENDS; BACKEND-31's recipient
ceiling bounds the messages each one produces.

Not a plan quota. Entitlements are BACKEND-50, and a security limit that doubles
as a pricing tier is neither.

## The bootstrap credential

Opaque, 256 bits, base64url, with its own SHA-256 digest domain
(`lagda.signing-access-bootstrap`) — the ninth entry in the createHash
allowlist, so an invitation token can never open a signing link.

Not a JWT. What this credential needs is revocation, a narrow lookup, an
explicit lifecycle and server authority over all three, and every one of those
is a database row.

See [SIGNING_ACCESS_PROVISIONING.md](../signing-access/SIGNING_ACCESS_PROVISIONING.md).

## The delivery intent

The durable "send this" record, carrying:

- the **sealed** raw credential (AES-256-GCM, `SecretBox`, its own key);
- a delivery snapshot — recipient email and name, document title, sender and
  workspace display names — so a retry hours later renders the same email.

The **token** is sealed, not the URL. The renderer rebuilds the URL from
configured base, so a stored row can never carry a host somebody injected.

## Failure windows

| Failure | Result |
|---|---|
| No signing-delivery key configured | Send **fails before the transition**. Never a plaintext fallback |
| Recipient N's persistence fails | The whole transaction rolls back. No partial activation |
| The source artifact is missing | Integrity error, request stays `draft` |
| Another send commits first | The conditional UPDATE matches zero rows; this one rolls back |
| A provider is down, later | Irrelevant. The request is SENT and the intent is retryable |
| The dispatcher never runs | The request is still correctly SENT; the intent is still pending |

## What Send does not do

No signing page, no ceremony, no OTP, no identity verification, no recipient
session, no signature or field submission, no viewed/signed state, no decline,
no completion, no PDF merge, no certificate, no `DocumentSealer`, no public
verification, no resend, no cancel, no void.

## Handoffs

- **BACKEND-34** turns the bootstrap credential into a recipient context.
- **BACKEND-37** advances the next routing cohort, through the same
  `provisionSigningRecipientAccess` this command already calls.
- **BACKEND-45** renders and transmits the delivery intents.
- **BACKEND-46** coordinates expiry and reminders with grants and activation.
