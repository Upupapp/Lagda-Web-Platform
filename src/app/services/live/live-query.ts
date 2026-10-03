// One in-memory copy of what the app has read, so a page shows what it last
// saw at once and re-reads quietly behind it.
//
//   • keyed by what the data is and whose it is (`documents:ws_1:sent`);
//   • fresh for `ttl` — asked again only when that has passed (10 s for a
//     list, 60 s for settings), or when a topic says it changed;
//   • one request per key however many components ask at the same moment;
//   • stale-while-revalidate: the old value stays on screen while the new one
//     is on its way, and a failed re-read keeps it (with the error beside it);
//   • forgotten on sign-out and on a workspace switch, so nothing of one
//     account or workspace is ever shown as another's.
//
// Memory only: a reload starts empty (no localStorage, by design — the lint
// forbids it, and a cached copy of another person's data in the browser is a
// leak waiting to happen).

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { registerSessionCleanup } from "../session-lifecycle";
import { onHeartbeat } from "./heartbeat";
import { onTopic, type LiveTopic } from "./topics";

/** Lists and counts: things another person changes. */
export const LIST_TTL_MS = 10_000;
/** Settings and profiles: things the person in front of the screen changes. */
export const SETTINGS_TTL_MS = 60_000;

export interface LiveSnapshot<T> {
  readonly data: T | undefined;
  readonly error: unknown;
  /** A read is in flight (the first, or a re-read behind `data`). */
  readonly reading: boolean;
  /** When `data` was read (0: never). */
  readonly readAt: number;
}

interface Entry {
  snapshot: LiveSnapshot<unknown>;
  inflight: Promise<unknown> | null;
  readonly listeners: Set<() => void>;
}

const EMPTY: LiveSnapshot<never> = { data: undefined, error: undefined, reading: false, readAt: 0 };
const cache = new Map<string, Entry>();
/** Bumped by every clear: a read that started before it is dropped when it lands. */
let generation = 0;

function entryFor(key: string): Entry {
  let entry = cache.get(key);
  if (entry === undefined) {
    entry = { snapshot: EMPTY, inflight: null, listeners: new Set() };
    cache.set(key, entry);
  }
  return entry;
}

function publish(entry: Entry, next: Partial<LiveSnapshot<unknown>>): void {
  entry.snapshot = { ...entry.snapshot, ...next };
  for (const l of entry.listeners) l();
}

/** What is held for `key` right now, without asking for it. */
export function peekLive<T>(key: string): LiveSnapshot<T> {
  return (cache.get(key)?.snapshot ?? EMPTY) as LiveSnapshot<T>;
}

/**
 * The value for `key`: the held one while it is younger than `ttl`, otherwise
 * read with `fetcher` (one read at a time per key; `force` reads even when
 * fresh). Rejects only when there is nothing held to fall back on.
 */
export function readLive<T>(
  key: string, fetcher: () => Promise<T>, options: { ttl?: number; force?: boolean } = {},
): Promise<T> {
  const entry = entryFor(key);
  const { ttl = LIST_TTL_MS, force = false } = options;
  const held = entry.snapshot as LiveSnapshot<T>;
  if (entry.inflight !== null) return entry.inflight as Promise<T>;
  if (!force && held.data !== undefined && Date.now() - held.readAt < ttl) return Promise.resolve(held.data);

  const started = generation;
  const read = fetcher().then(
    value => {
      if (generation !== started) return value;
      // The same object again (a 304 answered from the held copy): nothing
      // on screen changes, only the age.
      publish(entry, { data: value, error: undefined, reading: false, readAt: Date.now() });
      return value;
    },
    (error: unknown) => {
      if (generation !== started) throw error;
      publish(entry, { error, reading: false });
      const kept = entry.snapshot as LiveSnapshot<T>;
      if (kept.data !== undefined) return kept.data;
      throw error;
    },
  ).finally(() => { if (entry.inflight === read) entry.inflight = null; });
  entry.inflight = read;
  publish(entry, { reading: true });
  return read;
}

