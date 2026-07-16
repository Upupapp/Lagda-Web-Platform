# Global Search, Command Palette, and Cross-Platform Navigation
# Command 30 — LAGDA Frontend Documentation

**Status:** Implemented  
**Date:** 2026-07-16  
**Routes:** `/app/search`  
**Trigger:** Ctrl+K / Cmd+K or header search button  

---

## 1. What This Is

Command 30 adds two complementary search surfaces to the LAGDA authenticated platform:

1. **Command Palette** — an in-place modal overlay triggered by Ctrl+K / Cmd+K or the platform header search button. Provides rapid keyboard-driven navigation, quick actions, and search across all platform domains without leaving the current page.

2. **Global Search Page** (`/app/search`) — a full-page search experience with URL-driven state, scope tabs, sort controls, grouped results, and persistent link-shareable queries.

Both surfaces are built on a common service (`global-search.service.ts`) and type model (`models/search.ts`).

---

## 2. What This Is NOT

**This is a demonstration search surface.** The following capabilities are explicitly not implemented and must not be implied to users:

- Production search backend (Elasticsearch, Algolia, Meilisearch, Typesense)
- Full-text document content search or OCR
- PDF, email, or attachment content search
- AI/semantic/vector/embedding-based search
- Fuzzy matching (substring tokenMatch only)
- Real-time or live-indexed results
- Cross-device or persistent search history
- Search of signatures, initials, field values, consent evidence, or authentication evidence
- eNotary search scope, notarial records, accreditation reports, or eNotary commands
- Voice or camera search
- WebSocket or Server-Sent Events
- Cross-workspace data exposure

The demo notice is displayed on both surfaces at all times to make this clear.

---

## 3. Files Created / Modified

### New files
| File | Purpose |
|------|---------|
| `src/app/models/search.ts` | All C30 typed models (branded IDs, 18 result types, 11 scopes, availability states, request/response contracts, match ranges, recent types, destination resolution, command palette types) |
| `src/app/services/mock/global-search.service.ts` | Core service — search aggregation, command registry, recent queries/destinations, pinned commands, suggestions, destination resolution, reset |
| `src/app/components/platform/CommandPalette.tsx` | Command Palette modal (Ctrl+K overlay) — replaces `SearchDialog.tsx` via barrel re-export |
| `src/app/pages/platform/search/GlobalSearchPage.tsx` | Full-page `/app/search` route |
| `docs/global-search-and-command-palette-audit.md` | Pre-implementation audit (C30 planning) |

### Modified files
| File | Change |
|------|--------|
| `src/app/components/platform/PlatformHeader.tsx` | Points to `CommandPalette` instead of `SearchDialog` |
| `src/app/components/platform/index.ts` | Exports `CommandPalette` (and `SearchDialog` alias for backward compat) |
| `src/app/context/PlatformContext.tsx` | Calls `globalSearchService.resetGlobalSearchDemonstration()` on signOut; calls `clearWorkspaceScopedDestinations()` on workspace switch |
| `src/app/config/routes.ts` | Adds `/app/search` route metadata |
| `src/app/models/index.ts` | Backward-compatible expansion of `SearchResult` type union |
| `src/router.tsx` | Lazy-loads and routes `GlobalSearchPage` at `search` |
| `docs/backend-integration-handoff.md` | Added Section 37 — Global Search and Indexing |

---

## 4. Architecture

```
PlatformHeader (Ctrl+K trigger)
    └── CommandPalette (modal overlay, no route change)
            └── globalSearchService.search()
            └── globalSearchService.listCommands()
            └── globalSearchService.getRecentQueries()
            └── globalSearchService.getRecentDestinations()
            └── globalSearchService.getSuggestions()

/app/search (GlobalSearchPage, URL-driven)
    └── globalSearchService.search(query, scope, sort)
    └── uses useSearchParams for q / scope / sort

globalSearchService (module singleton, in-memory)
    ├── _recentQueries[]       (max 8, memory-only)
    ├── _recentDestinations[]  (max 8, memory-only)
    └── _pinnedCommandIds[]    (memory-only)
```

---

## 5. Service Contract: `globalSearchService`

### `search(req: Partial<GlobalSearchRequest>): GlobalSearchResponse`
- Aggregates results from all 10 domain projections
- Filters by `scope` (validates against allowlist — cannot expand via URL)
- Scores deterministically (exact title=95, prefix title=80, substring title=60, description=30)
- Sorts by relevance (default), updated-at, title, or status
- Returns at most `maxPerGroup` results per scope group (default 5 for palette, 8 for page)
- Returns empty groups list for queries shorter than 2 characters
- `demonstrationOnly: true` on every response

