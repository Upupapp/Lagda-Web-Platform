// Participants: who signs, approves, reviews, acknowledges or gets a copy.
//
// "Create me an employment agreement to be signed by Juan Dela Cruz, but
// approved or skipped by Maria Santos" names two people and two ROLES. This
// module reads those out — names (quoted or not, Filipino-style particles and
// suffixes included), the app's participant role for each, and the routing
// order — and turns them into template role slots.
//
// Templates name ROLES, never people: a slot is "Employee" or "HR Approver".
// The names are only ever written into the document text.

import type { PrepParticipantRole } from "../../../../../models/prepare";
import { PREP_ROLE_IS_BLOCKING } from "../../../../../models/prepare";
import type { TemplateRolePlaceholder } from "../../../../../models/templates";
import { KB, type KbDocument } from "./knowledge";
import { editDistance, normalize } from "./text";

const P = KB.participants;

export interface Participant {
  id: string;
  /** Full name as written, or null when only the role was given. */
  name: string | null;
  role: PrepParticipantRole;
  /** The template role label — "Employee", "HR Approver", "Witness". */
  label: string;
  /** A label the person gave ("the employee"), kept over the defaults. */
  givenLabel?: string;
  witness?: boolean;
  /** Mention order — the default routing sequence. */
  order: number;
  /** Routing step, 1-based. Computed by `assignSteps`. */
  step: number;
}

export interface ParticipantMention {
  name: string | null;
  givenLabel?: string;
  role: PrepParticipantRole;
  witness: boolean;
  /** Character offset of the name in the input, for ordering. */
  at: number;
}

export interface ParticipantParse {
  mentions: ParticipantMention[];
  bothParties: boolean;
  parallel: boolean;
  approvalFirst: boolean;
  approvalLast: boolean;
  /** Every name string found, so the caller can drop them before matching. */
  consumed: string[];
}

export const ROLE_TITLES: Record<PrepParticipantRole, string> = {
  "signer": "Signer",
  "approver": "Approver",
  "reviewer": "Reviewer",
  "acknowledgment-recipient": "Acknowledgment Recipient",
  "viewer": "Viewer",
  "carbon-copy": "Copy Recipient",
};

/** How the role reads in a sentence: "Should Maria approve, or also sign?" */
export const ROLE_VERBS: Record<PrepParticipantRole, string> = {
  "signer": "sign",
  "approver": "approve",
  "reviewer": "review",
  "acknowledgment-recipient": "acknowledge",
  "viewer": "view",
  "carbon-copy": "get a copy",
};

const PASSIVE: ReadonlySet<PrepParticipantRole> = new Set(["carbon-copy", "viewer"]);

// ── Protecting abbreviations ─────────────────────────────────────────────────
// A full stop ends a clause ("…Juan. Maria approves.") but not "Ma.", "Jr."
// or "Atty.". Those dots are swapped for a look-alike before splitting and
// restored in the final names.

const DOT = "\u2024";
const ABBREVIATIONS = ["Ma", "Mr", "Mrs", "Ms", "Dr", "Atty", "Engr", "Arch", "Hon", "Prof", "Jr", "Sr", "Sta", "Sto", "Inc", "Corp", "Co", "Ltd", "St", "Mt", "Gen", "Col", "Capt", "Sgt", "Rev", "Fr"];

function protect(text: string): string {
  let out = text.replace(/\b([A-Z])\.(?=\s|$)/g, `$1${DOT}`); // initials: "A."
  for (const a of ABBREVIATIONS) out = out.replace(new RegExp(`\\b(${a})\\.`, "gi"), `$1${DOT}`);
  // "Juan Cruz, Jr." — the comma belongs to the name, not to a list.
  out = out.replace(/,\s*(Jr|Sr|II|III|IV|VI|V)\b/g, " $1");
  return out;
}

const restore = (s: string) => s.split(DOT).join(".");

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ADVERB = "(?:first|then|also|only|finally|next|last|lastly|later|initially|second|third)";

/** A knowledge-base phrase as a case-insensitive, whitespace-tolerant regex. */
function phraseSource(phrase: string): string {
  let src = escapeRegExp(phrase.toLowerCase()).replace(/\s+/g, "\\s+").replace(/'/g, "['’]?");
  if (/\\s\+by$/.test(src)) src = src.replace(/\\s\+by$/, `(?:\\s+${ADVERB})?\\s+by`);
  return `(?<![a-z])${src}(?![a-z])`;
}

