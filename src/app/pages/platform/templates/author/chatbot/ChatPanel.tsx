// The LAGDA Chatbot panel: a right-hand side panel on wide screens, a bottom
// sheet on phones.
//
// Opening a fresh conversation plays the orbit loader for three seconds,
// which then shrinks away into the greeting's avatar. Every bot reply is
// preceded by a "thinking" indicator (two seconds the first time, then
// 0.8–1.5s depending on the reply's length) and then streams into its
// bubble quickly. Consecutive messages from one side are grouped, with that
// side's avatar shown once, beside the group's last bubble.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MoreVertical, SendHorizontal, ShieldCheck, Trash2, X, AlertTriangle, Users } from "lucide-react";
import type { UserSummary } from "../../../../../models";
import { UserAvatar } from "../../../../../components/platform/UserAvatar";
import { Z } from "../../../../../utils/z-index";
import { BotAvatar, OrbitLoader } from "./chatbot-ui";
import {
  AZURE, BLUE_DEEP, FIRST_THINK_MS, GF, HAIR, LOADER_MS, LOADER_MS_REDUCED, NAVY, SILVER, streamMsPerChar, thinkingMs,
} from "./chatbot-theme";
import {
  greetingReplies, hasUserTurns, initialState, respond, type BotReply, type Chip, type EngineContext,
  type EngineInput, type SummaryCard, type WritePlan,
} from "./engine";
import { KB } from "./knowledge";
import { hasChatSession, messageId, useChatSession, type ChatMessage } from "./chat-store";

const MORPH_MS = 420;

export interface ChatPanelProps {
  templateId: string;
  variant: "side" | "sheet";
  width?: number;
  user: UserSummary | null;
  ctx: EngineContext;
  reduced: boolean;
  onClose: () => void;
  onWrite: (plan: WritePlan) => void;
}

function toMessages(replies: readonly BotReply[]): ChatMessage[] {
  return replies.map(r => ({ ...r, id: messageId(), from: "bot" as const }));
}

// ── Streaming text ───────────────────────────────────────────────────────────

function StreamingText({ text, animate, onDone }: { text: string; animate: boolean; onDone: () => void }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  const done = useRef(false);
  // One interval for the whole bubble: a few characters per frame.
  useEffect(() => {
    if (!animate) return;
    const per = streamMsPerChar(text.length);
    const tick = Math.max(16, per);
    const step = Math.max(1, Math.round(tick / per));
    const id = setInterval(() => {
      setShown(n => {
        const next = Math.min(text.length, n + step);
        if (next >= text.length) clearInterval(id);
        return next;
      });
    }, tick);
    return () => clearInterval(id);
  }, [animate, text]);
  useEffect(() => {
    if (shown >= text.length && !done.current) { done.current = true; onDone(); }
  }, [shown, text.length, onDone]);
  return (
    <>
      <span aria-hidden={shown < text.length}>{text.slice(0, shown)}</span>
      {shown < text.length && <span aria-hidden style={{ opacity: 0 }}>{text.slice(shown)}</span>}
    </>
  );
}

// ── Summary card ─────────────────────────────────────────────────────────────

