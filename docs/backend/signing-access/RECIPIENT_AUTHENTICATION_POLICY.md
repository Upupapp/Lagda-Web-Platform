# Recipient authentication policy

> **`LINK_ONLY`**

Possession of the emailed bootstrap credential is the whole ceremony. There is
no second factor.

## What this establishes

**The caller holds a 256-bit credential that LAGDA emailed to a specific
address**, and that credential is bound to one recipient of one request, has not
expired, has not been revoked, belongs to a request that has been sent, and
belongs to a recipient whose routing turn has come.

That is a real, checkable property. It is the same class of assurance a password
reset link or a workspace invitation carries, and it is what the product's own
default offers.

## What this does NOT establish

Stated plainly, because the temptation to round it up is the whole risk:

- **NOT control of the mailbox.** A link can be forwarded, an inbox can be
  shared, a device can be borrowed, a mail archive can be searched.
- **NOT that the holder is the named person.** Nothing has been checked against
  any identity document, any account, or any second channel.
- **NOT legal identity verification.** No LAGDA document, column, log line or
  API field says `identity_verified`, and none may be added on the strength of
  this method.
- **NOT consent.** Authenticating is not agreeing to anything. Consent is an
  explicit act BACKEND-35 must present and record.
- **NOT viewing.** A session exists; nobody has necessarily looked at anything.

The session records `authentication_method = 'link-only'` — the exact method,
so a future evidence projection can describe what actually happened rather than
inferring a stronger claim from the fact that someone got in.

## Why not email OTP

`email-otp` is `availability: "active"` in the product's method list, so it is
clearly intended. Three things block it, each independently sufficient:

1. **The per-request policy is persisted nowhere.** `PrepAuthConfig` lives in
   the frontend's in-memory draft. BACKEND-30 stores no invitation settings,
   BACKEND-31 no auth config, and BACKEND-32's create route explicitly rejects
   `authMethod`. A global "always OTP" would override every sender who took the
   default.

2. **There is no delivered-OTP architecture to reuse.** BACKEND-23 is TOTP-only
   and records why a challenge table for a delivered code would have no writer
   and no reader. `MFA_OTP_PRODUCT_INVENTORY.md` already classifies it
   NOT_IN_PRODUCT while naming signing OTP as a separate unbuilt thing.

3. **Nothing could deliver it.** BACKEND-33 is DURABLE INTENT ONLY: no provider,
   no renderer, no worker.

**An OTP that cannot reach the recipient is not a stronger lock — it is a lock
with no key.** Shipping one would make signing impossible while appearing more
secure, which is the worst of both.

## The seam that is built

`RECIPIENT_AUTHENTICATION_METHODS = ["link-only", "email-otp"]`, and the
session's `authentication_method` column admits both. A row written today says
`link-only` truthfully, and a row written after OTP arrives will say `email-otp`
truthfully — without a migration over rows already written.

Declaring the value does not make it work. The use case writes a literal, and an
architecture guard asserts `email-otp` appears nowhere in it.

## What must happen before OTP can be implemented

In order:

1. **Persist the policy.** BACKEND-30 or BACKEND-31 stores `PrepAuthConfig`;
   BACKEND-32 snapshots it onto the request. Without that there is nothing to
   read, and the method must be per-request because the product makes it
   per-participant.
2. **Build the challenge model.** `email_verification_challenges` is a good
   template — digest-only, expiry, single-use, supersession, a one-active
   partial index — and needs one addition: a per-challenge attempt counter, in
   the shape `pending_authentications.failed_attempts/max_attempts` already
   uses. A six-digit code is not safe on entropy alone.
3. **Have a provider.** BACKEND-45.
4. **Bind the challenge** to the request, the recipient and a pending
   authentication transaction, under its own purpose constant.
5. **Make bootstrap return `authenticationRequired`** instead of a session, and
   add a verify endpoint that revalidates the grant and the request state
   *inside* the final transaction — the TOCTOU §112 names.

Recorded as **OD-140**.
