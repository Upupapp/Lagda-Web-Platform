# Cookie Policy — BACKEND-13

Two cookies. One is a credential; one deliberately is not.

## `lagda_session`

| Attribute | Value | Why |
|---|---|---|
| `HttpOnly` | **true**, always | The single control that stops XSS from stealing the session outright. Never relaxed in any environment — a test asserts it holds even with `SESSION_COOKIE_SECURE=false` |
| `Secure` | **true**; false only outside production | Production start **fails** if set false. A session cookie without Secure travels in the clear |
| `SameSite` | **Lax** | See below |
| `Domain` | **not set** (host-only) | `Domain=.lagda.io` would send the session to every subdomain, widening the blast radius of an XSS on an unrelated marketing or status page |
| `Path` | `/` | A session applies to every authenticated endpoint; anything narrower only breaks requests |
| `Max-Age` | the absolute lifetime | Alignment only. **The server is authoritative** — a surviving cookie does not make an expired session valid |

## `lagda_csrf`

Identical, with one deliberate difference:

| Attribute | Value | Why |
|---|---|---|
| `HttpOnly` | **false** | The frontend must read it to send `X-CSRF-Token`. Making it httpOnly would make the mechanism unusable |

**This is not an authentication credential.** Holding it grants nothing — the
server validates it against the session's stored digest. It is named
`lagda_csrf` so no developer mistakes it for the session.

## SameSite=Lax — and why OD-028 does not block it

SameSite is evaluated per **site** (registrable domain), not per **origin**.

`app.lagda.io` calling `api.lagda.io` is **same-site**, so `Lax` sends the
cookie under both candidate deployments — same-origin *and* subdomain-split.
Only a frontend on a genuinely different registrable domain would need `None`,
and nobody has proposed that.

So the deployment question stays open (OD-028) while the cookie configuration
does not.

**`Strict` was rejected.** It withholds the cookie on top-level navigation from
an external link, so a signer following an invitation from their email would
land on a page that believes they are signed out.

**`None`** is configurable, requires `Secure`, and production start fails if the
two disagree.

## Clearing

Deletion uses the **same** `path`, `sameSite` and `secure` as creation, derived
from one shared base so they cannot drift. A browser matches a deletion to an
existing cookie by name, path and domain — clearing with different attributes
silently leaves the original in place, producing a logout that appears to work
and does not. A test asserts the scopes match.

Server-side revocation is authoritative regardless. If the response carrying the
clearing header is lost, the session is still revoked and the stale cookie
authenticates nobody.

## Environments

| | Development | Production |
|---|---|---|
| `HttpOnly` | true | true |
| `Secure` | configurable | **true, enforced at startup** |
| `SameSite` | lax | lax (configurable) |
| `Domain` | host-only | host-only |

Secure defaults to **true everywhere**; development must opt out explicitly. A
missing environment variable can therefore never silently produce an insecure
production cookie.

## Verified structurally, not in a browser

`app.inject()` asserts the attributes LAGDA sets. It cannot verify what a real
browser does with them — cross-site behaviour, `__Host-` prefix semantics,
partitioned-cookie rules. Those need browser-level tests (BACKEND-62/63), and
this document does not claim otherwise.

## Future cookies

Recipient signing access (BACKEND-34) may need its own transport. It must **not**
reuse `lagda_session`: an external signer is not a LAGDA account holder, and
overloading the cookie would hand them a user session.

## The pre-authentication cookie (BACKEND-23)

`lagda_pre_auth` — httpOnly, Secure in production, SameSite per configuration,
**`Path=/auth`**, Max-Age bounded by the ceremony's remaining life (≤10 minutes).

The narrow Path is the point. It is not merely "rejected elsewhere": the browser
never sends it to `/documents`, `/workspaces` or `/profile`.

Cleared on success, on attempt exhaustion, and on an expired ceremony — always
with the same name, path and domain, or the browser silently keeps the original.

No CSRF cookie accompanies it. There is no session for one to protect, and
minting one would make the pre-auth credential a route to authentication.

## Recipient signing cookies (BACKEND-34)

| Cookie | HttpOnly | Path | SameSite | Secure | Max-Age |
|---|---|---|---|---|---|
| `lagda_signing_session` | **yes** | `/` | Lax | in production | 8 h |
| `lagda_signing_csrf` | **no** | `/` | Lax | in production | 8 h |

Five cookie names now exist. Each belongs to exactly one realm and no resolver
reads another realm's name.

**`Path=/`, and it is the weakest thing here.** The pre-auth credential gets
`/auth` because everything that reads it lives under `/auth`. Recipient
bootstrap and the signing ceremony do not yet share a prefix — bootstrap is
`/signing-access/*`, context is `/signing/*` — so a narrower path would have to
be a guess about routes BACKEND-35 has not written. If BACKEND-35 unifies them,
narrowing is one line, and the reasoning is recorded at the constant so the
next reader does not have to reconstruct it.

**The CSRF cookie is readable by script on purpose.** That is what a
double-submit token is: the page reads it and echoes it in a header, which an
attacker's origin cannot do. It carries no authority alone — the session cookie
does, and that one is HttpOnly.

**`SameSite=Lax` is load-bearing here in a way it is not elsewhere.** A signing
recipient arrives by clicking a link in an email, which is a cross-site
top-level navigation. `Strict` would withhold the cookie on exactly the
navigation the whole flow is built around.

**Both cookies are cleared together.** A cleared session with a live CSRF cookie
is a page that believes it can still act.
