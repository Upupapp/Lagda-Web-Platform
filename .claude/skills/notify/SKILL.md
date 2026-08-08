---
name: NOTIFY
description: Audits, designs, repairs, implements, and tests notification behavior for domain actions and state changes. Use when work adds or changes document lifecycle events, recipient actions, reminders, invitations, account or security events, Workspace events, in-app notifications, email templates, notification preferences, delivery infrastructure, provider webhooks, queues, outbox records, deep links, unread counts, or fallback destinations. Automatically use when a feature change creates a reasonable need to inform a User or recipient, stop an obsolete notification, update an existing notification, or verify that the correct audience receives timely and non-duplicative information.
when_to_use: Invoke automatically after changes to consequential actions, transaction states, recipient routing, sender tracking, authentication, consent, signing, completion, Verification, account security, Workspace membership, billing or usage, notification settings, email infrastructure, reminders, scheduled events, background jobs, provider feedback, route destinations, or capability gates. Also invoke for missing, duplicate, delayed, misleading, unsafe, noisy, inaccessible, cross-Workspace, or incorrectly addressed notifications. Infer the smallest sufficient scope and escalate only when shared notification infrastructure or event contracts changed.
argument-hint: "[changed|quick|event|flow|route|module|in-app|email|templates|preferences|reminders|deliverability|security|full|release|audit-only] [target]"
user-invocable: true
disable-model-invocation: false
---

# NOTIFY

NOTIFY is a reusable notification-integrity, notification-design, delivery-readiness, and regression-testing Skill.

NOTIFY applies to:

- In-app notifications
- Notification Center records
- Unread and read state
- Email notifications
- Transactional email
- Security email
- Recipient invitations
- Recipient reminders
- Sender status updates
- Completion notifications
- Workspace and account notifications
- Delivery-status feedback
- Notification preferences
- Digests
- Quiet hours
- Suppression behavior
- Deep links
- Fallback URLs
- Provider webhooks
- Outbox and queue direction
- Retry and deduplication behavior
- Frontend demonstration fixtures
- Future production notification services

NOTIFY means:

- **N — Normalize scope, events, terminology, and the notification catalog**
- **O — Observe authoritative state changes and determine who needs to know**
- **T — Target the correct audience, channel, timing, template, and destination**
- **I — Implement reliable, private, accessible, and idempotent behavior**
- **F — Feed back delivery results, failures, preferences, and suppressions**
- **Y — Yield verified coverage, repairs, tests, documentation, and handoff**

NOTIFY must not create notifications merely because an interface action exists.

A notification must correspond to a meaningful, authorized, and authoritative event or condition.

## Invocation input

$ARGUMENTS

## Supported invocation patterns

### Infer current scope

```text
/notify
```

Infer scope from:

- The current user request
- The active implementation task
- Git changes
- New or changed domain actions
- New or changed transaction states
- New or changed routes
- New or changed email templates
- New or changed Notification Center behavior
- New or changed backend events
- New or changed provider integration

### Changed-files audit

```text
/notify changed
```

Inspect uncommitted and relevant branch changes, then audit every notification consequence created or affected by those changes.

### Quick notification smoke audit

```text
/notify quick
```

Check the smallest relevant event, audience, channel, destination, preference, and fallback surface.

### One event

```text
/notify event "participant.completed"
```

Audit or implement one canonical domain event and all intended notification projections.

### One flow

```text
/notify flow "sender sends a document and recipients complete it"
```

Trace the notification behavior across an end-to-end user journey.

### One route or destination

```text
/notify route "/app/documents/:documentId"
```

Audit notifications that lead to, originate from, or become stale around the route.

### One module

```text
/notify module documents
/notify module authentication
/notify module workspaces
```

Audit notification behavior for one domain module and its adjacent dependencies.

### In-app notifications

```text
/notify in-app
```

Audit Notification Center, badges, unread state, grouping, deep links, stale destinations, privacy, and accessibility.

### Email

```text
/notify email
```

Audit transactional-email requirements, templates, audience selection, secure links, mock versus real delivery, and failure behavior.

### Templates

```text
/notify templates
```

Audit subject lines, preheaders, content, CTA behavior, fallback URLs, variables, localization, privacy, branding, and rendering.

### Preferences

```text
/notify preferences
```

Audit notification categories, channels, required communications, optional communications, defaults, quiet hours, digests, and preference enforcement.

### Reminders

```text
/notify reminders
```

Audit reminder eligibility, timing, timezone, frequency, caps, stop conditions, expiration, deduplication, and preference behavior.

### Deliverability

```text
/notify deliverability
```

Audit sending-domain authentication, provider feedback, bounces, complaints, suppressions, retries, rate limits, and delivery observability.

### Security

```text
/notify security
```

Audit authentication, account recovery, security alerts, access links, token handling, trusted destinations, sensitive data, and recipient enumeration risk.

### Full application audit

```text
/notify full
```

Audit the complete public and authenticated notification surface.

### Release audit

```text
/notify release
```

Perform release-level notification catalog validation, integration testing, template rendering, delivery simulation, provider-feedback testing where available, accessibility testing, and regression validation.

### Audit only

```text
/notify audit-only [scope] [target]
```

Report defects without modifying source files.

Additional modifiers may be combined:

- `report`
- `no-fix`
- `frontend-only`
- `backend`
- `mobile`
- `localization`
- `permissions`
- `cross-browser`

`no-fix` is equivalent to `audit-only`.

## Automatic invocation behavior

NOTIFY is reusable and may be re-triggered whenever later work affects its scope.

Claude must automatically invoke NOTIFY when a task:

- Adds a consequential User action
- Adds or changes a domain state
- Adds or changes a transaction transition
- Adds a recipient role or participant action
- Adds or changes request sending
- Adds or changes reminders
- Adds or changes completion behavior
- Adds or changes cancellation, voiding, expiration, rejection, or decline behavior
- Adds or changes authentication or account recovery
- Adds or changes security settings
- Adds or changes Workspace membership or invitations
- Adds or changes billing or usage events
- Adds or changes Verification results
- Adds or changes Notification Center behavior
- Adds or changes email templates
- Adds or changes a notification preference
- Adds or changes a notification deep link
- Adds or changes a queue, worker, scheduler, outbox, webhook, or email provider
- Adds or changes delivery-status processing
- Adds or changes feature or capability gating that affects notification visibility
- Could make an existing notification obsolete, misleading, duplicated, or incorrectly addressed

Claude must not wait for the User to mention NOTIFY explicitly when one of these triggers is materially present.

At the start of execution, state:

```
NOTIFY scope: <resolved scope>
NOTIFY mode: audit-and-repair
```

or:

```
NOTIFY scope: <resolved scope>
NOTIFY mode: audit-only
```

Also state the detected delivery phase:

```
NOTIFY delivery phase: frontend demonstration
```

or:

```
NOTIFY delivery phase: backend contract
```

