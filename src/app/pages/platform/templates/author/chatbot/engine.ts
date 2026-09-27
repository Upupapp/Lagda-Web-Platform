// The LAGDA Chatbot's rule engine.
//
// A pure function from (conversation state, what the person said) to (next
// state, the bot's replies). No network, no model: every reply comes from
// `lagda-chatbot.json` and the rules below.
//
// Matching, in order of trust:
//   exact phrase  >  contained phrase  >  keywords  >  typo-tolerant keywords
// scored 0..1. At or above ACCEPT the best match wins; between CLARIFY and
// ACCEPT, or when two different things score about the same, the bot asks
// which one was meant; below that it says it did not understand. Rude text,
// legal-advice questions and key-mashing are caught before any of that.

import type { PrepParticipantRole } from "../../../../../models/prepare";
import {
  KB, CATEGORY_MATCHABLES, CLAUSE_MATCHABLES, DOCUMENT_MATCHABLES, INTENT_MATCHABLES, KNOWN_WORDS,
  OFF_TOPIC_MATCHABLE, RULE_MATCHABLES, findClause, findDocument, findRule, replyList,
  type KbDocument, type KbSlot, type Matchable,
} from "./knowledge";
import {
  canonicalize, containsPhrase, fillTemplate, fuzzyContainsPhrase, fuzzyEquals, isGibberish, normalize,
  pick, titleCase, tokens,
} from "./text";
import {
  extractAmounts, extractCompanies, extractDates, extractEntities, extractJobTitle, extractNames,
  extractTerm, formatToday,
} from "./entities";
import {
  ROLE_TITLES, ROLE_VERBS, assignSteps, describeParticipant, findParticipant, parseParticipantEdit,
  parseParticipants, relabel, sameName, type Participant, type ParticipantParse,
} from "./participants";
import { initialState } from "./session";

export { initialState, hasUserTurns } from "./session";

export const ACCEPT = 0.6;
export const CLARIFY = 0.4;

// ── Types ────────────────────────────────────────────────────────────────────

export type ChipAction =
  | { type: "doc"; docId: string }
  | { type: "category"; categoryId: string }
  | { type: "clause"; clauseId: string }
  | { type: "rule"; ruleId: string }
  | { type: "intent"; intentId: string }
  | { type: "slot"; value: string }
  | { type: "participant-role"; choice: "first" | "second" | "both" }
  | { type: "participant-skip" }
  | { type: "placement"; placement: "append" | "replace" }
  | { type: "confirm" }
  | { type: "not-yet" };

export interface Chip { label: string; action: ChipAction }

export interface SummaryCard {
  title: string;
  warning: string;
  lines: { label: string; value: string }[];
  participants: { name: string; label: string; role: PrepParticipantRole; roleTitle: string; step: number }[];
  note?: string;
}

export interface BotReply { text: string; chips?: Chip[]; card?: SummaryCard }

export type Stage = "idle" | "participant" | "slots" | "placement" | "confirm";

type PendingParticipant =
  | { kind: "name"; id: string }
  | { kind: "role"; id: string; first: PrepParticipantRole; second: PrepParticipantRole; secondWitness: boolean };

export interface EngineState {
  stage: Stage;
  docId: string | null;
  /** Clause ids to write on their own, when no document was chosen. */
  clauseOnly: string[];
  slots: Record<string, string>;
  pending: string | null;
  skipped: string[];
  clauses: string[];
  rules: string[];
  participants: Participant[];
  pendingParticipant: PendingParticipant | null;
  skippedParticipants: string[];
  parallelSigners: boolean;
  approvalFirst: boolean;
  placement: "append" | "replace" | null;
  nextOrder: number;
  turn: number;
}

export interface EngineContext {
  userName: string;
  /** The page already has text: ask "add below" or "replace" first. */
  documentHasContent: boolean;
  /** Roles can be saved to the template (a workspace is open). */
  canSaveRoles: boolean;
  today?: string;
}

export interface WritePlan {
  docId: string | null;
  title: string;
  clauseOnly: string[];
  slots: Record<string, string>;
  clauses: string[];
  rules: string[];
  participants: Participant[];
  placement: "append" | "replace";
}

export interface EngineResult {
  state: EngineState;
  replies: BotReply[];
  write?: WritePlan;
  /** What was understood, for tests and debugging. */
  meta: { intent: string; confidence: number };
}

export type EngineInput = { text: string; action?: undefined } | { action: ChipAction; text?: undefined };


// ── Small helpers ────────────────────────────────────────────────────────────

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";
const say = (template: string, ctx: EngineContext, extra: Record<string, string> = {}) =>
  fillTemplate(template, { name: firstName(ctx.userName) || "there", ...extra });

const canon = (s: string) => canonicalize(normalize(s), KB.synonyms);

function chipsFor(kind: "starter" | "help" | "categories" | "clauses" | undefined): Chip[] | undefined {
  if (kind === "starter") {
    return KB.starterChips.map(c => {
      if (c.intent !== undefined) return { label: c.label, action: { type: "intent", intentId: c.intent } };
      const doc = KB.documents.find(d => d.title === c.doc || d.id === c.doc);
      return { label: c.label, action: { type: "doc", docId: doc?.id ?? "" } };
    });
  }
  if (kind === "help") {
    return [
      { label: "Browse categories", action: { type: "intent", intentId: "browse" } },
      { label: "Add a clause", action: { type: "intent", intentId: "list-clauses" } },
      { label: "More formal", action: { type: "rule", ruleId: "formal" } },
      { label: "Plain language", action: { type: "rule", ruleId: "plain" } },
    ];
  }
  if (kind === "categories") {
    return KB.categories.map(c => ({ label: c.label, action: { type: "category", categoryId: c.id } }));
  }
  if (kind === "clauses") {
    return KB.clauseChips.map(id => ({ label: findClause(id)?.title ?? id, action: { type: "clause", clauseId: id } }));
  }
  return undefined;
}

const CONFIRM_CHIPS: Chip[] = [
  { label: "Yes, write it", action: { type: "confirm" } },
  { label: "Not yet", action: { type: "not-yet" } },
];

const PLACEMENT_CHIPS: Chip[] = [
  { label: "Add below", action: { type: "placement", placement: "append" } },
  { label: "Replace everything", action: { type: "placement", placement: "replace" } },
];

