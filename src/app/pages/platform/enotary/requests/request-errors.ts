// Why a client's action on a request to a notary failed, in plain words.
//
// A renewal is a new request to the notary, and a notary is Online only in their
// office hours (Monday to Friday, 8:00 AM to 5:00 PM, Philippine time): outside
// them the server refuses it with 409 `enotary_notary_offline` and a sentence
// of its own, which is what the client is shown.

import { ApiError } from "../../../../services/api-client";
import { describeInvitationError, errorCode } from "../../../../services/real/enotary-invitations.service";

/** The words for a notary who is offline, should the server's own sentence be missing. */
export const NOTARY_OFFLINE_WORDS =
  "This notary is offline. Requests can be sent Monday to Friday, 8:00 AM to 5:00 PM (Philippine time).";

export function describeRequestError(error: unknown): string {
  if (errorCode(error) !== "enotary_notary_offline") return describeInvitationError(error);
  const said = error instanceof ApiError ? (error.body?.message ?? "").trim() : "";
  return said !== "" ? said : NOTARY_OFFLINE_WORDS;
}
