# LAGDA Frontend Service Layer

## 1. Purpose

The service layer provides typed, replaceable interfaces between page components and data. In the frontend-only phase all services are implemented by mock adapters that return deterministic fixture data after a simulated delay. At integration time, each mock adapter is replaced by a real API adapter without changing any consumer component.

---

## 2. Scope Boundary

The service layer:
- Returns typed results
- Simulates latency
- Supports cancellation
- Provides deterministic scenario-based responses
- Never makes real network requests
- Never persists state to browser storage
- Never generates real secrets

The service layer does not:
- Connect to a real backend
- Authenticate against a real identity provider
- Store documents
- Send emails or SMS
- Create real signing requests

---

## 3. Service Registry

| Service file | Domain | Interface defined |
|--------------|--------|-------------------|
| auth.service.ts | Authentication | Yes (AuthService) |
| dashboard.service.ts | Dashboard | Partial |
| document.service.ts | Documents | Yes (DocumentService) |
| transaction-detail.service.ts | Document Detail | Partial |
| verify (public) | Public Verification | Yes (VerificationService) |
| verification.service.ts | Auth Verification | Partial |
| prepare.service.ts | Preparation Draft | Partial |
| field-editor.service.ts | Field Editor | Partial |
| recipient.service.ts | Recipient Flow | Partial |
| templates.service.ts | Templates | Yes (TemplateService) |
| contacts.service.ts | Contacts | Yes (ContactService) |
| workspace.service.ts | Workspace switching | Yes (WorkspaceService) |
| workspace-admin.service.ts | Workspace Admin | Partial |
| settings.service.ts | Settings (8 sub-services) | Internal only |
| notification.service.ts | Notifications | Yes (NotificationService) |
| search.service.ts | Search | Partial |
| session.service.ts | Session | Partial |

Interface coverage is partial in some domains — this is acceptable for the frontend-only phase. Full interface definitions should be authored at API integration time.

---

## 4. Domain Service Interfaces

Canonical interfaces are defined in `src/app/services/interfaces/index.ts`. Key contracts:

### AuthService
```ts
signIn(payload: SignInPayload): Promise<ApiResponse<MockSession>>
register(payload: RegisterPayload): Promise<ApiResponse<MockSession>>
signOut(): Promise<void>
getSession(): MockSession
```

### DocumentService
```ts
list(options?: ListDocumentsOptions): Promise<ApiResponse<Paginated<DocumentTransactionSummary>>>
get(id: string): Promise<ApiResponse<DocumentTransactionSummary>>
```

### TemplateService
```ts
list(): Promise<ApiResponse<TemplateSummary[]>>
get(id: string): Promise<ApiResponse<TemplateSummary>>
```

### ContactService
```ts
list(): Promise<ApiResponse<ContactSummary[]>>
get(id: string): Promise<ApiResponse<ContactSummary>>
```

### VerificationService
```ts
verify(verificationId: string): Promise<ApiResponse<VerificationResult>>
```

### BillingService
```ts
getSubscription(): Promise<ApiResponse<SubscriptionSummary>>
getUsage(): Promise<ApiResponse<UsageSummary>>
```

---

## 5. Mock Adapters

Mock adapters live in `src/app/services/mock/`. Each adapter:
- Imports fixture data from `src/app/data/mock/`
- Uses `delay()` from `delay.ts` for deterministic latency
- Holds mutable session-local state in module-level `let` variables
- Resets to fixture defaults on page reload

### Settings Domain (8 sub-services)

`settings.service.ts` exports 8 domain services:
- `mockAccountSettingsService` — profile, preferences
- `mockSecuritySettingsService` — password, MFA, sessions, activity
- `mockNotificationSettingsService` — notification preferences
- `mockBrandingSettingsService` — logo, brand color, attribution
- `mockBillingSettingsService` — plan, invoices, billing contact
- `mockUsageService` — usage metrics by period
- `mockIntegrationService` — integration catalog, connect/test/disconnect
- `mockDataPrivacyService` — data inventory, export request, closure request

---

## 6. Result Contracts

Two contract styles coexist:

### Legacy: ApiResponse<T> (models/index.ts)
```ts
type ApiResponse<T> = ApiResult<T> | ApiError
// { success: true, data: T } | { success: false, error: { code: string, message: string } }
```
Used by: auth, documents, templates, contacts, verification, workspace, billing services.

### New in C25: ServiceResult<T> (models/errors.ts)
```ts
type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure
// { ok: true, data: T } | { ok: false, code: LagdaErrorCode, message: string }
```
Used by: new service implementations going forward.

At API integration time, normalize all services to `ServiceResult<T>`. The `ok/fail` helpers in `errors.ts` simplify construction.

---

## 7. Error Taxonomy

Full error taxonomy defined in `src/app/models/errors.ts`. Error codes cover:

