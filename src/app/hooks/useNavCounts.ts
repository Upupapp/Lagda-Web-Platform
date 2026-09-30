// The side panel's pop-up counts: unread notices for Documents, Shared
// Documents and Contacts, from the one notification feed.
//
// Split by where each notice leads, so a notice is counted on exactly one
// row: sharing notices open Shared Documents, contact notices open Contacts,
// and the rest of the document notices stay with Documents.

import { useOptionalNotificationCenter } from "../context/NotificationCenterContext";

const SHARED = "/app/shared-documents";
const CONTACTS = "/app/contacts";

export interface NavCounts {
  readonly documents: number;
  readonly shared: number;
  readonly contacts: number;
}

export function useNavCounts(): NavCounts {
  const center = useOptionalNotificationCenter();
  const unread = (center?.items ?? []).filter(n => n.status === "unread");
  const leadsTo = (prefix: string) => (n: { actionPath?: string | null }) => (n.actionPath ?? "").startsWith(prefix);
  const shared = unread.filter(leadsTo(SHARED)).length;
  const contacts = unread.filter(leadsTo(CONTACTS)).length;
  const documents = unread.filter(n => n.category === "documents" && !leadsTo(SHARED)(n) && !leadsTo(CONTACTS)(n)).length;
  return { documents, shared, contacts };
}
