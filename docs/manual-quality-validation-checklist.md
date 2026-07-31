# Manual quality validation checklist

Gap Closure Command 6. Frontend demonstration only.

Automated tests do not replace all review. This checklist covers what the
automated suites structurally cannot reach.

**Marking rule: only tick an item that was actually performed.** An unticked box
is not a failure — it is an honest statement that nobody has looked yet.

Legend: `[x]` verified in this command · `[ ]` not yet performed

---

## 1. Validated during Gap Closure Command 6 (2026-08-01)

These were actually run and their results are recorded elsewhere in this document
set.

- [x] **Type-check** — `npm run typecheck`, 0 errors across three TS projects.
- [x] **Unit and component tests** — `npx vitest run`, 419 passing / 7 suites.
- [x] **Coverage** — `npx vitest run --coverage`, thresholds met.
- [x] **Production build, both launch profiles** — `launch-default` and
      `enterprise-preview` both succeed.
- [x] **Browser critical flows** — Playwright `chromium-desktop`, 24 passing.
- [x] **Automated accessibility (axe)** — `accessibility` project, 18 passing.
      Zero serious or critical WCAG 2.1 A/AA violations on the six scanned routes.
- [x] **Responsive viewports** — 320 / 390 / tablet-portrait, 60 passing.
- [x] **Enlarged layout (approximate 200% zoom)** — `zoom-200` project, included
      in the 60 above.
- [x] **Reduced motion** — `reduced-motion` project, 7 passing.
- [x] **Browser console inspection** — the critical-flow suite fails on any
      console error or unhandled rejection; it passes.
- [x] **Network inspection** — `src/test/setup.ts` throws on `fetch`,
      `XMLHttpRequest`, `WebSocket`, `EventSource` and `navigator.sendBeacon`;
      419 tests pass with those in place, proving no application code makes a
      network call.
- [x] **No real email, SMS or browser push** — `Notification` is stubbed
      undefined in the test environment and no send path exists in source.
- [x] **Git status reviewed** before and after.

## 2. NOT yet performed — required before release

- [ ] **Screen-reader spot checks.** axe is automated scanning only. Needed on at
      least: Dashboard, Documents list, Bulk Send recipient table, the inline row
      editor, the Defaults editor, Global Search, and the Command Palette.
      Suggested: NVDA + Firefox, VoiceOver + Safari.
- [ ] **Real 200% browser zoom.** The `zoom-200` Playwright project approximates
      reflow with a half-width viewport at 2× scale. Playwright cannot set browser
      zoom. A human must press Ctrl/Cmd-`+` to 200% and confirm content remains
      reachable, focus stays visible, labels are not clipped, and dialogs remain
      usable.
- [ ] **Real device testing.** Viewport emulation is not a phone. Needed for
      virtual-keyboard behaviour in particular — the recipient row editor and the
      Contact picker both put an input near the bottom of a narrow screen.
- [ ] **Cross-browser.** Only Chromium runs. Firefox and WebKit unverified.
- [ ] **Keyboard-only walkthrough of the full preparation journey** end to end.
      Individual keyboard interactions are covered; the whole journey in one pass
      is not.
- [ ] **Long-name and long-email layout review.** Fixtures use realistic but
      moderate lengths.
- [ ] **Legal and compliance copy review.** Still pending from earlier commands.
- [ ] **Brand consistency pass** against `docs/lagda-brand-*`.

## 3. Per-release checklist

Run before any deploy.

### Build and gates
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors *(see §5: currently failing)*
- [ ] `npm test` — all passing
- [ ] `npm run test:coverage` — thresholds met
- [ ] `npm run build` with `VITE_LAUNCH_PROFILE=launch-default`
- [ ] `npm run build` with `VITE_LAUNCH_PROFILE=enterprise-preview`
- [ ] `npm run test:e2e`, `test:a11y`, `test:responsive`, `test:reduced-motion`

### Capability gating
- [ ] In `launch-default`: Bulk Send, Collaboration and Workflow Automation are
      absent from navigation, Search, the Command Palette, the Dashboard and
      Reports.
- [ ] In `launch-default`: `/app/bulk-send`, `/app/automation` and
      `/app/reports/preparation` render the capability-unavailable state, not a
      crash or a blank page.
- [ ] eNotary remains "Coming Soon — Subject to Supreme Court Accreditation and
      applicable rules." and is never presented as active.
- [ ] Burgundy `#67023B` appears nowhere outside eNotary surfaces.

### Session and privacy
- [ ] Sign out, then confirm no previous-account content is visible.
- [ ] Switch workspace, then confirm no previous-workspace batch, contact, search
      result, notification or report row remains.
- [ ] Open DevTools → Application → Storage. Confirm `localStorage` and
      `sessionStorage` hold no recipient name, email, Contact, batch row, Policy
      input or token.
- [ ] Walk the address bar through the whole preparation journey and confirm no
      URL contains an email address or a recipient name.
- [ ] Open DevTools → Network. Confirm no request leaves the origin.

### Honest language
- [ ] No screen claims a document was sent, delivered, signed, notarized, or
      legally binding.
- [ ] No screen claims a notification, email or SMS was delivered.
- [ ] No screen claims a Policy was enforced or an Automation Rule executed.
- [ ] Demonstration notices are present on Reports, the Dashboard preparation
      card, and Bulk Send.

### States
- [ ] Loading, empty, partial-error and full-error states on Documents, Bulk Send,
      Reports, Notifications and the Dashboard.
- [ ] Invalid IDs: `/app/bulk-send/does-not-exist`,
      `/app/documents/does-not-exist`.
- [ ] Session expiry mid-journey returns to a safe state and does not report a
      false success.

### Brand
- [ ] Official LAGDA logos render at correct sizes and are not animated.
- [ ] No logo appears in test output, CI output, or any developer-facing surface.

## 4. Accessibility findings tracked, not fixed

The axe suite asserts zero **serious** and **critical** violations. Moderate and
minor findings are printed to the test output but do not fail the run, and the
suite includes a "tracked accessibility defects have not spread" test so the
existing set cannot grow silently.

Reviewing and clearing the moderate/minor set is outstanding work.

## 5. Known failing gate

**`npm run lint` currently reports 466 errors.** These are pre-existing defects in
code written before any linter existed — they were surfaced, not introduced, by
this command. The rules were deliberately left at `error` rather than downgraded,
so the debt stays visible.

Breakdown and remediation plan: `docs/frontend-known-limitations.md`.

Until it is cleared, the CI `quality` job will fail at the lint step. That is the
correct signal and should not be silenced by weakening the configuration.
