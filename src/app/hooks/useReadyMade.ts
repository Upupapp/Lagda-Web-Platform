// The ready-made library for a page (093): the catalogue (titles, no text)
// or, with `full`, the whole library for the current workspace — which the
// server gives only on Personal or higher. See services/ready-made-library.ts.

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePlatform } from "../context/PlatformContext";
import {
  READY_MADE_TEMPLATES, READY_MADE_CATEGORIES, readyMadeLibraryKind, readyMadeLibraryVersion,
  subscribeReadyMade, type ReadyMadeCategory, type ReadyMadeTemplate, type ReadyMadeLibraryKind,
} from "../services/ready-made-templates";
import { loadReadyMadeCatalog, loadReadyMadeLibrary, readyMadeLibraryLoadedFor, type ReadyMadeLoad } from "../services/ready-made-library";

export interface ReadyMadeState {
  readonly templates: readonly ReadyMadeTemplate[];
  readonly categories: readonly ReadyMadeCategory[];
  readonly kind: ReadyMadeLibraryKind;
  /** Changes whenever the library does (the arrays are filled in place). */
  readonly version: number;
  /** For `full`: loading, loaded, refused by plan, or failed. */
  readonly status: "loading" | ReadyMadeLoad;
}

export function useReadyMade({ full = false }: { full?: boolean } = {}): ReadyMadeState {
  const { currentWorkspace } = usePlatform();
  const workspaceId = currentWorkspace?.id ?? null;
  const version = useSyncExternalStore(subscribeReadyMade, readyMadeLibraryVersion, readyMadeLibraryVersion);
  const [status, setStatus] = useState<ReadyMadeState["status"]>(() =>
    full ? (readyMadeLibraryLoadedFor(workspaceId) ? "full" : "loading")
      : readyMadeLibraryKind() === "none" ? "loading" : "catalog");

  useEffect(() => {
    let live = true;
    if (full) {
      if (!readyMadeLibraryLoadedFor(workspaceId)) setStatus("loading");
      void loadReadyMadeLibrary(workspaceId).then(result => { if (live) setStatus(result); });
    } else {
      void loadReadyMadeCatalog().then(() => {
        if (live) setStatus(readyMadeLibraryKind() === "none" ? "error" : "catalog");
      });
    }
    return () => { live = false; };
  }, [full, workspaceId]);

  return { templates: READY_MADE_TEMPLATES, categories: READY_MADE_CATEGORIES, kind: readyMadeLibraryKind(), version, status };
}
