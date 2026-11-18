# LAGDA admin portal design memory

Recorded 18 November 2026 at the user's request: “all the changes we made, add to memory as part of our design element for the admin portal”. This carries the completed Emil screen sprints forward as the design baseline for future admin portal UI. It does not claim those changes have already been implemented in every admin screen.

Read this alongside [the design system](docs/design-system.md), [terminology](docs/product-terminology.md) and [the sprint implementation review](docs/reviews/emil-sprints/implementation-review.md). Preserve the existing LAGDA brand, components and libraries. This guidance records the implemented decisions and their technical rationale, rather than attributing new aesthetic preferences to the user.

## Color and status

- Use the existing `ON_LIGHT` tokens from `src/app/utils/on-light.ts` for text on its documented light surfaces: muted `#5B6776`, slate `#5A6673`, success `#166534`, azure `#0063B1`, warning/gold `#7D5C06`. Verify new backgrounds and states against their actual rendered surface. Normal text needs 4.5:1; qualifying large text needs 3:1.
- Keep brand button fills and navy-surface foreground tokens separate from light-surface text. Do not globally replace brand colors to fix one text contrast defect.
- Preserve status and participant color cues in badges/borders while keeping text readable. Convey status in words and semantics as well as color. Decorative dots are hidden from assistive technology; meaningful unread state belongs in the accessible item text.

## Layout and task priority

- Put the current task, primary action, document status and usable table/library controls before promotions or upsells. Retain existing upgrade access and entitlement gates.
- Toolbars wrap without overlap at 320px and 390px. Give touch toolbar controls approximately 44px activation areas and visible keyboard focus. Use 16px editable input text on coarse-pointer phone layouts where implemented.
- Preserve full-height route content and usable scrolling. Embedded PDF regions must not collapse when navigation or motion CSS changes. Name keyboard-scrollable document regions and make them focusable.

## Forms and dialogs

- Associate visible field labels with inputs/selects using IDs and `htmlFor`; connect helper/error text with descriptions. Give repeated role controls distinguishable accessible names. Rich-text editors have a named multiline textbox role.
- Dialogs receive focus, contain keyboard navigation, support Escape when safe and restore focus to the trigger. Preserve busy-state protections and existing confirmations for consequential actions. Long phone dialogs scroll while their actions stay reachable.
- Keep existing validation, persistence, authentication, recipient permissions, routing and signing contracts intact. Design polish does not authorize relaxing controls.

## Motion

- Frequent route navigation and sidebar resizing respond immediately. Do not restore the removed route-entry animation or sidebar width animation.
- Bound transitions to intentional properties. Shared buttons use 150ms color feedback, with immediate keyboard-focus feedback and reduced-motion support; do not reintroduce `transition-all`.
- Keep purposeful progress feedback. Do not add decorative motion to compensate for removed movement. Any new motion requires its own purpose, frequency, interruption and reduced-motion review.

## Copy and states

- Instructions follow the actual existing process. The signing preparation vocabulary is Upload, Participants, Order, Settings, Fields, Authentication, Review and Authorization. Review must not imply field placement is still next or authorization is already complete.
- Distinguish an empty collection from search/filter no-results, loading and errors. Empty collections expose one existing creation action; no-results exposes the existing reset path, clearing both search and filters when appropriate.
- Use precise status descriptions without promising unsupported verification, completed actions or future functionality.

- In real signing preparation, completed copies are available to eligible participants through Records. Do not promise a separate participant download-link email or expose an email switch unless the backend actually produces it; the current worker intentionally does not. Verified in [the real local signing review](docs/reviews/real-local-signing/review.md).

- Recipient account confirmation (`/app/link-signing`) requires session authentication and password reproof, independently of workspace setup or loading. Keep the exact handoff route outside workspace navigation/gates while preserving gates for workspace pages. See [the multi-recipient QA review](docs/reviews/multi-recipient-signing/review.md).

- Real routing waits for every required participant; do not expose an any-one completion choice without backend support. Generic participant progress says completed, since approval, review and skip can satisfy obligations without signatures. Describe recorded approval/skip decisions accurately while retaining legal-validity limits. See [mixed-role workflow verification](docs/reviews/role-workflows/review.md).

## Skill and sprint standard

