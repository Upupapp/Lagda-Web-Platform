# LAGDA screen improvement roadmap

Created 18 November 2026 from the [Emil skills screen review](reviews/emil-2026-11-18/review.md).

Improve the screens and interactions already present in production. This roadmap adds no product features and does not implement items from the older Deferred Feature Roadmap. Keep current permissions, plan gates, signing rules, document evidence and server contracts intact. All changes and validation belong in local development first; deployment requires a separate instruction.

## Baseline

Frontend `5934a8b`, backend `cb3c3b0`. The 20 Emil skills are installed and verified against upstream `64eb3deb`. The review used `emil-design-eng` on the local real-backend replica. Its evidence distinguishes measured defects, design recommendations and screens not yet covered.

- [x] Verify installed skills and the current source baseline.
- [x] Review representative existing desktop and mobile screens and record screenshots and accessibility evidence.
- [x] Create this roadmap from the review.
- [x] Implement E01–E09 through all four sprint cycles.
- [x] Complete the available local review and sender/recipient/template flow checks; retain explicit device/provider limits in the [implementation review](reviews/emil-sprints/implementation-review.md).

## Sprint execution standard

Each phase below is a sprint. Execute in order without requesting routine confirmation: implement, review with Emil skills, repair findings, run the relevant checks, record evidence, then advance. A failed check must be repaired or clearly classified before advancement. Keep work on `feat/emil-screen-sprints`; no merge, push or production deployment is included.

| Sprint | Implementation skills | Review skills | Exit gate |
| --- | --- | --- | --- |
| 1 Accessibility and readability E01–E04 | `emil-design-eng` | `emil-design-eng` plus browser accessibility checks | Labels, unread semantics and recorded contrast defects pass at desktop and phone sizes. |
| 2 Existing task usability E05–E07 | `emil-design-eng`, `mobile-native` for touch controls, `remove-animations` for frequent navigation motion | `emil-design-eng`, `review-animations`, `mobile-native` | Task actions stay prominent, touch targets fit and keyboard navigation is immediate. Record physical-device limitations separately. |
| 3 Existing state consistency E08–E09 | `emil-design-eng` | `emil-design-eng` | Preparation copy matches the actual flow; empty-library and filtered-no-results states have appropriate existing actions. |
| 4 Integration and final review | `emil-design-eng` for any corrective UI edits; use only the narrower skill relevant to a reproduced issue | `emil-design-eng`, `review-animations` for changed motion, `mobile-native` for phone behavior | Relevant tests/build and local real-backend flow checks pass. Preserve explicit device/provider coverage limits. |

Review output uses Before / After / Why tables. A narrower skill is applied only to its relevant scope; installing the full collection does not mean running every skill on every component. If a regression appears, fix and repeat that sprint's review before proceeding. Deployment readiness evidence does not authorize deployment.

## Phase 1 Make existing controls readable and accessible

| Work | Scope | Acceptance |
| --- | --- | --- |
| **E01 Profile field labels** | Associate Full name and Display name with their existing inputs through `SField` IDs and `htmlFor`; associate help/error text. | Clicking each label focuses the field; accessibility-tree names are correct; axe label failures disappear on desktop and phone; existing save and validation still work. |
| **E02 Template sorting label** | Associate the current Sort caption and select; retain every current sort option. | Accessible name is Sort; keyboard selection and sorting still work; axe select-name is clear in both layouts. |
| **E03 Text contrast** | Fix shared active-navigation, preparation helper and public/auth text combinations from the review. Use existing brand tokens with darker readable foreground variants where needed. | Recorded failing text meets 4.5:1, or 3:1 for qualifying large text, against its rendered background. Recheck active, hover, focus and error states. Disabled controls are assessed separately. No global recoloring without checking other screens. |
| **E04 Unread indicator semantics** | Repair the notification card's unread status announcement and decorative dot. | Unread state is announced meaningfully, read state is not mislabeled, no prohibited ARIA attributes remain, and mark-read/unread behavior is unchanged. |

Complete Phase 1 before visual-quality approval. Add focused regression coverage for these real accessibility defects rather than tests that only repeat class names or implementation details.

## Phase 2 Make existing work easier to reach

