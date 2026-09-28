// Public marketing header: icons on every top-nav trigger, the cropped logo,
// and the unchanged auth-dependent actions (Sign In / Create Free Account when
// signed out, the Dashboard avatar button when signed in).
//
// jsdom does not evaluate media queries, so the desktop-only row stays
// display:none here; desktop queries therefore pass `hidden: true`.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const platform: { sessionStatus: string; user: null | { displayName: string } } = {
  sessionStatus: "unauthenticated",
  user: null,
};
vi.mock("../../../context/PlatformContext", () => ({ usePlatform: () => platform }));
vi.mock("../../platform/UserAvatar", () => ({ UserAvatar: () => <span data-testid="avatar" /> }));

import { PublicHeader } from "../PublicHeader";

function renderAt(path = "/esignature") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PublicHeader />
    </MemoryRouter>,
  );
}

const LABELS = ["eSignature", "Solutions", "Pricing", "Security", "Resources", "eNotary"];

describe("PublicHeader", () => {
  beforeEach(() => {
    platform.sessionStatus = "unauthenticated";
    platform.user = null;
  });

  it("gives every top-nav trigger an icon and keeps the Coming Soon badge", () => {
    renderAt();
    const nav = screen.getByRole("navigation", { name: "Main navigation", hidden: true });
    for (const label of LABELS) {
      const btn = within(nav).getByRole("button", { name: new RegExp(`^${label}`), hidden: true });
      expect(btn.querySelector(".phdr-navico svg")).not.toBeNull();
    }
    expect(within(nav).getByRole("button", { name: /eNotary/, hidden: true })).toHaveTextContent("Coming Soon");
  });

  it("marks the current section and opens its mega panel on click", async () => {
    renderAt("/security/trust-center");
    const security = screen.getByRole("button", { name: /^Security/, hidden: true });
    expect(security).toHaveAttribute("aria-current", "page");
    expect(security).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: /^Pricing/, hidden: true })).not.toHaveAttribute("aria-current");

    await userEvent.click(screen.getByRole("button", { name: /^Solutions/, hidden: true }));
    const solutions = screen.getByRole("button", { name: /^Solutions/, hidden: true });
    expect(solutions).toHaveAttribute("aria-expanded", "true");
    expect(solutions).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("menu", { hidden: true })).toBeInTheDocument();
  });

  it("renders the logo inside the crop box", () => {
    renderAt();
    const [img] = screen.getAllByRole("img", { name: "LAGDA", hidden: true });
    if (!img) throw new Error("logo missing");
    expect(img).toHaveClass("phdr-logo-img");
    expect(img.parentElement).toHaveClass("phdr-logo");
  });

  it("shows Sign In and Create Free Account when signed out", () => {
    renderAt();
    expect(screen.getByRole("link", { name: "Sign In", hidden: true })).toHaveAttribute("href", "/sign-in");
    const cta = document.querySelector<HTMLAnchorElement>("a.phdr-cta");
    expect(cta).toHaveAttribute("href", "/create-account");
    expect(cta).toHaveTextContent("Create Free Account");
    expect(screen.queryByRole("link", { name: /Go to dashboard/ })).toBeNull();
  });

  it("shows only the Dashboard avatar button when signed in", () => {
    platform.sessionStatus = "authenticated";
    platform.user = { displayName: "Ana Reyes" };
    renderAt();
    expect(screen.getByRole("link", { name: "Go to dashboard, signed in as Ana Reyes" })).toHaveAttribute("href", "/app/dashboard");
    expect(screen.queryByRole("link", { name: "Sign In", hidden: true })).toBeNull();
    expect(document.querySelector("a.phdr-cta")).toBeNull();
  });

  it("the mobile drawer lists every section with its icon", async () => {
    renderAt("/pricing");
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    for (const label of LABELS) {
      const row = within(drawer).getByRole("button", { name: new RegExp(`^${label}`), hidden: true });
      expect(row.querySelector(".phdr-drawer-ico svg")).not.toBeNull();
    }
    expect(within(drawer).getByRole("button", { name: /^Pricing/ })).toHaveAttribute("aria-current", "page");
    expect(within(drawer).getByRole("link", { name: "Create Free Account" })).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).toBeNull();
  });
});
