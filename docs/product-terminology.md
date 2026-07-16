# LAGDA Product Terminology

## Purpose

This document defines the canonical terminology for all LAGDA product surfaces — public portal, authenticated platform, recipient flow, and documentation. Use these terms consistently across UI copy, documentation, and API design.

---

## Preferred Terms

| Preferred term | Notes |
|----------------|-------|
| **Document transaction** | The entire lifecycle of a document sent for action. Avoid "envelope" unless deliberately adopted. |
| **Signing request** | An invitation sent to a participant to take action on a document. Avoid "request" alone when ambiguous. |
| **Participant** | Any person with a role in a document transaction. Generic term covering all roles. |
| **Recipient** | A participant receiving and acting on a signing request. Used in recipient-facing UI. |
| **Signer** | A participant whose role is to apply an electronic signature. |
| **Approver** | A participant whose role is to approve a document without signing. |
| **Reviewer** | A participant who reviews a document but takes no binding action. |
| **Acknowledgment Recipient** | A participant who acknowledges receipt of a document. |
| **Viewer** | A participant with read-only access to a document. |
| **Copy Recipient** | A participant who receives a copy of the completed document. |
| **Workspace Member** | A person who is a member of a Workspace with a defined role. Distinct from a Contact. |
| **Contact** | A saved person in the Contacts directory. Not the same as a Workspace Member. |
| **Template** | A reusable document workflow with pre-configured participants and fields. |
| **Verification ID** | The unique identifier for a document verification record. |
| **Evidence** | The activity and audit package associated with a completed transaction. |
| **Activity** | The chronological log of events on a document transaction. |
| **Frontend demonstration** | Any screen, action, or result that simulates behavior without a real backend. |
| **Available in demonstration** | A feature or result simulated in the frontend without production backend support. |
| **Coming Soon** | A planned product area not yet available. Used specifically for LAGDA eNotary. |
| **Preparation draft** | An in-progress document being configured for sending. |
| **Workspace** | A shared environment where Workspace Members collaborate on documents. |
| **Field** | A placeholder on a document for a participant to fill in or sign. |
| **Routing** | The order and rules governing which participants act in what sequence. |
| **Authentication** | The requirement for a recipient to verify their identity before accessing a signing request. |
| **Branding** | Visual identity applied to a Workspace's documents and recipient experience. |

---

## Terms to Avoid

| Avoid | Reason |
|-------|--------|
| **Envelope** | Implies DocuSign-specific metaphor; not LAGDA's established terminology |
| **Certified** | Implies legal certification by an authority — do not use without qualification |
| **Court approved** | No approval from any court exists for LAGDA eSignature |
| **Supreme Court approved** | Specifically inaccurate; eNotary accreditation is a separate process |
| **Verified identity** | Implies identity was confirmed by an authority — authentication increases confidence, not certainty |
| **Securely stored** | Do not use as a claim without qualified context; no real storage exists in the frontend |
| **Immutable** | Do not use as a UI claim; immutability is a backend/infrastructure property |
| **Tamper-proof** | Absolute claim that cannot be supported without backend infrastructure |
| **Fraud-proof** | No system is fraud-proof; do not use |
| **Legally binding in every case** | Legal effect depends on the document, parties, circumstances, and applicable law |
| **Published** | Avoid implying backend publication; use "sent" or "available in demonstration" |
| **Synced** | Implies real synchronization; use "configured in frontend state" |
| **Completed by backend** | No backend exists in the current frontend phase |
| **Sent successfully** | Implies real email delivery; use "sending request submitted (demonstration)" |
| **Payment processed** | No payment processing exists |
| **Integration connected** | No real OAuth or integration connection exists; use "connection demonstration configured" |
| **Notarized** | Notarization is a separate legal act requiring an accredited Notary |
| **eNotary** (as active feature) | LAGDA eNotary is Coming Soon; do not present as available |

---

## eNotary Specific Wording

When referencing LAGDA eNotary, always use exactly:

> "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules."

This statement must appear wherever LAGDA eNotary is mentioned as a future product.

LAGDA eNotary must never appear as:
- Active or purchasable
- Included in any plan
- A Workspace role
- A participant role
- A field type
- A routing stage
- A verification type
- A billing metric
- An integration
- An API or webhook event

---

## Status Vocabulary

### Document Transaction Status

| Status | Label | Notes |
|--------|-------|-------|
| draft | Draft | Being configured, not sent |
| ready-to-send | Ready to Send | Configured, pending send action |
| sent | Sent | Delivery in progress |
| delivered | Delivered | Received by participant |
| viewed | Viewed | Opened by at least one participant |
| authentication-completed | Authentication Completed | Participant verified |
| awaiting-signature | Awaiting Signature | Waiting for signing action |
| awaiting-approval | Awaiting Approval | Waiting for approval |
| partially-completed | Partially Completed | Some participants have completed |
| completed | Completed | All participants have completed — frontend demonstration |
| declined | Declined | A participant declined |
| cancelled | Cancelled | Cancelled by sender |
| expired | Expired | Request deadline passed |
| failed-delivery | Failed Delivery | Could not deliver to a participant |
| voided | Voided | Voided after sending |
| needs-attention | Needs Attention | Requires sender review |
| archived | Archived | Moved to archive |

### Participant Status

| Status | Label |
|--------|-------|
| pending | Pending |
| delivered | Delivered |
| viewed | Viewed |
| completed | Completed (Demonstration) |
| declined | Declined |
| expired | Expired |

---

## Demonstration Disclaimer Vocabulary

Use these exact phrases in UI where actions are simulated:

- "Frontend demonstration — all changes are session-local and reset on page reload."
- "This action is simulated in frontend state. No real [operation] occurs."
- "Connection demonstration configured. No third-party authorization, OAuth exchange, credential storage, or data synchronization occurs."
- "Changes retained for this session only."
- "Available in demonstration."
- "This plan change is simulated in frontend state. No subscription, invoice, payment, seat allocation, or feature entitlement is changed by a backend."
- "This creates a frontend export-request demonstration only. No archive is generated and no data is delivered."
- "This creates a frontend account-closure request demonstration only. No account, Workspace, document, transaction, or stored data is deleted."
