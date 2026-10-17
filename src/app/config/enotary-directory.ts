// The LAGDA Notary Directory: a plain static site published on this same
// domain from the app's public/enotary-directory/ folder. It is NOT a route of
// this app, so every way to it must be a full page load (a plain anchor, or
// React Router's `reloadDocument`), never a client-side navigation, which
// would land on the app's own "not found" page instead.
//
// The directory lets people browse notaries public and register their
// interest. eNotary sessions are not open yet.

export const ENOTARY_DIRECTORY_PATH = "/enotary-directory/";

/** True for an address served by the static Notary Directory, not by this app. */
export function isStaticSitePath(path: string): boolean {
  return path === "/enotary-directory" || path.startsWith(ENOTARY_DIRECTORY_PATH);
}