or:

```
NOTIFY delivery phase: production-capable delivery
```

Do not claim production capability merely because email-related frontend code exists.

## Scope resolution

Resolve scope in this order:

1. Explicit invocation arguments
2. Current User request
3. Current implementation task
4. Uncommitted Git changes
5. Changed domain events
6. Changed transaction states
7. Changed notification templates
8. Changed routes and destinations
9. Changed shared notification infrastructure
10. Smallest meaningful notification surface

Do not automatically run a complete application audit for a local copy change.

### Escalate to a full event

Escalate from `quick` or `changed` when work affects:

- A domain event
- An event payload
- Audience resolution
- Notification policy
- Reminder eligibility
- A notification template
- A deep link
- A notification preference
- A terminal transaction state

### Escalate to a module

Escalate when work affects:

- A shared notification factory
- A shared event handler
- A shared recipient resolver
- Notification grouping
- Notification Center storage
- A shared email-template layout
- A module-level state machine
- A module's reminder policy

### Escalate to full or release

Escalate when work affects:

- The notification event catalog
- Shared outbox behavior
- Shared queue or worker behavior
- Email provider configuration
- Webhook ingestion
- Suppression lists
- Sending-domain authentication
- Shared notification preferences
- Global notification routing
- Global deep-link generation
- Cross-Workspace audience isolation
- Deployment-level email configuration
- A release candidate

## Relationship with STITCH

NOTIFY owns whether an event should notify, whom it should notify, through which channel, with what content, and how delivery state is handled.

STITCH owns whether the notification destination and fallback journey are connected correctly.

When NOTIFY adds or changes:

- Notification deep links
- Email CTA links
- Fallback URLs
- Notification Center destinations
- Authentication return paths
- Stale-record destinations

and the STITCH Skill is available, invoke STITCH for the smallest relevant route or flow after NOTIFY implementation.

Do not duplicate STITCH's complete user-flow audit inside NOTIFY.

## Core notification principles

### 1. Authoritative events, not UI clicks

Create notification intent from an authoritative domain event or durable condition.

Prefer:

```
document.requested
participant.action_required
participant.completed
transaction.completed
workspace.invitation_created
security.password_changed
```

Avoid:

```
send_button_clicked
completion_modal_opened
dashboard_card_viewed
```

A frontend click may initiate a command, but the notification should represent the authoritative resulting event.

When the project remains frontend-only, model this boundary explicitly with deterministic event fixtures. Do not claim the event was persisted or delivered.

### 2. A notification is not the source of truth

Notifications are communication projections.

They must not determine:

- Document status
- Participant status
- Access rights
- Signing completion
- Consent
- Authentication
- Evidence
- Verification
- Billing
- Workspace membership
- Legal effect

The authoritative domain record must remain independent.

### 3. Separate Notification, Activity, Evidence, and audit

**NOTIFICATION** — Tells an intended recipient that something relevant happened or requires attention.

**ACTIVITY** — Represents domain history visible within the authorized product context.

**EVIDENCE** — Represents transaction-specific proof produced by authoritative backend processes.

**AUDIT LOG** — Represents controlled administrative or system history where implemented.

**EMAIL DELIVERY EVENT** — Represents provider-side handling such as accepted, delivered to a mail server, delayed, bounced, rejected, or complained.

Do not treat:

- An email being accepted as recipient receipt
- An email being delivered to a mail server as recipient review
- An email open as legal notice
- An email click as authentication
- A notification being read as participant completion
- A Notification Center record as Evidence

### 4. Correct audience before channel

Before selecting in-app or email, determine:

- Who needs to know?
- Who must not know?
- Who owns the event?
- Who is affected?
- Who can act?
- Who is merely observing?
- Does the target already have access?
- Is the target an authenticated User, Workspace Member, Contact, or external recipient?
- Is the information sender-only, recipient-only, administrator-only, or security-sensitive?

Never let notification delivery grant access.

### 5. Minimum necessary information

Notification content must include only what the target needs to understand and safely act.

Do not include by default:

- Full document contents
- Filled field values
- Signature or Initials representations
- Authentication codes in ordinary status notifications
- Access tokens
- Consent Evidence
- Authentication Evidence
- IP address
- Device fingerprint
- Sensitive participant information
- Private notes
- Internal Workspace configuration
- Another recipient's action
- Internal Automation details
- Billing details unrelated to the recipient
- Private Verification payloads

### 6. Timely but not noisy

Use notification urgency, grouping, digests, reminders, and preferences deliberately.

Do not notify merely because data changed.

A notification should normally satisfy at least one:

- Action is required
- A consequential requested action succeeded or failed
- A material state changed
- Security requires awareness
- A deadline or expiration is approaching
- A recipient or sender reasonably needs confirmation
- A failure requires intervention
- An administrator must address an account issue

### 7. Idempotency and deduplication

The same domain event may be retried or observed multiple times.

Notification creation and delivery must support idempotency.

A conceptual deduplication key may include:

- event ID
- notification definition ID
- target ID or target address
- channel
- template version
- relevant occurrence or reminder sequence

Use the project's actual architecture.

Do not use visible notification text as a deduplication key.

### 8. Delivery is asynchronous

A domain operation should not depend on synchronous email delivery succeeding.

The application should distinguish:

- Domain action succeeded
- Notification intent recorded
- Delivery queued
- Provider accepted
- Mail server accepted
- Delivery delayed
- Delivery failed
- Recipient suppressed
- Provider complaint received

Do not convert a successful document action into a failed document action solely because email delivery failed unless the product explicitly requires atomic delivery and documents that requirement.

### 9. Stop obsolete notifications

When a condition is no longer true:

- Stop pending reminders
- Suppress stale actions
- Update or invalidate in-app destinations
- Prevent reminders after completion
- Prevent invitations after cancellation
- Prevent sender attention notices after resolution
- Prevent security links after expiry or use

### 10. Transactional and marketing separation

Keep operational eSignature, account, security, and service communications separate from marketing.

Do not add:

- Product promotions
- Cross-selling
- Advertisements
- Referral incentives
- Unrelated announcements

to transaction-critical messages.

Marketing preferences and legal requirements must not be implemented by guessing. Record jurisdictional review requirements in documentation.

---

## Phase N — Normalize scope and build the catalog

### Preflight

Before editing:

1. Confirm the working directory.
2. Inspect Git status.
3. Preserve unrelated uncommitted work.
4. Identify the frontend and backend architecture.
5. Identify whether the project is:
   - Frontend demonstration only
   - Backend-contract phase
   - Production-capable
6. Locate:
   - Notification models
   - Notification fixtures
   - Notification Center
   - Unread state
   - Notification preferences
   - Email templates
   - Template-preview tools
   - Domain events
   - Transaction state machine
   - Outbox
   - Queue
   - Worker
   - Scheduler
   - Email provider adapter
   - Provider webhooks
   - Suppression logic
   - Route and deep-link builders
   - Tests
   - Documentation
