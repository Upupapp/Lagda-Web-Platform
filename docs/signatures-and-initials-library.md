# Signatures and Initials Library

**Feature:** Personal Signature and Initials Library
**Command:** 26
**Status:** Frontend demonstration — no backend connected

---

## Overview

The Signatures and Initials Library allows LAGDA users to create, manage, and reuse signature and initials representations across signing requests. It is a personal library — only the logged-in user can create, view, or manage their own entries.

---

## Routes

| Path | Purpose |
|---|---|
| `/app/settings/signatures` | Library overview and management |
| `/app/settings/signatures/new` | Create a new entry |
| `/app/settings/signatures/:signatureId` | View entry detail |
| `/app/settings/signatures/:signatureId/edit` | Edit an entry |

The library is accessed via **Settings → Signatures & Initials** in the left navigation.

---

## Entry kinds

**Signature** — A full-name representation used in Signature fields.

**Initials** — A shortened representation (e.g., "M.R.") used in Initials fields.

Both kinds support typed and drawn representations. They are managed separately with separate defaults.

---

## Representation methods

**Typed** — The user enters text and selects one of four typographic styles:
- Classic Script
- Modern Print
- Formal Italic
- Clean Sans

The rendered style is visible as a live preview during creation.

**Drawn** — The user draws directly on a canvas element using a pointer (mouse, stylus, or touch). The drawing is captured as an in-memory data URL only. It is never uploaded, stored in any browser storage, or made available for download.

---

## Entry actions

| Action | Description |
|---|---|
| Create | Add a new signature or initials entry |
| Rename | Change the display name only; representation is unchanged |
| Replace | Swap the visual representation while preserving the entry ID |
| Set Default | Mark as the suggested entry for signing (not automatic consent) |
| Archive | Remove from signing selection; entry is retained and can be restored |
| Restore | Return an archived entry to active state |
| Remove | Delete from the frontend demonstration state |

---

## Default entries

Each user may have at most one default signature and one default initials entry.

A default entry is **suggested** during signing — it appears pre-selected in the "From Library" tab of the adoption dialog. However:

- The user must still explicitly click "Adopt" to apply it to a specific field.
- Setting an entry as default does not automatically fill any signature field.
- A default entry does not constitute consent or agreement.

---

## Signing flow integration

During signing (recipient review flow), the Signature Adoption Dialog includes a "From Library" tab alongside the existing Type and Draw tabs. This tab shows all active library entries for the relevant kind (signature or initials).

Selecting a library entry and clicking "Adopt" atomically applies the entry's representation to the current signing session. This uses the `ADOPT_FROM_LIBRARY` action in the RecipientContext reducer.

Explicit adoption is required for each signing request, each field, each time. Library entries do not auto-apply or auto-fill.

---

## Entry statuses

| Status | Meaning |
|---|---|
| active | Available for signing and shown in library |
| archived | Hidden from signing; visible in the Archived filter |
| invalid | Entry cannot be rendered (e.g., drawn representation missing) |

---

## Privacy and access

- Library entries are personal to the user. No other user can view them.
- Workspace Administrators cannot view a user's signature library entries solely by virtue of their administrator role.
- Senders cannot view or select signatures on behalf of recipients.
- All library state is in-memory for this frontend demonstration. It resets on page reload.

---

## Security properties

| Property | Value |
|---|---|
| Storage | Module-level in-memory state only. Resets on page reload. |
| localStorage | Not used |
| sessionStorage | Not used |
| URL storage | Not used |
| Upload | Not implemented |
| Download | Not implemented |
| Canvas exposure | `toDataURL()` used in-memory only; not logged, not transmitted |
| Identity claim | Not made. Representations are visual only. |

---

## Signature Privacy Boundary

This feature implements **signature representation management**, not **identity verification**. The following boundaries are explicitly enforced:

- A signature representation is a visual mark, not proof of identity.
- Adopting a library entry for a signing request does not create a legally binding signature in this frontend demonstration.
- No handwriting verification, biometric analysis, or signing ceremony is implemented.
- The audit trail for real signing events is a backend responsibility, not part of this library.

---

## eNotary boundary

The Burgundy color (`#67023B`) is reserved for future LAGDA eNotary functionality exclusively. It is not used anywhere in the Signatures and Initials Library.

**LAGDA eNotary is Coming Soon** and is subject to Supreme Court accreditation and applicable Philippine rules. The eSignature and eNotary products are architecturally separate. No eNotary controls are present in this feature.

---

## Frontend demonstration limitations

The following are intentionally not implemented in this command:

- Production backend or API persistence
- Real storage (data survives only for the current browser session)
- Real upload or download of signature image files
- PDF modification or signature field embedding
- eNotary controls
- Identity verification or real evidence generation
- Multi-user access boundaries (enforced only at backend)

---

## Backend handoff notes

When connecting to a production backend, the following will be required:

1. **Persistence endpoint:** `GET/POST/PATCH/DELETE /api/users/{id}/signature-library` — CRUD for `SignatureLibraryEntry` records scoped to the authenticated user.
2. **Default management:** The backend must enforce at most one default signature and one default initials per user.
3. **Image storage:** Drawn representations require secure server-side storage. The `dataUrl` pattern used here is for demonstration only and should not be stored raw on the backend.
4. **Access control:** Enforce that no other user, including Workspace Administrators, can read or modify another user's library without explicit delegation (if any is planned).
5. **Audit trail:** Signature adoption events (using a library entry for a specific signing request) should be recorded in the audit log with the signing request ID, field ID, user ID, timestamp, and representation method — not the raw image data.
6. **eNotary separation:** When eNotary features are introduced, they must use a separate data model, separate routes, and separate UI surfaces from this eSignature library.

---

## Related files

| File | Role |
|---|---|
| `src/app/models/signature-library.ts` | Domain types |
| `src/app/services/mock/signature-library.service.ts` | In-memory service |
| `src/app/pages/platform/settings/signatures/` | All library UI pages |
| `src/app/context/RecipientContext.tsx` | `ADOPT_FROM_LIBRARY` action |
| `src/app/pages/recipient/SignatureAdoptionDialog.tsx` | "From Library" tab |
| `docs/signature-library-audit.md` | Security and implementation audit |
