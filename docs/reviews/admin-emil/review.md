# Admin portal review and completed sprints

18 November 2026. Local frontend branch `feat/emil-screen-sprints`; starting source baseline `5934a8b`, backend `cb3c3b0`. Earlier local screen work was preserved. No push, merge, deployment or production mutation was performed. Backend tracked source is unchanged.

Scope: existing Workspace administration (Overview, People & Teams, Activity, General settings, Roles, Branding, Usage, Billing), Invitations and the existing email/join-link/request panels. Deferred enterprise and eNotary administration were not enabled. The local synthetic Business account from the earlier verification is used; this does not test billing/payment processing.

The [roadmap](roadmap.md) was written before implementation. All three sprints followed implementation → Emil review → repair → verification → next sprint under the user's automatic-progression instruction.

## Sprint 1 — Shared accessibility

Implementation/review: `emil-design-eng`; `break-ui` replayed data states.

| Before | After | Why |
| --- | --- | --- |
| Overview metadata, activity times, workspace eyebrow and role comparison captions failed contrast. | Reused ON_LIGHT muted/slate text on the actual light surfaces. Brand fills remain separate. | Correct the measured readability defects using the saved design standards. |
| Three Branding inputs lacked accessible names. | Explicit labels/IDs and helper descriptions. | Keyboard and assistive technology can identify the fields. |
| Recharts donut sectors exposed unnamed image roles. | Each sector has a status/count accessible name. | Keep meaningful chart data accessible. |
| Permissions matrix needed horizontal reading. | Named focusable comparison region. | Keyboard access to the existing scroll container. |

Gate passed: seven main administration screens at 1440/390/320. The initial chart repair introduced an aria-hidden-focus failure; that approach was discarded. The final chart remains exposed with named sectors and passed at all three widths.

## Sprint 2 — Difficult data and clear states

Implementation/review: `break-ui`, `emil-design-eng`.

| Before | After | Why |
| --- | --- | --- |
| UTF-16 indexing split emoji-first initials. | Shared grapheme-aware initials, suffix handling and a whole-letter/code-point fallback for older browsers. | Preserve plausible international names without broken surrogate characters. |
| Missing display names left blank identity text. | Email fallback in the people map, tree and person detail. | Identify partial/legacy records without inventing a person. |
| Long tree/grid names and titles were clamped without a title affordance. | Full-value titles and existing accessible names/detail view. | Recover the complete value without widening every card. |
| A populated page with a nonmatching query became blank. | Clear no-match explanation and Clear search action; collection-empty remains distinct. | Give a recovery path instead of implying there are no teams. |
| Large counts rendered as 1284. | Locale grouping for people/team counts. | Readable counts without a new server pagination contract. |

Gate passed: 18 browser scans (Demo, Worst, Empty, One and 1,284 people, plus difficult activity data, at three widths), no axe violations or document-width overflow. Normal data, plurals and existing sort behavior remain. Search reset and Unicode cases have regression tests. This is a render/layout check of the large roster, not a performance benchmark or claim that the backend now paginates it.

## Sprint 3 — Dialogs, touch and integration

Implementation/review: `emil-design-eng`, `break-ui`; `mobile-native` for touch sizing; `remove-animations` and `review-animations` for the changed motion.

| Before | After | Why |
| --- | --- | --- |
| Shared join dialogs, member panel and invitation panel lacked complete focus containment. | Shared focus lifecycle: initial focus, Tab/Shift+Tab containment, Escape, busy guard where supplied, background body-scroll lock and connected-trigger focus restoration. | Complete the existing interactions without relaxing permissions. |
| Tree/grid controls were 30×28px on touch. | Scoped 44px activation areas, 16px form text and visible focus; section dots wrap. | Follow the saved phone standards without changing desktop density globally. |
| Long team chip and Remove-from-team button overflowed the phone member panel. | Chip and action text wrap within their available width; chip uses readable Azure text. | Keep the full team identity and action reachable. |
| Workspace sections replayed an entrance; person cards lifted; the settings gear rotated. | Removed those decorative movements and orphaned keyframes. Tooltip keeps a short opacity reveal for pointer use and is immediate on keyboard focus. | Frequent admin navigation responds immediately. |
| Team options menu lacked arrow-key focus behavior. | Enabled-item focus, Arrow/Home/End movement and Escape return to trigger. | Existing menu actions are reachable by keyboard. |
| Invite-form role selector lacked a label association; waiting list could need keyboard scrolling. | Unique form IDs/labels; named focusable waiting-list region. | Correct the findings from the final invitation review. |

Gate passed: final 27 real local read-only screen scans (nine screens × three widths) had zero axe violations or document-width overflow. Six phone dialog/tab states also passed after repairs: missing-name member panel, New Team, Invite by email, Join links, Requests and Waiting to Join. The long-email waiting-list case was checked separately.

Interaction assertions passed for search recovery, Unicode/missing-name identity, dialog forward/reverse Tab, Escape, return focus, background-scroll stability, ≥44px phone view controls, Team options keyboard navigation and 320px enlarged-root-text layout. Enlarged root text is not actual browser zoom and does not enlarge every fixed-pixel text style.

Motion verdict: **Approve, scoped to this diff.** Frequent section entrances and decorative person/gear movement were removed. Color/border/shadow feedback remains bounded; keyboard focus is immediate. Purposeful progress feedback remains. No new motion dependency or decorative replacement was added. Unchanged motion elsewhere in the application was not approved by this review.

