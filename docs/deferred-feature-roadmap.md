# Deferred Feature Roadmap

**Version:** C35  
**Date:** 2026-07-16

This document lists all features that are explicitly NOT in the MVP and describes what implementation would require. These are not promised dates — they are readiness assessments.

---

## How to Use This Document

- Items in this document are not advertised to users
- No route, nav item, or public page mentions these features as available
- "Coming Soon" labels are used only on the eNotary pages
- This document exists to prevent accidental scope creep into these areas

---

## 1. Workflow Automation (Enterprise Preview)

**Status:** Frontend complete, enterprise-preview profile only, gated by default  
**Maturity:** `enterprise-preview`  
**What exists:** Full frontend demonstration (Rules, Policies, Conflicts, Simulations, Activity)  
**What's missing:** Backend automation engine, rule evaluation service, event bus

### To unlock for enterprise customers:
1. Implement backend automation engine
2. Define event types and triggers
3. Set `VITE_LAUNCH_PROFILE=enterprise-preview` in enterprise deployment
4. Set `automationEnabled: true` per workspace/plan
5. Grant `view_workflow_automation` permission to applicable roles

**Estimated backend scope:** Medium (rule evaluation, policy enforcement, conflict detection, event bus integration)

---

## 2. Bulk Send

**Status:** Not implemented  
**Maturity:** `deferred`  
**What exists:** Feature marketing page at `/features/bulk-send`  
**What's missing:** Everything — no routes, service, model, or CSV import logic

### Requirements before implementation:
- Backend job queue (Sidekiq, BullMQ, or equivalent) for batch sending
- CSV import and validation UI
- Per-recipient merge fields
- Batch status dashboard
- Rate limiting for bulk email send
- Potentially a separate plan tier

**Estimated effort:** Large (new batch-processing infrastructure)

---

## 3. Real-time Collaboration

**Status:** Not implemented  
**Maturity:** `deferred`  
**What exists:** Nothing  
**What's missing:** WebSocket server, presence tracking, comment model, conflict resolution

### Requirements before implementation:
- WebSocket infrastructure (Socket.io, Pusher, or Ably)
- Document versioning model
- Conflict resolution strategy (CRDT or OT)
- Real-time presence indicators
- Comment threads on document fields

**Estimated effort:** Extra-large (requires WebSocket infra, frontend state reconciliation)

---

## 4. Document Versioning / Redlining

**Status:** Not implemented  
**Maturity:** `deferred`  
**What exists:** Nothing  
**What's missing:** Version model, diff engine, side-by-side comparison view

### Requirements before implementation:
- Document version storage model
- PDF diff / redline generation engine
- Approval-before-sign workflow for versioned docs
- Version history UI

**Estimated effort:** Large (new document model, PDF diff engine)

---

## 5. eNotary / Remote Online Notarization

**Status:** Future product  
**Maturity:** `future-product`  
**What exists:** 5 public marketing pages at `/enotary/*` with "Coming Soon" labels  
**What's missing:** Everything operational

### Pre-conditions (non-technical):
- Supreme Court accreditation / OCA approval
- Appointment of qualified notary public officers
- Compliance with 2004 Rules on Electronic Notarization (if applicable)
- Separate pricing and engagement model

### Technical requirements (when approved):
- Video conferencing integration (notary + signer must be visible)
- Identity verification / KYC (liveness check, ID scan)
- Audio/video recording and storage (for notarial record)
- Digital notarial seal
- Separate eNotary journal/log
- Separate billing and jurisdiction rules

**Estimated effort:** Extra-large (new product line, legal and regulatory prerequisites)

---

## 6. AI Document Analysis

**Status:** Not implemented  
**Maturity:** `future-product`  
**What exists:** Nothing  
**What's missing:** LLM integration, document parsing, risk flagging, suggestion model

### Requirements before implementation:
- AI/LLM vendor selection
- Document parsing pipeline (PDF → structured text)
- Risk clause taxonomy definition
- PII redaction for AI training data
- User consent for AI processing
- Response caching to manage cost

**Estimated effort:** Large (LLM integration, new document processing pipeline)

---

## 7. Mobile App (iOS / Android)

**Status:** Not implemented  
**Maturity:** `future-product`  
**What exists:** Marketing page at `/esignature/mobile`  
**What's missing:** Native mobile app

### Requirements:
- React Native or Flutter codebase
- Native signature capture (touch/stylus)
- Biometric authentication
- Push notifications
- App Store and Google Play approval
- MDM integration for enterprise

**Estimated effort:** Extra-large (new codebase, native platform dependencies)

---

## 8. Third-Party Identity Verification (KYC)

**Status:** Not implemented  
**Maturity:** `deferred`  
**What exists:** `/esignature/identity-verification` marketing page  
**What's missing:** KYC vendor integration, ID scan flow, liveness check

### Requirements:
- KYC vendor contract (Veriff, Jumio, or local Philippine vendor)
- Liveness detection flow in signing experience
- ID document scanning
- Data retention and deletion policies (PII)
- Integration with signing token system

**Estimated effort:** Medium-large (vendor integration, signing flow modification)

---

## 9. CSV / Bulk Contact Import

**Status:** Not implemented  
**Maturity:** `deferred`  
**What exists:** `/app/contacts/import` route (placeholder only)  
**What's missing:** CSV parsing, validation, deduplication, import job

**Estimated effort:** Small-medium (standard CSV import with server-side deduplication)

---

## 10. Advanced Reports / BI Export

**Status:** Basic reports are launch-supporting  
**Maturity:** `post-launch` for advanced  
**What exists:** 7 report types (demonstration data)  
**What's missing:** Real database queries, BI tool export (Looker, Metabase), custom report builder

**Estimated effort:** Medium (real DB analytics queries, export pipeline)

---

## Intentionally Not on Roadmap

These are explicitly out of scope and not tracked:

- Blockchain-based signature verification
- Smart contract integration
- Fax delivery
- Physical mail delivery
- Physical signature scanning