/** Puts a value in directly — a page that just wrote it knows the answer. */
export function primeLive<T>(key: string, value: T): void {
  publish(entryFor(key), { data: value, error: undefined, readAt: Date.now() });
}

/** Marks every key starting with `prefix` ("" = all) as stale: read again when next asked. */
export function invalidateLive(prefix = ""): void {
  for (const [key, entry] of cache) {
    if (key.startsWith(prefix) && entry.snapshot.readAt !== 0) publish(entry, { readAt: 0 });
  }
}

/** Forgets everything. In-flight reads are dropped when they land. */
export function clearLiveCache(): void {
  generation += 1;
  for (const entry of cache.values()) {
    entry.inflight = null;
    publish(entry, EMPTY);
  }
  // Entries with listeners stay (their components are still mounted and will
  // re-read); the rest are dropped.
  for (const [key, entry] of cache) if (entry.listeners.size === 0) cache.delete(key);
}

// Nothing of one account's, or one workspace's, is ever shown as another's.
registerSessionCleanup({
  id: "live-query",
  onSignOut: clearLiveCache,
  onWorkspaceSwitch: clearLiveCache,
});

export interface LiveQueryResult<T> {
  readonly data: T | undefined;
  readonly error: unknown;
  /** No data yet and a read is in flight. */
  readonly loading: boolean;
  /** Data is shown and a re-read is in flight. */
  readonly refreshing: boolean;
  /** Reads again now, whatever the age. */
  readonly refresh: () => Promise<void>;
}

export interface LiveQueryOptions {
  readonly ttl?: number;
  /** Topics whose announcement re-reads at once. */
  readonly topics?: readonly LiveTopic[];
  /** Re-read on the heartbeat once older than `ttl` (default true). */
  readonly heartbeat?: boolean;
}

const NONE: LiveSnapshot<never> = EMPTY;

/**
 * Reads `key` with `fetcher` and keeps it current: the held value at once,
 * a re-read when it is older than `ttl` (on mount, on each heartbeat) and at
 * once when one of `topics` is announced. `key: null` reads nothing.
 */
export function useLiveQuery<T>(
  key: string | null, fetcher: () => Promise<T>, options: LiveQueryOptions = {},
): LiveQueryResult<T> {
  const { ttl = LIST_TTL_MS, heartbeat = true } = options;
  const topics = options.topics ?? [];
  const topicsKey = topics.join(",");
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const subscribe = useCallback((listener: () => void) => {
    if (key === null) return () => undefined;
    const entry = entryFor(key);
    entry.listeners.add(listener);
    return () => { entry.listeners.delete(listener); };
  }, [key]);
  const getSnapshot = useCallback(
    () => (key === null ? NONE : entryFor(key).snapshot) as LiveSnapshot<T>,
    [key],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const read = useCallback((force: boolean) => {
    if (key === null) return Promise.resolve();
    return readLive(key, () => fetcherRef.current(), { ttl, force }).then(() => undefined, () => undefined);
  }, [key, ttl]);

  useEffect(() => {
    if (key === null) return;
    void read(false);
    const offs = topics.map(topic => onTopic(topic, () => { void read(true); }));
    if (heartbeat) offs.push(onHeartbeat(() => { void read(false); }));
    return () => { for (const off of offs) off(); };
    // `topics` is read through its joined key so a fresh array each render
    // does not resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, read, heartbeat, topicsKey]);

  const refresh = useCallback(() => read(true), [read]);
  return {
    data: snapshot.data,
    error: snapshot.error,
    loading: snapshot.data === undefined && snapshot.reading,
    refreshing: snapshot.data !== undefined && snapshot.reading,
    refresh,
  };
}

/** For tests: forgets everything, including who is listening. */
export function resetLiveCache(): void {
  generation += 1;
  cache.clear();
}
