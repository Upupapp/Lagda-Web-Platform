// The fullscreen splash's orbit spinner is opt-in: the signing page and the
// workspace splash turn it on; everything else keeps the plain brand sequence.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LagdaLoader } from "../LagdaLoader";

const orbits = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLElement>("div")).filter(d => d.style.animation.includes("lagda-orbit-spin"));

describe("LagdaLoader fullscreen spinner", () => {
  it("draws the orbit and keeps the message when spinner is on", () => {
    const { container } = render(
      <LagdaLoader mode="fullscreen" theme="light" message="Opening your document securely" ariaLabel="Opening your document" spinner />);
    expect(orbits(container)).toHaveLength(2);
    expect(screen.getByRole("status", { name: "Opening your document" })).toBeTruthy();
    expect(screen.getByText("Opening your document securely")).toBeTruthy();
  });

  it("draws no orbit by default", () => {
    const { container } = render(<LagdaLoader mode="fullscreen" theme="light" message="x" />);
    expect(orbits(container)).toHaveLength(0);
  });
});