const AFTER_NOT_YET_CHIPS: Chip[] = [
  { label: "Add a clause", action: { type: "intent", intentId: "list-clauses" } },
  { label: "More formal", action: { type: "rule", ruleId: "formal" } },
  { label: "Plain language", action: { type: "rule", ruleId: "plain" } },
  { label: "Shorter", action: { type: "rule", ruleId: "shorter" } },
  { label: "Use headings", action: { type: "rule", ruleId: "headings" } },
  { label: "Write it now", action: { type: "intent", intentId: "write-now" } },
];

// ── Scoring ──────────────────────────────────────────────────────────────────

interface Scored { m: Matchable; score: number }

export function scoreMatchable(m: Matchable, norm: string, words: readonly string[]): number {
  let phrase = 0;
  for (const p of m.phrases) {
    if (norm === p) return 1;
    const len = p.split(" ").length;
    if (containsPhrase(norm, p)) phrase = Math.max(phrase, len >= 2 ? Math.min(0.95, 0.8 + 0.05 * len) : 0.7);
    else if (len >= 2 && fuzzyContainsPhrase(words, p)) phrase = Math.max(phrase, 0.68);
  }
  let hits = 0;
  for (const k of m.keywords) {
    if (words.includes(k)) hits += 1;
    else if (k.length >= 4 && words.some(w => w.length >= 4 && fuzzyEquals(w, k))) hits += 0.6;
  }
  const keyword = hits === 0 ? 0 : hits < 1 ? 0.42 : Math.min(0.9, 0.5 + 0.15 * (hits - 1));
  const both = phrase > 0 && keyword > 0 ? 0.05 : 0;
  return Math.min(1, Math.max(phrase, keyword) + both);
}

const CLAUSE_SIGNAL = /\b(clause|clauses|add|include|insert|provision|section|block|lines|put)\b/;

function classify(norm: string, state: EngineState): Scored[] {
  const words = tokens(norm);
  const inFlow = state.docId !== null || state.clauseOnly.length > 0;
  const clauseSignal = CLAUSE_SIGNAL.test(norm);
  const all: Scored[] = [];
  for (const m of DOCUMENT_MATCHABLES) {
    let s = scoreMatchable(m, norm, words);
    // Once a document is chosen, switching needs a clear request.
    if (inFlow && m.id !== state.docId && s < 0.75) s *= 0.8;
    if (clauseSignal && !/\b(agreement|contract|form|letter|write|draft|create|make)\b/.test(norm)) s *= 0.8;
    all.push({ m, score: s });
  }
  for (const m of CLAUSE_MATCHABLES) {
    let s = scoreMatchable(m, norm, words);
    if (!inFlow && !clauseSignal) s *= 0.55;
    all.push({ m, score: s });
  }
  for (const m of [...RULE_MATCHABLES, ...CATEGORY_MATCHABLES, ...INTENT_MATCHABLES, OFF_TOPIC_MATCHABLE]) {
    all.push({ m, score: scoreMatchable(m, norm, words) });
  }
  return all.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
}

const SUBSTANTIVE = new Set<Matchable["kind"]>(["document", "clause", "rule", "category"]);

type Decision =
  | { kind: "accept"; pick: Scored }
  | { kind: "clarify"; options: Scored[] }
  | { kind: "none"; offTopic: boolean };

function decide(scored: Scored[]): Decision {
  const substantive = scored.filter(s => SUBSTANTIVE.has(s.m.kind));
  const social = scored.filter(s => s.m.kind === "intent");
  const off = scored.find(s => s.m.kind === "offTopic");
  const top = substantive[0];
  const topSocial = social[0];

  if (topSocial && topSocial.score === 1 && (!top || top.score < 0.9)) return { kind: "accept", pick: topSocial };
  if (top && top.score >= ACCEPT) {
    const rival = substantive.find(s => s !== top && s.m.kind === top.m.kind && s.m.id !== top.m.id);
    if (rival && top.score < 0.9 && top.score - rival.score < 0.05) {
      return { kind: "clarify", options: substantive.filter(s => top.score - s.score < 0.15).slice(0, 3) };
    }
    if (off && off.score > top.score) return { kind: "none", offTopic: true };
    return { kind: "accept", pick: top };
  }
  if (topSocial && topSocial.score >= ACCEPT) return { kind: "accept", pick: topSocial };
  if (off && off.score >= 0.5) return { kind: "none", offTopic: true };
  if (top && top.score >= CLARIFY) {
    return { kind: "clarify", options: substantive.filter(s => s.score >= CLARIFY && top.score - s.score < 0.2).slice(0, 3) };
  }
  return { kind: "none", offTopic: false };
}

function chipForMatch(s: Scored): Chip {
  const m = s.m;
  if (m.kind === "document") return { label: m.label, action: { type: "doc", docId: m.id } };
  if (m.kind === "clause") return { label: `${m.label} clause`, action: { type: "clause", clauseId: m.id } };
  if (m.kind === "rule") return { label: m.label, action: { type: "rule", ruleId: m.id } };
  if (m.kind === "category") return { label: m.label, action: { type: "category", categoryId: m.id } };
  return { label: m.label, action: { type: "intent", intentId: m.id } };
}

// ── Guards: rude, legal advice ───────────────────────────────────────────────

const RUDE = KB.fallbacks.rude.keywords.map(normalize);
const LEGAL = KB.fallbacks.legalAdvice.patterns.map(normalize);

export function isRude(norm: string): boolean {
  return RUDE.some(k => containsPhrase(norm, k));
}

export function isLegalAdviceRequest(norm: string): boolean {
  return LEGAL.some(p => containsPhrase(norm, p));
}

// ── Slots ────────────────────────────────────────────────────────────────────

function docSlots(doc: KbDocument): KbSlot[] {
  return doc.slots;
}

function slotDisplay(slot: KbSlot, value: string): string {
  if (slot.type === "choice") return slot.options?.find(o => o.value === value)?.label ?? value;
  return value;
}

const LEAD_IN = /^(?:it'?s|its|it is|the name is|name is|his name is|her name is|he is|she is|he's|she's|call (?:him|her|it)|named|called|that would be|that's|thats|that is|we are|we're|i am|i'm|my name is|the company is|company is|it will be|it would be|use)\s+/i;

