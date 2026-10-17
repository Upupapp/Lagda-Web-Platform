// The eNotary overview is now the static Notary Directory at
// /enotary-directory/, served from this same site but NOT a route of this app.
// Pinned here: /enotary hands the browser over to it; every menu entry for it
// points there; and following one is a full page load, never a client-side
// navigation (which would land on the app's own "not found" page).

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { ENOTARY_DIRECTORY_PATH, isStaticSitePath } from "../../../../config/enotary-directory";
import { TOP_NAV, FOOTER_COLUMNS } from "../../../../config/nav.config";
import { ENOTARY_SUBNAV, ENOTARY_FAQ_GROUPS } from "../content";
import { EnotarySubNav } from "../../../../components/enotary/EnotaryComponents";
import { FullPageRedirect } from "../../../../components/shell/FullPageRedirect";

const original = window.location;
afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: original });
});

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

describe("the Notary Directory", () => {
  it("lives at the fixed same-site path", () => {
    expect(ENOTARY_DIRECTORY_PATH).toBe("/enotary-directory/");
    expect(isStaticSitePath("/enotary-directory/")).toBe(true);
    expect(isStaticSitePath("/enotary-directory")).toBe(true);
    expect(isStaticSitePath("/enotary")).toBe(false);
    expect(isStaticSitePath("/enotary/faq")).toBe(false);
  });

  it("/enotary and /app/enotary replace themselves with the directory, with a plain link meanwhile", () => {
    const replace = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, replace } });
    render(<FullPageRedirect to={ENOTARY_DIRECTORY_PATH} label="Go to the LAGDA Notary Directory" />);
    expect(replace).toHaveBeenCalledWith("/enotary-directory/");
    expect(screen.getByRole("link", { name: "Go to the LAGDA Notary Directory" })).toHaveAttribute("href", "/enotary-directory/");
  });

  it("is what the header, the footer and the eNotary tabs lead to, instead of /enotary", () => {
    const section = TOP_NAV.find(nav => nav.id === "enotary");
    expect(section?.path).toBe(ENOTARY_DIRECTORY_PATH);
    expect(section?.items.find(item => item.label === "Notary Directory")?.path).toBe(ENOTARY_DIRECTORY_PATH);
    const footer = FOOTER_COLUMNS.find(column => column.heading === "eNotary");
    expect(footer?.links.find(link => link.label === "Notary Directory")?.path).toBe(ENOTARY_DIRECTORY_PATH);
    expect(ENOTARY_SUBNAV.find(tab => tab.label === "Notary Directory")?.path).toBe(ENOTARY_DIRECTORY_PATH);

    const everyPath = [
      ...TOP_NAV.flatMap(nav => [nav.path, ...nav.items.map(item => item.path)]),
      ...FOOTER_COLUMNS.flatMap(column => column.links.map(link => link.path)),
      ...ENOTARY_SUBNAV.map(tab => tab.path),
    ];
    expect(everyPath).not.toContain("/enotary");
    // The other eNotary pages stay reachable.
    for (const path of ["/enotary/future-capabilities", "/enotary/accreditation-roadmap", "/enotary/waitlist", "/enotary/faq"]) {
      expect(ENOTARY_SUBNAV.map(tab => tab.path)).toContain(path);
    }
  });

  it("is reached with a full page load from the eNotary tabs, not a client-side route", async () => {
    render(
      <MemoryRouter initialEntries={["/enotary/faq"]}>
        <Routes><Route path="*" element={<><EnotarySubNav /><Where /></>} /></Routes>
      </MemoryRouter>,
    );
    const tab = screen.getByRole("link", { name: "Notary Directory" });
    expect(tab).toHaveAttribute("href", "/enotary-directory/");
    expect(tab).not.toHaveAttribute("aria-current");
    await userEvent.click(tab);
    // The router did not take the click: the browser loads the directory.
    expect(screen.getByTestId("where")).toHaveTextContent("/enotary/faq");

    // A normal tab is still a client-side route.
    await userEvent.click(screen.getByRole("link", { name: "Waitlist" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/enotary/waitlist");
  });

  it("is described honestly: browse and register interest, sessions not open", () => {
    const answer = ENOTARY_FAQ_GROUPS.flatMap(group => group.items).find(item => item.id === "notary-directory")?.a ?? "";
    expect(answer).toContain("browse notaries public and register your interest");
    expect(answer).toContain("eNotary sessions are not open yet");
    expect(answer).toContain("Subject to Supreme Court Accreditation and applicable rules");
  });
});
