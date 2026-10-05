// May the signed-in person start preparing a document in this workspace?
//
// The role alone used to decide it. A member whose ROLE cannot send (a
// Reviewer, say) but who was granted "Assign someone for document signing"
// CAN: the server lets them, and did all along. The button stayed grey for
// them anyway, so they could only get in by typing the address.

import { usePlatform } from "../context/PlatformContext";
import { useWorkspaceAccess } from "./useWorkspaceAccess";

export function useCanPrepare(): boolean {
  const { hasPermission } = usePlatform();
  const access = useWorkspaceAccess();
  return hasPermission("prepare_documents") || access.can("signing-request.create");
}
