// Where a LAGDA Chatbot conversation lives while the author page is open.
//
// IN MEMORY, keyed by template id — deliberately not in browser storage.
// The repository's lint rule forbids direct localStorage/sessionStorage for
// anything but approved UI preferences ("private provider data must never be
// persisted"), and a chat holds exactly that kind of data: party names,
// salaries, addresses. So the conversation survives closing and reopening
// the panel and moving around inside the app, but not a page refresh — which
// is why the page asks before unloading while a chat exists.
//
// The one thing that IS stored is a UI preference: whether this browser has
// already seen the one-time greeting bubble (a boolean, no content).

import { useCallback, useSyncExternalStore } from "react";
import type { BotReply, EngineState } from "./engine";
import { initialState } from "./session";

export interface ChatMessage extends BotReply {
  id: string;
  from: "bot" | "user";
}

export interface ChatSession {
  messages: ChatMessage[];
  engine: EngineState;
  /** The opening loader has played for this conversation. */
  introduced: boolean;
}

const EMPTY: ChatSession = { messages: [], engine: initialState(), introduced: false };

const sessions = new Map<string, ChatSession>();
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function getChatSession(templateId: string): ChatSession {
  return sessions.get(templateId) ?? EMPTY;
}

export function hasChatSession(templateId: string): boolean {
  return sessions.has(templateId);
}

export function setChatSession(templateId: string, next: ChatSession): void {
  sessions.set(templateId, next);
  emit();
}

export function clearChatSession(templateId: string): void {
  if (!sessions.has(templateId)) return;
  sessions.delete(templateId);
  emit();
}

/** For tests: forget every conversation. */
export function resetChatStore(): void {
  sessions.clear();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useChatSession(templateId: string): {
  session: ChatSession;
  update: (fn: (prev: ChatSession) => ChatSession) => void;
  clear: () => void;
} {
  const session = useSyncExternalStore(subscribe, () => getChatSession(templateId), () => EMPTY);
  const update = useCallback((fn: (prev: ChatSession) => ChatSession) => {
    setChatSession(templateId, fn(getChatSession(templateId)));
  }, [templateId]);
  const clear = useCallback(() => clearChatSession(templateId), [templateId]);
  return { session, update, clear };
}

let counter = 0;
export function messageId(): string {
  counter += 1;
  return `m${String(Date.now())}-${String(counter)}`;
}

// ── One-time greeting (a UI preference) ──────────────────────────────────────

const GREETED_KEY = "lagda.chatbot.greeted.v1";

export function hasSeenGreeting(): boolean {
  try {
    return window.localStorage.getItem(GREETED_KEY) === "1";
  } catch {
    // Storage blocked: behave as "seen" so the bubble cannot nag on every visit.
    return true;
  }
}

export function markGreetingSeen(): void {
  try {
    window.localStorage.setItem(GREETED_KEY, "1");
  } catch {
    // Ignored — per-visit only.
  }
}
