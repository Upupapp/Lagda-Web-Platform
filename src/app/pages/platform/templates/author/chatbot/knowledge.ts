// The LAGDA Chatbot's knowledge base, typed.
//
// Everything the assistant knows lives in `assets/chatbot/lagda-chatbot.json`:
// intents, the document types (one per ready-made title, referenced by title
// and id — their wording is read from the ready-made library at draft time,
// never copied here), slot questions, the clause library, tone rules,
// participant phrases and every fallback reply. This file only gives that
// JSON a shape and precomputes the normalised phrases the matcher compares
// against, once, at module load.

import rawKb from "../../../../../../assets/chatbot/lagda-chatbot.json";
import type { PrepParticipantRole } from "../../../../../models/prepare";
import { canonicalize, normalize, tokens } from "./text";

export type SlotType = "name" | "company" | "date" | "amount" | "job" | "term" | "text" | "choice";

export interface SlotOption {
  value: string;
  label: string;
  keywords: string[];
  text: string;
}

export interface KbSlot {
  key: string;
  type: SlotType;
  label: string;
  question: string;
  chips?: string[];
  options?: SlotOption[];
  /** False: filled only when the person mentions it, never asked. */
  ask?: boolean;
}

export type RoleLabels = Record<PrepParticipantRole, string[]>;

export interface KbDocument {
  id: string;
  title: string;
  category: string;
  source: { readyMadeTitle: string; readyMadeId: string; inGallery: boolean } | { starter: string };
  parties: string[];
  aliases: string[];
  keywords: string[];
  slots: KbSlot[];
  intro: string;
  clauses: string[];
  roleLabels: RoleLabels;
}

export interface KbClause {
  id: string;
  title: string;
  kind: "clause" | "block";
  text?: string;
  lines?: string[];
  plain?: string;
  essential?: boolean;
  aliases?: string[];
  keywords?: string[];
}

export interface KbIntent {
  id: string;
  examples: string[];
  keywords: string[];
  replies: string[];
  chips?: "starter" | "help" | "categories" | "clauses";
}

export interface KbEditRule {
  id: "formal" | "plain" | "shorter" | "headings";
  label: string;
  examples: string[];
  keywords: string[];
  reply: string;
  replacements?: Record<string, string>;
}

export interface KbParticipantRole {
  role: PrepParticipantRole;
  label: string;
  prefix: string[];
  verbs: string[];
  nouns: string[];
}

export interface KbParticipants {
  roles: KbParticipantRole[];
  parallel: string[];
  bothParties: string[];
  approvalFirst: string[];
  approvalLast: string[];
  honorifics: string[];
  particles: string[];
  givenPrefixes: string[];
  suffixes: string[];
  determiners: string[];
  stopWords: string[];
  roleWords: Record<PrepParticipantRole | "witness", string[]>;
  edits: { remove: string[]; change: string[]; add: string[] };
  replies: {
    captured: string[]; askName: string[]; askRole: string[]; removed: string[];
    changed: string[]; added: string[]; notFound: string[];
    rolesNote: string; rolesNoteOffline: string;
  };
}

export interface KbStarterChip { label: string; doc?: string; intent?: string }

export interface KnowledgeBase {
  version: number;
  bot: { name: string; subtitle: string; privacyNote: string; greeting: string[]; disclaimer: string };
  synonyms: Record<string, string>;
  vocabulary: string[];
  participants: KbParticipants;
  categories: { id: string; label: string; keywords: string[] }[];
  starterChips: KbStarterChip[];
  clauseChips: string[];
  intents: KbIntent[];
  editRules: KbEditRule[];
  fallbacks: {
    gibberish: string[]; noMatch: string[]; clarify: string[]; empty: string[];
    offTopic: { keywords: string[]; examples: string[]; replies: string[] };
    rude: { keywords: string[]; replies: string[] };
    legalAdvice: { patterns: string[]; replies: string[] };
  };
  placeholderLabels: Record<string, string>;
  replies: Record<string, string[] | string>;
  documents: KbDocument[];
  clauses: KbClause[];
}

export const KB = rawKb as unknown as KnowledgeBase;

