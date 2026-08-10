# Signing access provisioning

A **foundation** document. BACKEND-33 mints the credential; BACKEND-34 decides
what possession of it means.

## What a bootstrap credential authorizes

Exactly one thing: **beginning the recipient-access ceremony** for one
`SigningRequestRecipient`.

It is a bearer secret in an email. Possession proves possession of the email —
nothing about who a person is, nothing about consent, nothing about signing
authority. **A valid signing link is not identity verification.**

Email security systems routinely open links. So merely GETting a signing URL
must never record consent, authentication or a signature. BACKEND-34 owns that
landing behaviour; BACKEND-33 only provisions the credential.

## The credential

| Property | Value |
|---|---|
| Source | `randomBytes(32)` — 256 bits |
| Encoding | base64url, 43 characters |
| Digest | SHA-256, hex, 64 characters |
| Domain | `lagda.signing-access-bootstrap` |
| Stored | **the digest only** |
| Lifetime | 14 days, configurable, always set |
| Format | **Not a JWT** |

### Why not a JWT

A signed token verifies without a database row, which sounds like an advantage
and is the opposite of one. What this credential needs is revocation, a narrow
lookup, an explicit lifecycle and server authority — each of which is a row.

### Why its own digest domain

Nine credential types now digest to 64 hex characters. The prefix is the only
thing that stops one resolving as another: without it, a workspace invitation
token submitted to the signing endpoint would resolve, and a workspace invitee
could act as a counterparty.

One adapter file per purpose, following the pattern every other credential uses.

### Why an explicit expiry

A bearer credential that never expires is a permanent key to a legal document
sitting in an inbox. Request expiration is BACKEND-46's separate question, and
its absence is not a reason to leave one lying around.

14 days: long enough that a counterparty who reads email weekly is not locked
out, short enough that a forwarded or archived link is not live for a year.

## The grant

`signing_access_grants`:

| Column | Notes |
|---|---|
| `grant_id` | Opaque, server-generated |
| `workspace_id`, `signing_request_id`, `request_recipient_id` | Tenancy and binding |
| `credential_digest` | 64 hex, CHECK-constrained, **globally unique** |
| `created_at`, `expires_at` | `expires_at > created_at`, enforced |
| `revoked_at` | NULL today. BACKEND-34's lifecycle |

**Three-column foreign key** to the recipient. A grant cannot reference a
recipient of a different request, even in the same workspace.

**One active grant per recipient**, as a partial unique index on
`revoked_at is null`. Not merely intended: a duplicate send, an idempotency edge
or a future resend bug would otherwise leave two live bearer credentials for one
person with no way to tell which was meant.

Partial rather than absolute, because a revoked grant may coexist with the live
one — which is what makes BACKEND-34's reissue possible without a migration. An
integration test revokes and reissues to prove it.

**The digest unique is global**, deliberately: two grants sharing a digest would
make "which recipient is this" ambiguous at exactly the wrong moment. A test
that reused a digest for a reissue failed on it, correctly.

## The sealed secret

This is the one place a raw LAGDA credential survives its transaction, and it
survives encrypted.

Every other credential is a one-way digest because the server only ever
COMPARES. A signing link is different: the email carrying it is rendered later,
by a process that was not there when it was made.

OD-098 recorded exactly this as the blocker on invitation delivery and named the
resolution — *encrypt it the way BACKEND-23 encrypts TOTP secrets*. So
`signing_delivery_intents.sealed_credential` holds the raw token under
AES-256-GCM through the existing `SecretBox`, with:

- **its own key** (`SIGNING_DELIVERY_KEY`), separate from the MFA key. They
  protect different things with different blast radii; sharing one would mean
  rotating both to respond to either.
- **the key version stored beside it**, so rotation needs no migration.
- **no key means Send fails**, before the state transition. Never plaintext.

The **token** is sealed, never the URL.

## The link

Built from configured canonical base only. The builder function takes no request
and cannot see one — not `Host`, not `X-Forwarded-Host`, not
`request.hostname`. A link built from an inbound header is a link an attacker
chose, sent by LAGDA, over LAGDA's reputation, carrying a real credential.

A path segment rather than a query parameter: a query string is likelier to
survive into a referrer, an access log or an analytics payload.

Never persisted, never logged, never returned to the sender.

## What BACKEND-34 must do

1. **Look up by digest**, on a narrow public path. A workspace repository that
   could resolve a credential could impersonate a recipient, so no such method
   exists here.
2. **Validate everything**: grant not revoked, not expired, recipient binding,
   request state, and routing activation — a waiting recipient's credential
   should not exist, but the check belongs there too.
3. **Decide the authentication policy** from the real product: link-only, email
   OTP, an access code, or something else. If additional authentication is
   required, possession begins a *pending* ceremony rather than an authenticated
   session.
4. **Reuse BACKEND-23's OTP architecture** if OTP is chosen — attempt limits,
   expiry, resend limits, zero logging.
5. **Create a dedicated recipient session**, separate from a LAGDA user session,
   scoped to one recipient of one request.
6. **Never require workspace membership**, and never treat a matching email as
   authentication.
7. **Be scanner-safe**: a GET must record nothing.
8. **Define rotation and revocation**, including what a resend does.
9. **Strip the credential from the URL** as soon as it is exchanged.

The `recipient` rate-limit scope already exists and is unused — reserved for
this.
