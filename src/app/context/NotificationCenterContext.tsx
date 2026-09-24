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
import { realDocumentFeedService } from "../services/real/document-feed.service";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { usePlatform } from "./PlatformContext";

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
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;
  const workspaceName = platform.currentWorkspace?.name ?? "";

  const unreadCount = items.filter((n) => n.status === "unread").length;

  const reload = useCallback(() => {
    setItems([...loadAll()]);
  }, []);

  // Real notifications, when there is a backend to ask.
  //
  // TWO sources, because they answer different questions and neither alone
  // fills the bell:
  //
  //   `/me/notifications` is the EMAIL substrate — messages this account was
  //   sent. A signing invitation is addressed to a recipient and a workspace
  //   invitation to an invitee, so a member's own row there is nearly always
  //   empty, and no status transition writes one at all.
  //
  //   `/workspaces/:id/document-notifications` is the evidence projection —
  //   what actually happened to this workspace's documents. This is what
  //   makes the bell render anything.
  //
  // Re-fetched when the tab regains focus, the same cheap approximation of
  // "live" the rest of the product uses. Each source fails independently: a
  // dead account feed must not blank the document feed, and neither may take
  // down the platform shell.
  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    let cancelled = false;

    const load = () => {
      void (async () => {
        const [account, documents] = await Promise.all([
          realNotificationFeedService.list().catch(() => []),
          workspaceId === undefined
            ? Promise.resolve([])
            : realDocumentFeedService.list(workspaceId, workspaceName).catch(() => []),
        ]);
        if (cancelled) return;
        if (account.length === 0 && documents.length === 0) return;
        hydrate([...account, ...documents]);
        setItems([...notificationCenterService.getAllItems()]);
      })();
    };

    load();
    const onFocus = () => { load(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [workspaceId, workspaceName]);

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