## Break-ui findings and fix locations

| # | Severity | Field / realistic case | What broke | Fix |
| --- | --- | --- | --- | --- |
| A1 | Broken | Normal overview/activity/settings | Measured text contrast and unnamed sector. | `join/join-styles.ts:12`, `real/OverviewCharts.tsx:235`; foreground tokens and sector names. |
| A2 | Broken | Branding fields | No accessible input names. | `settings/RealBrandingPage.tsx:192`; associated labels. |
| A3 | Ugly | 👩🏽‍💻 Priya, missing name | Broken initial / empty identity. | `utils/person-initials.ts:5`, `real/RealPeopleTeamsPage.tsx:282`; complete initials and email fallback. |
| A4 | Broken | NoMatchingDepartment query | Blank populated results. | `real/RealPeopleTeamsPage.tsx:442`; explicit no-match/reset. |
| A5 | Fragile | Long Polish name and position | Truncation lacked a full-value affordance. | `real/RealPeopleTeamsPage.tsx:282`, `real/TeamTreeView.tsx`; titles and full detail. |
| A6 | Broken | Tab after last dialog control | Focus escaped to background. | `hooks/useWorkspaceDialog.ts:5`; shared focus lifecycle. |
| A7 | Ugly | Touch view controls / form focus | Small targets and absent input outline. | `styles/theme.css:489`; scoped focus and coarse-pointer sizing. |
| A8 | Ugly | 1,284 people | Ungrouped count. | `real/RealPeopleTeamsPage.tsx:421`; locale grouping. |
| A9 | Broken | 99-character legal department name in phone member panel | Chip/action overflow; chip contrast 4.19:1. | `real/RealPeopleTeamsPage.tsx:1212`, scoped panel button CSS; wrap and ON_LIGHT foreground. |
| A10 | Broken | Invitation role selector and long pending email | Unnamed select and keyboard-unreachable scroll region. | `workspace/InvitationsPage.tsx:98` InviteForm; `real/RealPeopleTeamsPage.tsx:528` waiting-list region. |

Paths in this table are relative to `src/app/pages/platform/workspace` unless prefixed with settings, utils, hooks or styles; those refer to the existing corresponding app/source directories. The implementation files and roadmap make the scope explicit.

Decisions applied under the user's fix authorization: keep compact tree/grid names with full titles and details; wrap identifying team chips and action labels; keep existing unpaginated roster behavior because no measured performance failure justified a new contract. No design decision requiring user input remains.

What held up: avatar boxes already prevented shrinking; broken images already fall back; team headings wrap; people/team singulars are correct; activity uses a bounded page; dates guard invalid values; role/plan gates remain. Do not replace those working behaviors as part of polish.

## Validation record

Final targeted administration run: 15 files / 134 tests passed, after repairing a test-only delayed demo-role lookup that could update after environment teardown. The earlier wide related run passed 606 assertions but had three dashboard timeouts/late duplicate-DOM failures; the dashboard file passed all four tests in isolation and the subsequent targeted run. The earlier 118-test targeted pass also completed cleanly. These are not a claim of a fresh full 4,121-test run for this task.

Final typecheck, lint (zero errors; existing repository warnings remain), default production-profile build and diff whitespace checks passed. Build retains existing chunk-size/import warnings. No environment profile, role capability or backend endpoint was altered. The prior full-suite evidence belongs to the earlier sprint report.

## Reproduce the local review

Run `node scripts/review-admin-ui.mjs --interactive` with the supported Node version from the frontend repository. A valid local session is read from the existing private AppData fixture; `LAGDA_REVIEW_SESSION` may select another local storage-state file. `LAGDA_REVIEW_OUTPUT` selects the evidence directory. The script opens the actual application with GET response fixtures and a Demo data / Worst case / Empty / One / 1,284 people switch; reload retains the selected query. Hide removes review chrome when it obstructs an action; reload restores it.

`--phase=final` performs the data/width scans; `--checks --phone` runs interaction assertions and panel scans. The harness blocks mutations and never changes server roles or stored records. It is not imported by the application, so the toggle and datasets are absent from production bundles. No session, password, cookie, private key or signing token is stored in this report/evidence.

Selected [screenshots and sanitized results](evidence/) include before and after states. Earlier failing results are retained only where useful to explain the repair; final/verified files are the current results.

## Limits

Local Business-owner coverage and response-fixture edge cases do not prove every role, provider or production deployment. Permission regression tests passed, but every role was not manually exercised. Empty/missing-name records are defensive API fixtures, not a claim that current registration accepts blank names. The fixture schema/limits are mapped in the roadmap.

Physical-phone behavior, real browser 200% zoom, dark mode/RTL and payment/identity-provider behavior were not verified. Phone results use browser emulation; root-text/reflow tests do not replace hardware testing. No new feature roadmap or deployment is implied by these remaining verification limits.

## Follow-up break-ui rerun

Repeated the normal/worst/empty/one/1,284-person states at 1440/390/320 and the desktop/phone dialog checks. All 30 browser accessibility scans passed with no reported violations; the data screens had no page-width overflow, and interaction assertions passed. The focused dialog/Unicode/People & Teams regression run passed 26 tests across three files. No new application defects were reproduced and no additional product-code changes were needed. Work remained local; no deployment.
