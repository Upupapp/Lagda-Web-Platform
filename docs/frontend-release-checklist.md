# LAGDA Frontend Release Checklist

Last updated: 2026-07-16 (C25)

---

## Repository

- [ ] Working directory is `C:\Users\paulg\OneDrive\Desktop\Lagda`
- [ ] `git status` reviewed — no unintended files staged
- [ ] Lockfile (`package-lock.json`) is consistent with `package.json`
- [ ] No environment secrets in any committed file
- [ ] No real API keys, OAuth credentials, or webhook secrets

---

## Quality Gates

- [ ] `npm run typecheck` — 0 TypeScript errors
- [ ] `npm run lint` — 0 lint errors (when ESLint configured)
- [ ] `npm run test:fixtures` — fixture-integrity tests pass
- [ ] `npm run test:unit` — unit tests pass
- [ ] `npm run test:routes` — route smoke tests pass
- [ ] `npm run test` — full test suite passes
- [ ] `npm run build` — production build succeeds
- [ ] `npm run preview` — preview build renders correctly

---

## Public Portal

- [ ] Home page renders with correct public navigation and footer
- [ ] eSignature product pages accessible from /esignature
- [ ] Features pages accessible from /features
- [ ] Security pages accessible from /security
- [ ] Solutions pages accessible from /solutions
- [ ] Pricing pages accessible from /pricing with plan comparison
- [ ] Resources pages accessible from /resources
- [ ] Legal pages: /legal/privacy, /legal/terms, /legal/accessibility
- [ ] Contact page renders and form fields present
- [ ] Book a Demo page renders
- [ ] Public verification (/verify) renders
- [ ] eNotary pages: all 5 routes show Coming Soon
- [ ] "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules." present on eNotary pages
- [ ] No active eNotary purchase flow
- [ ] 404 page renders for unknown public routes
- [ ] All visible navigation links work (no href="#", no dead buttons)
- [ ] Footer links resolve correctly
- [ ] Public pages do not show platform shell
- [ ] Mobile navigation works at 375px

---

## Authentication and Onboarding

