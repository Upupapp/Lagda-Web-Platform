// The signing rail stays on one line on a phone and scrolls sideways; other
// rails keep wrapping.

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRail } from "../design-system";

const STEPS = [
  { id: "a", label: "Consent", short: "1" },
  { id: "b", label: "Review & Sign", short: "2" },
  { id: "c", label: "Done", short: "3" },
];

const setWidth = (w: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
};

describe("ProgressRail", () => {
  beforeEach(() => { setWidth(390); });

  it("does not wrap on a phone when it opts in; it scrolls", () => {
    render(<ProgressRail steps={STEPS} current="b" label="Signing progress" scrollOnMobile />);
    const rail = screen.getByRole("list", { name: "Signing progress" });
    expect(rail.style.flexWrap).toBe("nowrap");
    expect(rail.style.overflowX).toBe("auto");
  });

  it("keeps wrapping when it does not opt in", () => {
    render(<ProgressRail steps={STEPS} current="b" label="Other" />);
    expect(screen.getByRole("list", { name: "Other" }).style.flexWrap).toBe("wrap");
  });

  it("keeps wrapping on a wide screen even when it opts in", () => {
    setWidth(1280);
    render(<ProgressRail steps={STEPS} current="b" label="Wide" scrollOnMobile />);
    expect(screen.getByRole("list", { name: "Wide" }).style.flexWrap).toBe("wrap");
  });
});
