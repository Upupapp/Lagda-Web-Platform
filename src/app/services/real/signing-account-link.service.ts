// The account-binding handoff, client side.
//
// ── Two clients, deliberately ─────────────────────────────────────────────
//
// Minting goes through `recipientApiRequest` and claiming through
// `apiRequest`, because they are requests in two different credential realms
// and each has its own cookie and its own CSRF token. Using one client for
// both would not merely be untidy — it would not work, and the reason it
// would not work is the boundary this feature is built to respect.
//
// ── Why the code never touches storage ────────────────────────────────────
//
// It is a credential with a two-minute life. It travels from the signing tab
// to the sign-in tab in the URL that opens that tab, is claimed once, and is
// then dead. Putting it in localStorage would outlive its purpose and survive
// a browser restart, for no gain — the tab that needs it is opened in the same
// gesture that mints it.

import { apiRequest } from "../api-client";
import { recipientApiRequest } from "../recipient-api-client";

export interface MintedHandoff {
  /** Opaque. Held in memory, passed once, never stored. */
  code: string;
  expiresAt: string;
}

export interface ClaimedHandoff {
  signingRequestId: string;
  recipientId: string;
}

class RealSigningAccountLinkService {
  /**
   * RECIPIENT realm. Mints a code saying "whoever presents this claims to be
   * the account for this recipient's address".
   *
   * It binds nothing. This realm has no idea who is signed in elsewhere, and
   * finding out would mean reading across the boundary that keeps a signer
   * with no account unreachable from the workspace surface.
   */
  async mintHandoff(): Promise<MintedHandoff> {
    return recipientApiRequest<MintedHandoff>("/signing/ceremony/link-intent", {
      method: "POST",
    });
  }

  /**
   * WORKSPACE realm. Claims a code as the signed-in account.
   *
   * Grants nothing: no ceremony opens and no document becomes readable. The
   * ceremony remains gated by the credential from the emailed link.
   */
  async claimHandoff(code: string): Promise<ClaimedHandoff> {
    return apiRequest<ClaimedHandoff>("/me/signing-links", {
      method: "POST",
      body: { code },
    });
  }
}

export const realSigningAccountLinkService = new RealSigningAccountLinkService();
