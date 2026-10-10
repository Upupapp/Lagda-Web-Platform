// The wizard's chrome at two widths.
//
// The bug these pin was measured, not imagined: at 320px the bottom bar
// reached 131px on Participants and Review because three things wrapped
// independently in one row. The fix is a set of decisions keyed off the
// viewport, and each decision is asserted here at the width it applies to.

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PrepareBreadcrumb, PrepareNavBar, continueLabel } from "../PrepareChrome";

/** Renders at a chosen viewport width, since every branch keys off it. */
function atWidth(width: number, ui: React.ReactElement) {
  act(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
    window.dispatchEvent(new Event("resize"));
  });
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("the breadcrumb", () => {
  it("collapses to a single back-link on a phone", () => {
    atWidth(320, <PrepareBreadcrumb title="Lease Agreement" showDiscard onDiscard={vi.fn()} />);
    expect(screen.getByRole("link", { name: /Documents/ }).getAttribute("href")).toBe("/app/documents");
    // The step name lives in the mobile stepper directly below; repeating it
    // here is what used to wrap onto a second line.
    expect(screen.queryByText("Prepare Document")).toBeNull();
    expect(screen.queryByText("Lease Agreement")).toBeNull();
  });

  it("shows the full trail on a desktop", () => {
    atWidth(1280, <PrepareBreadcrumb title="Lease Agreement" showDiscard onDiscard={vi.fn()} />);
    expect(screen.getByText("Prepare Document")).toBeTruthy();
    expect(screen.getByText("Lease Agreement")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  });

  it("lets the title truncate rather than overflow", () => {
    // `minWidth: 0` on the row is the whole fix — without it the ellipsis
    // never engages and the title runs off the right edge.
    atWidth(1280, <PrepareBreadcrumb title="A very long draft title" showDiscard={false} onDiscard={vi.fn()} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    // React emits a unitless zero for `minWidth: 0`.
    expect(nav.style.minWidth).toBe("0");
    const title = screen.getByText("A very long draft title");
    expect(title.style.textOverflow).toBe("ellipsis");
  });

  it("keeps Discard reachable at both widths, shorter on a phone", () => {
    const { unmount } = atWidth(320, <PrepareBreadcrumb title={null} showDiscard onDiscard={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Discard" })).toBeTruthy();
    unmount();

    atWidth(1280, <PrepareBreadcrumb title={null} showDiscard onDiscard={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Discard draft" })).toBeTruthy();
  });

  it("hides Discard when there is nothing to discard", () => {
    atWidth(1280, <PrepareBreadcrumb title={null} showDiscard={false} onDiscard={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Discard/ })).toBeNull();
  });

  it("grows rather than clipping — a minimum height, not a fixed one", () => {
    const { container } = atWidth(1280, <PrepareBreadcrumb title={null} showDiscard={false} onDiscard={vi.fn()} />);
    const bar = container.querySelector(".prep-breadcrumb") as HTMLElement;
    expect(bar.style.minHeight).toBe("56px");
    expect(bar.style.height).toBe("");
  });
});

describe("the nav bar", () => {
  const base = {
    prevId: "upload" as const, nextId: "routing" as const,
    onPrevious: vi.fn(), onContinue: vi.fn(), onShowMissing: vi.fn(),
  };

  it("drops the long reminder link on a phone — the FAB already carries it", () => {
    // The badge on the help FAB shows this exact count and its panel lists
    // these exact items. Two affordances for one question is what made the
    // bar tall.
    atWidth(320, <PrepareNavBar {...base} continueBlocked />);
    expect(screen.queryByText(/see what.s left/)).toBeNull();
  });

  it("keeps the reminder link on a desktop", () => {
    atWidth(1280, <PrepareNavBar {...base} continueBlocked />);
    expect(screen.getByText(/This step is not finished . see what.s missing/)).toBeTruthy();
  });

  it("still opens the reminder from a blocked Continue on a phone", () => {
    // Removing the link must not remove the path to the answer.
    const onShowMissing = vi.fn();
    atWidth(320, <PrepareNavBar {...base} continueBlocked onShowMissing={onShowMissing} />);
    screen.getByRole("button", { name: "Continue →" }).click();
    expect(onShowMissing).toHaveBeenCalledTimes(1);
  });

  it("continues normally when not blocked", () => {
    const onContinue = vi.fn();
    atWidth(320, <PrepareNavBar {...base} continueBlocked={false} onContinue={onContinue} />);
    screen.getByRole("button", { name: "Continue →" }).click();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("shortens the labels only where the screen needs it", () => {
    expect(continueLabel("fields", false, false)).toBe("Continue to Place Fields →");
    expect(continueLabel("fields", false, true)).toBe("Place Fields →");
    // Blocked, it is still called Continue: a button that changed its name
    // read to a tester as the button having disappeared.
    expect(continueLabel("routing", true, false)).toBe("Continue →");
    expect(continueLabel("routing", true, true)).toBe("Continue →");
    expect(continueLabel("routing", false, true)).toBe("Continue →");
  });

  it("marks a blocked Continue for assistive technology without disabling it", () => {
    atWidth(1280, <PrepareNavBar {...base} continueBlocked />);
    const button = screen.getByRole("button", { name: "Continue →" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("omits Previous on the first step and Continue on the last", () => {
    atWidth(1280, <PrepareNavBar {...base} prevId={null} nextId={null} continueBlocked={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("never lets a button wrap its label", () => {
    atWidth(320, <PrepareNavBar {...base} continueBlocked={false} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button.style.whiteSpace).toBe("nowrap");
      expect(button.style.minHeight).toBe("44px");
    }
  });

  it("centres the guide between Previous and Continue in its own column", () => {
    atWidth(320, <PrepareNavBar {...base} continueBlocked={false} guide={<button type="button">Guide</button>} />);
    const guide = screen.getByRole("button", { name: "Guide" });
    const cell = guide.parentElement!;
    expect(cell).toHaveClass("prep-nav-guide");
    expect(cell.style.justifySelf).toBe("center");
    const bar = cell.parentElement!;
    const cells = Array.from(bar.children).map(c => c.className);
    expect(cells).toEqual(["prep-nav-prev", "prep-nav-guide", "prep-nav-next"]);
  });

  it("carries the last step's own way forward where Continue sits", async () => {
    // Authorization has no next step. Its Authorize button used to sit in the
    // page, beside a second "Back to Review"; it belongs in the same corner
    // as Continue on every other step.
    const onClick = vi.fn();
    atWidth(1280, <PrepareNavBar {...base} prevId="review" nextId={null} continueBlocked={false} finalAction={{ label: "Authorize", onClick }} />);
    const authorize = screen.getByRole("button", { name: "Authorize" });
    expect(authorize.parentElement).toHaveClass("prep-nav-next");
    expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Previous/ })).toBeInTheDocument();
    authorize.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows no forward button on a last step that offers none", () => {
    atWidth(1280, <PrepareNavBar {...base} prevId="review" nextId={null} continueBlocked={false} />);
    expect(screen.queryByRole("button", { name: /Authorize|Continue/ })).toBeNull();
  });

  it("keeps Continue, not the final action, while there is a next step", () => {
    atWidth(1280, <PrepareNavBar {...base} continueBlocked={false} finalAction={{ label: "Authorize", onClick: vi.fn() }} />);
    expect(screen.getByRole("button", { name: /Continue/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Authorize" })).toBeNull();
  });
});
