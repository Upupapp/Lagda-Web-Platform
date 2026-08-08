---
name: STITCH
description: End-to-end user-flow connectivity audit, repair, and regression-testing skill. Use after changes to routes, navigation, links, buttons, forms, multi-step workflows, redirects, authentication, permissions, feature gates, route metadata, dashboard cards, search results, notifications, command-palette actions, error handling, or fallback pages. Also use when a user reports a dead end, wrong destination, broken Back or Cancel behavior, redirect loop, inaccessible transition, invalid deep link, missing 404, or before a release.
when_to_use: Automatically infer the smallest sufficient scope from the current request, current implementation task, Git changes, affected route families, and shared navigation dependencies. Do not automatically run a whole-application audit for an isolated change. Escalate scope when shared routing, navigation, authentication, permission, capability, shell, redirect, or fallback infrastructure changed.
argument-hint: "[changed|quick|flow|route|module|public|platform|full|release|audit-only] [target]"
user-invocable: true
disable-model-invocation: false
---

# STITCH

STITCH is a reusable user-flow integrity command.

STITCH means:

- **S — Scope and map the affected surface**
- **T — Trace intended user journeys**
- **I — Inspect connections, guards, and destinations**
- **T — Test runtime behavior and fallbacks**
- **C — Correct defects and add regression coverage**
- **H — Handoff a precise result**

STITCH must identify, verify, and repair disconnected user journeys without inventing new product functionality.

## Invocation

Invocation input:

$ARGUMENTS

Supported invocation patterns:

- `/stitch`
  - Infer scope from the active request, current task, and Git changes.
- `/stitch changed`
  - Inspect changed files and every directly affected inbound and outbound flow.
- `/stitch quick`
  - Run a focused smoke audit of changed routes and controls.
- `/stitch flow "sender creates and prepares a document"`
  - Trace one named end-to-end user journey.
- `/stitch route "/app/documents/:documentId"`
  - Inspect one route, its route family, inbound links, outbound actions, guards, and fallbacks.
- `/stitch module documents`
  - Inspect one module and its connections to adjacent modules.
- `/stitch public`
  - Inspect the public information portal and public conversion paths.
- `/stitch platform`
  - Inspect the authenticated platform.
- `/stitch full`
  - Inspect the complete public and authenticated application.
- `/stitch release`
  - Perform full release-level flow verification, build validation, browser testing, and fallback auditing.
- `/stitch audit-only [scope] [target]`
  - Report defects without modifying source files.

Additional keywords may be combined:

- `report`
  - Create or update a durable STITCH report if the project documentation conventions support it.
- `no-fix`
  - Equivalent to audit-only.
- `mobile`
  - Include explicit narrow-viewport and virtual-keyboard checks.
- `permissions`
  - Expand authorization, role, Team, and Workspace coverage.
- `fallbacks`
  - Expand error, unavailable, restricted, Not Found, and recovery coverage.
- `cross-browser`
  - Run the supported browser matrix when the existing test framework permits it.

## Automatic scope resolution

When STITCH is invoked automatically or without explicit arguments, determine scope in this order:

1. Explicit arguments.
2. The current user request.
3. The feature or route currently being implemented.
4. Uncommitted Git changes.
5. Files changed relative to the current branch base where safely identifiable.
6. Direct callers, destinations, route parents, child routes, and shared dependencies.
7. The smallest scope that can provide meaningful confidence.

Do not ask for scope when it can be inferred safely.

Ask one focused question only when:

- There is no current implementation context.
- There are no relevant Git changes.
- Several unrelated flows are equally plausible.
- Product intent cannot be determined from routes, tests, documentation, or existing UI.

### Scope escalation rules

Escalate from `quick` or `changed` to a route family or module when changes affect:

- A route definition
- A redirect
- A route guard
- A navigation registry
- A shared Link or Button abstraction
- A shared form submission abstraction
- A stepper or workflow controller
- A route parameter or query parser
- A fallback component
- A feature or capability resolver
- A permission resolver
- A return-path utility
- Breadcrumb generation
- Search-result destinations
- Notification destinations
- Command Palette destinations

