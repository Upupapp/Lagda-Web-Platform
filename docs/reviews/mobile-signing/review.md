# Mobile preparation and recipient signing review

18 November 2026. **Local browser/code review and fixes completed; physical-phone validation remains unverified.** Applied `mobile-native`, `break-ui`, then `emil-design-eng` against saved DESIGN.md. User authorization included automatic fixes. No deployment, push, merge, production access or backend source changes.

Frontend baseline `5934a8b`, branch `feat/emil-screen-sprints`, retaining prior local work. Real API is `127.0.0.1:8091`; local web app is `localhost:5173`. No connected Android/iPhone or device-debugging tool was detected. We did not substitute browser emulation for a physical-device claim.

## Surface and data inventory

| Rendered values | Boundary / bound | Cases |
| --- | --- | --- |
| Participant names, initials, email and organisation | Existing draft/recipient API; name 1–200, email up to 254, organisation up to 200; organisation optional | Long hyphenated name, combined emoji, CJK, Vietnamese diacritics, Arabic, short Jo; long domain and absent organisation. Shared initials unit coverage also retains suffix and empty-name handling. |
| Document title, filename and internal description | Existing upload/draft metadata; transaction title input 200 (document API supports 300); internal note input 1,000; no separate filename display limit found | Ordinary training file and plausible long agreement title/version; empty upload and loaded file. |
| File size, page count and PDF state | Source metadata and document bytes; upload UI advertises 20 MB and 10 files; no separate display-only page-count limit found | Two-page training PDF; loading, ready, no assigned fields and failed document load. |
| Participant totals, order, roles and routing-group label | Draft participants; backend `MAX_RECIPIENTS_PER_PREPARATION = 50`; existing role/mode enums | Empty, one, six international participants and the real 50-person ceiling. No invented 1,000-person fixture beyond that contract. Long routing label and sequential/parallel controls. |
| Reminder numbers, expiry and authentication labels | Existing settings model; visible reminder inputs 1–30 days, optional expiry from today, existing authentication vocabulary | Default settings and optional disabled sections; form sizing/focus/scroll checked. Numeric bounds were preserved, not changed or server-fuzzed in this UI pass. |
| Field labels, ownership, geometry and validation | Preparation/recipient response; normalized PDF rectangles; text maximum supplied per field (fixture 200) | Long signature/text label, required/missing text, overlapping geometry shown as validation errors, no fields; original field positions retained. |
| Adopted signature/initials, drawn pixels and image preview | Capture props; typed limit 200; PNG limit 64 KiB, maximum output dimension 512, source-photo processing cap 1,600 | Typed and drawn capture, multiple strokes, width change, unrelated pointer, invalid right click; upload-related contract regressions retained. |
| Consent/status/confirmation copy and timestamps | Existing ceremony/access enums and server-derived ISO timestamps | Consent, active, simulated completed UI, waiting, expired, PDF failure; approver/reviewer confirmations and Cancel/Escape/busy behavior. |

Static interface labels were exercised with the screen states, not replaced with fake translations. The product remains a light English interface; Arabic content coverage is not a claim of full RTL UI support or a dark theme.

## What broke and was fixed

