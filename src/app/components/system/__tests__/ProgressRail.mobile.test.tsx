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

  it("brings the current step into view when the rail is longer than the screen", () => {
    // jsdom lays nothing out, so the sizes a phone would report are supplied.
    const sizes = { offsetLeft: 300, offsetWidth: 90, clientWidth: 358 };
    const restore = (Object.keys(sizes) as (keyof typeof sizes)[]).map(key => {
      const was = Object.getOwnPropertyDescriptor(HTMLElement.prototype, key);
      Object.defineProperty(HTMLElement.prototype, key, {
        configurable: true,
        get(this: HTMLElement) {
          if (key === "clientWidth") return this.tagName === "OL" ? sizes.clientWidth : 0;
          if (this.tagName === "OL") return 0;
          return sizes[key];
        },
      });
      return () => { if (was) Object.defineProperty(HTMLElement.prototype, key, was); else Reflect.deleteProperty(HTMLElement.prototype, key); };
    });
    try {
      render(<ProgressRail steps={STEPS} current="c" label="Long" scrollOnMobile />);
      expect(screen.getByRole("list", { name: "Long" }).scrollLeft).toBe(300 + 90 - 358);
    } finally {
      restore.forEach(undo => { undo(); });
    }
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