7. Inspect existing terminology.
8. Inspect capability and permission resolvers.
9. Inspect Workspace, Team, User, Member, Contact, and recipient boundaries.
10. Inspect STITCH integration where available.

### Search for notification behavior

Search the repository for:

```
notification, notifications, notify, email, mail, mailer, template, subject, preheader,
reminder, digest, inbox, unread, readAt, seenAt, dismissed, toast, alert,
invite, invitation, completed, declined, rejected, expired, cancelled, voided,
delivery, delivered, bounce, complaint, suppression, outbox, queue, worker,
scheduler, cron, webhook, retry, dead letter, idempotency, dedup, Message-ID,
returnTo, redirect, deep link, magic link, access token, password reset, verification email
```

Also search for misleading success claims:

```
email sent, notification sent, delivered successfully, recipient notified, reminder sent,
invitation sent, email delivered, message received, opened, viewed
```

### Build or update the notification event catalog

Every notification-capable event should have one canonical definition.

A definition should identify:

- Event ID
- Event version
- Domain owner
- Event description
- Authoritative source
- Triggering state transition
- Eligible audience
- Excluded audience
- Available channels
- Default channel policy
- Urgency
- Timing
- Delay
- Reminder behavior
- Grouping behavior
- Deduplication behavior
- Preference behavior
- Quiet-hours behavior
- Template IDs
- Deep-link destination
- Fallback destination
- Sensitive-data classification
- Retention direction
- Backend readiness
- Frontend fixture availability
- Testing coverage

Do not create separate uncoordinated catalogs for in-app and email.

### Recommended typed concepts

Create or normalize types such as:

```
NotificationEvent, NotificationEventId, NotificationEventVersion,
NotificationDefinition, NotificationDefinitionId, NotificationCategory,
NotificationUrgency, NotificationChannel, NotificationAudience,
NotificationTarget, NotificationTargetType, NotificationTargetResolution,
NotificationEligibility, NotificationExclusion, NotificationIntent,
NotificationIntentId, NotificationStatus, NotificationPreference,
NotificationPreferenceCategory, NotificationPreferenceRule,
NotificationDigestPolicy, NotificationQuietHours, NotificationSchedule,
NotificationReminderPolicy, NotificationDeduplicationPolicy,
NotificationGroupingPolicy, NotificationDeepLink,
NotificationFallbackDestination, NotificationTemplate, NotificationTemplateId,
NotificationTemplateVersion, NotificationTemplateVariable,
NotificationTemplateRenderResult, NotificationDeliveryAttempt,
NotificationDeliveryAttemptId, NotificationDeliveryStatus,
NotificationProviderMessageId, NotificationProviderEvent,
NotificationProviderEventId, NotificationProviderEventType,
NotificationSuppression, NotificationSuppressionReason,
NotificationOutboxRecord, NotificationOutboxRecordId, NotificationError,
NotificationScenario, NotificationAuditResult
```

Reuse stable existing types.

Do not duplicate:

- User, Workspace, Team, Member, Contact, Participant, Document, Transaction
- Route metadata, Permission, Feature availability, Plan, Service result
- Domain event

### Canonical categories

Use actual project terminology.

Potential categories include:

- `action-required`
- `document-status`
- `participant-status`
- `completion`
- `reminder`
- `verification`
- `workspace`
- `account`
- `security`
- `billing-and-usage`
- `system`

Do not create a broad general category as a default escape hatch without a documented reason.

### Canonical urgency

Potential levels:

- `critical`
- `time-sensitive`
- `action-required`
- `informational`
- `low-priority`

Urgency must affect:

- Channel policy
- Timing
- Grouping
- Digest eligibility
- Quiet-hours behavior
- Visual treatment
- Accessibility behavior

Urgency must not imply legal significance.

---

## Phase O — Observe events and resolve audiences

### Build the event-to-notification matrix

For each in-scope action or state transition, answer:

- Did an authoritative event occur?
- Does anyone need to know?
- Is action required?
- Who owns the next action?
- Who must be excluded?
- Is in-app appropriate?
- Is email appropriate?
- Is immediate delivery required?
- Is a digest acceptable?
- Is a reminder required?
- What stops future reminders?
- What destination should open?
- What happens when the destination is unavailable?
- What preferences apply?
- What data is safe to include?
- How is duplication prevented?
- What failure feedback is required?
- Is a backend service required?

### LAGDA event families to inspect

Do not blindly implement every example. Reconcile with actual repository state and product scope.

#### Account and security

Potential events:

```
account.created
account.email_verification_requested
account.email_verified
account.recovery_requested
account.password_changed
account.email_changed
account.security_setting_changed
account.session_revoked
account.suspicious_access_detected
```

Security requirements:

- Avoid account enumeration
- Use consistent recovery-request responses
- Use secure, expiring, single-use tokens where applicable
- Use trusted HTTPS origins
- Do not use unvalidated redirect destinations
- Do not expose passwords, OTPs, or secrets
- Notify through a previously trusted channel when sensitive contact details change where supported
- Do not claim suspicious-access detection exists unless it does

#### Workspace and membership

Potential events:

```
workspace.invitation_created
workspace.invitation_accepted
workspace.invitation_expired
workspace.member_role_changed
workspace.member_removed
workspace.team_assignment_changed
workspace.security_policy_changed
```

Audience considerations:

- Invitee
- Inviter
- Workspace administrators
- Affected Member

Do not notify all Workspace Members by default.
Do not expose Workspace membership to an unrelated address.

#### Document preparation

Potential events:

```
document.created
document.preparation_needs_attention
document.ready_for_review
document.request_ready
document.request_failed
```

Most low-level edits should not produce notifications.
Do not notify recipients while the document remains a sender-only Draft.

#### Request and recipient lifecycle

Potential events:

```
transaction.sent
recipient.action_required
recipient.reminder_due
recipient.viewed
recipient.authentication_failed
recipient.completed
recipient.approved
recipient.rejected
recipient.acknowledged
recipient.declined
transaction.delivery_issue
transaction.expiring
transaction.expired
transaction.cancelled
transaction.voided
transaction.completed
completed_document.available
```

Inspect actual roles and statuses.

Do not notify:

- A participant about another participant's private action unless product policy explicitly allows it
- An external recipient about internal Workspace settings
- A Contact merely because the Contact's email matches an authenticated User
- A sender that an email was "delivered" when only the provider accepted it

#### Verification

Potential events:

```
verification.match_available
verification.mismatch_detected
verification.unavailable
verification.reference_expired
```

Do not:

- Call document Verification identity verification
- Notify unrelated recipients of Verification details
- Claim legal validity
- Claim notarization
- Expose Verification internals in email

#### Billing and usage

Potential events:

```
usage.threshold_reached
plan.limit_reached
billing.payment_action_required
billing.subscription_changed
```

