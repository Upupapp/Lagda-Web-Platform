// A notary who is sent away from their invitation to verify their identity needs
// a way back to it. The address is kept for this tab only (sessionStorage, for
// two hours) and read back only if it is exactly an invitation address.

import { NOTARY_INVITE_TOKEN } from "../../../utils/authReturnPath";

const KEY = "lagda-notary-invite";
const KEPT_MS = 2 * 60 * 60 * 1000;
const PREFIX = "/enotary/invite/";

/** Remembers the invitation address for the way back. Anything else is ignored. */
export function rememberInvite(path: string, now: number = Date.now()): void {
  if (!path.startsWith(PREFIX) || !NOTARY_INVITE_TOKEN.test(path.slice(PREFIX.length))) return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ path, at: now })); } catch { /* this visit only */ }
}

/** The remembered invitation address, or null if there is none, it is old, or it is not one. */
export function recallInvite(now: number = Date.now()): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const kept = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof kept.path !== "string" || typeof kept.at !== "number" || now - kept.at > KEPT_MS) return null;
    return kept.path.startsWith(PREFIX) && NOTARY_INVITE_TOKEN.test(kept.path.slice(PREFIX.length)) ? kept.path : null;
  } catch {
    return null;
  }
}

export function forgetInvite(): void {
  try { window.sessionStorage.removeItem(KEY); } catch { /* nothing to forget */ }
}
