# The recipient signing session

## The credential

| Property | Value |
|---|---|
| Source | `randomBytes(32)` — 256 bits |
| Encoding | base64url, 43 characters |
| Digest | SHA-256, `lagda.recipient-signing-session` |
| Stored | **the digest only** |
| Delivered | **HttpOnly cookie only** — never a response body |
| Lifetime | 8 hours, absolute, configurable |
| Format | **Not a JWT** |

A **second, independent** credential is drawn in the same call for CSRF, under
its own domain `lagda.recipient-signing-csrf`.

**Two independent draws, not one derived from the other.** A CSRF token computed
from the session token — even through a hash — makes a double-submit check whose
two halves share a secret. A database CHECK refuses a row whose two digests are
equal, and an architecture guard counts the `randomBytes` calls.

## Freshness

The session credential is **never** the bootstrap token promoted, and never
derived from it. A session token that was a function of the emailed link would
inherit the link's exposure — forwarded mail, shared inboxes, mail archives.

Tests assert the session token is not the bootstrap token, does not contain it,
is not contained by it, and that submitting a session token to `bootstrap`
resolves nothing (different digest domain).

## Cookies

| | Session | CSRF |
|---|---|---|
| Name | `lagda_signing_session` | `lagda_signing_csrf` |
| HttpOnly | **yes** | **no**, by design |
| Secure | production, from config | same |
| SameSite | from config (`Lax`) | same |
| Domain | **not set** — host-only | same |
| Path | `/` | `/` |
| Max-Age | the session's remaining life | same |

**Why `Path=/` and not something narrower.** The pre-auth credential gets
`Path=/auth`, which is stronger than rejecting on arrival because the cookie is
never *transmitted* elsewhere. That does not fit here: bootstrap lives at
`/signing-access/bootstrap` and the ceremony will live under `/signing`, so a
path narrow enough to exclude one excludes the other.

Realm separation is carried by the **names**, which is what actually prevents
resolver confusion — `requireSession` reads `lagda_session` and will never see
these. If BACKEND-35 settles every recipient route under one prefix, narrowing
this is one line and worth doing.

**Why `SameSite=Lax` and not `Strict`.** The same reason the workspace session
uses it, and it matters more here: `Strict` withholds the cookie on top-level
navigation from an external link, and following a signing invitation from an
email is *exactly* that navigation.

## Scope

**One request, one recipient.** Enforced by a three-column foreign key, so a
session cannot be bound to a recipient of a different request even inside one
workspace.

Two recipients sharing an email address on two requests get two sessions, and
neither can act as the other. Access is credential- and id-based; nothing
resolves a recipient by email, and an architecture guard forbids the lookup
shapes that would.

## What it does NOT grant

No workspace membership, no role, no capability. The context carries no
`UserId`, no `WorkspaceRole`, no `WorkspaceMembershipId` — a guard reads the
interface body and fails on any of them.

`workspaceId` **is** on the context, because a recipient's reads are tenant rows
and a transaction needs a scope. It is not authority: nothing consults it to
decide what the recipient may do.

The recipient realm reaches `/signing-access/*` and `/signing/*`. It reaches no
workspace surface, because those routes live inside the authenticated scope and
`requireSession` does not read this cookie.

## Coexistence

A browser may hold both cookies. A LAGDA user who is also a signer on someone
else's document is a normal case, and merging the two would be wrong in both
directions: it would give a recipient workspace access, and it would let a user
session act as a counterparty.

Each route resolves its own realm by cookie name. Neither implies the other.

## Multiple sessions

Permitted. Each bootstrap mints an independent session.

The bootstrap credential is reusable until it expires (OD-141), so a recipient
who reloads, or moves from laptop to phone, gets a new session rather than being
locked out. The product's recipient flow loses its state on every reload and has
no resend operation, which makes one-time exchange hostile.

If a one-active-session policy is ever chosen, the `superseded` revocation
reason already exists.

## Expiry and revocation

**Absolute expiry only.** No idle timeout: a signing session is short by
construction, and touching a row on every request buys nothing against a
lifetime measured in hours. Expiry is **derived from the clock**, never a stored
`is_expired` column — a status someone has to remember to update is a status
that will be wrong.

`revoked_at` and a five-value reason vocabulary exist —
`expired`, `superseded`, `request-terminal`, `grant-revoked`,
`security-action` — with `source_grant_id` and a partial index recording the
lineage. **Nothing revokes yet.** BACKEND-46 will, when a request expires, and
the "revoke everything this grant produced" query is one statement.

## Session ≠ perpetual authorization

Resolving a session says **who is asking**. It does not say the request is still
signable — that question changes while a session lives, and each sensitive
operation must ask it for itself.

A test asserts this directly: a session resolves normally after its request has
been moved back to `draft`. Caching eligibility in a cookie is the failure mode;
BACKEND-35 must revalidate.

## CSRF

Session-bound double-submit, realm-aware by construction. The submitted token is
digested under the **recipient CSRF domain** and compared to that session's
`csrf_token_digest`, so:

- another session's CSRF token fails;
- the session token submitted as its own CSRF token fails, even though it is a
  real credential;
- a workspace-realm CSRF token fails, because it digests under a different
  domain and would not match even if the strings were identical.

`validateRecipientCsrf` is built and tested. **No route enforces it yet**,
because no recipient mutation exists — BACKEND-35's first state-changing
recipient route must call it.
