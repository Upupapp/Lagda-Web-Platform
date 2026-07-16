# Global Search and Command Palette — Pre-Implementation Audit
# Command 30

**Status:** Complete  
**Date:** 2026-07-16  
**Scope:** Full codebase audit of existing search, navigation, keyboard shortcut, and command-palette code prior to C30 implementation.

---

## 1. Existing Search Controls

### SearchDialog.tsx (`src/app/components/platform/SearchDialog.tsx`)

**Status:** Functional but limited.

**Capabilities:**
- Dark-background modal dialog (zIndex 500)
- Search input with `aria-label="Search"` and `aria-autocomplete="list"`
- Keyboard navigation: Arrow Up/Down to move through results, Enter to open, Escape to close
- Result grouping by type
- 4 result types: `document`, `template`, `contact`, `help`
- Loading state with `role="status" aria-live="polite"`
- Empty state with clear messaging
- No-query tip list (< 2 chars)
- Focus restoration: `setTimeout(() => inputRef.current?.focus(), 30)` on open
- Body scroll lock on open
- Results rendered as `role="option"` buttons inside `role="listbox"`
- Footer with keyboard hints

**Gaps:**
- Only 4 result types — missing my-actions, workspace-members, teams, roles, verification, notifications, reports, settings
- No scopes
- No filters
- No recent searches
- No recent destinations
- No pinned commands
- No command groups
- No safe text highlighting
- No workspace context on results
- No availability states
- No partial-source failure state
- `role="listbox"` / `role="option"` pattern is correct but `aria-controls` on input points to `id="search-results"` which works
- No `aria-activedescendant` on the input (gap)

---

### search.service.ts (`src/app/services/mock/search.service.ts`)

**Status:** Functional but minimal.

**Capabilities:**
- `tokenMatch(query, text)` — simple `toLowerCase().includes()` match
- Queries 3 data sources: `MOCK_TRANSACTIONS`, `MOCK_TEMPLATES`, `MOCK_CONTACTS`
- Static help items (5 entries pointing to `/help`)
- Groups results: documents, templates, contacts, help
- `delay(200)` simulation

**Gaps:**
- No branded result IDs
- No match field tracking (no safe highlighting support)
- No relevance scoring
- No workspace context
- No status context
- No availability states
- No scope filtering
- No recent queries/destinations
- No command registry
- Only pulls from 3 fixture arrays; misses inbox, notifications, reports, workspace directory, verification, settings routes

---

## 2. Existing Command Palette

**No dedicated command palette exists.** The `SearchDialog` serves as a partial substitute but does not have command groups, navigation commands, create actions, settings shortcuts, help shortcuts, workspace switch, or pinned commands.

The `command.tsx` UI component (`src/app/components/ui/command.tsx`) is available — it wraps `cmdk` — but is not wired to the authenticated platform shell for search purposes.

---

## 3. Existing Keyboard Shortcuts

**Ctrl+K / Cmd+K:** Registered in `PlatformHeader.tsx` (line 38–44).

```typescript
function handler(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    setSearchOpen((o) => !o);
  }
}
document.addEventListener("keydown", handler);
```

**Issues:**
- The listener is inside `PlatformHeader` — which means it is mounted only when the header is rendered. This is acceptable for the platform shell but means no listener exists on routes that render outside `PlatformLayout` (prepare, template fields, recipient). This is intentional and correct.
- Does not check for active `<input>`, `<textarea>`, or `contenteditable` context. However, the native `e.preventDefault()` call is acceptable since Ctrl+K has no meaningful browser default in most contexts.
- Toggle behavior (`o => !o`) is correct: pressing again closes.
- No duplicate-listener risk since `addEventListener` / `removeEventListener` cleanup is in `useEffect` return.

---

## 4. Existing Route Registries

**Routes:** `src/app/config/routes.ts` — `PLATFORM_ROUTES` array.  
**Nav:** `src/app/config/platform.nav.ts` — `PRIMARY_NAV`, `UTILITY_NAV`, `SETTINGS_NAV`, `PREPARE_ACTION`.

No duplicate registries found. Both files are consistent and authoritative.

---

## 5. Existing Navigation Registries

`PRIMARY_NAV` (7 items): Dashboard, Documents, Templates, Contacts, Verify Document, My Actions, Reports  
`UTILITY_NAV` (2 items): Notifications, Team  
`SETTINGS_NAV` (9 items): Profile, Security, Notifications, Branding, Billing, Usage, Integrations, API Access, Webhooks  
`PREPARE_ACTION`: Prepare Document CTA

No duplicate navigation definitions found.

---

## 6. Existing Fuzzy / Search Utilities

Only `tokenMatch` in `search.service.ts`. No fuzzy-match library imported.  
No `fuse`, `lunr`, `minisearch`, or similar dependencies found.  
No `cmdk` used for the actual search dialog (only imported in `command.tsx` UI wrapper).

---

## 7. Existing Recent-Item State

None. No recent searches, recent destinations, or recent commands are stored anywhere.

---

## 8. Existing Route Guards

`PlatformLayout.tsx` performs auth and onboarding checks.  
`PermissionDenied.tsx`, `SessionExpired.tsx` pages exist.  
No resource-ownership validators exist yet (added in C30).

---

## 9. Existing Result Cards / Lists

`SearchDialog.tsx` renders result buttons inside a `role="listbox"` container. Results show title, subtitle, and an icon.

---