Escalate to `platform` when changes affect:

- The authenticated shell
- Authentication state
- Session-expiration behavior
- Workspace switching
- Account switching
- Global permissions
- Capability profiles
- Global Search
- Command Palette
- Primary platform navigation
- Shared authenticated fallback routes

Escalate to `public` when changes affect:

- Public routing
- Public header or footer navigation
- Public calls to action
- Sign In or Sign Up entry points
- Pricing conversion paths
- Contact or lead forms
- Public 404 handling
- Public sitemap or canonical-route behavior

Escalate to `full` or `release` when changes affect:

- Router initialization
- Base paths
- deployment paths
- application entry points
- shared route metadata
- global error boundaries
- authentication and public routing together
- application-wide navigation
- route generation
- build or hosting rewrites
- a release candidate

Do not escalate for purely visual changes unless they alter:

- Interaction
- Focus
- visibility
- responsive navigation
- control semantics
- target size
- element ordering
- disabled states
- reachable content

At the start of execution, state:

`STITCH scope: <resolved scope>`

Also state:

`STITCH mode: audit-and-repair` or `STITCH mode: audit-only`

## Operating principles

1. Inspect the actual repository before deciding how the application works.
2. Follow project-level CLAUDE.md, documentation, architecture, product, security, and legal instructions.
3. Preserve unrelated uncommitted work.
4. Do not use destructive Git commands.
5. Do not reset or rewrite unrelated files.
6. Do not create a second router, navigation registry, permission system, feature system, or test framework.
7. Reuse the existing route, service, fixture, form, state, and test architecture.
8. Test behavior visible to users rather than component implementation details.
9. Prefer the smallest coherent fix over a broad rewrite.
10. Fix the application rather than weakening tests.
11. Do not skip a failing test solely to make STITCH pass.
12. Do not introduce fake backend success.
13. Do not invent missing product behavior.
14. When intent is genuinely ambiguous, stop before choosing a destination and ask one focused question.
15. Treat frontend feature flags as availability controls, never authorization.
16. Treat hidden navigation as presentation, never authorization.
17. Revalidate access at every deep-linked destination.
18. Preserve accessibility through every route transition and fallback.

## Phase S — Scope and map the affected surface

### Preflight

Before editing:

1. Confirm the working directory.
2. Read Git status.
3. Identify unrelated changes.
4. Inspect package scripts.
5. Identify the framework and router.
6. Identify the existing browser-testing framework.
7. Identify the component-testing framework.
8. Identify accessibility tooling.
9. Identify how the application starts.
10. Identify route metadata and route guards.
11. Identify feature, plan, permission, Workspace, and Team resolvers.
12. Identify application-level, public, and authenticated error boundaries.
13. Identify documentation describing intended user journeys.
14. Identify backend versus mock service mode.
15. Confirm whether the task permits source modification.

### Build an in-memory flow graph

Create a working graph of relevant nodes and edges.

Potential nodes include:

- Routes
- Route aliases
- Redirects
- Pages
- Tabs
- Steps
- Forms
- Dialogs
- Drawers
- Confirmation screens
- Empty states
- Error states
- Restricted states
- Unavailable-feature states
- Session-expired states
- Not Found pages
- External destinations

Potential edges include:

- Navigation links
- Buttons
- Form submissions
- Back actions
- Cancel actions
- Close actions
- Breadcrumbs
- Tab changes
- Stepper transitions
- Search results
- Command Palette commands
- Notification links
- Dashboard cards
- Empty-state actions
- Error recovery actions
- Redirects
- Login return paths
- Sign-out paths
- Workspace-switch paths
- Pagination
- Filters encoded in URLs
- External links

For every relevant interactive control, identify:

- Source location
- Accessible label
- Action type
- Expected destination or result
- Actual destination or result
- Required parameters
- Query parameters
- Required state
- Authentication requirement
- Permission requirement
- Feature requirement
- Workspace or Team scope
- Failure behavior
- Recovery destination
- Existing automated coverage