Only implement events supported by actual product scope and backend readiness.
Do not claim a payment occurred when billing remains frontend-only.

### Audience resolver

Use one centralized audience resolver.

It should consider:

- Event owner
- Actor
- Subject
- Document owner
- Sender
- Assigned participant
- Current routing position
- Workspace
- Team
- Member status
- Contact versus User distinction
- External recipient status
- Permission
- Access
- Notification preference
- Suppression
- Account status
- Transaction state
- Capability availability

Requirements:

- Event IDs do not grant access.
- Notification records do not grant access.
- Matching email addresses do not establish account identity.
- Workspace administrators do not automatically receive private document notifications.
- Team scope remains enforced.
- Removed or suspended Members are excluded where appropriate.
- Previous participants are excluded from newly created unrelated transactions.
- BCC must not be used to hide accidental audience expansion.
- Recipient lists must be minimized and explicit.

### Actor and target behavior

Avoid notifying a User about their own low-value action when the interface already confirms it.

Potential exceptions:

- Security-sensitive account changes
- A durable confirmation requested by the User
- An operation that finishes asynchronously
- A document action whose final result is not immediately visible
- An email copy required by product policy

---

## Phase T — Target channel, timing, template, and destination

### Channel selection

**In-app** — Use when:

- The target is an authenticated User
- The event is relevant during normal product use
- A durable Notification Center record is useful
- A safe internal destination exists
- Email would be unnecessary or optional

**Email** — Use when:

- An external recipient must be invited
- An authenticated User may not be in the application
- Security requires out-of-band awareness
- A time-sensitive action requires attention
- A durable transaction communication is appropriate
- The User has selected email for an optional category
- Product policy requires an operational confirmation

**Both** — Use only when each channel has a distinct role or urgency justifies redundancy. Do not default every event to both.

**Neither** — Some events belong only in Activity, Evidence, logs, or the current screen.

### Channel policy

For each notification definition, define one:

- `required-in-app`
- `required-email`
- `required-in-app-and-email`
- `user-configurable`
- `digest-eligible`
- `suppressed-by-default`
- `development-only`

Do not let ordinary component code decide channel behavior independently.

### Timing policy

Potential timing:

- `immediate`
- `after-commit`
- `scheduled`
- `delayed`
- `digest`
- `quiet-hours-deferred`
- `manual`

Requirements:

- Use timezone-aware dates.
- Store canonical timestamps according to existing architecture.
- Render recipient-local time where supported.
- Avoid ambiguous date formats.
- Do not promise exact email arrival time.
- Distinguish scheduled time from provider acceptance and delivery.
- Cancel scheduled notifications when eligibility ends.

### Reminder policy

Every reminder definition should identify:

- Eligible event or unresolved condition
- First-reminder delay
- Subsequent interval
- Maximum reminder count
- Expiration
- Quiet-hours behavior
- Timezone
- Recipient preference behavior
- Sender override behavior where permitted
- Stop conditions
- Deduplication key
- Escalation behavior
- Terminal-state behavior

Required stop conditions may include:

- Recipient completed
- Recipient declined
- Recipient rejected
- Transaction completed
- Transaction cancelled
- Transaction voided
- Transaction expired
- Recipient removed
- Recipient routing position no longer active
- Access revoked
- Address suppressed

Do not continue reminders after a terminal event.
Do not create daily reminders by default without product approval.
Do not let repeated page refreshes schedule repeated reminders.

### Grouping and digesting

Consider grouping when multiple events affect:

- The same document
- The same participant
- The same Workspace
- The same security category
- The same short time window

Do not group:

- Security-critical events with ordinary summaries
- Different Workspaces in a way that leaks context
- Different external recipients
- Events that require independent action
- Transactions with conflicting visibility

A digest must preserve:

- Clear item-level destination
- Safe counts
- Workspace separation
- Time range
- Unread behavior
- Preference behavior
- Accessibility

### Notification templates

Every email template should have:

- Stable template ID
- Version
- Category
- Audience
- Subject
- Preheader
- Sender identity direction
- Heading
- Concise explanation
- Primary CTA
- Safe fallback URL
- Expiration or timing information where relevant
- Support direction
- Security guidance where relevant
- Plain-text representation
- HTML representation where supported
- Required variables
- Optional variables
- Localization state
- Privacy classification
- Test fixtures

Every in-app template should have:

- Stable definition ID
- Concise title
- Concise body
- Category
- Urgency
- Actor direction where safe
- Resource direction
- Destination
- Fallback destination
- Grouping behavior
- Read behavior
- Expiration or stale behavior

### Email subject guidelines

Subjects should:

- Accurately describe the operational purpose
- Identify LAGDA consistently
- Identify required action where appropriate
- Avoid deceptive urgency
- Avoid unnecessary sensitive details
- Avoid exposing confidential document names where policy does not permit it
- Avoid all-capital urgency
- Avoid legal-validity claims
- Avoid marketing language

Potential direction:

```
Action required: Review a document in LAGDA
Document request completed in LAGDA
Security notice for your LAGDA account
You were invited to a LAGDA Workspace
```

Use actual approved product terminology.

### Email content safeguards

Do not include:

- Password requests
- OTP requests outside the approved authentication flow
- Raw access tokens
- Full confidential document content
- Signature representations
- Filled recipient fields
- Evidence payloads
- Internal comments
- Another participant's private status
- Integration secrets
- Detailed authentication data
- Unnecessary IP or device information

Avoid document attachments unless an approved production security and retention design explicitly supports them.

### Email CTA links

Links must:

- Use HTTPS in production
- Use an approved trusted origin
- Use a centralized URL builder
- Avoid unvalidated redirects
- Use opaque, purpose-bound tokens where required
- Expire appropriately
- Be single-use where the security flow requires it
- Be invalidated after terminal events
- Revalidate access at destination
- Avoid document titles, recipient names, or email addresses in query values
- Provide a safe fallback when invalid or expired

When displaying a fallback URL:

- Make it copyable
- Keep it on an approved domain
- Do not reveal a reusable secret unnecessarily
- Explain expiration
- Do not expose internal routes

### Recipient-access email safeguards

A recipient email must clearly distinguish:

- Sender identity direction
- LAGDA platform identity
- Requested participant role
- Expected action
- Expiration direction where applicable
- Security guidance
- Support or report direction

It must not ask a recipient to:

- Reply with a password
- Send an OTP by email
- Download unknown software
- Disable security controls
- Forward a private access link
- Trust an unrelated domain

### Branding

Use official LAGDA assets and established product design.

Do not:

- Embed unapproved logos
- Recolor the official logo
- Distort the logo
- Use Burgundy for active eSignature messages

Active eSignature email uses Azure, Navy, White, and approved supporting colors.

Any future eNotary reference must use exactly:

> Coming Soon — Subject to Supreme Court Accreditation and applicable rules.

Do not include eNotary promotion in transaction-critical eSignature email.

---

