# Workspace — product inventory

**Established by:** BACKEND-25. Every entry was found by reading the frontend,
not by reasoning about what a SaaS product usually has.

Sources inspected:

- `src/app/components/platform/WorkspaceSwitcher.tsx`
- `src/app/context/PlatformContext.tsx`
- `src/app/models/index.ts` (`PlatformWorkspace`, `PlatformRole`, `ROLE_PERMISSIONS`)
- `src/app/models/workspace-admin.ts` (Command 23's admin model)
- `src/app/data/mock/workspaces.ts`, `src/app/data/mock/workspace-admin.ts`
- `src/app/pages/platform/workspace/*` — Overview, Settings, Members, Teams,
  Roles, Invitations, Activity
- `src/app/pages/onboarding/OnboardingWorkspace.tsx`
- `src/app/pages/auth/AcceptInvitation.tsx`
- `src/app/config/routes.ts`, `src/router.tsx`
- `docs/backend-integration-handoff.md` §5, §6, §20

Classification: **IMPLEMENT_NOW** · **FOUNDATION_ONLY** · **DEFER** ·
**NOT_IN_PRODUCT** · **REQUIRES_REVIEW**

---

## Lifecycle

| Behaviour | Where the product shows it | Status |
|---|---|---|
| **Create workspace** | `OnboardingWorkspace.tsx` collects a workspace name for the personal and organization scenarios. The switcher's "Create or join workspace" is present but labelled **SOON** with a no-op handler. | **IMPLEMENT_NOW** |
| **List my workspaces** | `WorkspaceSwitcher.tsx` renders `usePlatform().workspaces` and marks the current one. | **IMPLEMENT_NOW** |
| **Get workspace** | `WorkspaceOverviewPage.tsx`, `WorkspaceSettingsPage.tsx` | **IMPLEMENT_NOW** |
| **Update workspace name** | `WorkspaceSettingsPage.tsx` → "Workspace identity" → Workspace name | **IMPLEMENT_NOW** |
| **Switch active workspace** | `switchWorkspace(id)` mutates in-memory context; `runWorkspaceSwitchCleanup` clears feature state. | **IMPLEMENT_NOW** — as request context, not as stored state. See WORKSPACE_CONTEXT.md |
| **Archive workspace** | **Nothing.** Teams and custom roles have Archive/Restore buttons; workspaces have none. `WorkspaceStatus` includes `archived`, but no fixture uses it and no action sets it. | **DEFER** — OD-091 |
| **Restore workspace** | Nothing. | **DEFER** — follows archive |
| **Hard delete workspace** | Nothing. No `DELETE`, no danger-zone delete, no "close workspace". | **DEFER** — BACKEND-55 |
| **Ownership transfer** | `WorkspaceSettingsPage.tsx` danger zone has a button labelled **"Transfer ownership (demonstration only)"**. | **DEFER** — BACKEND-27 |
| **Leave workspace** | Nothing. Members can be removed by an administrator; there is no self-service leave. | **DEFER** — BACKEND-26/27 |

## Metadata fields

`WorkspaceSettingsPage.tsx` renders seven editable fields. One is implemented.

| Field | Status | Reason |
|---|---|---|
| `name` | **IMPLEMENT_NOW** | The only field this command owns. Rendered everywhere, edited here. |
| `slug` | **DEFER** — OD-089 | Displayed as `/{slug}` on the overview page and editable in settings, but **no route resolves one**. There is no `/w/:slug` segment anywhere in `routes.ts` or `router.tsx`. §9 says build slug infrastructure only if the product routes on it. Uniqueness scope is also undecided. |
| `billingEmail` | **DEFER** — BACKEND-50 | A billing field. Splitting billing state between two commands is how it ends up owned by neither. |
| `defaultMemberRoleId` | **DEFER** — BACKEND-26 | It is the role an *invitation* assigns on acceptance. Meaningless before invitations exist. |
| `allowMemberInvites` | **DEFER** — BACKEND-26 | An invitation permission. |
| `requireMfaForAdmins` | **DEFER** — BACKEND-27 | A role-conditioned security policy, and it raises a question this command cannot answer: what it means for a user who belongs to two workspaces with different settings. |
| `sessionTimeoutMinutes` | **DEFER** — OD-092 | A per-tenant override of BACKEND-13's session policy. A session is global to the user; scoping its lifetime per workspace needs a decision about which workspace's setting applies. |

Not in the product at all, and therefore not built: `logo`, `timezone`,
`locale`, `legalEntityName`, `taxId`, `address`, `industry`, `teamSize`,
`settings jsonb`. `teamSize` **is** collected in onboarding, but as a lead
qualifier on a form that persists nothing — **NOT_IN_PRODUCT** as workspace
state.

## Workspace type and plan

| Behaviour | Status |
|---|---|
| `type: personal \| team \| enterprise` | **REQUIRES_REVIEW** — the switcher and overview render it, and no backend rule depends on it. It looks like a plan derivative rather than a workspace property. BACKEND-50. |
| `plan` | **DEFER** — BACKEND-50 |
| `memberCount`, `activeMembers`, `pendingInvitations`, `teamCount` | **DEFER** — BACKEND-26/27. Aggregates over tables that do not exist. |
| `initials`, `accentColor` | **NOT_IN_PRODUCT** as stored state — both are derivable in the client from the name, and `accentColor` is fixture decoration. |
| `status` badge on the overview page | **REQUIRES_REVIEW** — OD-091. The page renders `workspace.status.toUpperCase()`, and the backend has one state. |

## Membership, roles, invitations

| Behaviour | Status |
|---|---|
| **Owner membership on creation** | **IMPLEMENT_NOW** |
| **Membership as the authorization edge** | **IMPLEMENT_NOW** |
| Role vocabulary (`PlatformRole`, 9 values; 6 adopted) | **FOUNDATION_ONLY** — the CHECK constraint holds six; only `owner` is writable by any endpoint |
| Member directory, suspend, deactivate, remove | **DEFER** — BACKEND-26/27 |
| Invitations: send, resend, revoke, accept | **DEFER** — BACKEND-26. `AcceptInvitation.tsx` and `InvitationsPage.tsx` exist and are frontend-only |
| Teams | **DEFER** — BACKEND-27+ |
| Custom roles and the 30-permission matrix | **DEFER** — BACKEND-27 |
| Activity log (24 event types) | **DEFER** — BACKEND-27+ |

## Handoff expectations deliberately not honoured

`backend-integration-handoff.md` §5 says the server-issued session "must include:
userId, workspaceId, role, permissions, plan", and §60 says it "must include all
accessible workspace IDs".

**Not implemented, and not an oversight.** A session that carries a workspace
list and a role is a credential that keeps granting access after the membership
behind it is removed — the staleness this whole command is arranged to prevent
(§34, §115). `GET /workspaces` returns the same information, freshly, on every
call. Recorded as a deliberate divergence in WORKSPACE_CONTEXT.md rather than
silently dropped.

§6's "the frontend sends the current workspaceId in every API request (header or
path segment)" **is** honoured, via the path segment.
