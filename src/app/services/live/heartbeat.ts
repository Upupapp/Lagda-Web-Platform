// ONE timer for everything that keeps itself current by asking again.
//
// The side-panel counts, the pending-invitation count, the notification
// centre, the documents list and the workspace branding each used to run
// their own interval, their own focus listener and their own visibility
// listener — five timers firing out of step, five bursts of requests. Now
// every reader subscribes here and the app has one beat:
//
//   • every 15 seconds while the tab is visible (a hidden tab is never asked;
//     it catches up the moment it is shown),
//   • when the window regains focus,
//   • when the tab becomes visible again (a phone browser rarely fires
//     `focus` when its tab comes back; it does fire `visibilitychange`).
//
// Focus and visibility usually arrive together: one beat, not two, within
// the gap below. A reader that wants a slower pace (branding, once a minute)
// passes `every`, and is told on the beats that fall that far apart.

export const HEARTBEAT_MS = 15_000;
/** Focus and visibilitychange both fire on return: that is ONE beat. */
export const HEARTBEAT_GAP_MS = 1_000;

type Listener = () => void;

interface Subscriber {
  readonly listener: Listener;
  readonly every: number;
  lastTold: number;
}

const subscribers = new Set<Subscriber>();
let timer: ReturnType<typeof setInterval> | null = null;
let lastBeat = 0;

function beat(force = false): void {
  const now = Date.now();
  if (!force && now - lastBeat < HEARTBEAT_GAP_MS) return;
  lastBeat = now;
  for (const s of subscribers) {
    if (s.every > 0 && now - s.lastTold < s.every - HEARTBEAT_GAP_MS) continue;
    s.lastTold = now;
    s.listener();
  }
}

function onTick() { if (document.visibilityState !== "hidden") beat(); }
function onFocus() { beat(); }
function onVisibility() { if (document.visibilityState === "visible") beat(); }

function start(): void {
  if (timer !== null || typeof window === "undefined") return;
  timer = setInterval(onTick, HEARTBEAT_MS);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
}

function stop(): void {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
  window.removeEventListener("focus", onFocus);
  document.removeEventListener("visibilitychange", onVisibility);
}

/**
 * Hears every beat (or, with `every`, the beats at least that far apart —
 * the first one comes once `every` has passed since subscribing). Does NOT
 * call back at once: the subscriber has just read, or is about to.
 */
export function onHeartbeat(listener: Listener, options: { every?: number } = {}): () => void {
  const subscriber: Subscriber = { listener, every: options.every ?? 0, lastTold: Date.now() };
  subscribers.add(subscriber);
  start();
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stop();
  };
}

/** Beats now, as the timer would — for a caller that knows the tab is back. */
export function pulse(): void { beat(true); }

/** For tests: forgets every subscriber and stops the timer. */
export function resetHeartbeat(): void {
  subscribers.clear();
  stop();
  lastBeat = 0;
}