| # | Severity | Field / worst case | Before | Fix and reason |
| --- | --- | --- | --- | --- |
| M1 | Broken | Drawn mark, 390 → 320px width | Canvas reset erased all visible ink (174 opaque pixels → 0), while the previously adopted value could remain. | `src/app/components/recipient/SignatureCapture.tsx:358`: copy pixels before resizing, preserve handwriting proportions and finish an interrupted active stroke. Final probe retains visible ink (174 → 148 after resampling). |
| M2 | Broken | A second touch during a signature | Secondary pointer added 133 pixels on the other side of the pad and could finish the active stroke. | `src/app/components/recipient/SignatureCapture.tsx:435`: one primary active pointer owns the stroke; unrelated moves/releases and non-left mouse presses are ignored. Pointer-capture loss ends only its own stroke. |
| M3 | Broken | Review/approval confirmation over a long contract | Focus was managed, but background document scrolling was not locked. | `src/app/components/recipient/ConfirmActionDialog.tsx:43`: reuse realm-neutral modal focus/scroll lifecycle. Cancel remains initial focus; busy Escape protection remains. Both short-screen confirmations retain reachable actions and lock the background. |
| M4 | Fragile | Phone text input, including text placed on a PDF | Preparation inputs used 14px; a document-field input could compute to 11px, below Safari's input-zoom threshold. | `src/app/components/recipient/PositionedSigningSurface.tsx:527` and `src/styles/theme.css:513`: 16px editable text on coarse-pointer forms; in-document text editing explicitly 16px. This changes the editing control, not the stored PDF rectangle or merge typography. Actual iOS zoom behavior still needs hardware verification. |
| M5 | Fragile | Reorder/edit/remove, tags, step arrows, editor menu and return link | Numerous 26–38px controls on phones. | `src/styles/theme.css:513`: scoped 44px coarse-pointer controls and nested radio/checkbox labels. The editor menu's inline 38px minimum received a targeted override. Retested at 320/390px with ordinary and difficult data. PDF positioning/drag geometry is excluded from blanket sizing. |
| M6 | Fragile | Browser chrome, notch and keyboard changing available area | Some task shells/sheets used static `vh`; safe-area declarations had no viewport-cover opt-in; browser theme stayed navy over white task headers. | `src/app/hooks/useFlowViewport.ts:4`, `src/app/components/prepare/EditorMobileChrome.tsx:132`: task-scoped viewport/keyboard directives, `dvh`, safe-area-aware header/footer/modal padding, matching white browser theme. Previous metadata is restored on leaving the flow. No zoom restriction was introduced. Hardware-specific behavior is not certified. |
| M7 | Ugly | Rotating the signing progress rail | React warned about removing `paddingBottom` beside `padding`, and `rowGap` beside `gap`, risking lost spacing. | `src/app/components/system/design-system.tsx:410`: use consistent longhand padding and gap properties across layouts. Responsive unit and browser checks now produce no style warnings. |
| M8 | Fragile | Touch hover and reduced-motion step navigation | Mouse hover handlers could leave feedback on touch; explicit smooth arrow scrolling ignored reduced-motion preference. | `src/app/pages/platform/prepare/PrepareLayout.tsx:261`: capability-gated CSS hover, immediate press feedback, reduced-motion-aware scrolling. Existing useful progress feedback stays; no decorative motion was added. |

The browser/field-size findings above distinguish directly reproduced failures from platform risks inferred from measured CSS. The user already authorized fixes; no additional design-approval pause was needed.

## Emil review

| Before | After | Why |
| --- | --- | --- |
| The capture could show a blank pad while retaining an adopted mark. | Visible mark survives resize and only the drawing pointer can change it. | What the recipient sees must agree with the mark they are adopting. |
| Phone controls retained desktop density. | Coarse-pointer form controls gain readable text and usable targets; desktop density and PDF coordinates stay scoped. | Improve the physical interaction without rewriting field placement. |
| Confirmation had a separate partial modal implementation. | Shared modal lifecycle, safe Cancel focus and existing busy protections. | Keep consequential decisions deliberate and predictable. |
| New viewport behavior could otherwise affect unrelated pages. | Only preparation, recipient and account-confirmation flows own the opt-in and restore prior metadata. | Scope the repair to the requested product surfaces. |
| Responsive shorthand styles produced warnings. | Stable longhand properties and reduced-motion-aware navigation. | Correct interruption/reflow behavior; motion verdict: no new animation. |

## What held up / decisions

Long names and document titles stayed contained, initials preserved complete graphemes, and existing source text/field ownership/required-input UI remained intact. Empty/one/50-person states, validation sheets, page drawers, signature capture focus containment, Escape and trigger-focus restoration passed the selected checks. Editable form growth stayed inside the scrollable preparation area; footer actions remained accessible.

No unresolved design choice was handed back. Identity text wraps; secondary email metadata retains its full value through the existing title/edit paths. PDF rectangles and drag handles keep their document-relative geometry; normal controls receive the mobile foundation. The 50-person server ceiling bounds the large-list fixture.

## Browser and regression evidence