### `addRecentQuery(query, scope?)` / `getRecentQueries()`
- Max 8 recent queries (oldest dropped)
- Sensitive-pattern filter: rejects queries matching email patterns, VRF IDs, base64 tokens, phone numbers, payment card patterns
- No persistence — in-memory only, reset on signOut

### `addRecentDestination(label, path)` / `getRecentDestinations()`
- Validates path against `SAFE_RETURN_ROUTE_PREFIXES` (`/app/`, `/sign-in`, `/create-account`)
- Max 8 entries (oldest dropped)
- No persistence — in-memory only

### `pinCommand(id)` / `unpinCommand(id)` / `getPinnedCommands()`
- Only `isPinnable: true` commands can be pinned
- Pinned commands float to top of no-query state
- No persistence — in-memory only

### `resolveDestination(destination, isAuthenticated)`
- Returns `{ outcome: "allowed", path }` or an error outcome
- Always validates authentication
- Validates path starts with `/`
- Validates platform-route paths against `SAFE_RETURN_ROUTE_PREFIXES`

### `resetGlobalSearchDemonstration()`
- Clears all recent queries, destinations, and pinned command IDs
- Called by `PlatformContext.signOut()`

### `clearWorkspaceScopedDestinations()`
- Removes workspace-specific destinations (keeps settings, help, legal routes)
- Called by `PlatformContext.switchWorkspace()`

---

## 6. Domain Projections (10 scopes)

| Scope | Data source | Max results |
|-------|-------------|-------------|
| `documents` | `MOCK_TRANSACTIONS` | 8 |
| `my-actions` | Inline fixtures (4 assignment stubs — current user only) | 5 |
| `templates` | `MOCK_TEMPLATES` | 6 |
| `contacts` | `MOCK_CONTACTS` + `CONTACT_GROUP_FIXTURES` | 6 + 3 |
| `people-and-teams` | `MEMBER_FIXTURES` + `TEAM_FIXTURES` + `ROLE_FIXTURES` | 5 + 4 + 4 |
| `verification` | `VERIFICATION_FIXTURES` | 4 |
| `notifications` | `NOTIFICATION_FIXTURES` | 4 |
| `reports` | `REPORT_DEFINITION_FIXTURES` + `SAVED_VIEW_FIXTURES` | 4 + 3 |
| `settings` | `SETTINGS_ROUTE_FIXTURES` (13 route stubs) | 6 |
| `help` | `HELP_FIXTURES` (13 entries, public routes only) | 5 |

**Privacy constraints enforced by all projections:**
- No participant names, field values, or consent evidence in results
- No signatures, initials, or authentication evidence
- My Actions results are limited to stubs for the current demo user only — never another user's inbox
- Notifications are limited to the current user's own notifications
- Workspace member search shows display name and role only — no email, phone, or private data
- Verification results include identifier and document title direction only — no evidence
- Settings results include route metadata only — no form values or config data

---

## 7. Command Palette Commands (30 commands across 7 groups)

| Group | Count | Examples |
|-------|-------|---------|
| Navigate | 10 | Dashboard, Documents, Inbox, Templates, Contacts, Verify, Notifications, Reports, Workspace, Search |
| Create | 7 | Prepare Document, Create Template, Add Contact, Create Group, Invite Member, Create Team, Create Saved View |
| Settings | 10 | Profile, Security, Signatures, Notification Preferences, Billing, Usage, Integrations, Data & Privacy |
| Help | 5 | Help Center, Guides, Legal Framework, Verification Guide, Contact Support |
| Reports | 1 | Open Reports |
| My Work | 2 | Open My Actions, Open Notifications |
| Workspace | 1 | Open Workspace Administration |

Commands with `requiresPermission` and `requiresFeature` are defined — permission enforcement is advisory on the frontend and must be enforced server-side in production.

Pinnable commands (`isPinnable: true`) can be added to the "Pinned" section in the no-query state.

---

## 8. Typed Models (`src/app/models/search.ts`)

### Branded ID types
```typescript
type GlobalSearchResultId       = string & { readonly __brand: "GlobalSearchResultId" };
type GlobalSearchRecentQueryId  = string & { readonly __brand: "GlobalSearchRecentQueryId" };
type GlobalSearchRecentDestId   = string & { readonly __brand: "GlobalSearchRecentDestId" };
type CommandPaletteCommandId    = string & { readonly __brand: "CommandPaletteCommandId" };
```

