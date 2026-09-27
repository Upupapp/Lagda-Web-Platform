// The small, always-loaded part of the LAGDA Chatbot's state: a fresh engine
// state and "has the person said anything yet". Kept apart from the engine so
// the author page can hold and check a conversation without loading the
// knowledge base, which only arrives when the chat is opened.

import type { EngineState } from "./engine";

export function initialState(): EngineState {
  return {
    stage: "idle", docId: null, clauseOnly: [], slots: {}, pending: null, skipped: [], clauses: [], rules: [],
    participants: [], pendingParticipant: null, skippedParticipants: [], parallelSigners: false, approvalFirst: false,
    placement: null, nextOrder: 0, turn: 0,
  };
}

/** True once the person has said anything — the point a chat is worth keeping. */
export function hasUserTurns(messages: readonly { from: "bot" | "user" }[]): boolean {
  return messages.some(m => m.from === "user");
}
