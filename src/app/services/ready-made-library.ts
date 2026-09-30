// Loading the ready-made library from the server (093).
//
//   catalogue — every signed-in account: titles, categories, roles, NO text
//   full      — a member of a workspace on Personal or higher; the server
//               refuses anyone else with plan_required (or not-found)
//
// The demo build has no server: it installs a placeholder sample instead.

import { apiRequest, ApiError } from "./api-client";
import { USE_REAL_BACKEND } from "./backend-flag";
import {
  installReadyMadeLibrary, readyMadeLibraryKind, readyMadeLibraryTrusted, type RawLibrary,
} from "./ready-made-templates";
import { DEMO_READY_MADE_LIBRARY } from "./ready-made-demo";

export type ReadyMadeLoad = "full" | "catalog" | "locked" | "error";

let catalogLoading: Promise<void> | null = null;
/** The workspace whose full library is installed, if any. */
let fullFor: string | null = null;

function installDemo(): void {
  if (readyMadeLibraryKind() !== "full") installReadyMadeLibrary(DEMO_READY_MADE_LIBRARY, "full");
}

/** The catalogue, once. Keeps a full library if one is already installed. */
export function loadReadyMadeCatalog(): Promise<void> {
  if (!USE_REAL_BACKEND) { installDemo(); return Promise.resolve(); }
  if (readyMadeLibraryKind() !== "none") return Promise.resolve();
  catalogLoading ??= apiRequest<RawLibrary>("/ready-made-templates/catalog")
    .then(raw => { if (readyMadeLibraryKind() === "none") installReadyMadeLibrary(raw, "catalog"); })
    .catch(() => undefined)
    .finally(() => { catalogLoading = null; });
  return catalogLoading;
}

/**
 * The full library for this workspace. On a Free owner's workspace the server
 * refuses, and whatever full text was loaded for another workspace is
 * replaced by the catalogue, so the text never outlives the plan.
 */
export async function loadReadyMadeLibrary(workspaceId: string | null | undefined): Promise<ReadyMadeLoad> {
  if (!USE_REAL_BACKEND) { installDemo(); return "full"; }
  if (readyMadeLibraryTrusted() && readyMadeLibraryKind() === "full") return "full";
  if (!workspaceId) return "error";
  if (fullFor === workspaceId && readyMadeLibraryKind() === "full") return "full";
  try {
    const raw = await apiRequest<RawLibrary>(`/workspaces/${encodeURIComponent(workspaceId)}/ready-made-templates`);
    installReadyMadeLibrary(raw, "full");
    fullFor = workspaceId;
    return "full";
  } catch (err) {
    const locked = err instanceof ApiError && (err.status === 403 || err.status === 404);
    if (readyMadeLibraryKind() === "full") {
      // Drop the text: fetch the catalogue in its place.
      fullFor = null;
      try {
        installReadyMadeLibrary(await apiRequest<RawLibrary>("/ready-made-templates/catalog"), "catalog");
      } catch { /* the gallery shows its error state */ }
    }
    return locked ? "locked" : "error";
  }
}

/** Whether this workspace's full library is already loaded (no request needed). */
export function readyMadeLibraryLoadedFor(workspaceId: string | null | undefined): boolean {
  if (!USE_REAL_BACKEND) return readyMadeLibraryKind() === "full";
  return readyMadeLibraryKind() === "full"
    && (readyMadeLibraryTrusted() || (workspaceId != null && fullFor === workspaceId));
}

/** For tests: forget which workspace the full library was loaded for. */
export function resetReadyMadeLoader(): void {
  fullFor = null;
  catalogLoading = null;
}
