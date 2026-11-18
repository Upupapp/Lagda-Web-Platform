# Emil sprint implementation and review

18 November 2026. Frontend branch `feat/emil-screen-sprints`, baseline `5934a8b`; backend baseline `cb3c3b0`. All four local implementation/review cycles are complete. No push, merge, deployment or production change was performed. Existing production features are the scope; no deferred features were added.

## Sprint 1 — Accessibility and readability (E01–E04)

Implementation and review: `emil-design-eng`.

| Before | After | Why |
| --- | --- | --- |
| Profile captions and template sort/filter captions lacked control associations. | Matching labels/IDs and helper/error descriptions. | Accessible names and click-to-focus work without changing persistence. |
| Several light-surface helper, active and status colors failed contrast. | Existing ON_LIGHT foreground tokens applied to the affected surfaces. | Readable text while preserving brand fills and dark surfaces. |
| The unread dot had an invalid accessible label. | Decorative dot plus hidden Unread text in the notification link. | Status is announced with its item. |

Review repairs included residual public-heading and notification-pill contrast. Final nine targeted desktop/phone axe scans: zero violations and no page-width overflow. Label focus and sort selection passed. Passed the available browser gate before Sprint 2.

## Sprint 2 — Existing task usability (E05–E07)

Implementation: `emil-design-eng`, `mobile-native`, `remove-animations`. Review: `emil-design-eng`, `mobile-native`, `review-animations`.

| Before | After | Why |
| --- | --- | --- |
| Compact template toolbar targets and cramped phone wrapping. | 44px touch controls, wrapping at 320px, visible focus, named search and expanded-state semantics. Equivalent targeted Documents/Contacts controls improved. | Existing actions are usable on small screens. |
| Free-plan promotions preceded document work; Templates promotions interrupted the library. | Dashboard task actions and library content precede secondary promotions. | Users reach their current task first; plan gates and upgrade access remain. |
| Every route replayed an entrance and sidebar width animated. | Immediate route visibility and sidebar resizing. Full-height scrolling preserved. | Frequent navigation should respond immediately without shifting layout. |
| Shared buttons animated every property. | 150ms color transitions; keyboard focus and reduced motion suppress transitions. | Bound the feedback and avoid accidental layout motion. |

Fourteen browser scans at desktop, 390px, 320px and 720px reflow plus reduced motion passed. Target dimensions, filters, immediate keyboard navigation and dashboard ordering were checked. The dashboard regression test verifies the task appears before promotions. Passed before Sprint 3.

Motion verdict: **Approve for changed motion only.** Removed frequent route movement and sidebar layout animation; removed orphaned keyframes and the old class name. Preserved route-wrapper scrolling to avoid collapsing document previews. Existing progress spinners remain useful state feedback. Color feedback is bounded and interruptible; no replacement decorative motion or new animation library was introduced. This is not approval of every pre-existing animation in the product.

## Sprint 3 — Existing state consistency (E08–E09)

Implementation and review: `emil-design-eng`.

| Before | After | Why |
| --- | --- | --- |
| Signers/Participants and Routing/Order wording disagreed across preparation. | Participants and Order labels match the actual sequence and supported roles. | Instructions follow the existing eight steps. |
| Review implied fields would be placed next. | Preparation checks describe completed preparation neutrally. | Avoid misleading users or implying final authorization already happened. |
| Empty library and filtered no-results repeated generic messages. | Separate library-empty and no-match states; one existing Create action or clear-search-and-filters action. | Give the appropriate next step without adding features. |
| Field captions and warning text had residual contrast problems. | Readable foregrounds; participant colors retained in borders/badges. | Maintain assignment cues without unreadable text. |

The local desktop and 390px preparation journeys reached all eight steps. Latest nine phone/empty-state scans passed with zero violations; the preceding desktop eight-step pass also had zero after repairs. The authorization reading region accepts keyboard focus. Passed before Sprint 4.

## Sprint 4 — Integration and final review

