# BACKEND-24 — Account and profile report

## Product inventory

| Feature | Status |
|---|---|
| **CURRENT USER /me** | **IMPLEMENTED** |
| **PROFILE UPDATE** | **IMPLEMENTED** — 5 fields |
| **PREFERENCES** | **IMPLEMENTED** — 9 fields |
| **PASSWORD CHANGE** | **IMPLEMENTED** |
| **SESSION MANAGEMENT** | **IMPLEMENTED** — list, revoke one, revoke others |
| **MFA SUMMARY** | **IMPLEMENTED** — read-only projection |
| **EMAIL CHANGE** | **NOT_IN_PRODUCT** — read-only, "contact support" |
| **AVATAR** | **DEFERRED** — UI previews a local object URL; no model field, no persistence |
| **PHONE** | **NOT_IN_PRODUCT** — collected nowhere; no SMS MFA to justify it |
| **ACCOUNT DELETION** | **DEFERRED** — BACKEND-55; the page is explicitly "no data deleted, no account closed" |

→ ACCOUNT_PRODUCT_INVENTORY.md

## Schema (migration 012)

Added to `users`: `full_name`, `job_title`, `department`,
`preferred_sender_name`, `timezone`, `locale`, `language`, `date_format`,
`time_format`, `number_format`, `appearance`, `density`, `document_list_view`,
`profile_updated_at`.

All nullable — the registration form asks for none of them, and `""` would
conflate "never filled in" with "deliberately cleared". Six CHECK constraints
bound the closed vocabularies.

**No `user_profiles` table**: seven small single-valued account-bound columns
with the same lifetime as the account. A separate table would add a join to
every `/me` read and a second row to keep in step.

**No `preferences jsonb`**: explicit columns say what the product supports, and
a bag is how "settings" becomes a place to avoid deciding who owns a field.

## Verification

| Gate | Result |
|---|---|
| typecheck / lint / build | **PASS** |
| unit tests | **PASS** — 641 |
| `npm run check` | **PASS** |
| integration | **PASS** — 371 |
| migration from zero | **PASS** — 12 migrations on a clean database |
| probes | **18 of 19 caught by tests; 1 blocked by the type system** |

## What probing found

**A real defect, fixed:** the timezone check used `Intl.DateTimeFormat` alone,
and `Intl` **accepts `"+08:00"`** — measured, not assumed. Raw offsets would have
been stored, which is exactly what §29 exists to prevent. An IANA shape check
now runs before the runtime check.

**A vacuous assertion, fixed:** the `/me` leak test registered `me@example.com`,
whose normalized form is identical to its display form — so "the normalized
identity is absent" was satisfied by the display address. It now registers a
mixed-case address.

**Two probes were no-ops before being rewritten:** selecting a column is not
leaking it. Made to leak for real, one is caught by a test and the other
(placing an MFA secret into `/me`) **does not compile** — the projection type has
nowhere to put it, which is stronger than a test.

## Honest gaps

**OD-069 remains the top blocker, and now covers this command too.** Six more
routes exist and none is composed into `createApp`. `authenticatedUser` is a
route option, so "a pre-auth credential cannot read `/me`" is demonstrated
through a test double rather than in a running application — the same gap
BACKEND-23 recorded, now spanning seventeen routes.

**No CSRF plugin is bound**, so §22's requirement is satisfied by the session
architecture's design rather than by an attached check. Also OD-069.

**No rate limiter on password change.** §37 asks for one and a policy exists
(`mfa.disable.user` is the analogue), but binding is again composition work.
Recorded as part of OD-069 rather than claimed.

**The sessions page shows device and region; the backend records neither.**
BACKEND-13 deliberately stores no user agent or IP. The projection returns what
exists and does not fabricate the rest — OD-087.
