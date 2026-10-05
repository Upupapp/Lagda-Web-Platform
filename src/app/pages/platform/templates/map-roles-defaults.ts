// Map Roles is not where the recipient check is chosen: the invitation link is
// the only one the backend enforces today, so it is fixed here, not picked.
//
// The organization used to be fixed here too, to the sender's workspace. That
// stamped the sender's own company on every participant, including people
// from the other side of the agreement, so it is left as the mapping has it
// (blank unless the sender fills it in on Prepare).

import type { PrepAuthMethodId } from "../../../models/prepare";
import type { TemplateRoleMapping } from "../../../models/templates";

/** The one method on offer: "Secure Invitation Link". */
export const MAP_ROLES_AUTH_METHOD: PrepAuthMethodId = "none";

/** Applied at launch. */
export function withMapRolesDefaults(
  mappings: readonly TemplateRoleMapping[],
): TemplateRoleMapping[] {
  return mappings.map(m => ({ ...m, authMethod: MAP_ROLES_AUTH_METHOD }));
}
