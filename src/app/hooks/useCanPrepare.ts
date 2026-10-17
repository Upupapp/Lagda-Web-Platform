// What the signed-in person may reach in this workspace, for navigation.
//
// The role alone used to decide it. A member whose ROLE cannot send (a
// Reviewer, say) but who was granted "Assign participants for document signing"
// CAN prepare, read contacts and use templates: the server lets them, and did
// all along. The Prepare button stayed grey and Contacts stayed off their menu
// anyway, so they could only get in by typing the address.

import { usePlatform } from "../context/PlatformContext";
import { useWorkspaceAccess } from "./useWorkspaceAccess";
import type { WorkspaceCapabilityId } from "../models/workspace-role-policy";
import { useAccountFeatures } from "./useAccountFeatures";

/** A menu entry the server's own answer can open, beyond the role's. */
const NAV_CAPABILITY: Readonly<Record<string, WorkspaceCapabilityId>> = {
  contacts: "contact.view",
  templates: "template.view",
};

export interface NavAccess {
  canPrepare: boolean;
  /** May this menu entry be shown? The role says yes, or a granted capability does. */
  allows: (item: {
    id: string;
    permission?: Parameters<ReturnType<typeof usePlatform>["hasPermission"]>[0];
    /** An entry the server offers per account, not per role (platform.nav.ts). */
    account?: "enotary";
  }) => boolean;
}

/** One read of the workspace access for a whole menu. */
export function useNavAccess(): NavAccess {
  const { hasPermission } = usePlatform();
  const access = useWorkspaceAccess();
  const features = useAccountFeatures();
  return {
    canPrepare: hasPermission("prepare_documents") || access.can("signing-request.create"),
    allows: (item) => {
      // Offered to this account by the server, or not shown at all.
      if (item.account === "enotary" && !features.enotaryAvailable) return false;
      if (!item.permission || hasPermission(item.permission)) return true;
      const capability = NAV_CAPABILITY[item.id];
      return capability !== undefined && access.can(capability);
    },
  };
}

export function useCanPrepare(): boolean {
  return useNavAccess().canPrepare;
}
