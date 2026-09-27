// Text helpers for the LAGDA Chatbot's rule engine: normalisation, synonym
// canonicalisation, typo-tolerant comparison and the gibberish check.
// Pure functions, no knowledge-base import, so they are trivially testable.

/** Lower-case, accent-free, punctuation → spaces (apostrophes dropped, so
 *  "don't" and "dont" compare equal). `&` survives: "R&D" is a word here. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’‘`]/g, "")
    .replace(/[^a-z0-9&%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(normalized: string): string[] {
  return normalized === "" ? [] : normalized.split(" ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word phrase containment on already-normalised text. */
export function containsPhrase(haystack: string, phrase: string): boolean {
  if (phrase === "") return false;
  return ` ${haystack} `.includes(` ${phrase} `);
}

/** Applies the synonym map (longest phrase first) to normalised text. */
export function canonicalize(normalized: string, synonyms: Readonly<Record<string, string>>): string {
  let out = ` ${normalized} `;
  const entries = Object.entries(synonyms)
    .map(([from, to]) => [normalize(from), normalize(to)] as const)
    .filter(([from, to]) => from !== "" && from !== to)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    out = out.replace(new RegExp(` ${escapeRegExp(from)}(?= )`, "g"), ` ${to}`);
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Optimal-string-alignment distance (Levenshtein + adjacent swaps), with
 *  an early exit once `max` is exceeded. */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i]![0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Number.POSITIVE_INFINITY;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, rows[i - 2]![j - 2]! + 1);
      }
      rows[i]![j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return rows[a.length]![b.length]!;
}

/** How many typos a word of this length may carry and still match. */
export function typoAllowance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  return 2;
}

export function fuzzyEquals(word: string, target: string): boolean {
  if (word === target) return true;
  const allowance = Math.min(typoAllowance(word.length), typoAllowance(target.length));
  if (allowance === 0) return false;
  // The first letter is almost never the typo, and requiring it keeps
  // "lease" from matching "please".
  if (word[0] !== target[0]) return false;
  return editDistance(word, target, allowance) <= allowance;
}

/** All of `phrase`'s words appear, in order and adjacent, allowing typos. */
export function fuzzyContainsPhrase(words: readonly string[], phrase: string): boolean {
  const target = tokens(phrase);
  if (target.length === 0 || target.length > words.length) return false;
  for (let start = 0; start + target.length <= words.length; start++) {
    let ok = true;
    for (let k = 0; k < target.length; k++) {
      if (!fuzzyEquals(words[start + k]!, target[k]!)) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// ── Gibberish ────────────────────────────────────────────────────────────────

const VOWELS = /[aeiouy]/g;
const KEYBOARD_RUNS = ["qwert", "werty", "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "jkl", "zxcv", "xcvb", "cvbn", "vbnm", "uiop", "yuio", "poiu", "lkjh", "mnbv", "qazwsx"];

/** Structural signs a single word was mashed rather than typed. */
export function looksMashed(word: string): boolean {
  if (word.length < 4) return false;
  if (/(.)\1{3,}/.test(word)) return true;                    // aaaa
  if (/(.{2,4})\1{2,}/.test(word)) return true;               // asdasdasd, hfhfhf
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(word)) return true;   // sdfgh
  if (KEYBOARD_RUNS.some(r => word.includes(r))) return true;
  // No vowels at all. (A low vowel ratio alone is not enough: "Schwartz".)
  return (word.match(VOWELS) ?? []).length === 0;
}

export interface GibberishOptions {
  /** Words the assistant knows (the dictionary for the ratio test). */
  known: ReadonlySet<string>;
  /** Lenient mode — used for answers such as names, where most words are
   *  legitimately unknown. Only structural mashing counts. */
  lenient?: boolean;
}

/**
 * True when the text reads as key-mashing rather than words: length, vowel
 * and consonant patterns, repeated characters, and how many of the words are
 * in the dictionary. Numbers, amounts and short replies are never gibberish.
 */
export function isGibberish(raw: string, opts: GibberishOptions): boolean {
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) {
    // Only punctuation/symbols: "???" or "!!!!" — not words, but a long run
    // of symbols is mashing too.
    return /[^\s\d]{4,}/.test(trimmed) && !/\d/.test(trimmed);
  }
  if (letters.length < 3) return false;

  const words = normalize(trimmed).split(" ").filter(w => /^[a-z]+$/.test(w));
  if (words.length === 0) return false;
  const isKnown = (w: string) =>
    opts.known.has(w) || [...opts.known].some(k => k.length >= 4 && fuzzyEquals(w, k));
  const known = words.filter(w => w.length <= 2 || isKnown(w)).length;
  const ratio = known / words.length;
  const mashed = words.filter(w => !isKnown(w) && looksMashed(w)).length;

  if (opts.lenient) {
    return mashed > 0 && mashed >= Math.ceil(words.length / 2);
  }
  if (mashed > 0 && ratio < 0.5) return true;
  // One long unknown "word" with nothing else: "fjdkslaqp".
  if (words.length === 1 && ratio === 0 && words[0]!.length >= 9) {
    const w = words[0]!;
    const vowels = (w.match(VOWELS) ?? []).length;
    return vowels / w.length < 0.3;
  }
  return false;
}

/** Deterministic variant choice, so a reply rotates but tests stay stable. */
export function pick<T>(list: readonly T[], turn: number): T {
  if (list.length === 0) throw new Error("pick() from an empty list");
  return list[((turn % list.length) + list.length) % list.length]!;
}

/** Fills `{key}` from `values`; unknown keys are left for a later pass. */
export function fillTemplate(template: string, values: Readonly<Record<string, string | undefined>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

export function titleCase(s: string): string {
  return s.replace(/\b([a-z])([a-z]*)/g, (_w, a: string, b: string) => a.toUpperCase() + b);
}