## Phase I — Implement reliable and accessible behavior

### Delivery-phase rules

#### Frontend demonstration phase

When no production backend exists:

- Build or repair typed notification definitions.
- Build deterministic event fixtures.
- Build deterministic in-app notification fixtures.
- Build email template previews.
- Build recipient-resolution previews.
- Build preference behavior in frontend memory.
- Build mock provider events only when clearly labeled.
- Add tests.
- Document backend requirements.
- Do not call a real email provider.
- Do not claim an email was sent.
- Do not claim a recipient was notified.
- Do not claim delivery.
- Do not show fake production message IDs.
- Do not add server packages merely to simulate delivery.

Use language such as:

```
Email notification preview created
Notification fixture added
Delivery requires backend services
No email was sent
```

#### Backend-contract phase

When API and backend contracts exist but delivery is not production-ready:

- Define event contracts.
- Define outbox contracts.
- Define provider-adapter interfaces.
- Define delivery-status contracts.
- Define webhook contracts.
- Define retry and suppression contracts.
- Keep real delivery disabled.
- Use explicit adapter readiness.
- Do not silently fall back to mock success.

#### Production-capable phase

Only when production services actually exist:

- Verify transactional event publication.
- Verify durable intent creation.
- Verify queue or worker processing.
- Verify provider acceptance.
- Verify provider feedback.
- Verify suppression behavior.
- Verify retries and dead-letter behavior.
- Verify monitoring and alerts.
- Verify environment configuration.
- Verify safe production fallback.

### Transactional outbox direction

When domain state and notification intent must remain consistent:

- Save the authoritative domain state change and notification event or outbox record within the same supported transaction boundary.
- Process delivery asynchronously.
- Use stable event IDs.
- Make consumers idempotent.
- Preserve event ordering where domain correctness requires it.
- Detect duplicates.
- Retain failed records according to operational policy.
- Provide replay behavior.
- Do not publish an event before the domain transaction commits.
- Do not lose a notification because the application crashed between the database commit and queue publication.

Use the architecture supported by the existing stack.
Do not add an outbox implementation if no backend exists; document the future boundary instead.

### Notification service boundary

Create or normalize an interface such as:

```
NotificationService
NotificationPolicyService
NotificationPreferenceService
NotificationTemplateService
NotificationDeliveryService
NotificationProviderAdapter
NotificationProviderEventService
NotificationSuppressionService
NotificationReminderService
```

Potential methods:

```
resolveDefinitions(event, context)
resolveAudience(event, definition, context)
evaluateEligibility(event, definition, target, context)
createNotificationIntents(event, context)
listNotifications(query, context)
getNotification(notificationId, context)
markRead(notificationId, context)
markUnread(notificationId, context)
markAllRead(context)
dismissNotification(notificationId, context)
getUnreadCount(context)
resolveNotificationDestination(notificationId, context)
listPreferences(context)
updatePreference(input, context)
renderInAppTemplate(input, context)
renderEmailTemplate(input, context)
previewEmailTemplate(input, context)
scheduleReminder(input, context)
cancelReminder(input, context)
dispatchPendingNotifications(context)
recordDeliveryAttempt(input, context)
ingestProviderEvent(input, context)
applySuppression(input, context)
retryDelivery(input, context)
```

Follow actual architecture and current phase.

### In-app notification behavior

An in-app notification may contain:

- ID
- Definition ID
- Category
- Urgency
- Safe title
- Safe body
- Created timestamp
- Read timestamp
- Dismissed timestamp where supported
- Actor direction
- Resource direction
- Workspace context
- Team context
- Destination
- Fallback destination
- Group key
- Stale state
- Permission context
- Capability context

Requirements:

- Notification Center remains current-User scoped.
- Unread counts remain permission filtered.
- Counts do not leak hidden resources.
- A notification does not grant access.
- Destination revalidates access.
- Stale notifications remain understandable.
- Marking read does not perform the underlying action.
- Dismissal is not deletion of Activity.
- Account and Workspace switching clear or revalidate state.
- Notifications from a previous User must not flash.

### Toasts versus Notification Center

**TOAST** — Use for immediate interface feedback.

**NOTIFICATION CENTER** — Use for information that remains relevant after navigation or requires later attention.

Do not use a toast as the only delivery for:

- Security issues
- Required participant action
- Delivery failure
- Billing action
- Important completion state
- Expiring access
- An asynchronous operation result

Do not create a Notification Center record for every successful button click.

### Accessible in-app behavior

Ensure:

- Status messages use appropriate semantic announcements
- Critical notices remain visible and are not only transient
- Notification titles are descriptive
- Unread state is not communicated only with color
- Urgency is not communicated only with icons
- Notification list is keyboard navigable
- Mark Read controls have accessible names
- Dismiss controls have accessible names
- Focus is restored after drawers or dialogs close
- Deep-link navigation produces an understandable destination
- Notification badges have accessible labels
- Large counts have safe labels such as `99+` where appropriate
- Live regions do not repeatedly announce large batches
- Reduced-motion preferences are respected
- 200% zoom remains usable
- Mobile Notification Center remains usable

### Accessible email behavior

Where HTML email exists:

- Use semantic heading order where email-client support permits
- Include meaningful link text
- Do not use image-only information
- Provide alt text for meaningful images
- Keep decorative images nonessential
- Use sufficient contrast
- Avoid tiny text
- Use responsive layout
- Keep CTA touch targets usable
- Provide a plain-text version
- Do not rely solely on color
- Use readable language
- Preserve content when images are blocked
- Avoid auto-playing or animated content
- Test in representative email clients where infrastructure permits

### Email rendering safety

- Escape variables.
- Sanitize or reject unsupported rich content.
- Do not place raw user HTML in templates.
- Do not execute template expressions beyond the approved engine.
- Detect missing required variables.
- Fail closed on unknown security-sensitive variables.
- Record rendering failures.
- Do not send malformed fallback content silently.
- Keep a test fixture for long names and long document labels.
- Keep a test fixture for non-ASCII and Philippine names.
- Keep a test fixture for missing optional values.

### Security and privacy audit

#### Sensitive-link behavior

For password reset, recipient access, email verification, and similar links:

- Generate tokens securely in the backend.
- Use sufficient entropy.
- Bind tokens to purpose and subject.
- Store them securely.
- Expire them.
- Invalidate them after use where appropriate.
- Use HTTPS.
- Build links from an approved origin.
- Avoid trusting an unvalidated Host header.
- Do not log raw tokens.
- Do not expose tokens in analytics.
- Avoid third-party scripts on sensitive landing pages where practical.
- Prevent referrer leakage where applicable.
- Revalidate transaction status at use time.
- Show a safe expired or invalid state.

In frontend-only phases, define the contract and use opaque fictional tokens only.

#### Open-redirect protection

Validate: `returnTo`, `redirect`, `next`, `continue`, `callback`, `destination`

Requirements:

