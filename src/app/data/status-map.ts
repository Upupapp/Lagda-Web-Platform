// Centralized document/workflow status presentation mapping.
// Separates display concerns from domain models.
// Each status has: label, semantic tone, and accessible description.
// Color is NEVER the only signal — every entry has a human-readable label.
//
// "Verified" is intentionally distinct from "Completed":
// a transaction may be completed without the uploaded file matching its verification record.

import type { TransactionStatus } from "../models";

export type StatusTone =
  | "neutral"   // Not yet acted on
  | "info"      // In progress, no action required
  | "primary"   // Key active state
  | "success"   // Terminal success
  | "warning"   // Needs attention, soft deadline
  | "error"     // Terminal failure / blocked
  | "muted";    // Archived, voided, cancelled

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon?: "dot" | "check" | "clock" | "x" | "warning" | "archive";
  description: string;
  isTerminal?: boolean;
}

export const DOCUMENT_STATUS_MAP: Record<TransactionStatus, StatusPresentation> = {
  "draft": {
    label: "Draft",
    tone: "neutral",
    bgColor: "#f3f3f5",
    textColor: "#475569",
    borderColor: "rgba(0,0,0,0.09)",
    icon: "dot",
    description: "Document is being prepared and has not been sent.",
  },
  "ready-to-send": {
    label: "Ready to Send",
    tone: "info",
    bgColor: "#EAF6FF",
    textColor: "#005BA9",
    borderColor: "#BAE0FA",
    icon: "dot",
    description: "Document is prepared and ready to send to recipients.",
  },
  "sent": {
    label: "Sent",
    tone: "info",
    bgColor: "#EAF6FF",
    textColor: "#0078D4",
    borderColor: "#BAE0FA",
    icon: "dot",
    description: "Document has been sent to all recipients.",
  },
  "delivered": {
    label: "Delivered",
    tone: "info",
    bgColor: "#EAF6FF",
    textColor: "#0078D4",
    borderColor: "#BAE0FA",
    icon: "check",
    description: "Document was successfully delivered to all recipients.",
  },
  "viewed": {
    label: "Viewed",
    tone: "primary",
    bgColor: "#EAF6FF",
    textColor: "#005BA9",
    borderColor: "#BAE0FA",
    icon: "dot",
    description: "At least one recipient has opened the document.",
  },
  "auth-completed": {
    label: "Identity Verified",
    tone: "primary",
    bgColor: "#EAF6FF",
    textColor: "#005BA9",
    borderColor: "#BAE0FA",
    icon: "check",
    description: "Recipient identity verification has been completed.",
  },
  "awaiting-signature": {
    label: "Awaiting Signature",
    tone: "primary",
    bgColor: "#EAF6FF",
    textColor: "#005BA9",
    borderColor: "#BAE0FA",
    icon: "clock",
    description: "Waiting for one or more recipients to sign.",
  },
  "awaiting-approval": {
    label: "Awaiting Approval",
    tone: "warning",
    bgColor: "#FEF3C7",
    textColor: "#B45309",
    borderColor: "#FDE68A",
    icon: "clock",
    description: "Waiting for approver action before the document can proceed.",
  },
  "partially-completed": {
    label: "Partially Signed",
    tone: "primary",
    bgColor: "#EAF6FF",
    textColor: "#0078D4",
    borderColor: "#BAE0FA",
    icon: "dot",
    description: "Some but not all recipients have completed their actions.",
  },
  "completed": {
    label: "Completed",
    tone: "success",
    bgColor: "#DCFCE7",
    textColor: "#15803D",
    borderColor: "#86EFAC",
    icon: "check",
    description: "All parties have completed the required actions.",
    isTerminal: true,
  },
  "declined": {
    label: "Declined",
    tone: "error",
    bgColor: "#FEE2E2",
    textColor: "#B91C1C",
    borderColor: "#FECACA",
    icon: "x",
    description: "A recipient declined to sign or approve.",
    isTerminal: true,
  },
  "cancelled": {
    label: "Cancelled",
    tone: "muted",
    bgColor: "#f3f3f5",
    textColor: "#64748B",
    borderColor: "rgba(0,0,0,0.09)",
    icon: "x",
    description: "The transaction was cancelled by the sender.",
    isTerminal: true,
  },
  "expired": {
    label: "Expired",
    tone: "muted",
    bgColor: "#FEF3C7",
    textColor: "#92400E",
    borderColor: "#FDE68A",
    icon: "clock",
    description: "The signing deadline passed without all actions being completed.",
    isTerminal: true,
  },
  "failed-delivery": {
    label: "Delivery Failed",
    tone: "error",
    bgColor: "#FEE2E2",
    textColor: "#B91C1C",
    borderColor: "#FECACA",
    icon: "x",
    description: "The document could not be delivered to one or more recipients.",
  },
  "voided": {
    label: "Voided",
    tone: "muted",
    bgColor: "#f3f3f5",
    textColor: "#64748B",
    borderColor: "rgba(0,0,0,0.09)",
    icon: "archive",
    description: "The transaction has been voided and is no longer valid.",
    isTerminal: true,
  },
  "needs-attention": {
    label: "Needs Attention",
    tone: "warning",
    bgColor: "#FEF3C7",
    textColor: "#B45309",
    borderColor: "#FDE68A",
    icon: "warning",
    description: "This document requires your review or action.",
  },
  "archived": {
    label: "Archived",
    tone: "muted",
    bgColor: "#f3f3f5",
    textColor: "#64748B",
    borderColor: "rgba(0,0,0,0.09)",
    icon: "archive",
    description: "The document has been archived for record-keeping.",
    isTerminal: true,
  },
};

// ── Verification status (separate from transaction status) ───────────────────
// "Verified" ≠ "Completed" — a transaction may be completed but its document
// hash may not match the verification record.

export type VerificationStatusKey = "verified" | "mismatch" | "pending" | "not-found";

export interface VerificationPresentation {
  label: string;
  tone: StatusTone;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export const VERIFICATION_STATUS_MAP: Record<VerificationStatusKey, VerificationPresentation> = {
  "verified": {
    label: "Document Verified",
    tone: "success",
    bgColor: "#DCFCE7",
    textColor: "#15803D",
    borderColor: "#86EFAC",
    description: "The document record matches the LAGDA verification database.",
  },
  "mismatch": {
    label: "Verification Mismatch",
    tone: "error",
    bgColor: "#FEE2E2",
    textColor: "#B91C1C",
    borderColor: "#FECACA",
    description: "The document does not match any record in the LAGDA verification database.",
  },
  "pending": {
    label: "Verification Pending",
    tone: "info",
    bgColor: "#EAF6FF",
    textColor: "#005BA9",
    borderColor: "#BAE0FA",
    description: "Verification is being processed.",
  },
  "not-found": {
    label: "No Matching Record",
    tone: "muted",
    bgColor: "#f3f3f5",
    textColor: "#64748B",
    borderColor: "rgba(0,0,0,0.09)",
    description: "No verification record found for this document.",
  },
};
