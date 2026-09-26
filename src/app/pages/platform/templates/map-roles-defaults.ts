// Map Roles is not where these two are chosen. The organization IS the
// sender's workspace, and the invitation link is the only recipient check the
// backend enforces today, so both are fixed here rather than typed or picked.

import type { PrepAuthMethodId } from "../../../models/prepare";
import type { TemplateRoleMapping } from "../../../models/templates";

export const DEFAULT_WORKSPACE_ORGANIZATION = "Default Workspace";

/** The one method on offer: "Secure Invitation Link". */
export const MAP_ROLES_AUTH_METHOD: PrepAuthMethodId = "none";

export function mapRolesOrganization(workspaceName: string | null | undefined): string {
  const name = workspaceName?.trim();
  return name ? name : DEFAULT_WORKSPACE_ORGANIZATION;
}

/** Applied at launch, not on load: the workspace can arrive after the mappings do. */
export function withMapRolesDefaults(
  mappings: readonly TemplateRoleMapping[],
  workspaceName: string | null | undefined,
): TemplateRoleMapping[] {
  const organization = mapRolesOrganization(workspaceName);
  return mappings.map(m => ({ ...m, organization, authMethod: MAP_ROLES_AUTH_METHOD }));
}
