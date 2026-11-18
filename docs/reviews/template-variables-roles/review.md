# Template variables and multiple roles — real local verification

**PASS — 18 November 2026.** Two new QA templates, each with five variable types and an approver, reviewer and signer, completed actual sequential and parallel signing journeys. Six accepted recipient decisions, two worker-produced PDFs and six matching participant downloads. Two local validation defects were found and fixed.

No production access, deployment, push or merge. Frontend `5934a8b` on `feat/emil-screen-sprints`, with existing local work preserved plus the fixes below. Backend `cb3c3b0`, source unchanged. Real browser `localhost:5173`, API `127.0.0.1:8091`, local PostgreSQL, object storage, worker and Mailpit. Existing fictional verified accounts and the synthetic Business QA entitlement were reused. No API interception, response mocks or database truncation.

## Templates, values and fields

Both templates were created through Start from Blank, with required approver/reviewer/signer roles. Five required variable definitions were authored and saved through the Variables tab. The one-page agreement was authored through the editor and generated into a real PDF. Field Placement saved and reloaded five variable-bound text fields plus Approved over Name, Reviewed over Name and a signer Signature: **eight fields per template**.

Variables appear through **placed fields bound to variable keys**. This is not a claim of arbitrary inline token substitution in authored prose or invitation messages.

| Variable type | Sequential value | Parallel value |
| --- | --- | --- |
| Short text | Northwind QA Services | QA Reuse Company |
| Multiline text | Sequential QA only. / No commercial obligation. | Parallel QA only. / Independent variable values. |
| Date | 2026-11-18 | 2026-11-19 |
| Number | 1250.50 | **0** |
| Yes/No | yes | **no** |

The values are preserved in the actual signing-request fields as static text with **no recipient ID**. The three outcome/signature fields retain the correct recipient role bindings and exact saved geometry. The template source document, definitions and layout remain unchanged after completion. Each use owns a document distinct from the source template. All initial empty-required-variable checks blocked progression before a document copy was created.

## Defects fixed and Emil review

| Before | After | Why |
| --- | --- | --- |
| A required short-text value containing only spaces advanced to Review. Resolution later omitted its blank field. | Required string values are checked after trimming for emptiness; undefined/null remain missing. Entered text is otherwise preserved. | Validation now agrees with field resolution and prevents sending a document with an absent required value. Zero and No remain valid. |
| Five valid sender-filled variable fields were reported as unassigned participant fields, blocking Continue in preparation. | The shared placement validator excludes nonempty static sender values from unassigned-recipient errors. | A static variable is already filled and intentionally has no recipient. Genuine unassigned/empty fields, geometry rules, signer signature requirements and role eligibility remain enforced. |

Source: `src/app/pages/platform/templates/UseTemplatePage.tsx:536` and `src/app/services/mock/field-editor.service.ts:248`. The latter is the legacy-named shared **UI validator used by real preparation**; changing it does not replace the backend with a mock or relax backend target checks.

The whitespace failure was reproduced in the real wizard before correction and blocked afterwards: [before](required-whitespace-before.json), [after](required-whitespace-after.json), [before screen](required-whitespace-before.png), [after screen](required-whitespace-after.png). The second failure is recorded in [the blocked preparation screen](sequential-use-debug.png); [after correction](sequential-fields-after-fix.png), the same draft continued and was sent without re-instantiating it.

**Motion verdict:** no new motion, components or features. Existing inline validation and navigation were retained under the saved Emil design standards. No permission, authentication, role, routing or completion contract changed.

## Routing and completion

| Checkpoint | Sequential: approver → reviewer → signer | Parallel: signer → reviewer → approver |
| --- | --- | --- |
| Initial | active / waiting / waiting; 1 invitation | active / active / active; 3 invitations |
| First action | approved / active / waiting; 1 of 3 completed, 2 invitations | active / active / signed; 1 of 3 completed |
| Second action | approved / signed / active; 2 of 3 completed, 3 invitations | active / signed / signed; 2 of 3 completed |
| Final | approved / signed / signed; completed | approved / signed / signed; completed |

At all six intermediate checkpoints the completed-PDF endpoint returned 404. Waiting sequential roles could not continue even with the correct account password: 404 `SIGNING_UNAVAILABLE`. The actionable account inboxes matched the active roles. Invitations were captured locally only after each activation.

Only the signer saw an editable signature field. Approver and reviewer used their own confirmation flows. Cancel recorded no decision; Continue recorded it. Non-approver Skip attempts were rejected. All six successful decisions were replayed with their original idempotency keys and returned the same submission IDs; no duplicate decision/completion event appeared.

