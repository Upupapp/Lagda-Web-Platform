// Mock data for the LAGDA frontend prototype.
// All names, organizations, emails, and document details are fictional.
// Do not use names from competitor screenshots or real private identities.
// Philippine-relevant scenarios; stable IDs; realistic statuses and dates.

import type {
  DocumentTransactionSummary,
  TemplateSummary,
  ContactSummary,
  NotificationSummary,
} from "../../models";

// ── Fictional organizations ───────────────────────────────────────────────────
//   Northbridge Legal          — law firm (Business plan)
//   Mabini Business Services   — accounting/corporate services (Professional)
//   Harborline Properties      — real estate developer (Business Plus)
//   Sampaguita Learning Institute — education (Personal)

// ── Document transactions ─────────────────────────────────────────────────────

export const MOCK_TRANSACTIONS: DocumentTransactionSummary[] = [
  {
    id: "txn_001",
    title: "Retainer Agreement — Mabini Business Services",
    status: "awaiting-signature",
    createdAt: "2026-07-10T08:00:00Z",
    updatedAt: "2026-07-10T09:14:00Z",
    sentAt: "2026-07-10T09:14:00Z",
    participantCount: 2,
    completedParticipantCount: 1,
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    verificationId: "VRF-2026-NBL-001",
    pageCount: 4,
  },
  {
    id: "txn_002",
    title: "NDA — Harborline Properties × Northbridge Legal",
    status: "completed",
    createdAt: "2026-07-08T11:30:00Z",
    updatedAt: "2026-07-09T14:22:00Z",
    sentAt: "2026-07-08T12:00:00Z",
    completedAt: "2026-07-09T14:22:00Z",
    participantCount: 3,
    completedParticipantCount: 3,
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    verificationId: "VRF-2026-NBL-002",
    pageCount: 6,
  },
  {
    id: "txn_003",
    title: "Deed of Sale — Lot 7 Block 3, Harborline Residences",
    status: "partially-completed",
    createdAt: "2026-07-12T09:00:00Z",
    updatedAt: "2026-07-14T16:45:00Z",
    sentAt: "2026-07-12T10:00:00Z",
    participantCount: 4,
    completedParticipantCount: 2,
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    verificationId: "VRF-2026-NBL-003",
    pageCount: 12,
  },
  {
    id: "txn_004",
    title: "Faculty Employment Contract — Sampaguita Learning Institute",
    status: "draft",
    createdAt: "2026-07-15T07:30:00Z",
    updatedAt: "2026-07-15T07:30:00Z",
    participantCount: 1,
    completedParticipantCount: 0,
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    pageCount: 3,
  },
  {
    id: "txn_005",
    title: "Legal Services Agreement — Mabini Business Services (renewal)",
    status: "sent",
    createdAt: "2026-07-13T14:00:00Z",
    updatedAt: "2026-07-13T14:05:00Z",
    sentAt: "2026-07-13T14:05:00Z",
    expiresAt: "2026-07-27T14:05:00Z",
    participantCount: 2,
    completedParticipantCount: 0,
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    verificationId: "VRF-2026-NBL-005",
    pageCount: 5,
  },
  {
    id: "txn_006",
    title: "Supplier Agreement — Harborline Properties",
    status: "expired",
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    sentAt: "2026-06-01T09:30:00Z",
    expiresAt: "2026-06-15T00:00:00Z",
    participantCount: 2,
    completedParticipantCount: 1,
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    verificationId: "VRF-2026-NBL-006",
    pageCount: 8,
  },
];

// ── Templates ──────────────────────────────────────────────────────────────────

export const MOCK_TEMPLATES: TemplateSummary[] = [
  {
    id: "tmpl_001",
    name: "Standard Retainer Agreement",
    description: "General legal retainer for new clients. Covers scope, fees, and termination.",
    pageCount: 4,
    participantCount: 2,
    usageCount: 18,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    isShared: true,
  },
  {
    id: "tmpl_002",
    name: "Non-Disclosure Agreement",
    description: "Mutual NDA for business discussions and consultations.",
    pageCount: 3,
    participantCount: 2,
    usageCount: 34,
    createdAt: "2026-02-10T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    isShared: true,
  },
  {
    id: "tmpl_003",
    name: "Deed of Absolute Sale (Real Property)",
    description: "Standard form for Philippine real property sale transactions.",
    pageCount: 8,
    participantCount: 3,
    usageCount: 9,
    createdAt: "2026-04-20T00:00:00Z",
    updatedAt: "2026-04-20T00:00:00Z",
    workspaceId: "ws_northbridge_001",
    createdById: "usr_northbridge_001",
    isShared: false,
  },
];

// ── Contacts ──────────────────────────────────────────────────────────────────

export const MOCK_CONTACTS: ContactSummary[] = [
  {
    id: "con_001",
    name: "Maria Reyes",
    email: "m.reyes@mabinibusiness.ph",
    organization: "Mabini Business Services",
    workspaceId: "ws_northbridge_001",
    lastUsedAt: "2026-07-13T14:05:00Z",
    transactionCount: 7,
  },
  {
    id: "con_002",
    name: "Jose dela Cruz",
    email: "jdelacruz@harborlineproperties.ph",
    organization: "Harborline Properties",
    workspaceId: "ws_northbridge_001",
    lastUsedAt: "2026-07-12T10:00:00Z",
    transactionCount: 12,
  },
  {
    id: "con_003",
    name: "Dr. Caridad Lim",
    email: "c.lim@sampaguitaschool.edu.ph",
    organization: "Sampaguita Learning Institute",
    workspaceId: "ws_northbridge_001",
    lastUsedAt: "2026-07-15T07:30:00Z",
    transactionCount: 3,
  },
  {
    id: "con_004",
    name: "Ricardo Buenaventura",
    email: "r.buenaventura@harborlineproperties.ph",
    organization: "Harborline Properties",
    workspaceId: "ws_northbridge_001",
    lastUsedAt: "2026-07-12T10:00:00Z",
    transactionCount: 5,
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS: NotificationSummary[] = [
  {
    id: "notif_001",
    type: "signature-completed",
    title: "Maria Reyes signed the document",
    body: "Retainer Agreement — Mabini Business Services has been signed by Maria Reyes.",
    isRead: false,
    createdAt: "2026-07-10T09:14:00Z",
    linkPath: "/app/documents/txn_001",
    transactionId: "txn_001",
  },
  {
    id: "notif_002",
    type: "document-completed",
    title: "Document completed",
    body: "NDA — Harborline Properties × Northbridge Legal has been fully signed by all parties.",
    isRead: false,
    createdAt: "2026-07-09T14:22:00Z",
    linkPath: "/app/documents/txn_002",
    transactionId: "txn_002",
  },
  {
    id: "notif_003",
    type: "document-expiring",
    title: "Document expiring soon",
    body: "Legal Services Agreement — Mabini Business Services expires in 12 days.",
    isRead: true,
    createdAt: "2026-07-14T08:00:00Z",
    linkPath: "/app/documents/txn_005",
    transactionId: "txn_005",
  },
  {
    id: "notif_004",
    type: "document-expired",
    title: "Document expired",
    body: "Supplier Agreement — Harborline Properties expired on June 15 without completion.",
    isRead: true,
    createdAt: "2026-06-15T00:05:00Z",
    linkPath: "/app/documents/txn_006",
    transactionId: "txn_006",
  },
];
