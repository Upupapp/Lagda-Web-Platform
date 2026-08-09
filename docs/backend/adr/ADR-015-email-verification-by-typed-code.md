# ADR-015 — Email verification by typed code

**Status:** Accepted
**Date:** 2026-08-09
**Command:** BACKEND-21

## Context

BACKEND-19 created an email verification challenge: a random credential, stored
as a digest, with an expiry. It generated a 32-byte base64url token intended for
a click-through link — the shape most products use.

The product does not work that way. `VerifyEmail.tsx` presents an input field
and calls `verifyEmail(code)`; the auth service takes a code string and
uppercases it. The page reads only `returnTo` from the URL. There is no token
parameter and no link-landing flow.

A 43-character base64url string is not something a person types.

## Decision

**A 12-character Crockford base32 code**, displayed grouped as
`XXXX-XXXX-XXXX`, canonicalized on input, stored as a domain-separated SHA-256
digest, single-use, expiring, and rotated on resend.

Everything BACKEND-19 established about the challenge is unchanged. Only the
credential's encoding and length differ.

## Alternatives considered

**Keep the 43-character link token.** Rejected: it would require rewriting the
verification page to read a query parameter and POST it — frontend work nobody
has scheduled — and would leave the existing typed-code UI dead. It also makes
email-scanner auto-consumption a live risk, which a typed code avoids entirely.

**Issue both a code and a link token per challenge.** Rejected: two credentials
per account doubles the surface and complicates the two things that must be
atomic — single-use and supersession. Two credentials would have to be
invalidated together, and any gap between them is a window.

**A 6-digit numeric OTP.** Familiar, and the shortest to type. Rejected on
entropy: 10⁶ is guessable, which would make rate limiting the thing standing
between an attacker and account verification. Verification is not a
second factor behind a password — for an unverified account it is the only
control — so the credential must stand alone.

**A JWT in the link.** Rejected outright: self-contained tokens cannot be
revoked, so supersession and single-use become impossible without the database
lookup a JWT exists to avoid.

**Longer base32 (16+ characters).** More entropy, more typing. 60 bits is
already unguessable at any realistic rate; the additional characters would cost
usability for no practical gain.

## Consequences

**Good**

- Matches the UI that exists. No frontend rewrite.
- Email scanners cannot consume a credential by fetching a link.
- Typeable from a phone screen to a laptop, which is how people actually move
  between devices mid-signup.
- Still embeddable in a link when delivery exists — the reverse was not true.

**Costs and constraints**

- **60 bits, not 256.** Unguessable at realistic rates, but the margin is
  smaller, which is why the volumetric IP limit exists and why the length must
  not be reduced.
- **A canonicalizer now sits between input and digest.** It is one function with
  one test, but it is a place where issuing and redeeming could drift if
  anyone adds a second normalization path.
- **Codes are readable in an email body**, so anyone who can read the mailbox
  can verify — which is exactly what the flow tests, but it means expiry and
  single-use carry more weight.
- BACKEND-19's two tests asserting the old format had to change.

## Revisit when

- Delivery exists and real users hit the flow, which will show whether 12
  characters is comfortable.
- A magic-link UX is genuinely wanted, at which point the same code can be
  embedded in a link that lands on the verification page rather than the API.
