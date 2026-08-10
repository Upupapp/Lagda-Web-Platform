# Recipient authentication evidence

## What is persisted, and where

The authoritative facts live on the **session row**, not in a separate event
store:

| Fact | Column |
|---|---|
| Which request | `signing_request_id` |
| Which recipient | `request_recipient_id` |
| Which method | `authentication_method` — `link-only` |
| When | `authenticated_at`, backend-authoritative |
| From which credential | `source_grant_id` |

## Why not a separate event table

BACKEND-10 established that signing evidence and operational logs are separate,
and BACKEND-43 owns evidence finalization. §173 asks to choose rather than
duplicate.

The choice is: **persist the authoritative fact now, project it later.** A
`recipient_authentication_events` table today would be a second event store
beside the existing evidence architecture, with no reader, competing with
whatever BACKEND-43 settles on. The session row already carries every field an
event would, is immutable in the fields that matter, and is never deleted — the
runtime role has `INSERT` and `UPDATE` and **no `DELETE`**, deliberately.

## History is preserved

Multiple sessions per recipient are permitted, and each carries its own
`authenticated_at` and method. A recipient who authenticates on a laptop and
then a phone leaves **two rows**, not one row overwritten.

That is what §175 asks for: authentication history is not collapsed into a
single timestamp. A session is revoked rather than erased precisely so the
record survives.

## What may be said, and what may not

**May be said:**

> The recipient presented a valid signing credential bound to this request and
> recipient, at 2026-08-10T14:00:00Z, using method `link-only`.

**May NOT be said, on the strength of this:**

- the recipient's legal identity was verified;
- the recipient controls the email address;
- the recipient consented to anything;
- the recipient viewed the document;
- the recipient signed.

There is no `identity_verified` column, no `verified` boolean, and no field a
projection could round up into one. The method is recorded exactly so a future
certificate can describe **what happened** rather than inferring a stronger
claim from the fact that someone got in.

If the product later needs a stronger assurance level, it comes from a stronger
method — see [RECIPIENT_AUTHENTICATION_POLICY.md](RECIPIENT_AUTHENTICATION_POLICY.md).

## What is deliberately NOT captured

**No IP address, no user agent.** §89 permits capturing them through trusted
request metadata if the evidence architecture requires it. It does not yet —
BACKEND-43 has not defined what a completion certificate contains — and
capturing PII for a consumer that may never want it is collecting first and
justifying later.

The observed-metadata plumbing from BACKEND-11 exists and is trusted, so adding
them is a column and a parameter whenever BACKEND-43 says what it needs. Recorded
as **OD-143**.

**No device fingerprint, no geolocation.** Not implemented, and not to be:
§168 and §169, and neither has a product requirement.

**No recipient name or email on the authentication record.** The recipient id
points at the immutable request snapshot, which already holds both. Duplicating
PII into a second row would widen the surface for no gain.

**No raw credential, no digest, no OTP.** Nothing that could authenticate
anybody appears in any record described here.

## What BACKEND-43 must do

1. Read `recipient_signing_sessions` for authentication facts, and project them
   into whatever evidence shape it defines — one event per session row, not one
   per recipient.
2. Use the exact `authentication_method` value. Do not map `link-only` to a
   stronger word.
3. Decide whether observed IP and user agent belong in the certificate. If yes,
   BACKEND-34's columns are the place, and the values must come from BACKEND-11's
   trusted metadata rather than any request body.
4. Never include a credential, a digest, or a signing URL.