- Permit only approved internal destinations or explicit trusted origins.
- Reject malformed values.
- Reject protocol-relative URLs.
- Reject JavaScript schemes.
- Avoid reflecting an unsafe value.
- Use a safe fallback.
- Do not put private values into fallback URLs.

#### Account enumeration

Recovery, invite, and verification requests must avoid revealing unnecessary account existence.

Use consistent response direction where appropriate.

Do not make invitation behavior so generic that a legitimate invitee cannot understand the invitation after receiving it.

#### Logging

Do not log:

- Raw access tokens
- Reset tokens
- Authentication codes
- Passwords
- Signature data
- Initials data
- Document content
- Filled field values
- Full recipient lists
- Sensitive email body content
- Provider webhook secrets
- Consent Evidence
- Authentication Evidence

Log safe correlation identifiers and redacted operational metadata.

#### Cross-tenant safety

Verify:

- Correct Workspace
- Correct Team
- Correct account
- Correct target User
- Correct participant
- Correct external-recipient address
- Correct document access
- Correct notification preference context
- Correct provider-event correlation

A notification sent to the wrong target is a P0 defect.

---

## eSignature-specific notification rules

### Recipient invitation

A recipient invitation should identify:

- The sender direction
- The expected action
- The LAGDA platform
- A safe CTA
- Expiration direction where applicable
- Security guidance
- Support or report direction

It must not:

- Reveal other recipients unnecessarily
- Reveal internal Workspace data
- Claim the document is legally valid
- Claim identity is verified
- Claim notarization
- Attach the document without approved policy
- Send before the request reaches an authoritative sent state

### Recipient reminder

A reminder must:

- Reference the unresolved action
- Use a valid current access path
- Stop after action or terminal state
- Respect reminder policy
- Avoid repeated duplicate sends
- Avoid misleading urgency
- Avoid claiming a deadline unless one exists

### Sender status notification

Potential sender notices:

- Delivery problem
- Participant completed
- Participant declined or rejected
- Transaction expired
- Transaction completed
- Completed-document direction available
- Verification attention required

Do not notify the sender for every low-value participant view by default.

### Completion notification

Completion email must not be emitted until the authoritative transaction is completed.

Where the project remains frontend-only:

- Render a preview only
- Do not say delivery occurred
- Do not create real completed-document links
- Do not generate Evidence claims

### Cancellation and voiding

When cancelled or voided:

- Stop pending invitations and reminders
- Invalidate access where the backend supports it
- Notify affected parties according to product policy
- Explain that no further action is available
- Provide a safe fallback
- Do not expose the cancellation reason unless authorized

### Expiration

Expiration notices should distinguish:

- Approaching expiration
- Expired
- Extended expiration where supported

Do not continue action-required reminders after expiration.

### LAGDA product safeguards

Active product family:

- LAGDA eSignature
- LAGDA Document Verification

Future only:

- LAGDA eNotary

Do not create notification events for:

- Active notarization sessions
- Notary assignments
- Notarial certificates
- Notarial seals
- Accreditation approval
- Notarial Evidence
- eNotary completion

Any future eNotary reference must use exactly:

> Coming Soon — Subject to Supreme Court Accreditation and applicable rules.

Do not send eNotary marketing through eSignature transactional messages.

Do not use unsupported claims such as:

```
Fully compliant
Guaranteed legally valid
Supreme Court approved
Accredited
Tamper-proof
Unbreakable
Identity verified
Immutable notification record
Delivery guaranteed
Recipient legally notified
Notarized
```

---

## Phase F — Feed back delivery results, failures, preferences, and suppression

### Delivery-status terminology

Use precise statuses.

Potential internal statuses:

```
planned
intent-recorded
pending
queued
dispatching
provider-accepted
delivered-to-mail-server
delivery-delayed
temporarily-failed
permanently-failed
bounced
complaint
rejected
rendering-failed
suppressed
cancelled
expired
```

Do not expose all internal statuses to ordinary Users.
Do not label `provider-accepted` as `Delivered`.
Do not label `delivered-to-mail-server` as `Read`.

### Provider-event ingestion

Where production email exists, provider feedback should be:

- Signature validated where supported
- Parsed through a typed adapter
- Idempotently stored or processed
- Correlated through provider message ID and internal attempt ID
- Checked for replay
- Checked for tenant or Workspace context
- Logged with redaction
- Mapped to stable internal event types
- Retried safely
- Monitored for failures

Potential provider event types:

```
send, delivery, delivery-delay, bounce, complaint, reject,
rendering-failure, subscription-change, open, click
```

Open and click signals:

- Must not be required for core transaction state
- Must not be treated as legal proof
- Must not be treated as authentication
- Must not be treated as recipient completion
- Must be assessed for privacy impact
- May be disabled for transaction-critical email

### Bounces and complaints

Requirements:

- Distinguish permanent and temporary failures.
- Stop repeated sends to permanent hard-bounce addresses.
- Apply provider or application suppression behavior.
- Stop nonessential email after a complaint.
- Surface sender or administrator attention where appropriate.
- Do not expose provider diagnostics to external recipients.
- Allow controlled correction of an invalid recipient address through the authoritative participant workflow.
- Do not silently change recipient addresses.
- Preserve the original transaction history.
- Do not retry permanent failures indefinitely.

### Suppression

Potential suppression reasons:

```
hard-bounce
complaint
manual-administrator
invalid-address
recipient-opt-out
provider-suppression
security-block
account-disabled
```

Requirements:

- Suppression is channel and purpose aware.
- Marketing suppression must not be conflated with security-message policy.
- Required operational communications require documented product and legal policy.
- External recipients must have a safe way to report unwanted or suspicious requests.
- Do not allow a suppression-list lookup to reveal whether an address belongs to an account.
- Do not remove suppression automatically without a validated correction process.

### Retry behavior

For retryable failures:

- Use bounded retries.
- Use exponential backoff and jitter where supported.
- Respect provider rate limits.
- Preserve idempotency.
- Stop after the configured maximum.
- Route exhausted failures to an operational failure state or dead-letter mechanism.
- Expose an administrative retry only where safe.
- Do not let repeated retries create duplicate Notification Center records.
- Do not retry a complaint or permanent bounce as a transient failure.

### Preferences

Create or normalize preference categories.

Potential preference controls:

- in-app enabled
- email enabled
- immediate
- digest
- quiet hours
- reminder frequency direction
- security notices
- document action notices
- completion notices
- Workspace notices
- billing and usage notices

Requirements:

- Required security or transaction communications must be classified separately.
- Do not label optional marketing as operational.
- Do not silently re-enable disabled optional categories.
- Preference changes apply prospectively.
- A preference change must not retroactively delete Activity.
- Workspace defaults do not silently override a User's permitted personal preference.
- A User cannot disable another User's personal notifications without an approved administrative policy.
- External-recipient preference behavior remains separate from authenticated Workspace preferences.
- Preferences do not grant access.
- Plan availability does not grant notification permission.
- Preference UI clearly explains required versus optional categories.

