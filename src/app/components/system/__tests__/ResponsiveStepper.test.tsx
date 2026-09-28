import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponsiveStepper } from "../ResponsiveStepper";
import { stubViewport } from "../../../../test/viewport-stub";

const STEPS = [
  { id: "roles", label: "Map Roles" },
  { id: "variables", label: "Enter Variables" },
  { id: "review", label: "Review & Launch" },
];

afterEach(() => { vi.unstubAllGlobals(); });

describe("ResponsiveStepper", () => {
  it("renders the compact form on a phone", () => {
    stubViewport(390);
    render(<ResponsiveStepper label="Use template steps" steps={STEPS} currentIndex={1} />);
    const nav = screen.getByRole("navigation", { name: "Use template steps" });
    expect(nav).toHaveAttribute("data-mode", "compact");
    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText("Enter Variables")).toBeInTheDocument();
    expect(screen.getByText("Review & Launch").parentElement).toHaveTextContent("Next: Review & Launch");
    expect(screen.getByRole("img", { name: "Step 2 of 3, Enter Variables" })).toHaveAttribute("aria-current", "step");
  });

  it("renders the full horizontal stepper from 640px", () => {
    stubViewport(768);
    render(<ResponsiveStepper label="Steps" steps={STEPS} currentIndex={0} />);
    expect(screen.getByRole("navigation", { name: "Steps" })).toHaveAttribute("data-mode", "full");
    expect(screen.getByRole("img", { name: "Step 1 of 3, Map Roles" })).toHaveAttribute("aria-current", "step");
    // Equal-width connectors between steps.
    const connectors = screen.getAllByTestId("rstep-connector");
    expect(connectors).toHaveLength(2);
    connectors.forEach(c => { expect(c.style.flex).toMatch(/^1 1 0(px)?$/); });
    // Labels never wrap.
    expect(screen.getByText("Enter Variables").style.whiteSpace).toBe("nowrap");
  });

  it("lets a completed step be selected when the flow allows it (44px targets)", async () => {
    stubViewport(390);
    const onSelect = vi.fn();
    render(
      <ResponsiveStepper label="Steps" steps={STEPS} currentIndex={2}
        canSelect={i => i < 2} onSelect={onSelect} />,
    );
    const back = screen.getByRole("button", { name: /Step 1 of 3, Map Roles, completed/ });
    expect(back).toHaveClass("rstep-seg");
    await userEvent.click(back);
    expect(onSelect).toHaveBeenCalledWith(0);
    // Upcoming or current segments are not buttons.
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("Last step")).toBeInTheDocument();
  });

  it("offers no buttons when nothing may be selected", () => {
    stubViewport(1366);
    render(<ResponsiveStepper label="Steps" steps={STEPS} currentIndex={1} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("img", { name: "Step 1 of 3, Map Roles, completed" })).toBeInTheDocument();
  });
});