| Work | Scope | Acceptance |
| --- | --- | --- |
| **E05 Phone toolbar controls** | Enlarge template sort/direction/grid/list activation areas and let the existing toolbar wrap gracefully. Check equivalent controls on Documents and Contacts. | Approximately 44px touch activation areas at 390px; visible focus; no overlapping controls at 320px or 200% zoom. Existing search, filters, sorting and view persistence still work. |
| **E06 Task hierarchy** | Put Dashboard document actions/status and Templates library controls ahead of large promotions. Keep existing upgrade access available in a secondary position. | At 390 by 844 and 1440 by 1000 the relevant existing task action is easy to locate without scrolling through promotions. Plan prices, limits, entitlements and upgrade behavior remain intact. Compare screenshots before and after. |
| **E07 Frequent-action motion** | Remove repeated route entrances, especially keyboard navigation; replace shared `transition-all` with bounded properties; simplify sidebar width motion. | Keyboard navigation responds immediately. Buttons, menus and sidebars retain clear focus/press feedback. Rapid open/close remains stable; reduced motion continues to suppress movement. Do not add decorative animation as compensation. |

Reuse current components and libraries. Do not introduce a new UI library, chatbot capability, pricing model or navigation destination.

## Phase 3 Make existing states consistent

| Work | Scope | Acceptance |
| --- | --- | --- |
| **E08 Preparation wording** | Align step cards, headings and entry/help copy with the existing eight-step sequence and supported participant roles. Correct Review text that still describes field placement as a future step after fields have already been placed. | Users see consistent names through upload, participants, order, settings, fields, authentication, review and authorization. Copy describes the actual order; no routing or signature rules change. |
| **E09 Template empty states** | Differentiate an empty library from a search/filter with no matches using existing actions. | New users get one clear Create Template prompt; filtered no-results offers the existing reset path. Loading and errors remain separate from both empty states. |

## Phase 4 Verify the implemented roadmap against existing flows

Review again using `emil-design-eng`, recording a Before / After / Why table for remaining findings. Use `review-animations` when examining motion, `animation-performance` only for measured motion performance concerns, and `mobile-native` when checking phone interaction behavior. Apply each skill's instructions when used. Generate any subsequent roadmap only from reproduced issues in the existing production feature set.

- [ ] Recheck every changed screen at desktop, 390px, 320px, reduced motion and actual 200% browser zoom. Check keyboard focus, dialog dismissal/return focus and usable scrolling.
- [x] Complete the existing sender journey locally with synthetic data: upload, recipients, order, settings, fields, authentication, review and authorization. Confirm drafts survive reload and navigation.
- [x] Inspect existing request detail/progress/reminder, correction/cancellation and template creation/use screens with representative local states; preserve all current permissions and confirmations.
- [x] Complete a fictional local recipient signing journey and inspect completion, PDF and audit download screens. Use only local captured email; never send invitations or reminders to production recipients.
- [ ] Recheck authenticated verification, notifications, shared documents, invitations, profile/security and currently entitled settings screens. Document paid-plan or external-provider checks separately when the local fixture cannot exercise them.
- [x] Confirm existing hidden/gated modules remain hidden/gated. Do not enable enterprise-preview to inflate coverage or add deferred features to this roadmap.
- [x] Run current supported typecheck, lint, unit tests and build, plus affected browser/accessibility/responsive checks. Review failures against the baseline instead of attributing every failure to UI changes.
- [x] Audit the existing Playwright configuration before using its results: it currently builds enterprise-preview with an empty API URL and uses demonstration fixtures. Those tests supplement, but do not establish, default-profile real-backend parity. Use the isolated local backend for real-flow verification; never use a truncating harness against production.
- [x] Capture before/after evidence, record source SHAs, disclose untested screens/providers/devices and retain any unresolved findings with priorities.

## Completion criteria

E01–E09 have implementation evidence and pass their acceptance checks. Existing production flows keep their behavior and data boundaries. The final review contains no unresolved critical/serious accessibility defects within the verified screens and no blocking usability regression. Any unverified role, paid-plan, device or provider case remains explicitly open rather than being labeled passed. No merge or deployment is part of this roadmap.

## Implementation result

All four local implementation/review cycles are complete. See the [sprint report](reviews/emil-sprints/implementation-review.md) for skills, Before/After/Why findings, repairs, evidence and verification limits. Unchecked device/provider coverage above remains unverified; no deployment was performed.
