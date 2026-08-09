# Email Verification Security — BACKEND-21

| Threat | Control |
|---|---|
| **Code guessing** | 60 bits of uniform randomness, rejection-sampled. Unguessable without relying on rate limits; the IP limiter is defence in depth. |
| **Code replay** | Single-use via a conditional `UPDATE`. A consumed code cannot verify again, and the first verification timestamp is never rewritten. |
| **Stale / rotated links** | Resend supersedes prior active challenges. An old code returns the same public failure as an unknown one. |
| **Email scanner auto-click** | Both routes are POST. The product collects a typed code, so opening a page consumes nothing. |
| **Email bombing** | Resend is limited per account (3 / 10 min) *and* per IP (10 / 10 min), and rotates rather than accumulating credentials. |
| **Account enumeration** | Resend returns one response for unknown, verified and unverified. Verification collapses every failure into one code. |
| **Host-header link injection** | Links are built from configured base URL. `Host` and `X-Forwarded-Host` are never read. |
| **Code in logs** | The raw code never reaches a log line. Asserted with markers at `trace` level. |
| **Code in the database** | Only a domain-separated SHA-256 digest is stored. A database read cannot verify anyone's account. |
| **Cross-credential reuse** | The digest prefix domain-separates verification codes from session, CSRF and future reset tokens. |
| **Concurrent consumption** | Conditional updates plus a partial unique index. Proven with 8 concurrent transactions. |
| **Delivery failure stranding a user** | Scheduling is inside the rotation transaction: if it fails, the old code stays valid. |
| **Privilege escalation** | A code authorizes verification only — no session, no workspace, no password change. |

## Not controls

**Rate limiting is not what makes the code safe.** It bounds volumetric abuse.
If the entropy were weak, limits would only slow an attacker down.

**Provider delivery is not verification.** A "delivered" webhook proves a
message reached a mailbox server, not that the account owner read it. Only
redeeming a code sets `email_verified_at`.

**No CAPTCHA, no security questions, no automatic IP bans.** Rate limits and
credential strength are the current controls.

## Residual risks

**Codes travel through email, which is not confidential.** Anyone who can read
the mailbox can verify the account — which is precisely what the flow tests, so
this is inherent rather than a flaw. Expiry and single-use bound the window.

**A shared NAT shares the IP limiter.** Mitigated by layering account and IP
scopes rather than making either aggressive.

**Verification cannot happen in production**: no notification infrastructure
exists, so no code is delivered. The mechanism is complete and unusable until
BACKEND-44/45.
