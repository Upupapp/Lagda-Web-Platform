// "Something of THIS kind just changed" — one signal per kind of data, so a
// page that shows it can re-read at once instead of at its next heartbeat.
//
// Raised by the services that change things (after a call, whether it
// succeeded or not: a failed call can still mean the thing was already done
// elsewhere). Heard in this tab, and in this browser's other tabs of the app
// through ONE BroadcastChannel for every topic — the counts, plan, profile
// and branding channels that used to exist each on their own relay here.
//
// A module of its own, with no imports: the services raise topics without
// importing the hooks that read the data (which import those services).

export type LiveTopic =
  | "counts"          // what is waiting on this account (side-panel bubbles)
  | "plan"            // my plan, a workspace's plan, upgrade requests
  | "profile"         // my name, sender name, photo
  | "workspace"       // a workspace's name, branding, the list of workspaces I hold
  | "notifications"   // the notification centre
  | "documents"       // signing requests and documents of a workspace
  | "contacts"        // contacts and contact requests
  | "templates"       // templates
  | "invitations"     // workspace invitations and join requests
  | "members"         // members and teams
  | "billing";        // invoices, usage

type Listener = (topic: LiveTopic) => void;

const CHANNEL = "lagda-live";
const listeners = new Map<LiveTopic | "*", Set<Listener>>();
let channel: BroadcastChannel | null | undefined;

function deliver(topic: LiveTopic): void {
  for (const l of listeners.get(topic) ?? []) l(topic);
  for (const l of listeners.get("*") ?? []) l(topic);
}

function openChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (typeof data === "object" && data !== null && "topic" in data && typeof data.topic === "string") {
        deliver(data.topic as LiveTopic);
      }
    };
  } catch {
    channel = null; // no BroadcastChannel: this tab is still current
  }
  return channel;
}

/**
 * Tells this tab's readers of `topic`, and the other tabs', to re-read now.
 * `remoteOnly` skips this tab — for a caller that already applied the change
 * here itself and only wants the other tabs to catch up.
 */
export function announce(topic: LiveTopic, options: { remoteOnly?: boolean } = {}): void {
  if (!options.remoteOnly) deliver(topic);
  try { openChannel()?.postMessage({ topic }); } catch { /* closed */ }
}

/** Hears `topic` ("*": every topic) until the returned function is called. */
export function onTopic(topic: LiveTopic | "*", listener: Listener): () => void {
  let set = listeners.get(topic);
  if (set === undefined) { set = new Set(); listeners.set(topic, set); }
  set.add(listener);
  openChannel();
  return () => { set.delete(listener); };
}

/** Runs `call`, then announces `topic` (also when it fails). */
export function changes<T>(topic: LiveTopic, call: Promise<T>): Promise<T> {
  return call.finally(() => { announce(topic); });
}

/** For tests: forgets every listener and the channel. */
export function resetTopics(): void {
  listeners.clear();
  try { channel?.close(); } catch { /* already closed */ }
  channel = undefined;
}
