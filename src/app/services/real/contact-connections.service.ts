// Contact connections (backend 091): find someone by their exact email, ask
// to add them, and answer the requests others send you.
//
// There is no fixture twin: a request names a real person and lands in their
// account, so there is nothing honest to demonstrate without a backend. The
// demo build shows the external-contact form instead.

import { USE_REAL_BACKEND, API_BASE_URL } from "../backend-flag";
import { apiRequest, ApiError } from "../api-client";

export function contactConnectionsAvailable(workspaceId: string | null | undefined): boolean {
  return USE_REAL_BACKEND && typeof workspaceId === "string" && workspaceId !== "";
}

export interface ConnectionPerson {
  userId: string;
  displayName: string;
  jobTitle: string | null;
  organization: string | null;
  avatarVersion: string | null;
}

export type Relationship = "self" | "none" | "requested" | "incoming";

export interface LookupResult {
  person: (ConnectionPerson & { relationship: Relationship; connectionId: string | null }) | null;
  /** An active contact you can already see with this address, in this workspace. */
  existingContactId: string | null;
}

export interface ContactConnection {
  connectionId: string;
  person: ConnectionPerson;
  /** Received: where it came from. Sent: where you sent it from. */
  workspaceName: string;
  status: "pending";
  createdAt: string;
}

export interface ConnectionLists {
  received: ContactConnection[];
  sent: ContactConnection[];
}

const ws = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}`;
const one = (connectionId: string) => `/me/contact-connections/${encodeURIComponent(connectionId)}`;

/** A found person's or a requester's photo. */
export function personAvatarUrl(person: Pick<ConnectionPerson, "userId" | "avatarVersion">): string | undefined {
  if (person.avatarVersion === null) return undefined;
  return `${API_BASE_URL ?? ""}/me/people/${encodeURIComponent(person.userId)}/avatar?v=${encodeURIComponent(person.avatarVersion)}`;
}

export const contactConnectionsService = {
  lookup(workspaceId: string, email: string): Promise<LookupResult> {
    return apiRequest<LookupResult>(`${ws(workspaceId)}/contact-connections/lookup`, { method: "POST", body: { email } });
  },
  send(workspaceId: string, email: string): Promise<ContactConnection> {
    return apiRequest<ContactConnection>(`${ws(workspaceId)}/contact-connections`, { method: "POST", body: { email } });
  },
  list(): Promise<ConnectionLists> {
    return apiRequest<ConnectionLists>("/me/contact-connections");
  },
  accept(connectionId: string, workspaceId: string): Promise<{ contactId: string | null; workspaceId: string }> {
    return apiRequest(`${one(connectionId)}/accept`, { method: "POST", body: { workspaceId } });
  },
  async decline(connectionId: string): Promise<void> {
    await apiRequest<void>(`${one(connectionId)}/decline`, { method: "POST" });
  },
  async cancel(connectionId: string): Promise<void> {
    await apiRequest<void>(`${one(connectionId)}/cancel`, { method: "POST" });
  },
  getDiscovery(): Promise<{ discoverableByEmail: boolean }> {
    return apiRequest("/me/contact-discovery");
  },
  setDiscovery(discoverableByEmail: boolean): Promise<{ discoverableByEmail: boolean }> {
    return apiRequest("/me/contact-discovery", { method: "PUT", body: { discoverableByEmail } });
  },
};

/** What to tell someone when a connection call fails. */
export function connectionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "You've looked up a lot of people just now. Try again in a little while.";
    if (error.status === 404) return "We couldn't find a LAGDA account for that email.";
    const code = error.body?.code ?? "";
    if (code === "contact_connection_already_in_contacts") return "This person is already in your contacts.";
    if (code === "contact_connection_already_requested") return "You've already sent this person a request.";
    if (code === "contact_connection_request_waiting_for_you") return "They already asked to add you — accept their request in Pending.";
    if (code === "contact_connection_not_pending") return "This request is no longer waiting for an answer.";
    if (error.message) return error.message;
  }
  return fallback;
}
