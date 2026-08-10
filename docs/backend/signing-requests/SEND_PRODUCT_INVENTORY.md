# Send — product inventory

What exists, read from the frontend and from the backend's own state.

## The frontend, again

BACKEND-32 established it and nothing has changed: **there is no send action
anywhere in `src/`.** The prepare wizard's confirmation page navigates and calls
no service. There is no "Review and Send" screen — `ReviewStep.tsx` is step 6 of
preparation and its CTA is "Continue to Place Fields →".

So the contract for Send comes from `docs/backend-integration-handoff.md` §10
and from what BACKEND-31/32 actually persist.

## What the backend can and cannot do today

Four findings from reading the code, each of which decides an item below.

1. **No email provider exists.** No `EmailSender`, no `Mailer`, no SMTP, no
   vendor SDK anywhere in `packages/*/src`. OD-003 records that delivery
   requirements are specified and no vendor is chosen.
2. **No durable delivery-secret store exists.** Invitations, email verification
   and password reset each generate a raw token, persist only its digest, and
   then **drop the raw value** — the `scheduleDelivery` hook is optional and
   wired nowhere outside tests. OD-098 records this as "Invitation delivery is
   BLOCKED", and names the resolution: *"encrypt it the way BACKEND-23 encrypts
   TOTP secrets."*
3. **No outbox table.** Queue consistency is pg-boss `send()` with the caller's
   transaction passed as a `db:` override — proven by an integration test and
   called by **zero** production code. `JobScheduler` is never instantiated in
   the API process.
4. **No delivered-OTP architecture.** MFA is TOTP only.

## Classification

| Concern | Classification | Evidence and consequence |
|---|---|---|
| **SEND** | **IMPLEMENT_NOW** | Handoff §10. The state transition, activation, access provisioning and durable delivery intent are all implementable today |
| **EMAIL SUBJECT** | **NOT_IN_PRODUCT at send** | `settings.invitation.subject` is a **preparation** field, in step 5 of the wizard. There is no send screen to carry it, and BACKEND-30 persists no invitation settings. Adding it here would be inventing a send-time field the product does not have |
| **EMAIL MESSAGE** | **NOT_IN_PRODUCT at send** | Same. `settings.invitation.message`, same step, same absence |
| **CUSTOM MESSAGE** | **NOT_IN_PRODUCT** | No per-recipient message anywhere |
| **PARALLEL DELIVERY** | **IMPLEMENT_NOW** | BACKEND-31 persists `routing_order` per recipient where equal values mean parallel, and the default is 1 for everyone. With the product's default, every eligible recipient activates at send |
| **SEQUENTIAL DELIVERY** | **IMPLEMENT_NOW** | The same integer expresses it. Distinct values are cohorts; only the lowest activates |
| **MIXED ROUTING** | **IMPLEMENT_NOW**, and it is the same code | One integer per recipient expresses parallel, sequential and mixed without a mode flag. `1,1,2` is two people in parallel then one. The frontend's richer `PrepRoutingConfig` (mode, named groups, `requiredCompletionRule`) is persisted by **no backend command**, so there is no mode to read |
| **CC DELIVERY** | **DEFER** | `viewer` and `carbon-copy` exist as recipient types and cannot hold fields. They need a **document-view** credential, not a signing credential (§101), and no such concept exists. They are activated but receive no grant and no delivery intent. Recorded as OD-135 |
| **EXPIRATION** | **DEFER → BACKEND-46** | `settings.expiration` is preparation state, persisted nowhere. **But the bootstrap credential gets its own TTL regardless** — §50 |
| **REMINDERS** | **DEFER → BACKEND-46** | Same |
| **SCHEDULED SEND** | **NOT_IN_PRODUCT** | Nothing in the product schedules a send |
| **RESEND** | **DEFER** | `resend-invitation` exists as a `TransactionActionId` on fixture data, labelled "Resend Invitations (Demo)". Transport retry is not resend; resend rotates or reissues, and that belongs with BACKEND-34's credential lifecycle |
| **VOID / CANCEL** | **DEFER** | `cancelTransaction` is gated on `isActive` and `void` on `isCompleted`, both on fixture data. Neither is a send-time concern |
| **PROVIDER EMAIL DELIVERY** | **DURABLE INTENT ONLY** | No provider exists and none is chosen. Send persists a durable, sealed, recoverable delivery intent; BACKEND-45 renders and transmits it |

## The delivery-secret decision

§62 says: if secure delivery-secret storage is not available, report
`SIGNING DELIVERY: BLOCKED` rather than persisting raw links insecurely.

It is available, and it did not have to be invented. `secret-box.ts` —
AES-256-GCM from `node:crypto`, key from configuration, `null` key means the
feature is unavailable rather than silently degraded — was built for TOTP seeds
in BACKEND-23. OD-098 names it as the acceptable path for exactly this problem.

So BACKEND-33 seals the raw bootstrap credential into the delivery intent with
the same mechanism, under its own key configuration and its own purpose. If the
key is absent, **Send fails before the state transition** — never a plaintext
fallback.

That resolves OD-098 for the signing path. It does not resolve it for
invitations, verification or password reset, which still drop their secrets;
those remain open and are now the odd ones out.

## What Send does NOT do

No signing page, no ceremony, no OTP, no identity verification, no signature or
field submission, no viewed/signed state, no decline, no completion, no PDF
merge, no certificate, no `DocumentSealer`, no public verification. BACKEND-34
onwards.
