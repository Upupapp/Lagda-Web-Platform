# Real local template workflow verification

**PASS — 18 November 2026.** One new fictional template was created through the UI, authored into a real PDF, configured with a required signature field, and used twice by different QA recipients. Both requests were sent, signed, completed by the worker and downloaded by sender and recipient. No API response interception or mocked completion.

**No application defect was found; no application or backend fix was necessary.** Existing local changes were preserved. No production access, deployment, push or merge.

## Environment and scope

Frontend `5934a8b` on `feat/emil-screen-sprints` with the existing local UI changes; backend `cb3c3b0`, source unchanged. Frontend `http://localhost:5173`, API `127.0.0.1:8091`, local PostgreSQL `lagda_fresh_dev`, local object storage and actual worker. Invitations and sender completion notifications were captured in Mailpit at localhost:8026. Existing verified fictional QA accounts and a pre-existing synthetic Business workspace entitlement were used; no external inbox or billing provider.

The current template UI authors its document rather than accepting a PDF upload. This test used **Start from Blank → authored one-page agreement → Generate & Save**. It does not imply a template-upload feature or a malware-scanner rerun.

## Verified journey

| Transition | Result |
| --- | --- |
| Create | UI-created template returned 201. Name, category, sequential routing and one required QA signer role persisted through the real backend. |
| Author | Typed the harmless agreement through the editor. Generate & Save produced a real one-page source PDF and persisted the template content/revision/artifact. |
| Place fields | Drew one signature rectangle against the real PDF, bound to the signer role. Save Fields succeeded; backend layout and geometry survived reload. |
| Required mapping | Continue with the required name/email empty was blocked with the correct message; no template instance was created by that invalid attempt. |
| Use 1 / Use 2 | Different QA recipients were mapped through Use Template, reviewed and launched into Prepare. Three distinct document IDs exist for source and the two successful uses. Recipients have distinct IDs. |
| Instance retry | Replayed each original instantiate request with the same idempotency key. The backend returned the same document, without a second copy. |
| Prepare / send | Both uses passed through Upload, Participants, Order, Settings, Fields, Authentication, Review, Authorization and Send. Exactly one signing request exists per successful instance. The role-bound recipient and exact template rectangle persisted into each request. |
| Receive / sign | Each actual local invitation was opened in the addressed recipient's separate session at a phone viewport. Account confirmation, consent, required signature and Submit signature were exercised through the UI. Both submissions returned 201. |
| Signature retry | Replayed the exact accepted submission; each retry returned the same submission ID. Each audit has only one signature event. |
| Worker completion | Both requests reached completed, with the required recipient in signed state. Sender “is fully signed” notifications were captured locally. |
| Sender download | Native Signed PDF download from each actual completed-document viewer succeeded. |
| Recipient download | Records → Signed by me → document actions → View / Download signed document → Signed PDF succeeded for each addressed account. Each recipient file matches its sender's SHA-256 byte for byte. |
| Audit | Each seven-event real audit includes activation, consent, signature and completion in chronological order. Recipient audit dialogs loaded successfully. |
| Integrity | Each public verification digest equals the corresponding downloaded PDF. File-check accepts its own completed PDF, rejects the unsigned template source and rejects the other use's completed PDF. |
| Isolation | Anonymous calls to template-read and sender-download endpoints return 401. Each unrelated QA recipient's member-access grant request for the other's completed PDF is denied with 401 `verification_access_denied`. |
| Reuse invariants | After both completions, source template metadata/content and stored field layout equal the baseline exactly. Each instance's unsigned source bytes still match the template source. No recipients or signatures leaked across uses. |

## PDF inspection

Downloaded originals were parsed with pypdf and rendered with Poppler without rewriting them. Both are one page; all original agreement text remains. The expected typed QA signature is present, the other recipient's signature is absent, and visual inspection confirms legible text, a complete mark and no clipping/overlap. This verifies the rendered artifact, not external cryptographic/legal trust.

| Use | Recipient | Bytes | SHA-256 |
| --- | --- | --- | --- |
| 1 | LAGDA Multi QA Signer 1 | 944,882 | `66d06c22d7461fda497b5622a974cb0ae46c230a03597a6e4718d38f41f76e4b` |
| 2 | LAGDA Multi QA Signer 2 | 944,881 | `25cfecc3ff28912531841a2162e935776f5e5102991a164b96a766c1ba47d882` |

Unsigned source SHA-256: `fb18c9781de0216b6349df21d09226b6c60533b6e7c6229f79e781ad96bc0173`.

[Verification and identifiers](verification.json) · [PDF inspection](pdf-inspection.json) · [Cross-document checks](cross-file-check.json) · [Captured mail summary](mail-delivery.json).

[Source PDF](template-source.pdf) · [Completed use 1](use-1-completed.pdf) · [Completed use 2](use-2-completed.pdf) · [Rendered use 1](use-1-rendered.png) · [Rendered use 2](use-2-rendered.png) · [Audit 1](use-1-audit.json) · [Audit 2](use-2-audit.json).

Screenshots: [authored document](01-authored-template.png), [saved fields](03-fields-saved.png), [first role mapping](use-1-roles.png), [second role mapping](use-2-roles.png), [prepared field](use-1-prepared-field.png), [first recipient completion](use-1-signed.png), [second recipient completion](use-2-signed.png), [recipient audit](use-1-recipient-audit.png).

## Harness corrections and retained data

The initial harness required correction for accessible emoji spacing, an email legitimately shown in both the participant card and roster, the account's first-run tour redirect, the server's automatic title-conflict suffix, the actual “fully signed” notification wording, and the documented 401 denial for an unrelated member-access request. These were setup/assertion errors, not product defects. No application change was made to accommodate the harness.

One unsent QA instance created before correcting the duplicate-email assertion remains local and is recorded privately as an abandoned harness attempt. It sent no invitation. Both final successful instances were separately verified. Existing data was not truncated or removed; QA records and artifacts remain available for review.

Private run files, browser storage, account credentials, invitation links, access tokens, raw mail bodies and executable QA helpers remain in `%LOCALAPPDATA%/LAGDA/template-workflow-20261118`, outside the repository evidence. The evidence here includes only fictional QA content, summary data, PDFs, audit records and screenshots.

## Reproduction and limits

Use a fresh uniquely named fictional template in the local Business QA workspace: create one signer role → Author Document → Generate & Save → place/save a role-bound signature → reload → Use Template → confirm required mapping validation → map QA recipient → Review & Launch → Continue in Prepare → review/authorize/send → open captured local invitation as the addressed recipient → consent/sign/submit → wait for the worker → download as both actors → compare hashes, audit and verification. Repeat with another QA account and verify source/layout remain unchanged and the two instance IDs differ. Never rerun Send against an already-sent QA instance or use the truncating backend integration harness against this database.

For this retained run, local helpers are `create.mjs`, `fields.mjs`, `use.mjs 1|2`, `sign.mjs 1|2` and `finish.mjs` under the private run directory, using Node 24. Do not rerun creation/sending against its completed fixtures; `finish.mjs` performs read/download/access verification only and can recheck the completed results. Instance/signature retry checks reused their original idempotency keys.

No current-turn application code changed, so no unrelated component-suite/build rerun is claimed. The actual browser journeys and persisted/artifact checks above are the validation for this task. Existing local app/API services remain running. This pass does not certify template variables, ready-made template derivation, multiple roles within one template, physical phone behavior, external delivery/billing/identity services, production behavior or cryptographic trust chains.
