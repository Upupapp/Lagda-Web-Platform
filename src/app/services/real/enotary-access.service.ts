// The eNotary gate: whether this account may enter the eNotary environment
// right now, and what it must do first.
//
// Workspace realm (apiRequest), about the PERSON: every route is under `/me`.
// The server decides everything here. `required` says what stands between
// the person and the environment; `granted` says nothing does; this client
// lets nobody in and keeps nobody out.
//
// ── The feature may be off ─────────────────────────────────────────────────
//
// A 404 from the access route means eNotary is not offered here and is
// answered with `null`: no menu entry, no page, never an error.
//
// ── Where the result comes from ────────────────────────────────────────────
//
// As with account verification, `refresh` is what asks the partner now. A
// page waiting on a check calls it; it never depends on being told.

import { apiRequest, ApiError } from "../api-client";
import type { EnotaryRole } from "../../models/identity-check";
import type { AccountIdentityStatus, AccountNameMatch, ProviderSession } from "./account-identity.service";

/**
 * What stands between the person and the environment.
 *
 *   none               nothing: they may enter
 *   face               a quick face check against their earlier verification
 *   full               their ID and a face check
 *   attorney-approval  a notary whose account has not been approved
 *   profile-name       verified, but the ID's name is not the profile's
 */
export type EnotaryRequirement = "none" | "face" | "full" | "attorney-approval" | "profile-name";

export interface EnotaryAccess {
  /** Whether eNotary is offered to this account at all. */
  available: boolean;
  role: EnotaryRole;
  /** Null for a client, of whom no approval is asked. */
  attorneyApproved: boolean | null;
  account: {
    status: AccountIdentityStatus;
    verifiedName: string | null;
    validUntil: string | null;
  };
  required: EnotaryRequirement;
  granted: boolean;
  grantedUntil: string | null;
  pendingReview: boolean;
  nameMatchesProfile: AccountNameMatch | null;
  /**
   * Only on the answer to `refresh`, never on the read: the last visit ended
   * without a pass. Stays `declined` until a new visit is opened.
   */
  lastOutcome?: "declined" | null;
}

function isStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

class RealEnotaryAccessService {
  /** Where this account stands for a role. `null`: eNotary is not offered. */
  async read(role: EnotaryRole): Promise<EnotaryAccess | null> {
    try {
      return await apiRequest<EnotaryAccess>(`/me/enotary/access?role=${encodeURIComponent(role)}`);
    } catch (error) {
      if (isStatus(error, 404)) return null;
      throw error;
    }
  }

  /**
   * Opens a visit to the partner's page for this role. Refused with 409
   * `enotary_attorney_not_approved`, `enotary_access_not_required`,
   * `enotary_profile_name_mismatch` or `identity_check_unavailable`.
   */
  async startSession(role: EnotaryRole): Promise<ProviderSession> {
    return apiRequest<ProviderSession>("/me/enotary/access/session", {
      method: "POST", body: { role, consent: true },
    });
  }

  /** Asks the partner where the check stands, and answers with the access as it now is. */
  async refresh(role: EnotaryRole): Promise<EnotaryAccess> {
    return apiRequest<EnotaryAccess>("/me/enotary/access/refresh", { method: "POST", body: { role } });
  }
}

export const realEnotaryAccessService = new RealEnotaryAccessService();

/** True while the server says this person may be in the environment, by this device's clock too. */
export function enotaryGrantStands(access: Pick<EnotaryAccess, "granted" | "required" | "grantedUntil">, now: number): boolean {
  // A notary whose approval was removed is out, whatever time was once given.
  if (access.required === "attorney-approval") return false;
  if (!access.granted && access.required !== "none") return false;
  if (access.grantedUntil === null) return true;
  const until = Date.parse(access.grantedUntil);
  // A time that cannot be read is the server's to enforce, not a reason to refuse.
  return !Number.isFinite(until) || until > now;
}
