# BACKEND-24 — Account and profile test matrix

31 integration tests against real PostgreSQL, 26 route tests, 19 probes.

| Area | Case | Result |
|---|---|---|
| Me | authenticated current user | **PASS** |
| Me | anonymous | **PASS** |
| Me | pre-auth credential only | **PASS** |
| Me | safe projection, no hash or normalized email | **PASS** |
| Me | `emailVerifiedAt` not exposed, boolean derived | **PASS** |
| Me | MFA summary only, no secret | **PASS** |
| Me | unverified factor is not "enabled" | **PASS** |
| Me | `no-store` cache header | **PASS** |
| Me | session outliving the account clears cookies | **PASS** |
| Me | closed response schema | **PASS** |
| Profile | update the five allowed fields | **PASS** |
| Profile | identity and credentials untouched | **PASS** |
| Profile | unknown fields rejected | **PASS** |
| Profile | email mass assignment | **PASS** |
| Profile | verification-state mass assignment | **PASS** |
| Profile | password / hash mass assignment | **PASS** |
| Profile | MFA mass assignment | **PASS** |
| Profile | role / admin mass assignment | **PASS** |
| Profile | workspace mass assignment | **PASS** |
| Profile | `userId` / `sessionId` mass assignment | **PASS** |
| Profile | other-user spoof structurally impossible | **PASS** — no id in path or schema |
| Profile | Unicode, apostrophes, hyphens, mononyms | **PASS** |
| Profile | control characters rejected | **PASS** |
| Profile | whitespace trimmed, blank → null | **PASS** |
| Profile | display name falls back to full name | **PASS** |
| Profile | cannot leave the account with no display name | **PASS** |
| Profile | does not disable MFA or alter sessions | **PASS** |
| Preferences | IANA timezone accepted | **PASS** |
| Preferences | raw offset REFUSED (`Intl` accepts it) | **PASS** |
| Preferences | unmentioned keys preserved | **PASS** |
| Preferences | explicit null clears | **PASS** |
| Preferences | database refuses an unknown vocabulary value | **PASS** |
| Password | correct current password succeeds | **PASS** |
| Password | wrong current password changes nothing | **PASS** |
| Password | registration policy reused | **PASS** |
| Password | Argon2id, plaintext not persisted | **PASS** |
| Password | old fails, new works | **PASS** |
| Password | own session kept, others revoked | **PASS** |
| Password | pending MFA ceremonies revoked | **PASS** |
| Password | verification state unchanged | **PASS** |
| Sessions | lists own only, no credentials | **PASS** |
| Sessions | cannot revoke another user's | **PASS** |
| Sessions | revoke one, current survives | **PASS** |
| Sessions | self-revoke reports `signedOut` and clears cookies | **PASS** |
| Sessions | revoke all others | **PASS** |
| Sessions | repeat revoke-all is a no-op | **PASS** |
| Sessions | closed projection schema | **PASS** |
| Repository | exposes no generic patch method | **PASS** |
| Repository | repeated profile writes cannot touch identity | **PASS** |
| Evidence | account code never reaches evidence tables | **PASS** — architecturally; no import exists |
| Email change | — | **NOT APPLICABLE** — not in product |
| Migration | from zero | **PASS** |

## Probes — 18 caught by tests, 1 blocked by types

**Caught:** open the profile schema · open the preferences schema · let
`updateProfile` write identity · leak the normalized email · open the `/me`
response schema · serve `/me` unauthenticated · drop the cache header · change
the password without the current one · weaken the password policy · keep other
sessions alive · revoke the caller's own session · drop the user scope from
revoke · leak a session digest · accept a raw UTC offset · accept control
characters · blank the display name · blank unmentioned preferences · open the
revoke schema

**Blocked by the type system:** placing an MFA secret into `/me` does not
compile — `CurrentUser["security"]` has nowhere to put it. Stronger than a test,
and reported as such rather than counted as a catch.
