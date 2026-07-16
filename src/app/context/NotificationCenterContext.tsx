// Notification Center context — single source of truth for C28 notification state.
// Wraps PlatformLayout so sidebar, header, and all platform pages share the same state.

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { NotificationRecord } from "../models/notifications";
import { notificationCenterService } from "../services/mock/notification-center.service";

interface NotificationCenterContextValue {
  items: NotificationRecord[];
  unreadCount: number;
  markRead:    (id: string) => void;
  markUnread:  (id: string) => void;
  markAllRead: () => void;
  dismiss:     (id: string) => void;
  restore:     (id: string) => void;
  reload:      () => void;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

function loadAll(): NotificationRecord[] {
  return notificationCenterService.getAllItems();
}

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationRecord[]>(() => loadAll());

  const unreadCount = items.filter((n) => n.status === "unread").length;

  const reload = useCallback(() => {
    setItems([...loadAll()]);
  }, []);

  const markRead = useCallback((id: string) => {
    notificationCenterService.markRead(id);
    reload();
  }, [reload]);

  const markUnread = useCallback((id: string) => {
    notificationCenterService.markUnread(id);
    reload();
  }, [reload]);

  const markAllRead = useCallback(() => {
    notificationCenterService.markAllRead();
    reload();
  }, [reload]);

  const dismiss = useCallback((id: string) => {
    notificationCenterService.dismiss(id);
    reload();
  }, [reload]);

  const restore = useCallback((id: string) => {
    notificationCenterService.restore(id);
    reload();
  }, [reload]);

  return (
    <NotificationCenterContext.Provider value={{
      items, unreadCount,
      markRead, markUnread, markAllRead, dismiss, restore, reload,
    }}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter(): NotificationCenterContextValue {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) throw new Error("useNotificationCenter must be used inside <NotificationCenterProvider>");
  return ctx;
}
