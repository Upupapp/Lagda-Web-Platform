// Command palette search against the real backend.
//
// ── Why the palette needed this ───────────────────────────────────────────
//
// Ctrl+K searched the MOCK global search service in every mode. On the live
// product that meant typing a real document's name returned fixture
// transactions, fixture contacts, fixture members and fixture notifications —
// records that do not exist, presented as search results beside real
// navigation. A result the user can click is a claim that the thing exists.
//
// ── What this returns ─────────────────────────────────────────────────────
//
//   Documents — the workspace's real signing requests, matched on the server
//   by title (the list endpoint's q filter), so it searches every document
//   and not just a page already loaded in the browser.
//
//   Settings and Help — taken from the mock service unchanged, because those
//   are not data: they are the product's own routes and help pages, and they
//   are the same in every mode.
//
// Nothing else. Contacts, members, templates and the rest have no real search
// surface yet, and showing nothing is accurate where showing fixtures is not.
//
// A result opens the Documents page filtered to that title rather than a
// per-document route: real documents open in the list's viewer dialog, and
// the filtered list is where every action on the row already lives.

import type {
  GlobalSearchResponse, GlobalSearchResult, GlobalSearchResultGroup,
  GlobalSearchResultId, GlobalSearchScope,
} from "../../models/search";
import { SEARCH_SCOPE_ICONS, SEARCH_SCOPE_LABELS } from "../../models/search";
import { globalSearchService } from "../mock/global-search.service";
import { SIGNING_REQUEST_STATUS } from "../signing-request-status";
import { realSigningRequestService } from "./signing-request.service";

/** The scopes that have a truthful source in real mode, in display order. */
export const REAL_PALETTE_SCOPES: readonly GlobalSearchScope[] = ["all", "documents", "settings", "help"];

/** Scopes whose mock results are static product routes, not data. */
const STATIC_SCOPES: ReadonlySet<GlobalSearchScope> = new Set(["settings", "help"]);

const MAX_DOCUMENTS = 5;

function titleCase(state: string): string {
  return state.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

async function documentGroup(
  workspaceId: string, query: string,
): Promise<GlobalSearchResultGroup | null> {
  const page = await realSigningRequestService.list(workspaceId, { q: query, perPage: MAX_DOCUMENTS });
  if (page.items.length === 0) return null;
  const lower = query.toLowerCase();
  return {
    scope: "documents",
    label: SEARCH_SCOPE_LABELS.documents,
    icon: SEARCH_SCOPE_ICONS.documents,
    results: page.items.map((item): GlobalSearchResult => {
      const status = SIGNING_REQUEST_STATUS[item.state];
      const start = item.documentTitle.toLowerCase().indexOf(lower);
      return {
        id: `sr_real_${item.signingRequestId}` as GlobalSearchResultId,
        type: item.state === "draft" ? "document-draft" : "document",
        title: item.documentTitle,
        description: titleCase(status),
        status,
        statusLabel: titleCase(status),
        updatedAt: item.createdAt,
        matchedFields: start < 0 ? [] : [{
          field: "title", label: "Title", text: item.documentTitle,
          ranges: [{ start, end: start + query.length }],
        }],
        // The server returns newest first; keep that order.
        matchScore: 100,
        destination: {
          type: "platform-route",
          path: `/app/documents?q=${encodeURIComponent(item.documentTitle)}`,
          requiresPermission: "view_documents",
        },
        availability: "available",
        // The type requires the literal. These results ARE live, which is
        // why the palette hides its demonstration notice in real mode.
        demonstrationOnly: true,
      };
    }),
    totalCount: page.total,
    hasMore: page.total > page.items.length,
  };
}

/**
 * Real documents plus the static route groups.
 *
 * A failed document search does not fail the palette: settings and help are
 * still true, and the source status says documents could not be reached
 * rather than reporting "no documents match".
 */
export async function searchPaletteReal(
  workspaceId: string | null,
  query: string,
  scope: GlobalSearchScope,
): Promise<GlobalSearchResponse> {
  const wantDocuments = scope === "all" || scope === "documents";
  let documents: GlobalSearchResultGroup | null = null;
  let documentsFailed = false;
  if (wantDocuments && workspaceId !== null) {
    try {
      documents = await documentGroup(workspaceId, query);
    } catch {
      documentsFailed = true;
    }
  }

  const statics = scope === "all" || STATIC_SCOPES.has(scope)
    ? globalSearchService.search({ query, scope, maxPerGroup: 5 }).groups
      .filter(group => STATIC_SCOPES.has(group.scope))
    : [];

  const groups = [...(documents ? [documents] : []), ...statics];
  return {
    query,
    scope,
    groups,
    totalPermittedCount: groups.reduce((sum, g) => sum + g.results.length, 0),
    sourceStatuses: REAL_PALETTE_SCOPES.filter(s => s !== "all").map(s => ({
      scope: s,
      status: s === "documents" && documentsFailed ? "unavailable" : "ok",
      label: SEARCH_SCOPE_LABELS[s],
    })),
    demonstrationOnly: true,
  };
}
