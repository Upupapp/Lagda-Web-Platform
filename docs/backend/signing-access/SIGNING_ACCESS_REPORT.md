# BACKEND-34 report — recipient signing access

**Backend:** `d229e15` · **Migration:** 021 · **Date:** 2026-08-10

## What was built

A second authentication realm. Bootstrap exchange, narrow credential-resolved
data access, recipient signing sessions with their own cookies and CSRF, and a
minimal authenticated context.

One table, four RLS policies, two transaction scopes, two routes, one rate-limit
policy, 84 assertions.

## The product decision

**`RECIPIENT AUTHENTICATION POLICY: LINK_ONLY`** — the product's own default
(`DEFAULT_AUTH_CONFIG.defaultMethod = "none"`, "Secure Invitation Link").

Email OTP is selectable in the wizard and blocked three ways: no persisted
per-request policy, no delivered-OTP architecture, no delivery. An OTP that
cannot reach the recipient is a lock with no key. The seam is built — the method
union and the session column admit `email-otp` — and OD-140 lists the five steps
to make it real.

The assurance is stated precisely and not rounded up:
[RECIPIENT_AUTHENTICATION_POLICY.md](RECIPIENT_AUTHENTICATION_POLICY.md).

## The RLS problem, solved by precedent

BACKEND-26 had already answered "public credential lookup without workspace
context" for invitations. Migration 021 follows it exactly and adds three
companion policies.

The integration suite proves the consequence rather than asserting it: inside a
credential transaction, an unfiltered select over the grants table returns
**1 row of 2**; unfiltered counts over requests, recipients and activations
return **1/1/1 of 2 each**; with no setting, **0**; an UPDATE affects **0 rows**;
and inserting a session before `enterWorkspace` is a **policy violation**.

`rolbypassrls` and `rolsuper` are both false, asserted.

## Findings

**The frontend `/sign/:requestId` route conflicts with BACKEND-33's link.** The
frontend resolves the path segment through a fixture `Map`; the backend emits a
43-character credential. The backend's shape is correct. Recorded in
[SIGNING_LINK_SCANNER_SAFETY.md](SIGNING_LINK_SCANNER_SAFETY.md) with the six
frontend requirements, not patched — §277 says do not redesign the UX.

**The recipient auth step exists in the UI and nothing is behind it.**
`AuthChallengePage.tsx` is a real six-digit screen whose own copy says
*"Demo: Enter 000000, 123456, or 111111 to pass. No real code was sent."*

**Two architecture guards were narrowed during the run**, each with the reason
recorded at the assertion — a substring `otp` guard that failed on the declared
method name, and a slice boundary written as a comment, which `code()` strips.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1737 passed, 58 files** |
| `npm run build` | Pass |
| `npm run test:integration` | **562 passed, 49 skipped** |
| Migration from zero | Verified twice |

## Honest gaps

**No HTTP route suite**, and no end-to-end cross-realm assertions. The
mechanisms are real and centrally tested; the direct assertions are missing.
Marked BY COMPOSITION in the test matrix rather than claimed as PASS.

**Nothing revokes.** `revoked_at`, the reason vocabulary, `source_grant_id` and
the lineage index all exist; no operation uses them. BACKEND-46 will.

**No IP or user agent captured.** Permitted by §89 if evidence requires it;
BACKEND-43 has not said what a certificate contains, and collecting PII for a
consumer that may never want it is collecting first and justifying later.
OD-143.

**`Path=/` on the recipient cookies**, where the pre-auth credential gets
`/auth`. Bootstrap and ceremony live under different prefixes today; if
BACKEND-35 unifies them, narrowing is one line.

**CSRF is built and unenforced**, because no recipient mutation exists yet.
BACKEND-35's first state-changing route must call `validateRecipientCsrf`.

## What BACKEND-35 inherits

1. **A stable `RecipientSigningContext`** — request, recipient, workspace,
   session, method, source grant. No role, no membership.
2. **Two RLS policies to write**, keyed off the SESSION digest: the source
   artifact, and the fields assigned to *that* recipient. A policy showing every
   field of the request would tell a signer what everyone else was asked for.
3. **Revalidate signability on every sensitive operation.** A session says who
   is asking, not that the request is still signable — a test asserts a session
   resolves normally after its request moved back to `draft`.
4. **Call `validateRecipientCsrf`** on the first mutation.
5. **A meaningful `viewed` event** only when an authenticated recipient enters
   the ceremony — never on a bootstrap, and never on a GET.
6. **Consent is an explicit act**, never inferred from authentication.
7. **Read only the immutable snapshot.** No contact, no preparation, no
   workspace document repository.
8. **No signature or field value** — BACKEND-36.
