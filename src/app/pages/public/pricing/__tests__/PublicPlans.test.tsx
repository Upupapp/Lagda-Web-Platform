// The public plan pages say only what LAGDA does today: Free, Personal and
// Business as they work in the product, Enterprise as Coming Soon, the
// workspace roles that exist, and nothing unbuilt (SMS codes, signer
// authenticator apps, SSO, APIs and webhooks, organisation policies, a
// billing administrator, usage reports).

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PricingOverview } from "../PricingOverview";
import { ComparePlans } from "../ComparePlans";
import { AuthByPlan } from "../AuthByPlan";
import { EnterprisePricing } from "../EnterprisePricing";
import { TemplatesByPlan } from "../TemplatesByPlan";
import { PricingFaq } from "../PricingFaq";
import { EsigTeamEnterprise } from "../../esignature/EsigTeamEnterprise";
import { WORKSPACE_ROLES } from "../../esignature/content";
import { WORKSPACE_ROLES as FEATURE_ROLES } from "../../features/content";
import { REAL_ROLE_LABELS } from "../../../../services/real/workspace-admin.service";

const PAGES = [
  ["/pricing", PricingOverview], ["/pricing/compare", ComparePlans], ["/pricing/authentication-by-plan", AuthByPlan],
  ["/pricing/enterprise", EnterprisePricing], ["/pricing/templates-by-plan", TemplatesByPlan], ["/pricing/faq", PricingFaq],
  ["/esignature/team-and-enterprise", EsigTeamEnterprise],
] as const;

const UNBUILT = [/\bSMS\b/, /TOTP/, /\bSSO\b/, /single sign-on/i, /webhook/i, /provisioning/i, /billing administrator/i,
  /free trial/i, /average completion time/i, /retention controls/i, /session management/i];

describe("public plan pages", () => {
  for (const [path, Page] of PAGES) {
    it(`${path} offers nothing unbuilt`, () => {
      render(<MemoryRouter initialEntries={[path]}><Page /></MemoryRouter>);
      const text = document.body.textContent ?? "";
      for (const claim of UNBUILT) expect(text, `${path} still says ${String(claim)}`).not.toMatch(claim);
    });
  }

  it("shows four plans, Enterprise coming soon, in the plan carousel", () => {
    render(<MemoryRouter><PricingOverview /></MemoryRouter>);
    const carousel = screen.getByTestId("public-plan-carousel");
    expect(within(carousel).getAllByRole("group").map(g => g.getAttribute("aria-label"))).toEqual(["1 of 4", "2 of 4", "3 of 4", "4 of 4"]);
    expect(within(carousel).getByTestId("public-plan-free").textContent).toContain("₱0");
    expect(within(carousel).getByTestId("public-plan-enterprise").textContent).toContain("COMING SOON");
  });

  it("lists exactly the workspace roles the product has, on both pages", () => {
    expect(WORKSPACE_ROLES.map(r => r.role).sort()).toEqual(Object.values(REAL_ROLE_LABELS).sort());
    expect(FEATURE_ROLES).toBe(WORKSPACE_ROLES);
  });
});
