# BACKEND-33 report — signing request send

**Backend:** `ac043d2` · **Migration:** 020 · **Date:** 2026-08-10

## What was built

A durable send: eligibility from the snapshot, routing activation, one opaque
bootstrap credential per eligible active recipient, a durable delivery intent
carrying the sealed credential, and a conditional transition to SENT.

Three tables, one route, one capability, two rate-limit policies, 80 assertions.

## The decisive finding

**No durable delivery-secret store existed.** Invitations, email verification
and password reset each generate a raw token, persist its digest, and drop the
raw value — the `scheduleDelivery` hook is optional and wired nowhere outside
tests. OD-098 records it as "invitation delivery is BLOCKED".

§62 says: report `SIGNING DELIVERY: BLOCKED` rather than persist a raw link
insecurely.

**It did not have to be blocked, and nothing was invented.** OD-098 itself names
the resolution: *encrypt it the way BACKEND-23 encrypts TOTP secrets*.
`secret-box.ts` — AES-256-GCM, key from configuration, `null` key means
unavailable rather than degraded — has existed since BACKEND-23. BACKEND-33
reuses it under its own key and its own purpose.

So: `SIGNING DELIVERY: DURABLE INTENT ONLY`, not blocked. The secret survives,
encrypted, recoverable by the renderer BACKEND-45 will write. If the key is
absent, Send fails before the state transition — never a plaintext fallback.

That resolves OD-098 **for signing**. Invitations, verification and password
reset still drop their secrets; they are now the odd ones out, and the mechanism
that would fix them is proven.

## Product findings

- **No send UI exists**, still. The routes are correct and uncalled.
- **No subject or message at send.** They are preparation settings the backend
  never persisted, so there is nothing to snapshot. NOT_IN_PRODUCT here,
  BACKEND-46's if they are ever persisted.
- **Routing needs no mode flag.** One integer per recipient expresses parallel,
  sequential and mixed.

## Two defects found by assertions

**A test double whose digest embedded its plaintext.** The "never persists the
raw credential" assertion failed against `d${raw}`. The assertion was right: a
digest that contains its input would let that test pass for the wrong reason
forever. Fixed the double to produce a real digest shape.

**A reissue fixture that reused a digest.** Failed on the global unique. Also
correct: two grants sharing a digest would make BACKEND-34's lookup ambiguous.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1674 passed, 56 files** |
| `npm run build` | Pass |
| `npm run test:integration` | **541 passed, 49 skipped** |
| Migration from zero | Verified twice |

## Honest gaps

**No provider.** DURABLE INTENT ONLY. Nothing is transmitted, and no worker
exists to transmit it. The intents are durable and discoverable; BACKEND-45
supplies the renderer, the job and the delivery state.

**No HTTP route test.** Behaviour and schema are covered by the use-case and
architecture suites; a `createApp` test would add anonymous/CSRF/422 assertions
directly. Worth adding.

**No cross-tenant route assertion.** The control is the standard membership
read, proven in the use case; the end-to-end assertion is missing.

**Viewers and carbon-copies receive nothing.** They are activated so a later
command can find them, and they need a document-view credential that does not
exist. OD-135.

**No resend, no cancel, no void.** None is in the product, and each needs
BACKEND-34's credential lifecycle or BACKEND-37's states.

**`senderDisplayName` is the workspace name.** The request's creator is a
`UserId`, and there is no profile read on this path; an email saying "usr_3f2a
invited you" would be worse than one saying the firm did. If a real sender name
is wanted, BACKEND-45 should snapshot it deliberately at send.

## What BACKEND-34 inherits

Everything in
[SIGNING_ACCESS_PROVISIONING.md](../signing-access/SIGNING_ACCESS_PROVISIONING.md),
and in particular:

1. Look up by digest on a **narrow public path** — no workspace repository
   method exists, deliberately.
2. Validate grant state, expiry, recipient binding, request state and **routing
   activation**.
3. Possession is **not identity**. A scanner opening the link must record
   nothing.
4. Decide the authentication policy from the real product.
5. A dedicated recipient session, scoped to one recipient of one request, never
   requiring workspace membership.
6. Define rotation and revocation. The partial index already permits reissue.
7. The `recipient` rate-limit scope exists and is unused — it is for this.
