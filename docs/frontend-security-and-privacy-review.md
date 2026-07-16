# C25 — Frontend Security and Privacy Review

Review date: 2026-07-16

---

## 1. Storage

| Storage type | Used | Detail |
|--------------|------|--------|
| localStorage | No | Confirmed by grep across all app source. All references are comments explicitly stating non-use. |
| sessionStorage | No | Confirmed by grep. Same as above. |
| Cookies | No | No cookie read/write found. |
| IndexedDB | No | Not referenced. |
| Cache API | No | Not referenced. |

**Result: Clean.** No sensitive state is persisted to browser storage.

---

## 2. URL Safety

| Risk | Status | Detail |
|------|--------|--------|
| Email addresses in URLs | Not present | Route parameters use opaque IDs (requestId, transactionId, etc.) |
| Real names in URLs | Not present | All route parameters are branded ID types |
| Sensitive data in query strings | Not present | No form data placed in URLs |
| Private data in breadcrumbs | Not present | Breadcrumb titles use generic route names |
| href="#" dead links | None found | Zero instances confirmed |
| returnTo allowlist | Partial | returnTo used in auth flows but no explicit allowlist validation verified |

**Action recommended:** Add returnTo allowlist validation in auth redirect logic before production. returnTo should be validated to match known /app/* paths only.

---

## 3. Network Activity

| Type | Status |
|------|--------|
| fetch() calls | Zero in app source |
| axios | Not installed |
| XMLHttpRequest | Zero in app source |
| WebSocket | Zero in app source |
| EventSource | Zero in app source |
| External CDN scripts | Zero (Tailwind is build-time only) |
| Analytics pixels | Zero (analytics disabled, no-op adapter) |
| Payment SDKs | Not installed |
| Authentication SDKs | Not installed |
| External fonts | Not referenced in HTML (fonts loaded via CSS/build) |

**Result: Clean.** The application is fully offline-capable with respect to app logic. No core workflow requires network access.

---

## 4. Console Logging

| Type | Status |
|------|--------|
| console.log in app source | Zero instances |
| console.warn in app source | Zero instances |
| console.error in app source | Zero instances |
| Sensitive data in dev logs | Protected by logger.ts redaction |

**New in C25:** `src/app/utils/logger.ts` provides a typed privacy-safe logger that:
- Is a no-op in non-development builds
- Redacts email addresses, passwords, OTPs, tokens, signatures, card data, and credentials
- Uses `[LAGDA:LEVEL]` prefix for easy filtering

---

## 5. Sensitive State Management

| Sensitive state | Where held | Cleared on sign-out | Cleared on workspace switch |
|-----------------|-----------|--------------------|-----------------------------|
| User identity | PlatformContext (memory) | Yes — `signOut()` resets all context | N/A (personal) |
| Workspace data | PlatformContext (memory) | Yes | Yes — `switchWorkspace()` |
| Preparation draft | PrepareContext (memory) | Yes — component unmounts | Yes |
| Field editor state | FieldEditorContext (memory) | Yes | Yes |
| Recipient values | RecipientContext (memory) | N/A (recipient flow) | N/A |
| Signature state | RecipientContext (memory) | N/A | N/A |
| Field values | RecipientContext (memory) | N/A | N/A |
| MFA codes | PasswordPage/MfaPage (local state) | Yes — component unmounts | N/A |
| Branding file objects | BrandingPage (useRef) | Yes — revoked on unmount | Yes |
| Billing state | BillingPage (local state) | Yes | Yes |
| Integration config | IntegrationDetailPage (local state) | Yes | Yes |
| OTP codes | Auth pages (local state) | Yes — page navigates away | N/A |

**Result: Clean.** All sensitive state is in-memory React state. Nothing persists across page reloads.

---

## 6. Cross-Context Privacy

| Risk | Status |
|------|--------|
| Other participant data visible to recipient | Not present — RecipientContext only exposes current-participant data |
| Other workspace data visible after switch | Not present — workspace switch resets scoped state |
| Previous user data visible after sign-out | Not present — signOut() clears all context |
| Admin data visible to non-admin routes | Guarded by hasPermission() in PlatformContext |

---

## 7. eNotary / Burgundy Boundary

| Check | Result |
|-------|--------|
| Burgundy (#67023B) in platform CSS | Zero instances |
| eNotary as active feature in platform | Zero instances |
| eNotary billing item | Zero instances |
| eNotary role in workspace admin | Zero instances |
| eNotary participant role | Zero instances |
| eNotary field type | Zero instances |

**Result: Clean.** eSignature and eNotary boundaries are correctly separated.

---

## 8. HTML Injection

| Risk | Status |
|------|--------|
| dangerouslySetInnerHTML | Not used in app source (Figma imports may use it — audit separately) |
| User-supplied content rendered as HTML | Not identified |
| iframe embedding external content | Not used |
| eval() | Not used |

**Action recommended:** Audit Figma-imported components in `src/imports/` for any `dangerouslySetInnerHTML` usage before production.

---

## 9. Environment Variables

| Variable | Purpose | Secret? |
|----------|---------|---------|
| None in .env | No environment variables used | N/A |
| import.meta.env.DEV | Vite built-in — controls dev-only features | No |
| import.meta.env.PROD | Vite built-in — production flag | No |

**Result: Clean.** No secrets in environment configuration. No .env file required for the frontend-only phase.

---

## 10. Remaining Frontend Privacy Limitations

These limitations exist by design in the frontend-only phase and are not defects:

1. No real authentication — sign-in demonstration does not validate against a real identity provider.
2. No real authorization enforcement — permission checks are frontend-only and cannot prevent a determined user from accessing routes directly.
3. No real session tokens — session state is in React memory only and resets on page reload.
4. No document confidentiality — document previews use fictional fixture data, not real encrypted files.
5. No real participant identity verification — authentication demonstrations do not contact any identity service.
6. No real signature storage — signatures drawn in the recipient flow are in-memory only.
7. No audit trail creation — activity and evidence fixtures are pre-seeded, not created from real actions.
8. returnTo validation — should be allowlisted to known /app/* paths before production deployment.

All limitations are honestly disclosed in the UI via DEMO_NOTICE components and are documented in `docs/frontend-known-limitations.md`.