### Detect orphans and dead ends

Identify:

- Registered routes with no valid entry path
- Navigation entries with no valid route
- Buttons with no handler
- Links with invalid destinations
- Placeholder links
- `href="#"` behavior
- `javascript:` links
- Empty click handlers
- Disabled controls without explanation
- Actions that fail silently
- Screens with no safe next action
- Terminal screens with no return path
- Routes with no parent fallback
- Redirect loops
- Competing canonical routes
- Broken aliases
- Search results with stale destinations
- Notifications with stale destinations
- Command Palette items with stale destinations
- Dashboard cards with stale destinations
- Breadcrumbs pointing outside permitted scope

## Phase T — Trace intended user journeys

For each in-scope journey, trace these dimensions.

### Happy path

Verify the primary intended route from entry to completion.

### Alternate paths

Verify supported alternatives such as:

- Start from Dashboard
- Start from list page
- Start from Search
- Start from Notification
- Start from a direct deep link
- Resume an incomplete workflow
- Skip an optional stage
- Change a prior step
- Cancel
- Go Back
- Return to parent

### State paths

Verify relevant states:

- Loading
- Empty
- Populated
- Partial data
- Validation error
- Network error
- Full error
- Restricted
- Unavailable feature
- Unavailable backend
- Invalid ID
- Stale reference
- Archived record
- Expired session
- Signed-out access
- Workspace switched
- Account switched

### Navigation paths

Verify:

- Direct URL load
- Browser refresh
- Browser Back
- Browser Forward
- In-app Back
- Cancel
- Close
- Breadcrumb
- Parent navigation
- Validated `returnTo`
- Sign In then return
- Sign Out then safe destination
- Session expiration then safe destination

### Device and input paths

Where relevant, verify:

- Keyboard only
- Screen-reader semantics
- Pointer
- Touch
- Narrow mobile viewport
- Tablet viewport
- Desktop viewport
- 200% browser zoom
- Reduced motion
- Virtual keyboard interaction

### Role and scope paths

Where relevant, verify:

- Signed-out visitor
- Signed-in user
- Recipient
- Sender
- Workspace administrator
- Team-scoped member
- Read-only member
- User without permission
- User without feature availability
- User in another Workspace
- User in another account

Do not expose inaccessible information while testing restricted scenarios.

## Phase I — Inspect every connection

### Navigation semantics

Verify that:

- Links are used for navigation.
- Buttons are used for actions.
- Form submissions use the application's authoritative form mechanism.
- Nested interactive elements are absent.
- Controls have accessible names.
- Icon-only controls have meaningful labels.
- Disabled controls provide an understandable reason when necessary.
- New-tab behavior is explicit.
- External links are distinguishable where appropriate.
- Focusable elements are not hidden.
- Duplicate desktop and mobile controls are not simultaneously focusable.

Do not replace valid semantic controls with generic clickable containers.

### Destination integrity

For every in-scope navigation edge, confirm:

- The target route exists.
- The correct canonical route is used.
- Required route parameters are present.
- Parameters use stable IDs rather than private display values.
- Dynamic values are encoded safely.
- Query parameters are supported.
- Unsupported query values are ignored or handled safely.
- Hash targets exist where used.
- The destination can render after direct refresh.
- The destination has a usable title and H1.
- The destination does not expose another Workspace, Team, User, or record.
- The destination does not flash restricted content before its guard resolves.

### Return-path safety

Verify:

- `returnTo`, `redirect`, `next`, and similar values are validated.
- External open redirects are impossible.
- Invalid return paths use a safe internal fallback.
- Cancel returns to the correct parent or prior safe page.
- Back does not return users to a destructive or invalid state.
- Sign In return paths preserve only safe destinations.
- Sign Out does not preserve private screens.
- Session-expired recovery returns only after successful reauthentication.
- Workspace switching does not preserve another Workspace's route state.

### Form and workflow integrity

Verify:

