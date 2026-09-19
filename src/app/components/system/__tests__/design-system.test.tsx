// The shared design system's branches.
//
// The signer's own suite (`recipient/__tests__/signer-ui.test.tsx`) already
// exercises these primitives through the re-export, and deliberately still
// does — those tests are about the signer's contract and should keep passing
// against whatever the signer imports.
//
// What is covered HERE is the part the extraction added: the pieces that only
// exist because onboarding and the preparation guide needed them, and which
// no signer screen would ever exercise.

import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ShieldCheck, Users } from "lucide-react";
import {
  InfoRow, ProgressRail, PhaseBanner, SurfaceCard, type RailStep,
} from "../design-system";

/** Renders at a chosen viewport width, since several branches key off it. */
function atWidth(width: number, ui: React.ReactElement) {
  act(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true, writable: true, value: width,
    });
    window.dispatchEvent(new Event("resize"));
  });
  return render(ui);
}

describe("InfoRow", () => {
  // The component the preparation guide exists to show: a requirement, with
  // whether it is actually required. A list of field names that does not say
  // which are mandatory is the problem it was built to fix.

  it("names the requirement", () => {
    render(<InfoRow icon={Users} label="Email address" />);
    expect(screen.getByText("Email address")).toBeTruthy();
  });

  it("says whether it is required", () => {
    render(<InfoRow icon={Users} label="Email address" badge="Required" />);
    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("omits the badge when there is nothing to say", () => {
    render(<InfoRow icon={Users} label="Message" />);
    expect(screen.queryByText("Required")).toBeNull();
    expect(screen.queryByText("Optional")).toBeNull();
  });

  it("explains the requirement when given a reason", () => {
    render(
      <InfoRow icon={Users} label="Email address" info="Where the link is sent." />);
    expect(screen.getByText("Where the link is sent.")).toBeTruthy();
  });

  it("renders without an explanation", () => {
    const { container } = render(<InfoRow icon={Users} label="Role" />);
    expect(container.textContent).toContain("Role");
  });

  it("looks settled once done, rather than disappearing", () => {
    // Removing a satisfied row would make the list jump under someone as
    // they work, and would hide the fact that the requirement existed.
    const { container, unmount } = render(
      <InfoRow icon={Users} label="Title" done />);
    const doneBackground = (container.firstChild as HTMLElement).style.background;
    unmount();

    const { container: pending } = render(<InfoRow icon={Users} label="Title" />);
    expect((pending.firstChild as HTMLElement).style.background)
      .not.toBe(doneBackground);
  });

  it("carries a tone", () => {
    const { container, unmount } = render(
      <InfoRow icon={Users} label="x" tone="info" />);
    const info = (container.firstChild as HTMLElement).style.background;
    unmount();

    const { container: neutral } = render(
      <InfoRow icon={Users} label="x" tone="neutral" />);
    expect((neutral.firstChild as HTMLElement).style.background).not.toBe(info);
  });
});

describe("ProgressRail", () => {
  // Generalised from the signer's three-step ceremony rail so onboarding's
  // six steps could use it. These are the cases the ceremony never produces.

  const STEPS: readonly RailStep[] = [
    { id: "a", label: "Profile", short: "1" },
    { id: "b", label: "Workspace", short: "2" },
    { id: "c", label: "Security", short: "3" },
    { id: "d", label: "Review", short: "4" },
    { id: "e", label: "Done", short: "5" },
    { id: "f", label: "Finish", short: "6" },
  ];

  it("marks the current step for assistive technology", () => {
    render(<ProgressRail steps={STEPS} current="c" />);
    expect(screen.getByText("Security").getAttribute("aria-current")).toBe("step");
  });

  it("ticks every step already behind", () => {
    render(<ProgressRail steps={STEPS} current="d" />);
    expect(screen.getAllByText("✓")).toHaveLength(3);
  });

  it("shows no tick on the first step", () => {
    render(<ProgressRail steps={STEPS} current="a" />);
    expect(screen.queryByText("✓")).toBeNull();
  });

  it("keeps only the current label at Mobile S", () => {
    // Six labels cannot share a 320px row. The numbered dots carry the
    // meaning and the current step stays named, because that is the one
    // someone needs.
    atWidth(320, <ProgressRail steps={STEPS} current="c" />);
    expect(screen.getByText("Security")).toBeTruthy();
    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("shows every label when there is room", () => {
    atWidth(1280, <ProgressRail steps={STEPS} current="c" />);
    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getByText("Finish")).toBeTruthy();
  });

  it("takes its own accessible name", () => {
    render(<ProgressRail steps={STEPS} current="a" label="Onboarding progress" />);
    expect(screen.getByLabelText("Onboarding progress")).toBeTruthy();
  });

  it("survives a step id that is not in the list", () => {
    // The layout passes `currentStepMeta?.id ?? ""` — an unrecognised route
    // must render the rail un-started, not crash the whole wizard shell.
    render(<ProgressRail steps={STEPS} current="" />);
    expect(screen.queryByText("✓")).toBeNull();
  });
});

describe("PhaseBanner's heading level", () => {
  // Onboarding renders its own page heading, so its cards ask for an h2.
  // Two h1s on one screen is a real defect, not a stylistic preference.

  it("is an h1 by default", () => {
    render(<PhaseBanner icon={ShieldCheck} title="Secure your account" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent)
      .toBe("Secure your account");
  });

  it("drops to h2 when asked", () => {
    render(<PhaseBanner icon={ShieldCheck} title="Secure your account" as="h2" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

describe("SurfaceCard", () => {
  it("is narrow for a single decision and wider for a document", () => {
    const { container, unmount } = render(<SurfaceCard>x</SurfaceCard>);
    expect((container.firstChild as HTMLElement).style.maxWidth).toBe("560px");
    unmount();

    const { container: wide } = render(<SurfaceCard wide>x</SurfaceCard>);
    expect((wide.firstChild as HTMLElement).style.maxWidth).toBe("860px");
  });
});
