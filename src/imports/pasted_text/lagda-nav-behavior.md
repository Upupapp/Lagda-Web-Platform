I based this on proven navigation patterns: mega/dropdown menus should use hover intent instead of instant open, WAI-ARIA menu buttons need keyboard/focus/escape behavior, and mobile navigation should not depend on hover. Apple also emphasizes visible focus/selection so users always know what is active. ([Nielsen Norman Group][1])

```text
FIGMA MAKE COMMAND — LAGDA.io MAIN NAV + SUB-NAV BEHAVIOR SYSTEM

You are working on the existing LAGDA.io clickable prototype imported into Figma Make.

Do not redesign the whole website from scratch. Preserve the current LAGDA.io pages, branding, colors, typography, layout direction, and legal-tech visual style. Your task is to make the main navigation bar and existing sub-navigation menus behave like a polished, modern, accessible SaaS information portal.

PROJECT:
LAGDA.io

BRAND:
LAGDA by UpUp Technologies

PRODUCT POSITIONING:
- LAGDA eSignature is available now.
- LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation.

CRITICAL LEGAL RULE:
Do not make LAGDA eNotary look live, approved, purchasable, accredited, or available.
All eNotary navigation items must remain clearly marked:
“Coming Soon”
“Subject to Supreme Court Accreditation”

Do not use:
- COA-approved
- Supreme Court-approved
- ENF-accredited
- legally guaranteed
- LAGDA LAGDA
- Logi
- lagda

Use:
- LAGDA
- LAGDA eSignature
- LAGDA eNotary
- LAGDA Document Verification

BRAND COLORS:
Use the existing LAGDA brand system:
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

MAIN OBJECTIVE:
Create a consistent, accessible, modern navigation behavior system for LAGDA.io.

The main nav and sub-navs should feel:
- premium
- modern
- techy
- trustworthy
- legal-tech
- fast
- calm
- easy to understand
- accessible
- mobile-friendly

They should not feel:
- jumpy
- crowded
- hover-trappy
- confusing
- too animated
- like generic dropdowns
- like copy-pasted menus

MAIN NAV STRUCTURE:
Use this main navbar structure:

Left:
- LAGDA by UpUp Technologies

Center nav:
1. Home
2. eSignature
3. Features
4. Solutions
5. Pricing
6. Security
7. Resources
8. eNotary Coming Soon

Right actions:
- Sign In
- Create Free Account

MAIN NAV RULES:
- Home has no dropdown.
- eSignature has sub-navigation.
- Features has sub-navigation.
- Solutions has sub-navigation.
- Pricing has sub-navigation.
- Security has sub-navigation.
- Resources has sub-navigation.
- eNotary Coming Soon has sub-navigation.
- Sign In and Create Free Account are direct actions.

NAVBAR VISUAL STYLE:
Make the navbar:
- sticky at top
- 72px desktop height
- 64px tablet height
- 56px mobile height
- frosted glass after scroll
- transparent or semi-dark over hero sections
- solid white/light glass on light sections
- subtle bottom border on scroll
- Deep Navy text or white text depending background
- Azure active underline for live/current product areas
- Burgundy active underline for eNotary Coming Soon areas
- clean chevron indicator beside nav items with sub-navs

ON SCROLL:
At top of page:
- navbar may be transparent/dark depending current hero background

After scrolling 24px:
- apply frosted glass background
- add subtle blur
- add 1px bottom border
- slightly reduce height if needed
- keep logo and actions visible

When scrolling down:
- keep navbar sticky and visible
- do not hide the main navbar completely because this is a legal-tech trust portal

When scrolling up:
- keep navbar stable
- avoid jumping layout

SUB-NAV DISPLAY MODEL:
Use two levels only:
1. Main navbar
2. Sub-nav/dropdown/mega menu

Do not create third-level dropdowns.
Do not nest menus inside menus.
If a section needs more details, use page-level cards or tabs after navigation, not third-level nav.

DESKTOP SUB-NAV TRIGGER RULES:
For desktop/laptop pointer users:

Open sub-nav when:
- user hovers on a main nav item with sub-nav for at least 400–500ms
- user clicks a main nav item with sub-nav
- user focuses the nav item using keyboard and presses Enter or Space
- user uses ArrowDown while focused on nav item

Do not open instantly on hover.
Use hover intent delay to prevent accidental flickering.

Keep sub-nav open when:
- pointer moves from main nav item into dropdown panel
- pointer is inside dropdown panel
- keyboard focus is inside dropdown panel
- user is interacting with dropdown content

Close sub-nav when:
- pointer leaves both main nav item and dropdown panel for 200–300ms
- user clicks outside the navbar/dropdown
- user presses Escape
- user selects a link
- route changes
- user tabs away from the nav/dropdown area
- another main nav dropdown opens

Prevent flicker:
- add a 200–300ms close delay
- keep dropdown open when pointer crosses the gap between nav item and panel
- no disappearing dropdown while pointer is moving toward it

DESKTOP CLICK BEHAVIOR:
For main nav items with sub-nav:
- first click opens the sub-nav
- clicking the label again while open navigates to the overview page for that section
- clicking a sub-nav item navigates directly to that page

Alternative:
If this is easier to implement, make the main label navigate to the section overview and use a separate chevron button to open the sub-nav.

Do not make users guess.
Use a clear chevron icon.

KEYBOARD ACCESSIBILITY:
Implement keyboard navigation:

Tab:
- moves through logo, main nav items, action buttons, and open dropdown items

Enter / Space:
- opens dropdown if focused nav item has sub-nav
- activates link if focused item is a link

Escape:
- closes open dropdown
- returns focus to the parent nav item

ArrowDown:
- opens dropdown from parent item
- moves focus to first dropdown item

ArrowUp / ArrowDown:
- moves between dropdown items

ArrowLeft / ArrowRight:
- moves between main nav items when focus is in main nav

Home / End:
- moves to first/last item inside the current dropdown where feasible

Focus:
- every focused item must have a visible focus ring
- focus ring should use Azure Blue for standard pages
- focus ring should use Burgundy for eNotary Coming Soon pages
- focus must not disappear behind overlays

ARIA / ACCESSIBILITY STRUCTURE:
Use accessible semantic behavior:
- nav element for main navigation
- button behavior for nav items that open menus
- aria-expanded true/false
- aria-controls linking button to menu panel
- aria-current="page" for active page
- dropdown list uses clear links
- decorative icons should be aria-hidden
- icons paired with visible text
- Coming Soon status must be text, not only a lock icon

DESKTOP DROPDOWN / MEGA MENU DESIGN:
Use compact mega-dropdown panels for sections with many sub-pages.

Dropdown panel style:
- max width around 960–1120px
- centered under navbar or aligned to nav item
- rounded 20–24px
- glassmorphism or clean white surface depending background
- subtle Azure border for active/live menus
- subtle Burgundy accent for eNotary menu
- soft shadow
- 16–24px padding
- clear section groups
- no tiny text
- no crowded columns

Dropdown content layout:
- left column: section title + short description + primary CTA
- right area: sub-page links in 2 or 3 columns
- optional small “popular” or “recommended” badges
- optional icon per item using consistent line icon style

Each dropdown item should have:
- title
- one-line description
- small icon
- active state when current page
- hover state
- focus state

Dropdown hover:
- row background changes softly
- icon shifts 2px
- Azure accent line appears
- no aggressive animation

SUB-NAV CONTENT BY MAIN TAB:

1. eSignature dropdown/sub-nav:
Title:
“LAGDA eSignature”
Description:
“Send, sign, track, and verify documents online.”

Items:
- Overview
  Description: “Start here for the complete eSignature story.”
- Core Workflow
  Description: “Prepare, send, verify, and sign.”
- Verification & Audit
  Description: “Track records, audit trails, and QR verification.”
- Advanced Capabilities
  Description: “Parallel signing, storage, and signing request logic.”
- Templates & Branding
  Description: “Reusable templates and company header/footer branding.”
- Team & Enterprise
  Description: “Workspaces, roles, reports, and enterprise controls.”

CTA:
“Explore eSignature”

Active color:
Azure Blue

2. Features dropdown/sub-nav:
Title:
“Features”
Description:
“Explore LAGDA’s core document execution capabilities.”

Items:
- All Features
- QR Document Verification
- Parallel Signing
- Audit Trail
- Templates
- Company Branding
- Storage & Plan Limits
- Identity-Aware Signing
- Team Workspace

CTA:
“View All Features”

Active color:
Azure Blue

3. Solutions dropdown/sub-nav:
Title:
“Solutions”
Description:
“Use LAGDA across legal, business, and institutional workflows.”

Items:
- Lawyers
- Law Firms
- Business Teams
- Government / LGU
- Real Estate
- HR & Recruitment
- Finance
- Procurement
- Education
- Healthcare / Wellness

CTA:
“Find Your Use Case”

Active color:
Azure Blue

4. Pricing dropdown/sub-nav:
Title:
“Pricing”
Description:
“Understand plans, limits, templates, storage, and enterprise options.”

Items:
- Plans
- Compare Plans
- Signing Requests
- Storage Limits
- Templates by Plan
- Enterprise
- FAQ

CTA:
“View Pricing”

Active color:
Azure Blue

Add small plan reminder:
“Personal starts free. Business is recommended for teams.”

5. Security dropdown/sub-nav:
Title:
“Security & Trust”
Description:
“Understand identity, audit, verification, and document protection.”

Items:
- Security Overview
- Identity Verification
- Audit Trail
- Document Verification
- IP / Device / Location Evidence
- Secure Storage
- Permissions
- Trust Center

CTA:
“Explore Security”

Active color:
Azure Blue

6. Resources dropdown/sub-nav:
Title:
“Resources”
Description:
“Guides, legal framework, FAQ, and support.”

Items:
- Guides
- FAQ
- Legal Framework
- Document Verification
- Help Center
- Contact
- Blog / Updates if already present
- Downloadable Resources if already present

CTA:
“Visit Resources”

Active color:
Azure Blue

7. eNotary Coming Soon dropdown/sub-nav:
Title:
“LAGDA eNotary”
Badge:
“Coming Soon”

Description:
“Future electronic notarization layer, subject to Supreme Court accreditation.”

Items:
- Overview
- Future Features
- Accreditation Roadmap
- Waitlist
- FAQ

CTA:
“Join Waitlist”

Active color:
Deep Legal Burgundy

Every item in this dropdown must show one of:
- Coming Soon
- Future
- Subject to Accreditation

Do not show “Start Now” for eNotary.
Do not show eNotary pricing as live.
Do not show active purchase flow for eNotary.

PAGE-LEVEL SUB-NAV BARS:
For pages that already have sub-navs, use a sticky page-level sub-nav below the main navbar.

Page-level sub-nav appears on:
- eSignature pages
- Features pages
- Solutions pages
- Pricing pages
- Security pages
- Resources pages
- eNotary Coming Soon pages

Page-level sub-nav does not appear on:
- Home
- Sign In
- Create Account
- Book Demo
- Contact Sales
- simple success pages
- legal policy pages unless needed

Page-level sub-nav behavior:
- appears below main navbar after hero or immediately below nav depending current design
- becomes sticky when scrolled past its initial position
- active item updates based on current page
- on long pages, active item can update based on section in viewport
- on short sub-pages, active item reflects the route
- hides only when not relevant to current section
- does not cover page headings
- has enough top offset below the main navbar

DESKTOP PAGE-LEVEL SUB-NAV STYLE:
- horizontal pill or segmented control
- max width aligned with content container
- white/glass background
- 1px border
- rounded 999px or 18px
- active item uses Azure fill or Azure underline
- eNotary active item uses Burgundy
- no more than 6–8 visible items before using horizontal scroll
- do not wrap into multiple messy rows

MOBILE NAVIGATION RULES:
Do not use hover on mobile.

Mobile main nav:
- hamburger menu
- slide-in panel or full-screen overlay
- logo at top
- close X visible
- main sections shown as accordion rows
- Create Free Account CTA visible at top or bottom
- Sign In visible but secondary

Mobile accordion behavior:
- tap main section row to expand/collapse
- chevron rotates
- only one section open at a time unless easier for usability
- tapping a sub-item navigates and closes menu
- active page is highlighted
- eNotary section uses Burgundy Coming Soon badge

Mobile eSignature sub-tabs:
- horizontal scroll pills below navbar, or compact dropdown selector
- labels shortened if needed:
  - Overview
  - Workflow
  - Verify
  - Advanced
  - Templates
  - Team
- tap target minimum 44px
- current tab visible without horizontal guessing
- active pill uses Azure Blue
- no tiny text

Mobile close rules:
- close mobile nav when user taps X
- close when user selects a route
- close on browser back behavior where feasible
- close on outside tap if side panel is used
- preserve scroll position where appropriate

TABLET RULES:
At tablet widths:
- use desktop nav if there is enough room
- otherwise switch to mobile hamburger
- do not squeeze main nav into tiny text
- do not wrap main nav into two rows
- preserve CTAs or move them into menu

BREAKPOINT GUIDANCE:
Desktop:
>= 1024px
Use full navbar + hover/click dropdowns.

Tablet:
768px–1023px
Use compact nav or hamburger depending available space.

Mobile:
< 768px
Use hamburger + accordion sub-navs.

ACTIVE STATE RULES:
Main nav active state:
- Home active on Home only
- eSignature active on all eSignature sub-pages
- Features active on all Features sub-pages
- Solutions active on all Solutions sub-pages
- Pricing active on Pricing and plan comparison pages
- Security active on Security and Trust pages
- Resources active on FAQ, Guides, Legal Framework, Help Center, Contact if grouped under Resources
- eNotary Coming Soon active on eNotary, Accreditation Roadmap, Waitlist, and eNotary FAQ

Sub-nav active state:
- exact sub-page item highlighted
- active text uses Azure or Burgundy
- active item has icon or pill indicator
- active state must not rely on color alone

WHEN SUB-NAVS SHOULD SHOW:
Show dropdown/mega menu:
- on desktop hover intent
- on desktop click
- on keyboard Enter/Space/ArrowDown
- when mobile accordion is expanded

Show page-level sub-nav:
- when user is inside a main section with multiple sub-pages
- after entering the relevant route
- after hero if the page design needs hero-first storytelling
- immediately below navbar if navigation between sub-pages is the priority

Show sticky page-level sub-nav:
- after user scrolls past its original position
- while user remains in the same main section
- until page footer if helpful
- but stop before overlapping footer if necessary

WHEN SUB-NAVS SHOULD HIDE:
Hide dropdown/mega menu:
- after selecting a link
- after route change
- on Escape
- on outside click
- on pointer leave after 200–300ms
- when another dropdown opens
- when focus leaves nav area
- when mobile menu closes

Hide page-level sub-nav:
- on pages without sub-sections
- in form-focused pages like Sign In or Create Account
- in modal contexts
- when a full-screen mobile menu is open
- when user reaches footer if it obstructs content
- when viewport height is too short and it blocks too much content

Do not hide page-level sub-nav just because the user scrolls down, unless it obstructs content.
If hiding is necessary, show it again on scroll up.

Z-INDEX / LAYERING RULES:
Layer order from top to bottom:
1. Modal overlays
2. Mobile navigation overlay
3. Main navbar
4. Desktop dropdown/mega menu
5. Sticky page-level sub-nav
6. Page content
7. Footer

Dropdowns must not be clipped by parent containers.
Dropdowns must not appear under hero cards.
Mobile nav must cover content cleanly.
Modals must cover nav.

MOTION RULES:
Use calm, premium motion.

Dropdown open:
- opacity 0 to 1
- translateY -6px to 0
- scale 0.98 to 1 if subtle
- duration 180–220ms
- easing ease-out

Dropdown close:
- opacity 1 to 0
- translateY 0 to -4px
- duration 120–160ms

Mobile menu open:
- slide from right or fade overlay
- duration 220–300ms
- background dim 30–45%

Accordion expand:
- height transition or content reveal
- duration 180–240ms

Active sub-tab movement:
- sliding underline/pill
- duration 180–220ms

Do not use:
- bounce
- spin
- flashy neon loops
- fast pulsing
- page-shaking
- hover effects that trigger too easily

REDUCED MOTION:
Respect reduced-motion settings:
- remove slide movement
- use opacity fade only
- no animated underline movement
- no pulsing badges
- no repeated glow loops
- keep menus functional

HAPTICS:
Add mobile haptics only where supported.

Use haptics for:
- opening mobile menu: light selection
- closing mobile menu: light selection
- expanding accordion: selection
- selecting sub-nav item: selection
- tapping Create Free Account: light confirmation
- tapping eNotary locked item: warning haptic

Do not trigger haptics:
- on hover
- on scroll
- repeatedly while menu is open
- on every small focus movement

If vibration/haptics are unsupported, silently skip and use visual feedback only.

DESKTOP-TO-MOBILE HANDOFF RULE:
If any nav item or sub-nav destination leads to a flow requiring camera/scanning/face verification/document scanning:
- if user is on desktop, show “Continue on mobile to use your camera” modal
- include secure QR code and short link
- preserve progress/session state
- include states for QR expired, regenerate QR, mobile connected, permission denied, camera unavailable, and return to desktop

This is especially relevant for:
- optional ID validation
- QR scanning
- selfie/liveness
- future eNotary identity verification
- future secure video appearance

SEARCH / COMMAND PALETTE OPTIONAL:
If feasible, add a small “Search LAGDA” interaction inside the desktop dropdown or mobile menu.

Search should help users find:
- eSignature
- Pricing
- Verify Document
- Templates
- Audit Trail
- QR Verification
- eNotary Waitlist
- Contact Sales

Do not make search required.
Keep it optional and lightweight.

MEGA MENU CONTENT QUALITY:
Each dropdown should answer:
- What is this section?
- Where should the user go next?
- What is recommended?
- Is anything Coming Soon?

For each dropdown, include:
- short title
- one-line description
- 4–8 sub-links
- one primary CTA
- optional trust badge
- no long paragraphs

Do not overload dropdowns.
Do not include every link in the entire site.
Do not duplicate footer.

PRIORITIZATION:
In dropdowns, place the most important links first.

eSignature:
1. Overview
2. Core Workflow
3. Verification & Audit
4. Advanced Capabilities
5. Templates & Branding
6. Team & Enterprise

Features:
1. All Features
2. QR Document Verification
3. Parallel Signing
4. Audit Trail
5. Templates
6. Company Branding
7. Storage & Plan Limits

Pricing:
1. Plans
2. Compare Plans
3. Signing Requests
4. Storage Limits
5. Templates by Plan
6. Enterprise

Security:
1. Security Overview
2. Identity Verification
3. Audit Trail
4. Document Verification
5. IP / Device / Location Evidence
6. Secure Storage

Resources:
1. FAQ
2. Guides
3. Legal Framework
4. Document Verification
5. Help Center
6. Contact

eNotary:
1. Overview
2. Future Features
3. Accreditation Roadmap
4. Waitlist
5. FAQ

CTA BEHAVIOR INSIDE SUB-NAVS:
Each dropdown primary CTA should route correctly:

eSignature CTA:
Explore eSignature → eSignature Overview

Features CTA:
View All Features → Features

Solutions CTA:
Find Your Use Case → Solutions

Pricing CTA:
View Pricing → Pricing

Security CTA:
Explore Security → Security

Resources CTA:
Visit Resources → Resources

eNotary CTA:
Join Waitlist → LAGDA eNotary Waitlist

Action buttons:
Create Free Account → Create Account
Sign In → Sign In

VISUAL STATES:
Every nav item must have:
- default
- hover
- active/current
- focus
- pressed
- disabled if applicable

Every dropdown item must have:
- default
- hover
- focus
- active/current
- Coming Soon/locked if applicable

Every mobile accordion row must have:
- collapsed
- expanded
- active
- focus
- pressed

COMING SOON / LOCKED STATES:
Use Burgundy lock badge for:
- LAGDA eNotary
- Future Features
- Accreditation Roadmap items
- secure video appearance
- electronic notarial book
- digital notarial seal/certificate
- ENP workflow

Locked item behavior:
- clicking eNotary overview navigates to eNotary Coming Soon page
- clicking future specific items navigates to relevant Coming Soon or roadmap page
- never show active purchase button
- CTA should be Join Waitlist or Learn More

LEGAL-SAFE COPY IN NAV:
Use:
“Coming Soon”
“Subject to Supreme Court Accreditation”
“Future electronic notarization layer”
“Join Waitlist”

Do not use:
“Start eNotary”
“Notarize Now”
“Supreme Court-approved”
“Accredited”
“ENF-certified”
“COA-approved”

MOBILE MENU CONTENT ORDER:
Mobile menu should show:

Top:
- LAGDA logo
- Close button
- Create Free Account CTA
- Sign In link

Accordion sections:
1. eSignature
2. Features
3. Solutions
4. Pricing
5. Security
6. Resources
7. eNotary Coming Soon

Bottom:
- Verify Document quick link
- Book a Demo
- Contact Sales
- eNotary status badge

Mobile quick actions:
- Create Free Account
- Verify Document
- Book Demo

PAGE-LEVEL SUB-NAV CONTENT:
On eSignature pages:
Overview | Core Workflow | Verification & Audit | Advanced Capabilities | Templates & Branding | Team & Enterprise

On Features pages:
All Features | QR Verification | Parallel Signing | Audit Trail | Templates | Branding | Storage

On Solutions pages:
Lawyers | Law Firms | Business Teams | Government/LGU | Real Estate | HR | Finance | Procurement

On Pricing pages:
Plans | Compare Plans | Signing Requests | Storage | Templates | Enterprise

On Security pages:
Overview | Identity | Audit Trail | Verification | IP/Device/Location | Storage | Permissions

On Resources pages:
Guides | FAQ | Legal Framework | Help Center | Contact

On eNotary pages:
Overview | Future Features | Accreditation Roadmap | Waitlist | FAQ

Keep each page-level sub-nav focused.
Do not show all site links in page-level sub-navs.

RESPONSIVE BEHAVIOR:
Desktop:
- main dropdown is mega menu
- page-level sub-nav is horizontal sticky bar

Tablet:
- if nav fits, use compact desktop
- if nav does not fit, switch to hamburger
- page-level sub-nav becomes horizontal scroll pills

Mobile:
- hamburger menu
- accordion sub-nav
- page-level sub-nav as scroll pills or dropdown selector
- no hover
- no tiny text

NAVIGATION ANALYTICS / DEMO STATES:
Create prototype-friendly active states for:
- menu opened
- menu closed
- sub-nav item selected
- CTA clicked
- mobile accordion expanded
- eNotary locked item tapped
- route changed

This can be internal state only for prototype behavior.

ERROR / EDGE CASES:
Handle:
- user opens one dropdown then hovers another: close first, open second
- user clicks outside: close all
- user presses Escape: close current menu
- user resizes window: reset open menu state
- route changes: close open dropdown/mobile menu
- mobile menu open then viewport becomes desktop: close mobile menu and show desktop nav
- dropdown near right edge: align right or center to prevent overflow
- small viewport height: make dropdown scrollable with max height

DROPDOWN MAX HEIGHT:
If dropdown content exceeds viewport:
- max-height: calc(100vh - navbar height - 32px)
- internal scroll allowed
- keep header/actions visible
- avoid body scroll lock for simple dropdowns
- for mobile overlay, body scroll can be locked

FOCUS MANAGEMENT:
When dropdown opens by keyboard:
- move focus to first item or keep on parent with ArrowDown support

When dropdown closes:
- return focus to parent nav item

When mobile menu opens:
- focus moves to close button or first menu item
- focus stays inside mobile menu until closed

When mobile menu closes:
- focus returns to hamburger button

VISUAL POLISH:
Add:
- tiny Azure line under active main tab
- dropdown panel glow matching active section
- clean line icons
- soft dividers
- consistent chevrons
- active route chip
- Coming Soon Burgundy badge
- “Recommended” badge for primary sub-page if helpful
- subtle background grid on mega menus
- no heavy animation

ACCESSIBILITY CHECKLIST:
Before finishing, verify:
- all nav links are reachable by keyboard
- dropdowns open and close with keyboard
- Escape closes dropdown
- click outside closes dropdown
- active page is clear
- focus state is visible
- mobile menu is usable without hover
- Coming Soon states include text
- dropdown text has strong contrast
- touch targets are at least 44px
- no tiny submenu text
- no menus require motion to understand
- reduced-motion behavior works

FINAL ROUTE CONNECTIONS:
Ensure these connections work:

Home → Home
eSignature → eSignature Overview
eSignature / Core Workflow → eSignature Core Workflow
eSignature / Verification & Audit → eSignature Verification & Audit
eSignature / Advanced Capabilities → eSignature Advanced Capabilities
eSignature / Templates & Branding → eSignature Templates & Branding
eSignature / Team & Enterprise → eSignature Team & Enterprise

Features → Features
Features / QR Document Verification → QR verification feature section or page
Features / Parallel Signing → parallel signing feature section or page
Features / Audit Trail → audit trail feature section or page
Features / Templates → templates feature section or page
Features / Company Branding → company branding feature section or page
Features / Storage & Plan Limits → storage feature section or pricing storage section

Solutions → Solutions
Solutions / Lawyers → Lawyers solution
Solutions / Law Firms → Law Firms solution
Solutions / Business Teams → Business Teams solution
Solutions / Government/LGU → Government/LGU solution
Solutions / Real Estate → Real Estate solution
Solutions / HR & Recruitment → HR solution
Solutions / Finance → Finance solution
Solutions / Procurement → Procurement solution

Pricing → Pricing
Pricing / Plans → Pricing
Pricing / Compare Plans → Plan comparison
Pricing / Signing Requests → Signing request explanation
Pricing / Storage Limits → Storage limits
Pricing / Templates by Plan → Templates by plan
Pricing / Enterprise → Enterprise pricing/contact sales

Security → Security
Security / Identity Verification → Identity section
Security / Audit Trail → Audit trail section
Security / Document Verification → Document Verification
Security / IP/Device/Location Evidence → Location evidence section
Security / Secure Storage → Secure storage section
Security / Permissions → Permissions section

Resources → Resources
Resources / Guides → Guides
Resources / FAQ → FAQ
Resources / Legal Framework → Legal Framework
Resources / Document Verification → Document Verification
Resources / Help Center → Help Center
Resources / Contact → Contact

eNotary Coming Soon → eNotary Coming Soon
eNotary / Future Features → Future Features
eNotary / Accreditation Roadmap → Accreditation Roadmap
eNotary / Waitlist → Waitlist
eNotary / FAQ → eNotary FAQ

Sign In → Sign In
Create Free Account → Create Account
Book Demo → Book Demo
Contact Sales → Contact Sales
Verify Document → Document Verification

QA PANEL:
Create or update a hidden internal route/panel called:
“Navigation QA Notes”

Include:
- desktop hover intent implemented
- desktop click dropdown implemented
- keyboard nav implemented
- Escape close implemented
- outside click close implemented
- mobile accordion nav implemented
- page-level sub-nav implemented
- active route states implemented
- eNotary Coming Soon states implemented
- reduced motion supported
- no misleading legal claims
- all nav routes connected

FINAL QA CHECK:
Before finishing, verify:
- main nav remains simple and clear
- sub-navs appear only when relevant
- sub-navs hide predictably
- dropdowns do not flicker
- desktop hover uses delay
- mobile does not rely on hover
- keyboard accessibility works
- focus management works
- active states are accurate
- page-level sub-navs do not cover content
- eNotary remains clearly Coming Soon
- design remains modern, techy, trustworthy, and consistent with LAGDA.io
```

[1]: https://www.nngroup.com/articles/mega-menus-work-well/?utm_source=chatgpt.com "Mega Menus Work Well for Site Navigation"
