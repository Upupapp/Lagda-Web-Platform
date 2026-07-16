# End-to-End Launch Journeys

**Version:** C35  
**Date:** 2026-07-16

These are the critical user journeys for the LAGDA MVP. Each must work end-to-end after backend integration.

---

## Journey 1 — New User Signs Up and Sends First Document

**Actor:** Business owner / professional  
**Goal:** Send a contract for signature

```
1. Lands on / (public homepage)
2. Clicks "Get Started" → /create-account
3. Fills name, email, password, company name
4. Receives email verification → /app/verify-email
5. Clicks verification link
6. Redirected to /app/onboarding/workspace
   - Names workspace
   - Selects use case (legal, HR, real estate, etc.)
7. /app/onboarding/profile — sets title, timezone
8. /app/onboarding/invite — optionally invites team members
9. /app/onboarding/complete — welcome screen
10. Redirected to /app/dashboard
11. Clicks "Create Document" quick action
12. /app/prepare/new/upload — uploads a PDF
13. /app/prepare/:id/recipients — adds recipient (name + email)
14. /app/prepare/:id/configure — sets signing order, expiry, reminders
15. /app/prepare/:id/fields — places signature, date, initials fields
16. /app/prepare/:id/review — previews the document
17. /app/prepare/:id/send — reviews recipients, clicks "Send for Signature"
18. /app/prepare/:id/confirmation — confirmation with tracking link
19. Returns to /app/documents — document appears as "Pending"
```

**Backend dependencies:** auth, storage, email delivery, PDF rendering, field position storage

---

## Journey 2 — Recipient Signs a Document

**Actor:** External recipient (no LAGDA account required)  
**Goal:** Sign and complete a document

```
1. Receives email: "You have a document to sign from [Sender]"
2. Clicks "Review & Sign" in email
3. /app/sign/:token/start — overview screen with sender name, document name
4. /app/sign/:token/review — reviews full document with scroll lock
5. /app/sign/:token/sign — draws or types signature
6. /app/sign/:token/initials — initials for initialing fields
7. /app/sign/:token/date — auto-fills today's date where required
8. /app/sign/:token/complete — "You've signed" confirmation
9. Receives email with final signed PDF copy

Alternate: recipient declines
5a. Clicks "Decline to Sign" on review page
5b. /app/sign/:token/declined — enters reason (optional)
5c. Sender receives notification of decline
```

**Backend dependencies:** token validation, email delivery, signature storage, PDF generation

---

## Journey 3 — Document Owner Tracks and Completes a Transaction

**Actor:** Sender monitoring their sent document  
**Goal:** Know who has signed, chase non-signers, access final PDF

```
1. From /app/documents — sees document with status "Pending"
2. Clicks document → /app/documents/:id
3. /app/documents/:id/recipients — sees per-recipient signing status
4. Clicks "Send Reminder" for an unsigned recipient
5. Recipient receives reminder email
6. All recipients sign
7. Document status changes to "Completed"
8. /app/documents/:id/overview — completion summary shown
9. /app/documents/:id/audit-trail — full chronological event log
10. Downloads signed PDF copy
```

**Backend dependencies:** real-time status updates (polling or webhook), email delivery, final PDF

---

## Journey 4 — Admin Invites a Team Member

**Actor:** Workspace Administrator  
**Goal:** Add a new sender to the workspace

```
1. /app/workspace/members
2. Clicks "Invite Member"
3. /app/workspace/members/invite — enters email, selects role (Sender/Viewer)
4. Clicks "Send Invitation"
5. Invitee receives email with invitation link
6. Invitee clicks link → /app/signup?invite=:token
7. Fills name + password (email pre-filled)
8. Invitee lands on /app/dashboard — workspace already active
9. Admin sees member in /app/workspace/members with status "Active"
```

**Backend dependencies:** invitation token, email delivery, role assignment

---

## Journey 5 — Verify a Signed Document (External)

**Actor:** Third party (auditor, counterparty, regulator)  
**Goal:** Confirm a document was signed using LAGDA and hasn't been altered

```
1. Receives signed PDF with verification code on cover page
2. Visits /verify (public, no login required)
3. Enters the document verification code
4. Sees: Signer names, signing timestamps, hash comparison result
5. Downloads verification certificate (PDF)
```

**Backend dependencies:** verification code lookup, document hash comparison, certificate generation

---

## Journey 6 — Create a Reusable Template

**Actor:** Office manager / HR professional  
**Goal:** Create a template for a frequently-used document (NDA, employment contract)

```
1. /app/templates → clicks "New Template"
2. /app/templates/new — uploads base PDF
3. Places fields: signature, date, name, initials
4. Assigns role labels to fields (e.g., "Employer Signature", "Employee Signature")
5. Saves template with name and description
6. Template appears in /app/templates list
7. Next time: clicks "Use Template" → auto-populates recipient roles
```

---

## Journey 7 — Recipient Signs via My Actions (Inbox)

**Actor:** Internal team member who is also a signer  
**Goal:** Sign a document sent to their own workspace account

```
1. Receives notification in LAGDA notification bell (top nav)
2. Or: sees item in /app/inbox
3. Clicks item → goes to signing experience same as Journey 2
4. After signing, item moves to "Completed" in inbox
```

---

## Journey 8 — Search and Find a Document

**Actor:** Sender with many documents  
**Goal:** Find a document by recipient name, document name, or status

```
1. Presses ⌘K / Ctrl+K → Command Palette opens
2. Types "Johnson contract" → sees matching documents
3. Clicks result → /app/documents/:id
   OR
1. Navigates to /app/search
2. Searches by recipient, status, date range
3. Filters by "Completed" + last 30 days
4. Exports result list
```

---

## Journey 9 — Org Admin Reviews Compliance Report

**Actor:** Compliance officer or Owner  
**Goal:** Export signing records for audit

```
1. /app/reports → selects "Compliance Report"
2. Sets date range
3. Selects senders to include
4. Previews summary: total sent, signed, declined, expired
5. Clicks "Export CSV" → downloads file
6. Shares file with auditor
```

---

## Critical Path Summary

| # | Journey | P0 Backend Deps |
|---|---|---|
| 1 | Signup → Send | auth, storage, email, fields |
| 2 | Recipient Signs | token auth, email, signature, PDF |
| 3 | Track + Complete | status events, email, PDF |
| 4 | Invite Team | invitation email, role assignment |
| 5 | Public Verify | hash verification, certificate |
| 6 | Create Template | template storage, field positions |
| 7 | Inbox Signing | notification, inbox, signing |
| 8 | Search | search index |
| 9 | Compliance Report | reporting data, CSV export |
