// 132. Each person's trash bin of eNotary requests: the client's "My notary requests" and the notary's desk.
//
// A request that is over can be moved to the trash, restored, or deleted from it. Deleting only takes it out of this
// person's own lists: the request, the notarized document, the register entry and the audit trail are kept.

import { apiRequest } from "../api-client";

export type BinRole = "client" | "notary";
export type BinOutcome = "declined" | "cancelled" | "expired" | "missed" | "notarized" | "called_off";

export interface BinItem {
  id: string;
  reference: string | null;
  role: BinRole;
  /** The other party: the notary for the client, the client for the notary. */
  otherParty: string;
  outcome: BinOutcome;
  documentLabel: string | null;
  createdAt: string;
  trashedAt: string;
}

export const BIN_OUTCOME_LABELS: Record<BinOutcome, string> = {
  declined: "Declined", cancelled: "Cancelled", expired: "Expired", missed: "Missed", notarized: "Notarized", called_off: "Session called off",
};

const at = (id: string) => `/me/enotary/bin/requests/${encodeURIComponent(id)}`;

export const realEnotaryBinService = {
  async list(role: BinRole): Promise<BinItem[]> {
    return (await apiRequest<{ items: BinItem[] }>(`/me/enotary/bin?role=${role}`)).items;
  },
  async trash(id: string): Promise<void> {
    await apiRequest<{ count: number }>(at(id), { method: "POST" });
  },
  async restore(id: string, role: BinRole): Promise<number> {
    return (await apiRequest<{ count: number }>(`${at(id)}/restore`, { method: "POST", body: { role } })).count;
  },
  async remove(id: string, role: BinRole): Promise<number> {
    return (await apiRequest<{ count: number }>(`${at(id)}/delete`, { method: "POST", body: { role } })).count;
  },
  async restoreAll(role: BinRole): Promise<number> {
    return (await apiRequest<{ count: number }>("/me/enotary/bin/restore-all", { method: "POST", body: { role } })).count;
  },
  async empty(role: BinRole): Promise<number> {
    return (await apiRequest<{ count: number }>("/me/enotary/bin/empty", { method: "POST", body: { role } })).count;
  },
};