// ── Precomputed matcher inputs ───────────────────────────────────────────────

/** A thing the matcher can pick, with its phrases and keywords normalised. */
export interface Matchable {
  kind: "document" | "clause" | "intent" | "rule" | "category" | "offTopic";
  id: string;
  label: string;
  phrases: string[];
  keywords: string[];
}

const canon = (s: string) => canonicalize(normalize(s), KB.synonyms);
const canonList = (list: readonly string[]) => [...new Set(list.map(canon).filter(p => p !== ""))];
const keywordList = (list: readonly string[]) =>
  [...new Set(list.flatMap(k => tokens(canon(k))))];

const TITLE_NOISE = new Set(["and", "the", "of", "form", "agreement", "for", "a", "an", "to"]);

export const DOCUMENT_MATCHABLES: Matchable[] = KB.documents.map(d => ({
  kind: "document",
  id: d.id,
  label: d.title,
  phrases: canonList([d.title, d.title.replace(/\s*\([^)]*\)\s*/g, " "), ...d.aliases]),
  keywords: keywordList([...d.keywords, ...tokens(normalize(d.title)).filter(t => !TITLE_NOISE.has(t))]),
}));

export const CLAUSE_MATCHABLES: Matchable[] = KB.clauses.map(c => ({
  kind: "clause",
  id: c.id,
  label: c.title,
  phrases: canonList([c.title, `${c.title} clause`, ...(c.aliases ?? [])]),
  keywords: keywordList(c.keywords ?? []),
}));

export const INTENT_MATCHABLES: Matchable[] = KB.intents.map(i => ({
  kind: "intent", id: i.id, label: i.id, phrases: canonList(i.examples), keywords: keywordList(i.keywords),
}));

export const RULE_MATCHABLES: Matchable[] = KB.editRules.map(r => ({
  kind: "rule", id: r.id, label: r.label, phrases: canonList(r.examples), keywords: keywordList(r.keywords),
}));

export const CATEGORY_MATCHABLES: Matchable[] = KB.categories.map(c => ({
  kind: "category",
  id: c.id,
  label: c.label,
  phrases: canonList([c.label, `${c.label} documents`, `${c.label} templates`, ...c.keywords.map(k => `${k} documents`), ...c.keywords.map(k => `${k} templates`)]),
  keywords: [],
}));

export const OFF_TOPIC_MATCHABLE: Matchable = {
  kind: "offTopic", id: "offTopic", label: "offTopic",
  phrases: canonList(KB.fallbacks.offTopic.examples),
  keywords: keywordList(KB.fallbacks.offTopic.keywords),
};

/** Every word the assistant recognises — the gibberish check's dictionary. */
export const KNOWN_WORDS: ReadonlySet<string> = new Set([
  ...KB.vocabulary.map(v => v.toLowerCase()),
  ...[...DOCUMENT_MATCHABLES, ...CLAUSE_MATCHABLES, ...INTENT_MATCHABLES, ...RULE_MATCHABLES, ...CATEGORY_MATCHABLES, OFF_TOPIC_MATCHABLE]
    .flatMap(m => [...m.keywords, ...m.phrases.flatMap(p => tokens(p))]),
  ...KB.participants.stopWords,
  ...Object.values(KB.participants.roleWords).flat().flatMap(w => tokens(w)),
  ...KB.fallbacks.rude.keywords.flatMap(k => tokens(normalize(k))),
  ...KB.fallbacks.legalAdvice.patterns.flatMap(k => tokens(normalize(k))),
  ...Object.keys(KB.synonyms).flatMap(k => tokens(normalize(k))),
]);

export function findDocument(id: string | null | undefined): KbDocument | undefined {
  return id == null ? undefined : KB.documents.find(d => d.id === id);
}

export function findClause(id: string): KbClause | undefined {
  return KB.clauses.find(c => c.id === id);
}

export function findRule(id: string): KbEditRule | undefined {
  return KB.editRules.find(r => r.id === id);
}

/** A reply list from `KB.replies`, always as an array. */
export function replyList(key: string): string[] {
  const v = KB.replies[key];
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}
