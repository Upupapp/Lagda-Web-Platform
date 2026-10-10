// The drafts there are to resume, for the Prepare entry page.
//
// The same three reads, under the same keys, as Documents › Draft (see
// services/documents/draft-list.ts): opening one screen after the other shows
// the list at once and re-reads behind it. Nothing is read in the demo build
// or outside a workspace.

import { useMemo } from "react";
import { useLiveQuery } from "../services/live/live-query";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { draftSources, selectDraftList, type DraftListEntry } from "../services/documents/draft-list";

export function useDraftList(workspaceId: string | undefined): DraftListEntry[] {
  const id = USE_REAL_BACKEND && workspaceId !== undefined ? workspaceId : null;

  const files = useLiveQuery(
    id === null ? null : draftSources.filesKey(id),
    () => draftSources.readFiles(id ?? ""),
    { topics: ["documents"] },
  );
  const requests = useLiveQuery(
    id === null ? null : draftSources.requestsKey(id),
    () => draftSources.readRequests(id ?? ""),
    { topics: ["documents"] },
  );
  const templateDocuments = useLiveQuery(
    id === null ? null : draftSources.templateDocumentsKey(id),
    () => draftSources.readTemplateDocumentIds(id ?? ""),
    { topics: ["documents"] },
  );

  return useMemo(
    () => selectDraftList(files.data?.items, requests.data?.items, templateDocuments.data),
    [files.data, requests.data, templateDocuments.data],
  );
}