- [ ] /sign-in renders and demonstration sign-in works
- [ ] /create-account renders and demonstration registration works
- [ ] /forgot-password, /reset-password render
- [ ] /mfa, /mfa/setup, /mfa/recovery render
- [ ] /onboarding/* steps render in order (profile → use-case → workspace → security → notifications → review → complete)
- [ ] Unauthenticated direct access to /app/* redirects to /sign-in
- [ ] Sign-out clears session and redirects to /sign-in
- [ ] No real passwords or tokens stored

---

## Platform

- [ ] /app → /app/dashboard redirect works
- [ ] Platform shell renders once (no double shell)
- [ ] Public shell does not render inside /app/*
- [ ] Dashboard renders with fixture documents and widgets
- [ ] Workspace switcher shows available workspaces
- [ ] Workspace switch clears document selection and scoped state
- [ ] Permission-aware navigation — restricted roles see fewer nav items
- [ ] /app/session-expired renders and redirects to sign-in
- [ ] /app/permission-denied renders

---

## Documents

- [ ] /app/documents renders document list with all statuses
- [ ] Filter and sort controls work
- [ ] Transaction detail loads: overview, participants, activity, evidence, settings tabs
- [ ] No private evidence accessible across workspaces
- [ ] /app/documents/new → /app/prepare redirect works

---

## Verification

- [ ] /app/verify renders authenticated verification form
- [ ] Match scenario shows correct result
- [ ] Mismatch scenario shows mismatch result
- [ ] Not-found scenario shows not-found result
- [ ] Verification does not claim notarization

---

## Prepare Workflow

- [ ] /app/prepare entry page renders
- [ ] All 6 wizard steps navigate correctly (upload → participants → routing → auth → settings → review)
- [ ] Field editor (/app/prepare/fields) renders
- [ ] Confirmation page renders with demonstration disclaimer
- [ ] File objects do not persist across workspace switch
- [ ] Signing demo disclaimer present

---

## Templates

- [ ] /app/templates list renders
- [ ] Create template → template detail → edit → fields → preview → use template flows work
- [ ] Template use creates a preparation draft
- [ ] Archived templates not available for use
- [ ] Usage counts labeled as fictional

---

## Contacts

- [ ] /app/contacts list renders
- [ ] Create, view, edit, import, groups flows work
- [ ] Contacts remain separate from Workspace Members
- [ ] Archived contacts excluded from pickers

---

## Workspace Administration

- [ ] /app/workspace overview renders
- [ ] Members, invitations, teams, roles, activity, settings routes work
- [ ] Permission matrix displays for all roles
- [ ] Final owner safeguard: owner cannot remove themselves as sole owner
- [ ] No eNotary roles visible

---

## Settings

- [ ] /app/settings overview renders with attention items
- [ ] Profile page: display name, avatar preview
- [ ] Preferences page: timezone, date format
- [ ] Security overview, password, MFA, sessions, activity routes work
- [ ] Password page shows demonstration disclaimer
- [ ] MFA page shows demonstration secret label (not a real TOTP secret)
- [ ] Notifications page: channel and frequency toggles
- [ ] Branding page: logo preview (in-memory), brand color, forced attribution
- [ ] Billing page: plan overview, invoice list, comparison table
- [ ] Billing disclaimer present ("no subscription changed by a backend")
- [ ] Card ending 4242 labeled as fictional demonstration
- [ ] Usage page: 9 metrics with progress bars and warnings
- [ ] Integrations catalog renders with search
- [ ] Integration detail: connect/test/disconnect demonstration
- [ ] Integration disclaimer present ("no OAuth exchange occurs")
- [ ] Data and Privacy: export request demo, account closure demo with typed confirmation
- [ ] No eNotary billing, usage, or integration items
- [ ] No Burgundy (#67023B) in any settings page

---

## Recipient Flow (/sign/*)

- [ ] /sign with no requestId shows unavailable state
- [ ] /sign/:requestId renders correct role layout: signer, approver, reviewer, acknowledgment, viewer, copy recipient
- [ ] Expired request shows expired state
- [ ] Cancelled request shows cancelled state
- [ ] Already-actioned request shows already-actioned state
- [ ] Routing-locked request shows locked state
- [ ] Signature adoption demonstration works
- [ ] No other-participant values visible
- [ ] Completion screen shows demonstration disclaimer
- [ ] No real signing claim
- [ ] Recipient layout does not show public or platform shell
- [ ] Routes are non-indexable

---

## Security and Privacy

- [ ] No secrets in source code or environment files
- [ ] No localStorage or sessionStorage writes
- [ ] No real network calls required for any core workflow
- [ ] No console.log/warn/error in production-facing code
- [ ] No sensitive state in URL parameters
- [ ] No cross-workspace data leakage
- [ ] Sign-out clears all sensitive in-memory state
- [ ] Workspace switch clears scoped private state

---

## Accessibility

- [ ] One H1 per page
- [ ] All form controls have visible labels
- [ ] Error messages associated with inputs (aria-describedby or aria-errormessage)
- [ ] Dialogs trap focus and restore focus on close
- [ ] Skip navigation link present in platform shell
- [ ] All icon-only buttons have aria-label
- [ ] All toggles have role="switch" and aria-checked
- [ ] Progress bars have role="progressbar" with aria-valuenow/min/max
- [ ] Status messages use role="alert" or role="status"
- [ ] Keyboard navigation works for all major controls
- [ ] No keyboard traps
- [ ] Visible focus indicators on all interactive elements
- [ ] Color is not the only means of conveying status
- [ ] Reduced motion preferences respected

---

## Responsive

- [ ] Public pages: no horizontal overflow at 320px
- [ ] Platform pages: no horizontal overflow at 375px
- [ ] Settings pages: sidebar collapses or stacks at narrow viewport
- [ ] Tables have overflow-x: auto containers
- [ ] Dialogs fit within short viewports
- [ ] Navigation reachable at all breakpoints
- [ ] Application usable at 200% browser zoom

---

## Performance

- [ ] Public entry bundle ≤ expected baseline (document after first production build)
- [ ] No authenticated platform code loaded on public routes
- [ ] Route-level code splitting confirmed for all /app/* routes
- [ ] No development tools in production-facing build
- [ ] No fixture switcher in production build
- [ ] Large assets (Figma imports) not loaded on unrelated routes

---

## Content

- [ ] All terminology matches `docs/product-terminology.md`
- [ ] No unsupported legal claims (see `docs/final-content-and-claims-review.md`)
- [ ] "legally certified audit outputs" phrase reviewed and replaced
- [ ] eSignature/eNotary boundary enforced
- [ ] Legal pages retain DRAFT notice until counsel review
- [ ] Demo disclaimers present on all demonstration screens

---

## Documentation

- [ ] `docs/README.md` — documentation index updated
- [ ] `docs/frontend-service-layer.md` — service architecture documented
- [ ] `docs/mock-data-and-scenarios.md` — fixture architecture documented
- [ ] `docs/frontend-testing-strategy.md` — testing approach documented
- [ ] `docs/backend-integration-handoff.md` — backend requirements documented
- [ ] `docs/frontend-known-limitations.md` — limitations documented
- [ ] `docs/final-frontend-audit.md` — audit complete
- [ ] `docs/final-content-and-claims-review.md` — claims reviewed
- [ ] `docs/frontend-security-and-privacy-review.md` — security reviewed
- [ ] `docs/product-terminology.md` — terminology defined

---

## Release Decision

**Ready for controlled demonstration:** All items above pass or are documented as known limitations.

**Not ready for production deployment** until:
- Backend services implemented
- Real authentication configured
- Real document storage configured
- Legal counsel has reviewed Privacy and Terms pages
- Formal WCAG 2.1 Level AA accessibility audit conducted
- Security penetration test completed
- "legally certified audit outputs" phrase replaced
- returnTo allowlist validation implemented
