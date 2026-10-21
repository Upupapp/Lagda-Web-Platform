// The other party of a request, as their card shows them: the colour of their workspace's banner and their profile
// photo, both the ones they have in LAGDA. Nothing is shown until the server has answered, and a request that has
// not been taken (or an older server) leaves the card as it was.
//
// While the page is open the card asks again every 30 seconds (and when the tab comes back to the front). A photo is
// fetched again only when its version changes, so a person who changes their photo is seen with the new one without
// anyone reloading the page.

import { useEffect, useState } from "react";
import { realEnotarySessionsService } from "../../../services/real/enotary-sessions.service";

export const COUNTERPART_REFRESH_MS = 30_000;

export interface CounterpartLook { readonly brandColor: string | null; readonly avatarUrl: string | undefined }

export function useCounterpart(invitationId: string | undefined): CounterpartLook {
  const [look, setLook] = useState<CounterpartLook>({ brandColor: null, avatarUrl: undefined });
  useEffect(() => {
    if (invitationId === undefined) return;
    let alive = true;
    let objectUrl: string | undefined;
    let shownVersion: string | null = null;
    let asking = false;
    const refresh = async () => {
      if (asking) return;
      asking = true;
      try {
        const card = await realEnotarySessionsService.counterpart(invitationId);
        if (!alive) return;
        const version = card.hasAvatar ? (card.avatarVersion ?? "photo") : null;
        if (version === shownVersion) {
          setLook(current => (current.brandColor === card.brandColor ? current : { ...current, brandColor: card.brandColor }));
          return;
        }
        let nextUrl: string | undefined;
        if (version !== null) {
          const photo = await realEnotarySessionsService.counterpartAvatar(invitationId, card.avatarVersion);
          if (!alive) return;
          nextUrl = URL.createObjectURL(photo);
        }
        const previous = objectUrl;
        objectUrl = nextUrl;
        shownVersion = version;
        setLook({ brandColor: card.brandColor, avatarUrl: nextUrl });
        if (previous !== undefined) URL.revokeObjectURL(previous);
      } catch {
        /* the next round tries again */
      } finally {
        asking = false;
      }
    };
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, COUNTERPART_REFRESH_MS);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl);
    };
  }, [invitationId]);
  return look;
}