### Core interfaces
- `GlobalSearchResult` — every field `readonly`, `demonstrationOnly: true` always
- `GlobalSearchResultGroup` — scope, label, icon, results, totalCount, hasMore
- `GlobalSearchRequest` — query, scope, filters, sort, sortDirection, page, perPage, maxPerGroup
- `GlobalSearchResponse` — query, scope, groups, totalPermittedCount, sourceStatuses, demonstrationOnly
- `GlobalSearchMatchField` — field, label, text, ranges (for safe highlighting)
- `GlobalSearchMatchRange` — start, end (integer offsets, never unsafe HTML)
- `CommandPaletteCommand` — id, label, group, type, icon, destination, requiresPermission, isPinnable, aliases

### Safe highlighting
Results include `matchedFields: GlobalSearchMatchField[]` with pre-computed `ranges: GlobalSearchMatchRange[]`. The UI renders these using split text segments (plain strings + `<mark>` elements) — never `dangerouslySetInnerHTML`.

---

## 9. Scope Validation

The `scope` query parameter on `/app/search` is validated against `VALID_SEARCH_SCOPES` before use. An invalid or missing scope falls back to `"all"`. This ensures:

- URL manipulation cannot expand search into unauthorized scopes
- URL manipulation cannot inject arbitrary strings into the service
- Scope query parameters cannot grant permission expansion

---

## 10. Safe Return Route Validation

```typescript
export const SAFE_RETURN_ROUTE_PREFIXES: string[] = [
  "/app/", "/sign-in", "/create-account",
];
```

All recent destinations and result paths are validated against this allowlist before being stored or navigated to. External URLs, data: URIs, javascript: schemes, and arbitrary paths are all rejected.

---

## 11. Keyboard Shortcuts and Accessibility

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| Ctrl+K / Cmd+K | Open/close Command Palette |
| Escape | Close palette, restore focus to trigger |
| Arrow Down | Move to next item (from input: first item) |
| Arrow Up | Move to previous item (at first item: return to input) |
| Enter | Activate focused item |
| Tab | Natural tab order within dialog (browser-managed) |

### ARIA roles
- Dialog: `role="dialog" aria-modal aria-label="Command palette"`
- Input: `role="combobox" aria-expanded aria-controls aria-autocomplete="list" aria-activedescendant`
- Results container: `id` referenced by `aria-controls`, `aria-live="polite"`
- Result items: `role="option" aria-selected`
- Command groups: `role="listbox" aria-label`
- Scope tabs: `role="tablist"` / `role="tab" aria-selected`

### Focus management
- On open: focus moves to search input after 30ms transition
- On close: focus restores to the element that triggered the palette (`triggerRef.current`)
- Arrow key navigation: `aria-activedescendant` on input tracks the focused item; active item scrolls into view

### Screen reader announcements
- Results area: `aria-live="polite" aria-atomic="false"` — announces updates without interrupting user
- Loading state: `role="status"` — "Searching…" announced politely
- No-results state: `role="status"` with descriptive text

---

## 12. Responsive Behavior

### Command Palette
- Max width 600px, centered
- On `< 640px`: `border-radius: 0`, `max-height: 100vh` — full-screen overlay
- Scope tabs: `overflow-x: auto; scrollbar-width: none` — horizontal scroll on mobile

### Global Search Page
- Max width 800px, centered
- Scope tab bar: horizontal scroll on small screens
- Result cards: full-width with `overflow-x: hidden`
- Input row: stacks Search button below on small screens via flex-wrap

---

## 13. Security and Privacy Constraints

### What is NEVER stored in localStorage or sessionStorage
- Search queries (recent or current)
- Recent destinations
- Search results or result metadata
- Filters containing private values
- Result IDs tied to private resources
- Pinned commands exposing private routes
- Workspace-scoped search state

### What is NEVER exposed in results
- Raw signatures, initials, or handwritten marks
- Participant field values (text fields, checkboxes, dropdowns)
- Consent evidence, click-to-sign timestamps
- Authentication evidence (OTP attempts, auth method details)
- Document content text (PDF content, OCR output)
- Integration credentials or API keys
- Payment details
- Another user's personal My Actions
- Another user's notifications
- Personal Signature Library entries
- eNotary records, notarial evidence, or accreditation data