function cleanAnswer(text: string): string {
  return text.trim().replace(LEAD_IN, "")
    // Keep the dot of "Inc." or "Jr."; drop a sentence's full stop.
    .replace(/(?<!\b(?:Inc|Corp|Co|Ltd|Jr|Sr|Bros|Ma|Sta|Sto))[.!]+$/i, "")
    .replace(/^["“']|["”']$/g, "").trim();
}

function asAmount(text: string): string | undefined {
  const found = extractAmounts(text)[0];
  if (found !== undefined) return found;
  const bare = /^\s*(\d[\d,]*(?:\.\d+)?)\s*$/.exec(text);
  if (bare) {
    const n = Number(bare[1]!.replace(/,/g, ""));
    if (Number.isFinite(n)) return `₱${n.toLocaleString("en-US")}`;
  }
  return undefined;
}

/** A value for the pending slot, or undefined when the answer does not fit. */
export function readSlotValue(slot: KbSlot, text: string, ctx: EngineContext): string | undefined {
  const cleaned = cleanAnswer(text);
  if (cleaned === "") return undefined;
  const lower = cleaned.toLowerCase();
  switch (slot.type) {
    case "date":
      if (/^today\b/i.test(lower)) return ctx.today ?? formatToday();
      return extractDates(cleaned)[0];
    case "amount":
      return asAmount(cleaned);
    case "term":
      return extractTerm(cleaned) ?? (/^(indefinite|indefinitely|no end|open[- ]ended)$/i.test(lower) ? "an indefinite period" : undefined);
    case "choice": {
      const n = normalize(cleaned);
      const words = tokens(n);
      const opt = slot.options?.find(o => [o.label, o.value, ...o.keywords].some(k => {
        const kn = normalize(k);
        return containsPhrase(n, kn) || words.some(w => fuzzyEquals(w, kn));
      }));
      return opt?.value;
    }
    case "name": {
      const quoted = /["“']([^"”']{2,60})["”']/.exec(text);
      if (quoted) return quoted[1]!.trim();
      const found = extractNames(cleaned)[0] ?? extractCompanies(cleaned)[0];
      if (found !== undefined) return found;
      break;
    }
    case "company": {
      const found = extractCompanies(cleaned)[0];
      if (found !== undefined) return found;
      break;
    }
    case "job": {
      const found = extractJobTitle(cleaned);
      if (found !== undefined) return found;
      break;
    }
    default:
      break;
  }
  // Free text: accept a short, plausible answer as written.
  if (cleaned.length > 90 || cleaned.split(/\s+/).length > 12) return undefined;
  if (isGibberish(cleaned, { known: KNOWN_WORDS, lenient: true })) return undefined;
  const lowercaseOnly = cleaned === cleaned.toLowerCase();
  return (slot.type === "name" || slot.type === "job") && lowercaseOnly ? titleCase(cleaned) : cleaned;
}

/** Everything the message mentions that fits an empty slot. */
function fillFromText(state: EngineState, doc: KbDocument, text: string, ctx: EngineContext): { label: string; value: string }[] {
  const e = extractEntities(text);
  const filled: { label: string; value: string }[] = [];
  const empty = (s: KbSlot) => state.slots[s.key] === undefined;
  const set = (s: KbSlot, v: string) => { state.slots[s.key] = v; filled.push({ label: s.label, value: slotDisplay(s, v) }); };
  const slots = docSlots(doc);
  const partySlots = slots.filter(s => s.type === "name" || s.type === "company");

  const usedNames = new Set<string>();
  if (e.between) {
    const [a, b] = e.between;
    const first = partySlots.find(s => s.key === "partyA" && empty(s)) ?? partySlots.find(empty);
    if (first) { set(first, a); usedNames.add(a); }
    const second = partySlots.find(s => s.key === "partyB" && empty(s)) ?? partySlots.find(empty);
    if (second) { set(second, b); usedNames.add(b); }
  }
  for (const c of e.companies) {
    if ([...usedNames].some(u => u.includes(c) || c.includes(u))) continue;
    const slot = slots.find(s => s.type === "company" && empty(s));
    if (slot) { set(slot, c); usedNames.add(c); }
  }
  for (const n of e.names) {
    if ([...usedNames].some(u => u.includes(n) || n.includes(u))) continue;
    if (state.participants.some(p => p.name !== null && sameName(p.name, n))) continue; // placed by role below
    const slot = slots.find(s => s.type === "name" && empty(s));
    if (slot) { set(slot, n); usedNames.add(n); }
  }
  const date = e.dates[0];
  if (date !== undefined) {
    const slot = slots.find(s => s.type === "date" && empty(s));
    const value = /^today$/i.test(date) ? (ctx.today ?? formatToday()) : date;
    if (slot) set(slot, value);
    else if (state.slots.effectiveDate === undefined) { state.slots.effectiveDate = value; filled.push({ label: "Effective Date", value }); }
  }
  const amount = e.amounts[0];
  if (amount !== undefined) {
    const slot = slots.find(s => s.type === "amount" && empty(s));
    if (slot) set(slot, amount);
  }
  if (e.jobTitle !== undefined) {
    const slot = slots.find(s => s.type === "job" && empty(s));
    if (slot) set(slot, e.jobTitle);
  }
  if (e.term !== undefined) {
    const slot = slots.find(s => s.type === "term" && empty(s));
    if (slot) set(slot, e.term);
  }
  for (const s of slots.filter(x => x.type === "choice" && empty(x))) {
    const v = readSlotValue(s, text, ctx);
    if (v !== undefined && s.options?.some(o => o.keywords.some(k => containsPhrase(normalize(text), normalize(k))))) set(s, v);
  }
  return filled;
}

/** Signers' names go into the document's party slots. */
function fillFromParticipants(state: EngineState, doc: KbDocument): void {
  const nameSlots = docSlots(doc).filter(s => s.type === "name" && state.slots[s.key] === undefined);
  const signers = state.participants.filter(p => p.role === "signer" && !p.witness && p.name !== null);
  for (const p of signers) {
    if (Object.values(state.slots).some(v => sameName(v, p.name!))) continue;
    const byLabel = nameSlots.find(s => normalize(s.label) === normalize(p.label) && state.slots[s.key] === undefined);
    const slot = byLabel ?? nameSlots.find(s => state.slots[s.key] === undefined);
    if (slot) state.slots[slot.key] = p.name!;
  }
}

// ── Participants ─────────────────────────────────────────────────────────────

function recompute(state: EngineState): void {
  const doc = findDocument(state.docId);
  state.participants = assignSteps(relabel(state.participants, doc), {
    parallelSigners: state.parallelSigners, approvalFirst: state.approvalFirst,
  });
}

function describeList(list: readonly Participant[]): string {
  return list.map(describeParticipant).join("; ");
}

/** Adds what the message said about participants. Returns a reply line. */
function mergeParticipants(state: EngineState, parse: ParticipantParse, text: string): string | null {
  const doc = findDocument(state.docId);
  const added: Participant[] = [];
  for (const m of parse.mentions) {
    if (m.name !== null) {
      const existing = state.participants.find(p => p.name !== null && sameName(p.name, m.name!));
      if (existing) {
        if (existing.role !== m.role || !!existing.witness !== m.witness) {
          state.pendingParticipant = { kind: "role", id: existing.id, first: existing.role, second: m.role, secondWitness: m.witness };
        }
        continue;
      }
    } else if (state.participants.some(p => p.name === null && p.role === m.role && p.givenLabel !== undefined
      && m.givenLabel !== undefined && normalize(p.givenLabel) === normalize(m.givenLabel))) {
      continue;
    }
    const p: Participant = {
      id: `p${String(state.nextOrder + 1)}`,
      name: m.name,
      role: m.role,
      label: "",
      ...(m.givenLabel !== undefined ? { givenLabel: m.givenLabel } : {}),
      ...(m.witness ? { witness: true } : {}),
      order: state.nextOrder,
      step: 1,
    };
    state.nextOrder += 1;
    state.participants.push(p);
    added.push(p);
  }
  if (parse.bothParties) {
    state.parallelSigners = true;
    const between = extractEntities(text).between;
    const partyLabels = doc?.parties.slice(0, 2) ?? ["First Party", "Second Party"];
    const signers = state.participants.filter(p => p.role === "signer" && !p.witness);
    partyLabels.forEach((label, i) => {
      if (signers.length > i) return;
      const p: Participant = {
        id: `p${String(state.nextOrder + 1)}`, name: between?.[i] ?? null, role: "signer", label: "",
        givenLabel: label, order: state.nextOrder, step: 1,
      };
      state.nextOrder += 1;
      state.participants.push(p);
      added.push(p);
    });
  }
  if (parse.parallel && state.participants.filter(p => p.role === "signer").length > 1) state.parallelSigners = true;
  if (parse.approvalFirst) state.approvalFirst = true;
  if (parse.approvalLast) state.approvalFirst = false;
  recompute(state);
  if (added.length === 0) return null;
  const fresh = state.participants.filter(p => added.some(a => a.id === p.id));
  const count = fresh.length === 1 ? "one participant" : `${String(fresh.length)} participants`;
  return fillTemplate(pick(KB.participants.replies.captured, state.turn), { count, list: describeList(fresh) });
}

function applyParticipantEdit(state: EngineState, text: string): string | null {
  const edit = parseParticipantEdit(text);
  if (!edit) return null;
  const listText = () => state.participants.map(p => p.name ?? p.label).join(", ") || "none yet";
  if (edit.kind === "add") {
    const existing = state.participants.find(p => p.name !== null && sameName(p.name, edit.name));
    if (existing) {
      existing.role = edit.role;
      existing.witness = edit.witness || undefined;
      delete existing.givenLabel;
      recompute(state);
      const after = state.participants.find(p => p.id === existing.id)!;
      return fillTemplate(pick(KB.participants.replies.changed, state.turn), { name: edit.name, roleLabel: after.label });
    }
    const p: Participant = {
      id: `p${String(state.nextOrder + 1)}`, name: edit.name, role: edit.role, label: "",
      ...(edit.witness ? { witness: true } : {}), order: state.nextOrder, step: 1,
    };
    state.nextOrder += 1;
    state.participants.push(p);
    recompute(state);
    const after = state.participants.find(x => x.id === p.id)!;
    return fillTemplate(pick(KB.participants.replies.added, state.turn), { name: edit.name, roleLabel: after.label });
  }
  const target = findParticipant(state.participants, edit.target);
  if (!target) {
    // "remove the confidentiality clause" is not about a person.
    if (edit.kind === "remove" && state.participants.length === 0) return null;
    return fillTemplate(pick(KB.participants.replies.notFound, state.turn), { name: edit.target, list: listText() });
  }
  if (edit.kind === "remove") {
    state.participants = state.participants.filter(p => p.id !== target.id);
    // Their name leaves the document's party slots too.
    if (target.name !== null) {
      for (const [k, v] of Object.entries(state.slots)) if (sameName(v, target.name)) delete state.slots[k];
    }
    recompute(state);
    return fillTemplate(pick(KB.participants.replies.removed, state.turn), { name: target.name ?? target.label });
  }
  target.role = edit.role;
  target.witness = edit.witness || undefined;
  delete target.givenLabel;
  recompute(state);
  const after = state.participants.find(p => p.id === target.id)!;
  return fillTemplate(pick(KB.participants.replies.changed, state.turn), { name: target.name ?? target.label, roleLabel: after.label });
}

// ── Flow: what to ask next ───────────────────────────────────────────────────

function currentTitle(state: EngineState): string {
  const doc = findDocument(state.docId);
  if (doc) return doc.title;
  const titles = state.clauseOnly.map(id => findClause(id)?.title ?? id);
  if (titles.length === 1) return `${titles[0]!} clause`;
  return `Clauses: ${titles.join(", ")}`;
}

function buildCard(state: EngineState, ctx: EngineContext): SummaryCard {
  const doc = findDocument(state.docId);
  const lines: { label: string; value: string }[] = [];
  if (doc) {
    for (const s of docSlots(doc)) {
      const v = state.slots[s.key];
      if (v !== undefined) lines.push({ label: s.label, value: slotDisplay(s, v) });
      else if (s.ask !== false) lines.push({ label: s.label, value: "left blank" });
    }
    if (state.slots.effectiveDate !== undefined) lines.push({ label: "Effective Date", value: state.slots.effectiveDate });
  }
  if (state.clauses.length > 0) {
    lines.push({ label: "Extra clauses", value: state.clauses.map(id => findClause(id)?.title ?? id).join(", ") });
  }
  if (state.rules.length > 0) {
    lines.push({ label: "Style", value: state.rules.map(id => findRule(id)?.label ?? id).join(", ") });
  }
  if (state.placement !== null) {
    lines.push({ label: "Placement", value: state.placement === "append" ? "Add below the existing content" : "Replace everything" });
  }
  const participants = [...state.participants]
    .sort((a, b) => a.step - b.step || a.order - b.order)
    .map(p => ({ name: p.name ?? "(name left blank)", label: p.label, role: p.role, roleTitle: p.witness ? "Witness" : ROLE_TITLES[p.role], step: p.step }));
  const note = participants.length > 0 && doc
    ? (ctx.canSaveRoles ? KB.participants.replies.rolesNote : KB.participants.replies.rolesNoteOffline)
    : undefined;
  return {
    title: fillTemplate(String(KB.replies.confirmTitle), { title: currentTitle(state) }),
    warning: String(KB.replies.confirmWarning),
    lines,
    participants,
    ...(note !== undefined ? { note } : {}),
  };
}

function slotChips(slot: KbSlot): Chip[] {
  const chips: Chip[] = [];
  for (const o of slot.options ?? []) chips.push({ label: o.label, action: { type: "slot", value: o.value } });
  for (const c of slot.chips ?? []) {
    if (c === "Skip") continue;
    chips.push({ label: c, action: { type: "slot", value: c === "Today" ? "__today__" : c } });
  }
  chips.push({ label: "Skip", action: { type: "slot", value: "__skip__" } });
  return chips;
}

/** Moves the conversation on: the next question, or the summary card. */
function advance(state: EngineState, ctx: EngineContext): BotReply {
  const doc = findDocument(state.docId);
  if (doc) {
    fillFromParticipants(state, doc);
    // A role that needs a decision comes first.
    if (state.pendingParticipant?.kind === "role") {
      const p = state.participants.find(x => x.id === state.pendingParticipant!.id);
      if (p) {
        state.stage = "participant";
        const { first, second } = state.pendingParticipant;
        return {
          text: fillTemplate(pick(KB.participants.replies.askRole, state.turn), {
            name: p.name ?? p.label, first: ROLE_VERBS[first], second: ROLE_VERBS[second],
          }),
          chips: [
            { label: `${titleCase(ROLE_VERBS[first])} only`, action: { type: "participant-role", choice: "first" } },
            { label: `${titleCase(ROLE_VERBS[second])} only`, action: { type: "participant-role", choice: "second" } },
            { label: "Both", action: { type: "participant-role", choice: "both" } },
          ],
        };
      }
      state.pendingParticipant = null;
    }
    const unnamed = state.participants.find(p => p.name === null && !state.skippedParticipants.includes(p.id));
    if (unnamed) {
      state.stage = "participant";
      state.pendingParticipant = { kind: "name", id: unnamed.id };
      return {
        text: fillTemplate(pick(KB.participants.replies.askName, state.turn), { label: unnamed.label.toLowerCase() }),
        chips: [{ label: "Skip", action: { type: "participant-skip" } }],
      };
    }
    state.pendingParticipant = null;
    const next = docSlots(doc).find(s => s.ask !== false && state.slots[s.key] === undefined && !state.skipped.includes(s.key));
    if (next) {
      state.stage = "slots";
      state.pending = next.key;
      return { text: next.question, chips: slotChips(next) };
    }
  }
  state.pending = null;
  if (ctx.documentHasContent && state.placement === null) {
    state.stage = "placement";
    return { text: String(KB.replies.placementQuestion), chips: PLACEMENT_CHIPS };
  }
  state.stage = "confirm";
  const card = buildCard(state, ctx);
  return { text: card.title, card, chips: CONFIRM_CHIPS };
}

function reset(prev: EngineState): EngineState {
  return { ...initialState(), turn: prev.turn };
}

function clone(s: EngineState): EngineState {
  return {
    ...s,
    clauseOnly: [...s.clauseOnly], slots: { ...s.slots }, skipped: [...s.skipped], clauses: [...s.clauses],
    rules: [...s.rules], participants: s.participants.map(p => ({ ...p })), skippedParticipants: [...s.skippedParticipants],
  };
}

function plan(state: EngineState): WritePlan {
  return {
    docId: state.docId,
    title: currentTitle(state),
    clauseOnly: [...state.clauseOnly],
    slots: { ...state.slots },
    clauses: [...state.clauses],
    rules: [...state.rules],
    participants: state.participants.map(p => ({ ...p })),
    placement: state.placement ?? "replace",
  };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

function chooseDocument(state: EngineState, docId: string, text: string, ctx: EngineContext, parse: ParticipantParse | null): BotReply[] {
  const doc = findDocument(docId);
  if (!doc) return [{ text: pick(KB.fallbacks.noMatch, state.turn), chips: chipsFor("starter") }];
  if (state.docId !== docId) {
    state.docId = docId;
    state.slots = {};
    state.skipped = [];
    state.clauses = [];
    state.clauseOnly = [];
    state.placement = null;
  }
  // Participants are merged once the document is known, so their role
  // labels come from it ("Employee", "HR Approver").
  const captured = parse && (parse.mentions.length > 0 || parse.bothParties) ? mergeParticipants(state, parse, text) : null;
  const extra = captured !== null ? [captured] : [];
  recompute(state);
  const filled = text === "" ? [] : fillFromText(state, doc, text, ctx);
  const intro = fillTemplate(pick(replyList("docChosen"), state.turn), { title: doc.title });
  const lines = [intro];
  if (filled.length > 0) {
    lines.push(fillTemplate(pick(replyList("captured"), state.turn), {
      summary: filled.map(f => `${f.label.toLowerCase()} — ${f.value}`).join(", "),
    }));
  }
  lines.push(...extra);
  return [{ text: lines.join(" ") }, advance(state, ctx)];
}

function addClause(state: EngineState, clauseId: string, ctx: EngineContext): BotReply[] {
  const clause = findClause(clauseId);
  if (!clause) return [{ text: pick(KB.fallbacks.noMatch, state.turn) }];
  const doc = findDocument(state.docId);
  if (doc) {
    if (!doc.clauses.includes(clauseId) && !state.clauses.includes(clauseId)) state.clauses.push(clauseId);
    const line = fillTemplate(pick(replyList("clauseAdded"), state.turn), { clause: clause.title });
    return [{ text: line }, advance(state, ctx)];
  }
  if (!state.clauseOnly.includes(clauseId)) state.clauseOnly.push(clauseId);
  const line = fillTemplate(pick(replyList("clauseOnly"), state.turn), { clause: clause.title.toLowerCase() });
  return [{ text: line }, advance(state, ctx)];
}

function applyRule(state: EngineState, ruleId: string, ctx: EngineContext): BotReply[] {
  const rule = findRule(ruleId);
  if (!rule) return [{ text: pick(KB.fallbacks.noMatch, state.turn) }];
  const exclusive: Record<string, string> = { formal: "plain", plain: "formal" };
  state.rules = state.rules.filter(r => r !== exclusive[ruleId]);
  if (!state.rules.includes(ruleId)) state.rules.push(ruleId);
  if (state.docId !== null || state.clauseOnly.length > 0) return [{ text: rule.reply }, advance(state, ctx)];
  return [{ text: `${rule.reply} Which document should I write?`, chips: chipsFor("starter") }];
}

function listCategory(state: EngineState, categoryId: string): BotReply[] {
  const cat = KB.categories.find(c => c.id === categoryId);
  if (!cat) return [{ text: pick(KB.fallbacks.noMatch, state.turn) }];
  const docs = KB.documents.filter(d => d.category === cat.label);
  return [{
    text: fillTemplate(pick(replyList("category"), state.turn), { category: cat.label }),
    chips: docs.map(d => ({ label: d.title, action: { type: "doc", docId: d.id } })),
  }];
}

function handleIntent(state: EngineState, intentId: string, ctx: EngineContext): { state: EngineState; replies: BotReply[]; write?: WritePlan } {
  const intent = KB.intents.find(i => i.id === intentId);
  const inFlow = state.docId !== null || state.clauseOnly.length > 0;
  switch (intentId) {
    case "start-over": {
      const fresh = reset(state);
      return { state: fresh, replies: [{ text: say(pick(intent!.replies, state.turn), ctx), chips: chipsFor("starter") }] };
    }
    case "write-now": {
      if (!inFlow) return { state, replies: [{ text: "Sure — what should I write? Name a document or pick one below.", chips: chipsFor("starter") }] };
      const doc = findDocument(state.docId);
      if (doc) for (const s of docSlots(doc)) if (state.slots[s.key] === undefined && !state.skipped.includes(s.key)) state.skipped.push(s.key);
      state.skippedParticipants = state.participants.filter(p => p.name === null).map(p => p.id);
      return { state, replies: [advance(state, ctx)] };
    }
    case "affirm":
    case "deny":
    case "skip":
      if (inFlow) return { state, replies: [{ text: say(pick(intent!.replies, state.turn), ctx) }, advance(state, ctx)] };
      return { state, replies: [{ text: say(pick(KB.fallbacks.noMatch, state.turn), ctx), chips: chipsFor("starter") }] };
    default: {
      if (!intent) return { state, replies: [{ text: pick(KB.fallbacks.noMatch, state.turn) }] };
      const reply: BotReply = { text: say(pick(intent.replies, state.turn), ctx) };
      const chips = chipsFor(intent.chips);
      if (chips) reply.chips = chips;
      const replies = [reply];
      // Mid-flow small talk returns to the open question.
      if (inFlow && ["greeting", "thanks", "identity", "privacy", "help"].includes(intentId)) replies.push(advance(state, ctx));
      return { state, replies };
    }
  }
}

function answerParticipant(state: EngineState, text: string | null, action: ChipAction | null): BotReply | null {
  const pending = state.pendingParticipant;
  if (!pending) return null;
  const p = state.participants.find(x => x.id === pending.id);
  if (!p) { state.pendingParticipant = null; return null; }

  if (pending.kind === "name") {
    if (action?.type === "participant-skip" || (text !== null && /^(skip|leave (it )?blank|later|not sure|i don'?t know|none|n\/?a)\b/i.test(text.trim()))) {
      state.skippedParticipants.push(p.id);
      state.pendingParticipant = null;
      return { text: "No problem — I'll leave the name blank." };
    }
    if (text === null) return null;
    const quoted = /["“']([^"”']{2,60})["”']/.exec(text);
    const found = quoted?.[1] ?? extractNames(cleanAnswer(text))[0];
    const cleaned = cleanAnswer(text);
    const value = found ?? (cleaned.split(/\s+/).length <= 6 && !isGibberish(cleaned, { known: KNOWN_WORDS, lenient: true })
      ? (cleaned === cleaned.toLowerCase() ? titleCase(cleaned) : cleaned) : undefined);
    if (value === undefined || value === "") {
      return { text: `Sorry, I didn't catch a name. What is the ${p.label.toLowerCase()}'s name? (Or say “skip”.)`, chips: [{ label: "Skip", action: { type: "participant-skip" } }] };
    }
    p.name = value;
    state.pendingParticipant = null;
    return { text: `Got it — ${value} (${p.label}).` };
  }

  // A role decision: "Should Maria approve, or also sign?"
  let choice: "first" | "second" | "both" | null = action?.type === "participant-role" ? action.choice : null;
  if (choice === null && text !== null) {
    const n = normalize(text);
    if (/\b(both|also|two|each)\b/.test(n)) choice = "both";
    else if (containsPhrase(n, ROLE_VERBS[pending.second]) || tokens(n).some(w => fuzzyEquals(w, ROLE_VERBS[pending.second]))) choice = "second";
    else if (containsPhrase(n, ROLE_VERBS[pending.first]) || /\b(only|just|keep)\b/.test(n)) choice = "first";
  }
  if (choice === null) return null;
  state.pendingParticipant = null;
  if (choice === "second") {
    p.role = pending.second;
    p.witness = pending.secondWitness || undefined;
    delete p.givenLabel;
  } else if (choice === "both") {
    state.participants.push({
      id: `p${String(state.nextOrder + 1)}`, name: p.name, role: pending.second, label: "",
      ...(pending.secondWitness ? { witness: true } : {}), order: state.nextOrder, step: 1,
    });
    state.nextOrder += 1;
  }
  recompute(state);
  const roles = state.participants.filter(x => x.name !== null && p.name !== null && sameName(x.name, p.name)).map(x => x.label);
  return { text: `Okay — ${p.name ?? p.label}: ${roles.join(" and ")}.` };
}

function answerSlot(state: EngineState, text: string, ctx: EngineContext, norm: string): BotReply[] | null {
  const doc = findDocument(state.docId);
  const slot = doc?.slots.find(s => s.key === state.pending);
  if (!doc || !slot) return null;
  const words = tokens(norm);
  const skip = KB.intents.find(i => i.id === "skip")!;
  if (skip.examples.some(e => norm === normalize(e)) || (words.length <= 3 && skip.keywords.some(k => words.includes(k)))) {
    state.skipped.push(slot.key);
    return [{ text: pick(skip.replies, state.turn) }, advance(state, ctx)];
  }
  // A clear command ("make it formal", "add a clause", another document)
  // is handled as one; the question is asked again afterwards.
  const top = decide(classify(norm, state));
  if (top.kind === "accept" && top.pick.score >= 0.75 && top.pick.m.kind !== "intent" && !(top.pick.m.kind === "document" && top.pick.m.id === state.docId)) return null;
  if (top.kind === "accept" && top.pick.m.kind === "intent" && ["start-over", "help", "write-now", "browse", "list-clauses", "privacy", "identity"].includes(top.pick.m.id) && top.pick.score >= 0.7) return null;

  const value = readSlotValue(slot, text, ctx);
  if (value === undefined) {
    if (isGibberish(text, { known: KNOWN_WORDS, lenient: true })) {
      return [{ text: pick(KB.fallbacks.gibberish, state.turn) + ` ${slot.question}`, chips: slotChips(slot) }];
    }
    return [{ text: fillTemplate(pick(replyList("slotRetry"), state.turn), { question: slot.question }), chips: slotChips(slot) }];
  }
  state.slots[slot.key] = value;
  const others = fillFromText(state, doc, text, ctx).filter(f => f.label !== slot.label);
  const parts = [`${slot.label}: ${slotDisplay(slot, value)}`, ...others.map(o => `${o.label}: ${o.value}`)];
  return [{ text: fillTemplate(pick(replyList("captured"), state.turn), { summary: parts.join(", ") }) }, advance(state, ctx)];
}

function parsePlacement(norm: string): "append" | "replace" | null {
  if (/\b(replace|overwrite|everything|start fresh|clear|wipe|instead)\b/.test(norm)) return "replace";
  if (/\b(below|append|add|after|bottom|end|keep|under|underneath)\b/.test(norm)) return "append";
  return null;
}

function fallback(state: EngineState, list: readonly string[], ctx: EngineContext, chips?: Chip[]): BotReply {
  const r: BotReply = { text: say(pick(list, state.turn), ctx) };
  if (chips) r.chips = chips;
  return r;
}

/** Strips the participants' names so "Santos" cannot fuzzy-match "sales". */
function withoutNames(norm: string, names: readonly string[]): string {
  let out = ` ${norm} `;
  for (const n of names) out = out.split(` ${normalize(n)} `).join(" ");
  return out.replace(/\s+/g, " ").trim();
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function greetingReplies(ctx: EngineContext): BotReply[] {
  return [{ text: say(pick(KB.bot.greeting, 0), ctx), chips: chipsFor("starter") }];
}

export function respond(prev: EngineState, input: EngineInput, ctx: EngineContext): EngineResult {
  const state = clone(prev);
  state.turn += 1;
  const done = (replies: BotReply[], intent: string, confidence = 1, write?: WritePlan): EngineResult =>
    ({ state, replies, meta: { intent, confidence }, ...(write ? { write } : {}) });

  // ── Chips ──
  if (input.action !== undefined) {
    const a = input.action;
    switch (a.type) {
      case "doc": return done(chooseDocument(state, a.docId, "", ctx, null), `doc:${a.docId}`);
      case "category": return done(listCategory(state, a.categoryId), `category:${a.categoryId}`);
      case "clause": return done(addClause(state, a.clauseId, ctx), `clause:${a.clauseId}`);
      case "rule": return done(applyRule(state, a.ruleId, ctx), `rule:${a.ruleId}`);
      case "intent": {
        const r = handleIntent(state, a.intentId, ctx);
        return { state: r.state, replies: r.replies, meta: { intent: a.intentId, confidence: 1 } };
      }
      case "slot": {
        const doc = findDocument(state.docId);
        const slot = doc?.slots.find(s => s.key === state.pending);
        if (!slot) return done([advance(state, ctx)], "slot");
        if (a.value === "__skip__") {
          state.skipped.push(slot.key);
          return done([{ text: pick(KB.intents.find(i => i.id === "skip")!.replies, state.turn) }, advance(state, ctx)], "slot:skip");
        }
        const value = a.value === "__today__" ? (ctx.today ?? formatToday()) : a.value;
        state.slots[slot.key] = value;
        return done([{ text: fillTemplate(pick(replyList("captured"), state.turn), { summary: `${slot.label}: ${slotDisplay(slot, value)}` }) }, advance(state, ctx)], "slot");
      }
      case "participant-role":
      case "participant-skip": {
        const r = answerParticipant(state, null, a);
        return done(r ? [r, advance(state, ctx)] : [advance(state, ctx)], "participant");
      }
      case "placement":
        state.placement = a.placement;
        return done([advance(state, ctx)], `placement:${a.placement}`);
      case "confirm": {
        if (state.docId === null && state.clauseOnly.length === 0) {
          return done([{ text: "What should I write? Name a document first.", chips: chipsFor("starter") }], "confirm:empty");
        }
        const write = plan(state);
        return { state: reset(state), replies: [], write, meta: { intent: "confirm", confidence: 1 } };
      }
      case "not-yet":
        state.stage = state.docId !== null || state.clauseOnly.length > 0 ? "confirm" : "idle";
        return done([{ text: pick(replyList("notYet"), state.turn), chips: AFTER_NOT_YET_CHIPS }], "not-yet");
    }
  }

  // ── Text ──
  const text = (input.text ?? "").trim();
  if (text === "") return done([fallback(state, KB.fallbacks.empty, ctx, chipsFor("starter"))], "empty");
  const norm = canon(text);

  if (isRude(norm)) return done([fallback(state, KB.fallbacks.rude.replies, ctx, chipsFor("starter"))], "rude");
  if (isLegalAdviceRequest(norm)) {
    const inFlow = state.docId !== null || state.clauseOnly.length > 0;
    const chips = inFlow ? [{ label: "Continue the draft", action: { type: "intent", intentId: "write-now" } } as Chip] : chipsFor("starter");
    return done([fallback(state, KB.fallbacks.legalAdvice.replies, ctx, chips)], "legal-advice");
  }

  // Answers to the question that is open.
  if (state.stage === "participant" && state.pendingParticipant) {
    const r = answerParticipant(state, text, null);
    if (r) return done([r, advance(state, ctx)], "participant");
  }
  if (state.stage === "slots" && state.pending !== null) {
    const r = answerSlot(state, text, ctx, norm);
    if (r) return done(r, `slot:${state.pending ?? "done"}`);
  }
  if (state.stage === "placement") {
    const p = parsePlacement(norm);
    if (p) { state.placement = p; return done([advance(state, ctx)], `placement:${p}`); }
  }
  if (state.stage === "confirm") {
    const words = tokens(norm);
    const affirm = KB.intents.find(i => i.id === "affirm")!;
    const deny = KB.intents.find(i => i.id === "deny")!;
    const isYes = words.length <= 5 && (affirm.examples.some(e => norm === normalize(e)) || /\b(yes|yeah|yep|sure|ok|okay|go ahead|write it|do it|proceed|sige|oo)\b/.test(norm)) && !/\b(not|no|wait)\b/.test(norm);
    const isNo = words.length <= 4 && (deny.examples.some(e => norm === normalize(e)) || /\b(no|nope|not yet|wait|hold on|later)\b/.test(norm));
    if (isYes) {
      const write = plan(state);
      return { state: reset(state), replies: [], write, meta: { intent: "confirm", confidence: 1 } };
    }
    if (isNo) {
      return done([{ text: pick(replyList("notYet"), state.turn), chips: AFTER_NOT_YET_CHIPS }], "not-yet");
    }
  }

  if (isGibberish(text, { known: KNOWN_WORDS })) {
    return done([fallback(state, KB.fallbacks.gibberish, ctx, chipsFor("starter"))], "gibberish");
  }

  // "change Maria to reviewer", "remove Juan", "add Pedro as signer".
  const edited = applyParticipantEdit(state, text);
  if (edited !== null) {
    const inFlow = state.docId !== null || state.clauseOnly.length > 0;
    return done(inFlow ? [{ text: edited }, advance(state, ctx)] : [{ text: `${edited} Which document is this for?`, chips: chipsFor("starter") }], "participant-edit");
  }

  const parse = parseParticipants(text);
  const matchText = withoutNames(norm, parse.consumed);
  const decision = decide(classify(matchText, state));
  if (decision.kind === "accept" && decision.pick.m.kind === "document") {
    return done(chooseDocument(state, decision.pick.m.id, text, ctx, parse), `doc:${decision.pick.m.id}`, decision.pick.score);
  }
  const captured = parse.mentions.length > 0 || parse.bothParties ? mergeParticipants(state, parse, text) : null;
  const extra = captured !== null ? [captured] : [];

  if (decision.kind === "accept") {
    const m = decision.pick.m;
    const confidence = decision.pick.score;
    switch (m.kind) {
      case "clause": return done([...extra.map(t => ({ text: t })), ...addClause(state, m.id, ctx)], `clause:${m.id}`, confidence);
      case "rule": return done([...extra.map(t => ({ text: t })), ...applyRule(state, m.id, ctx)], `rule:${m.id}`, confidence);
      case "category": return done(listCategory(state, m.id), `category:${m.id}`, confidence);
      case "intent": {
        if (captured !== null && ["affirm", "deny", "skip", "greeting", "thanks"].includes(m.id)) break;
        const r = handleIntent(state, m.id, ctx);
        return { state: r.state, replies: [...extra.map(t => ({ text: t })), ...r.replies], meta: { intent: m.id, confidence } };
      }
      default: break;
    }
  }

  // Participants on their own still move a document forward — including a
  // person named again in a second role, which needs a decision.
  const conflict = state.pendingParticipant?.kind === "role";
  if (captured !== null || conflict) {
    if (state.docId !== null) {
      const doc = findDocument(state.docId)!;
      fillFromText(state, doc, text, ctx);
      return done([...(captured !== null ? [{ text: captured }] : []), advance(state, ctx)], "participants");
    }
    return done([{ text: `${captured ?? ""} Which document should they receive?`.trim(), chips: chipsFor("starter") }], "participants");
  }

  // Details mid-flow: "the salary is 50,000", "start on March 1".
  if (state.docId !== null && decision.kind === "none") {
    const doc = findDocument(state.docId)!;
    const filled = fillFromText(state, doc, text, ctx);
    if (filled.length > 0) {
      return done([{ text: fillTemplate(pick(replyList("captured"), state.turn), { summary: filled.map(f => `${f.label}: ${f.value}`).join(", ") }) }, advance(state, ctx)], "details");
    }
  }

  if (decision.kind === "clarify") {
    return done([{ text: pick(KB.fallbacks.clarify, state.turn), chips: decision.options.map(chipForMatch) }], "clarify", decision.options[0]?.score ?? 0);
  }
  if (decision.kind === "none" && decision.offTopic) {
    return done([fallback(state, KB.fallbacks.offTopic.replies, ctx, chipsFor("starter"))], "off-topic");
  }
  return done([fallback(state, KB.fallbacks.noMatch, ctx, chipsFor("starter"))], "no-match", 0);
}

