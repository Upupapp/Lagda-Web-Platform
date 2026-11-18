# Platform break-ui review and fixes

18 November 2026. Local branch `feat/emil-screen-sprints`. Earlier local changes are retained. Nothing was pushed, merged or deployed; backend tracked source is unchanged.

Scope: the existing preparation flow, field editor and recipient signing screens, plus Documents, populated Contacts, Templates, Shared Documents, Notifications, Profile and Security. This is a risk-based UI/data review, not a claim that every route or external integration was exercised.

## Test boundary and fixtures

`scripts/review-platform-ui.mjs` exercises the actual local React screens at 1440, 390 and 320 CSS pixels. Phone contexts have touch/coarse-pointer emulation. Preparation is hydrated through the existing draft-storage boundary; API response fixtures provide the matching document, recipients and field geometry. The PDF bytes are the existing local synthetic training PDF from the earlier signing verification.

The recipient runner intercepts bootstrap, ceremony, consent and submission calls. Its completion is a **simulated response**, not a new server signature record or a test of authentication, cryptographic sealing or delivery. All other non-read API requests are blocked by the harness. Existing local server sessions establish the sender's normal workspace/plan; no role/capability gate in application code was relaxed. No invitation, reminder or external-provider request was sent.

| Data | Source / bound | Cases |
| --- | --- | --- |
| Document title / filename | Document metadata; title contract max 300 characters | Ordinary title and plausible long legal agreement title/version |
| Participant name | Recipient API; max 200 | Long Polish name, emoji-first name, CJK, Vietnamese, Arabic and Jo |
| Email / organisation | Recipient API; max 254 / 200 | Long company-domain address, short synthetic addresses, long department name and absent organisation |
| Collection | Draft and recipient list | Empty, one, six and schema maximum 50 participants |
| Roles | Existing backend vocabulary | Signers plus an approver in preparation; recipient browser ceremony uses signer |
| Fields | Existing preparation/ceremony response | Required signature and text; crowded/overlapping geometry for validation; no assigned fields |
| Request state | Recipient response | Consent, active, missing input, completed UI response, waiting, expired and failed PDF load |
| Contacts | Contact-list response | Populated international names, long title/organisation, multiple tags, optional nulls; existing empty-state tests remain |

Fixture states are kept beside the existing harness fixtures. `--interactive` supports a local preparation walkthrough with Demo data / Worst case / Empty / 50 people controls; the selection is in the URL and survives reload. Hide removes review chrome. The harness is not imported into application code or production bundles. It does not rewrite production data or modify backend contracts.

## What broke and was repaired

| # | Severity | Worst-case field/state | Before | After / fix |
| --- | --- | --- | --- | --- |
| P1 | Broken | Signing progress at 390px | The one-line progress list scrolled horizontally without keyboard access. | `components/system/design-system.tsx`: focusable when it opts into the compact scrolling rail. |
| P2 | Broken | No participants | Warning text was 2.54:1 on its amber background. | `pages/platform/prepare/ParticipantsStep.tsx`: existing ON_LIGHT gold foreground. |
| P3 | Ugly | 👩🏽‍💻 Priya in preparation | `charAt(0)` split the emoji into a surrogate fragment. | `ParticipantsStep.tsx`: reuse the shared grapheme-aware initials helper. |
| P4 | Broken | Signature-capture sheet | No complete Tab containment, Escape dismissal or trigger-focus restoration. | `components/recipient/PositionedSigningSurface.tsx`: shared modal focus lifecycle and 44px close control. |
| P5 | Broken | Editor drawers, sheets and preparation prompts | Several dialogs handled only Escape or initial focus; Tab could reach controls behind them. | `EditorMobileChrome.tsx`, `MissingItemsModal.tsx`, `FieldsPage.tsx`, `PrepareLayout.tsx`: shared focus lifecycle, preserving safe Keep editing first focus and existing placement behaviour. |
| P6 | Broken | Escape in field validation | The canvas shortcut handler consumed Escape before the modal could dismiss. | `hooks/useFieldEditorShortcuts.ts`: ignore handled events and keys originating inside dialogs/alert dialogs. Verified in the actual phone editor. |
| P7 | Broken | Populated template / notification status | Available and Warning text failed measured contrast. | `TemplatesPage.tsx` and `NotificationsPage.tsx`: existing ON_LIGHT success/gold foregrounds. |
| P8 | Broken | Populated contact job title, timestamp and tags | Secondary metadata and Client/Finance tag text failed contrast. | `ContactsPage.tsx`: readable light-surface foregrounds; retain tag background/border colour cues. |
| P9 | Broken | Missing-items prompt step labels | Amber label text reused the icon colour on a pale amber surface. | `MissingItemsModal.tsx`: readable gold text; decorative icon colour remains separate. |

