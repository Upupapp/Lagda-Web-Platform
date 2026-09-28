import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SharingTabs, SHARING_STYLES } from "../SharingTabs";

const TABS = [
  { id: "a", label: "Received", count: 3 },
  { id: "b", label: "Sent", count: 12 },
  { id: "c", label: "Declined and expired", count: 0 },
] as const;

describe("SharingTabs on a phone", () => {
  it("never wraps: one row that scrolls sideways with a hidden scrollbar", () => {
    const rule = /\.sharing-tabs \{([^}]*)\}/.exec(SHARING_STYLES)?.[1] ?? "";
    expect(rule).toContain("flex-wrap: nowrap");
    expect(rule).toContain("white-space: nowrap");
    expect(rule).toContain("overflow: auto");
    expect(rule).toContain("scrollbar-width: none");
    expect(SHARING_STYLES).toContain(".sharing-tabs::-webkit-scrollbar { display: none; }");
  });

  it("scrolls the strip, not the page, to bring the active tab into view", () => {
    const { rerender } = render(
      <SharingTabs label="Invitations" tabs={TABS} active="a" onChange={() => undefined} idPrefix="t" />,
    );
    const list = screen.getByRole("tablist");
    const tab = screen.getByRole("tab", { name: /Declined/ });
    Object.defineProperty(list, "clientWidth", { configurable: true, value: 200 });
    Object.defineProperty(tab, "offsetLeft", { configurable: true, value: 260 });
    Object.defineProperty(tab, "offsetWidth", { configurable: true, value: 150 });
    rerender(<SharingTabs label="Invitations" tabs={TABS} active="c" onChange={() => undefined} idPrefix="t" />);
    // Right edge (260 + 150) aligned to the strip's visible width (200).
    expect(list.scrollLeft).toBe(210);
  });
});
