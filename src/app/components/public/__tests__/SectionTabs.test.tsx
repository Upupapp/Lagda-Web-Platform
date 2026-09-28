// The public section sub-navigations all render through SectionTabs. These
// tests pin the contract the old hand-rolled strips had — one landmark per
// strip, every route kept, exactly one aria-current — plus the new pieces:
// an icon per tab and the sliding indicator.

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { EsigSubNav } from "../../esignature/EsigSubNav";
import { SecuritySubNav } from "../../security/SecuritySubNav";
import { SolutionsSubNav } from "../../solutions/SolutionsSubNav";
import { FeaturesSubNav } from "../../features/FeaturesSubNav";
import { PricingSubNav } from "../../pricing/PricingComponents";
import { ResourcesSubNav } from "../../resources/ResourceComponents";
import { EnotarySubNav } from "../../enotary/EnotaryComponents";
import { ESIG_SUBNAV } from "../../../pages/public/esignature/content";
import { SECURITY_SUBNAV } from "../../../pages/public/security/content";
import { SOLUTIONS_NAV } from "../../../pages/public/solutions/content";
import { PRICING_SUBNAV } from "../../../pages/public/pricing/content";
import { RESOURCES_SUBNAV } from "../../../pages/public/resources/content";
import { ENOTARY_SUBNAV } from "../../../pages/public/enotary/content";

function at(path: string, el: React.ReactElement) {
  return render(<MemoryRouter initialEntries={[path]}>{el}</MemoryRouter>);
}

const CASES: Array<{
  name: string;
  nav: string;
  el: React.ReactElement;
  path: string;
  activeLabel: string;
  items: ReadonlyArray<{ label: string; path: string }>;
}> = [
  { name: "eSignature", nav: "eSignature pages", el: <EsigSubNav />, path: "/esignature/core-workflow", activeLabel: "Core Workflow", items: ESIG_SUBNAV },
  { name: "Security", nav: "Security pages", el: <SecuritySubNav />, path: "/security/trust-center", activeLabel: "Trust Center", items: SECURITY_SUBNAV },
  { name: "Solutions", nav: "Solutions navigation", el: <SolutionsSubNav />, path: "/solutions/finance", activeLabel: "Finance", items: SOLUTIONS_NAV },
  { name: "Pricing", nav: "Pricing navigation", el: <PricingSubNav />, path: "/pricing/compare", activeLabel: "Compare Plans", items: PRICING_SUBNAV },
  { name: "Resources", nav: "Resources navigation", el: <ResourcesSubNav />, path: "/resources/guides", activeLabel: "Guides", items: RESOURCES_SUBNAV },
  { name: "eNotary", nav: "eNotary navigation", el: <EnotarySubNav />, path: "/enotary/faq", activeLabel: "FAQ", items: ENOTARY_SUBNAV },
];

describe.each(CASES)("$name sub-navigation", ({ nav, el, path, activeLabel, items }) => {
  it("keeps every route, an icon per tab, and exactly one aria-current", () => {
    at(path, el);
    const landmark = screen.getByRole("navigation", { name: nav });
    const links = within(landmark).getAllByRole("link");
    expect(links).toHaveLength(items.length);
    for (const item of items) {
      const link = within(landmark).getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.path);
      expect(link.querySelector(".lsn-ico svg")).not.toBeNull();
    }
    const current = links.filter((l) => l.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(activeLabel);
    expect(current[0]).toHaveAttribute("data-active", "true");
  });

  it("renders the sliding indicator, hidden from assistive technology", () => {
    const { container } = at(path, el);
    const indicator = container.querySelector(".lsn-indicator");
    expect(indicator).not.toBeNull();
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });
});

describe("sub-navigation specifics", () => {
  it("eNotary alone uses the eNotary tone", () => {
    const { unmount } = at("/enotary", <EnotarySubNav />);
    expect(screen.getByRole("navigation", { name: "eNotary navigation" })).toHaveAttribute("data-tone", "enotary");
    unmount();
    at("/esignature", <EsigSubNav />);
    expect(screen.getByRole("navigation", { name: "eSignature pages" })).toHaveAttribute("data-tone", "azure");
  });

  it("eSignature Overview is current only on the overview route", () => {
    at("/esignature", <EsigSubNav />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Core Workflow" })).not.toHaveAttribute("aria-current");
  });

  it("Solutions shows one heading per group, in order", () => {
    at("/solutions/lawyers", <SolutionsSubNav />);
    const landmark = screen.getByRole("navigation", { name: "Solutions navigation" });
    const headings = [...landmark.querySelectorAll(".lsn-group-label")].map((n) => n.textContent);
    expect(headings).toEqual(["Legal", "Business", "Property & Services", "Public & Institutional"]);
  });

  it("Features maps groups to their landing links", () => {
    at("/features/audit-trail", <FeaturesSubNav />);
    const link = screen.getByRole("link", { name: "Trust & Evidence" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("href", "/features/signer-authentication");
  });
});
