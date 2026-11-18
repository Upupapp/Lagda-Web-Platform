# Approver, reviewer and signer workflows — real local backend

**PASS — 18 November 2026.** Four actual QA signing requests: three completed workflows and one declined request. Eight accepted submissions, one approval skip and one approval decline. All activity stayed local. No deployment, push, merge, production access or backend source changes.

Frontend baseline `5934a8b` on `feat/emil-screen-sprints`, with preserved local work plus the corrections below. Backend baseline `cb3c3b0`. Real browser `localhost:5173`, API `127.0.0.1:8091`, local QA PostgreSQL, S3 object store, scanner, worker and captured Mailpit mail. Existing fictional Business sender and three verified QA identities/workspaces were reused. Two-page sample document says it is training material, not a real contract. No integration-test database truncation or API response interception.

## Routing and completion matrix

| Scenario | Actions and persisted state | Result |
| --- | --- | --- |
| Approval-based, all required | Approver + reviewer active at step 1, signer waiting at step 2. Reviewer finishes first: signer stays waiting. Approver approves: signer activates. Signer signs last. | Completed only after all three obligations. Final states `approved / signed / signed`. |
| Parallel mixed roles | All three activated/invited at send. Signer signs first, reviewer records review second, approver approves last. | Request and PDF remain incomplete at 1/3 and 2/3; completed at 3/3. |
| Sequential with approval skipped | Approver alone active at step 1; Skip records `skipped` and activates reviewer at step 2. Review activates signer at step 3. | Skip satisfies that approver's obligation without asserting approval. Final states `skipped / signed / signed`; completed PDF stamps SKIPPED. |
| Declined approval | Approver and reviewer active; signer waiting. Approver declines using UI confirmation and a reason. | Request becomes `declined`. No completed PDF. All three accounts denied continue (404); the previously issued reviewer email link returns 410 `signing_request_declined`. No signer activation or completion event. |

At every intermediate checkpoint we compared actual signatures state, required/completed counts, actionable account inboxes, Mailpit invitations and completed-document availability. Waiting participants receive no invitation until activation; correct-password attempts to continue return 404 `SIGNING_UNAVAILABLE`. A terminal request is closed even when a recipient's historical row still says `active`.

The backend uses the legacy `signed` state/event for a completed review; the UI correctly says “Mark as reviewed” and “Your review was recorded.” `signedCount` is a **completed-obligation count**, including approved or skipped approvers. It is not a count of handwritten signatures.

## Role actions and persistence

- Only the signer sees an editable signature field. Reviewer and approval blocks are server-stamped; approvers are not required to fill an optional approval block.
- Approve and Mark as reviewed use their distinct confirmation dialogs. Cancel caused no submission; Continue recorded the decision. Successful screens use role-specific wording.
- Non-approver Skip attempts were rejected with 409 `signing_skip_not_permitted`. This did not change participant state.
- All eight accepted submissions were replayed with their original idempotency keys: 201 and the same submission ID, with no duplicate audit decision or completion.
- All three completed requests have 15 chronological audit events and exactly one completion. Each includes one `approval-completed` or `participant-skipped`, plus the review and signer completion events. Later routing activations occur only after decisions from every earlier required step.
- Approvers/reviewers downloaded from **Shared Documents → Shared with me → Accepted**; signers downloaded from **Documents → Records → Signed by me**. All nine participant downloads match their sender's PDF hash. All nine participant audit dialogs loaded the corresponding role decisions.
- Stored verification hashes match the downloads. Raw file checks accept each completed PDF and reject the unsigned source.

## Local defects corrected

| Before | After | Why |
| --- | --- | --- |
| Real Order offered “Any one participant completes” and previewed that rule, although only routing order is saved to the backend and every required participant gates advancement. The actual QA reviewer completed under this selection, but the signer remained blocked for the approver. | Real-backend groups state **All required participants must complete**; unsupported any-one controls are absent. Old local/demo `any` values normalize to `all` on reconciliation. Demo-only choice remains compatible. | Prevents a false promise without introducing quorum behavior or changing the existing backend contract. [Mismatch evidence](any-rule-mismatch.json). |
| Approval-based notice said LAGDA did not record a separate audit approval. | Notice explains recorded approval/review/skip decisions, skip versus decline, and retained legal-validity limits. | Real backend records `approval-completed` and `participant-skipped` and produces role-specific PDF stamps. |
| Dashboard, correspondence and completed/shared cards called generic completed-participant counts “signed,” including approved/skipped/reviewed recipients. | Visible and accessible progress labels use **completed**. | A 3/3 completed request with one signer must not claim three signatures. [Real screen](completed-progress-after.png). |