### What NEVER happens
- `dangerouslySetInnerHTML` used for result highlighting
- URL query parameters granting scope expansion
- URL query parameters executing commands
- Result IDs granting access (every destination revalidates)
- Search history persisted across sessions or page reloads
- Private search terms logged to any analytics or monitoring system
- Cross-workspace data returned (all fixtures are single-workspace scoped)

---

## 14. eSignature / eNotary Boundary

The Command Palette and Global Search cover LAGDA eSignature workflows only:
- Documents, signing requests, templates, contacts, workspace admin, settings
- Verification records (identifier direction only — no evidence)
- Notifications, reports (eSignature metrics only)
- Help resources and navigation commands

**Excluded permanently:**
- No eNotary search scope
- No notarial records in results
- No notarial operational commands
- No eNotary metrics in reports scope
- No accreditation or ranking data
- Burgundy (#67023B) is never used in any C30 component

---

## 15. State Machine

### Command Palette states
| State | Condition | UI |
|-------|-----------|-----|
| `no-query` | `query.length < 2` | Pinned commands, recent queries, recent destinations, command groups |
| `searching` | `query.length ≥ 2 && isSearching` | "Searching…" with aria-live |
| `results` | `query.length ≥ 2 && !isSearching && groups.length > 0` | Grouped result items with safe highlighting |
| `no-results` | `query.length ≥ 2 && !isSearching && groups.length === 0` | "No results" message, scope reset link |
| `closed` | `!open` | Null (not rendered) |

### Global Search Page states
| State | Condition | UI |
|-------|-----------|-----|
| `no-query` | `q param < 2 chars` | Suggestion chips, keyboard hint |
| `loading` | `isSearching` | Skeleton cards with pulse animation |
| `results` | `!isSearching && groups.length > 0` | Summary + grouped result cards |
| `no-results` | `!isSearching && groups.length === 0` | Empty state with scope reset |

---

## 16. Recent Queries — Sensitivity Filter

Queries matching any of these patterns are silently dropped and not stored:
- Email-like patterns (`\S+@\S+\.\S+`)
- Verification IDs (`VRF-[\w-]+`)
- 16-digit sequences (payment card-like)
- 10–11-digit sequences (phone number-like)
- Long base64-like strings (>20 chars matching `[A-Za-z0-9+/=]+`)

---

## 17. Demonstration-Only Disclosure

Every `GlobalSearchResult` has `readonly demonstrationOnly: true`. Every `GlobalSearchResponse` has `readonly demonstrationOnly: true`. The UI renders a persistent notice on both surfaces:

> "Search results are demonstration projections — not live indexed data. Results do not grant access."

This disclosure is intentionally non-dismissible.

---

## 18. Backend Handoff

See `docs/backend-integration-handoff.md` §37 for the complete API contract needed to replace this mock implementation with a production search backend.

Key requirements:
- Authenticated full-text search index per workspace
- Scope-level permission gating (backend enforced)
- Privacy filters: no document content, no evidence, no field values
- Rate limiting on search endpoint
- No AI/semantic claims unless explicitly reviewed by legal

---

## 19. Testing Guidance

### Unit test targets
- `globalSearchService.search()` — deterministic scoring, scope filtering, max-per-group limits
- `globalSearchService.addRecentQuery()` — sensitive pattern rejection, max-8 limit, deduplication
- `globalSearchService.addRecentDestination()` — return-route allowlist validation
- `globalSearchService.resolveDestination()` — authentication check, invalid path rejection
- `renderHighlighted()` — never produces unsafe HTML; correctly splits text at ranges; handles overlapping ranges gracefully
- `validateScope()` — invalid scope strings fall back to "all"

### Component test targets
- `CommandPalette`: opens on Ctrl+K; Arrow Down moves to first item; Enter activates it; Escape closes and restores focus; scope tab updates active scope; demo notice always visible
- `GlobalSearchPage`: URL param `q=agreement` triggers search; `scope=` tab selection updates URL; `sort=` changes sort; no-results state renders when no groups; no-query state renders suggestion chips

### Security test targets
- Verify `dangerouslySetInnerHTML` does not appear anywhere in C30 components
- Verify `localStorage.setItem` / `sessionStorage.setItem` are not called by search-related code
- Verify a manually set `?scope=enotary` falls back to "all"
- Verify a malicious `?scope=../../admin` falls back to "all"
- Verify recent-query storage rejects `test@example.com` as sensitive