### Quiet hours

Quiet hours should:

- Use the target's timezone
- Apply only to eligible categories
- Preserve critical security or deadline behavior according to policy
- Handle daylight-saving changes where applicable
- Avoid sending a large burst without grouping after quiet hours
- Be tested around date boundaries

Do not implement quiet hours if the product has not approved them; document the capability instead.

### Digests

A digest should:

- Identify its period
- Group safely
- Keep each item actionable
- Avoid cross-Workspace leakage
- Avoid including private document details unnecessarily
- Respect current access at render or open time
- Be idempotent per period and target
- Not replace urgent action-required notifications
- Stop including resolved items

### Monitoring and operational alerts

Production delivery should monitor:

- Outbox backlog
- Queue depth
- Worker failures
- Retry exhaustion
- Rendering failures
- Provider rejects
- Delivery delays
- Hard bounces
- Complaints
- Suppression volume
- Provider rate limits
- Domain-authentication failures
- Webhook ingestion failures
- Duplicate event rates
- Reminder cancellation failures

Do not expose operational dashboards to ordinary recipients.

### Email-domain and deliverability readiness

When real email is in scope, verify:

- SPF direction
- DKIM direction
- DMARC direction
- Approved From domain
- Approved Return-Path or MAIL FROM direction
- Reply-To behavior
- Bounce and complaint feedback
- Suppression handling
- Provider sandbox or simulator
- Rate limits
- Environment separation
- Production-domain protection
- Template tags or metadata for correlation
- No production credentials in source
- Secret rotation direction
- Monitoring ownership

Do not modify DNS without explicit authorization.
Do not claim deliverability is guaranteed.

---

## Phase Y — Yield verified coverage, repairs, tests, documentation, and handoff

### Test framework

Use the existing test stack.

Do not add a second unit, integration, browser, email-rendering, or queue-testing framework.

### Catalog tests

Verify:

- Notification definition IDs are unique.
- Event IDs are unique.
- Event versions are valid.
- Every definition has an authoritative event.
- Every definition has an audience policy.
- Every definition has a channel policy.
- Every email definition has a template.
- Every actionable notification has a destination and fallback.
- Every reminder has stop conditions.
- Every definition has a privacy classification.
- Every definition has backend readiness.
- Disabled capabilities do not own active notifications.

### Audience tests

Verify:

- Correct sender audience
- Correct recipient audience
- Correct administrator audience
- Actor exclusion where appropriate
- Workspace scope
- Team scope
- Permission scope
- External recipient scope
- Removed Member exclusion
- Suspended Member exclusion
- Cross-account denial
- Contact does not imply User
- Matching email does not grant access
- Another participant's private status is absent

### In-app tests

Verify:

- Notification Center renders.
- Current User sees only permitted notifications.
- Unread count is correct.
- Mark Read works.
- Mark All Read works.
- Dismiss behavior works where supported.
- Grouping works.
- Stale destination works.
- Restricted destination is safe.
- Disabled capability notifications are absent.
- Workspace switch clears or revalidates notifications.
- Account switch clears prior User state.
- No private data flashes.
- Notification does not perform the underlying action.
- Notification does not grant access.

### Email-template tests

Verify:

- Subject renders.
- Preheader renders.
- Required variables validate.
- Missing variable fails safely.
- Optional values degrade safely.
- HTML escapes variables.
- Plain-text version renders.
- Primary CTA uses approved origin.
- Fallback URL is present.
- Invalid destination fails safely.
- Long names render.
- Long document labels render safely.
- International names render.
- Mobile layout remains readable.
- Images are nonessential.
- Link text is meaningful.
- No raw token appears in logs or snapshots.
- No unsupported legal claim appears.
- No active eNotary claim appears.

### Reminder tests

Verify:

- First reminder timing
- Repeat interval
- Maximum count
- Timezone
- Quiet hours where supported
- Digest exclusion where appropriate
- Completion stops reminder
- Decline stops reminder
- Rejection stops reminder
- Cancellation stops reminder
- Voiding stops reminder
- Expiration stops reminder
- Participant removal stops reminder
- Duplicate scheduler execution does not duplicate reminders
- Address suppression stops email
- In-app and email policies remain distinct

### Idempotency tests

Verify:

- Duplicate domain event does not create duplicate intent.
- Duplicate outbox delivery does not create duplicate email.
- Duplicate provider webhook does not create duplicate status.
- Retry preserves the same correlation.
- A different intended reminder occurrence remains deliverable.
- Template-version changes do not accidentally duplicate prior events.

### Delivery tests

Where a backend exists, verify:

- Outbox record is created with the domain transaction.
- Uncommitted actions do not publish.
- Worker dispatches.
- Provider acceptance is recorded.
- Delivery feedback is ingested.
- Delivery delay is recorded.
- Permanent bounce is recorded.
- Complaint is recorded.
- Rendering failure is recorded.
- Suppression is applied.
- Retryable failures retry.
- Permanent failures do not retry indefinitely.
- Exhausted retries become operational failures.
- Provider-event signature validation works.
- Webhook replay is safe.
- Correlation IDs remain intact.

### Security tests

Verify:

- Tokens are opaque.
- Tokens expire.
- Single-use tokens invalidate where required.
- Trusted origins are enforced.
- HTTPS is used in production configuration.
- Host-header injection is not possible.
- Open redirects are rejected.
- Private data is absent from URLs.
- Tokens are absent from logs.
- Account enumeration is minimized.
- Notification records do not grant access.
- Cross-Workspace delivery is impossible.
- Cross-Team leakage is absent.
- Another recipient's information is absent.
- Provider secrets are absent from source.

### Preference tests

Verify:

- Optional category can be changed.
- Required category is explained.
- Email and in-app can be controlled independently where supported.
- Preference applies to future intents.
- One User cannot modify another User's preference.
- Workspace defaults do not silently override permitted personal choices.
- External-recipient behavior remains separate.
- Marketing is not silently enabled.
- Quiet hours use the correct timezone.
- Digest selection works where supported.

### Accessibility tests

Verify:

- Notification Center has one H1.
- List has meaningful structure.
- Unread state is not color-only.
- Urgency is not icon-only.
- Controls have accessible names.
- Keyboard navigation works.
- Focus is contained in drawers.
- Focus restores after close.
- Live announcements are restrained.
- Toasts are not the only critical notice.
- Email content remains understandable without images.
- Links have meaningful text.
- 200% zoom remains usable.
- Mobile layout remains usable.
- Reduced motion is respected.

### Frontend-only honesty tests

Verify:

- No real email API is called.
- No "Email sent" production claim appears.
- No "Delivered" claim appears.
- No "Recipient notified" claim appears.
- No provider message ID is fabricated.
- Templates are labeled preview where necessary.
- Fixture notifications are deterministic.
- Backend requirements are documented.