Paths above are under `src/app`. Fix locations are directly searchable by the named components/functions. The source edits add no product feature or UI dependency.

## Emil implementation review

Used `break-ui` for data/state adversarial testing and `emil-design-eng` for the corrections against saved DESIGN.md standards. The user's instruction explicitly authorized fixing findings automatically; no additional fix-approval pause was needed.

| Before | After | Why |
| --- | --- | --- |
| Empty screens passed while populated cards failed. | Both empty and populated data are exercised; status/tag text uses established light-surface tokens. | Accessibility depends on the rendered state and background. |
| Modal keyboard behaviour was repeated inconsistently. | Neutral `useModalFocus` helper shared across sender/recipient screens, with the old Workspace alias retained. | Prevent recurrence without importing sender services into the recipient realm. |
| Editor shortcuts acted behind modal controls. | Canvas shortcuts stay out of active dialogs. | Escape and Delete must belong to the control the user is using. |
| Names were handled by UTF-16 code units in one participant avatar. | Existing grapheme-aware helper used consistently. | Preserve international identity text. |

Existing backend permissions, recipient session/CSRF separation, signing rules, confirmation text and server contracts remain. The generic focus helper only imports React and DOM APIs. Its active-modal check recognises both dialogs and alert dialogs. No new motion was added or tuned in this work.

## Verification

- Preparation: **63 scans** across all eight steps for ordinary/difficult data, empty upload/participants and 50-participant views. Zero remaining axe violations or document-width overflow.
- Recipient: **30 scans** through consent, document/fields, signature capture, simulated completion and no-fields states. Signature capture Tab containment, Escape and trigger return were asserted; typed signature and text input reach the completion UI through intercepted responses.
- Recipient edge states: **18 scans** covering waiting, expired and failed document load. Zero remaining violations/overflow.
- Editor: **8 scans** of field canvas, validation and phone page drawer; forward/reverse Tab, Escape and return focus checked. The initial Escape failure was repaired and rerun. An initial harness selector used the visual Pages caption instead of the accessible Show documents and pages name; corrected without changing the product label.
- Other platform pages: **21 scans**, including populated Contacts, long document/request/template titles and existing notifications. Final results have zero remaining violations/overflow.
- Broad affected regression run: **63 files / 741 tests passed**, exit 0. After the final keyboard change, **4 files / 47 tests passed**, including modal-shortcut isolation, editor focus and template-library behaviour. Focused signature/progress and preparation-dialog runs also passed.
- Typecheck, repository lint (zero errors; existing warnings remain), production-profile local build and diff whitespace checks passed. Existing build chunk-size/import warnings remain.

The 140 browser scans above are repeated screen/state/width checks, not 140 distinct features. Screenshots and sanitized result JSON are in [evidence](evidence/). Browser credentials, cookies and storage states remain outside Git under local AppData.

## Limits and what held up

Long titles and international names remained contained without page overflow on the verified screens. Existing recipient-field positioning, required-input UI, field validation presentation, list/empty separation and 50-recipient rendering held up after the repairs. Crowded field geometry is a validation fixture, not an instruction to silently move or change a sender's fields.

No physical phone, actual browser 200% zoom, real identity/payment provider or exhaustive role-by-role browser walkthrough was verified. Authentication/identity/other recipient roles have affected unit coverage, but the browser signing fixture is a signer. Server-side upload/scanning, delivery and signed-PDF cryptographic validity were not re-established by response simulations. Those boundaries remain separate from this UI review. No deployment is authorized or performed.
