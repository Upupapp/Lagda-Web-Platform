// The Notary Directory's entries, for the reviewer's picker.
//
// The directory is a static site; its list is a script that sets
// `window.LAWYERS = [...]`. The reviewer's page reads that same file and takes
// the array out of it, so there is one list and no copy to keep in step. The
// server has its own copy of ids and names and is the one that trusts an id.

export interface DirectoryEntry {
  id: string;
  name: string;
  firm: string;
  city: string;
  province: string;
  kind: "lawyer" | "office";
}

export const DIRECTORY_DATA_URL = "/enotary-directory/js/lawyers.js";

/** The array in a `window.LAWYERS = [...];` script. An empty list for anything else. */
export function parseDirectoryScript(source: string): DirectoryEntry[] {
  const from = source.indexOf("[");
  const to = source.lastIndexOf("]");
  if (from < 0 || to < from) return [];
  try {
    const raw = JSON.parse(source.slice(from, to + 1)) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: DirectoryEntry[] = [];
    for (const item of raw) {
      const bag = item as Record<string, unknown>;
      if (typeof bag.id !== "string" || typeof bag.name !== "string") continue;
      out.push({
        id: bag.id, name: bag.name, firm: typeof bag.firm === "string" ? bag.firm : "",
        city: typeof bag.city === "string" ? bag.city : "", province: typeof bag.province === "string" ? bag.province : "",
        kind: bag.kind === "office" ? "office" : "lawyer",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadDirectoryEntries(): Promise<DirectoryEntry[]> {
  try {
    const response = await fetch(DIRECTORY_DATA_URL);
    return response.ok ? parseDirectoryScript(await response.text()) : [];
  } catch {
    return [];
  }
}

/** Entries whose name, firm or city contains every word typed. */
export function filterEntries(entries: readonly DirectoryEntry[], query: string): DirectoryEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(word => word !== "");
  if (words.length === 0) return [...entries];
  return entries.filter(entry => {
    const hay = `${entry.name} ${entry.firm} ${entry.city}`.toLowerCase();
    return words.every(word => hay.includes(word));
  });
}

export const entryLabel = (entry: DirectoryEntry): string =>
  `${entry.name}${entry.kind === "office" ? " (office)" : ""} — ${[entry.firm, entry.city].filter(part => part !== "").join(", ")}`;
