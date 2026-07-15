// Mock TransactionDetail service for /app/documents/:transactionId.
// All state is in-memory. No backend, no persistence, no real mutations.
// Archive, restore, rename, and settings operations mutate a local copy only.
// No real document content, participant data, or audit evidence exposed.

import type {
  TransactionDetail,
  TransactionActionAvailability,
  TransactionActionId,
  ReminderSettings,
  ExpirationSettings,
} from "../../models/transaction-detail";
import {
  TRANSACTION_DETAIL_FIXTURES,
  VALID_TXN_DETAIL_IDS,
} from "../../data/mock/transaction-detail";
import { delay } from "./delay";

// ── In-memory store ───────────────────────────────────────────────────────────

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

let store: TransactionDetail[] = deepCopy(TRANSACTION_DETAIL_FIXTURES);

// ── Action availability resolver ──────────────────────────────────────────────

export function resolveActions(
  txn: TransactionDetail,
  canPrepare: boolean,
  canVerify: boolean,
  canAudit: boolean,
): TransactionActionAvailability[] {
  const { status } = txn;
  const isArchived = status === "archived";
  const isDraft    = status === "draft" || status === "ready-to-send";
  const isCompleted = status === "completed";
  const isTerminal  = ["completed","declined","cancelled","expired","voided","failed-delivery"].includes(status);
  const isActive    = ["sent","delivered","viewed","authentication-completed","awaiting-signature","awaiting-approval","partially-completed"].includes(status);

  function avail(action: TransactionActionId, available: boolean, reason?: string): TransactionActionAvailability {
    return { action, available, reason };
  }

  return [
    avail("view-overview",     true),
    avail("view-participants", status !== "draft"),
    avail("view-activity",     true),
    avail("view-evidence",     canVerify || canAudit),
    avail("open-settings",     canPrepare || isCompleted),
    avail("continue-draft",    isDraft && canPrepare),
    avail("rename",            (isDraft || isActive) && canPrepare),
    avail("edit-reminders",    isActive && canPrepare, isTerminal ? "Cannot change reminders on a completed or closed transaction." : undefined),
    avail("edit-expiration",   isActive && canPrepare, isTerminal ? "Cannot change expiration on a closed transaction." : undefined),
    avail("move-folder",       canPrepare || canVerify),
    avail("edit-tags",         canPrepare || canVerify),
    avail("archive",           isTerminal && !isArchived && canPrepare),
    avail("restore",           isArchived && canPrepare),
    avail("cancel",            isActive && canPrepare, !isActive ? "Transaction is not in an active state." : undefined),
    avail("void",              isCompleted && canAudit, !isCompleted ? "Only completed transactions can be voided." : undefined),
    avail("resend-invitation", isActive && canPrepare),
    avail("copy-verification-id", !!txn.verificationRecord.verificationId),
    avail("open-verification",    txn.verificationRecord.publiclyVerifiable),
  ];
}

// ── Service class ─────────────────────────────────────────────────────────────

class MockTransactionDetailService {

  async getTransaction(id: string): Promise<TransactionDetail | null> {
    await delay(220);
    if (!VALID_TXN_DETAIL_IDS.has(id)) return null;
    const found = store.find(t => t.id === id);
    return found ? deepCopy(found) : null;
  }

  async renameTransaction(id: string, title: string): Promise<void> {
    await delay(100);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    const cleanTitle = title.trim().slice(0, 200);
    if (!cleanTitle) throw new Error("Title cannot be empty.");
    item.title = cleanTitle;
    item.updatedAt = new Date().toISOString();
    // Add mock activity event
    item.activity.unshift({
      id: `ev_rename_${Date.now()}`,
      transactionId: id,
      type: "transaction-renamed",
      category: "settings",
      timestamp: new Date().toISOString(),
      title: "Transaction renamed",
      description: `Title updated to "${cleanTitle}" in this demonstration.`,
      actorName: "Ana Reyes",
      actorType: "user",
      severity: "info",
      hasEvidence: false,
    });
  }

