```text
FIGMA MAKE COMMAND — PREMIUM INTERACTIVE LAGDA.io INFORMATION PORTAL ENHANCEMENT

You are working on the existing LAGDA.io clickable prototype screens that were imported from Figma Design into Figma Make.

Do not redesign the entire website from scratch. Do not replace the existing layouts. Do not change the brand direction. Preserve the current page structure, copy hierarchy, colors, navigation, product positioning, and visual system.

Your task is to turn the existing static information portal into a smooth, premium, modern, techy, trustworthy, functional clickable prototype with polished interactions, route transitions, haptics, visual states, microinteractions, scroll effects, accessibility-safe motion, and product-like demo behavior.

PROJECT:
LAGDA.io

BRAND:
LAGDA by UpUp Technologies

PRODUCT POSITIONING:
LAGDA is a Philippine legal-document platform with:
1. LAGDA eSignature — available now
2. LAGDA eNotary — Coming Soon and Subject to Supreme Court Accreditation

CRITICAL LEGAL POSITIONING:
Keep this distinction visible throughout the prototype:
- LAGDA eSignature is available now.
- LAGDA eNotary is Coming Soon.
- LAGDA eNotary is Subject to Supreme Court Accreditation.
- Do not make eNotary look live, approved, purchasable, accredited, or commercially available.
- Do not use “COA-approved,” “Supreme Court-approved,” “legally guaranteed,” or “ENF-accredited.”
- Use “designed to support audit-ready electronic document workflows” instead of approval/certification claims.

BRAND COLORS:
Use the existing LAGDA design system:
- Azure Blue: #0078D4
- Deep Legal Burgundy: #67023B
- Deep Navy: #07111F
- Midnight Azure: #0B2344
- Azure Glow: #38BDF8
- Light Azure Surface: #EAF6FF
- Burgundy Glow: #B01262
- Soft Burgundy Tint: #FCE7F3
- White: #FFFFFF
- Cool Gray: #E5E7EB
- Slate Text: #334155
- Success Green: #22C55E
- Warning Amber: #F59E0B
- Error Red: #DC2626

COLOR BEHAVIOR:
Use Azure Blue for:
- available-now LAGDA eSignature states
- active navigation
- primary CTAs
- QR verification
- audit trail
- document verification
- identity verification
- parallel signing
- success workflow lines
- product UI progress

Use Deep Legal Burgundy for:
- LAGDA eNotary Coming Soon
- future locked states
- accreditation roadmap
- notarial roadmap items
- legal authority moments
- locked future feature cards

Use Deep Navy for:
- hero backgrounds
- footer
- trust/security sections
- premium dark panels

MAIN OBJECTIVE:
Enhance the current LAGDA.io prototype so it feels like a premium legal-tech SaaS product, not a flat clickable website.

The experience should feel:
- modern
- secure
- trustworthy
- calm
- premium
- polished
- responsive
- enterprise-ready
- Philippine legal-tech
- not flashy
- not gimmicky
- not cartoonish
- not crypto-like
- not gaming-like

IMPORTANT FIGMA MAKE INSTRUCTION:
Use the attached existing designs as the source of truth. Keep the visual design as close as possible while adding functional interactions, transitions, states, hover effects, modal behavior, mobile behavior, and lightweight frontend logic.

Do not invent unrelated pages.
Do not remove important sections.
Do not create a backend unless explicitly needed.
Use front-end prototype state only where possible.

GLOBAL EXPERIENCE SYSTEM:

1. PAGE ROUTING AND TRANSITIONS
Create working route navigation between all existing portal pages and sub-pages.

Pages should include:
- Home
- eSignature Overview
- eSignature Core Workflow
- eSignature Verification & Audit
- eSignature Advanced Capabilities
- eSignature Templates & Branding
- eSignature Team & Enterprise
- Features
- Solutions
- Pricing
- Security
- Comparison
- Resources
- FAQ
- Document Verification
- eNotary Coming Soon
- Accreditation Roadmap
- Create Account
- Sign In
- Book Demo
- Contact Sales
- LAGDA eNotary Waitlist

Page transition style:
- fade + 8–12px upward movement
- duration: 250–350ms
- easing: ease-out
- preserve scroll-to-top on page change
- do not use page flips, spins, or dramatic transitions

2. STICKY NAVIGATION
Enhance the navbar:
- sticky frosted-glass header
- subtle blur after scrolling
- slight border glow at bottom
- active nav underline
- hover underline animation
- Create Free Account button with Azure hover glow
- Sign In with subtle hover state
- eNotary Coming Soon nav item with Burgundy badge

Nav behavior:
- active page stays highlighted
- eSignature remains active across eSignature sub-pages
- eNotary pages use Burgundy active state
- mobile hamburger opens a clean full-screen or slide-in menu
- mobile menu closes with X, outside click, or route selection

3. eSIGNATURE SUB-NAVIGATION
Make the eSignature sub-tabs functional.

Sub-tabs:
- Overview
- Core Workflow
- Verification & Audit
- Advanced Capabilities
- Templates & Branding
- Team & Enterprise

Behavior:
- sticky sub-tab bar below navbar on desktop
- horizontally scrollable pills on mobile
- active pill uses Azure Blue
- selected pill slides with smooth transition
- tab click navigates to corresponding page
- hover shows subtle glow
- duration: 180–220ms

4. BUTTON SYSTEM
Apply consistent CTA interactions.

Primary CTA:
- Azure fill
- soft Azure glow on hover
- 2px compression on press
- loading spinner on submit
- success checkmark when completed

Secondary CTA:
- outline or glass button
- border glow on hover
- 2px compression on press

Burgundy CTA:
- only for eNotary Waitlist / Coming Soon / Accreditation Roadmap
- never use Burgundy for active eSignature purchase flow

Apply to:
- Create Free LAGDA Account
- Book a Demo
- View Pricing
- Contact Sales
- Join LAGDA eNotary Waitlist
- Verify Document
- Use LAGDA eSignature Now
- Download Guide
- Subscribe

5. CARD MICROINTERACTIONS
Apply to all cards:
- feature cards
- solution cards
- pricing cards
- comparison cards
- security cards
- template cards
- trust cards
- eNotary coming-soon cards

Hover behavior:
- lift 4px
- increase shadow softly
- icon moves up 2px
- available-now cards get subtle Azure border glow
- eNotary cards get subtle Burgundy locked glow
- no bounce
- no aggressive scaling

6. SCROLL REVEALS
Add scroll reveal behavior for major sections:
- fade in
- translate up 12px
- duration 300–450ms
- stagger children by 80–120ms
- animate once only
- respect reduced motion

Apply to:
- hero content
- product previews
- feature grids
- workflow sections
- pricing cards
- comparison table
- trust/security sections
- eNotary roadmap
- final CTA
- footer

7. HERO EXPERIENCE
Enhance the homepage and major landing page hero areas.

Hero animation:
- headline fades up
- subheadline fades up after headline
- trust badges reveal one by one
- product UI mockup rises with fade
- floating cards stagger in
- Azure signature/progress line draws subtly
- eNotary Coming Soon card appears last and remains locked

Keep the hero premium and calm.

8. PRODUCT UI MOCKUP BEHAVIOR
For product UI mockups:
- document cards slide in
- signer verification card changes from Pending to Verified
- audit trail entries appear one by one
- QR verification card pulses once
- storage card animates progress bar
- signing request counter animates
- parallel signing nodes complete simultaneously
- document status changes from Sent → Viewed → OTP Confirmed → Signed → Completed

9. QR DOCUMENT VERIFICATION INTERACTION
Make QR verification feel like a major LAGDA trust feature.

Behavior:
- completed signed PDF preview shows QR code in footer
- visible text beside QR:
  “Verify this document at lagda.ph/verify”
- verification ID appears under QR
- scan line passes over QR once
- clicking QR / Verify opens Document Verification page
- verification page supports idle, verifying, valid, invalid, access restricted states

Verification flow:
- user enters verification ID or clicks QR
- show verifying progress ring for 700–900ms
- then show result

Valid result:
- Azure / Success checkmark
- status: Document verified
- document title
- file name
- verification ID
- completed date/time
- signer count
- limited audit summary
- privacy-safe signatory display

Invalid result:
- Amber warning
- status: Verification not found
- Try Again CTA
- Contact Support CTA

Privacy rule:
Public verification must not expose full signer emails, IP address, exact GPS, device/browser details, full audit trail, or downloadable signed PDF unless explicitly marked authorized.

10. PARALLEL SIGNING INTERACTION
Make parallel signing a signature LAGDA product moment.

Parallel Signing behavior:
- sender chooses Parallel Signing
- Azure line branches to multiple signer nodes
- all signers receive the document at the same time
- each signer node can complete independently
- all required nodes turn green/checked
- final document status becomes Completed

Copy:
“Parallel signing by default. Sequential routing when needed.”

Sequential Signing behavior:
- signer 1 activates first
- signer 2 activates only after signer 1 signs
- signer 3 activates after signer 2
- this should visually contrast with faster parallel signing

Do not make sequential look bad; present it as useful when strict order is required.

11. COMPANY HEADER / FOOTER BRANDING INTERACTION
For branding sections:
- toggle Company Header on/off
- toggle Company Footer on/off
- toggle QR Verification Footer on/off
- preview updates immediately
- show footer conflict warning if document already has footer
- allow “Use Verification Appendix Instead”

Warning copy:
“This document may already contain a footer. Turn off LAGDA footer branding or add a separate verification appendix.”

12. TEMPLATE LIBRARY INTERACTIONS
For templates:
- category filters animate
- Basic / Advanced / Featured badges appear
- locked templates show upgrade tooltip
- Use Template button hover state
- Edit Template button hover state
- template cards lift on hover

Template categories:
- Legal
- HR
- Sales
- Finance
- Procurement
- Admin
- Real Estate
- Government/LGU
- Education
- Healthcare/Wellness

Access behavior:
- Personal: 3 starter templates
- Professional: Basic template library
- Business: Full template library
- Business Plus: Full + featured templates
- Enterprise: Full + featured + custom onboarding templates

13. PRICING PAGE INTERACTIONS
Enhance pricing:
- plan cards lift on hover
- Business plan has Recommended Azure glow
- comparison rows highlight on hover
- storage gauges animate
- signing request explanation expands/collapses
- FAQ accordions expand smoothly
- plan CTA routes correctly

Pricing content must remain:
- Personal: Free, 1 sender, 5 signing requests/month, 500MB, 3 starter templates
- Professional: ₱750/month, 1 sender, unlimited subject to fair use, 10GB, Basic Templates
- Business: ₱2,250/month, 3 senders, unlimited subject to fair use, 50GB shared, Full Templates, Recommended
- Business Plus: ₱4,500/month, 6 senders, unlimited subject to fair use, 100GB shared, Full + Featured Templates
- Enterprise: Custom

Signing request tooltip:
“A signing request is one sent document transaction. It may include one or multiple signers.”

14. COMPARISON PAGE INTERACTIONS
For the consolidated comparison page:
- only one comparison table on desktop
- LAGDA column has subtle Azure highlight
- row hover highlights the full row
- category dividers stay visually clear
- eNotary future rows use Burgundy lock badges
- mobile version uses LAGDA-first expandable comparison cards

Mobile comparison:
- category tabs:
  Local Fit
  Signing
  Verification
  Operations
  eNotary Roadmap
- each capability card shows LAGDA result first
- competitor comparison expands/collapses below

15. SECURITY PAGE INTERACTIONS
For Security & Trust:
- identity verification ring fills
- signer status changes to Verified
- audit trail timeline expands one event at a time
- QR verification result animates
- IP/device/location evidence card expands
- exact GPS permission note appears as privacy tooltip
- eNotary future trust layer remains locked in Burgundy

16. eNOTARY COMING SOON INTERACTIONS
For eNotary pages:
- locked feature cards show restrained Burgundy glow
- Coming Soon badge remains visible
- accreditation roadmap line draws slowly
- waitlist CTA uses Burgundy accent
- no animation should imply eNotary is live, approved, or purchasable

17. FORMS AND VALIDATION
Make forms feel functional.

Forms:
- Create Account
- Sign In
- Book Demo
- Contact Sales
- Waitlist
- Newsletter
- Document Verification

Add:
- field focus ring in Azure
- inline validation
- password visibility toggle
- loading state
- success modal
- error state
- mobile-friendly spacing

Errors:
- use text + icon
- do not rely on color alone
- shake field 2px once only
- do not over-animate

Create Account success:
- show “LAGDA account created.”
- route to Dashboard Placeholder

Waitlist success:
- show “You’re on the LAGDA eNotary waitlist.”
- CTA: Use LAGDA eSignature Now

Demo success:
- show “Demo request received.”

Contact Sales success:
- show “Sales request received.”

18. SUCCESS MODALS
Standardize modals:
- centered
- dimmed background
- visible close X
- checkmark animation
- short message
- primary CTA
- optional secondary close
- safe mobile margins

19. MOBILE HAPTICS
Add mobile haptic feedback where supported.

Use browser-compatible vibration behavior only on mobile/touch devices.
If unsupported, silently skip and rely on visual feedback.
Do not trigger haptics on desktop.
Do not overuse haptics.

Haptic patterns:
- primary CTA tap: light haptic
- tab switch: selection haptic
- pricing plan selected: selection haptic
- QR verification success: confirmation haptic
- document verification invalid: warning haptic
- form success: success haptic
- form error: warning haptic
- waitlist joined: success haptic
- future eNotary locked card tap: warning haptic
- branding toggle: selection haptic
- template selected: selection haptic

20. DESKTOP-TO-MOBILE CAMERA HANDOFF
For any feature that requires camera, scanning, selfie capture, face verification, liveness check, ID capture, QR scanning, secure video, or document scanning:

If user is on desktop, show a modal:
“Continue on mobile to use your camera.”

Modal includes:
- secure QR code
- short secure link
- explanation that progress will continue on mobile
- button: “I’ve opened it on my phone”
- button: “Send link to email”
- button: “Cancel”

States:
- QR ready
- mobile connected
- QR expired
- regenerate QR
- camera permission denied
- camera unavailable
- upload fallback where allowed
- completed on mobile
- return to desktop and continue

Use this pattern for:
- optional ID validation
- selfie / face verification
- liveness check
- document scanning
- QR scanning
- future eNotary identity verification
- future secure video appearance

Security note:
The handoff QR should represent a temporary session link, not expose private data.

21. LOADING AND SKELETON STATES
Add skeleton loading for:
- dashboard cards
- document verification result
- pricing comparison
- template library
- comparison table
- resources list
- form submit
- mobile camera handoff connection state

Style:
- subtle shimmer
- no flashing
- match dark/light section background

22. EMPTY STATES
Add helpful empty states where needed:
- no documents yet
- no templates available
- no verification result yet
- no notifications
- no team members
- no billing history

Each empty state includes:
- icon
- short message
- primary CTA

Example:
Title:
“No documents yet.”

Message:
“Send your first document for eSignature and track every step from invitation to completion.”

CTA:
“Send Document”

23. ACCESSIBILITY AND REDUCED MOTION
Respect prefers-reduced-motion.

Reduced-motion behavior:
- disable parallax
- disable looping glow
- disable large motion
- disable auto-moving effects where possible
- use opacity fades only
- keep all state changes understandable without animation
- keep QR verification and success states visible without motion

Accessibility requirements:
- high contrast
- visible focus states
- form labels always visible
- icons paired with text
- legal disclaimers readable
- Coming Soon is text-based, not just color
- touch targets at least 44px
- keyboard-accessible modals and forms where possible
- modals close with X and escape/back behavior
- no flashing or fast pulsing
- no motion required to understand the page

24. PERFORMANCE RULES
Keep the prototype lightweight.

Use:
- transform and opacity for animations
- CSS transitions
- simple keyframes
- lazy reveal effects
- lightweight blur sparingly

Avoid:
- heavy video backgrounds
- too many blur layers
- infinite animations on many elements
- particle effects that hurt performance
- scroll-jacking
- complex canvas effects unless lightweight

25. VISUAL POLISH
Enhance the existing designs with:
- subtle grid backgrounds
- faint document-line patterns
- soft glass panels
- Azure verification glows
- Burgundy locked roadmap accents
- realistic dashboard microcards
- modern status chips
- clean shadows
- premium section dividers
- consistent icons
- consistent rounded corners
- consistent spacing
- clean hover states
- trust-centered motion language

Do not make the portal look like:
- crypto
- gaming
- cartoon
- generic law office
- flat spreadsheet
- overdecorated animation demo

26. FOOTER INTERACTIONS
Footer links:
- underline on hover
- subtle Azure hover
- eNotary footer status uses Burgundy lock badge
- all links route correctly
- no placeholder links

Footer status:
“LAGDA eNotary status: Coming Soon — Subject to Supreme Court Accreditation”

27. FINAL CTA SECTIONS
Enhance final CTAs:
- dark premium background
- subtle Azure-to-Burgundy glow
- trust badges reveal
- primary CTA glow
- secondary CTA outline hover

Default CTA:
Headline:
“Ready to sign with LAGDA?”

Body:
“Start with secure eSignature today and prepare your organization for future electronic notarization after accreditation.”

CTAs:
- Create Free LAGDA Account
- Book a Demo
- Join LAGDA eNotary Waitlist

28. ROUTE AND LINK INTEGRITY
Ensure all clickable links work:

Create Free Account → Create Account
Sign In → Sign In
Book a Demo → Book Demo
Contact Sales → Contact Sales
View Pricing → Pricing
Explore eSignature → eSignature Overview
Features → Features
Solutions → Solutions
Security → Security
Resources → Resources
FAQ → FAQ
Verify Document → Document Verification
Join LAGDA eNotary Waitlist → Waitlist
LAGDA eNotary Coming Soon → eNotary Coming Soon
View Accreditation Roadmap → Accreditation Roadmap
Use LAGDA eSignature Now → Create Account

29. QA PANEL / DEV NOTES
Create a small internal “Prototype QA Notes” panel or route hidden from public nav that lists:
- all pages connected
- reduced motion supported
- mobile haptics implemented where supported
- QR verification flow implemented
- desktop-to-mobile camera handoff implemented
- eNotary remains Coming Soon
- no misleading legal claims
- mobile navigation checked
- form states checked

30. FINAL QA CHECKLIST
Before finishing, verify:
- all pages are clickable
- nav works on desktop and mobile
- eSignature sub-tabs work
- comparison page is one consolidated table on desktop
- mobile comparison uses LAGDA-first cards
- pricing interactions are updated
- QR verification interaction is clear
- parallel signing animation is clear
- branding toggle interaction is clear
- template filters work
- forms have validation, loading, success, and error states
- success modals appear correctly
- mobile haptics are used safely
- desktop-to-mobile camera handoff exists
- reduced-motion behavior exists
- eNotary remains Coming Soon and Subject to Supreme Court Accreditation
- no COA-approved or Supreme Court-approved claims appear
- animations are calm and premium
- performance remains smooth
- design remains modern, techy, trustworthy, and enterprise-ready

FINAL RESULT:
Create a polished, clickable, functional LAGDA.io information portal prototype with premium legal-tech motion, haptics, effects, microinteractions, mobile handoff flows, accessible reduced-motion behavior, and modern visual polish while preserving the existing Figma designs.

The final experience must clearly communicate:
“LAGDA eSignature is available now. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation.”
```
