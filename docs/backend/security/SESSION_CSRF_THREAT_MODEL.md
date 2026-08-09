# Session & CSRF Threat Model — BACKEND-13

Each threat, the controls actually in place, and what remains unmitigated.
Nothing here claims a threat is eliminated.

## T-1 — Session fixation

*An attacker plants a known session credential, then waits for the victim to
authenticate with it.*

**Controls.** `rotate()` creates a **new** session and revokes the old one; the
service exposes no way to mark an existing session authenticated. Tested: the
prior credential stops working immediately.

**Residual.** BACKEND-20 must actually call `rotate()` on login. The machinery
cannot force it; this is the single most important line in the auth handoff.

## T-2 — XSS reads the session

**Controls.** `HttpOnly`, never relaxed in any environment. The API serves JSON
only, so it renders no attacker-controlled markup.

**Residual.** XSS in the frontend can still *act* as the user by issuing
requests — it can read the CSRF cookie, which is why that cookie is not a
credential and grants nothing on its own. `HttpOnly` prevents **exfiltration**,
not abuse in the page. Frontend CSP is the control for the latter and is out of
scope here.

## T-3 — Database compromise yields working sessions

**Controls.** Only SHA-256 digests are stored. An attacker with a full dump
cannot reconstruct a cookie without inverting the digest of a 256-bit random
value. A CHECK constraint rejects anything that is not 64 lowercase hex
characters, so a bug that stored a raw token fails loudly.

**Residual.** An attacker with **write** access could insert their own digest
and mint a session. Database compromise is not survivable by this layer.

## T-4 — CSRF

**Controls.** Session-bound synchronizer token, validated against the digest
stored on *that* session. `SameSite=Lax` and exact-origin CORS as defence in
depth. `GET`/`HEAD` are exempt only because they must not mutate.

**Residual.** A subdomain XSS could read the CSRF cookie and forge a request —
but that attacker is already executing script in a same-site context, which is a
larger compromise. Origin and Fetch-Metadata checks are deferred (OD-036).

## T-5 — Cross-session token reuse

*A token issued for session A is submitted with session B.*

**Controls.** The comparison is against the session's own stored digest, so it
cannot match. Tested explicitly, and the reason a bare double-submit cookie was
rejected.

## T-6 — Stolen cookie (malware, shared machine, network)

**Controls.** `Secure` in production; absolute and idle expiry bound the window;
server-side revocation is immediate because every request checks the database.

**Residual.** **A stolen valid cookie is a working credential.** No control here
prevents that. Deliberately *not* mitigated by IP or user-agent binding: users
change networks and browsers update, so binding produces false logouts while an
attacker on the same network or copying the user-agent is unaffected. Those
signals belong to anomaly detection, not validity.

## T-7 — Logout without server revocation

**Controls.** Logout revokes the row; clearing the cookie is secondary. If the
response is lost, the session is still revoked and the stale cookie
authenticates nobody.

The clearing options are derived from the same base as the creation options, so
a scope mismatch cannot silently leave the cookie in place.

## T-8 — Credential leaks into logs or URLs

**Controls.** Cookie headers are never serialized; BACKEND-12's deep redaction
removes any key matching `*token`/`*secret` at any depth; a test asserts both
raw values are absent from captured logs. No credential ever appears in a URL,
and none is returned in a JSON body.

**Residual.** A future route that placed a token in a query string would defeat
this. §50 forbids it; no automated check enforces it yet.

## T-9 — Session replay

**Controls.** None, and that is correct: a session token is *meant* to be
reusable across requests. CSRF protects state-changing requests; expiry and
revocation bound the lifetime.

Making it one-time would break every parallel request a browser makes.

## T-10 — Cross-workspace misuse

**Controls.** The session carries **no workspace**. `AuthenticatedActor` is
`actorType`, `userId`, `sessionId` — asserted by test. Every workspace operation
must resolve membership independently (BACKEND-27), and RLS remains in force for
tenant data.

**Residual.** BACKEND-27 does not exist. Today a session identifies a user and
authorizes nothing, which is the safe direction.

## T-11 — Database outage misreported as logout

**Controls.** Repository failures propagate rather than being caught; the plugin
does not downgrade to anonymous. Tested: the response is not 401 and leaks no
connection detail.

This is a **security** control, not merely an availability one — a mass logout
during an outage trains users to re-enter credentials at exactly the moment
something is wrong.

## T-12 — Proxy and HTTPS confusion

**Controls.** `Secure` comes from configuration, never from a forwarded protocol
header. Production start fails if it is disabled. Proxy trust is default-deny
(BACKEND-11).

**Residual.** If production terminates TLS at a proxy and the proxy is
misconfigured, cookies could travel in the clear on the internal hop.
BACKEND-65 owns that verification (OD-027).

## T-13 — Session enumeration

**Controls.** All rejection reasons collapse to one public 401. `sessionId` is
never exposed and never logged. No endpoint accepts a session ID.

**Residual.** A future account-security screen must scope to the current user
and expose only a safe projection (§93–98).

## T-14 — Recipient signing confusion

**Controls.** None needed yet, because no signing-access model exists. The rule
is recorded: an external signer must **not** receive `lagda_session`, which
would hand them a user account session.

## What is not defended

- Malware on the user's device.
- A compromised browser extension.
- Database write access.
- Frontend XSS acting within the page.
- Phishing.

Each needs controls outside this layer — MFA (BACKEND-23), CSP, device trust,
user education. Listing them is more honest than implying the session model
covers them.
