# LAGDA Frontend Testing Strategy

## 1. Testing Goals

The LAGDA frontend testing strategy has four objectives:
1. Prevent regressions in working routes and components
2. Verify fixture data integrity across domain boundaries
3. Confirm service contracts return expected shapes
4. Document the permission model with table-driven tests

Tests must be deterministic (no real time, no network, no randomness), isolated (no shared state between tests), and fast (no full browser launch required for unit/component tests).

---

## 2. Recommended Test Framework

**Vitest** (recommended) — integrates with Vite, fast, Jest-compatible API.  
**@testing-library/react** — semantic queries, accessible by default.  
**@testing-library/user-event** — realistic user interactions.  
**vitest-axe** or **axe-core** — automated accessibility checks.

No test framework is configured in the current build. Add with:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom
```

Add to `vite.config.ts`:
```ts
test: {
  environment: "happy-dom",
  globals: true,
  setupFiles: ["src/test/setup.ts"],
}
```

---

## 3. Unit Tests

**Target:** Pure functions in utils/, models/, config/

Priority targets:
- `demo-clock.ts` — `formatRelative`, `isoDaysAgo`, `demoDaysFromNow`
- `errors.ts` — `ok()`, `fail()`, `isFail()`, `isOk()`
- `logger.ts` — redaction of sensitive keys
- `analytics.ts` — no-op behavior, typed events
- `pricing.config.ts` — plan IDs, plan comparison rows
- `routes.ts` — route metadata completeness (every route has title, isIndexable, requiresAuth)

---

## 4. Component Tests

**Target:** Shared UI components and page-level smoke tests

Priority components:
- `SettingsShell.tsx` — SettingsPage renders sidebar + content
- `DevPlaceholder` — renders without crash
- Status badges — correct labels for each status value
- Empty states — render when list is empty
- Error states — render ServiceFailure messages
- Loading states — render skeleton

Page smoke tests (render the page with fixture data; assert it doesn't crash and key content is present):
- Every settings page
- Dashboard
- DocumentsPage
- RecipientRoot (each scenario type)
- Public home, pricing, verify

---

## 5. Service-Contract Tests

**Target:** Every mock service implementation

For each service, test representative cases:
- Success (returns ok: true with expected shape)
- Not found (returns fail with NOT_FOUND code)
- Permission denied (when applicable)
- Cancellation (operation token cancelled before completion)
- Stale request (OperationScope detects mismatch)

Use `vi.useFakeTimers()` with a fixed time to avoid delay-based flakiness.

---

## 6. Fixture-Integrity Tests

**Target:** `src/app/data/mock/` files

Tests should fail with a useful message when:
- Duplicate IDs exist within a domain
- Cross-domain references point to non-existent IDs
- Required fields are missing
- Dates are in the wrong order (e.g., completedAt before createdAt)

Example:
```ts
it("has no duplicate transaction IDs", () => {
  const ids = MOCK_DOCUMENTS.map(d => d.id);
  const unique = new Set(ids);
  expect(unique.size).toBe(ids.length);
});

