# LAGDA Platform Route Map

Command 12 · Authenticated `/app/*` Routes

---

## Route Tree

```
/app                           → Navigate to /app/dashboard
/app/dashboard                 → PlatformDashboard (LIVE — C12)

/app/documents                 → PlatformPlaceholder (deferred)
/app/documents/new             → PlatformPlaceholder (deferred)
/app/documents/:id             → PlatformPlaceholder (deferred)

/app/templates                 → PlatformPlaceholder (deferred)
/app/templates/new             → PlatformPlaceholder (deferred)
/app/templates/:id             → PlatformPlaceholder (deferred)

/app/contacts                  → PlatformPlaceholder (deferred)
/app/contacts/:id              → PlatformPlaceholder (deferred)

/app/verify                    → PlatformPlaceholder (deferred)

/app/notifications             → PlatformPlaceholder (deferred)

/app/team                      → PlatformPlaceholder (deferred)
/app/team/members              → PlatformPlaceholder (deferred)
/app/team/roles                → PlatformPlaceholder (deferred)
/app/team/invitations          → PlatformPlaceholder (deferred)

/app/settings                  → PlatformPlaceholder (deferred)
/app/settings/profile          → PlatformPlaceholder (deferred)
/app/settings/security         → PlatformPlaceholder (deferred)
/app/settings/workspace        → PlatformPlaceholder (deferred)
/app/settings/billing          → PlatformPlaceholder (deferred)
/app/settings/api              → PlatformPlaceholder (deferred)
/app/settings/notifications    → PlatformPlaceholder (deferred)
/app/settings/appearance       → PlatformPlaceholder (deferred)
/app/settings/audit-log        → PlatformPlaceholder (deferred)

/app/permission-denied         → PermissionDenied (LIVE — C12)
/app/session-expired           → SessionExpired (LIVE — C12)
/app/*                         → PlatformNotFound (LIVE — C12)
```

---

## Status Legend

| Status | Meaning |
|--------|---------|
| LIVE | Fully implemented in C12 |
| deferred | Shell renders; content is PlatformPlaceholder |

---

## Primary Nav Items (sidebar)

| Label | Path | Permission | Feature Flag |
|-------|------|-----------|-------------|
| Dashboard | /app/dashboard | view_dashboard | dashboardEnabled |
| Documents | /app/documents | view_documents | documentsEnabled |
| Templates | /app/templates | manage_templates | templatesEnabled |
| Contacts | /app/contacts | manage_contacts | contactsEnabled |
| Verify Document | /app/verify | verify_documents | verificationEnabled |

## Utility Nav Items (sidebar lower)

| Label | Path | Permission | Badge |
|-------|------|-----------|-------|
| Notifications | /app/notifications | — | unreadCount |
| Team | /app/team | manage_team | — |

## Settings Nav Items (sidebar bottom)

| Label | Path |
|-------|------|
| Profile | /app/settings/profile |
| Security | /app/settings/security |
| Workspace | /app/settings/workspace |
| Billing | /app/settings/billing |
| API & Integrations | /app/settings/api |
| Notifications | /app/settings/notifications |
| Appearance | /app/settings/appearance |
| Audit Log | /app/settings/audit-log |

---

## Guard Behavior

| Session State | Destination |
|---------------|------------|
| `initializing` | Full-screen loading spinner (navy bg) |
| `unauthenticated` | `/sign-in?returnTo=<encoded current path>` |
| `expired` | `/sign-in?returnTo=<encoded current path>` with `state.reason="expired"` |
| `authenticated` | Render shell |

**returnTo validation:** Only `/app/*` paths are accepted. Any other value redirects to `/app/dashboard`. This prevents open redirect attacks.

---

## Mock Session

- **User:** Ana Reyes (`ana.reyes@example.com`)
- **Primary workspace:** Mabini Legal Solutions (Professional plan, owner)
- **Other workspaces:** Personal Workspace (owner), Northbridge Business Services (reviewer)
- **Role on primary:** `owner` — all 17 permissions active
- **Sign-in flow:** Enter any email + password (≥6 chars) on `/sign-in` → platform session established → redirect to `/app/dashboard`
- **Sign-out:** Clears in-memory session → redirect to `/sign-in`


---

## Signing Workflow (Command 37)

Per-document stage-based recipient routing. Nested inside Document Details so the platform shell
and document shell each render exactly once. All routes are authenticated, workspace aware, team
aware, document-access aware, permission aware, capability aware (`signing-workflow`),
non-indexable, and excluded from the public sitemap.

| Route | Title | Purpose |
|-------|-------|---------|
| /app/documents/:transactionId/workflow | Signing Workflow \| LAGDA | Workflow tab + Kanban status board (Board / Timeline / List) |
| /app/documents/:transactionId/workflow/create | Create Signing Workflow \| LAGDA | Guided six-step creation workspace with the Kanban builder |
| /app/documents/:transactionId/workflow/review | Review Signing Workflow \| LAGDA | Final review before creating in frontend demonstration |
| /app/documents/:transactionId/workflow/stages/:stageId | Signing Stage \| LAGDA | Stage configuration, people, progress, checks |

Static `workflow/*` paths are registered before `workflow/stages/:stageId` to prevent shadowing.
Route titles deliberately contain no document title, participant name, stage name, email, or ID.

Document Details tab order is now: Overview · **Workflow** · Participants · Activity · Evidence ·
Settings. The Workflow tab is hidden unless the capability resolves as available, the user has
`view_documents`, and the document type supports participant routing.
