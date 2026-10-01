// "Something waiting on this account just changed" — the side panel's counts
// (Documents, Shared Documents, Contacts, Invitations) re-read at once instead
// of at their next poll. Raised by the services that change those things
// (signing, sharing, access requests, contact requests, invitations) after
// each call, whether it succeeded or not — a failed call can still mean the
// thing was already done elsewhere. Other open tabs of the app hear it too.
//
// A module of its own so the services can raise it without importing the
// hooks that read the counts (which import those services).

type Listener = () => void;

const listeners = new Set<Listener>();
const CHANNEL = "lagda-nav-counts";
let channel: BroadcastChannel | null | undefined;

function openChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => { for (const l of listeners) l(); };
  } catch {
    channel = null; // no BroadcastChannel: this tab is still current
  }
  return channel;
}

/** Tells this tab's counts, and the other tabs', to re-read now. */
export function announceNavCountsChanged(): void {
  for (const l of listeners) l();
  try { openChannel()?.postMessage("changed"); } catch { /* closed */ }
}

export function onNavCountsChanged(listener: Listener): () => void {
  listeners.add(listener);
  openChannel();
  return () => { listeners.delete(listener); };
}

/** Runs `call`, then announces the change (also when it fails). */
export function changesNavCounts<T>(call: Promise<T>): Promise<T> {
  return call.finally(announceNavCountsChanged);
}
