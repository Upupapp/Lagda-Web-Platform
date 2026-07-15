// Local mock search — no external index, no server requests.
// Searches across documents, templates, contacts, and help topics using
// deterministic fixture data. Groups results by entity type.

import type { SearchResult, SearchResultGroup } from "../../models";
import { MOCK_TRANSACTIONS } from "../../data/mock";
import { MOCK_TEMPLATES } from "../../data/mock";
import { MOCK_CONTACTS } from "../../data/mock";
import { delay } from "./delay";

const HELP_ITEMS: SearchResult[] = [
  { id: "h1", type: "help", title: "How to prepare a document", path: "/help", subtitle: "Document preparation guide" },
  { id: "h2", type: "help", title: "How to add signers", path: "/help", subtitle: "Participants and roles" },
  { id: "h3", type: "help", title: "Understanding the audit trail", path: "/help", subtitle: "Security and evidence" },
  { id: "h4", type: "help", title: "How to verify a document", path: "/help", subtitle: "Verification guide" },
  { id: "h5", type: "help", title: "Template management", path: "/help", subtitle: "Templates guide" },
];

function tokenMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  return text.toLowerCase().includes(q);
}

export interface SearchService {
  search(query: string): Promise<SearchResultGroup[]>;
}

class MockSearchService implements SearchService {
  async search(query: string): Promise<SearchResultGroup[]> {
    await delay(200);
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const docs: SearchResult[] = MOCK_TRANSACTIONS
      .filter((t) => tokenMatch(q, t.title))
      .slice(0, 4)
      .map((t) => ({
        id: t.id,
        type: "document" as const,
        title: t.title,
        subtitle: t.status.replace(/-/g, " "),
        path: `/app/documents/${t.id}`,
      }));

    const templates: SearchResult[] = MOCK_TEMPLATES
      .filter((t) => tokenMatch(q, t.name) || tokenMatch(q, t.description ?? ""))
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        type: "template" as const,
        title: t.name,
        subtitle: t.description,
        path: `/app/templates/${t.id}`,
      }));

    const contacts: SearchResult[] = MOCK_CONTACTS
      .filter((c) => tokenMatch(q, c.name) || tokenMatch(q, c.email) || tokenMatch(q, c.organization ?? ""))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        type: "contact" as const,
        title: c.name,
        subtitle: c.organization ?? c.email,
        path: `/app/contacts/${c.id}`,
      }));

    const help: SearchResult[] = HELP_ITEMS
      .filter((h) => tokenMatch(q, h.title) || tokenMatch(q, h.subtitle ?? ""))
      .slice(0, 2);

    const groups: SearchResultGroup[] = [];
    if (docs.length)      groups.push({ type: "document",  label: "Documents",  items: docs });
    if (templates.length) groups.push({ type: "template",  label: "Templates",  items: templates });
    if (contacts.length)  groups.push({ type: "contact",   label: "Contacts",   items: contacts });
    if (help.length)      groups.push({ type: "help",      label: "Help",       items: help });

    return groups;
  }
}

export const mockSearchService: SearchService = new MockSearchService();
