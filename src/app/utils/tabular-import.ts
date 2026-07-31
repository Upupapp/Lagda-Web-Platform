// Safe tabular import utility — Command 33.
//
// Parses CSV / TSV text that the user either PASTED or selected as a LOCAL file.
// Everything happens in the browser, in memory, for the lifetime of the tab.
//
// This utility NEVER:
//   uploads · persists · logs cell contents · evaluates formulas · runs macros
//   follows links · returns HTML · calls the network
//
// Deliberately hand-written rather than pulling in a CSV or spreadsheet dependency:
// the requirement is a few hundred rows of plain text, not a spreadsheet engine.

// ── Limits ────────────────────────────────────────────────────────────────────

export interface TabularParseLimits {
  maxBytes:   number;
  maxRows:    number;
  maxColumns: number;
  maxCellLength: number;
}

export const DEFAULT_TABULAR_LIMITS: TabularParseLimits = {
  maxBytes:      512_000,
  maxRows:       500,
  maxColumns:    40,
  maxCellLength: 500,
};

export type TabularDelimiter = "," | "\t" | ";" | "|";

const CANDIDATE_DELIMITERS: TabularDelimiter[] = [",", "\t", ";", "|"];

// ── Formula / injection neutralisation ────────────────────────────────────────

/**
 * Characters that make a spreadsheet treat a cell as a formula when the value is
 * later opened in Excel, Numbers, or Sheets. We never execute anything ourselves —
 * this protects the user's spreadsheet if they ever copy a value back out, and it
 * guarantees the value renders as inert text here.
 *
 * Tab and carriage return are included because they can smuggle a formula past a
 * naive first-character check.
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function isFormulaLike(value: string): boolean {
  if (!value) return false;
  return FORMULA_PREFIXES.some(p => value.startsWith(p));
}

/**
 * Renders a formula-like cell inert by prefixing a single quote — the standard
 * spreadsheet "treat as text" marker — and stripping control characters.
 * The original is never executed and never re-emitted as a formula.
 */
export function neutralizeCell(value: string, maxLength: number): { value: string; neutralized: boolean } {
  // Test the RAW value first: a leading tab or carriage return is itself a formula
  // prefix, and stripping control characters before the check would hide it.
  const neutralized = isFormulaLike(value);

  // Then strip control characters so nothing executable or invisible survives.
  const stripped = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (stripped.length === 0) return { value: "", neutralized: false };

  // Re-test after stripping, so "\t=SUM(A1)" is still caught once the tab is gone.
  const safe = (neutralized || isFormulaLike(stripped)) ? `'${stripped}` : stripped;
  return { value: safe.slice(0, maxLength), neutralized: safe !== stripped };
}

// ── Delimiter detection ───────────────────────────────────────────────────────

/**
 * Picks the delimiter that yields the most consistent column count across the
 * first few lines. Deterministic — no heuristics beyond consistency and frequency.
 */
export function detectDelimiter(text: string): TabularDelimiter | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return null;

  let best: { delimiter: TabularDelimiter; score: number } | null = null;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = lines.map(l => splitLine(l, delimiter).length);
    const first = counts[0] ?? 0;
    if (first < 2) continue;
    const consistent = counts.filter(c => c === first).length;
    // Prefer consistency, then column count.
    const score = consistent * 100 + first;
    if (!best || score > best.score) best = { delimiter, score };
  }

  return best ? best.delimiter : null;
}

// ── Line splitting with quote support ─────────────────────────────────────────

/** RFC4180-style split: honours double quotes and escaped ("") quotes. */
export function splitLine(line: string, delimiter: TabularDelimiter): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

/** Splits on newlines while respecting quoted fields that contain newlines. */
function splitRecords(text: string): string[] {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '""'; i++; continue; }
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      records.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.length > 0) records.push(current);
  return records;
}

// ── Header detection ──────────────────────────────────────────────────────────

/**
 * Treats the first record as a header when every cell is non-empty, none looks
 * like an email address, and none is purely numeric. Deterministic.
 */