- **147 automated screen checks**, including focused rechecks after the final editor-menu fix: zero recorded document-width overflow or axe violations. [Summary](evidence/summary.json) lists the raw files and follow-up target findings. Repeated checkpoints are not distinct features or a complete accessibility-conformance claim.
- Profiles: 320×640, 390×844, 844×390 landscape, 1440×1000 desktop and a 390×420 short-viewport keyboard approximation. Coarse-pointer checks finish with no measured sub-16px inputs or undersized general controls. Canvas/annotation geometry is intentionally not expanded.
- Root font raised to 200% in selected desktop preparation and phone recipient runs. This is a root-font/reflow check, not actual browser zoom, iOS text scaling or a physical software keyboard.
- [Gesture before](evidence/before-gesture-checks.json) / [after](evidence/after-gesture-checks.json): resize retains ink; secondary touch cannot add ink; approver/reviewer short-screen actions remain reachable; background scroll is locked. [Style warnings](evidence/after-style-warnings.json) is empty after the rail fix.
- [Dataset toggle](evidence/toggle-checks.json): Demo data / Worst case / Empty / 50 people all switch at the draft-storage/API-fixture boundary and persist through reload. Chrome is harness-only and excluded from product target metrics.
- **196 tests across 16 affected files**, plus **9 editor-menu tests**: 205 passing tests in 17 files. The two test files adjusted for lint were also rerun (6 tests). Coverage includes capture wire/provenance, pointer ownership, viewport metadata ownership/cleanup, modal busy handling, recipient gates, editor fields/drawers, preparation navigation and progress reflow.
- Final typecheck, local production-profile build and whitespace diff checks pass. Scoped ESLint passes with 0 errors and 25 warnings in the touched set; the final editor-menu lint also passes. Warnings concern existing test DOM access, export organization and hook dependencies. Build retains its large-chunk advisory.

The UI runner blocks server writes and simulates recipient bootstrap/ceremony/submission responses. Its simulated completion is **not** a backend signature. Screenshots in AppData cover the matrix; representative evidence is retained here: [participants at 320px](evidence/final-worst-participants-small.png), [settings](evidence/final-worst-settings-phone.png), [field editor](evidence/targets-worst-fields-small.png), [confirmation in landscape](evidence/after-reviewer-landscape-dialog.png), [preserved ink](evidence/after-draw-after-resize.png).

## Separate real-backend drawn-signature verification

One new fictional local request tested the changed capture against the actual API, database, object store and worker. Browser drew a stroke at phone width, resized to 320px, confirmed ink remained, added another stroke, then submitted through the normal UI (201). An exact idempotent retry returned the same accepted submission. Actual captured local mail and verified QA account were used; no external invitation was sent.

Worker completed the request. Sender and recipient downloaded matching PDFs; the public file-check accepts the result and rejects the unsigned source. The seven-event audit contains consent, signature and completion. Parsing preserves both source pages/text, a drawn signature image on page 2 and the printed QA name. Poppler render was visually inspected without rewriting the downloaded PDF.

[Completed QA PDF](evidence/completed-drawn-qa.pdf) · [Audit](evidence/real-audit-trail.json) · [Inspection](evidence/real-pdf-inspection.json) · [Download comparison](evidence/real-download-comparison.json) · [Rendered signed page](evidence/real-signed-page-2.png).

PDF SHA-256: `6f681454e5fd091d21a76592dbb7c59ac7c5a6f54937f33c24d7876a36f92952` (299,638 bytes). Synthetic identifiers are in [real-run.json](evidence/real-run.json). QA credentials, cookies, browser storage, invitation URLs, handoff codes and mail bodies remain outside Git.

## Local reproduction and limits

Run `node scripts/review-signing-mobile.mjs --section=preparation --profile=phone` or `--section=recipient`; profiles include small, landscape, desktop and keyboard. `--dialogs`, `--edges`, `--large-text`, `--field-targets` and `--toggle-check` provide the focused checks. `--interactive --profile=desktop` opens the local dev-only data switch; Hide removes the review chrome. Run `node scripts/review-signing-gestures.mjs --phase=after` for pixel/pointer/modal regressions. These scripts require the existing private local QA session/PDF fixture and are not imported into the production application. The app remains running locally.

**Physical-device acceptance is unverified.** No attached phone was available. Safari input zoom, true soft-keyboard resizing, sticky hover after a finger tap, native picker/camera behavior, browser chrome/notch insets and touch feel cannot be certified by these emulated/scripted checks. No PWA installation, external identity/billing integration, production behavior or legal/cryptographic trust assurance is inferred from this pass.
