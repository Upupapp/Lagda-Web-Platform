// Fictional workspace fixtures for the LAGDA platform frontend.
// All names and organizations are invented. Not based on real entities.

import type { PlatformWorkspace } from "../../models";
import type { SubscriptionSummary } from "../../models";
import type { UserSummary } from "../../models";

export const MOCK_CURRENT_USER: UserSummary = {
  id: "usr_mls_001",
  email: "ana.reyes@example.com",
  displayName: "Ana Reyes",
  role: "owner",
  workspaceId: "ws_mls_001",
};

export const MOCK_WORKSPACES: PlatformWorkspace[] = [
  {
    id: "ws_mls_001",
    name: "Mabini Legal Solutions",
    slug: "mabini-legal-solutions",
    plan: "professional",
    type: "team",
    role: "owner",
    memberCount: 6,
    initials: "ML",
    accentColor: "#0078D4",
  },
  {
    id: "ws_personal_001",
    name: "Personal Workspace",
    slug: "personal",
    plan: "personal",
    type: "personal",
    role: "owner",
    memberCount: 1,
    initials: "AR",
    accentColor: "#475569",
  },
  {
    id: "ws_nb_001",
    name: "Northbridge Business Services",
    slug: "northbridge-business",
    plan: "business",
    type: "team",
    role: "reviewer",
    memberCount: 18,
    initials: "NB",
    accentColor: "#0891B2",
  },
];

export const MOCK_CURRENT_WORKSPACE = MOCK_WORKSPACES[0];

export const MOCK_SUBSCRIPTION: SubscriptionSummary = {
  plan: "professional",
  cycle: "annual",
  status: "active",
  currentPeriodEnd: "2026-12-31",
  sendingRequestsUsed: 31,
  sendingRequestsLimit: 200,
  storageUsedBytes: 1_073_741_824,
  storageLimitBytes: 5_368_709_120,
};
