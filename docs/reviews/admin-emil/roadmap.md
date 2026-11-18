# Admin portal Emil sprint roadmap

18 November 2026. Local-only continuation on `feat/emil-screen-sprints`; prior local work is retained. No deployment, merge or push is included. “Admin portal” here means the existing Workspace administration area and its settings, not deferred enterprise/eNotary modules.

Implementation/review uses `emil-design-eng` and `break-ui`. The user explicitly authorized implementing and fixing each sprint, so the break-ui report is followed by fixes without another approval pause. Narrower mobile/motion skills apply only when those issues are changed.

## Data surface and constraints

| Field | Boundary / source | Limit or meaning | Fixture |
| --- | --- | --- | --- |
| Workspace name | workspace read/session | 200 characters, backend workspaces contract | Existing synthetic Business workspace; no rename during response-fixture review |
| Member display name | members / unit members | registration 2–200; empty legacy/partial value tested separately | Long Polish/Vietnamese/CJK/Arabic names, Jo, emoji-first name, missing display name |
| Email | member/invitation response | standard email; no narrower display limit found in these view models | Long plausible subdomain/company address, short example.test values |
| Team name | units response | 120 characters | 99-character legal/compliance department name |
| Position/title | unit/member role title | 120 characters (existing form) | Senior Product Design Engineer, Platform Infrastructure; null |
| Role/status | closed backend enums | Seven roles; invitation lifecycle enum | Mixed roles and pending/expired/revoked invitations |
| Avatar | people version + avatar endpoint | optional; fixed-size display | Missing and failed image response |
| Counts / collection size | roster length, teams, activity page | members unpaginated; activity fetches 50 | 0, 1, 8, 1,284 members; activity ≤50 per page |
| Time | epoch milliseconds from API | valid backend timestamps | Same day and earlier dates |
| Search/filter result | current client-side controls | empty query versus no matches | Nonmatching query, reset |

The script `scripts/review-admin-ui.mjs` renders real application components with GET response fixtures. It requires a valid local authenticated session, blocks mutations during the fixture review, and adds a bottom-centre Demo data / Worst case / Empty / One / 1,284 people switch. It never changes server authorization or stored data. Fixtures are not imported by the application or production build.

## Initial break-ui findings

| # | Severity | Field/state | Worst case | What happens | Fix location/approach |
| --- | --- | --- | --- | --- | --- |
| A1 | Broken | Readability / chart semantics | Existing overview, activity, settings and roles | Pale helper text fails contrast; chart slice has an unnamed image role. | Shared workspace foreground tokens, OverviewCharts semantic chart wrapper. |
| A2 | Broken | Branding inputs | Existing workspace/sender/footer text fields | Three inputs have no accessible names. | RealBrandingPage IDs and SField associations. |
| A3 | Ugly | Avatar initials | Emoji-first name; missing name | UTF-16 indexing splits emoji; empty name shows ? without identifying email. | Shared grapheme-aware initials; member name fallback. |
| A4 | Broken | Search no matches | Nonmatching name/team query | Populated library can become a blank area with no recovery action. | RealPeopleTeamsPage filtered no-results + existing reset. |
| A5 | Fragile | Clamped names/titles | Long real names/position | Tree/grid truncation provides no hover title; touch user must open detail for full text. | Explicit full-value title and accessible names; preserve detail panel. |
| A6 | Broken | Dialog keyboard containment | Tab at last control | Shared join Dialog handles Escape/return focus but does not trap Tab or lock background scroll. | join-ui Dialog focus handling, preserving existing busy/confirmation logic. |
| A7 | Ugly | Phone controls / focus | Tree/Grid 30×28, small actions; outline-less form styles | Targets smaller than saved standard; form focus insufficient. | Scoped workspace/dialog coarse-pointer sizing and visible focus. |
| A8 | Fragile | Large counts | 1,284 members | Counts render without grouping; long unpaginated roster needs explicit scale evidence. | Intl number formatting; measure and report existing render behavior rather than add pagination contracts. |

Some findings are source-confirmed behavior; screenshots/axe results distinguish measured failures. Existing avatar shrink prevention, team-title wrapping, pluralization of people/team, date guards, server role gates and bounded activity loading already hold up and should remain.

## Sprint 1 — Accessible shared surfaces

Skills: emil-design-eng implementation/review; break-ui data replay. Fix A1/A2: light-surface text, accessible chart semantics, branding labels and keyboard-readable role matrix. Gate: real local overview, activity, settings, roles, branding and usage axe scans at 1440/390/320 pass after repair; branding label focus works. Preserve brand fills and permissions.

## Sprint 2 — Robust data states

Skills: break-ui + emil-design-eng. Fix A3/A4/A5/A8: Unicode initials and name fallback, readable full-value affordances, explicit filtered no-results/reset, grouped counts. Replay Demo/Worst/Empty/One/Huge and large-text reflow. Gate: no page-width overflow, correct initial/name/empty-state behavior, existing normal data still works; record large-list performance without claiming a backend pagination feature.

## Sprint 3 — Interaction and integration

Skills: emil-design-eng + break-ui; mobile-native for touch corrections, review-animations only for changed motion. Fix A6/A7 and any findings from the preceding reviews. Gate: dialog Tab/Shift+Tab containment, Escape/return focus, phone action sizes, relevant unit tests, typecheck/lint/build and final real-backend read-only checks. No provider/payment, physical-device, actual 200% browser zoom or unsupported RTL/dark-mode claim.

Each sprint follows implement → review → fix → verify → advance automatically. Final results and Before/After/Why tables are recorded in this directory. No existing permissions, plan gates, recipient rules or service contracts are relaxed.
## Sprint 1 review result

Status: complete. All seven real local screens were scanned at 1440, 390 and 320px. The final chart-specific repair passed at all three widths; all other final screen checks passed. An intermediate attempt to hide chart descendants caused aria-hidden-focus, so it was replaced with accessible names on the actual Recharts cells. The chart is not hidden from assistive technology.

| Before | After | Why |
| --- | --- | --- |
| Pale shared helper text on light cards. | Existing ON_LIGHT muted/slate foregrounds. | Correct the measured contrast failures without changing brand fills. |
| Branding captions were separate divs. | Associated labels/IDs and helper descriptions. | Screen readers can name each field. |
| Donut segments had unnamed image roles. | Each segment has its status/count accessible name. | Preserve the chart and remove the measured semantic failure. |
| Wide permissions comparison could require pointer-only scrolling. | Named, focusable comparison region. | Keyboard users can reach the existing horizontally scrollable matrix. |

## Sprint 2 result

Complete. Eighteen fixture scans at three widths passed after the data-state fixes. Search recovery and Unicode regression tests passed. See the [final review](review.md) for Before/After/Why findings and limits.

## Sprint 3 result

Complete. Dialog, touch and motion corrections were reviewed and repaired, including invitation-form labels and the keyboard-readable waiting list discovered in the final pass. Twenty-seven real read-only page scans and six final phone panel/tab scans passed. The final review records the test results and any rerun history. All work remains local; no deployment occurred.
