# Contact test matrix — BACKEND-28

Every row states where the assertion lives. **N/A** and **NOT TESTED** are used
where they are the truth; a matrix of PASS is not evidence of anything.

New this command: **20 core, 44 use-case, 18 route, 21 architecture, 21
integration** = 124.

## Identity boundary — the claim that matters most

| Case | Result | Where |
|---|---|---|
| Creating a contact creates no user, membership or invitation | **PASS** | use case |
| Creating a contact whose email IS a member's account changes nothing | **PASS** | use case |
| …and produces no duplicate warning (an account is not a contact) | **PASS** | use case |
| No contact file references `findByNormalizedEmail` / `normalizeEmail` / `NormalizedEmail` | **PASS** | architecture |
| The use cases reach no identity repository | **PASS** | architecture |
| `contacts` has no `user_id` / `membership_id` / `invitation_id` / `verified_at` column | **PASS** | architecture |
| Exactly one foreign key, to `workspaces` | **PASS** | architecture |
| `ContactEmailKey` is not assignable to `NormalizedEmail` | **PASS** | core, `expectTypeOf` |
| The comparison key never appears in a response | **PASS** | use case + route (exact key set pinned) |

## Tenancy

| Case | Result | Where |
|---|---|---|
| Another workspace's contact is invisible to `findById` | **PASS** | integration (runtime role) |
| …and to `list` | **PASS** | integration |
| Cross-tenant update refused | **PASS** | integration + use case |
| Cross-tenant archive refused, target untouched | **PASS** | integration + use case |
| A raw INSERT naming another tenant violates `WITH CHECK` | **PASS** | integration |
| The repository rejects a workspace mismatch before RLS does | **PASS** | integration |
| No tenant context sees zero rows | **PASS** | integration |
| Duplicate candidates never cross the tenant | **PASS** | integration + use case |
| `FORCE ROW LEVEL SECURITY` is set | **PASS** | architecture + integration |
| Policy has both `USING` and `WITH CHECK` | **PASS** | architecture |
| No `BYPASSRLS`, no `SECURITY DEFINER`, no new transaction scope | **PASS** | architecture |
| No repository method takes a workspace argument | **PASS** | architecture |

## Authorization

| Case | Result | Where |
|---|---|---|
| `owner` may do all four operations | **PASS** | use case |
| `administrator` may | **PASS** | use case |
| `template_administrator` may | **PASS** | use case |
| `sender` may | **PASS** | use case |
| `member` refused, including read | **PASS** | use case |
| `reviewer` refused, including read | **PASS** | use case + route |
| `auditor` refused, including read | **PASS** | use case |
| Non-member refused | **PASS** | use case + route |
| Denial is a hidden 404, never 403 | **PASS** | route |
| Every role in `WORKSPACE_ROLES` is covered | **PASS** | use case (asserts the set) |
| Actor's role re-read inside the transaction (demotion mid-flight) | **PASS** | use case |
| Exhaustive 7 × 14 capability matrix | **PASS** | core (208 assertions) |
| The four contact capabilities travel together, never a subset | **PASS** | architecture |
| Capability names identical in core and contracts | **PASS** | architecture |
| No capability for an operation that does not exist | **PASS** | architecture |
| No role comparison in any contact file | **PASS** | the BACKEND-27 guard, unchanged and still passing |

## Deletion

| Case | Result | Where |
|---|---|---|
| The runtime role is refused a raw `DELETE` by PostgreSQL | **PASS** | integration |
| Grants are exactly SELECT, INSERT, UPDATE | **PASS** | integration (`information_schema`) |
| Migration grants no DELETE | **PASS** | architecture |
| No contact file issues a delete statement | **PASS** | architecture |
| The port declares no delete method | **PASS** | architecture |
| No `DELETE` route; 404 | **PASS** | architecture + route |
| Archiving keeps the row | **PASS** | use case + route |
| State derived from `archived_at`, no `status` column | **PASS** | architecture + core |
| Epoch 0 is archived, not absent (the `!archivedAt` trap) | **PASS** | core |

## Duplicates

| Case | Result | Where |
|---|---|---|
| The second contact is CREATED, with a warning | **PASS** | use case + route (201, not 409) |
| Matching is case- and whitespace-insensitive | **PASS** | use case |
| Dots are NOT folded | **PASS** | core |
| Plus-tags are NOT folded | **PASS** | core + use case |
| Archived contacts excluded | **PASS** | use case |
| A contact is not its own duplicate on update | **PASS** | use case |
| Moving onto an in-use address warns | **PASS** | use case |
| Another workspace's contacts never warn | **PASS** | use case + integration |
| Two active contacts may share an address at the DB level | **PASS** | integration |
| No unique index over the email key | **PASS** | architecture |
| Concurrent creation of the same address | **N/A** | Both succeed by design. There is no constraint to race — see CONTACT_DUPLICATE_POLICY.md |

## Validation