export function looksLikeHeader(cells: string[]): boolean {
  if (cells.length === 0) return false;
  if (cells.some(c => c.trim().length === 0)) return false;
  if (cells.some(c => c.includes("@"))) return false;
  if (cells.every(c => /^-?\d+(\.\d+)?$/.test(c.trim()))) return false;
  return true;
}

// ── Parse result ──────────────────────────────────────────────────────────────

export interface TabularParseResult {
  ok:          boolean;
  headers:     string[];
  /** Cell arrays aligned to `headers`; short rows are padded, long rows truncated. */
  rows:        string[][];
  delimiter:   TabularDelimiter | null;
  headerDetected: boolean;
  totalRecordsDetected: number;
  truncated:   boolean;
  neutralizedCellCount: number;
  duplicateHeaders: string[];
  warnings:    string[];
  errors:      string[];
}

const EMPTY_RESULT: TabularParseResult = {
  ok: false, headers: [], rows: [], delimiter: null, headerDetected: false,
  totalRecordsDetected: 0, truncated: false, neutralizedCellCount: 0,
  duplicateHeaders: [], warnings: [], errors: [],
};

/**
 * Parses pasted or locally-read tabular text.
 *
 * Never throws: malformed input produces `ok: false` with plain-language errors.
 * Cell values are neutralised and length-capped before they leave this function,
 * so no caller can receive an executable or oversized value.
 */
export function parseTabularText(
  text: string,
  limits: TabularParseLimits = DEFAULT_TABULAR_LIMITS,
): TabularParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (typeof text !== "string" || text.trim().length === 0) {
    return { ...EMPTY_RESULT, errors: ["The content is empty. Add at least a header row and one data row."] };
  }

  // Byte-length guard (UTF-8 aware) before doing any work.
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > limits.maxBytes) {
    return {
      ...EMPTY_RESULT,
      errors: [`The content is larger than the ${Math.round(limits.maxBytes / 1024)} KB frontend preview limit.`],
    };
  }

  const delimiter = detectDelimiter(text);
  if (!delimiter) {
    return {
      ...EMPTY_RESULT,
      errors: ["No supported column separator was detected. Use commas, tabs, semicolons, or pipes."],
    };
  }

  const records = splitRecords(text).filter(r => r.trim().length > 0);
  const firstRecord = records[0];
  if (firstRecord === undefined) {
    return { ...EMPTY_RESULT, delimiter, errors: ["No rows were found."] };
  }

  const firstCells = splitLine(firstRecord, delimiter);
  const headerDetected = looksLikeHeader(firstCells);

  let headers: string[];
  let dataRecords: string[];

  if (headerDetected) {
    headers = firstCells.map(h => neutralizeCell(h, 80).value || "Column");
    dataRecords = records.slice(1);
  } else {
    headers = firstCells.map((_, i) => `Column ${i + 1}`);
    dataRecords = records;
    warnings.push("No header row was detected. Columns are numbered, and the first row is treated as data.");
  }

  if (headers.length > limits.maxColumns) {
    headers = headers.slice(0, limits.maxColumns);
    warnings.push(`Only the first ${limits.maxColumns} columns are used.`);
  }

  // Duplicate header detection — the mapping UI must be able to tell them apart.
  const seen = new Map<string, number>();
  const duplicateHeaders: string[] = [];
  headers = headers.map(h => {
    const key = h.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count > 0) {
      if (!duplicateHeaders.includes(h)) duplicateHeaders.push(h);
      return `${h} (${count + 1})`;
    }
    return h;
  });
  if (duplicateHeaders.length > 0) {
    warnings.push(`Duplicate column headers were renamed so they can be mapped separately: ${duplicateHeaders.join(", ")}.`);
  }

  const totalRecordsDetected = dataRecords.length;
  const truncated = totalRecordsDetected > limits.maxRows;
  if (truncated) {
    dataRecords = dataRecords.slice(0, limits.maxRows);
    warnings.push(`Only the first ${limits.maxRows} rows are used in this frontend demonstration.`);
  }

  let neutralizedCellCount = 0;
  let inconsistentRowCount = 0;

  const rows: string[][] = dataRecords.map(record => {
    const cells = splitLine(record, delimiter);
    if (cells.length !== headers.length) inconsistentRowCount++;

    const normalized: string[] = [];
    for (let i = 0; i < headers.length; i++) {
      const raw = cells[i] ?? "";
      const { value, neutralized } = neutralizeCell(raw, limits.maxCellLength);
      if (neutralized) neutralizedCellCount++;
      normalized.push(value);
    }
    return normalized;
  });

  if (inconsistentRowCount > 0) {
    warnings.push(`${inconsistentRowCount} ${inconsistentRowCount === 1 ? "row has" : "rows have"} a different number of columns. Missing cells are treated as empty.`);
  }
  if (neutralizedCellCount > 0) {
    warnings.push(`${neutralizedCellCount} ${neutralizedCellCount === 1 ? "cell begins" : "cells begin"} with a spreadsheet formula character and ${neutralizedCellCount === 1 ? "was" : "were"} marked as plain text. No formula is evaluated.`);
  }
  if (rows.length === 0) {
    errors.push("No data rows were found after the header.");
  }

  return {
    ok: errors.length === 0,
    headers,
    rows,
    delimiter,
    headerDetected,
    totalRecordsDetected,
    truncated,
    neutralizedCellCount,
    duplicateHeaders,
    warnings,
    errors,
  };
}