- Every step has an intentional Next or Continue action.
- Required data is validated before advancing.
- Optional stages are identifiable.
- Back preserves appropriate non-sensitive state.
- Cancel consequences are explained.
- Submitting twice does not produce contradictory frontend state.
- Loading prevents accidental duplicate action.
- Validation errors focus or identify the correct field.
- Step indicators match the actual workflow.
- Deep links into later steps are validated.
- Users cannot bypass required steps through URLs.
- Users are not trapped in a step.
- Completion has an appropriate next destination.
- Failed submissions retain safe user-entered state where appropriate.
- Backend-required actions never become fake successes.

### Control integrity

Search for and validate:

- Links
- Buttons
- Menu items
- Dropdown actions
- Tabs
- Stepper controls
- Cards with click behavior
- Table-row actions
- Mobile card actions
- Floating actions
- Dialog actions
- Toast actions
- Empty-state actions
- Error-state actions
- Pagination controls
- Breadcrumbs
- Logo links
- Footer links
- Header calls to action

Check for:

- Wrong routes
- Wrong parameter order
- Old route aliases
- Missing leading slash
- Incorrect base path
- malformed query strings
- duplicate actions
- handlers that run but do not navigate
- navigation before required state is committed
- action labels that do not match results
- destructive action without confirmation
- controls obscured on small screens

### External links

For external URLs:

- Validate protocol.
- Reject unsafe or malformed schemes.
- Verify appropriate `rel` behavior for new tabs.
- Do not send private route state or tokens.
- If network access is available, validate links conservatively.
- Use a rate-limited request strategy.
- Treat 403, 405, and 429 responses as inconclusive rather than automatically broken.
- Use GET fallback only where appropriate.
- Mark unverifiable external destinations as unverified.
- Never expose credentials while checking links.

## Phase T — Test runtime behavior and fallbacks

### Use the existing test stack

Inspect before choosing tools.

Preferred hierarchy:

1. Existing browser end-to-end framework
2. Existing component or integration framework
3. Existing accessibility framework
4. Existing route or contract tests
5. Lightweight internal scripts where appropriate

Do not add a second end-to-end framework.

When Playwright already exists:

- Use user-facing locators such as role, label, text, and explicit test contracts.
- Use built-in auto-waiting.
- Do not use arbitrary sleep calls.
- Keep tests isolated.
- Use deterministic fixtures.
- Record traces, screenshots, or videos on failure according to existing project policy.
- Use supported browser projects for full or release scope.
- Capture browser console errors and unhandled page exceptions.
- Check failed application requests relevant to the flow.

When Cypress, WebdriverIO, or another browser framework already exists:

- Follow its established conventions.
- Do not introduce Playwright in parallel merely because STITCH prefers browser testing.

When no browser framework exists:

- For `quick`, `changed`, `route`, or `flow`, use existing runtime, route, component, and manual browser tooling.
- Document the browser-coverage gap honestly.
- For `full` or `release`, add Playwright only when project dependency rules permit and the repository clearly needs durable browser-flow coverage.
- Otherwise report browser automation as a release blocker with an exact recommended setup.
- Never add dependencies silently when project instructions require approval.

### Test user-visible behavior

Tests should interact with the application as a user would.

Prefer:

- Accessible roles
- Labels
- Visible text
- Stable explicit test IDs only when semantic selectors are insufficient
- URL assertions
- Visible status assertions
- Focus assertions
- Route-title assertions
- Permission-safe content assertions

Avoid relying primarily on:

- CSS classes
- DOM structure
- component state
- private methods
- arbitrary timeouts
- implementation-specific selectors
- snapshot-only proof

### Runtime checks

For the in-scope application, check:

- No uncaught JavaScript exceptions
- No unhandled promise rejections
- No unexpected console errors
- No internal navigation to missing routes
- No failed route chunks
- No redirect loops
- No blank pages
- No hydration failure where applicable
- No inaccessible loading lock
- No stale-page content after account or Workspace change
- No broken browser Back or Forward behavior
- No duplicated shell
- No duplicated page heading
- No full-page horizontal overflow
- No primary action hidden by sticky UI
- No focus loss after navigation

