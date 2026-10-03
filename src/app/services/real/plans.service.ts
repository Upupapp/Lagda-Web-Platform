// Plans (backend 093): the account's own plan, a workspace's plan (its
// owner's), test-mode upgrade requests, and the approver's decisions.
//
// There is no fixture twin: the demo build has every feature, so the plan
// hooks answer "business" there without calling anything.

import { API_BASE_URL } from "../backend-flag";
import { apiRequest, ApiError } from "../api-client";
import { changes } from "../live/topics";

export type PlanId = "free" | "personal" | "business" | "enterprise";
export type RequestablePlan = "personal" | "business";
export type UpgradeStatus = "pending" | "approved" | "declined" | "expired" | "cancelled";

export interface UpgradeRequest {
  requestId: string;
  plan: RequestablePlan;
  amountPesos: number;
  status: UpgradeStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
}

export interface MyPlan {
  /** The plan in force now (a lapsed month reads as Free). */
  plan: PlanId;
  storedPlan: PlanId;
  paidUntil: string | null;
  autoRenew: boolean;
  freeDocumentsUsed: number;
  freeDocumentLimit: number;
  pendingRequest: UpgradeRequest | null;
  /** Whether this account approves upgrades (the LAGDA owner). */
  approver: boolean;
  upgradesAvailable: boolean;
}

export interface WorkspacePlan {
  plan: PlanId;
  ownerIsYou: boolean;
  ownerName: string | null;
  paidUntil: string | null;
}

export interface UpgradeReview extends UpgradeRequest {
  requesterName: string;
  requesterEmail: string;
  currentPlan: PlanId;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  swiftCode: string;
}

/** The one account test mode accepts. Fictional on purpose; mirrors the server. */
export const SAMPLE_BANK_ACCOUNT: Readonly<BankDetails> = Object.freeze({
  bankName: "LAGDA Test Bank",
  accountName: "LAGDA Test Account",
  accountNumber: "0000-1234-5678",
  branch: "Test Branch",
  swiftCode: "LAGDTEST",
});

export const PLAN_PRICES: Readonly<Record<RequestablePlan, number>> = Object.freeze({ personal: 299, business: 799 });

export const PLAN_NAMES: Readonly<Record<PlanId, string>> = Object.freeze({
  free: "Free", personal: "Personal", business: "Business", enterprise: "Enterprise",
});

const RANK: Readonly<Record<PlanId, number>> = { free: 0, personal: 1, business: 2, enterprise: 3 };

/** Whether `plan` includes everything `minimum` does. */
export function planIncludes(plan: PlanId, minimum: PlanId): boolean {
  return RANK[plan] >= RANK[minimum];
}

/** The API error codes the plan screens react to. */
export const PLAN_ERROR = {
  planRequired: "plan_required",
  freeLimit: "free_document_limit_reached",
  sampleOnly: "test_bank_account_required",
  pending: "plan_upgrade_pending",
} as const;

const one = (requestId: string) => `/plan-requests/${encodeURIComponent(requestId)}`;

/** One approved plan change (test mode: no payment was taken). */
export interface PlanInvoice {
  number: string;
  requestId: string;
  plan: RequestablePlan;
  planName: string;
  amountPesos: number;
  /** When it was approved: the invoice date and the start of the month it buys. */
  issuedAt: string;
  periodEnd: string;
}

/** The invoice's PDF, built by the server. `workspace` is the name printed under "Billed to". */
async function invoicePdf(number: string, workspace: string): Promise<Blob> {
  if (API_BASE_URL === null) throw new ApiError(0, undefined, "No backend is configured.");
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/me/plan/invoices/${encodeURIComponent(number)}/pdf?workspace=${encodeURIComponent(workspace.slice(0, 120))}`,
      { method: "GET", credentials: "include" });
  } catch {
    throw new ApiError(0, undefined, "Could not reach the server. Check your connection and try again.");
  }
  if (!response.ok) throw new ApiError(response.status, undefined, "The invoice PDF could not be created.");
  const blob = await response.blob();
  return blob.type ? blob : new Blob([blob], { type: "application/pdf" });
}

export const plansService = {
  invoicePdf,
  /** The caller's own invoices, newest first. */
  invoices(): Promise<{ invoices: PlanInvoice[] }> {
    return apiRequest<{ invoices: PlanInvoice[] }>("/me/plan/invoices");
  },
  mine(): Promise<MyPlan> {
    return apiRequest<MyPlan>("/me/plan");
  },
  workspace(workspaceId: string): Promise<WorkspacePlan> {
    return apiRequest<WorkspacePlan>(`/workspaces/${encodeURIComponent(workspaceId)}/plan`);
  },
  requestUpgrade(plan: RequestablePlan, bank: BankDetails): Promise<UpgradeRequest> {
    return changes("plan", apiRequest<UpgradeRequest>("/me/plan/upgrade-requests", { method: "POST", body: { plan, bank } }));
  },
  cancelRequest(): Promise<void> {
    return changes("plan", apiRequest<void>("/me/plan/upgrade-requests/cancel", { method: "POST" }));
  },
  pendingReviews(): Promise<{ requests: UpgradeReview[] }> {
    return apiRequest<{ requests: UpgradeReview[] }>("/plan-requests");
  },
  review(requestId: string): Promise<UpgradeReview> {
    return apiRequest<UpgradeReview>(one(requestId));
  },
  decide(requestId: string, decision: "approve" | "decline"): Promise<UpgradeReview> {
    return changes("plan", apiRequest<UpgradeReview>(`${one(requestId)}/${decision}`, { method: "POST" }));
  },
};
