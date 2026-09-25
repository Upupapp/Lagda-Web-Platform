// Notification Center context — single source of truth for C28 notification state.
// Wraps PlatformLayout so sidebar, header, and all platform pages share the same state.

import {
  createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode,
} from "react";
import type { NotificationRecord } from "../models/notifications";
import {
  notificationCenterService, hydrate,
} from "../services/mock/notification-center.service";
import { realNotificationFeedService } from "../services/real/notification-feed.service";
import {
  realDocumentFeedService, type DocumentFeedScope,
} from "../services/real/document-feed.service";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { usePlatform } from "./PlatformContext";

export type { DocumentFeedScope };

interface NotificationCenterContextValue {
  items: NotificationRecord[];
  unreadCount: number;
  markRead:    (id: string) => void;
  markUnread:  (id: string) => void;
  markAllRead: () => void;
  dismiss:     (id: string) => void;
  restore:     (id: string) => void;
  reload:      () => void;
  /** Whose document notifications to show: the reader's own, or the
   *  workspace's. Only meaningful with a backend. */
  scope:       DocumentFeedScope;
  setScope:    (scope: DocumentFeedScope) => void;
  /** Whether a backend is present, so the scope choice means anything. */
  scopeAvailable: boolean;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

/** A per-viewer convenience, never shared state — so browser storage is the
 *  right place, and a storage failure falls back to the default. */
const SCOPE_KEY = "lagda.notifications.scope";

function readScope(): DocumentFeedScope {
  try {
    return window.localStorage.getItem(SCOPE_KEY) === "workspace" ? "workspace" : "mine";
  } catch {
    return "mine";
  }
}

function loadAll(): NotificationRecord[] {
  return notificationCenterService.getAllItems();
}

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationRecord[]>(() => loadAll());
  const [scope, setScopeState] = useState<DocumentFeedScope>(() => readScope());
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;
  const workspaceName = platform.currentWorkspace?.name ?? "";

  // Ids of rows the SERVER keeps state for — the document feed's. A change
  // to one of these is written through; any other row's state is this
  // session's alone, as it always was.
  const serverStateIds = useRef<Set<string>>(new Set());
  // The latest fetch, so a failed write can re-sync from the server rather
  // than leave the screen claiming a state that was never saved.
  const refetch = useRef<() => void>(() => {});

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
  //   what actually happened to this workspace's documents, one row per
  //   document, with this reader's read/dismissed state persisted (071).
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
            : realDocumentFeedService.list(workspaceId, workspaceName, scope).catch(() => null),
        ]);
        if (cancelled) return;
        // A FAILED document read is not an empty one: keep what is on screen
        // rather than blanking it. An empty result replaces it, since that is
        // true — e.g. switching to "mine" in a workspace of others' documents.
        if (documents === null) return;
        serverStateIds.current = new Set(documents.map(n => n.id));
        hydrate([...account, ...documents], serverStateIds.current);
        setItems([...notificationCenterService.getAllItems()]);
      })();
    };
    refetch.current = load;

    load();
    const onFocus = () => { load(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [workspaceId, workspaceName, scope]);

  /** Writes a state change for the server-tracked ids among `ids`. */
  const persist = useCallback((ids: readonly string[], change: { read?: boolean; dismissed?: boolean }) => {
    if (!USE_REAL_BACKEND || workspaceId === undefined) return;
    const tracked = ids.filter(id => serverStateIds.current.has(id));
    if (tracked.length === 0) return;
    realDocumentFeedService.setState(workspaceId, tracked, change)
      .catch(() => { refetch.current(); });
  }, [workspaceId]);

  const markRead = useCallback((id: string) => {
    notificationCenterService.markRead(id);
    persist([id], { read: true });
    reload();
  }, [reload, persist]);

  const markUnread = useCallback((id: string) => {
    notificationCenterService.markUnread(id);
    persist([id], { read: false });
    reload();
  }, [reload, persist]);

  const markAllRead = useCallback(() => {
    const unread = notificationCenterService.getAllItems()
      .filter(n => n.status === "unread").map(n => n.id);
    notificationCenterService.markAllRead();
    persist(unread, { read: true });
    reload();
  }, [reload, persist]);

  const dismiss = useCallback((id: string) => {
    notificationCenterService.dismiss(id);
    persist([id], { dismissed: true });
    reload();
  }, [reload, persist]);

  const restore = useCallback((id: string) => {
    notificationCenterService.restore(id);
    // The local restore also marks read (see the service); keep the server
    // in step so a reload shows the same thing.
    persist([id], { dismissed: false, read: true });
    reload();
  }, [reload, persist]);

  const setScope = useCallback((next: DocumentFeedScope) => {
    setScopeState(next);
    try { window.localStorage.setItem(SCOPE_KEY, next); } catch { /* per-visit only */ }
  }, []);

  return (
    <NotificationCenterContext.Provider value={{
      items, unreadCount,
      markRead, markUnread, markAllRead, dismiss, restore, reload,
      scope, setScope, scopeAvailable: USE_REAL_BACKEND && workspaceId !== undefined,
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