interface Trigger {
  start: number;
  end: number;
  role: PrepParticipantRole;
  witness: boolean;
  kind: "prefix" | "suffix";
}

const COMPILED = P.roles.map(r => ({
  role: r.role,
  witness: r.label === "Witness",
  prefix: r.prefix.map(p => new RegExp(phraseSource(p), "gi")),
  verbs: r.verbs.map(v => new RegExp(`(?:\\s+(?:will|to|should|must|shall|can|may|would|then|also|first|and))*\\s+${phraseSource(v).replace("(?<![a-z])", "")}`, "gi")),
  asNouns: r.nouns.map(n => new RegExp(`\\s+as\\s+(?:the\\s+|an?\\s+|another\\s+|our\\s+)?${phraseSource(n).replace("(?<![a-z])", "")}`, "gi")),
}));

function findTriggers(text: string): Trigger[] {
  const found: Trigger[] = [];
  for (const c of COMPILED) {
    for (const re of c.prefix) {
      for (const m of text.matchAll(re)) found.push({ start: m.index, end: m.index + m[0].length, role: c.role, witness: c.witness, kind: "prefix" });
    }
    for (const re of [...c.verbs, ...c.asNouns]) {
      for (const m of text.matchAll(re)) found.push({ start: m.index, end: m.index + m[0].length, role: c.role, witness: c.witness, kind: "suffix" });
    }
  }
  // Longest match wins where two overlap ("approved or skipped by" over
  // "approved by"; "approve or skip" over "approve").
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept: Trigger[] = [];
  for (const t of found) {
    const clash = kept.find(k => t.start < k.end && k.start < t.end);
    if (!clash) { kept.push(t); continue; }
    if (t.end - t.start > clash.end - clash.start) kept.splice(kept.indexOf(clash), 1, t);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/** Where a clause ends: sentence punctuation, "but", "while"… */
const BREAK_RE = /[.;!?\n]|,?\s+(?:but|while|whereas|however|except|so that|because)\s+/gi;

function nextBreak(text: string, from: number): number {
  BREAK_RE.lastIndex = from;
  const m = BREAK_RE.exec(text);
  return m ? m.index : text.length;
}

function prevBreak(text: string, before: number): number {
  let last = 0;
  BREAK_RE.lastIndex = 0;
  for (let m = BREAK_RE.exec(text); m && m.index < before; m = BREAK_RE.exec(text)) last = m.index + m[0].length;
  return last;
}

const LIST_SPLIT = /\s*(?:,\s*(?:and\s+|then\s+(?:by\s+)?|&\s*)?|\s+and\s+then\s+(?:by\s+)?|\s+as\s+well\s+as\s+|\s+followed\s+by\s+|\s+then\s+(?:by\s+)?|\s+and\s+(?:by\s+)?|\s*&\s*|\s+plus\s+|\s+or\s+(?=[A-Z"“]))\s*/;

const STOP = new Set(P.stopWords.map(w => w.toLowerCase()));
const PARTICLES = new Set(P.particles.map(w => w.toLowerCase()));
const SUFFIXES = new Set(P.suffixes.map(w => w.toLowerCase().replace(/\.$/, "")));
const HONORIFICS = new Set(P.honorifics.map(w => w.toLowerCase().replace(/\.$/, "")));
const DETERMINERS = new Set(P.determiners);
const ROLE_WORDS = new Set(Object.values(P.roleWords).flat().flatMap(w => w.split(" ")));

const bare = (tok: string) => restore(tok).toLowerCase().replace(/[.,]$/, "");

function isNameToken(tok: string): boolean {
  return /^[A-ZÑ][A-Za-zÑñ'’-]*[.\u2024]?$/.test(tok) || /^[A-Z][\u2024.]$/.test(tok);
}

function niceCase(tok: string): string {
  const t = restore(tok);
  if (SUFFIXES.has(t.toLowerCase().replace(/\.$/, "")) && /^(?:i{1,3}|iv|vi?|v)$/i.test(t)) return t.toUpperCase();
  if (t === "y") return t;
  return t.length > 0 ? t[0]!.toUpperCase() + t.slice(1) : t;
}

interface PartResult { name: string | null; givenLabel?: string; both?: boolean; raw: string }

/** One list item after a trigger: a person, a role noun, or nothing. */
function parsePart(part: string, allowLowercase: boolean): PartResult | null {
  let text = part.trim().replace(/^(?:by|first|then|also|finally|lastly|next|and|or|&)\s+/i, "").trim();
  text = text.replace(/^(?:by)\s+/i, "");
  if (text === "") return null;

  const quoted = /^["“']([^"”']{2,60})["”']/.exec(text);
  if (quoted) return { name: restore(quoted[1]!.trim()), raw: quoted[0] };

  if (/^(?:both|all|each)\s+part(?:y|ies)\b/i.test(text)) return { name: null, both: true, raw: text };

  const words = text.split(/\s+/);
  const first = words[0]!.toLowerCase();
  if (DETERMINERS.has(first)) {
    // "the employee", "our HR manager", "the client's representative".
    const labelWords: string[] = [];
    for (const w of words.slice(1)) {
      const b = bare(w);
      if (STOP.has(b) || ROLE_WORDS.has(b) || labelWords.length >= 3) break;
      labelWords.push(w.replace(/[,.]$/, ""));
    }
    if (labelWords.length === 0) return null;
    const label = labelWords.map(w => (w === w.toUpperCase() ? w : w[0]!.toUpperCase() + w.slice(1).toLowerCase())).join(" ").replace(/['’]s$/i, "");
    return { name: null, givenLabel: label, raw: [words[0], ...labelWords].join(" ") };
  }

  const taken: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const tok = words[i]!.replace(/,$/, "");
    const b = bare(tok);
    if (taken.length === 0 && HONORIFICS.has(b)) { taken.push(tok); continue; }
    if (taken.length > 0 && SUFFIXES.has(b)) { taken.push(tok); break; }
    if (taken.length > 0 && PARTICLES.has(b)) {
      // A particle only counts when a name follows it ("Dela Cruz"), and
      // two-word particles ("de los") are taken together.
      const next = words[i + 1];
      const nextNext = words[i + 2];
      if (next !== undefined && PARTICLES.has(`${b} ${bare(next)}`) && nextNext !== undefined && (isNameToken(nextNext) || allowLowercase)) {
        taken.push(tok, next); i += 1; continue;
      }
      if (next !== undefined && (isNameToken(next) || (allowLowercase && !STOP.has(bare(next))))) { taken.push(tok); continue; }
      break;
    }
    if (STOP.has(b) || ROLE_WORDS.has(b)) break;
    if (isNameToken(tok)) { taken.push(tok); if (taken.length >= 6) break; continue; }
    if (allowLowercase && /^[a-zñ'’-]+$/.test(tok) && taken.length < 4) { taken.push(tok); continue; }
    break;
  }
  if (taken.length === 0) return null;
  // A lone honorific or particle is not a name.
  if (taken.every(t => HONORIFICS.has(bare(t)) || PARTICLES.has(bare(t)))) return null;
  const name = taken.map(t => (allowLowercase && t === t.toLowerCase() ? niceCase(t) : restore(t))).join(" ").replace(/[,]$/, "");
  return { name, raw: taken.join(" ") };
}

/** The last name-like run in a stretch of text ("…for Juan to sign"). */
function lastNameIn(segment: string): PartResult | null {
  const quoted = [...segment.matchAll(/["“']([^"”']{2,60})["”']/g)].pop();
  if (quoted) return { name: restore(quoted[1]!.trim()), raw: quoted[0] };
  const words = segment.trim().split(/\s+/).filter(w => w !== "");
  // Walk back to the start of the trailing name run.
  let i = words.length - 1;
  while (i >= 0) {
    const tok = words[i]!.replace(/,$/, "");
    const b = bare(tok);
    const nameish = isNameToken(tok) || SUFFIXES.has(b) || (PARTICLES.has(b) && i < words.length - 1);
    if (!nameish || STOP.has(b) && !PARTICLES.has(b)) break;
    i -= 1;
  }
  const run = words.slice(i + 1);
  if (run.length === 0) {
    // "the employee will sign"
    const det = words.slice(-3);
    const at = det.findIndex(w => DETERMINERS.has(w.toLowerCase()));
    if (at !== -1) return parsePart(det.slice(at).join(" "), false);
    return null;
  }
  return parsePart(run.join(" "), false);
}

function containsAny(lower: string, phrases: readonly string[]): boolean {
  return phrases.some(p => new RegExp(phraseSource(p), "i").test(lower));
}

/** Reads every participant out of one message. */
export function parseParticipants(input: string): ParticipantParse {
  const text = protect(input);
  const lower = text.toLowerCase();
  const triggers = findTriggers(text);
  const mentions: ParticipantMention[] = [];
  const consumed: string[] = [];
  const claimed: { at: number; len: number; index: number }[] = [];

  const push = (r: PartResult, t: Trigger, at: number) => {
    const existing = claimed.find(c => at >= c.at && at < c.at + c.len);
    if (existing !== undefined) {
      // A later "…Maria will approve" re-claims a name a prefix list took.
      mentions.splice(existing.index, 1);
      claimed.splice(claimed.indexOf(existing), 1);
      for (const c of claimed) if (c.index > existing.index) c.index -= 1;
    }
    mentions.push({
      name: r.name,
      ...(r.givenLabel !== undefined ? { givenLabel: r.givenLabel } : {}),
      role: t.role,
      witness: t.witness,
      at,
    });
    claimed.push({ at, len: Math.max(1, r.raw.length), index: mentions.length - 1 });
    if (r.name !== null) consumed.push(r.name);
  };

  triggers.forEach((t, idx) => {
    if (t.kind === "prefix") {
      const nextTrigger = triggers.slice(idx + 1).find(n => n.kind === "prefix")?.start ?? text.length;
      const end = Math.min(nextTrigger, nextBreak(text, t.end));
      const segment = text.slice(t.end, end);
      const allowLowercase = true;
      let cursor = t.end;
      for (const part of segment.split(LIST_SPLIT)) {
        if (part === undefined) continue;
        const at = text.indexOf(part, cursor);
        const r = parsePart(part, allowLowercase);
        if (at >= 0) cursor = at + part.length;
        if (r === null || r.both === true) continue;
        push(r, t, at >= 0 ? at : t.end);
      }
    } else {
      const prevEnd = triggers.slice(0, idx).reverse().find(p => p.end <= t.start)?.end ?? 0;
      const from = Math.max(prevEnd, prevBreak(text, t.start));
      const segment = text.slice(from, t.start);
      // "Pedro and Ana will approve": every name in the trailing list.
      const pieces = segment.split(LIST_SPLIT);
      const results: { r: PartResult; at: number }[] = [];
      for (let k = pieces.length - 1; k >= 0; k--) {
        const piece = pieces[k]!;
        const r = k === pieces.length - 1 ? lastNameIn(piece) : parsePart(piece, false);
        if (r === null || r.both === true) break;
        // Only a whole piece that IS a name continues the list backwards.
        if (k < pieces.length - 1 && r.raw.trim().length < piece.trim().length - 1) break;
        results.unshift({ r, at: from + segment.lastIndexOf(r.raw) });
      }
      for (const { r, at } of results) push(r, t, at);
    }
  });

  mentions.sort((a, b) => a.at - b.at);
  const signFirstAfter = /\bsign\w*\b[^.;]*\bafter\b[^.;]*\b(?:approv|review)\w*/i.test(lower);
  const approveAfter = /\b(?:approv|review)\w*\b[^.;]*\bafter\b[^.;]*\bsign\w*/i.test(lower);
  return {
    mentions,
    bothParties: containsAny(lower, P.bothParties),
    parallel: containsAny(lower, P.parallel),
    approvalFirst: (containsAny(lower, P.approvalFirst) || signFirstAfter) && !approveAfter,
    approvalLast: containsAny(lower, P.approvalLast) || approveAfter,
    consumed,
  };
}

// ── Building the participant list ────────────────────────────────────────────

export function sameName(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (x === y) return true;
  const xs = x.split(" ");
  const ys = y.split(" ");
  // "Maria" refers to "Maria Santos"; "Juan" to "Juan Dela Cruz".
  if (xs.length === 1 && ys[0] === xs[0]) return true;
  if (ys.length === 1 && xs[0] === ys[0]) return true;
  return x.length >= 5 && editDistance(x, y, 1) <= 1;
}

/** Role labels from the document's own roles, else "Signer 1", "Signer 2". */
export function relabel(list: Participant[], doc: KbDocument | undefined): Participant[] {
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const p of list) {
    const key = p.witness ? "witness" : p.role;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const used = new Set<string>();
  return list.map(p => {
    const key = p.witness ? "witness" : p.role;
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    let label: string;
    if (p.givenLabel !== undefined) label = p.givenLabel;
    else if (p.witness) label = (totals.get(key) ?? 0) > 1 ? `Witness ${String(n)}` : "Witness";
    else {
      const fromDoc = doc?.roleLabels[p.role]?.[n - 1];
      label = fromDoc ?? ((totals.get(key) ?? 0) > 1 ? `${ROLE_TITLES[p.role]} ${String(n)}` : ROLE_TITLES[p.role]);
    }
    let unique = label;
    for (let k = 2; used.has(unique.toLowerCase()); k++) unique = `${label} ${String(k)}`;
    used.add(unique.toLowerCase());
    return { ...p, label: unique };
  });
}

export interface StepOptions { parallelSigners: boolean; approvalFirst: boolean }

const ROLE_RANK: Record<PrepParticipantRole, number> = {
  "reviewer": 0, "approver": 1, "signer": 2, "acknowledgment-recipient": 3, "viewer": 4, "carbon-copy": 4,
};

/**
 * Routing steps, 1-based and gap-free (the backend refuses a gap): actors in
 * mention order — or reviewers and approvers first when the wording says so —
 * each on their own step, signers sharing one when they sign in parallel;
 * copy recipients and viewers together on the step after the last actor.
 */
export function assignSteps(list: Participant[], opts: StepOptions): Participant[] {
  const actors = list.filter(p => !PASSIVE.has(p.role));
  const passive = list.filter(p => PASSIVE.has(p.role));
  const ordered = [...actors].sort((a, b) =>
    (opts.approvalFirst ? ROLE_RANK[a.role] - ROLE_RANK[b.role] : 0) || a.order - b.order);
  const stepOf = new Map<string, number>();
  let step = 0;
  let signerStep: number | null = null;
  for (const p of ordered) {
    if (opts.parallelSigners && p.role === "signer" && !p.witness) {
      if (signerStep === null) { step += 1; signerStep = step; }
      stepOf.set(p.id, signerStep);
      continue;
    }
    step += 1;
    stepOf.set(p.id, step);
  }
  const passiveStep = step + 1;
  for (const p of passive) stepOf.set(p.id, passiveStep);
  // Close any gap left by an empty passive group.
  const distinct = [...new Set(stepOf.values())].sort((a, b) => a - b);
  const dense = new Map(distinct.map((s, i) => [s, i + 1]));
  return list.map(p => ({ ...p, step: dense.get(stepOf.get(p.id) ?? 1) ?? 1 }));
}

/** A readable one-liner: "Juan Dela Cruz (Employee, signs, step 1)". */
export function describeParticipant(p: Participant): string {
  const verb = p.witness ? "witnesses" : ROLE_VERB_S[p.role];
  return `${p.name ?? `[${p.label} name]`} (${p.label}, ${verb}, step ${String(p.step)})`;
}

const ROLE_VERB_S: Record<PrepParticipantRole, string> = {
  "signer": "signs",
  "approver": "approves or skips",
  "reviewer": "reviews",
  "acknowledgment-recipient": "acknowledges",
  "viewer": "can view",
  "carbon-copy": "gets a copy",
};

// ── Edits: "change Maria to reviewer", "remove Juan", "add Pedro as signer" ──

export type ParticipantEdit =
  | { kind: "remove"; target: string }
  | { kind: "change"; target: string; role: PrepParticipantRole; witness: boolean }
  | { kind: "add"; name: string; role: PrepParticipantRole; witness: boolean };

const ROLE_WORD_LIST = Object.entries(P.roleWords)
  .flatMap(([role, words]) => words.map(w => ({ word: w, role: role as PrepParticipantRole | "witness" })))
  .sort((a, b) => b.word.length - a.word.length);

function roleFromWord(text: string): { role: PrepParticipantRole; witness: boolean } | null {
  const lower = ` ${text.toLowerCase().replace(/[^a-z' ]/g, " ")} `;
  for (const { word, role } of ROLE_WORD_LIST) {
    if (lower.includes(` ${word} `)) {
      return role === "witness" ? { role: "signer", witness: true } : { role, witness: false };
    }
  }
  return null;
}

const ROLE_ALT = ROLE_WORD_LIST.map(r => escapeRegExp(r.word)).join("|");

export function parseParticipantEdit(input: string): ParticipantEdit | null {
  const text = restore(protect(input)).trim().replace(/[.!?]+$/, "");
  const remove = new RegExp(`^(?:please\\s+)?(?:${P.edits.remove.map(escapeRegExp).join("|")})\\s+(.+?)(?:\\s+(?:from|as)\\b.*)?$`, "i").exec(text);
  if (remove) return { kind: "remove", target: stripDeterminer(remove[1]!) };

  const change = new RegExp(`^(?:please\\s+)?(?:${P.edits.change.map(escapeRegExp).join("|")})\\s+(.+?)\\s+(?:to be|to|into|as|an?|the)\\s+(?:an?\\s+|the\\s+)?(${ROLE_ALT})\\b`, "i").exec(text)
    ?? new RegExp(`^(.+?)\\s+should\\s+(?:be\\s+(?:the\\s+|an?\\s+)?|just\\s+|only\\s+)?(${ROLE_ALT})\\b(?:\\s+instead)?`, "i").exec(text)
    ?? new RegExp(`^(.+?)\\s+(?:as|is)\\s+(?:the\\s+|an?\\s+)?(${ROLE_ALT})\\s+instead`, "i").exec(text);
  if (change) {
    const role = roleFromWord(change[2]!);
    if (role) return { kind: "change", target: stripDeterminer(change[1]!), ...role };
  }

  const add = new RegExp(`^(?:please\\s+)?(?:${P.edits.add.map(escapeRegExp).join("|")})\\s+(.+?)\\s+(?:as|to)\\s+(?:an?\\s+|the\\s+|another\\s+)?(${ROLE_ALT})\\b`, "i").exec(text)
    ?? /^(?:also\s+)?(?:cc|copy)\s+(?!to\b)(.+)$/i.exec(text);
  if (add) {
    const role = add[2] !== undefined ? roleFromWord(add[2]) : { role: "carbon-copy" as const, witness: false };
    const part = parsePart(add[1]!, true);
    if (role && part?.name) return { kind: "add", name: part.name, ...role };
  }
  return null;
}

function stripDeterminer(s: string): string {
  return s.trim().replace(/^(?:the|our|my)\s+/i, "");
}

/** The participant a free-text reference means — by name, or by role label. */
export function findParticipant(list: readonly Participant[], ref: string): Participant | undefined {
  const r = ref.trim();
  return list.find(p => p.name !== null && sameName(p.name, r))
    ?? list.find(p => normalize(p.label) === normalize(r))
    ?? list.find(p => normalize(ROLE_TITLES[p.role]) === normalize(r));
}

// ── Into template role slots ─────────────────────────────────────────────────

/**
 * The template's role slots with the participants merged in. Existing slots
 * are never dropped (a field may already be placed for one): a participant
 * reuses an existing slot with the same label and role, and anything new is
 * appended after the existing steps. Steps come out gap-free.
 */
export function participantsToPlaceholders(
  participants: readonly Participant[],
  existing: readonly TemplateRolePlaceholder[],
): TemplateRolePlaceholder[] {
  const merged: TemplateRolePlaceholder[] = existing.map(p => ({ ...p }));
  const reused = new Set<number>();
  const base = existing.reduce((m, p) => Math.max(m, p.routingStep), 0);
  participants.forEach((p, i) => {
    const match = merged.findIndex((e, idx) =>
      !reused.has(idx) && e.role === p.role && normalize(e.label) === normalize(p.label));
    if (match !== -1) { reused.add(match); return; }
    merged.push({
      id: `chat-${String(i + 1)}`,
      label: p.label,
      role: p.role,
      required: PREP_ROLE_IS_BLOCKING[p.role],
      routingStep: base + p.step,
      defaultAuthMethod: "none",
      description: "",
      mustMapToParticipant: true,
    });
    reused.add(merged.length - 1);
  });
  const distinct = [...new Set(merged.map(p => p.routingStep))].sort((a, b) => a - b);
  const dense = new Map(distinct.map((s, i) => [s, i + 1]));
  return merged.map(p => ({ ...p, routingStep: dense.get(p.routingStep) ?? 1 }));
}
