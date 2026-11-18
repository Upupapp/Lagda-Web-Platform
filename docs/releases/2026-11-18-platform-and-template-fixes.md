# Platform UI and template preparation release — 18 November 2026

This frontend release carries the reviewed admin, mobile, document-preparation and recipient-signing improvements plus the template variable corrections into the existing production feature set. It adds no new backend feature, entitlement or schema migration.

## Behavior changes

- Keep workspace/template tools usable at phone widths, with readable status text, touch targets, safe areas and dynamic viewport sizing.
- Keep long template titles from clipping Save; preserve document space with a native-scrolling role strip on phones.
- Contain modal focus, preserve background scroll and return focus safely, including busy states. Preserve signature ink through canvas resize and bind each stroke to one pointer.
- Match completion/access copy and generic progress to actual recipient roles and Records availability. Preserve current real-backend routing and all-required completion rules.
- Refuse whitespace-only required template values. Treat nonempty sender-filled static variable fields as already filled, without weakening recipient assignment, geometry or signer-signature checks.

The release also records the QA evidence and design baseline. Private credentials, browser sessions and signing URLs are excluded; older signing paths in review evidence are redacted.

## Verification references

- [Mobile platform and admin review](../reviews/mobile-platform/review.md)
- [Preparation and recipient signing review](../reviews/mobile-signing/review.md)
- [Real template creation and reuse](../reviews/template-workflow/review.md)
- [Five variable types with sequential and parallel approver/reviewer/signer workflows](../reviews/template-variables-roles/review.md)

Real local backend QA includes sender and recipient completion/download checks, preserved template values/geometry, role routing, idempotent submissions, audit chronology and PDF integrity. Physical-device acceptance and external-provider/legal trust assurance remain outside those passes.

Release checks passed: **4,158 unit/component tests in 324 files with coverage thresholds enforced**, **416 browser checks across seven projects** (52 existing skips), both build profiles, complete lint with zero errors, final typecheck and lockfile parity. The existing site also passed nine read-only pre-deploy smoke checks. Post-deploy results are captured in the local deployment record. Detailed command results and deployment metadata are kept in the local release workspace at `%LOCALAPPDATA%/LAGDA/release-20261118`.

Two legacy release-test assumptions were corrected without weakening assertions: motion checks now inspect the actual static content wrapper, and workspace demo tests wait for loaded member/team data. The trust-copy gate snapshots source once during collection to avoid repeated filesystem scans exhausting assertion time on Windows/OneDrive. Unhandled-error detection and coverage thresholds remain enabled.

## Deployment and rollback

Production frontend: Netlify site `lagda-esignature`, `https://lagda.io`, built from GitHub `main`. Keep the existing production environment, signed `/api` proxy and SPA redirects. The backend remains at `cb3c3b0`; no backend deployment, restart or migration is required.

Previous published frontend: commit `5934a8b50bd69448db8d9c6656f2b41ea1f2b3b5`, Netlify deploy `6af2a988c1a2180f009bdbb7`. Restore that deploy if post-publish smoke checks regress. Production smoke checks read public pages, anonymous route guards, mobile sign-in and API health/readiness; they do not create production accounts, documents or signatures.