function SummaryCardView({ card, chips, onChip, disabled }: {
  card: SummaryCard; chips: Chip[] | undefined; onChip: (c: Chip) => void; disabled: boolean;
}) {
  return (
    <div data-testid="chat-summary-card" style={{
      marginTop: 8, background: "#FFFFFF", border: "1px solid #BFDBFE", borderRadius: 12,
      padding: "12px 12px 10px", boxShadow: "0 4px 14px rgba(0,120,212,0.10)", minWidth: 0,
    }}>
      <p style={{ ...GF, margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>{card.title}</p>
      {card.lines.length > 0 && (
        <dl style={{ margin: "0 0 8px", display: "grid", gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr)", gap: "3px 10px" }}>
          {card.lines.map((l, i) => (
            <div key={i} style={{ display: "contents" }}>
              <dt style={{ ...GF, fontSize: 12, color: SILVER }}>{l.label}</dt>
              <dd style={{ ...GF, margin: 0, fontSize: 12, color: NAVY, fontWeight: 600, overflowWrap: "anywhere" }}>{l.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {card.participants.length > 0 && (
        <div style={{ margin: "4px 0 8px" }}>
          <p style={{ ...GF, margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: BLUE_DEEP, display: "flex", alignItems: "center", gap: 5 }}>
            <Users size={12} aria-hidden /> Participants
          </p>
          <ol aria-label="Participants in routing order" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 3 }}>
            {card.participants.map((p, i) => (
              <li key={i} style={{ ...GF, fontSize: 12, color: NAVY, display: "flex", gap: 6, alignItems: "baseline", minWidth: 0 }}>
                <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "#FFFFFF", background: AZURE, borderRadius: 99, padding: "1px 6px" }}>
                  Step {p.step}
                </span>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  <strong>{p.name}</strong> — {p.label} <span style={{ color: SILVER }}>({p.roleTitle})</span>
                </span>
              </li>
            ))}
          </ol>
          {card.note !== undefined && (
            <p style={{ ...GF, margin: "6px 0 0", fontSize: 11.5, color: SILVER, lineHeight: 1.45 }}>{card.note}</p>
          )}
        </div>
      )}
      <p style={{
        ...GF, margin: "0 0 10px", fontSize: 12, color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A",
        borderRadius: 8, padding: "6px 8px", display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.45,
      }}>
        <AlertTriangle size={13} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{card.warning}</span>
      </p>
      {chips && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {chips.map((c, i) => (
            <button
              key={c.label}
              type="button"
              disabled={disabled}
              onClick={() => onChip(c)}
              className="lagda-cb-focus lagda-cb-chip"
              style={{
                ...GF, animationDelay: `${String(i * 70)}ms`, minHeight: 38, padding: "0 14px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                cursor: disabled ? "default" : "pointer",
                ...(c.action.type === "confirm"
                  ? { background: AZURE, color: "#FFFFFF", border: `1px solid ${AZURE}` }
                  : { background: "#FFFFFF", color: AZURE, border: "1px solid #BFDBFE" }),
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── The panel ────────────────────────────────────────────────────────────────

export function ChatPanel({ templateId, variant, width = 380, user, ctx, reduced, onClose, onWrite }: ChatPanelProps) {
  const titleId = useId();
  const { session, update, clear } = useChatSession(templateId);
  const [phase, setPhase] = useState<"loading" | "morph" | "ready">(session.introduced ? "ready" : "loading");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [animated, setAnimated] = useState<ReadonlySet<string>>(() => new Set());
  const [streamed, setStreamed] = useState<ReadonlySet<string>>(() => new Set());
  const [announce, setAnnounce] = useState("");
  const [dragY, setDragY] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingReply = useRef<{ messages: ChatMessage[]; engine: ReturnType<typeof initialState> } | null>(null);
  const dragStart = useRef<number | null>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  // Unmounting mid-reply (the panel was closed) still keeps the reply —
  // unless the conversation itself was just deleted (saved, left, written).
  useEffect(() => () => {
    for (const t of timers.current) clearTimeout(t);
    const pending = pendingReply.current;
    if (pending && hasChatSession(templateId)) {
      update(prev => ({ ...prev, messages: [...prev.messages, ...pending.messages], engine: pending.engine }));
    }
  }, [update, templateId]);

  const showGreeting = useCallback(() => {
    const msgs = toMessages(greetingReplies(ctxRef.current));
    update(prev => ({ ...prev, introduced: true, messages: [...prev.messages, ...msgs] }));
    setAnimated(prev => new Set([...prev, ...msgs.map(m => m.id)]));
    setAnnounce(msgs.map(m => m.text).join(" "));
  }, [update]);

  // The opening loader, then the morph into the greeting avatar.
  useEffect(() => {
    if (phase !== "loading") return;
    later(() => {
      if (reduced) { setPhase("ready"); showGreeting(); return; }
      setPhase("morph");
      later(() => { setPhase("ready"); showGreeting(); }, MORPH_MS);
    }, reduced ? LOADER_MS_REDUCED : LOADER_MS);
  }, [phase, reduced, later, showGreeting]);

  useEffect(() => {
    if (phase === "ready") inputRef.current?.focus({ preventScroll: true });
  }, [phase]);

  // Keep the newest message in view.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session.messages.length, thinking, streamed]);

  const send = useCallback((input: EngineInput, shownText: string) => {
    if (thinking || phase !== "ready") return;
    const text = shownText.trim();
    if (text === "") return;
    const userMsg: ChatMessage = { id: messageId(), from: "user", text };
    const firstReply = !hasUserTurns(session.messages);
    const result = respond(session.engine, input, ctxRef.current);
    update(prev => ({ ...prev, messages: [...prev.messages, userMsg] }));
    setAnimated(prev => new Set([...prev, userMsg.id]));
    setDraft("");
    if (result.write) {
      onWrite(result.write);
      return;
    }
    const botMsgs = toMessages(result.replies);
    const length = botMsgs.reduce((n, m) => n + m.text.length, 0);
    pendingReply.current = { messages: botMsgs, engine: result.state };
    setThinking(true);
    later(() => {
      pendingReply.current = null;
      update(prev => ({ ...prev, messages: [...prev.messages, ...botMsgs], engine: result.state }));
      setAnimated(prev => new Set([...prev, ...botMsgs.map(m => m.id)]));
      setThinking(false);
      setAnnounce(botMsgs.map(m => m.text).join(" "));
      inputRef.current?.focus({ preventScroll: true });
    }, firstReply ? FIRST_THINK_MS : thinkingMs(length));
  }, [thinking, phase, session.messages, session.engine, update, onWrite, later]);

  const onChip = (c: Chip) => send({ action: c.action }, c.label);

  const clearChat = () => {
    setMenuOpen(false);
    for (const t of timers.current) clearTimeout(t);
    pendingReply.current = null;
    setThinking(false);
    clear();
    const msgs = toMessages(greetingReplies(ctxRef.current));
    update(() => ({ messages: msgs, engine: initialState(), introduced: true }));
    setAnimated(new Set(msgs.map(m => m.id)));
    setStreamed(new Set());
    setAnnounce("Conversation cleared. " + msgs.map(m => m.text).join(" "));
    inputRef.current?.focus();
  };

  // Escape closes; the sheet keeps Tab inside itself.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (menuOpen) { setMenuOpen(false); menuButtonRef.current?.focus(); return; }
      e.stopPropagation();
      onClose();
      return;
    }
    if (variant === "sheet" && e.key === "Tab" && panelRef.current) {
      const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const first = f[0];
      const last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  // Swipe the sheet down to close it.
  const onPointerDown = (e: React.PointerEvent) => {
    if (variant !== "sheet") return;
    if ((e.target as HTMLElement).closest("button")) return;
    dragStart.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > 90) onClose();
    setDragY(0);
  };

  const lastBot = [...session.messages].reverse().find(m => m.from === "bot");
  const groups: ChatMessage[][] = [];
  for (const m of session.messages) {
    const g = groups[groups.length - 1];
    if (g && g[0]!.from === m.from) g.push(m); else groups.push([m]);
  }
  const markStreamed = (id: string) => setStreamed(prev => (prev.has(id) ? prev : new Set([...prev, id])));

  const isSheet = variant === "sheet";
  const panelStyle: React.CSSProperties = isSheet
    ? {
        position: "fixed", left: 0, right: 0, bottom: 0, height: "85dvh", maxHeight: "85dvh", zIndex: Z.modal,
        borderTopLeftRadius: 18, borderTopRightRadius: 18, boxShadow: "0 -12px 40px rgba(7,17,31,0.25)",
        transform: dragY > 0 ? `translateY(${String(dragY)}px)` : undefined, transition: dragStart.current === null ? "transform 200ms ease" : "none",
      }
    : { width, flexShrink: 0, height: "100%", borderLeft: `1px solid ${HAIR}`, boxShadow: "-8px 0 24px rgba(7,17,31,0.06)" };

  const userForAvatar = user ?? { displayName: "You", avatarUrl: undefined };

  return (
    <>
      {isSheet && (
        <div aria-hidden onClick={onClose} className="lagda-cb-fade"
          style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.38)", zIndex: Z.modalScrim }} />
      )}
      <div
        ref={panelRef}
        role={isSheet ? "dialog" : "complementary"}
        aria-modal={isSheet ? true : undefined}
        aria-labelledby={titleId}
        data-testid="lagda-chatbot-panel"
        onKeyDown={onKeyDown}
        className={isSheet ? "lagda-cb-sheet-in" : "lagda-cb-panel-in"}
        style={{ ...panelStyle, background: "#F8FAFC", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}
      >
        {/* Header */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ background: "#FFFFFF", borderBottom: `1px solid ${HAIR}`, flexShrink: 0, touchAction: isSheet ? "none" : undefined }}
        >
          {isSheet && (
            <div aria-hidden style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
              <span style={{ width: 40, height: 4, borderRadius: 99, background: "#CBD5E1" }} />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isSheet ? "8px 12px 10px" : "12px 12px 10px 14px" }}>
            <BotAvatar size={36} />
            <h2 id={titleId} style={{ ...GF, margin: 0, flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: NAVY, lineHeight: 1.25 }}>
              LAGDA Chatbot <span style={{ fontWeight: 500, color: SILVER }}>— writing assistant</span>
            </h2>
            <div style={{ position: "relative" }}>
              <button
                ref={menuButtonRef}
                type="button"
                aria-label="Chat options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(o => !o)}
                className="lagda-cb-focus"
                style={iconButton}
              >
                <MoreVertical size={17} />
              </button>
              {menuOpen && (
                <div role="menu" aria-label="Chat options" style={{
                  position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 2, background: "#FFFFFF",
                  border: `1px solid ${HAIR}`, borderRadius: 10, boxShadow: "0 10px 28px rgba(7,17,31,0.16)", padding: 4, minWidth: 150,
                }}>
                  <button type="button" role="menuitem" onClick={clearChat} className="lagda-cb-focus"
                    ref={el => { el?.focus(); }}
                    style={{ ...GF, display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "none", padding: "9px 10px", borderRadius: 7, fontSize: 13, color: "#B91C1C", cursor: "pointer", textAlign: "left" }}>
                    <Trash2 size={14} aria-hidden /> Clear chat
                  </button>
                </div>
              )}
            </div>
            <button type="button" aria-label="Close LAGDA Chatbot" onClick={onClose} className="lagda-cb-focus" style={iconButton}>
              <X size={18} />
            </button>
          </div>
          <p style={{ ...GF, margin: 0, padding: "0 14px 10px", fontSize: 11.5, color: SILVER, display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.45 }}>
            <ShieldCheck size={13} color={AZURE} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{KB.bot.privacyNote}</span>
          </p>
        </div>

        {/* Body */}
        {phase !== "ready" ? (
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <OrbitLoader caption="Getting your assistant ready" reduced={reduced} morphing={phase === "morph"} testId="chat-loader" />
          </div>
        ) : (
          <div
            ref={listRef}
            role="log"
            aria-live="off"
            aria-label="Conversation with LAGDA Chatbot"
            className="lagda-cb-scroll"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "14px 12px 8px", display: "flex", flexDirection: "column", gap: 12 }}
          >
            {groups.map(group => {
              const from = group[0]!.from;
              const isBot = from === "bot";
              return (
                <div key={group[0]!.id} data-testid={`chat-group-${from}`}
                  style={{ display: "flex", flexDirection: isBot ? "row" : "row-reverse", alignItems: "flex-end", gap: 8, minWidth: 0 }}>
                  <span data-testid={`chat-avatar-${from}`} style={{ flexShrink: 0 }}>
                    {isBot ? <BotAvatar size={30} /> : <UserAvatar user={userForAvatar} size={30} fontSize={11} />}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: isBot ? "flex-start" : "flex-end", gap: 5, minWidth: 0, maxWidth: "calc(100% - 44px)" }}>
                    {group.map((m, i) => {
                      const animate = animated.has(m.id) && !reduced;
                      const streamDone = !animate || !isBot || streamed.has(m.id);
                      const isLast = isBot && m.id === lastBot?.id;
                      const showChips = isLast && streamDone && !thinking && m.chips && m.chips.length > 0 && !m.card;
                      return (
                        <div key={m.id} data-testid={`chat-message-${from}`}
                          className={animate ? (isBot ? "lagda-cb-bot-in" : "lagda-cb-user-in") : undefined}
                          style={{ display: "flex", flexDirection: "column", alignItems: isBot ? "flex-start" : "flex-end", minWidth: 0, maxWidth: "100%", animationDelay: animate && isBot ? `${String(i * 90)}ms` : undefined }}>
                          <div style={{
                            ...GF, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                            padding: "8px 12px", borderRadius: 14, maxWidth: "100%",
                            ...(isBot
                              ? { background: "#FFFFFF", color: NAVY, border: `1px solid ${HAIR}`, borderBottomLeftRadius: i === group.length - 1 ? 4 : 14 }
                              : { background: AZURE, color: "#FFFFFF", borderBottomRightRadius: i === group.length - 1 ? 4 : 14 }),
                          }}>
                            {isBot
                              ? <StreamingText text={m.text} animate={animate} onDone={() => markStreamed(m.id)} />
                              : m.text}
                          </div>
                          {m.card && streamDone && (
                            <SummaryCardView card={m.card} chips={isLast ? m.chips : undefined} onChip={onChip} disabled={thinking} />
                          )}
                          {showChips && (
                            <div role="group" aria-label="Suggested replies" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                              {m.chips!.map((c, ci) => (
                                <button
                                  key={`${c.label}-${String(ci)}`}
                                  type="button"
                                  onClick={() => onChip(c)}
                                  className={`lagda-cb-focus${reduced ? "" : " lagda-cb-chip"}`}
                                  style={{
                                    ...GF, animationDelay: `${String(ci * 55)}ms`, fontSize: 12.5, fontWeight: 600, color: AZURE,
                                    background: "#FFFFFF", border: "1px solid #BFDBFE", borderRadius: 99, padding: "6px 11px",
                                    minHeight: 32, cursor: "pointer", maxWidth: "100%", textAlign: "left", overflowWrap: "anywhere",
                                  }}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {thinking && (
              <div data-testid="chat-thinking" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <BotAvatar size={30} className={reduced ? undefined : "lagda-cb-tilt"} />
                <div className={reduced ? undefined : "lagda-cb-shimmer"} style={{
                  background: "#FFFFFF", border: `1px solid ${HAIR}`, borderRadius: 14, borderBottomLeftRadius: 4,
                  padding: "11px 14px", display: "inline-flex", gap: 5, alignItems: "center",
                }}>
                  <span style={srOnly}>LAGDA Chatbot is typing</span>
                  {[0, 1, 2].map(i => (
                    <span key={i} aria-hidden className={reduced ? undefined : "lagda-cb-dot"}
                      style={{ width: 7, height: 7, borderRadius: "50%", background: i === 1 ? "#38BDF8" : AZURE, animationDelay: `${String(i * 140)}ms`, display: "inline-block" }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div aria-live="polite" role="status" style={srOnly}>{announce}</div>

        {/* Composer */}
        <form
          onSubmit={e => { e.preventDefault(); send({ text: draft }, draft); }}
          style={{ flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))", background: "#FFFFFF", borderTop: `1px solid ${HAIR}` }}
        >
          <label htmlFor={`${titleId}-input`} style={srOnly}>Message LAGDA Chatbot</label>
          <textarea
            id={`${titleId}-input`}
            ref={inputRef}
            rows={1}
            value={draft}
            disabled={phase !== "ready"}
            placeholder={phase === "ready" ? "Tell me what to write…" : "Getting ready…"}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send({ text: draft }, draft);
              }
            }}
            className="lagda-cb-focus"
            style={{
              ...GF, flex: 1, minWidth: 0, resize: "none", maxHeight: 120, minHeight: 40, fontSize: isSheet ? 16 : 13.5,
              lineHeight: 1.45, padding: "9px 12px", borderRadius: 12, border: "1px solid #CBD5E1", color: NAVY,
              background: "#FFFFFF", fieldSizing: "content",
            }}
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={phase !== "ready" || thinking || draft.trim() === ""}
            className="lagda-cb-focus"
            style={{
              width: 40, height: 40, borderRadius: 12, border: "none", flexShrink: 0,
              background: phase !== "ready" || thinking || draft.trim() === "" ? "#CBD5E1" : AZURE, color: "#FFFFFF",
              display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <SendHorizontal size={17} />
          </button>
        </form>
      </div>
    </>
  );
}

const iconButton: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, border: `1px solid ${HAIR}`, background: "#FFFFFF", color: SILVER,
  display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
};

const srOnly: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
};
