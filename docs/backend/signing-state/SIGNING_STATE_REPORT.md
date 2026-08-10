# BACKEND-37 report — the signing state machine

**Migration:** 024 · **Date:** 2026-08-11

## What was built

One canonical state policy, two state machines, four use cases, one new table,
no new dependency.

```
core/src/signing/workflow-state.ts          the policy. Pure, no clock
application/src/signing-workflow/           apply · advance · decline · cancel · reconcile
db/src/migrations/024_signing_state.ts      states, timestamps, constraints, RLS, backfill
db/src/repositories/signing-workflow.ts     conditional UPDATEs, nothing generic
```

## The finding that shaped the command

**The progression cannot be one transaction, and the reason is a security
property.**

§24 prefers the whole thing atomic. Migration 022 bound the recipient realm to
its OWN recipient row with RESTRICTIVE row-level security, and activating the
next cohort needs the next recipient's type, routing order, name and email — the
delivery intent literally carries the address. Making it atomic means widening
that policy so any signer's own request can read every participant of the
request, which trades the strongest tenancy control in the signing stack for one
commit.

So the split falls where the realms do: the signer's own state commits with
their signature, and the part that needs a workspace view is handed over through
a durable intent. Nothing can be stranded, because the intent commits with the
signature and the advance is a pure function of durable rows.

## The state the product does not have

`completion-ready`. Every other value was read out of `TransactionStatus`; this
one was added because the product conflates two facts that fail independently —
everyone signed, and the completed document exists. Writing `completed` at the
last signature would claim an artifact nobody has, in a state that is terminal
and cannot be walked back.

## What the product settled, that we would otherwise have guessed

- **OD-017** — one decline ends the request. `status-map.ts` marks `declined`
  terminal; the C37 resolver's reason is "A participant declined."
- **Cancel exists, void does not.** `avail("cancel", isActive && canPrepare)`
  and `avail("void", isCompleted && canAudit)`. Void needs `completed`.
- **Cancel is refused once every signature is collected** — the product's
  `isActive` list stops at `partially-completed`. §95 wanted that decision
  explicit; it was already made.
- **IN_PROGRESS is `partially-completed`**, with the product's own copy: "Some
  but not all recipients have completed their actions."
- **The capability is `signing-request.cancel`**, held by the four roles that
  hold `document.prepare`, because the product gates the control on
  `canPrepare`. An owner-or-administrator check would have been wrong for
  `template_administrator` and `sender` — the third time reading
  `ROLE_PERMISSIONS` has produced a non-obvious answer.

## Findings inside the codebase

**Three modules were each deciding whether a recipient may act.** BACKEND-34's
bootstrap check, BACKEND-35's ceremony, BACKEND-36's revalidation. They agreed,
which is not the same as being one answer — when they diverge the loosest one
wins. `CEREMONY_SIGNABLE_REQUEST_STATES` is deleted and a guard asserts the list
is declared once.

**A hardening nobody had needed yet.** Migration 022 added restrictive recipient
scoping to six tables and not to `signing_request_recipient_activation`,
`signing_access_grants` or `signing_delivery_intents` — the gap was closed by
the TYPE (no repository reached them) rather than by the database. BACKEND-37
gives the recipient realm a legitimate write to the first of those three, which
makes the difference matter, so 024 adds the restrictive scope there and denies
the realm outright on the other two.

**Two tests were passing for the wrong reason.** Both searched a JSON dump for
the substring `"signedAt"`, which held only because no column of that name
existed. Once the workflow row gained one they failed while nothing had actually
been recorded. Narrowed to assert VALUES — a key that is present and null is not
a fact.

**The architecture guard caught itself three times on its first run.** Two files
EXPLAIN in prose that they do not invoke `DocumentSealer` and do not declare
`updateState`, so a naive substring search read the documentation of the rule as
a violation of it — and the only way to make it pass would have been to delete
the explanation. The guard now strips comments and checks imports.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1949 passed** (+82) |
| `npm run build` | Pass |
| `npm run test:integration` | **597 passed, 49 skipped** |
| Migration from zero | Verified — `lagda_zero37_test`, 24 migrations, schema probed |

One integration run reported two idempotency failures that passed in isolation
and were green on the following run — the same order-dependent flake BACKEND-36
recorded. Not caused by this command; recorded rather than ignored.

## Honest gaps

**No HTTP routes for decline or cancel.** Both use cases exist, are tested, and
are exported — and neither has an endpoint. This is the largest gap the command
leaves, and it is a scope shortfall rather than a design decision: the API layer
work (contracts schemas, two route modules, `createApp` wiring, route tests) was
not reached. OD-069 already records that seventeen auth routes are similarly
uncomposed, so the repository has the precedent; that does not make this
finished.

**Concurrency is not proven against real PostgreSQL.** §241 and §242 are
mandatory and are NOT met. The mechanism — conditional UPDATE with the predicate
in the statement — is the same one `markSentIfDraft` uses, and the unit tests
prove convergence, but a fake cannot demonstrate that two transactions
serialize. The test matrix says NOT AVAILABLE rather than claiming a pass.

**No evidence event.** Consistent with BACKEND-35 and BACKEND-36 and with
OD-145: nothing in this codebase writes one, and an audit trail whose only
entries are workflow transitions reads as missing rather than as not yet built.

**No metric is emitted.** `WorkflowAdvanceOutcome` is bounded and returned, and
no route records it yet, because there is no route.

**The `down` migration is reviewed, not executed.** `up` from zero is proven.

## What BACKEND-38 inherits

A durable `completion-ready` with `completion_ready_at`, every required
obligation behind it backed by an immutable submission, and a four-column
foreign key that makes "this recipient's submission" a database fact rather than
an application check.

It must revalidate those submissions before producing bytes. The state is a
projection; the submissions are the evidence.
