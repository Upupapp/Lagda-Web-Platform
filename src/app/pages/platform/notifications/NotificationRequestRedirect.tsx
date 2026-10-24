// Route: /app/notifications/request/:type/:requestId (131)
//
// Where an emailed eNotary notice to a notary leads, after sign-in when needed: the notice itself in the Notifications
// Center, with its two ways forward (open the request or the room, or the request alone on the desk). An email does not
// know the notice's own id, so this finds the newest notice of that type about that request and opens it. Where there
// is none (dismissed long ago, or the feed cannot be read), the desk opens filtered to the request: the same place the
// second way leads.

import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router";
import { realNotificationFeedService, notaryDeskFilteredPath } from "../../../services/real/notification-feed.service";
import { EnotaryLoading } from "../enotary/EnotaryStates";

export function NotificationRequestRedirect() {
  const { type = "", requestId = "" } = useParams<{ type: string; requestId: string }>();
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    realNotificationFeedService.list().then(
      items => {
        const found = items
          .filter(item => item.notificationType === type && item.enotaryRequestId === requestId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (alive) setTo(found === undefined ? notaryDeskFilteredPath(requestId) : `/app/notifications/${encodeURIComponent(found.id)}`);
      },
      () => { if (alive) setTo(notaryDeskFilteredPath(requestId)); },
    );
    return () => { alive = false; };
  }, [type, requestId]);

  if (requestId === "") return <Navigate to="/app/notifications" replace />;
  if (to === null) return <EnotaryLoading label="Opening the notification…" />;
  return <Navigate to={to} replace />;
}