// ── Local file reading ────────────────────────────────────────────────────────

export interface LocalFileReadResult {
  ok:       boolean;
  text:     string;
  fileName: string;
  sizeBytes: number;
  error:    string | null;
}

const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".txt"];
const ACCEPTED_MIME_PREFIXES = ["text/", "application/csv", "application/vnd.ms-excel"];

export function isAcceptedTabularFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  const extensionOk = ACCEPTED_EXTENSIONS.some(e => lower.endsWith(e));
  // Some browsers report application/vnd.ms-excel for .csv; an empty type is also common.
  const mimeOk = file.type === "" || ACCEPTED_MIME_PREFIXES.some(p => file.type.startsWith(p));
  return extensionOk && mimeOk;
}

/**
 * Reads a local file as text using FileReader. The file is never uploaded and the
 * text is never persisted — the caller holds it in memory only.
 */
export function readLocalTabularFile(
  file: File,
  limits: TabularParseLimits = DEFAULT_TABULAR_LIMITS,
): Promise<LocalFileReadResult> {
  return new Promise(resolve => {
    const base: LocalFileReadResult = {
      ok: false, text: "", fileName: file.name.slice(0, 120), sizeBytes: file.size, error: null,
    };

    if (!isAcceptedTabularFile(file)) {
      resolve({ ...base, error: "Select a .csv, .tsv, or .txt file. Spreadsheet workbooks are not supported." });
      return;
    }
    if (file.size > limits.maxBytes) {
      resolve({ ...base, error: `The file is larger than the ${Math.round(limits.maxBytes / 1024)} KB frontend preview limit.` });
      return;
    }
    if (file.size === 0) {
      resolve({ ...base, error: "The file is empty." });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve({ ...base, error: "The file could not be read in this browser session." });
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) { resolve({ ...base, error: "The file could not be read as text." }); return; }
      // Reject content that is obviously binary rather than delimited text.
      if (result.includes("\u0000")) {
        resolve({ ...base, error: "The file does not appear to be plain delimited text." });
        return;
      }
      resolve({ ...base, ok: true, text: result });
    };
    // Explicit UTF-8; malformed sequences become replacement characters rather than throwing.
    reader.readAsText(file, "UTF-8");
  });
}

// ── Email direction validation ────────────────────────────────────────────────

/**
 * Shape check only. Deliberately conservative: this validates *direction*, and is
 * never presented as proof that an address exists, is deliverable, or is verified.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmailDirection(value: string): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_SHAPE.test(trimmed);
}

/** Deterministic normalisation used for duplicate grouping only. */
export function normalizeEmailForComparison(value: string): string {
  return value.trim().toLowerCase();
}

/** Masks an email for display where the full value is not required. */
export function maskEmailDirection(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed ? "****" : "";
  const first = trimmed[0];
  const domain = trimmed.slice(at);
  return `${first}****${domain}`;
}
