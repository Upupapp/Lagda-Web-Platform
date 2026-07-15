// Mock document workspace fixtures.
// IDs txn_001–006 match MOCK_TRANSACTIONS in index.ts (shared with Dashboard).
// txn_007–008 are additional documents for the workspace demo.
// All names, organizations, and content are fictional.
// Burgundy (#67023B) is NEVER used here — reserved for eNotary only.
// No IP addresses, device details, exact locations, or private audit evidence.

import type { DocumentFolder, DocumentTag, DocumentListItem } from "../../models/documents";

// ── Folders ───────────────────────────────────────────────────────────────────

export const DOCUMENT_FOLDERS: DocumentFolder[] = [
  { id: "fol_001", name: "Clients",         documentCount: 3, workspaceId: "ws_northbridge_001" },
  { id: "fol_002", name: "Real Estate",      documentCount: 2, workspaceId: "ws_northbridge_001" },
  { id: "fol_003", name: "HR & Employment",  documentCount: 1, workspaceId: "ws_northbridge_001" },
  { id: "fol_004", name: "Suppliers",        documentCount: 2, workspaceId: "ws_northbridge_001" },
  { id: "fol_005", name: "Archive",          documentCount: 1, workspaceId: "ws_northbridge_001" },
];

// ── Tags ──────────────────────────────────────────────────────────────────────
// Never use Burgundy (#67023B) — that is the eNotary reserved color.
// Tag meaning is communicated by name, not by color alone.

export const DOCUMENT_TAGS: DocumentTag[] = [
  { id: "tag_001", name: "Urgent",      color: "#C9960C" }, // Gold
  { id: "tag_002", name: "High Value",  color: "#0078D4" }, // Azure
  { id: "tag_003", name: "Mabini",      color: "#7C3AED" }, // Violet
  { id: "tag_004", name: "Harborline",  color: "#059669" }, // Emerald
  { id: "tag_005", name: "Sampaguita",  color: "#0E7490" }, // Teal
  { id: "tag_006", name: "Renewal",     color: "#9D174D" }, // Rose (distinct from Burgundy #67023B)
];

// ── Document list items ───────────────────────────────────────────────────────

export const DOCUMENT_FIXTURES: DocumentListItem[] = [
  {
    id: "txn_001",
    title: "Retainer Agreement — Mabini Business Services",
    status: "awaiting-signature",
    createdAt: "2026-07-10T08:00:00Z",
    updatedAt: "2026-07-10T09:14:00Z",
    sentAt: "2026-07-10T09:14:00Z",
    participantCount: 2,
    completedParticipantCount: 1,
    participants: [
      { name: "Maria Reyes",  role: "signer", status: "completed" },
      { name: "Antonio Tan",  role: "signer", status: "pending"   },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_001"],
    tags: [DOCUMENT_TAGS[0]!, DOCUMENT_TAGS[2]!],
    pageCount: 4,
    verificationId: "VRF-2026-NBL-001",
    verificationStatus: "available",
    isMyAction: false,
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
    participants: [
      { name: "Jose dela Cruz",       role: "signer", status: "completed" },
      { name: "Ricardo Buenaventura", role: "signer", status: "completed" },
      { name: "Ana Reyes",            role: "signer", status: "completed" },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_001", "fol_002"],
    tags: [DOCUMENT_TAGS[1]!, DOCUMENT_TAGS[3]!],
    pageCount: 6,
    verificationId: "VRF-2026-NBL-002",
    verificationStatus: "available",
    isMyAction: false,
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
    participants: [
      { name: "Jose dela Cruz",         role: "signer", status: "completed" },
      { name: "Remedios Santos",        role: "signer", status: "completed" },
      { name: "Ricardo Buenaventura",   role: "signer", status: "pending"   },
      { name: "Ma. Lourdes Villanueva", role: "signer", status: "pending"   },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_002"],
    tags: [DOCUMENT_TAGS[1]!, DOCUMENT_TAGS[3]!],
    pageCount: 12,
    verificationId: "VRF-2026-NBL-003",
    verificationStatus: "pending",
    isMyAction: false,
  },
  {
    id: "txn_004",
    title: "Faculty Employment Contract — Sampaguita Learning Institute",
    status: "draft",
    createdAt: "2026-07-15T07:30:00Z",
    updatedAt: "2026-07-15T07:30:00Z",
    participantCount: 1,
    completedParticipantCount: 0,
    participants: [
      { name: "Dr. Caridad Lim", role: "signer", status: "pending" },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_003"],
    tags: [DOCUMENT_TAGS[4]!],
    pageCount: 3,
    isMyAction: false,
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
    participants: [
      { name: "Maria Reyes",  role: "signer", status: "pending" },
      { name: "Rafael Gomez", role: "signer", status: "pending" },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_001"],
    tags: [DOCUMENT_TAGS[0]!, DOCUMENT_TAGS[2]!, DOCUMENT_TAGS[5]!],
    pageCount: 5,
    verificationId: "VRF-2026-NBL-005",
    verificationStatus: "pending",
    isMyAction: false,
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
    participants: [
      { name: "Jose dela Cruz",   role: "signer", status: "completed" },
      { name: "Rina Evangelista", role: "signer", status: "expired"   },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_004"],
    tags: [DOCUMENT_TAGS[3]!],
    pageCount: 8,
    verificationId: "VRF-2026-NBL-006",
    verificationStatus: "available",
    isMyAction: false,
  },
  {
    id: "txn_007",
    title: "Vendor Service Agreement — Mabini Business Services",
    status: "archived",
    createdAt: "2026-05-10T09:00:00Z",
    updatedAt: "2026-05-22T00:00:00Z",
    sentAt: "2026-05-10T09:30:00Z",
    expiresAt: "2026-05-22T00:00:00Z",
    participantCount: 2,
    completedParticipantCount: 0,
    participants: [
      { name: "Maria Reyes",   role: "signer", status: "expired" },
      { name: "Luis Bautista", role: "signer", status: "expired" },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_004", "fol_005"],
    tags: [DOCUMENT_TAGS[2]!],
    pageCount: 6,
    preArchiveStatus: "expired",
    isMyAction: false,
  },
  {
    id: "txn_008",
    title: "Data Processing Addendum — Harborline Properties",
    status: "failed-delivery",
    createdAt: "2026-07-11T10:00:00Z",
    updatedAt: "2026-07-11T10:15:00Z",
    sentAt: "2026-07-11T10:05:00Z",
    participantCount: 2,
    completedParticipantCount: 0,
    participants: [
      { name: "Rina Evangelista", role: "signer", status: "pending" },
      { name: "Jose dela Cruz",   role: "signer", status: "pending" },
    ],
    ownerName: "Ana Reyes",
    workspaceId: "ws_northbridge_001",
    folderIds: ["fol_001"],
    tags: [DOCUMENT_TAGS[3]!],
    pageCount: 2,
    isMyAction: false,
  },
];

export const VALID_FOLDER_IDS = new Set(DOCUMENT_FOLDERS.map(f => f.id));
export const VALID_TAG_IDS    = new Set(DOCUMENT_TAGS.map(t => t.id));
export const VALID_ITEM_IDS   = new Set(DOCUMENT_FIXTURES.map(i => i.id));