Default implementation and general UI review: `emil-design-eng`. Add `mobile-native` for phone layouts, `remove-animations` for unnecessary existing motion, and `review-animations` for reviewing changed motion. Use `animate` only for justified new motion; `animation-performance` only for a measured performance issue. `break-ui` is recommended for a requested worst-case data review of admin tables/forms, not a claim that such a review has already run.

For each authorized sprint: implement → review → repair → verify → record evidence → proceed automatically to the next sprint. Record Before/After/Why review tables and an explicit motion verdict when applicable. Reuse existing features rather than add deferred ones.

Run checks appropriate to the changes. Use isolated local synthetic accounts, captured local mail and real-backend flows where needed. Never point truncating integration tests at production. Distinguish browser emulation/reflow from physical-device behavior and actual browser zoom. Do not claim external-provider or role coverage without testing it.

## Provenance and boundaries

The source implementation is on `feat/emil-screen-sprints`: accessibility/readability, task hierarchy and touch controls, restrained motion, preparation/empty-state copy, template dialog/editor accessibility, and document reading/review corrections. The report links the screenshots and test evidence. These changes were local; no production deployment was performed.

The user's scope remains existing production features. Admin portal implementation must preserve current role/plan gates and server contracts. Committing, pushing, merging and deployment each follow the user's actual authorization; this memory grants none of those actions.

## Admin review regression references — 18 November 2026

The [completed admin review](docs/reviews/admin-emil/review.md) and [roadmap](docs/reviews/admin-emil/roadmap.md) apply this baseline to the existing Workspace administration screens. Preserve complete Unicode initials and email fallbacks, named/focus-contained dialogs, wrapped identifying team chips/actions, search recovery and the scoped 44px touch controls. Use the local-only `scripts/review-admin-ui.mjs` data switch for future difficult-data regressions; it is not part of the application build.

## Preparation and recipient regression baseline

The [platform break-ui review](docs/reviews/platform-break/review.md) extends this baseline to preparation and signing. Preserve keyboard access to scrolling progress rails; use grapheme-aware participant initials; keep light-surface warning/status/tag text readable. Use the realm-neutral `useModalFocus` helper for modal lifecycle, and keep editor canvas shortcuts inactive inside dialogs. The existing Workspace hook name remains a compatibility alias. UI response simulations are not evidence of real authentication or signature sealing.


## Mobile preparation and signing baseline

The [mobile signing review](docs/reviews/mobile-signing/review.md) records the local mobile-native/break-ui implementation and Emil review. Preserve ink across canvas width/DPR changes and bind each stroke to one primary pointer. Keep Cancel first and background scrolling locked during recipient decision confirmation, including busy-state protections. Use task-scoped viewport/theme ownership with cleanup, dynamic viewport heights, readable coarse-pointer inputs and approximately 44px general controls; preserve PDF geometry and user zoom. Responsive progress styling uses longhands to avoid shorthand conflicts. These are implementation safeguards, not a claim of physical-device acceptance: Safari keyboard/notch/touch behavior remains unverified without hardware.


## Mobile workspace and template baseline

The [mobile platform review](docs/reviews/mobile-platform/review.md) covers templates, tracking and Workspace administration. Preserve reachable editor-header actions with long titles, bounded native-scrolling role strips on phones, shared modal focus/scroll lifecycle, named keyboard-focusable document/record regions, dynamic viewport/safe-area sizing and readable status text. Coarse controls use 44px targets and 16px inputs while positioned PDF fields retain their geometry. Keep hover capability-gated and press feedback immediate. Use `scripts/review-platform-mobile.mjs` for local read-only stress fixtures and `scripts/review-admin-ui.mjs --checks --phone` for interaction regressions. These rules do not authorize deployment or claim physical-phone acceptance.


## Template variable preparation baseline

The [real variable/multiple-role review](docs/reviews/template-variables-roles/review.md) records two validation fixes. Treat whitespace-only required string variables as missing while preserving zero and No. Nonempty static sender-filled fields intentionally have no recipient; exclude them from unassigned-recipient errors without relaxing empty-field, geometry, role-eligibility or signer-signature checks. Verify values, routing and completed artifacts against the real backend when changing this boundary. No deployment authority or external-provider assurance is implied.
