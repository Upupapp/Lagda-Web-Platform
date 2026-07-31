# LAGDA Frontend Testing Strategy

Gap Closure Command 6. Frontend demonstration only.

**Status: implemented.** Earlier revisions of this document described a *proposed*
toolchain (Vitest + happy-dom + vitest-axe) that was never installed. That
proposal is superseded — this document now records what is actually configured and
running. Where the implementation diverges from the old proposal, the reason is
stated.

One tool per quality layer. No layer has two.

---

## 1. The toolchain

| Layer | Tool | Config |
| --- | --- | --- |
| Type checking | TypeScript 5.6.3 | `tsconfig.json` → `.app` / `.node` / `.test` |
| Linting | ESLint 9 flat + typescript-eslint 8 | `eslint.config.js` |
| Unit + component | Vitest 3 (**jsdom**) | `vitest.config.ts` |
| DOM interaction | Testing Library `react` / `user-event` / `jest-dom` | `src/test/setup.ts` |
| Browser flows | Playwright 1.49 | `playwright.config.ts` |
| Accessibility | **`@axe-core/playwright`** | `tests/accessibility/` |
| Coverage | `@vitest/coverage-v8` | `vitest.config.ts` |
| CI | GitHub Actions | `.github/workflows/quality.yml` |

**Divergences from the earlier proposal, with reasons:**

- **jsdom, not happy-dom.** These screens rely on focus management, dialogs and
  `matchMedia`; jsdom's implementations are the closer match.
- **`@axe-core/playwright`, not `vitest-axe`.** Accessibility violations that
  matter here — focus order, contrast, reflow, landmark structure — need a real
  browser with real layout. Scanning a jsdom tree finds a fraction of them.
- **A separate `vitest.config.ts`, not a `test` block inside `vite.config.ts`.** It
  merges the Vite config so plugins and the `@` alias are shared, while keeping
  build and test concerns readable.

## 2. TypeScript architecture

Three projects behind a solution-style root, because they run in genuinely
different environments:

- **`tsconfig.app.json`** — browser source (`src/`). `types: ["vite/client"]` only.
  Node types are deliberately absent so browser code cannot reach for `process`
  or `__dirname`.
- **`tsconfig.node.json`** — `vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `eslint.config.js`. `types: ["node"]`.
- **`tsconfig.test.json`** — Vitest tests, shared utilities, Playwright specs. The
  only project with `vitest/globals`, so **production source cannot see
  `describe`, `it`, or `expect`** — a test helper imported into the app fails the
  type-check.

`paths: { "@/*": ["./src/*"] }` mirrors the single alias in `vite.config.ts`. The
two must stay in sync.

### Strictness

`strict: true` plus:

| Flag | Why |
| --- | --- |
| `noUncheckedIndexedAccess` | Highest-value flag here — found 111 unguarded array/record index reads across 35 files, each a latent `undefined`. |
| `noImplicitOverride` | Explicit override intent. |
| `noFallthroughCasesInSwitch` | This codebase switches over status unions constantly. |
| `forceConsistentCasingInFileNames` | The repo path appears as both `Lagda` and `LAGDA` on this case-insensitive filesystem; CI's is case-sensitive. |
| `useUnknownInCatchVariables` | No untyped `catch (e)`. |

`noUnusedLocals` / `noUnusedParameters` are **off in tsconfig, enforced by ESLint
instead**, so an unused import mid-edit does not break the type-check.
`exactOptionalPropertyTypes` is off — largely incompatible with React's optional-
prop idiom, and it produces churn without finding defects.

**Result: 0 errors**, from 317 under the same configuration. **No `any`, no
`as any`, no `@ts-ignore`, no `@ts-nocheck` was added anywhere.**

## 3. ESLint

Scope is correctness, security, accessibility and test reliability. Formatting is
deliberately not enforced — the repository has a consistent hand-maintained style
no formatter produced, and adding one would rewrite 466 files to catch nothing.

Rules that carry weight here:

| Rule | Why |
| --- | --- |
| `react-hooks/rules-of-hooks` | Found 6 conditional `useCallback` calls in `PrepareLayout.tsx` — real bugs. |
| `react-hooks/exhaustive-deps` | Stale-closure defence in a codebase full of `useCallback` service calls. |
| `@typescript-eslint/no-floating-promises` | Every service is async. Found 124 dropped promises. |
| `@typescript-eslint/no-misused-promises` | Async handlers in a void slot. |
| `no-alert` | Browser dialogs cannot be styled, focus-trapped or made accessible. Found 5 survivors after C37. |
| `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url` | Hard product constraints, now mechanically enforced. |
| `no-restricted-syntax` → `dangerouslySetInnerHTML` | Forbidden by the feature commands; recipient names, comment bodies and pasted values are user-controlled. |
| `no-restricted-syntax` → `localStorage`/`sessionStorage` | Private provider data must never be persisted. |
| `no-console` (allows `warn`/`error`) | `logger.ts` is the approved path and redacts. |
| `testing-library/await-async-queries` | The main source of flaky Testing Library assertions. |
| `playwright/missing-playwright-await` | A forgotten `await` makes an assertion pass unconditionally. |

**`no-duplicate-imports` is deliberately off.** It counts `import type { T }` and
`import { v }` from the same module as duplicates, but that split is idiomatic
TypeScript. It flagged 155 correct imports and zero defects.

**`react-refresh/only-export-components` is a warning, not an error.** Nearly every
page file co-locates constants with its component; making it blocking would force
a large mechanical refactor with no correctness benefit.

## 4. Layout and naming

```
src/test/                       shared utilities (not tests)
  setup.ts                      global setup — network blocking, resets, matchers
  reset-services.ts             resetAllTestServices()
  fixtures.ts                   deterministic fictional builders
  render.tsx                    renderWithAppProviders, renderWithRouter

