# Real local signing verification

**PASS — 18 November 2026.** Real local backend, database, object store, scanner, worker and captured mail; no API route interception. Fictional QA agreement and identities only. No deployment, push, merge, production writes or remote tests.

Frontend baseline: `5934a8b` on `feat/emil-screen-sprints`, with the existing local UI changes plus the completion-access correction below. Backend baseline: `cb3c3b0`; backend source unchanged. Frontend `localhost:5173`, API `127.0.0.1:8091`, local PostgreSQL `lagda_fresh_dev`, Seaweed S3, ClamAV and Mailpit. A pre-existing synthetic Business workspace entitlement was used; this does not test billing.

## Verified journey

| Transition | Result and evidence |
| --- | --- |
| Upload | Two-page sample agreement persisted through the real document/upload endpoints (201). Local ClamAV enabled and responding PONG. |
| Prepare | QA recipient persisted; Parallel order explicitly selected; required signature block saved on page 2; Review and Authorization completed. Exactly one signing request created for this document. |
| Invite | Actual invitation captured in local Mailpit and opened in a separate recipient browser session. No external mailbox used. |
| Recipient signing | QA account confirmation, consent, typed signature and Submit signature exercised through the UI. Submission returned 201. |
| Completion | Real worker produced completed state and final artifact. Sender completion mail captured locally. |
| Sender download | Native Signed PDF download from the completed viewer succeeded. |
| Recipient download | Records → Signed by me → document actions → View / Download signed document → Signed PDF succeeded using recipient access, independent of sender credentials. SHA-256 equals sender download. |
| Audit | Sender and recipient audit dialogs loaded real events. Authenticated audit response saved as [audit-trail.json](audit-trail.json). Seven chronological events cover creation, sending, activation, viewing, consent, signature and completion. |
| PDF integrity | [Completed PDF](completed-document.pdf): 622,272 bytes, 2 pages, source text preserved on both pages, visible typed QA signature and printed name on page 2. Parsed with pypdf and both pages rendered/visually inspected. Typed signature is vector text, not an image. |
| Verification | Public verification record digest matches the downloaded artifact. Raw file-check accepts completed PDF (`matches: true`) and rejects original (`matches: false`). Anonymous authenticated-download request returns 401. |

SHA-256: `886e6f16fb3fee56969dc2defc19e36bcf2d7a4378b0c73b7eba4a70efac6ea5`.

## Finding and local fix

| Before | After | Why |
| --- | --- | --- |
| Real preparation offered “Email participants the completed document”; Review and Authorization promised a separate download-link email. | Real Settings shows completed-copy access in Records and removes the ineffective email switch. Review and Authorization describe Records access and explicitly state no separate download-link email is sent. | The current worker intentionally no longer produces participant final-copy emails (`packages/worker/src/server/start-worker.ts`, comment “Every participant’s copy (073): no longer produced”). Actual recipient Records access and download passed. |

The existing demo switch, legacy settings shape and send payload semantics remain compatible. Backend delivery was not re-enabled. This is a UI correction to match existing behavior, not a new delivery feature. The corrected Settings screen was also verified in a fresh empty local preparation draft; no upload or invitation was created for that display check. [Screenshot](15-settings-access.png). Motion verdict: no new motion.

Regression: 3 affected test files, **27 tests passed**, including old saved false settings and unchanged legacy send-payload coverage. Typecheck and production build passed. Build emits the existing large-chunk advisory. Repository-wide ESLint exited successfully with 0 errors and 801 warnings; warnings remain in the broader working tree.

## Evidence and reproducibility

Synthetic request identifiers and chronology are in [run.json](run.json). Download checks: [recipient digest](recipient-download.json), [PDF inspection](pdf-inspection.json), [file comparison](file-comparison.json), [local mail/access](delivery-and-access.json).

Screenshots: [saved fields](03-fields.png), [recipient completion](10-recipient-complete.png), [sender viewer](11-completed-viewer.png), [sender audit](12-audit-trail.png), [recipient viewer](13-recipient-records.png), [recipient audit](14-recipient-audit.png), [rendered signed page](completed-page-2.png).

To reproduce, use a fresh uniquely titled local QA agreement: upload → add fictional recipient → choose signing order → place a required signature on the last page → Review/Authorization/send → open its captured Mailpit invitation in the recipient session → confirm account → consent/sign/submit → wait for worker completion → download as both actors → compare SHA-256 and audit events. Do not reuse a sent fixture to send again. Do not run the truncating integration harness against this database or production.

Harness corrections, not application defects: explicitly select required routing; switch to page 2 before asserting its field visibility; use the actual `signature-completed` event vocabulary; inspect vector text rather than require an image; wait for the loading overlay to settle before contrast measurement; use the recipient card actions menu and its Signed PDF **button** rather than the sender viewer’s link; create an empty draft before inspecting Settings, since deep links without a draft correctly redirect to preparation entry. First-run diagnostics remain privately in the local run directory. Settled automated accessibility scans for upload, preparation, signing, sender viewer and audit reported no violations; this is not a full accessibility-conformance claim.

QA records/artifacts are retained locally for review. Credentials, browser sessions, invitation URLs, temporary grants and mail bodies are excluded from this evidence folder. No external SMTP delivery, production behavior, identity-provider assurance, cryptographic trust chain, billing or multi-recipient permutations are certified by this single local happy-path test.
