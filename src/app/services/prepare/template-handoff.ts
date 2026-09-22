// Hands a template-built draft across to the Prepare flow.
//
// ── Why this exists ─────────────────────────────────────────────────────────
//
// PrepareProvider wraps `/app/prepare/*` ONLY (see router.tsx). The Use
// Template page lives at `/app/templates/:id/use`, outside it, so it cannot
// call usePrepare() — there is no provider above it to call into.
//
// What it can do is leave the finished draft where PrepareProvider looks when
// it mounts. `hydratedInitialState()` reads PERSISTENCE_KEYS.prepareDraft and
// re-seeds the service from it; that is the existing, already-load-bearing
// handoff path (it is how a page refresh mid-preparation survives at all), not
// a new side channel invented here.
//
// So: create the draft through the service that owns drafts, write it to that
// one key, navigate. The provider picks it up on mount exactly as it picks up
// a reloaded draft.

import type { PreparationDraft } from "../../models/prepare";
import type { TemplateApplication } from "../../models/templates";
import { prepareService } from "../mock/prepare.service";
import { writeJSON, PERSISTENCE_KEYS } from "../local-persistence";

/** Where the Prepare flow begins. A template supplies who and in what order,
 *  never the file itself — the templates in this build carry placeholder
 *  documents, so the visitor still chooses the real one. */
export const TEMPLATE_HANDOFF_ROUTE = "/app/prepare/upload";

export interface TemplateHandoffResult {
  ok: boolean;
  draft?: PreparationDraft;
  route?: string;
  errorMessage?: string;
}

/**
 * Creates the draft and stages it for PrepareProvider.
 *
 * NOTE — this replaces whatever draft was in progress, the same way
 * PrepareEntryPage's "Start new" does. Launching a template is an equally
 * explicit act, so it behaves the same way rather than inventing a different
 * rule; a confirmation prompt for BOTH paths would be a separate change.
 */
export async function handOffTemplateToPrepare(
  templateId: string,
  application: TemplateApplication,
): Promise<TemplateHandoffResult> {
  try {
    const draft = await prepareService.createDraft({
      source: "template",
      // Provenance only — nothing resolves participants or routing through it.
      templateId,
      templateApplication: application,
    });

    writeJSON(PERSISTENCE_KEYS.prepareDraft, draft);

    return { ok: true, draft, route: TEMPLATE_HANDOFF_ROUTE };
  } catch {
    return {
      ok: false,
      errorMessage: "The draft could not be created. Please try again.",
    };
  }
}