### Deep-link checks

For every important in-scope destination:

1. Navigate through the UI.
2. Confirm the expected URL.
3. Refresh the browser.
4. Confirm the route still renders safely.
5. Open the route directly in a clean browser context.
6. Test signed-out access.
7. Test restricted access where relevant.
8. Test invalid IDs.
9. Test invalid query values.
10. Confirm the nearest valid fallback.

### Fallback matrix

Every relevant route family must have deliberate behavior for:

- Unknown public route
- Unknown authenticated route
- Route rendering error
- Data loading error
- Invalid dynamic ID
- Restricted record
- Missing permission
- Disabled capability
- Unavailable backend
- Expired session
- Removed or archived record
- Stale deep link
- Empty result
- Partial service failure
- Full service failure

Check that each fallback:

- Uses the correct shell.
- Has one H1.
- Explains the problem without exposing private information.
- Provides a safe next action.
- Provides a safe fallback URL.
- Avoids redirect loops.
- Does not reveal hidden resource names.
- Does not imply deletion when a record is merely unavailable.
- Does not promote unrelated advanced features.
- Does not claim backend success.
- Returns focus to meaningful content.

### Router-native fallbacks

Use the detected router's established mechanisms.

Examples may include:

- Route-level error boundaries
- Application-level error boundaries
- Not Found wildcard routes
- Loader or action error responses
- Framework-native redirect handling
- Nested route fallbacks
- Suspense or hydration fallbacks

Do not implement a competing fallback architecture.

## Accessibility stitching

Automated accessibility scans are supplemental, not sufficient.

Where tooling already exists, run the established accessibility checks.

Also inspect manually:

- One meaningful H1 per destination
- Logical heading hierarchy
- Main landmark
- Navigation landmarks
- Current-page indication
- Focus order
- Visible focus
- Focus not obscured by sticky elements
- Focus destination after SPA route changes
- Dialog focus containment
- Drawer focus containment
- Focus restoration
- No keyboard traps
- Meaningful control labels
- Link versus button semantics
- Status and error announcements
- Form-error association
- Consistent navigation ordering
- Consistent identification of repeated controls
- Multi-step progress indication
- Touch-target usability
- Reduced-motion behavior
- 200% zoom behavior

After a route transition, use the project's established strategy to make the new page understandable to assistive-technology users. Do not move focus indiscriminately if the application deliberately preserves navigation focus; verify that the chosen behavior is consistent and understandable.

## Phase C — Correct defects and add regression coverage

Unless running in audit-only mode:

1. Fix P0 and P1 defects first.
2. Fix P2 defects within scope where safe.
3. Avoid unrelated P3 redesign.
4. Update centralized route or action definitions rather than adding local patches.
5. Remove obsolete aliases only after checking inbound references.
6. Preserve safe redirects for legitimate legacy routes.
7. Add missing fallbacks using existing architecture.
8. Add or update regression tests.
9. Re-run the smallest meaningful test set.
10. Re-run broader tests when shared infrastructure changed.
11. Run type checking and linting where available.
12. Run the production build for module, platform, full, or release scopes.
13. Re-test the repaired user journey in the running application.

### Defect severity

Use these priorities:

- **P0 — Security or data-boundary failure**
  - Cross-Workspace exposure
  - Cross-account exposure
  - permission bypass
  - unsafe redirect
  - private data in URL
  - disabled capability bypass
- **P1 — Broken primary user journey**
  - Dead end
  - missing destination
  - redirect loop
  - wrong consequential action
  - unsafely skipped required step
  - inaccessible core action
- **P2 — Broken recovery or important alternate path**
  - Missing fallback
  - broken Back or Cancel
  - stale deep link
  - confusing restricted state
  - keyboard or mobile issue
- **P3 — Minor inconsistency**
  - Label mismatch
  - secondary-route inconsistency
  - low-impact polish issue

Do not classify an issue as low severity merely because a workaround exists.

### Fix constraints

Do not:

