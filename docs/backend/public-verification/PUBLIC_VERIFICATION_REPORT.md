# BACKEND-42 — report

**Command:** Public document verification · **Date:** 2026-08-11
**Gate:** typecheck, lint, **2291 tests — exit 0**

## Delivered

| Unit | Location |
|---|---|
| `VerificationIdGenerator` implementation | `packages/api/src/security/verification-id.ts` |
| Public verification use case | `packages/application/src/verification/public-verification.ts` |
| Rate-limit policies (2) | `packages/application/src/rate-limit/policies.ts` |
| Bounded streaming hasher | `packages/api/src/verification/verification-file.ts` |
| The two routes | `packages/api/src/verification/public-verification-routes.ts` |
| Wiring | `packages/api/src/app/create-app.ts` |
| Tests | 83 across four files |
| Documentation | this directory, ADR-034, INV-628–INV-640 |

## The three findings

### 1. `VerificationIdGenerator` had no implementation anywhere

Not in `db`, not in the API bootstrap, not in the test fakes — only the port and
BACKEND-41's single call site. BACKEND-41 injects `nextVerificationId` and
nothing supplied it; its tests passed because the harness stubbed it inline,
which is exactly the "ports whose only implementations are test ones" pattern
OD-069 records.

Closed here. Ten characters of rejection-sampled randomness over a 55-character
alphabet — ~58 bits — with `0`, `O`, `1`, `I`, `l` and `_` excluded because the
reference gets read aloud and retyped from a printed page.

**The §284 audit then found the larger version of the same defect, which this
report initially understated.** The generator is now implemented but nothing
*constructs* it, and neither does anything construct
`createPublicVerificationLookup`. Both are reachable only from tests.

Widening the check showed why: `createProductionDependencies` supplies exactly
one capability, `databaseHealth`. `create-app` gates seven feature families on
optional dependencies — `sessions`, `workspaces`, `signingAccess`,
`signingCeremony`, `signingSubmission`, `signingDecline`, `publicVerification` —
and the production composition root supplies **none** of them.

So the accurate statement is not that BACKEND-41 or BACKEND-42 failed to wire
themselves. It is that **the production server currently serves health checks
and nothing else**, and has since the API foundation was built. Recorded as
OD-171. Deliberately not fixed here: assembling that root is a command-sized
piece of work across thirty commands, and doing it partially would make an
anonymous public surface the first and only route a production process serves.

### 2. The designed status vocabulary discloses tenant state

Eleven `TransactionRecordStatus` members, seven of which confirm a signing
request exists and report its state to an anonymous caller.
`record-found-declined` would tell a stranger holding a leaked reference that a
named party refused to sign.

Implemented as two outcomes instead. The richer vocabulary stays on the
authenticated `/app/verify` surface. **This is a deliberate departure from the
designed product** and is the decision most worth a second opinion.

### 3. The frontend's parser accepts a four-character suffix

`VER_ID_RE = /^LAGDA-VER-\d{4}-\w{4,10}$/i` — roughly 8 million values,
enumerable at any plausible public rate limit. The backend requires the full
ten. Nothing has ever minted fewer (no completion existed before BACKEND-41), so
strictness costs nothing and closes the door on a short reference ever
resolving, including one minted by future code that reads the frontend regex and
takes its lower bound.

## Two defects the route tests found that reading did not

Both appeared only once the routes were served by a real Fastify instance:

- **500 on every GET.** The route called the limiter unconditionally, but the
  option is absent whenever no limiter dependency is configured — which is every
  app built without one, including the test harness.
- **415 on every POST.** Fastify refuses a content type it has no parser for,
  and no `addContentTypeParser` existed anywhere in `packages/api`.

The fix for the second is scoped inside a Fastify plugin. A wildcard parser on
the root instance would have changed how every other endpoint treats an
unrecognised body.

## Boundaries held

- No download route, listing route, search route or mutating verb exists.
- `WorkspaceAccessContext` appears nowhere in the stack.
- No notification is sent; no evidence event is written.
- The authenticated `/app/verify` surface is **not** implemented here.

## Open

| Ref | Item |
|---|---|
| OD-168 | The two-outcome departure from the designed status vocabulary — product sign-off |
| OD-169 | No integration test for `PublicVerificationLookup` against real PostgreSQL |
| OD-170 | `Cache-Control: no-store` revisit once the disclosure model is mature |
| **OD-171** | **⚠ LAUNCH BLOCKER — the production composition root supplies only `databaseHealth`; no feature route is served in production** |
| (carried) | BACKEND-41's upload-succeeds/DB-fails window remains untested |