Source: `RoutingStep.tsx`, `CompletedDocumentCards.tsx`, `DocumentsPage.tsx` and `RealDashboard.tsx`. Existing authentication, role permissions, field requirements, routing order and backend completion rules remain intact. Motion verdict: no new motion. Changes reuse existing controls, layout and tokens under the saved Emil standards.

## Verification

**60 tests passed across 5 affected files.** The new routing regression has six tests covering four modes, old any-one settings, truthful approval copy and demo compatibility. Before the fix five of those cases failed; all six pass afterwards. The progress regression failed on its old “signed” wording and passes with the corrected visible label. Other affected Documents, Shared Documents and Dashboard tests pass.

Typecheck, production build and `git diff --check` passed. Scoped ESLint exited successfully: **0 errors, 5 existing warnings** in touched files. Build retains the existing large-chunk advisory. The entire repository test suite was not rerun; checks were scoped to the changes plus actual backend journeys.

## Completed artifacts

Each PDF retains both source pages/text, one visible typed signer signature and printed name, a REVIEWED stamp with reviewer name/date, and APPROVED or SKIPPED with approver name/date. Saved rectangles do not overlap. All three signed pages were rendered with Poppler and visually inspected; fallback font notices did not prevent legible output. QA inspection did not modify or flatten the downloaded PDFs.

| Scenario | Bytes | SHA-256 | Download |
| --- | --- | --- | --- |
| gate | 937,864 | `5bd18c677ab1e7641a213212053b2b770eb8149d26822b0c8e3ae2a1828f16f0` | [gate PDF](gate-completed.pdf) |
| parallel | 937,876 | `14d15ae991abb6fe33315c883cfb7d6c32613ed7aba61e81329cea701392dea6` | [parallel PDF](parallel-completed.pdf) |
| skip | 937,874 | `8371b851adefb65489e0c07b083d6b9de232f9ebb9ca9759aa30aeaa8ea69340` | [skip PDF](skip-completed.pdf) |

[PDF inspection](pdf-inspection.json) · [Gate audit](gate-audit-trail.json) · [Parallel audit](parallel-audit-trail.json) · [Skip audit](skip-audit-trail.json) · [Decline audit](decline-declined-audit.json).

[Original misleading Order screen](gate-routing.png) · [Corrected Order screen](decline-routing.png) · [Approved PDF render](parallel-signed-page-2.png) · [Skipped PDF render](skip-signed-page-2.png).

Individual `*-checks.json` files preserve initial, intermediate and final assertions. `*-recipient-downloads.json`, `*-file-comparison.json`, `*-retry.json` and `*-skip-denial.json` preserve access, digest, retry and role-denial results. Raw test before/after logs are retained. Synthetic request IDs, document fields and recipient assignments are in each `*-run.json`. Credentials, browser cookies/sessions, invitation URLs, handoff codes, temporary grants and mail bodies are excluded.

## Reproduction and limits

Create fresh uniquely titled local requests from the training PDF with QA approver, reviewer and signer roles. Choose Approval-based, Parallel or Sequential, retain required participation, and add the optional approval block through Place fields for everyone. Save/validate fields, authorize and send once. Compare inboxes, invitations and signatures before every next action. Exercise review/approval cancellation and confirmation; skip and decline in their own fixtures. Check signed artifacts only after real worker completion. Inspect PDF text/rendering, hash comparisons, recipient downloads and role audit events. Do not resend existing sent fixtures or run truncating integration tests against the real local database.

Harness/environment corrections were kept separate from application defects: role confirmation uses `alertdialog` semantics (signature capture uses `dialog`); reviewer completion uses the backend's legacy signed/event vocabulary; non-signers' completed records live in Shared Documents rather than the removed Others tab. A local Vite process stopped during the run, causing connection-refused/unavailable screens with no decision written. It was restarted on the same port/backend; the same QA requests resumed successfully. No new signing requests were created by those retries.

Coverage is these four all-required three-person workflows. This does not certify arbitrary quorum/any-one rules, optional participant permutations, simultaneous race submissions, external SMTP, external identity providers, billing, legal validity, cryptographic trust-chain verification or production behavior. Existing audit/consent version labels are server data, not a claim of independent legal assurance. QA records and generated artifacts remain local for review.
