# Certificate authentication language

**Command:** BACKEND-40 · **Status:** binding on `completion-certificate-v1`

What the certificate may say about how someone authenticated, and — the part
this document exists for — what it may never say.

## The prohibition

**LAGDA verifies no legal identity.** It establishes that someone reached a
signing session, by one of two mechanisms. The certificate describes the
mechanism and stops there.

Every phrase below is FORBIDDEN on a LAGDA completion certificate, because
LAGDA has implemented none of them:

- "Identity verified" / "Verified signer" / "Verified identity"
- "Identity confirmed", "Signer authenticated and verified"
- "KYC", "Know Your Customer", any government-ID framing
- "Digital certificate", "PKI", "X.509", "qualified electronic signature"
- "PAdES", "PKCS#7", "PNPKI", "TSA", "HSM"
- "Court-admissible", "legally binding proof of identity"
- "Biometric", "biometrically verified"

The product itself denies the first and the sixth of these in two places. A
certificate contradicting the application that produced it would be worse than
one that stayed silent.

## The approved wording

Exactly two mechanisms exist —
`RECIPIENT_AUTHENTICATION_METHODS = ["link-only", "email-otp"]` — and each has
one approved rendering.

| Recorded method | Certificate wording | What it means | What it does NOT mean |
|---|---|---|---|
| `link-only` | **Signing link** | The signer reached the ceremony by possessing a unique signing link sent to their address | Nothing about identity. Anyone holding the link could have used it — it is a bearer credential |
| `email-otp` | **Email one-time passcode** | The signer additionally entered a one-time code delivered to their address | Control of a mailbox. **Not** proof of legal identity, and not a government-issued credential |

The distinction between them is a difference in **mechanism strength**, not a
difference between "unverified" and "verified". Neither is verification.

## Why this is a `Record`, not a `switch`

The renderer holds the wording as a **total `Record`** over the closed
vocabulary:

```ts
const AUTHENTICATION_WORDING:
Readonly<Record<CertifiedAuthenticationMethod, string>> = Object.freeze({
  "link-only": "Signing link",
  "email-otp": "Email one-time passcode",
});
```

A `switch` with a `default` would let a newly introduced mechanism silently
inherit another's description — and the most likely default, for a
security-adjacent field, is the reassuring one. As a total record, adding a
method without deciding its wording is a **compile error**.

## Failing closed, in two places

Belt and braces, deliberately, because the failure mode is a document asserting
something untrue:

1. **The builder** checks the recorded method against the certifiable set and
   throws `unsupported-authentication-method`. This fires where the *decision*
   is missing — before anything is rendered.
2. **The renderer** checks again before drawing and throws
   `UnsupportedRepresentationError`.

Both are TERMINAL. A method this build cannot certify will not become
certifiable by retrying, and a retryable classification would burn the attempt
budget that should surface a genuine outage.

Neither ever falls back to a label. There is no path that renders an unknown
method as anything, least of all as "Verified".

## Authentication time

**Not shown in v1.** §39 warns against treating session creation time as
authentication time unless they are intentionally equivalent, and that
equivalence has not been established for LAGDA. Printing a time whose meaning is
unsettled is how a certificate acquires a fact nobody decided.

The submission's `accepted_at` — the signing time — is shown, and is
unambiguous.

## Which authentication is certified

The method recorded **on the accepted submission**
(`recipient_submissions.authentication_method`), never "the latest
authentication event for this recipient".

The difference is real: a recipient may open a link, later authenticate with an
OTP in a second session, and have signed under the first. Certifying the
stronger, later mechanism would overstate the assurance attached to the
signature that actually exists — the precise failure this document exists to
prevent, arriving through a join rather than through wording.

## If a third mechanism is added

Do all four, in this order:

1. Add it to `RECIPIENT_AUTHENTICATION_METHODS`.
2. Decide its certificate wording, and write down what it does and does not
   prove — in the table above, before writing code.
3. Add it to `CERTIFIABLE_METHODS` in the builder and to
   `AUTHENTICATION_WORDING` in the renderer. Both are total; the compiler will
   insist.
4. Decide whether the change alters the MEANING of existing certificates. If it
   does, `certificateVersion` increments. If only the phrasing changes,
   `rendererVersion` increments.

Do not skip step 2. Everything else is mechanical; that step is the one that
keeps the certificate honest.