| Case | Result | Where |
|---|---|---|
| Name trimmed outside, interior spacing preserved | **PASS** | core + use case |
| Empty / whitespace-only name refused | **PASS** | core |
| `Cc` and `Cf` characters refused (NUL, newline, ZWJ, RTL override) | **PASS** | core + use case |
| Control characters reported BEFORE length | **PASS** | core |
| Non-ASCII names accepted (Spanish, Japanese, Baybayin, Cyrillic) | **PASS** | core + use case |
| Length counted in code points, not UTF-16 units | **PASS** | core |
| Boundary: exactly max accepted, max+1 refused | **PASS** | core |
| Length measured after trimming | **PASS** | core |
| Optional fields: null / undefined / blank all become null | **PASS** | core + use case |
| Philippine phone formats preserved verbatim | **PASS** | core |
| Email syntax matches `hasEmailSyntax` exactly | **PASS** | core |
| Display case preserved, key folded | **PASS** | core + use case |
| All validation problems reported at once | **PASS** | use case |
| No submitted value echoed in an error | **PASS** | use case |
| Over-long field refused at the schema (422) | **PASS** | route |
| Unknown property refused, not ignored | **PASS** | route (`workspaceId`, `userId`, `state`, `contactId`) |

## Listing

| Case | Result | Where |
|---|---|---|
| Defaults: active, 20 per page, `updatedAt desc` | **PASS** | use case |
| Search covers name, email, organization, title | **PASS** | use case + integration |
| Search is case-insensitive | **PASS** | integration |
| `%`, `_` and `\` match literally | **PASS** | integration |
| Blank search means no search | **PASS** | use case |
| Over-long search refused | **PASS** | use case |
| NULL organization sorts last in BOTH directions | **PASS** | use case + integration |
| Pagination is stable and the total is filter-wide | **PASS** | use case + integration + route |
| Page past the end is 200 with an empty array | **PASS** | use case + route |
| Archived excluded from the active book | **PASS** | use case + integration |
| Archived listing returns only archived | **PASS** | use case + integration |
| `perPage` beyond the maximum refused | **PASS** | route |
| Unknown sort field refused | **PASS** | route |

## Mutation

| Case | Result | Where |
|---|---|---|
| PUT replaces every editable field | **PASS** | use case |
| Omitted optional fields are cleared (PUT semantics) | **PASS** | use case |
| An explicit null clears; an absent key does not | **PASS** | integration (repository level) |
| `contactId`, `workspaceId`, `createdAt` unchanged by an update | **PASS** | use case |
| An archived contact cannot be edited | **PASS** | use case + integration |
| Validation runs before any write | **PASS** | use case |
| Archive twice refused | **PASS** | use case + integration |
| Restore an active contact refused | **PASS** | use case + integration |
| Unknown id refused | **PASS** | use case |
| `updated_at` equals `created_at` on insert | **PASS** | integration |
| A failed transaction leaves no partial row | **PASS** | use case + integration |
| One transaction per operation | **PASS** | use case |

## HTTP surface

| Case | Result | Where |
|---|---|---|
| All six routes refuse anonymous with 401, writing nothing | **PASS** | route, through the real `createApp` |
| Mutations refuse a session without a CSRF token (403) | **PASS** | route, real app |
| Every response is `no-store` | **PASS** | route + architecture |
| 201 with `Location` on create | **PASS** | route |
| Timestamps are ISO-8601 on the wire | **PASS** | route |
| Pre-auth (half-finished MFA) credential refused | **BY COMPOSITION** | The scope hook enforces it for every route in it, proved by the workspace and invitation suites through the same factory. The contact routes have no dedicated assertion |
| Rate limiting | **NOT APPLIED** | See below |

## Telemetry

| Case | Result | Where |
|---|---|---|
| A serialized log line contains no name, email, phone, organization or title | **PASS** | route (real Pino output) |
| A DUPLICATE's details stay out of the log too | **PASS** | route |
| `duplicateCount` is a number | **PASS** | route |
| No log payload names a contact field | **PASS** | architecture (source scan) |
| Metric labels are `operation`, `result`, `processRole` only | **PASS** | architecture |

## Not tested, and why

**Rate limiting — NOT APPLIED, not merely untested.** Contact writes are
member-only, send no email, and create bounded rows; there is no outbound-abuse
surface of the kind that made invitation limits necessary. A limit would still
be reasonable against a runaway client, and none is bound. Recorded rather than
implied — and OD-112 (CSV import) is the change that would make one mandatory.

**Pre-auth refusal on contact routes — BY COMPOSITION.** The routes sit inside
the authenticated scope, whose hook enforces it for everything in it. The
anonymous-401 and missing-CSRF cases ARE asserted directly against the real app;
the pre-auth case is not. The same honest label BACKEND-27 used for member
routes.

**Concurrent duplicate creation — N/A.** By design both succeed.

**Contact-to-recipient interaction — N/A.** Recipients do not exist. The
boundary is documented for BACKEND-30 in CONTACT_RECIPIENT_BOUNDARY.md rather
than tested against nothing.

**Erasure — NOT IMPLEMENTED.** OD-110.

## A flake found and fixed

Adding a fourth API suite surfaced a **pre-existing** timing problem: the full
unit run began failing on an invitation-route test
(`refuses every management route anonymously`) at Vitest's 5-second default,
roughly half the time, and only on cold runs.

Nothing was wrong with that test. The **first** `app.inject()` in each API suite
pays the cost of transforming the whole application graph — `createApp` pulls in
Fastify, every plugin, the error handler and every route module — and the
contact suite added another file to that first compile wave. The same test
passes alone in 597 ms.

A compile-bound limit disguised as a behavioural one produces failures that
point at an innocent test and change with machine load, which is the worst kind
of red build. `testTimeout` in `vitest.config.ts` is now 20 s, with the
reasoning at the setting. The headroom is deliberately large: nothing should
legitimately approach it, so a test that does hit it is genuinely hung.

Verified with three consecutive clean `npm run check` runs, 1139/1139 each.
