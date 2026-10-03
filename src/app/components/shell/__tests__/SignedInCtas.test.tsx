// A signed-in visitor on the public pages is sent into the app, not asked to
// create an account again: the home hero and closing banners say "Go to
// Dashboard" / "Prepare Document", the plan cards say "Manage your plan", and
// "Upload File" opens Prepare. While the session is still loading the pages
// keep the signed-out wording, so a signed-out visitor never sees them change.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const platform: { sessionStatus: string } = { sessionStatus: "unauthenticated" };
vi.mock("../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { EsigOverview } from "../../../pages/public/esignature/EsigOverview";
import { EsigCoreWorkflow } from "../../../pages/public/esignature/EsigCoreWorkflow";
import { Lawyers } from "../../../pages/public/solutions/Lawyers";
import { PricingOverview } from "../../../pages/public/pricing/PricingOverview";
import { ComparePlans } from "../../../pages/public/pricing/ComparePlans";
import { WorkflowPortalPage } from "../../../pages/public/workflow/WorkflowPortalPage";
import { TOP_NAV } from "../../../config/nav.config";

function renderPage(Page: () => React.ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}><Page /></MemoryRouter>);
}

const SIGNED_OUT_SENTENCE = "Create a free LAGDA account and send your first document today.";

describe("public CTAs for a signed-in visitor", () => {
  beforeEach(() => { platform.sessionStatus = "unauthenticated"; });

  it("signed out: the home page asks the visitor to create an account", () => {
    renderPage(EsigOverview);
    const links = screen.getAllByRole("link", { name: "Create Free Account" });
    expect(links.length).toBe(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/create-account");
    expect(screen.getByText(SIGNED_OUT_SENTENCE)).toBeInTheDocument();
  });

  it("while the session is loading, nothing changes from the signed-out page", () => {
    platform.sessionStatus = "initializing";
    renderPage(EsigOverview);
    expect(screen.getAllByRole("link", { name: "Create Free Account" }).length).toBe(2);
    expect(screen.queryByRole("link", { name: "Go to Dashboard" })).toBeNull();
  });

  it("signed in: the home hero goes to the dashboard and the closing banner to Prepare", () => {
    platform.sessionStatus = "authenticated";
    renderPage(EsigOverview);
    expect(screen.queryByRole("link", { name: "Create Free Account" })).toBeNull();
    expect(screen.queryByText(SIGNED_OUT_SENTENCE)).toBeNull();
    expect(screen.getByRole("link", { name: "Go to Dashboard" })).toHaveAttribute("href", "/app/dashboard");
    expect(screen.getByRole("link", { name: "Prepare Document" })).toHaveAttribute("href", "/app/prepare");
    expect(screen.getByRole("heading", { name: "Ready to send your next document?" })).toBeInTheDocument();
  });

  it("signed in: a solutions banner swaps its account button and copy", () => {
    platform.sessionStatus = "authenticated";
    renderPage(Lawyers, "/solutions/lawyers");
    expect(screen.queryByRole("link", { name: "Create Free Account" })).toBeNull();
    expect(screen.getByRole("link", { name: "Go to Dashboard" })).toHaveAttribute("href", "/app/dashboard");
    expect(screen.queryByRole("heading", { name: "Start with a free LAGDA account." })).toBeNull();
  });

  it("Upload File creates an account when signed out and opens Prepare when signed in", () => {
    const { unmount } = renderPage(EsigCoreWorkflow, "/esignature/core-workflow");
    expect(screen.getByRole("link", { name: /Upload File/ })).toHaveAttribute("href", "/create-account");
    unmount();
    platform.sessionStatus = "authenticated";
    renderPage(EsigCoreWorkflow, "/esignature/core-workflow");
    expect(screen.getByRole("link", { name: /Upload File/ })).toHaveAttribute("href", "/app/prepare");
  });

  it("plan cards say Manage your plan when signed in, and Create Account when not", () => {
    const { unmount } = renderPage(PricingOverview, "/pricing");
    let carousel = screen.getByTestId("public-plan-carousel");
    expect(within(within(carousel).getByTestId("public-plan-business")).getByRole("link", { name: "Create Account" }))
      .toHaveAttribute("href", "/create-account");
    unmount();

    platform.sessionStatus = "authenticated";
    renderPage(PricingOverview, "/pricing");
    carousel = screen.getByTestId("public-plan-carousel");
    for (const id of ["free", "personal", "business"]) {
      expect(within(within(carousel).getByTestId(`public-plan-${id}`)).getByRole("link", { name: "Manage your plan" }))
        .toHaveAttribute("href", "/app/settings/plan");
    }
    // Enterprise is Coming Soon and still goes to Contact.
    expect(within(within(carousel).getByTestId("public-plan-enterprise")).getByRole("link", { name: "Ask About Enterprise" }))
      .toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("link", { name: /Create (Free )?Account/ })).toBeNull();
  });

  it("the compare page's closing button manages the plan when signed in", () => {
    platform.sessionStatus = "authenticated";
    renderPage(ComparePlans, "/pricing/compare");
    // The page's plan cards and its closing button.
    const links = screen.getAllByRole("link", { name: "Manage your plan" });
    expect(links.length).toBe(4);
    for (const link of links) expect(link).toHaveAttribute("href", "/app/settings/plan");
    expect(screen.queryByRole("link", { name: /Create (Free )?Account/ })).toBeNull();
  });
});

describe("public plan prices match the app", () => {
  it("shows the in-app monthly prices, labelled as test-mode prices", () => {
    renderPage(PricingOverview, "/pricing");
    const carousel = screen.getByTestId("public-plan-carousel");
    const personal = within(carousel).getByTestId("public-plan-personal");
    const business = within(carousel).getByTestId("public-plan-business");
    expect(personal).toHaveTextContent("₱299 / month");
    expect(business).toHaveTextContent("₱799 per user / month");
    for (const card of [personal, business]) {
      expect(card).toHaveTextContent("Test-mode price · final price confirmed at launch");
      expect(card).not.toHaveTextContent("To be confirmed at launch");
    }
  });
});

describe("Document Workflows is shown as coming soon", () => {
  it("marks the menu item and the /workflow page", () => {
    const item = TOP_NAV.find(s => s.id === "esignature")?.items.find(i => i.path === "/workflow");
    expect(item?.isComingSoon).toBe(true);
    renderPage(WorkflowPortalPage, "/workflow");
    expect(screen.getByTestId("workflow-coming-soon")).toHaveTextContent("COMING SOON");
    expect(screen.getByTestId("workflow-coming-soon")).toHaveTextContent("Document Workflows is not available yet");
    expect(screen.queryByRole("link", { name: /Book a demo/i })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Contact us" })[0]).toHaveAttribute("href", "/contact");
  });
});
