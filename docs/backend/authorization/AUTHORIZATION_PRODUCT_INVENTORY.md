# Authorization — product inventory

**Established by:** BACKEND-27. Every entry was found by reading the frontend.

Sources inspected: `models/index.ts` (`PlatformRole`, `PlatformPermission`,
`ROLE_PERMISSIONS`), `models/workspace-admin.ts` (`WorkspacePermission`,
`ALL_PERMISSIONS`, `SYSTEM_ROLE_PERMISSIONS`), `MembersPage.tsx`,
`MemberDetailPage.tsx`, `RolesPage.tsx`, `RoleDetailPage.tsx`,
`InvitationsPage.tsx`, `WorkspaceSettingsPage.tsx`, `TeamsPage.tsx`,
`platform.nav.ts`, `product-capability-registry.ts`, `PlatformContext.tsx`,
`DataPrivacyPage.tsx`, handoff §20.

Classification: **IMPLEMENT_NOW** · **FOUNDATION_ONLY** · **DEFER** ·
**NOT_IN_PRODUCT** · **REQUIRES_REVIEW**

---

## The product has TWO permission tables, and they disagree

This is the most important finding, and it shaped several decisions.

| | `ROLE_PERMISSIONS` | `SYSTEM_ROLE_PERMISSIONS` |
|---|---|---|
| Where | `models/index.ts` | `models/workspace-admin.ts` |
| Keyed on | `PlatformRole` (9 values) | `WorkspaceRoleId` (`role_owner`, `role_member`, …) |
| Permissions | `PlatformPermission`, 22 | `WorkspacePermission`, 30 |
| Consumed by | `PlatformContext.hasPermission`, `platform.nav.ts`, the capability registry | the custom-role builder on `RolesPage.tsx` |
| Marked | live application state | `demonstrationOnly: true` |

**`ROLE_PERMISSIONS` is the one that gates reachability.** The whole
workspace-administration section requires `manage_team`, checked through
`platform.nav.ts` and `product-capability-registry.ts`. That is the table the
backend policy was derived from.

Where they disagree, the disagreement is recorded rather than resolved by
picking the more permissive reading — see OD-100.

## Roles

| Role | Status | Meaning |
|---|---|---|
| `owner` | **IMPLEMENT_NOW** | The administrative root. Exactly one per workspace. |
| `administrator` | **IMPLEMENT_NOW** | Full workspace and member administration, minus ownership. Holds `manage_team` + `manage_workspace` in `ROLE_PERMISSIONS`. |
| `member` | **IMPLEMENT_NOW** | An ordinary participant. Added in BACKEND-26 because it is the invite form's default. |
| `template_administrator` | **FOUNDATION_ONLY** | In the vocabulary; its powers are over templates (BACKEND-47). Holds `workspace.view` and nothing else today. |
| `sender` | **FOUNDATION_ONLY** | Same — document powers arrive with BACKEND-29/32/33. |
| `reviewer` | **FOUNDATION_ONLY** | Same. |
| `auditor` | **FOUNDATION_ONLY** | Same — audit powers arrive with BACKEND-43. |
| `billing_administrator` | **DEFER** — BACKEND-50 | In `PlatformRole`, not in `WORKSPACE_ROLES`. Its only permissions are billing ones that do not exist. |
| `security_administrator` | **DEFER** — BACKEND-27+ | In `PlatformRole`. Its permissions (`manage_security`, `view_audit`) govern nothing yet. |
| `viewer` | **REQUIRES_REVIEW** — OD-104 | In `PlatformRole` with `view_dashboard` + `view_documents`. Overlaps `member` and `reviewer`; the product does not distinguish them anywhere reachable. |
| `super_admin`, `manager`, `editor`, `contributor` | **NOT_IN_PRODUCT** | Not added. Other products ship them; LAGDA does not. |

**Speculative roles deliberately not created:** `SUPER_ADMIN`, `ADMIN` (the
product's name is `administrator`), `MANAGER`, `EDITOR`, `CONTRIBUTOR`,
`SUPPORT`, `SYSTEM_ADMIN`.

## Operations

| Operation | Where the product shows it | Status |
|---|---|---|
| **Invite member** | `InvitationsPage.tsx` | **IMPLEMENT_NOW** — `invitation.create` (BACKEND-26, re-authorized here) |
| **Resend / revoke invitation** | Buttons on every pending row | **IMPLEMENT_NOW** — `invitation.resend` / `invitation.revoke` |
| **View pending invitations** | The same table | **IMPLEMENT_NOW** — `invitation.view` |
| **View members** | `MembersPage.tsx` — name, **email**, role, status | **IMPLEMENT_NOW** — `membership.view` |
| **Change member role** | `MemberDetailPage.tsx` → `asyncUpdateMemberRole` | **IMPLEMENT_NOW** — `membership.role.change` |
| **Remove member** | `MemberDetailPage.tsx` → `asyncRemoveMember` | **IMPLEMENT_NOW** — `membership.remove` |
| **Update workspace settings** | `WorkspaceSettingsPage.tsx` | **IMPLEMENT_NOW** — `workspace.update` |
| **View workspace** | Everywhere | **IMPLEMENT_NOW** — `workspace.view` |
| **Leave workspace** | **Nothing.** No control anywhere. | **NOT_IN_PRODUCT** — OD-102 |
| **Transfer ownership** | One button: *"Transfer ownership (demonstration only)"* | **DEFER** — OD-101 |
| **Archive workspace** | Nothing (BACKEND-25 established this) | **NOT_IN_PRODUCT** — no capability declared |
| **Suspend / reactivate / deactivate member** | `MemberDetailPage.tsx` — three further actions | **DEFER** — OD-103 |
| **Create custom roles** | `RolesPage.tsx` — a builder over 30 permissions | **REQUIRES_REVIEW** — OD-105 |
| **Teams** | `TeamsPage.tsx` | **DEFER** — BACKEND-27+ |
| **Bulk member actions** | A selection checkbox with no bulk action wired | **NOT_IN_PRODUCT** |

## Future-domain capabilities, catalogued not built

Named here so BACKEND-28 onward add them to the central policy rather than
inventing role checks. **None is implemented**, because none has an operation.

| Future capability | Owner |
|---|---|
| `contact.view`, `contact.create`, `contact.update`, `contact.delete` | BACKEND-28 |
| `document.create`, `document.view`, `document.prepare` | BACKEND-29/30 |
| `signing_request.create`, `signing_request.send` | BACKEND-32/33 |
| `template.view`, `template.manage`, `template.delete` | BACKEND-47 |
| `billing.view`, `billing.manage` | BACKEND-50 |
| `api_key.manage` | BACKEND-52 |
| `webhook.manage` | BACKEND-53 |
| `audit.view` | BACKEND-43 |

The frontend's `WorkspacePermission` union already names all of these. They stay
there until the operation exists — a capability with nothing behind it is a
promise the policy cannot keep.

## Why custom roles were not built

`RolesPage.tsx` has a working custom-role builder: name, description, and a
checkbox per permission over all 30 `WorkspacePermission` values.

Building the `roles` and `role_permissions` tables to support it would mean
shipping a permission editor for permissions that govern nothing — 26 of the 30
concern documents, templates, contacts and billing, none of which have backend
operations. A customer could compose a role granting `documents:send` and it
would mean exactly nothing.

The fixed code-defined model is what §10 and §11 prefer, and the migration path
if enterprise requirements ever demand dynamic roles is recorded in
AUTHORIZATION_ARCHITECTURE.md. OD-105.
