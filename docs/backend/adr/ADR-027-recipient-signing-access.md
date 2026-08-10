# ADR-027 — Recipient signing access

**Status:** Accepted (BACKEND-34)
**Date:** 2026-08-10
**Related:** ADR-026 (send orchestration), BACKEND-26 (invitation credential
path), BACKEND-13 (sessions and CSRF)

## Context

External recipients must reach exactly one signing workflow without becoming
LAGDA users. They have no account, no membership and no workspace context, and
every existing read path in the system begins with workspace context.

They arrive holding one thing: a bearer credential that was emailed to them.

## Decision

**An opaque bootstrap credential resolves a narrow, credential-scoped data
path, which produces an opaque server-managed recipient session scoped to one
request recipient.**

1. **Bootstrap is a POST**, exchanged explicitly. The emailed link targets a
   frontend route that mutates nothing.
2. **The credential resolves through `FOR SELECT` RLS policies** matching
   equality on unique digest columns, keyed off transaction-local settings —
   the shape BACKEND-26 established for invitations.
3. **The tenant transition happens on the same transaction**, using the
   workspace the *grant* resolved, into a **narrow** unit of work with one
   repository.
4. **The session credential is fresh**, never the bootstrap token promoted,
   with an independently drawn CSRF twin under a separate digest domain.
5. **`LINK_ONLY`** is the authentication policy — the product's default — and
   the assurance is documented without rounding up.
6. **Two realms**, five cookie names, three transaction settings. They coexist
   and neither implies the other.

## Alternatives rejected

**Reuse the raw link token as the session credential.** Rejected: the link
travels in email, may be forwarded, sits in archives and appears in URL bars. A
session that *is* that token inherits every one of those exposures, and cannot
be revoked without revoking the link.

**Require a LAGDA account.** Rejected: a signer is a counterparty, not a
customer. Forcing registration to sign a lease would be a product decision
nobody made, and it would create an account for every person any LAGDA customer
ever transacts with.

**Match the recipient email to an existing account.** Rejected on three
grounds, and it is worth being explicit because it is the tempting one: it leaks
account existence to whoever holds the link, it implies an authentication that
did not happen, and it would make workspace membership silently change what a
recipient can do.

**A JWT signer token.** Rejected: verification without a database row is the
opposite of what this needs. Revocation, expiry, a narrow lookup and server
authority are each a row, and a self-contained token gives up all four to save
one query.

**`BYPASSRLS` on the runtime role, or a privileged lookup service.** Rejected,
and the reason the alternative exists at all is that it is genuinely easier. But
a bypass is not scoped to the credential — it is scoped to the process, and
every future bug in that process inherits it. The policy approach fails closed
and cannot answer a question the caller did not already hold the answer to.

**A workspace id parameter on the lookup.** Rejected: a parameter a request body
could reach is a parameter an attacker can choose. Resolving the workspace *from
the credential* makes tampering unexpressible rather than merely rejected.

**Email OTP now.** Rejected as unbuildable rather than unwanted: no persisted
policy, no challenge model, and no delivery. An OTP that cannot reach the
recipient is a lock with no key.

**One-time bootstrap exchange.** Rejected for now (OD-141): the product's
recipient flow loses state on reload and has no resend, so a one-time credential
locks a signer out permanently. Revisit when resend exists.

## Consequences

**Good**

- A recipient reaches exactly one document, proven by counts rather than by
  argument: 1 row of 2, and 0 with no setting.
- No bypass to audit, no privileged service account, no widened role.
- The two realms cannot confuse each other — different names, domains and
  settings all the way down.
- BACKEND-35 receives a stable context and needs to invent no authentication.

**Costs**

- Link possession is the whole assurance. That is honestly documented, and it
  is the product's own choice, but it is weaker than a second factor.
- A reusable credential is a longer-lived bearer secret than a one-time one.
- Four more RLS policies to reason about, and BACKEND-35 will add two more.
- `Path=/` on the recipient cookies, where a narrower path would be stronger.

**Left open**

OD-140 (OTP), OD-141 (one-time exchange), OD-142 (revocation operations),
OD-143 (observed metadata), OD-144 (the frontend link contract).
