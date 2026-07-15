import type { NotificationService } from "../interfaces";
import type { NotificationSummary } from "../../models";
import { MOCK_NOTIFICATIONS } from "../../data/mock";
import { delay } from "./delay";

// In-memory mutable copy so mark-read interactions persist within the session
let notifications: NotificationSummary[] = [...MOCK_NOTIFICATIONS];

class MockNotificationService implements NotificationService {
  async list() {
    await delay(200);
    return { success: true as const, data: [...notifications] };
  }

  async markRead(id: string) {
    await delay(100);
    notifications = notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
  }

  async markAllRead() {
    await delay(100);
    notifications = notifications.map((n) => ({ ...n, isRead: true }));
  }
}

export const mockNotificationService: NotificationService = new MockNotificationService();
