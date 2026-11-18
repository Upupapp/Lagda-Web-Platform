# Multiple-recipient signing: real local backend

**PASS — 18 November 2026.** Two genuine local requests, three distinct verified fictional signers each, six signing submissions. No route mocks, simulated signing responses, production access, deployment, push or merge. Backend source unchanged.

Frontend baseline `5934a8b` (`feat/emil-screen-sprints`) plus preserved local UI work and the narrow route-guard fix below. Backend baseline `cb3c3b0`. Browser `localhost:5173`, API `127.0.0.1:8091`, existing local QA database/object store/ClamAV/worker and Mailpit. The pre-existing local synthetic Business sender entitlement was used; billing was not tested.

## Scenario results

| Check | Sequential | Parallel |
| --- | --- | --- |
| Saved configuration | Three required signers, orders 1/2/3; one signature block each | Three required signers, same routing step; one signature block each |
| Invitations on send | Only signer 1 | All three |
| Execution order | 1 → 2 → 3 | 3 → 2 → 1, intentionally opposite the participant list |
| Activation | Only next unfinished signer active; later signers waiting | Every unfinished signer active |
| Early access | Waiting signers absent from actionable inbox; correct-password continue attempts return 404 `SIGNING_UNAVAILABLE` | All three initially have actionable inbox entries |
| Progress | Signed counts 0 → 1 → 2 → 3 | Signed counts 0 → 1 → 2 → 3 |
| Premature completion protection | Request remains incomplete and completed PDF returns 404 at 0/1/2 signatures | Same |
| Submission retry | Each exact accepted request retried with original idempotency key: 201, same submission ID | Same |
| Final state | Completed, 3/3 signed, no active/waiting recipients | Same |
| Audit | 15 chronological events: creation/send; 3 activations, 3 views, 3 consents, 3 signatures; one completion | Same; signature event order confirms 3/2/1 execution |
| Audit timing | Each later activation occurs at or after preceding signature | All activations precede first signature |
| Downloads | Sender and all three recipients download the same signed bytes | Same |
| Recipient audit | Actual Records audit dialog loaded for all three | Same |
| Verification | Stored digest matches PDF; raw file check accepts completed file and rejects unsigned source | Same |

Every recipient could edit exactly their own one signature field. Original text on both PDF pages is preserved. All three typed signatures and printed names occur on page 2, in separate non-overlapping saved rectangles. Both final signature-page renders are byte-identical and were visually checked; downloaded PDFs differ in completion metadata/digest. Poppler printed font fallback notices; the rendered names and source text remain legible. Downloaded artifacts were not rewritten or flattened by the QA scripts.

| Artifact | Size | SHA-256 |
| --- | --- | --- |
| [Sequential PDF](sequential-completed.pdf) | 622,432 bytes | `bde987fee60f426a109ac6648bae7c775858975d7f06bab3cf89ac2f79bd25e9` |
| [Parallel PDF](parallel-completed.pdf) | 622,434 bytes | `07e9f4abf90c0dcc1c15fb2b57c737b2f1782d8fe2979fe446858467fa93e707` |

## Defect reproduced, fixed and verified

| Before | After | Why |
| --- | --- | --- |
| `/app/link-signing` inherited the workspace setup/load gates. A verified QA recipient with no workspace saw “Create your workspace” instead of password confirmation and could not sign. | After the existing session guards, this exact handoff route renders its account-confirmation page without workspace navigation or workspace setup/load gates. | Confirming the addressed recipient account needs authenticated identity, fresh password and a valid handoff. A sender workspace is unrelated. The backend still checks all three. |

The route change is in `src/app/layouts/PlatformLayout.tsx`. Other platform pages retain workspace setup/error handling. Anonymous and expired sessions still redirect to sign-in with the handoff return path; initializing sessions never see confirmation. Motion verdict: no new motion. The focused confirmation reuses existing typography and controls, consistent with the saved Emil standards.

Regression evidence: before the fix, 2 workspace-related cases failed and 5 passed ([log](guard-before.log)); after the fix, all **8 tests pass** ([log](guard-after.log)). Coverage includes empty/error/ready workspaces, anonymous/expired/initializing sessions, and unchanged dashboard setup/error gates. Typecheck, scoped ESLint (no warnings/errors), production build and `git diff --check` pass. Build retains the existing large-chunk advisory. No backend source or deployment changes were required.

All six signing ceremonies completed while these new QA accounts had **zero workspaces**, exercising the corrected handoff. After signing, three fictional personal workspaces were created through the existing UI to exercise the normally workspace-gated platform Records screen and downloads. The broader platform workspace policy was preserved; this test does not claim Records is workspace-free.

## Evidence

- [Sequential audit](sequential-audit-trail.json), [parallel audit](parallel-audit-trail.json).
- [Sequential download comparisons](sequential-recipient-downloads.json), [parallel comparisons](parallel-recipient-downloads.json), [PDF inspection](pdf-inspection.json).
- Initial states: [sequential](sequential-initial-checks.json), [parallel](parallel-initial-checks.json). Intermediate and final `*-checks.json` files record each progress boundary, early denials and invitation counts.
- [Sequential order screenshot](sequential-routing.png), [parallel order](parallel-routing.png), [saved fields](sequential-fields.png), [fixed confirmation](parallel-signer-1-popup.png).
- [Sequential recipient audit](sequential-recipient-1-audit.png), [parallel recipient audit](parallel-recipient-1-audit.png), [rendered signed page](parallel-signed-page-2.png).
- Per-recipient `*-retry.json` records all six idempotency checks. Local mail summaries show one invitation per signer and one sender completion message per request. No separate participant completed-copy email is expected in the current worker.

Synthetic request IDs, recipients and field assignments are retained in each `*-run.json`. QA records remain local for review. Credentials, cookies, sessions, invitation URLs, single-use handoff codes, grants and mail bodies are excluded from this evidence directory.

## Reproduction and limits

Use three fresh verified local QA identities and a uniquely titled two-page training PDF. Upload, add three required signers, choose Parallel or Sequential, validate/save three fields, authorize and send exactly once. Capture the initial signatures/inboxes/invitations. Sign one recipient at a time (1/2/3 sequential; 3/2/1 parallel); assert the persisted counts and access rules before each next signature. Retry each accepted submission with the same idempotency key, then wait for sealing. Compare sender and all recipient downloads, parse/render the PDF, and check public file comparison plus audit chronology. Never run a truncating integration harness against the real local database or production.

Harness/setup corrections were separated from application defects: registration fixtures explicitly request local verification mail; dependent setup must finish before adding signers; draft resume and post-consent rendering must settle before assertions; a resumed Sequential draft preserves custom groups, so selecting Parallel and then Sequential explicitly rebuilds the intended default 1/2/3 layout. A same-mode radio selection is not a request to discard custom groups. No custom-routing behavior was changed. The two guarded route regressions and original failure diagnostics distinguish the actual account-confirmation defect from these test setup/timing corrections.

Scope is these two three-signer, all-required, typed-signature journeys. This does not certify simultaneous racing submissions, mixed/any-one groups, approver/reviewer roles, declines/cancellation, external mail, provider identity assurance, billing, cryptographic trust-chain validation or production behavior. Those outcomes are not inferred from this pass.

Follow-up: [approver, reviewer and signer workflows](../role-workflows/review.md) now cover the separate mixed-role scenarios and their local fixes.
