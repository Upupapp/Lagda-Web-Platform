// Notification Center context — single source of truth for C28 notification state.
// Wraps PlatformLayout so sidebar, header, and all platform pages share the same state.

import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from "react";
import type { NotificationRecord } from "../models/notifications";
import {
  notificationCenterService, hydrate,
} from "../services/mock/notification-center.service";
import { realNotificationFeedService } from "../services/real/notification-feed.service";
import { USE_REAL_BACKEND } from "../services/backend-flag";

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

  // Real notifications, when there is a backend to ask.
  //
  // Fetched once on mount and again whenever the tab is brought back to the
  // front, which is the cheap approximation of "live" that the rest of the
  // product uses. A failure is swallowed deliberately: an empty or stale feed
  // is a far smaller problem than a platform shell that will not render.
  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    let cancelled = false;
    const load = () => {
      void (async () => {
        try {
          const fetched = await realNotificationFeedService.list();
          if (cancelled) return;
          hydrate(fetched);
          setItems([...notificationCenterService.getAllItems()]);
        } catch { /* leave whatever is already shown */ }
      })();
    };
    load();
    const onFocus = () => { load(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
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
