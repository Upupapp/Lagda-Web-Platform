# Account security boundaries

## What generic profile mutation may never alter

| Field / action | Owner |
|---|---|
| `email`, `normalized_email` | Registration; a future email-change flow |
| `email_verified_at` | Email verification (BACKEND-21) |
| `password_hash` | Registration, password reset (22), password change (24) |
| MFA factors, secrets, recovery codes | BACKEND-23, dedicated use cases |
| Pending authentications, all challenges | The owning security feature |
| Sessions, CSRF state | The session service |
| Workspace membership, role, ownership | BACKEND-25/27 |
| System-admin status | Does not exist; will not be a profile field |
| Account deletion / erasure state | BACKEND-55 |

**Enforced by absence, not by filtering.** `AccountProfileRepository` has three
methods and neither writer names any column above. Probed: adding
`email_verified_at` to `updateProfile`'s `set(...)` is caught; opening the
request schema to extra properties is caught; fourteen distinct
privilege-escalation payloads are each a 400.

## Email change — NOT_IN_PRODUCT

`ProfilePage.tsx` renders the address read-only with the help text
*"Contact support to change your account email."* There is no self-service email
change, so none was built (§43).

**If one is ever added, it must have all of the following.** Recorded here so
the requirements exist before the feature does:

1. **Reauthentication.** A session alone must not irreversibly replace the login
   identity. Current password at minimum; step-up MFA where the account has it.
2. **No immediate replacement.** The current email stays authoritative until the
   new address is verified. `PATCH /me { email }` must never exist.
3. **A dedicated, purpose-bound challenge** — its own table, its own digest
   domain, distinct from verification, reset, MFA and session credentials. The
   pattern is established four times over (BACKEND-21, 22, 23).
4. **Canonical normalization** via `normalizeEmail`. No second rule.
5. **PostgreSQL uniqueness as the final authority**, re-checked inside the
   switch transaction — another account may claim the address between request
   and confirmation.
6. **A fresh `email_verified_at`.** The old timestamp verified a different
   address and must not be carried across.
7. **Invalidate everything tied to the old identity**: verification challenges,
   password-reset challenges, pending MFA ceremonies.
8. **An explicit session policy** — the login identifier changed, so a stolen
   session must not simply continue.
9. **Never merge accounts.** A target address that already belongs to someone is
   a conflict, not a merge.
10. **A notice to the OLD address**, once notification infrastructure exists —
    it is the only way the previous owner learns their account was taken.

## Historical signing evidence is not profile data

A user renaming themselves must not rewrite who signed a document last year.

Signing evidence snapshots signer identity **at signing time** under its own
model (BACKEND-03/09). Nothing in this command reads or writes evidence tables,
and the account repositories have no access to them. When BACKEND-29 onward
records signers, it must copy the name and address in force at that moment
rather than referencing the mutable account row.

The same applies to email: a future email change must leave historical evidence
untouched.
