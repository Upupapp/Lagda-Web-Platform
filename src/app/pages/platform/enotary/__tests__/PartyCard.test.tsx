// The card of the other person: the initials in its avatar, and the avatar standing above the banner it overlaps.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartyCard, initialsOf } from "../CaseFrame";

describe("the initials of the avatar", () => {
  it("take the first and the last word of the name, leaving out the title and anything in brackets", () => {
    expect(initialsOf("Atty. Jake Smith (TEST ACCOUNT)")).toBe("JS");
    expect(initialsOf("Aiyana Yasmin A. Cruz")).toBe("AC");
    expect(initialsOf("Rosa")).toBe("R");
    expect(initialsOf("")).toBe("?");
  });
});

describe("the party card", () => {
  it("lifts the avatar above the banner so it is not hidden behind it", () => {
    render(<PartyCard name="Atty. Jake Smith (TEST ACCOUNT)" role="Notary Public" tone="attorney" status={{ label: "Accepted", tone: "ok" }} rows={[]} auditCount={null} />);
    const avatar = screen.getByText("JS");
    expect(avatar.parentElement).toHaveStyle({ position: "relative", zIndex: "1" });
  });
});
