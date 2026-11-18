# Mobile platform review — 18 November 2026

Completed locally using **mobile-native**, **break-ui** and **emil-design-eng** against the existing design baseline. No production connection, deployment, push or merge. Existing local work was preserved.

## Scope and evidence

27 routes/states cover dashboard, Documents (sent, completed, participant records), Contacts, template library/creation/gallery/detail/edit/fields/preview/use/authoring, Shared Documents, Notifications, profile/security/notification settings, Workspace overview/People & Teams/activity/roles/settings/branding/billing/usage. The admin interaction runner additionally checks invitations, join-link/request panels, team/person dialogs and menus.

The final accepted matrix contains **131 screen/state checks**, with zero detected WCAG A/AA violations, page overflow, clipped editor-header actions, visible coarse-pointer text inputs below 16px or general button/link targets below 44px. It includes 320×640, 844×390, 390×420 (a short viewport approximation), 390×844 data states, and 1440×1000 with 200% root text. Enlarged-root-text checks are not a claim of full browser zoom testing.

[Machine-readable verification](verification.json) lists each accepted check. Earlier failed captures remain in `%LOCALAPPDATA%/LAGDA/platform-mobile`; corrected rechecks replace those entries in the accepted matrix. A viewport overflow check alone missed the clipped Save button; screenshots and an explicit action-bounds measurement caught it.

## Surface/data inventory

| Rendered values | Boundary / source | Limits and exercised cases |
| --- | --- | --- |
| Template names and categories, scope/status badges, timestamps | `workflow-templates` list/detail → templates-source → TemplatesPage/TemplateDetailPage | Backend name 200 characters (`packages/contracts/src/workflow-templates/index.ts:611` in the sibling backend); plausible long legal-document title, one template, empty, 1,284 templates; existing timestamps/enums preserved |
| Template role labels, role/auth/routing metadata, document title/page preview | Workflow template detail → TemplateFieldsPage/TemplateEditPage/UseTemplatePage | Role label 120 characters (`workflow-templates/index.ts:184`); long authorised-representative label; existing role types, content, variables and coordinates preserved |
| Document title, participant/completion counts, dates, states and action labels | signing-requests list and signatures/audit reads → DocumentsPage and tracking dialogs | Document-title read has no length limit in its read schema (`signing-requests/index.ts:344`); write schema uses its title constant. Tested long plausible titles, 0/1/6 request rows and 1,284-participant counts; actual local QA audit/signatures remain read-only |
| Person name/email/title, initials, optional organization/avatar, team name, role and counts | `admin-ui-data.mjs` / `platform-ui-data.mjs` at API response boundaries | No read-schema name/email limit found in workspace member output (`workspaces/index.ts:227`); long email/name, Jo, CJK, Arabic, Vietnamese, emoji-first and missing names, missing optional titles, 0/1/1,284 members |
| Activity summaries/actors/timestamps, invitation email/status, team memberships | adminFixture members/units/invitations/activity responses | Enum states and real date shapes; long actor/team labels, optional values absent, large membership collection |
| Notification title/status/priority, settings form values and secondary links | Existing local authenticated read responses | Resolved/Critical status labels, normal/short viewports, 200% root text; no notification, invitation, reminder or settings write submitted |
| List length, counts, empty text, labels, focus and scroll state | Dev-only response fixture switch and normal route controls | Demo/Worst case/Empty/One/1,284 items; template switch survives reload, pluralization and grouped large template count checked |

All fixtures are plausible and enter through the read boundary. The request list uses six visible QA rows with large participant counts; it does not claim to exercise 1,284 request rows. Template and member huge modes actually provide 1,284 items. This is UI verification, not a backend load or signing/sealing rerun.

## What broke and was fixed

| # | Severity | Field / worst case | Before | Fix and location |
| --- | --- | --- | --- | --- |
| 1 | Broken | Long template title at 320px | Save Fields clipped inside fixed-height header; title clipped vertically | Wrapping header, bounded two-line identifying title with full accessible text/title, nonshrinking Save control: `TemplateFieldsPage.tsx:695` |
| 2 | Broken | Long role labels on short phone viewport | Wrapped role controls consumed document space | Bounded native horizontal role strip on phones; shorter palette on short screens; desktop wrapping retained: `TemplateFieldsPage.tsx:755`, `theme.css:592` |
| 3 | Broken | Keyboard navigation in tracking/deletion dialogs | Escape existed but focus could leave the dialog | Shared modal lifecycle, topmost focus trap, scroll lock, trigger restoration and busy guard: `AuditTrailDialog.tsx:234`, `SignatureRecordDialog.tsx:898`, RemindersDialog, ExpirationDialog, `ConfirmDeleteTemplate.tsx:46` |
| 4 | Broken | Participant/audit/PDF scroll regions | A keyboard user could not focus a region with no interactive content | Named focusable scroll regions: `SignatureRecordDialog.tsx:956`, `AuditTrailDialog.tsx:289`, `TemplateFieldsPage.tsx:317` |
| 5 | Fragile | Phone controls and text inputs | Small toolbar/actions, author controls and settings inputs; some input fonts below 16px | Scoped 44px coarse controls and 16px editable inputs, excluding positioned PDF geometry: `theme.css:558`, `theme.css:578` |
| 6 | Fragile | Mobile browser chrome, keyboard and safe areas | Old vh dialog limits; workspace header not safe-area padded; task metadata absent on standalone tools | Dynamic heights, safe-area padding, owned viewport/theme metadata and contained native scroll: `PlatformLayout.tsx:184`, `MobileNav.tsx:188`, full-screen template roots |
| 7 | Ugly | Resolved/Critical/Available/Declined and secondary metadata | Insufficient small-text contrast, including labels below the first viewport | Accessible light-surface status text: NotificationsPage constants, TemplateDetailPage constants/metadata, RealDashboard RED; active role text uses accessible azure |
| 8 | Fragile | Touch hover and press feedback | Ungated hover states and imperative palette hover | Capability-gated hover on reviewed template/admin/contact/notification surfaces; immediate CSS press feedback, manipulation tap behavior and control-only selection suppression; keyboard focus styles retained |
| 9 | Fragile | 1,284 template count | Ungrouped numeric count | Locale-formatted count with existing singular/plural logic: `TemplatesPage.tsx:587` |

