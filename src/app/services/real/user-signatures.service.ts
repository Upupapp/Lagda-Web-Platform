// The saved-signature library — talks to the backend's /me/signatures routes.
//
// ── What a saved signature is ─────────────────────────────────────────────
//
// A PREFERENCE, not evidence. It is a mark someone kept so they need not
// redraw it. Applying one during a ceremony will insert a fresh evidence row
// with its own digest; nothing in the audit trail ever points at this library,
// which is what lets a user delete an entry without a signed document losing
// the thing it was signed with.
//
// ── The shapes are the ceremony's shapes ──────────────────────────────────
//
// `SignatureValue` is imported from SignatureCapture rather than restated
// here. A library that could hold something the ceremony would refuse is a
// library that fails at the moment of signing, and the way to make that
// impossible is to have one type rather than two that look alike.

import { apiRequest } from "../api-client";
import type { SignatureValue } from "../../components/recipient/SignatureCapture";

/** The two marks a ceremony can ask for. */
export type SignaturePurpose = "signature" | "initials";

export interface SavedSignature {
  purpose: SignaturePurpose;
  method: "typed" | "drawn";
  /** Typed only. */
  text?: string;
  styleIndex?: number;
  /** Drawn only — raw base64, no data-URL prefix. */
  base64?: string;
  width?: number;
  height?: number;
  /** SHA-256 of the stored bytes, computed server-side. */
  digest: string;
  /** Null means stored but not usable. Nothing should offer it for signing. */
  validatedAt: string | null;
  updatedAt: string;
}

interface SavedSignatureList {
  signatures: SavedSignature[];
}

/** Turns a saved entry back into the value the capture component speaks. */
export function toSignatureValue(saved: SavedSignature): SignatureValue | null {
  if (saved.method === "typed") {
    return saved.text === undefined || saved.styleIndex === undefined
      ? null
      : { method: "typed", text: saved.text, styleIndex: saved.styleIndex };
  }
  return saved.base64 === undefined
    ? null
    : { method: "drawn", base64: saved.base64 };
}

/** A data URL for previewing a drawn entry. The API never sends one. */
export function toPreviewDataUrl(saved: SavedSignature): string | null {
  return saved.method === "drawn" && saved.base64 !== undefined
    ? `data:image/png;base64,${saved.base64}`
    : null;
}

class RealUserSignatureService {
  async list(): Promise<SavedSignature[]> {
    const result = await apiRequest<SavedSignatureList>("/me/signatures");
    return result.signatures;
  }

  /**
   * Saves or replaces the entry for a purpose.
   *
   * PUT rather than POST because the server keeps at most one per purpose —
   * enforced by a UNIQUE constraint, not by counting — so saving twice is
   * replacing, and replacing is idempotent.
   */
  async save(purpose: SignaturePurpose, representation: SignatureValue): Promise<SavedSignature> {
    return apiRequest<SavedSignature>(`/me/signatures/${purpose}`, {
      method: "PUT",
      body: { representation },
    });
  }

  async remove(purpose: SignaturePurpose): Promise<void> {
    await apiRequest<void>(`/me/signatures/${purpose}`, { method: "DELETE" });
  }
}

export const realUserSignatureService = new RealUserSignatureService();
