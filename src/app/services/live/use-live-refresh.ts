// For a page that keeps its own `load`: call it again on the app's heartbeat
// and the moment one of `topics` is announced. The companion of useLiveQuery
// for reads that patch several pieces of state at once (the workspace
// overview, People & Teams) or page through a cursor (the activity log),
// where a keyed cache would not fit.
//
// Never calls back at once — the page has just read, or is about to. The
// caller's `refresh` should be QUIET: keep what is on screen while it reads.

import { useEffect, useRef } from "react";
import { onHeartbeat } from "./heartbeat";
import { onTopic, type LiveTopic } from "./topics";

export interface LiveRefreshOptions {
  /** Topics whose announcement refreshes at once. */
  readonly topics?: readonly LiveTopic[];
  /** Only the heartbeats at least this far apart (default: every one, 15 s). */
  readonly every?: number;
  /** False: subscribed to nothing (a page that may not read). */
  readonly enabled?: boolean;
}

export function useLiveRefresh(refresh: () => void, options: LiveRefreshOptions = {}): void {
  const latest = useRef(refresh);
  latest.current = refresh;
  const { every, enabled = true } = options;
  const topicsKey = (options.topics ?? []).join(",");
  useEffect(() => {
    if (!enabled) return;
    const run = () => { latest.current(); };
    const offs = [
      onHeartbeat(run, { every }),
      ...topicsKey.split(",").filter(Boolean).map(topic => onTopic(topic as LiveTopic, run)),
    ];
    return () => { for (const off of offs) off(); };
  }, [enabled, every, topicsKey]);
}
