// Things LAGDA has not built — SMS codes, signer authenticator codes,
// enterprise SSO, an API and webhooks — may be mentioned on the public pages
// only as PLANNED. They used to be listed among the available signer
// authentication methods and as Enterprise features one could buy.
//
// The rule checked here is on the rendered page, where a visitor reads it:
// wherever one of those is named, the same card, row or paragraph also says
// it is planned or not available.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SignerAuth } from "../features/SignerAuth";
import { IdentityAwareSigning } from "../features/IdentityAwareSigning";
import { StoragePlanLimits } from "../features/StoragePlanLimits";
import { ApiIntegrations } from "../features/ApiIntegrations";
import { FeaturesOverview } from "../features/FeaturesOverview";
import { SecuritySignerAuth } from "../security/SecuritySignerAuth";
import { IdentityVerification } from "../security/IdentityVerification";
import { AccountSecurity } from "../security/AccountSecurity";
import { SecurityOverview } from "../security/SecurityOverview";
import { AuthGuide } from "../resources/AuthGuide";
import { SecurityGuide } from "../resources/SecurityGuide";
import { ResourcesFaq } from "../resources/ResourcesFaq";
import { GuidesOverview } from "../resources/GuidesOverview";
import { EsigAdvancedCapabilities } from "../esignature/EsigAdvancedCapabilities";
import { EsigOverview } from "../esignature/EsigOverview";
import { SolutionsOverview } from "../solutions/SolutionsOverview";
import { Lawyers } from "../solutions/Lawyers";
import { AUTH_METHODS } from "../features/content";
import { AUTH_COMPARISON } from "../security/content";

const PAGES = [
  ["/features", FeaturesOverview],
  ["/features/signer-authentication", SignerAuth],
  ["/features/identity-aware-signing", IdentityAwareSigning],
  ["/features/storage-and-plan-limits", StoragePlanLimits],
  ["/features/api-and-integrations", ApiIntegrations],
  ["/security", SecurityOverview],
  ["/security/signer-authentication", SecuritySignerAuth],
  ["/security/identity-verification", IdentityVerification],
  ["/security/account-security", AccountSecurity],
  ["/resources/authentication-guide", AuthGuide],
  ["/resources/security-guide", SecurityGuide],
  ["/resources/faq", ResourcesFaq],
  ["/resources/guides", GuidesOverview],
  ["/esignature", EsigOverview],
  ["/esignature/advanced-capabilities", EsigAdvancedCapabilities],
  ["/solutions", SolutionsOverview],
  ["/solutions/lawyers", Lawyers],
] as const;

/** Named on a page only as something planned. */
const UNBUILT = /\bSMS\b|\bSSO\b|single sign-on|webhook|\bAPI\b|\bAPIs\b|\bTOTP\b/i;
// No word boundaries: `textContent` joins neighbouring cells with no space
// between them ("SMS OTP" + "Planned" reads "SMS OTPPlanned").
const SAYS_PLANNED = /planned|not (yet )?available|not built|do(es)? not exist|no public API/i;

/** The nearest enclosing block that says it is planned, within a few levels. */
function saysPlannedNearby(node: Node): boolean {
  let element: HTMLElement | null = node.parentElement;
  for (let depth = 0; depth < 6 && element !== null; depth += 1) {
    if (SAYS_PLANNED.test(element.textContent ?? "")) return true;
    // A whole page section is too far away to count as "beside" the claim.
    if ((element.textContent ?? "").length > 1400) return false;
    element = element.parentElement;
  }
  return false;
}

function unqualifiedClaims(root: HTMLElement): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found: string[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    if (!UNBUILT.test(text)) continue;
    // CSS in a <style> block is not something a visitor reads.
    if (node.parentElement?.closest("style, script") !== null && node.parentElement?.closest("style, script") !== undefined) continue;
    if (!saysPlannedNearby(node)) found.push(text.trim().slice(0, 140));
  }
  return found;
}

describe("unbuilt features on the public pages", () => {
  for (const [path, Page] of PAGES) {
    it(`${path} names them only as planned`, () => {
      const { container } = render(<MemoryRouter initialEntries={[path]}><Page /></MemoryRouter>);
      expect(unqualifiedClaims(container), `${path} offers something unbuilt without saying it is planned`).toEqual([]);
    });
  }

  it("marks the same methods Planned in the data both method tables are built from", () => {
    const planned = ["SMS OTP", "Authenticator app", "Enterprise SSO"];
    for (const method of planned) {
      expect(AUTH_METHODS.find(m => m.method === method)?.tier, `features: ${method}`).toBe("Planned");
      expect(AUTH_COMPARISON.find(m => m.method === method)?.tier, `security: ${method}`).toBe("Planned");
    }
    // What a signer can really be asked for stays available.
    for (const method of ["Secure invitation link", "Email OTP", "Account authentication"]) {
      expect(AUTH_METHODS.find(m => m.method === method)?.tier, method).toBe("Core");
    }
  });

  it("says plainly on the API page that there is no API", () => {
    const { container } = render(<MemoryRouter><ApiIntegrations /></MemoryRouter>);
    expect(screen.getByTestId("api-planned-notice")).toHaveTextContent("LAGDA has no public API and no webhooks today");
    expect(container.textContent).not.toMatch(/API access is available/i);
    expect(container.textContent).not.toMatch(/Contact Sales to discuss Enterprise API access/i);
  });
});
