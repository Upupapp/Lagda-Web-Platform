// The other party of a request, as their card shows them: the colour of their workspace's banner and their profile
// photo, both the ones they have in LAGDA. Nothing is shown until the server has answered, and a request that has
// not been taken (or an older server) leaves the card as it was.

import { useEffect, useState } from "react";
import { realEnotarySessionsService } from "../../../services/real/enotary-sessions.service";

export interface CounterpartLook { readonly brandColor: string | null; readonly avatarUrl: string | undefined }

export function useCounterpart(invitationId: string | undefined): CounterpartLook {
  const [look, setLook] = useState<CounterpartLook>({ brandColor: null, avatarUrl: undefined });
  useEffect(() => {
    if (invitationId === undefined) return;
    let alive = true;
    let objectUrl: string | undefined;
    realEnotarySessionsService.counterpart(invitationId).then(async card => {
      if (!alive) return;
      setLook({ brandColor: card.brandColor, avatarUrl: undefined });
      if (!card.hasAvatar) return;
      const photo = await realEnotarySessionsService.counterpartAvatar(invitationId);
      if (!alive) return;
      objectUrl = URL.createObjectURL(photo);
      setLook({ brandColor: card.brandColor, avatarUrl: objectUrl });
    }).catch(() => undefined);
    return () => { alive = false; if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl); };
  }, [invitationId]);
  return look;
}