The backend uses legacy `signed` for a completed review. The count is completed obligations, not three handwritten signatures. Each request's 15-event chronological audit contains one approval, two legacy signature-completion events (review + signer), three activations, three consents and one completion. Later sequential activation follows the required earlier decision.

## PDFs, downloads and integrity

Both original downloads were parsed with pypdf and rendered with Poppler without rewriting or flattening them. Each contains one page, all source agreement text, all five values, the correct APPROVED and REVIEWED names/dates, and the signer's typed mark. Multiline values render on separate readable lines. In the parallel PDF, `0` and `no` are present as distinct field values. Visual review found no clipping or overlap.

| Workflow | PDF bytes | SHA-256 | Artifact |
| --- | --- | --- | --- |
| Sequential | 1,555,177 | `03b1e845e44a17e84fc440c27e95e788a53fcfa77d2ae3028471398fd26a37b4` | [Completed PDF](sequential-completed.pdf) |
| Parallel | 1,555,489 | `409f1b246a4db65a2afad73026c272522f638f0880fb4d10ea500bd0111d80c7` | [Completed PDF](parallel-completed.pdf) |

All three participants downloaded each completed PDF through normal UI access: approver/reviewer through Shared Documents → Shared with me → Accepted, signer through Documents → Records → Signed by me. All six downloads match the relevant sender download byte for byte. Their audit dialogs loaded the correct approval/review/signing events.

Both verification digests match the downloaded PDFs. File checks accept the corresponding completed PDF, reject its unsigned source, and reject the other workflow's completed PDF. All activity and invitation/completion mail stayed local.

[Verification summary and eight checkpoints](verification.json) · [PDF inspection](pdf-inspection.json) · [Cross-file checks](cross-file-check.json) · [Sequential render](sequential-rendered.png) · [Parallel render](parallel-rendered.png) · [Sequential audit](sequential-audit-trail.json) · [Parallel audit](parallel-audit-trail.json).

## Regression and build evidence

- **152 tests passed in 10 files**, covering template application/handoff, role/field persistence, unfinished-draft protection, required variables, field validation, autofix and the template API adapter. A final focused rerun after test typing cleanup passed **24 tests**.
- Three new UI cases cover whitespace-only required short/multiline values and zero/No retention through Review and Back. Seven new service cases cover three valid static values and four empty/unassigned variants while retaining the missing-signature guard.
- Before the static-field validator correction, three new service cases failed and 18 existing/negative cases passed. All 21 service cases pass after correction. The browser evidence establishes the whitespace regression; the first unit run loaded the corrected source and is not claimed as a failing before-run.
- Scoped ESLint: **0 errors, 1 existing hook-dependency warning** in UseTemplatePage.
- Final typecheck and local production-profile build **passed**. The initial typecheck caught unsupported Playwright-style `exact` options in the new Testing Library test; these test-only options were removed and the 24 focused tests rerun. Build retains the existing large-chunk advisory.

Private raw results and scripts are at `%LOCALAPPDATA%/LAGDA/template-roles-variables-20261118`. Cookies, account passwords, invitation URLs, signing grants, raw mail bodies and browser storage are excluded from repository evidence. Existing local work and QA records were retained; no unrelated data was removed.

## Reproduction and limits

Create a fresh local template with required approver/reviewer/signer roles and five variables. Author and generate its PDF. Place three role blocks plus five text fields bound to the variable keys. Reload to verify persistence. Map verified fictional QA recipients; verify empty and whitespace-only required values cannot proceed, then enter values including zero/No. Review/launch into Prepare, confirm all eight fields and mappings, authorize/send. At each role action, inspect actual signatures state, inbox, captured mail, audit and completed-PDF availability. Complete all roles, download as sender and each participant, parse/render the PDF, compare digests and verify source-template invariants. Repeat with parallel routing and different values. Do not run a truncating integration harness against the local QA database or production.

Retained private helpers: `create.mjs <mode>`, `fields.mjs <mode>`, `use.mjs <mode>`, `act.mjs <mode> <1|2|3>`, `check.mjs <mode> <stage>`, `finish.mjs <mode>`, `cross-check.mjs`; Node 24. `send-resume.mjs` resumed only the owned drafts blocked by the discovered validator issue. Do not rerun Send/creation on completed fixtures; `finish.mjs` rechecks existing completed results.

Covered cases use required roles and five variable types bound to text fields. Optional variables/roles, multiple signers within one template, authored inline-token interpolation, external delivery/billing/identity assurance, physical devices, production behavior and cryptographic trust chains are not certified by this pass. The existing physical-device limitation remains.
