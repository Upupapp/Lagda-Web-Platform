# Quality infrastructure audit

Gap Closure Command 6 — §17 gap 1. Frontend demonstration only.

This is the audit that preceded the toolchain decision. It records what the
repository actually was before any quality tooling existed, so the choices below
can be judged against the real thing rather than against an assumed React
project.

---

## 1. What the repository actually is

| Dimension | Finding |
| --- | --- |
| Framework | React 18.3.1 |
| Build tool | Vite 6.3.5, `@vitejs/plugin-react` 4.7.0 (Babel transform, `compact: false`) |
| Router | `react-router` 7.13.0, `createBrowserRouter` |
| Package manager | **npm** — `package-lock.json` present and authoritative |
| Node | v24.15.0 local; CI pinned to 22 |
| Module system | ESM (`"type": "module"`) |
| Source composition | **127 `.ts` + 339 `.tsx` = 466 files. Zero `.js`/`.jsx`.** |
| Path aliases | One: `@` → `./src`, declared only in `vite.config.ts` |
| Environment | `import.meta.env` — used in exactly 2 places (`logger.ts`, `RecipientRoot.tsx`), plus `VITE_LAUNCH_PROFILE` |
| Styling | Inline styles + per-page `<style>` blocks. Tailwind 4 is installed and loaded but the platform screens do not use it |
| Hosting/CI | Netlify, manual CLI deploy. **No CI system of any kind** |

**A `pnpm-workspace.yaml` and a `pnpm.overrides` block exist but there is no
`pnpm-lock.yaml`.** These are inert leftovers from the Figma export. npm is the
real package manager and was preserved; no second lockfile was created.

The package is still named `@figma/my-make-file` — an export artifact. Renaming it
is a release-identity decision, not a quality one, and was left alone.

## 2. Existing quality state — the honest baseline

| Layer | State before this command |
| --- | --- |
| TypeScript config | **None.** No `tsconfig.json` anywhere. No `typescript` dependency. |
| Type checking | **Never run.** `npm run build` is `vite build`; esbuild strips types without checking them. `"check"` was an alias for `build`. |
| React types | **`@types/react` and `@types/react-dom` were not installed.** Every component prop was effectively unchecked. |
| ESLint | **None.** No config, no dependency. |
| Formatter | None. The codebase has a consistent hand-maintained style. |
| Unit tests | **Zero test files in `src/`.** |
| Component tests | None. |
| Browser tests | None. |
| Accessibility tests | None. |
| Coverage | None. |
| CI | **No `.github/workflows`, no GitLab CI, no Azure Pipelines.** |

Searching for `describe(`, `it(`, `expect(`, `render(`, `playwright`, `vitest`,
`jest`, `data-testid` across `src/` returned 33 files — every one a false positive
(`.test(` on a regex, `expect` in prose, `test` in an identifier). There was no
partial or abandoned test setup to salvage.

## 3. Testability barriers found

These shaped the shared test utilities:

- **Module-level mutable state in every mock service.** `bulk-send.service.ts`,
  `contacts.service.ts`, `notification-center.service.ts`, `global-search.service.ts`
  and six others hold `let` stores that survive across tests in the same file.
  Addressed by `src/test/reset-services.ts`, called from `afterEach`.
- **Launch profile read at module scope.** `ACTIVE_LAUNCH_PROFILE` is resolved once
  at import time from `import.meta.env.VITE_LAUNCH_PROFILE`, so a test cannot
  change profiles by setting an env var — it must `vi.resetModules()` and
  re-import. Documented in the testing strategy.
- **Wall-clock reads.** `refresh()` in the Bulk Send service stamps
  `updatedAtDemonstration` with `new Date()`. Tests must not assert on it.
- **Artificial latency.** Mock services `await delay(150–600)`. Tests wait on
  state, never on time.
- **Locale and timezone coupling.** Dates format as `en-PH` / Asia/Manila. Both
  are pinned in `vitest.config.ts` and `playwright.config.ts`.
- **No network dependencies.** Verified: no `fetch`, `XMLHttpRequest`, or
  WebSocket call exists in application source. `src/test/setup.ts` now makes any
  future one fail loudly.

## 4. Existing type errors — the real finding

Type-checking had never been run, so the error count was unknown. Measured with a
correct configuration for the first time:

| Stage | Errors |
| --- | --- |
| Ad-hoc config used in earlier commands (no `paths`, no `vite/client`, no React types) | 160 |
| Correct config, React types installed, `strict` + `noUncheckedIndexedAccess` | **317** |
| After remediation | **0** |

The jump from 160 to 317 is itself the finding: **the older number was an
undercount**, because without `@types/react` no component prop was checked and
without `paths`/`vite/client` 35 module resolutions failed in ways that masked
downstream errors.

Of the 317:

- **~40 were pure configuration** — the `@/*` alias and Figma PNG imports had no
  ambient declaration. Fixed by `paths` and `types: ["vite/client"]`, not by code
  changes.
- **111 came from `noUncheckedIndexedAccess`** across 35 files — unguarded array
  and record index access. Every one is a latent `undefined` at runtime.
- **~166 were genuine type defects**, several of them user-visible. See
  §9 of `docs/frontend-testing-strategy.md` and the defect list below.

## 5. Toolchain selected

One tool per layer. This is a React + Vite repository, so the Vite-native stack is
the correct fit — it reuses `vite.config.ts`'s plugins and `@` alias, meaning the
`figma:asset/` resolver behaves in tests exactly as it does in the build.