  async archive(id: string): Promise<void> {
    await delay(120);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    if (item.status === "archived") return;
    item.preArchiveStatus = item.status;
    item.status = "archived";
    item.updatedAt = new Date().toISOString();
    item.activity.unshift({
      id: `ev_archive_${Date.now()}`,
      transactionId: id,
      type: "transaction-archived",
      category: "transaction",
      timestamp: new Date().toISOString(),
      title: "Transaction archived",
      description: "Transaction moved to the Archived view in this demonstration.",
      actorName: "Ana Reyes",
      actorType: "user",
      severity: "info",
      hasEvidence: false,
    });
  }

  async restore(id: string): Promise<void> {
    await delay(120);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    if (item.status !== "archived") return;
    item.status = item.preArchiveStatus ?? "expired";
    item.preArchiveStatus = undefined;
    item.updatedAt = new Date().toISOString();
    item.activity.unshift({
      id: `ev_restore_${Date.now()}`,
      transactionId: id,
      type: "transaction-restored",
      category: "transaction",
      timestamp: new Date().toISOString(),
      title: "Transaction restored",
      description: "Transaction restored from the Archived view in this demonstration.",
      actorName: "Ana Reyes",
      actorType: "user",
      severity: "info",
      hasEvidence: false,
    });
  }

  async cancelTransaction(id: string, reason: string): Promise<void> {
    await delay(150);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    item.status = "cancelled";
    item.updatedAt = new Date().toISOString();
    item.activity.unshift({
      id: `ev_cancel_${Date.now()}`,
      transactionId: id,
      type: "transaction-cancelled",
      category: "transaction",
      timestamp: new Date().toISOString(),
      title: "Transaction cancelled",
      description: `Transaction cancelled in this demonstration. Reason: ${reason.trim().slice(0, 200)}`,
      actorName: "Ana Reyes",
      actorType: "user",
      severity: "warning",
      hasEvidence: false,
    });
  }

  async updateReminders(id: string, settings: ReminderSettings): Promise<void> {
    await delay(100);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    item.reminder = { ...settings };
    item.updatedAt = new Date().toISOString();
    item.activity.unshift({
      id: `ev_reminder_${Date.now()}`,
      transactionId: id,
      type: "expiration-updated",
      category: "settings",
      timestamp: new Date().toISOString(),
      title: "Reminder settings updated",
      description: settings.enabled
        ? `Reminders set to every ${settings.intervalDays} day(s) in this demonstration.`
        : "Reminders disabled in this demonstration.",
      actorName: "Ana Reyes",
      actorType: "user",
      severity: "info",
      hasEvidence: false,
    });
  }

  async updateExpiration(id: string, settings: ExpirationSettings): Promise<void> {
    await delay(100);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    item.expiration = { ...settings };
    if (settings.expiresAt) item.expiresAt = settings.expiresAt;
    item.updatedAt = new Date().toISOString();
    item.activity.unshift({
      id: `ev_expiry_${Date.now()}`,
      transactionId: id,
      type: "expiration-updated",
      category: "settings",
      timestamp: new Date().toISOString(),
      title: "Expiration settings updated",
      description: settings.enabled && settings.expiresAt
        ? `Expiration set to ${new Date(settings.expiresAt).toLocaleDateString("en-PH")} in this demonstration.`
        : "Expiration removed in this demonstration.",
      actorName: "Ana Reyes",
      actorType: "user",
      severity: "info",
      hasEvidence: false,
    });
  }

  async moveToFolder(id: string, folderId: string, folderName: string): Promise<void> {
    await delay(80);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    if (!item.folderIds.includes(folderId)) {
      item.folderIds = [...item.folderIds, folderId];
      item.folderNames = [...item.folderNames, folderName];
    }
    item.updatedAt = new Date().toISOString();
  }

  async addTag(id: string, tag: { id: string; name: string; color: string }): Promise<void> {
    await delay(80);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    if (!item.tags.some(t => t.id === tag.id)) {
      item.tags = [...item.tags, tag];
    }
    item.updatedAt = new Date().toISOString();
  }

  async removeTag(id: string, tagId: string): Promise<void> {
    await delay(80);
    const item = store.find(t => t.id === id);
    if (!item) throw new Error("Transaction not found.");
    item.tags = item.tags.filter(t => t.id !== tagId);
    item.updatedAt = new Date().toISOString();
  }

  // Resets all fixtures (useful for dev/demo)
  reset(): void {
    store = deepCopy(TRANSACTION_DETAIL_FIXTURES);
  }
}

export const mockTransactionDetailService = new MockTransactionDetailService();
