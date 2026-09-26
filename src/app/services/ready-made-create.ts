// "Use this template": copy one ready-made template into the workspace as an
// ordinary template — roles first, so its signature fields have real slots to
// bind to, then the generated document.

import { ApiError } from "./api-client";
import {
  createTemplate, generateTemplateDocument, saveResolvedFieldAnchors,
} from "./templates-source";
import {
  buildReadyMadeDocument, readyMadePlaceholders, type ReadyMadeTemplate,
} from "./ready-made-templates";
import type { DocumentTemplate } from "../models/templates";

/** The backend's name column is 200 characters; leave room for " (12)". */
const NAME_MAX = 190;
const MAX_NAME_ATTEMPTS = 20;

export function readyMadeCopyName(title: string, attempt: number): string {
  const base = title.trim().slice(0, NAME_MAX);
  return attempt <= 1 ? base : `${base} (${String(attempt)})`;
}

const isNameConflict = (err: unknown) => err instanceof ApiError && err.status === 409;

export interface ReadyMadeCopyResult {
  readonly template: DocumentTemplate;
  /** False when the roles were saved but the document could not be generated. */
  readonly documentGenerated: boolean;
}

export async function copyReadyMadeTemplate(
  workspaceId: string | undefined, source: ReadyMadeTemplate,
): Promise<ReadyMadeCopyResult> {
  // A second copy of the same card is legitimate; the workspace just can't
  // hold two templates with one name.
  let created: DocumentTemplate | undefined;
  for (let attempt = 1; created === undefined; attempt += 1) {
    try {
      created = await createTemplate(workspaceId, {
        name: readyMadeCopyName(source.title, attempt),
        routingMode: "sequential",
        placeholders: readyMadePlaceholders(source),
        notifySenderOnComplete: true,
        variables: [],
      });
    } catch (err) {
      if (!isNameConflict(err) || attempt >= MAX_NAME_ATTEMPTS) throw err;
    }
  }

  try {
    const content = buildReadyMadeDocument(source, created.placeholders);
    const { template, resolvedAnchors } = await generateTemplateDocument(workspaceId, created.id, { content });
    if (resolvedAnchors.length > 0) {
      await saveResolvedFieldAnchors(workspaceId, created.id, resolvedAnchors);
    }
    return { template, documentGenerated: true };
  } catch {
    // The template exists with its roles; the author page can generate the
    // document again, so this is not worth failing the whole copy over.
    return { template: created, documentGenerated: false };
  }
}