| Category | Codes |
|----------|-------|
| General | UNKNOWN, CANCELLED, STALE_REQUEST, DEMO_SERVICE_UNAVAILABLE |
| Authentication | AUTH_REQUIRED, SESSION_EXPIRED, INVALID_CREDENTIALS_DEMONSTRATION, MFA_REQUIRED, MFA_FAILED_DEMONSTRATION |
| Authorization | PERMISSION_DENIED, WORKSPACE_RESTRICTED, FEATURE_UNAVAILABLE, PLAN_RESTRICTED |
| Resource | NOT_FOUND, INVALID_ID, CONFLICT, ARCHIVED, RESOURCE_UNAVAILABLE |
| Validation | INVALID_INPUT, REQUIRED_FIELD, INVALID_STATE, INCOMPATIBLE_CONFIGURATION |
| Document | DOCUMENT_UNAVAILABLE, PARTICIPANT_CONFLICT, ROUTING_CONFLICT, FIELD_CONFIGURATION_INVALID |
| Recipient | REQUEST_EXPIRED, REQUEST_CANCELLED, REQUEST_VOIDED, REQUEST_ALREADY_ACTIONED, ROUTING_LOCKED |
| Settings | SECURITY_OPERATION_SIMULATION_FAILED, BILLING_UNAVAILABLE, INTEGRATION_UNAVAILABLE |

Each code has a safe user-facing message in `ERROR_MESSAGES`. Technical context stays in dev logs only.

---

## 8. Cancellation

`src/app/services/mock/mock-operation.ts` provides:
- `OperationToken` — cancel a pending operation
- `OperationScope` — prevent stale operations from updating unrelated state
- `mockOp<T>()` — runs a function with configurable latency, cancellation, and error handling

Consumer components should create an `OperationToken` in `useEffect` and call `.cancel()` on cleanup.

---

## 9. Stale-Request Prevention

`OperationScope.begin()` returns an operation ID. Check `scope.isCurrent(id)` before applying the result to state. Prevents a slow mock from writing to the wrong route's state after navigation.

---

## 10. Deterministic Latency

`delay.ts` reads `APP_CONFIG.mockDelayMs` (default: 400ms). Override in dev by editing `app.config.ts`. Respects `prefers-reduced-motion` indirectly — shorter skeletons at the default latency avoid prolonged animation.

---

## 11. Dependency Injection

Services are not globally imported throughout page components. Access pattern:

- **Settings pages**: Import named service directly from `settings.service.ts` (single-domain file, acceptable)
- **Platform pages**: Access via PlatformContext (user, workspace, notifications)
- **Prepare flow**: Access via PrepareContext
- **Recipient flow**: Access via RecipientContext

At integration time, wrap service access in a React context or typed hook to allow test injection without changing page components.

---

## 12. Testing Injection

Current approach: mock services are module-level singletons. Tests import the service and can override its module-level state variables before each test.

Recommended at scale: wrap service access in a typed context hook:
```ts
const { documentService } = useServices();
```
Provide a `ServiceProvider` in tests that injects controlled fakes.

---

## 13. Future API Adapters

To replace a mock service with a real API adapter:
1. Create `src/app/services/api/[domain].service.ts` implementing the same interface
2. Register in `ServiceProvider` based on `APP_CONFIG.mockMode`
3. Remove `APP_CONFIG.mockMode = true`
4. The page components require no changes

---

## 14. Security and Privacy Rules

Service implementations must:
- Never log passwords, OTPs, tokens, signatures, or card data (use `log` from logger.ts)
- Never write to localStorage, sessionStorage, or cookies
- Never make real network requests
- Never generate real secrets or API keys
- Never call real OAuth endpoints
- Return `DEMO_SERVICE_UNAVAILABLE` rather than crashing on unimplemented paths

---

## 15. No-Network Behavior

All core workflows function with network access disabled. Confirmed: zero fetch/axios/XHR calls in app source. Official brand assets load from `public/` directory.

---

## 16. Deferred Backend Requirements

See `docs/backend-integration-handoff.md` for the full backend requirements. Summary:
- Every `ServiceResult` failure case needs a corresponding backend error response mapping
- Pagination contracts need to be agreed before `list()` operations go to a real API
- Idempotency keys needed for signing requests, invitation sends, and plan changes
- Audit log entries need to be server-generated; the current activity fixtures are frontend-seeded


---

## Signing Workflow service (Command 37)

`src/app/services/mock/signing-workflow.service.ts` — one canonical service boundary for the
per-document Signing Workflow feature. Pages never call it directly for reads; the
`useWorkflowData` hook (`src/app/pages/platform/documents/workflow/useWorkflowData.ts`) owns
loading, cancellation, capability resolution, and permission mapping.

Two pure engines sit alongside it and are shared by every surface:

| Module | Responsibility |
|--------|----------------|
| `src/app/services/signing-workflow.validation.ts` | The single validation engine. `validateSigningWorkflow()` and `computeFieldReadiness()`. No component contains its own validation logic. |
| `src/app/services/signing-workflow.resolver.ts` | The single current/next-stage, completion, and progress resolver. Visual board order never determines the current stage. |

Contract notes:

- Every method takes a `SigningWorkflowContext` carrying `workspaceId`, `teamId`,
  `capabilityAvailable`, `canView`, `canEdit`, and an optional `AbortSignal`.
- Every ID is shape-validated with `isSafeWorkflowIdValue` before use.
- All results are `ServiceResult<T>` from `models/errors.ts`.
- Reorder operations require an exact permutation of existing IDs; they can never add, remove, or
  invent an item.
- Derived state (role, blocking, signature coherence, field readiness, configuration status) is
  recomputed by the service on every load and mutation, so the UI can never set it directly.
- `clearWorkspaceScopedWorkflows()` runs on workspace switch and
  `resetSigningWorkflowDemonstration()` on sign-out, both wired in `PlatformContext`.
- No network request, no persistence, no storage API.