Implementation corrections: `emil-design-eng`, with `mobile-native` for touch layout. Review: `emil-design-eng`, `mobile-native`, `review-animations` scoped to the earlier motion diff.

| Before | After | Why |
| --- | --- | --- |
| Template creation dialog lacked input labels, containment and return focus. | Named fields, focus trap, Escape dismissal, trigger focus restoration, responsive sizing and phone input sizing. | Complete the existing dialog with keyboard and phone layouts. |
| Template editor content and Details fields lacked accessible names. | Named multiline textbox and associated Details labels. | Editing controls are identifiable. |
| Template-use authentication/access controls lacked names. | Role-specific names and variable labels. | Mapping is understandable without changing its contract. |
| Populated dashboard, recipient warnings, history and request counts exposed additional pale text. | Readable light-surface tokens. | Recheck real data states, not only empty screens. |
| Document page scroller was not keyboard reachable. | Named focusable document region. | Keyboard users can reach the PDF reading surface. |
| Address-correction dialog title had 2.84:1 contrast. | Slate foreground on white (4.76:1). | Resolve the measured remaining title failure without sending a corrected request. |

Local real-backend evidence:

- Uploaded/prepared and sent a synthetic document, confirmed local invitation delivery, created/verified the fictional recipient account, linked the request through password confirmation, recorded consent, typed the fictional QA signature and submitted it.
- Recipient ceremony, filled and completion screens passed axe after repairs. Downloaded the actual signed PDF (621,153 bytes) and parsed it as one page. Sender viewer and audit dialog passed; audit contained seven events through completion.
- Created a reusable template, authored its document, generated/saved the actual PDF, mapped its role and created a real draft. Template mapping, review and draft-created states passed. Final author and Details screens each passed axe.
- Prepared and sent that draft as “Emil roadmap request management QA”. Inspected pending progress and reminder settings (both final axe checks zero), sent exactly one manual reminder through the local mail sink, inspected the address-correction form without sending it, then cancelled the synthetic request with a recorded reason. Cancellation confirmation and resulting page passed axe. Server list confirmed state `cancelled`.
- Template creation dialog at 390px and 320px: no document-width overflow, no axe violations, Escape restored trigger focus. Desktop dialog containment was also checked.

The Business template flow used a narrowly scoped local entitlement fixture for a synthetic Business QA account. It does not establish payment-provider or billing behavior. The original Free fixture remained Free. SMTP was local captured mail only; no production recipient was contacted.

## Verification and evidence

- Full unit run: **317 files, 4,121 tests passed, exit 0**. An earlier assertion failure from the renamed Participants wording and a Windows CRLF-sensitive source test were repaired. A transient runner error was rerun successfully.
- After the final integration edits: **26 related test files, 278 tests passed**. Typecheck passed. ESLint passed with zero errors using the repository rules; the repository still has warnings, so this does not mean warning-free. Build passed with existing bundle-size/import warnings. Final token-only cleanup received lint and related verification.
- Initial lint errors were unused constants introduced during editing; removed rather than classified as baseline problems.
- Browser evidence uses the default local real-backend application. Existing Playwright demonstration configuration was inspected and was not used to claim backend parity: it builds enterprise-preview with an empty API URL.
- Selected sanitized screenshots and result files are in [evidence](evidence/). Raw scripts, private credentials, cookies, storage states, signing URLs and mail remain outside the repository under local AppData. Some evidence records an initial finding followed by a documented repair; filenames marked final identify reruns.

## Explicit remaining verification limits

A physical phone and actual browser 200% zoom were not verified. 320px/390px emulation, coarse-pointer queries, reduced motion and 720px reflow are useful checks but do not establish real iOS keyboard zoom, safe-area behavior or touch feel. External identity/payment providers and every paid/admin role were not exercised. Hidden/gated modules were not enabled to inflate coverage. No production test or deployment is claimed.

All E01–E09 implementation work is complete and the available local review gates passed after repairs. Device/provider coverage remains a verification follow-up rather than an invitation to add product features.