## 10. Existing Mobile Search

**None.** The search trigger in `PlatformHeader` is visible on mobile (36×36px button) but the `SearchDialog` itself uses `paddingTop: 80` fixed positioning which may not be ideal on small screens with virtual keyboards. No full-screen mobile search exists.

---

## 11. Existing Search Highlighting

**None.** Result titles are rendered as plain text — no unsafe `dangerouslySetInnerHTML` is used. The gap is that match ranges are not computed, so no visual highlighting of the matched substring is available.

---

## 12. Existing Help / Public-Site Search

Static help items in `search.service.ts` (5 entries, all pointing to `/help`). No real help content indexed.

---

## 13. Unsafe HTML Risks

**None found.**
- `dangerouslySetInnerHTML` is not used in `SearchDialog` or `search.service.ts`.
- Result titles rendered via `{item.title}` — safe JSX interpolation.

---

## 14. Private Data Exposure Risks

**Current:**
- Contact emails appear as `subtitle` in contact results: `subtitle: c.organization ?? c.email`
- This passes `c.email` when no organization is set. Email is minimally sensitive for Contacts already managed by the user.
- No participant data, signature data, field values, or evidence data exposed.

**Gaps for C30:**
- Notification search must not expose another user's notifications.
- My Actions search must be scoped to current user only.
- Workspace member search must respect team scope.
- All result snippets must use safe text only.

---

## 15. Duplicate Permission Checks

**None found.** Permission model is centralized in `src/app/models/index.ts` (`ROLE_PERMISSIONS`) and consumed via `PlatformContext.hasPermission()`.

---

## 16. Broken Routes / Dead Commands

**None found in navigation.** Legacy `/app/team/*` routes render `PlatformPlaceholder` but are not surfaced prominently in nav.

---

## 17. Accessibility Issues

**SearchDialog:**
- Missing `aria-activedescendant` on search input (active item not announced dynamically to screen readers)
- Dialog has `role="dialog"` + `aria-label="Search"` + `aria-modal` — correct
- Backdrop is `aria-hidden` — correct
- Result buttons use `role="option"` + `aria-selected` — acceptable
- Focus goes to input on open — correct
- Escape closes — correct
- Focus restoration after close: not implemented — gap
- Mobile: no accessible announcement of result count

---

## 18. Responsive Issues

- Search button in header is 36px tall — acceptable
- `<span className="search-label">` hidden below 640px — label hidden on mobile
- Command Palette dialog is max-width 560px, padded top 80px — may need adjustments on small screens with virtual keyboard
- No full-screen mobile search mode

---

## 19. Performance Concerns

- `delay(200)` in search service — simulates latency; acceptable for demo
- No cancellation of stale searches — `cancelled` boolean is used but only the `then()` callback is gated; the promise itself always runs. Acceptable for local data.
- Large domain services not lazily imported — C30 global search service will use controlled imports

---

## 20. Missing States

**In current SearchDialog:**
- No partial-source failure
- No workspace-switch cleanup
- No sign-out cleanup
- No pinned commands
- No recent searches
- No suggested commands
- No scope selection

---

## 21. Files Searched for Search/Command Patterns

Patterns searched: `globalSearch`, `CommandPalette`, `command.*palette`, `SearchDialog`, `Ctrl\+K`, `Meta\+K`, `keyboard.*shortcut`, `recent.*search`, `fuzzyMatch`, `fuse`, `cmdk`, `kbar`, `searchable`, `dangerouslySetInnerHTML`

Files matched:
- `src/app/components/platform/SearchDialog.tsx` — main dialog
- `src/app/components/platform/PlatformHeader.tsx` — shortcut + trigger
- `src/app/components/platform/index.ts` — barrel
- `src/app/components/ui/command.tsx` — cmdk wrapper (unused by platform search)
- `src/app/components/contacts/ContactPicker.tsx` — internal contact search (domain-scoped, not global)
- `src/app/components/ui/sidebar.tsx` — sidebar UI (unrelated)
- `src/app/pages/public/solutions/HealthcareWellness.tsx` — public page using search icon (unrelated)

---

## 22. Dependencies Inventory

**Already installed:**
- `cmdk` — via `command.tsx` shadcn component (NOT used for main platform search)
- `lucide-react` — icons
- `react-router` — navigation

**Not installed (and not needed):**
- No Algolia, Elasticsearch, Meilisearch, Typesense, Fuse.js, Lunr, MiniSearch, or AI SDK

**Decision:** C30 will use a custom deterministic in-memory matcher. No new dependencies required.

---

## 23. Summary of C30 Actions Required

| Area | Action |
|---|---|
| Typed models | Create `src/app/models/search.ts` |
| Search service | Replace `search.service.ts` with rich `global-search.service.ts` |
| Command Palette | Create `src/app/components/platform/CommandPalette.tsx` |
| Global Search page | Create `src/app/pages/platform/search/GlobalSearchPage.tsx` |
| Shell trigger | Update `PlatformHeader.tsx` — upgrade trigger, point to CommandPalette |
| Route | Add `/app/search` to `router.tsx` and `routes.ts` |
| Models | Update `src/app/models/index.ts` — SearchResult, SearchResultGroup upgrade |
| Signout cleanup | Update `PlatformContext.tsx` — call reset on signOut |
| Documentation | Create `docs/global-search-command-palette-and-navigation.md` |
| Backend handoff | Add Section 37 to `docs/backend-integration-handoff.md` |
