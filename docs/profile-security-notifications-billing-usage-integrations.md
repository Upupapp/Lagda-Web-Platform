# C24 — Profile, Security, Notifications, Branding, Billing, Usage & Integrations

## Overview

Command 24 implements 15 authenticated settings routes under `/app/settings`. All routes are **frontend-only demonstrations**; no backend services are connected and all state resets on page reload.

## Route Inventory

| Route | Component | Purpose |
|-------|-----------|---------|
| `/app/settings` | `SettingsOverviewPage` | Overview with attention items and quick links |
| `/app/settings/profile` | `ProfilePage` | Full name, display name, job title, avatar preview |
| `/app/settings/preferences` | `PreferencesPage` | Language, timezone, date/time/number format, appearance, density |
| `/app/settings/security` | `SecurityOverviewPage` | MFA status, session count, method list |
| `/app/settings/security/password` | `PasswordPage` | Password update demonstration with strength meter |
| `/app/settings/security/mfa` | `MfaPage` | Authenticator enrollment demo (no real TOTP) |
| `/app/settings/security/sessions` | `SessionsPage` | Active session list with demo revocation |
| `/app/settings/security/activity` | `SecurityActivityPage` | Filterable sign-in and security event log |
| `/app/settings/notifications` | `NotificationsPage` | Channel, frequency, quiet hours per category |
| `/app/settings/branding` | `BrandingPage` | Logo preview, brand color, contrast check, live preview |
| `/app/settings/billing` | `BillingPage` | Plan overview, invoices, plan comparison, billing contact |
| `/app/settings/usage` | `UsagePage` | 9 usage metrics with warning thresholds, 4 period views |
| `/app/settings/integrations` | `IntegrationsPage` | Catalog with search + category/availability filters |
| `/app/settings/integrations/:integrationId` | `IntegrationDetailPage` | Capabilities, data access, config, connect/test/disconnect demos |
| `/app/settings/data-and-privacy` | `DataPrivacyPage` | Data inventory, export request demo, account closure demo |

## File Structure

```
src/app/
  models/settings.ts                         — Branded ID types + all interfaces
  data/mock/settings.ts                      — Deterministic fixture data
  services/mock/settings.service.ts          — 8 domain services, session-local state
  pages/platform/settings/
    SettingsShell.tsx                        — SettingsPage, SettingsSidebar, SSection/SField/SCard primitives
    SettingsOverviewPage.tsx
    ProfilePage.tsx
    PreferencesPage.tsx
    SecurityOverviewPage.tsx
    PasswordPage.tsx
    MfaPage.tsx
    SessionsPage.tsx
    SecurityActivityPage.tsx
    NotificationsPage.tsx
    BrandingPage.tsx
    BillingPage.tsx
    UsagePage.tsx
    IntegrationsPage.tsx
    IntegrationDetailPage.tsx
    DataPrivacyPage.tsx
```

## Domain Boundaries

| Domain | Service | Fixture |
|--------|---------|---------|
| Account / Profile | `mockAccountSettingsService` | `FIXTURE_USER_PROFILE`, `FIXTURE_USER_PREFERENCES` |
| Security | `mockSecuritySettingsService` | `FIXTURE_SECURITY_OVERVIEW`, `FIXTURE_SESSIONS`, `FIXTURE_SECURITY_ACTIVITY` |
| Notifications | `mockNotificationSettingsService` | `FIXTURE_NOTIFICATION_PREFERENCES` |
| Branding | `mockBrandingSettingsService` | `FIXTURE_WORKSPACE_BRANDING` |
| Billing | `mockBillingSettingsService` | `FIXTURE_BILLING_ACCOUNT` |
| Usage | `mockUsageService` | `FIXTURE_USAGE_DATA` |
| Integrations | `mockIntegrationService` | `FIXTURE_INTEGRATIONS` |
| Data & Privacy | `mockDataPrivacyService` | `FIXTURE_DATA_PRIVACY` |

## Key Design Decisions

### Session-local state
All mutations are held in module-level `let` variables and reset on page reload — same pattern as C22/C23.

### No real secrets
- Password page: validation runs but shows "Password update simulated in frontend state."
- MFA page: shows `DEMO-LAGDA-SETUP-7F3K2N` as a placeholder, explicitly labeled not a real TOTP secret.
- Integrations: no OAuth exchange, no credential storage.
- Billing: card "4242" is a clearly fictional fixture — no real card collection.
- Export/closure: no archive generated, no data deleted.

### eSignature / eNotary boundary
- No Burgundy (#67023B) anywhere in settings.
- No eNotary billing, usage, integration, or security settings.
- Logo/avatar stays in memory only (object URL via `useRef`, revoked on unmount).

### Accessibility
- `role="switch" aria-checked` on all toggles.
- `role="alert"` for validation messages, `role="status"` for success toasts.
- `role="progressbar"` with `aria-valuenow/min/max` on usage bars.
- One `<h1>` per page; `<main id="main-content">` landmark.

### Branding
- Contrast ratio check warns if primary color is below 3:1 on white.
- "Powered by LAGDA" attribution is required and cannot be removed.

### Billing comparison
- Plan cells use `{ personal, business, enterprise }` extracted per-row to avoid TypeScript index-access issues.
- `AvailValue` icons: `included=✓`, `not-included=—`, `enterprise=E`, `varies=~`, `pending=·`.

### Usage periods
- `"current-month"`, `"previous-month"`, `"last-90-days"`, `"current-year"` — matches `UsagePeriod` type.
- `metric.limit` can be `number | "varies" | null`; progress bar only renders for numeric limits.

## Fixture Data

- **Persona:** Ana Reyes, Managing Attorney, Mabini Legal Solutions, Asia/Manila, `ana.reyes@example.com`
- **Plan:** Business (annual), 10 seats / 6 active members / 3 pending invites
- **Security:** Password configured, MFA not-enabled, 4 sessions (3 active + 1 expired)
- **Usage warning:** Members-active at 6/10 (approaching)
- **Integrations:** 8 entries across storage/productivity/identity/crm/automation/developer categories

## Legal / Financial Safeguards

All demonstration boundaries are clearly communicated in UI:
- "Frontend demonstration — all changes are session-local and reset on page reload."
- "This plan change is simulated in frontend state. No subscription, invoice, payment, seat allocation, or feature entitlement is changed by a backend."
- "This connection is simulated in frontend state. No third-party authorization, OAuth exchange, credential storage, or data synchronization occurs."
- "This creates a frontend export-request demonstration only. No archive is generated and no data is delivered."
- "This creates a frontend account-closure request demonstration only. No account, Workspace, document, transaction, or stored data is deleted."
