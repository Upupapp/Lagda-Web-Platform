// Real preparation (field placement) service — talks to Lagda-Backend's
// GET/PUT .../preparation. There is no separate "fields" route: fields are
// the whole of a DocumentPreparation, replaced as one array per PUT (no
// per-field patch endpoint) and guarded by optimistic concurrency
// (`expectedRevision` — see save()). Bounded to exactly this; recipients
// live in recipient.service.ts, not here.

import { apiRequest } from "../api-client";

// Mirrors the backend's PreparationFieldType exactly (closed set — an
// unknown type is refused). The frontend's FieldType union is LARGER
// (multiline-text, radio-group, acknowledgment, sender-text have no backend
// equivalent yet) — see field-sync.ts's isBackendFieldType() for the
// boundary between what can be persisted and what stays local-only.
export type BackendFieldType =
  | "signature" | "initials" | "date-signed" | "text"
  | "checkbox" | "full-name" | "email" | "title" | "company";

export interface BackendRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackendPreparationField {
  fieldId: string;
  type: BackendFieldType;
  pageNumber: number;
  rect: BackendRect;
  required: boolean;
  label: string;
  layer: number;
  recipientId: string | null;
  /** 062. Set when the sender supplied the value; null when a recipient
   *  fills it. Exactly one of the two. */
  staticValue: string | null;
}

export interface BackendPreparationFieldInput {
  fieldId?: string;
  type: BackendFieldType;
  pageNumber: number;
  rect: BackendRect;
  required: boolean;
  label: string;
  layer: number;
  recipientId?: string | null;
  /**
   * A value the SENDER supplied, rendered into the document without
   * pretending a recipient typed it — migration 062's `static_value`.
   *
   * Mutually exclusive with `recipientId`: a field is either signed by
   * somebody or filled in advance, and the backend refuses both-set and
   * neither-set. This is how a template variable's value reaches a real
   * preparation; before this existed the frontend had no vocabulary for
   * static values at all, so the column had a destination and no producer.
   */
  staticValue?: string | null;
}

export interface RealPreparation {
  preparationId: string;
  documentId: string;
  pageCount: number;
  state: "editable" | "locked";
  revision: number;
  fields: BackendPreparationField[];
  createdAt: string;
  updatedAt: string;
}

class RealPreparationService {
  async get(workspaceId: string, documentId: string): Promise<RealPreparation> {
    return apiRequest<RealPreparation>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/preparation`,
    );
  }

  // Full replace. `expectedRevision` is the last-known revision (0 before
  // any save has ever happened) — the caller must have just read it from
  // get()'s response (or a prior save()'s), never a stale/local guess, or
  // the backend correctly refuses this as a lost-update risk.
  async save(
    workspaceId: string, documentId: string,
    expectedRevision: number, fields: BackendPreparationFieldInput[],
  ): Promise<RealPreparation> {
    return apiRequest<RealPreparation>(
      `/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/preparation`,
      { method: "PUT", body: { expectedRevision, fields } },
    );
  }
}

export const realPreparationService = new RealPreparationService();