### Regression tests

All existing relevant tests must remain passing for:

- Authentication
- Onboarding
- Dashboard
- Documents
- Document Details
- Participants
- Prepare Document
- Field Placement
- Recipient signing
- Templates
- Contacts
- Workspaces
- Settings
- My Actions
- Notification Center
- Reports
- Search
- Command Palette
- Document Organization
- Automation when enabled through its approved profile
- Verification

### Defect severity

**P0 — Privacy, security, or wrong-recipient failure**

Examples:

- Notification sent to the wrong person
- Cross-Workspace notification leak
- Cross-account notification leak
- Another recipient's private status exposed
- Access token logged
- Open redirect in an email
- Notification grants access
- Suppressed address continues receiving sensitive mail
- Internal document data exposed externally

**P1 — Missing or dangerously incorrect critical notification**

Examples:

- Recipient invitation missing
- Security alert missing
- Reminder continues after completion
- Cancellation notification links to an active action
- Duplicate critical emails repeatedly sent
- Completion email sent before completion
- Wrong transaction linked
- Permanent bounce repeatedly retried
- Fake delivery success shown

**P2 — Important reliability, preference, or recovery defect**

Examples:

- Missing fallback URL
- Stale deep link
- Wrong unread count
- Preference ignored
- Digest includes resolved items
- Quiet hours ignored
- Rendering failure hidden
- Sender not informed of delivery failure
- Inaccessible Notification Center action

**P3 — Lower-impact inconsistency**

Examples:

- Inconsistent subject wording
- Minor grouping mismatch
- Secondary template layout issue
- Low-impact copy inconsistency

Do not downgrade a wrong-recipient defect because the content appears harmless.

### Repair rules

Unless running audit-only:

1. Fix P0 first.
2. Fix P1 next.
3. Fix in-scope P2 issues where safe.
4. Avoid unrelated notification redesign.
5. Update centralized definitions instead of adding local special cases.
6. Add regression tests.
7. Re-run the smallest meaningful tests.
8. Run broader tests when shared infrastructure changes.
9. Run STITCH when destinations change and the Skill is available.
10. Run type checking.
11. Run linting.
12. Run the production build for module, full, or release scopes.
13. Test the actual runtime where available.

Do not:

- Invent a notification without product need
- Add a real email provider during frontend-only work
- Add a queue during frontend-only work
- Add a scheduler solely for demonstrations
- Create fake delivery events
- Weaken audience restrictions
- Bypass preferences
- Use BCC to conceal bad audience logic
- Hardcode recipient addresses
- Retry permanent failures forever
- Send marketing through operational templates
- Treat email open tracking as participant action
- Treat a Notification Center record as Evidence
- Create duplicate notification architectures
- Add a second email-template engine
- Add a second queue
- Add a second event bus
- Add a third-party notification service without evaluating the existing architecture
- Delete existing Activity or Evidence because similar information appears in notifications

### Durable documentation

Do not create a permanent report for every quick invocation.

Create or update durable documentation when:

- `report` is requested
- Scope is `full`
- Scope is `release`
- A P0 or significant P1 issue is found
- Shared notification architecture changes
- A production email provider is introduced
- Project documentation requires it

Use existing documentation conventions.

Where no stronger convention exists, use: `docs/notify/latest.md`

Potential durable documents include:

```
docs/notification-event-catalog.md
docs/notification-channel-policy.md
docs/notification-email-template-catalog.md
docs/notification-preferences.md
docs/notification-delivery-architecture.md
docs/notification-security-and-privacy.md
docs/notification-testing-strategy.md
docs/notification-provider-feedback.md
```

Do not create all documents automatically for a narrow invocation.

Do not include real recipient addresses, access tokens, provider credentials, private document information, or sensitive template values.

---

## Phase H — Handoff

At completion, report using these headings.

### 1. NOTIFY Status

Use exactly one:

- `NOTIFIED`
- `PARTIALLY NOTIFIED`
- `AUDIT ONLY`
- `BLOCKED`

**NOTIFIED** — All in-scope P0 and P1 defects were resolved. Required regression tests pass. Audience, channel, destination, and failure behavior are coherent.

**PARTIALLY NOTIFIED** — The notification surface improved, but material issues remain.

**AUDIT ONLY** — No source modification was requested or permitted.

**BLOCKED** — Completion requires unresolved product intent, unavailable backend infrastructure, missing provider access, missing environment configuration, or missing test tooling.

### 2. Resolved Scope

State:

- Invocation arguments
- Inferred scope
- Delivery phase
- Reason for scope escalation or containment
- Modules, events, routes, and templates examined

### 3. Notification Event Map

Summarize:

- Authoritative events
- Notification definitions
- Audiences
- Exclusions
- Channels
- Timing
- Reminder behavior
- Stop conditions
- Destinations
- Fallbacks

### 4. Audience Findings

### 5. In-App Findings

### 6. Email Findings

### 7. Reminder Findings

### 8. Reliability Findings

Only include systems that actually exist.

### 9. Deliverability Findings

Do not claim DNS or provider configuration was verified when it was not.

### 10. Security and Privacy Findings

### 11. Preferences Findings

### 12. Broken Notifications Found

For each issue:

- Severity
- Event
- Target
- Channel
- Expected behavior
- Actual behavior
- User impact
- Resolution

### 13. Repairs Made

### 14. Tests Added or Updated

### 15. Validation Performed

Do not claim a check was performed when it was not.

### 16. Remaining Risks

### 17. Recommended Next NOTIFY Scope

Recommend only the smallest next scope that materially increases confidence.

---

## Completion requirements

NOTIFY is complete only when:

1. Scope was resolved explicitly.
2. Delivery phase was identified.
3. Git status was inspected.
4. Existing notification architecture was inspected.
5. Authoritative events were identified.
6. The audience was resolved.
7. Excluded audiences were identified.
8. Appropriate channels were selected.
9. Timing was evaluated.
10. Reminder behavior was evaluated where relevant.
11. Stop conditions were evaluated.
12. Deduplication was evaluated.
13. Preferences were evaluated.
14. Notification content was evaluated.
15. Sensitive data was minimized.
16. Deep links were validated.
17. Fallback destinations were validated.
18. In-app behavior was evaluated where relevant.
19. Email behavior was evaluated where relevant.
20. Delivery feedback was evaluated where relevant.
21. Bounces and complaints were evaluated where relevant.
22. Suppression behavior was evaluated where relevant.
23. Frontend-only limitations remained honest.
24. Activity, Evidence, and Notification remained separate.
25. Accessibility was evaluated.
26. Mobile behavior was evaluated where relevant.
27. Workspace and Team scope were evaluated.
28. Broken notifications were repaired unless audit-only.
29. Regression tests were added for repaired P0 and P1 issues.
30. Relevant tests were run.
31. Results and limitations were reported honestly.
