# Account & profile — product inventory

Measured from the actual settings UI, not inferred from the command. BACKEND-24 §0.

## Surfaces found

`pages/platform/settings/` — `ProfilePage`, `PasswordPage`, `SessionsPage`,
`PreferencesPage`, `MfaPage`, `SecurityOverviewPage`, `SecurityActivityPage`,
`DataPrivacyPage`, `NotificationsPage`, `BillingPage`, `BrandingPage`,
`UsagePage`, `IntegrationsPage`.

## The decisive finding: email is read-only

`ProfilePage.tsx`, verbatim:

```
<SField label="Primary email"
        help="Read-only. Contact support to change your account email.">
  <input type="email" value={profile?.email ?? ""} readOnly disabled />
```

The product **does not have a self-service email change**. It routes the
operation through support.

BACKEND-24 devotes §42–§86 to email-change choreography. Building it would mean
shipping a security-sensitive identity-migration flow with no caller, contradicting
the product's own stated policy — and §43 says plainly: *if not in product, do not
add endpoints; still document security requirements for future implementation.*
That is what has been done — see ACCOUNT_SECURITY_BOUNDARIES.md.

## The name model is a single `fullName`

`UserProfile` has `fullName`, not `firstName`/`lastName`. §13 warns against
splitting arbitrarily, and the warning is well placed: a first/last split
misfits mononyms, patronymics, and most Filipino compound surnames — in a
Philippine legaltech product, that is not a hypothetical.

## Classification

| Field / action | Classification | Evidence |
|---|---|---|
| `fullName` | **PROFILE_FIELD** | `ProfilePage`, required, min 2 chars |
| `displayName` | **PROFILE_FIELD** | Defaults to `fullName` when blank |
| `jobTitle` | **PROFILE_FIELD** | `ProfilePage` |
| `department` | **PROFILE_FIELD** | `ProfilePage` |
| `preferredSenderName` | **PROFILE_FIELD** | `ProfilePage`; defaults to `fullName` |
| `initials` | **FRONTEND_ONLY** | Derived for avatars; never stored |
| `email` | **ACCOUNT_IDENTITY** | Displayed, read-only |
| `emailVerified` | **ACCOUNT_IDENTITY** | Derived projection only |
| `timezone`, `locale`, `language` | **PREFERENCE** | `PreferencesPage` |
| `dateFormat`, `timeFormat`, `numberFormat`, `appearance`, `density`, `documentListView` | **PREFERENCE** | `PreferencesPage` |
| Change password | **SECURITY_SETTING** | `PasswordPage` — current + new + confirm |
| List / revoke sessions | **SECURITY_SETTING** | `SessionsPage` |
| MFA enable / disable | **SECURITY_SETTING** | Owned by BACKEND-23 |
| **Change email** | **FUTURE_FEATURE** | Read-only; "contact support" |
| **Avatar upload** | **FUTURE_FEATURE** | UI previews a local object URL; no model field, no persistence |
| **Phone number** | **NOT_IN_PRODUCT** | Collected nowhere. No SMS MFA to justify it |
| **Account deletion / export** | **FUTURE_FEATURE** | `DataPrivacyPage` is explicitly "Frontend-only. No archive generated, no data deleted, no account closed" → BACKEND-54/55 |
| Notification preferences | **FUTURE_FEATURE** | `NotificationsPage` → BACKEND-44 |
| Billing, branding, usage, integrations | **WORKSPACE_SETTING** | Not account-scoped → BACKEND-25 onward |

## Session projection is constrained by the product

`SessionsPage.tsx` header, verbatim:

> "No full IP addresses, exact locations, session tokens, or device
> fingerprints."

The product has already made the privacy decision. `ActiveSession` carries
`deviceLabel`, `deviceType`, `browser`, `region`, `lastActive`, `isCurrent`,
`status` — and no address, no token, no fingerprint.

**The backend does not currently record device or region.** `user_sessions` has
no user-agent or IP column, deliberately (BACKEND-13). So the safe projection is
built from what actually exists — id, created, last seen, expires, current — and
the device labelling the UI shows is recorded as a gap rather than fabricated.
See OD-087.

## What this command builds

**IMPLEMENT_NOW:** `/me`, profile update, preferences, change password, session
list and revoke, safe MFA summary.

**NOT built:** email change (not in product), avatar (no persistence), phone
(not collected), deletion/export (BACKEND-55/54), notification preferences
(BACKEND-44).