src/app/**/__tests__/*.test.ts  unit and component tests, beside what they test

tests/
  support/app.ts                Playwright helpers
  e2e/                          critical browser flows
  accessibility/                axe scans
  responsive/                   viewport + enlarged-layout
  reduced-motion/               prefers-reduced-motion
```

`*.test.ts(x)` for Vitest, `*.spec.ts` for Playwright. They never overlap:
`vitest.config.ts` excludes `tests/`, `playwright.config.ts` only reads it.

## 5. Test data rules

All fictional. Email domains are `example.test` / `example.invalid`, reserved by
RFC 2606 and RFC 6761 so they can never resolve to a real host.

Never used: real customer names, recipient emails, document contents, signatures,
Contact Groups, organization details, access links, API keys, tokens, or Policy
configurations.

Timestamps are fixed ISO strings with explicit offsets (`src/test/fixtures.ts`).
Timezone is pinned to `Asia/Manila` and locale to `en-PH` in both Vitest and
Playwright, because LAGDA formats dates that way and an unpinned test passes
locally then fails in CI.

## 6. Determinism

`src/test/setup.ts` enforces:

- **No network, ever.** `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and
  `navigator.sendBeacon` all throw. A test can never pass against a real service,
  and CI can never depend on one being up. This supersedes the old "offline tests"
  section — network absence is now the default, not a scenario.
- **`Notification` is undefined**, so nothing can request browser push.
- **All mock services reset after every test** via `resetAllTestServices()`. Every
  mock service holds module-level mutable state; without this, suites pass or fail
  by order.
- **`localStorage` and `sessionStorage` are cleared** after every test.

No `sleep`, no arbitrary timeouts. Tests wait on state (`waitFor`, `findBy`,
`toHaveCount`).

**Launch-profile caveat.** `ACTIVE_LAUNCH_PROFILE` resolves once at module import.
A test needing a different profile must `vi.stubEnv("VITE_LAUNCH_PROFILE", …)`,
then `vi.resetModules()`, then `await import(...)`. Setting the env var alone does
nothing — this is the single most common way to write a profile test that passes
for the wrong reason.

## 7. What is covered

**417 unit and component tests across 7 suites, all passing.**

| Suite | Gap | Covers |
| --- | --- | --- |
| `contact-recipient-source.test.ts` | 1 | Eligibility (active / archived / restricted / missing-email / invalid-email), Contact Group expansion into individual rows, **de-duplication by Contact ID not email** (two distinct Contacts sharing an address both survive, flagged `ambiguous-shared-email`), payload built with the canonical `Name`/`Email`/`Organization` headers, index alignment |
| `bulk-send-defaults.test.ts` | 3 | Field definitions, draft validation, change preview incl. the null-defaults guard, override counting, the enum-outside-the-union case, `updateRequestDefaults` setting `source: "user"`, `restoreRequestDefaults` recomputing rather than blanking, read-only refusal |
| `preparation-resolution.test.ts` | 4 | Availability gating, **resolution input carries no PII**, input-version staleness, Automation unavailable in `launch-default` |
| `preparation-platform-projection.test.ts` | 5 | Workspace tenancy, **status is a pure mapping of the service's own status**, **no recipient value reaches any surface**, hostile-ID route fallback, aggregate consistency, empty projection out of profile, exact field-shape lock |
| `platform-providers.test.ts` | 5 | Registration is deterministic and does not require visiting a page; no destination or label carries an email; notifications never claim a send; export columns carry no recipient column |
| `privacy-and-cleanup.test.ts` | cross-cutting | Capability ≠ permission, workspace isolation, workspace/account/session cleanup, **no `localStorage`/`sessionStorage` writes**, no recipient data in any URL |
| `capability-resolver.test.ts` | cross-cutting | Full resolution precedence order, profile-only `isCapabilityInActiveProfile`, eNotary future-product in every profile, Workflow Automation and Bulk Send enterprise-preview gating, unknown-capability safety |

Browser specs: `tests/e2e/critical-flows.spec.ts`,
`tests/accessibility/platform-a11y.spec.ts`, `tests/responsive/layout.spec.ts`,
`tests/responsive/zoom-200.spec.ts`, `tests/reduced-motion/motion.spec.ts`.

## 8. Coverage policy

v8 provider over `src/app/**`. Excluded with reasons: `models/**` (type unions and
label maps, no branches), `data/**` (static fixtures), `imports/**`
(Figma-generated), `components/ui/**` (vendored shadcn), `pages/dev/**`
(development-only), `src/test/**`.

**No difficult production module is excluded to inflate the number.**

Repository-wide thresholds are a **ratchet at the measured baseline**, not an
aspiration — they exist to stop regression and should be raised as coverage grows.
Setting them high today would force exactly the superficial render-only tests this
work forbids.

Per-module thresholds are set high on the pure logic this command is about:
`preparation-platform-projection.ts` 90%, `contact-recipient-source.ts` 85%,
`capability-resolver.ts` 85%, `bulk-send-defaults.ts` 70%.

## 9. Production defects found by turning the checks on

Full list in `docs/quality-infrastructure-audit.md` §8. The most consequential:

1. **Template field placement produced `NaN` rectangles** — `clampRect()` read
   `minW/minH/maxW/maxH` where the records are keyed `minWidth/minHeight/…`, so
   every field a user drew snapped to the top-left at default size, and the NaN
   rect was persisted.
2. **`PageHeader` silently dropped action buttons** on three pages — they passed
   `actions=`, the component renders `primaryAction`/`secondaryActions`.
3. **21 breadcrumb items were dead text**, passing `href` where the type declares `to`.
4. **Six conditional React hooks** in `PrepareLayout.tsx`.
5. **`SearchDialog` icon map missing 14 of 18 result types** — a latent crash of
   the whole result list.
6. **A template's highest-trust signer silently degraded to the weakest
   authentication**, because the fixture used auth IDs outside the union
   (`"authenticator"`, 20 × `"email-code"`, 6 × `"invitation-access"`) and the
   resolver falls back to the first entry, `"none"`.

## 10. Commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | All three TS projects |
| `npm run lint` / `lint:fix` | ESLint, non-mutating / with safe fixes |
| `npm test` / `test:watch` / `test:coverage` | Vitest |
| `npm run test:e2e` | Playwright critical flows (Chromium) |
| `npm run test:a11y` | axe accessibility project |
| `npm run test:responsive` | mobile-320 / mobile-390 / tablet / zoom-200 |
| `npm run test:reduced-motion` | reduced-motion project |
| `npm run check` | typecheck + lint + test + build |
| `npm run ci` | typecheck + lint + coverage + build |

All cross-platform. No Windows path is embedded in any script.

## 11. Browser matrix

Deliberately narrow, to keep CI usable:

- **Chromium desktop (1440×900)** — full critical-flow suite
- **Chromium + axe** — accessibility, on loaded states
- **320 / 390 / tablet-portrait** — responsive
- **720×450 @2× ** — enlarged layout, approximating 200% zoom reflow
- **Chromium, `prefers-reduced-motion: reduce`** — reduced motion

Firefox and WebKit are **not** run — downloading them per commit triples install
cost for little added signal on a React SPA. Recorded as a limitation.

Browser tests run against the **production build** via `vite preview`, not the dev
server, so they exercise the shipped bundle, real capability gating and real lazy
route splitting.

## 12. Failure artifacts

On failure Playwright retains a trace, a screenshot and the HTML report; CI
uploads them with 7-day retention. They render **fictional fixture data only** —
this application contains no real recipient, document, credential or token to
capture. `coverage/`, `playwright-report/` and `test-results/` are gitignored.

## 13. Honest limitations

- **No screen-reader testing.** axe is automated scanning; it does not replace
  NVDA / JAWS / VoiceOver review. See `docs/manual-quality-validation-checklist.md`.
- **200% zoom is approximated, not real.** Playwright cannot set browser zoom. The
  `zoom-200` project uses a half-width viewport at 2× scale, which exercises WCAG
  1.4.10 reflow but is not the same thing. Manual review remains required.
- **No real device testing.** Viewport emulation is not a physical phone;
  virtual-keyboard behaviour cannot be simulated.
- **No cross-browser coverage** beyond Chromium.
- **Nothing here tests a backend, because there is none.** Every service is an
  in-memory mock. These are frontend fixture tests and must not be represented as
  production integration tests. The production test requirements that remain
  outstanding are listed in `docs/backend-integration-handoff.md`.