it("current user belongs to current workspace", () => {
  expect(MOCK_CURRENT_USER.workspaceId).toBe(MOCK_CURRENT_WORKSPACE.id);
});
```

---

## 7. Route Tests

**Target:** `src/router.tsx`

Tests:
- Every authenticated route redirects to /sign-in when session is null
- Every public route renders public layout (no platform shell)
- Recipient routes render RecipientLayout (no public or platform shell)
- Platform routes render PlatformLayout once (not double-nested)
- /app redirects to /app/dashboard
- /onboarding redirects to /onboarding/profile

Use `MemoryRouter` or `createMemoryRouter` from react-router for test isolation.

---

## 8. Permission Tests

**Target:** `PlatformContext.hasPermission()` + `ROLE_PERMISSIONS` in models/index.ts

Table-driven tests for all system roles:

```ts
const cases: [PlatformRole, PlatformPermission, boolean][] = [
  ["owner",    "manage_billing", true],
  ["viewer",   "manage_billing", false],
  ["sender",   "prepare_documents", true],
  ["reviewer", "prepare_documents", false],
  // ...all 9 roles × all 17 permissions
];
test.each(cases)("%s can %s: %s", (role, permission, expected) => {
  expect(ROLE_PERMISSIONS[role].includes(permission)).toBe(expected);
});
```

Also test:
- Final owner cannot be removed (workspace admin safeguard)
- Plan availability does not grant permission
- Query parameters do not grant permission

---

## 9. Integration Tests

**Target:** Cross-domain frontend flows

Flow A — Sign in → Dashboard → Documents:
- Sign in with mock auth
- Assert PlatformContext.sessionStatus === "authenticated"
- Navigate to /app/documents
- Assert document list renders

Flow B — Prepare document:
- Start prepare flow
- Add participant
- Configure routing
- Reach field editor
- Assert draft state contains participant and routing

Flow C — Recipient flow:
- Load request by scenario (signer, approver, expired, locked)
- Assert correct layout and actions for each scenario
- Complete signing demonstration
- Assert completion state

Flow D — Settings:
- Navigate through profile → security → notifications → billing → integrations
- Assert each page renders without error
- Perform one mutation per page
- Assert session-local state update

---

## 10. Accessibility Tests

Run `axe` against each major page:

```ts
import { axe, toHaveNoViolations } from "vitest-axe";
expect.extend(toHaveNoViolations);

it("Settings profile has no a11y violations", async () => {
  const { container } = render(<ProfilePage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

Priority pages: Dashboard, Documents, Prepare steps, Recipient signing, Settings overview.

Known exemptions (document in test):
- Field editor drag-and-drop (requires keyboard alternative verification separately)
- Signature canvas (alternative text input required)

---

## 11. Responsive Tests

If Playwright or Cypress is available, add viewport tests:

```ts
test("Documents page has no horizontal overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/app/documents");
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(320);
});
```

Priority routes at 320px: home, pricing, sign-in, dashboard, documents, settings.

---

## 12. Offline Tests

Verify core workflows with network blocked:

```ts
// In Playwright:
await context.route("**/*", route => {
  if (route.request().resourceType() === "xhr" || route.request().resourceType() === "fetch") {
    route.abort();
  } else {
    route.continue();
  }
});
```

Expected: All pages render using local fixture data. No core action requires a network response.

---

## 13. Test Helpers

Required test helpers (add to `src/test/`):

| Helper | Purpose |
|--------|---------|
| `renderWithProviders(ui, options)` | Wraps component in all required providers (PlatformProvider, etc.) |
| `renderAuthenticated(ui, scenario)` | Renders with a mock authenticated session |
| `renderWithWorkspace(ui, workspace)` | Renders with a specific workspace scenario |
| `renderRecipient(ui, requestId)` | Renders in RecipientLayout with a fixture request |
| `setupDemoClock(date)` | Sets deterministic base date before each test |
| `createMockToken()` | Creates a cancellation token for service tests |

---

## 14. Scenario Selection in Tests

Tests select scenarios by injecting fixture data directly:

```ts
it("shows expired banner when request is expired", () => {
  const { getByText } = renderRecipient(
    <RecipientRoot />,
    "req_expired",
  );
  expect(getByText(/request has expired/i)).toBeInTheDocument();
});
```

Do not rely on URL query parameters for test scenario selection.

---

## 15. Deterministic Time

Always call `setupDemoClock(new Date("2026-01-01"))` in `beforeEach` when testing date-relative content. Reset with `resetDemoBaseDate()` in `afterEach`.

---

## 16. Avoiding Flaky Tests

- Never use `setTimeout` with real delays in tests — use `vi.useFakeTimers()`
- Never assert on exact pixel positions
- Avoid exact full-paragraph copy assertions — use semantic role queries
- Clean up mocked modules with `vi.restoreAllMocks()` in `afterEach`
- Avoid test-ordering dependencies — each test must set up its own state

---

## 17. Deferred Production Testing

When backend services are integrated:
- Replace service fakes with real API contract tests
- Add E2E flows in a staging environment
- Add authentication flow tests with real OAuth
- Add PDF processing tests
- Add email delivery verification tests
- Add signing persistence verification tests