- Invent new product features
- Add unapproved routes
- Rewrite the whole router
- Replace the current test framework
- weaken authorization
- bypass a feature gate
- convert a link into an action or an action into a link incorrectly
- add fake success state
- hardcode dynamic IDs
- use hidden navigation as authorization
- skip tests without explanation
- suppress browser errors without addressing the cause
- catch every error and silently redirect
- redirect all failures to Dashboard
- remove valid deep links merely to avoid fixing them

## Phase H — Handoff

At completion, report:

### 1. STITCH Status

Use exactly one:

- `STITCHED`
- `PARTIALLY STITCHED`
- `AUDIT ONLY`
- `BLOCKED`

Definitions:

- **STITCHED**
  - All in-scope P0 and P1 defects are resolved.
  - Required regression tests pass.
  - Relevant fallbacks are present.
- **PARTIALLY STITCHED**
  - The flow improved, but one or more issues remain.
- **AUDIT ONLY**
  - No source modification was requested or permitted.
- **BLOCKED**
  - Verification or repair requires missing product intent, backend behavior, environment access, credentials, or tooling.

### 2. Resolved Scope

State:

- Invocation arguments
- Inferred scope
- Why scope was expanded or kept narrow
- Routes and journeys examined

### 3. Flow Map

Summarize:

- Entry points
- Main path
- Alternate paths
- Terminal states
- Recovery paths

### 4. Broken Connections Found

For every issue:

- Severity
- Source
- Control or transition
- Expected behavior
- Actual behavior
- User impact
- Resolution

### 5. Fallback Coverage

Report coverage for:

- Not Found
- restricted
- unavailable feature
- backend unavailable
- expired session
- invalid ID
- stale reference
- partial error
- full error
- empty state

### 6. Repairs Made

List:

- Files changed
- routes corrected
- actions corrected
- guards corrected
- fallbacks added
- accessibility repairs
- responsive repairs

### 7. Tests Added or Updated

List:

- Unit tests
- integration tests
- route tests
- browser tests
- accessibility checks
- regression scenarios

### 8. Validation Performed

Report actual results for:

- Type checking
- Linting
- targeted tests
- browser tests
- production build
- console errors
- unhandled promise rejections
- responsive verification
- keyboard verification
- cross-browser verification where run

Do not claim a check was performed when it was not.

### 9. Remaining Risks

State:

- Untested routes
- external links that could not be verified
- backend-dependent behavior
- ambiguous product intent
- missing test infrastructure
- release blockers

### 10. Recommended Next STITCH Scope

Recommend only the smallest next scope that materially improves confidence.

## Durable reports

Do not create a permanent document for every quick invocation.

Create or update a durable STITCH report only when:

- `report` was requested
- scope is `full`
- scope is `release`
- a significant P0 or P1 issue was found
- project documentation requires it

Use the existing documentation conventions.

A suitable path, when no stronger convention exists, is:

`docs/stitch/latest.md`

For release audits, a dated or release-specific report may be used if the repository already follows that convention.

Do not store private user data, credentials, tokens, or sensitive fixture content in STITCH reports.

## Completion requirements

STITCH is complete only when:

1. Scope was resolved explicitly.
2. Git status was inspected.
3. Relevant routes and controls were mapped.
4. Primary in-scope journeys were traced.
5. Inbound and outbound connections were inspected.
6. Buttons, links, forms, and redirects were verified.
7. Route parameters and query values were validated.
8. Back, Cancel, Close, and return paths were checked.
9. Direct-load and refresh behavior were checked.
10. Authentication and permission behavior were checked where relevant.
11. Feature and capability gating were checked where relevant.
12. Workspace and Team scope were checked where relevant.
13. Relevant fallback states were checked.
14. Focus and keyboard behavior were checked.
15. Mobile behavior was checked where relevant.
16. Runtime errors were checked where tooling permits.
17. Broken connections were repaired unless audit-only.
18. Regression coverage was added for repaired P0 and P1 issues.
19. Relevant tests were run.
20. Results and limitations were reported honestly.