Locations above are relative to `src/app/`, except `theme.css` under `src/styles/`.

## Emil review

| Before | After | Why |
| --- | --- | --- |
| Fixed header competing with a long title | Two-line identifying title, flexible rows and a nonshrinking primary action | Identification remains available while Save stays reachable |
| Tall wrapping role area on a short screen | Native horizontal strip with full accessible labels | Preserves document space and keyboard/touch reachability |
| Small buttons, browser tap flash, sticky hover | Coarse 44px controls, explicit immediate press feedback, hover gated by capability | Feedback follows the actual input capability |
| 85vh / 100vh dialogs, incomplete modal lifecycle | Dynamic viewport bounds, safe padding and shared focus handling | Keeps actions and keyboard navigation usable in constrained space |
| Low-contrast status metadata | Established readable light-surface tokens | Status is legible without changing its meaning |

**Motion verdict:** no new route, list, keyboard or document animation. Press feedback is immediate. Existing reduced-motion behavior is preserved. Hover is capability-gated; document coordinates and signature behavior are untouched.

**Decisions resolved:** identifying titles wrap or clamp to two lines with full text accessible from the link/detail; secondary dialog titles retain ellipsis plus their full title attribute. Role labels use native horizontal scrolling on phones. Existing pagination/list behavior remains; no new feature or permission gate was introduced. No user decision is outstanding for these fixes.

**What held up:** template cards, completed-document cards, international names and fallback initials, optional organization/title fields, admin hierarchy, role/plan gates, empty states, singular labels and existing data pagination. The actual template source document still renders; field geometry is excluded from generic touch sizing.

## Validation and reproducibility

- **321/321 tests in 31 files passed.** Covers tracking/lifecycle dialogs, template functions/authoring/security/preview, mobile navigation, workspace management/People & Teams, viewport metadata and recipient-account routing. Final template/count changes were followed by 3 passing focused tests. The final disabled-control focus fallback was followed by 6 passing deletion/expiration tests.
- The first broad run exposed one stale prior expectation (`3 of 3 signed`); updated it to the already-established role-aware `3 of 3 completed`. Its 42-test lifecycle suite passes.
- Added two deletion regression tests: typed confirmation plus Tab/Escape/focus restoration, and busy-state Escape protection and focus remaining on the dialog when every control is disabled.
- Admin phone interaction checks passed: search reset, Unicode and missing-name detail, modal Tab/Shift+Tab/Escape/restore, background scroll preservation, team-menu keyboard behavior and enlarged root text.
- Five short-screen dialog checks pass: participant records, history/audit, reminder settings, expiration and template deletion. All server mutations are blocked; no reminder, deletion or signing request was submitted.
- Typecheck and local build pass. ESLint passes with **0 errors and 17 warnings** in the selected source/test scope (existing hook/test warnings). Build retains the existing large-chunk advisory.

Run from the frontend using Node 24:

```powershell
node scripts/review-platform-mobile.mjs --profile=small --phase=review
node scripts/review-platform-mobile.mjs --profile=landscape --phase=review
node scripts/review-platform-mobile.mjs --profile=keyboard --dialogs --phase=review-dialogs
node scripts/review-platform-mobile.mjs --profile=phone --states --phase=review-states
node scripts/review-platform-mobile.mjs --profile=desktop --large-text --phase=review-large
node scripts/review-platform-mobile.mjs --toggle-check
node scripts/review-platform-mobile.mjs --interactive
node scripts/review-admin-ui.mjs --checks --phone --phase=review
```

Requires the existing authenticated local QA session at `%LOCALAPPDATA%/LAGDA/emil-sprints/business-session.json`. The runner is outside the application bundle and hardcoded to localhost; it blocks non-read API methods. The interactive bottom-center toggle has Demo data / Worst case / Empty / One / 1,284 items and persists `breakData` in the URL. It never changes backend data or permissions. Screenshots/raw results/logs remain under `%LOCALAPPDATA%/LAGDA/platform-mobile`.

## Screenshots and limits

[Before: clipped editor header at 320px](template-fields-before-320.png) · [After: reachable Save at 320px](template-fields-after-320.png) · [Short-screen reminder settings](reminders-after-short.png) · [Short-screen audit trail](audit-after-short.png).

**Physical-phone acceptance is unverified.** Browser emulation validates layout, DOM metrics and focus; it cannot establish actual iOS keyboard/notch/status-bar behavior, rubber-banding, OS text scaling or physical tap/hover behavior. Safe-area/viewport declarations were reviewed in code. The 390×420 case approximates a reduced visual area and is not a real soft-keyboard test. Supported production light/LTR layout was exercised; mixed-script data is included, but a whole-product RTL/dark redesign is outside scope.