| Layer | Chosen | Version |
| --- | --- | --- |
| Type checking | TypeScript | 5.6.3 |
| Linting | ESLint, flat config | 9.17.0 + typescript-eslint 8.18.2 |
| Unit + component tests | Vitest | 3.2.4 |
| DOM testing | Testing Library (`react`, `user-event`, `jest-dom`) | 16.1.0 / 14.5.2 / 6.6.3 |
| Browser tests | Playwright | 1.49.1 |
| Accessibility | `@axe-core/playwright` | 4.10.1 |
| Coverage | `@vitest/coverage-v8` | 3.2.4 |
| CI | GitHub Actions | — |

### Rejected duplicates

| Rejected | Why |
| --- | --- |
| Jest | Would add a second transform pipeline that can disagree with the Vite build. Vitest reuses the real one. |
| Cypress | Playwright already covers browser, responsive, reduced-motion and accessibility from one config. |
| `.eslintrc` alongside flat config | ESLint 9 resolves flat config only; having both is the duplication this command forbids. |
| Prettier | The repository has a consistent hand-maintained style no formatter produced. Adding one would rewrite 466 files and catch zero defects. Formatting is explicitly out of ESLint's scope here. |
| `happy-dom` | jsdom's focus management, dialog and `matchMedia` implementations are the closer match for these screens. |
| Istanbul coverage | v8 coverage is native to Vitest and needs no instrumentation step. |

## 6. Migration risks accepted

- **`noUncheckedIndexedAccess` is the highest-churn flag.** It was enabled anyway,
  and all 111 resulting errors were fixed with real guards — not with `!`. The
  alternative, leaving it off, would have hidden every one of those latent
  `undefined` reads.
- **Type-aware linting is slow.** `@typescript-eslint/recommendedTypeChecked`
  requires a full program build per run (~1–2 minutes on 394 files). Accepted:
  `no-floating-promises` alone found 124 dropped promises, which no cheaper
  configuration can detect.
- **`react-refresh/only-export-components` is a warning, not an error.** Nearly
  every page file in this repository co-locates constants with its component. That
  is an established pattern here; making it blocking would mean 271 failures and a
  large mechanical refactor with no correctness benefit.

## 7. Quality-gate rollout

1. `typecheck` — must stay at zero. Enforced in CI.
2. `lint` — must stay at zero errors. Warnings are visible but non-blocking.
3. `test` — unit and component suites must pass.
4. `test:coverage` — thresholds are a ratchet at the measured baseline, not an
   aspiration. See `vitest.config.ts` for the per-module targets on the pure logic
   this command is about.
5. `build` — both launch profiles, because they ship different code.
6. Browser, accessibility, responsive and reduced-motion projects run in a second
   CI job after the fast gate passes.

## 8. Production defects exposed by turning the checks on

These were found by the type-check and the linter, not by inspection. Full detail
in `docs/frontend-testing-strategy.md` §9.

- **Template field placement produced `NaN` rectangles.** `clampRect()` in
  `TemplateFieldsPage.tsx` read `minW/minH/maxW/maxH`, but the constraint records
  are keyed `minWidth/minHeight/maxWidth/maxHeight`. Every read was `undefined`,
  so every field a user drew got `{x:NaN,y:NaN,…}`, the browser discarded the
  style, and the field snapped to the top-left at default size — then that NaN
  rect was persisted.
- **`PageHeader` silently dropped its action buttons.** Three pages passed
  `actions={…}`; the component renders `primaryAction`/`secondaryActions`. The
  Dashboard refresh control, and the Documents and Assignment header actions,
  never rendered.
- **21 breadcrumb items were dead text.** They passed `href`, but `BreadcrumbItem`
  declares `to`. `PageHeader` renders a `<Link>` only when `to` is present, so
  those breadcrumbs were not navigable.
- **Six conditional React hooks in `PrepareLayout.tsx`** — `useCallback` called
  after an early return, the exact Rules of Hooks violation that corrupts hook
  order between renders.
- **`SearchDialog` icon map was missing 14 of 18 result types**, which would have
  thrown "Element type is invalid" and crashed the whole result list the moment
  the legacy service emitted one of them.
- **A template's highest-trust signer silently degraded to the weakest
  authentication.** The procurement CFO placeholder requested `"authenticator"`,
  which is not a `PrepAuthMethodId`; the resolver falls back to the first entry,
  `"none"` / Secure Invitation Link. The same class of bug affected 20
  `"email-code"` values and 6 `"invitation-access"` values.
- **13 template date fields used an invalid `FieldType`**, rendering with a blank
  icon and blank type label and falling through to generic resize bounds.
- **`EsigOverview` nested `title` inside `style`**, so 11 authored status
  descriptions never rendered as tooltips.
- **Branded-ID protection was defeated in `MemberDetailPage`** — ten calls cast
  the route param to `WorkspaceRoleId` and passed it where `WorkspaceMemberId` was
  expected, adjacent to a genuine role-ID argument.
- **Five `window.confirm`/`alert` calls remained** in Settings and Templates after
  C37 replaced only the workflow ones.

## 9. Recorded but deliberately not fixed

- **`workspace-admin.service.ts` `removeMember` phantom owner.** When the member ID
  is unknown it spreads `FIXTURE_MEMBERS[0]` (the workspace owner) and stores it
  under the unknown key as `deactivated`, which would render a phantom deactivated
  owner in the directory. Fixing it changes what the user sees, so it is recorded
  rather than silently altered. Unreachable in practice — the detail page hides
  Remove for unknown IDs.
- **`usePageMeta()` takes no arguments.** Seven template pages were written
  expecting a per-record title override, so `/app/templates/:id` and its
  sub-routes have never had their intended document title. Fixing it needs a
  signature change plus a decision about SEO metadata scope.
- **`isSenderText` versus `placeholderId === null`.** The template field editor
  writes a flag the canonical model does not define; the model encodes
  sender-prefill as a null placeholder. Both spellings currently coexist.
