// The signer design system.
//
// These primitives carry the states a signer reads before they read any
// sentence — a tone, an icon, a step — so the branches that pick them are
// worth pinning. A banner that silently renders "info" for a closed link, or
// a step rail that never marks the current step, fails in a way no assertion
// elsewhere would notice.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { ShieldCheck, Ban } from "lucide-react";
import {
  PhaseBanner, Notice, ActionButton, ActionRow, StepRail, SignerCard,
  IdentityStrip, useViewport, T,
} from "../signer-ui";

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

afterEach(() => { cleanup(); });

describe("PhaseBanner", () => {
  it("renders the title as the page heading", () => {
    render(<PhaseBanner icon={ShieldCheck} title="Consent required" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent)
      .toBe("Consent required");
  });

  it("shows a badge only when given one", () => {
    const { unmount } = render(
      <PhaseBanner icon={ShieldCheck} title="Signed" badge="Complete" />);
    expect(screen.getByText("Complete")).toBeTruthy();
    unmount();

    render(<PhaseBanner icon={ShieldCheck} title="Signed" />);
    expect(screen.queryByText("Complete")).toBeNull();
  });

  it("shows a description only when given one", () => {
    const { unmount } = render(
      <PhaseBanner icon={ShieldCheck} title="Signed" description="All done." />);
    expect(screen.getByText("All done.")).toBeTruthy();
    unmount();

    render(<PhaseBanner icon={ShieldCheck} title="Signed" />);
    expect(screen.queryByText("All done.")).toBeNull();
  });

  it("carries the tone's own colour rather than one default", () => {
    // The whole point of the tone: a closed link and a completed signature
    // must not look alike before the sentence is read.
    const { container, unmount } = render(
      <PhaseBanner icon={Ban} title="Closed" tone="danger" />);
    const danger = (container.firstChild as HTMLElement).style.background;
    unmount();

    const { container: ok } = render(
      <PhaseBanner icon={ShieldCheck} title="Done" tone="success" />);
    expect((ok.firstChild as HTMLElement).style.background).not.toBe(danger);
  });
});

describe("Notice", () => {
  it("announces a problem, so a rejection is not left to be discovered", () => {
    render(<Notice tone="danger">Could not submit</Notice>);
    expect(screen.getByRole("alert").textContent).toContain("Could not submit");
  });

  it("does not announce ordinary information", () => {
    render(<Notice tone="info">The sender is notified automatically</Notice>);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders without an icon", () => {
    render(<Notice>Plain</Notice>);
    expect(screen.getByText("Plain")).toBeTruthy();
  });

  it("renders with one", () => {
    const { container } = render(<Notice icon={ShieldCheck}>With icon</Notice>);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("ActionButton", () => {
  it("is a real button that fires", () => {
    let fired = false;
    render(<ActionButton onClick={() => { fired = true; }}>Go</ActionButton>);
    screen.getByRole("button", { name: "Go" }).click();
    expect(fired).toBe(true);
  });

  it("does not fire when disabled", () => {
    let fired = false;
    render(
      <ActionButton disabled onClick={() => { fired = true; }}>Go</ActionButton>);
    screen.getByRole("button", { name: "Go" }).click();
    expect(fired).toBe(false);
  });

  it("distinguishes destructive from primary", () => {
    const { unmount } = render(<ActionButton kind="danger">Decline</ActionButton>);
    const danger = screen.getByRole("button").style.background;
    unmount();

    render(<ActionButton kind="primary">Sign</ActionButton>);
    expect(screen.getByRole("button").style.background).not.toBe(danger);
  });

  it("renders the secondary skin with a visible border", () => {
    render(<ActionButton kind="secondary">Back</ActionButton>);
    expect(screen.getByRole("button").style.border).toContain("1px solid");
  });

  it("meets the 44px touch target", () => {
    // Not cosmetic: the "small" controls on a signing page are things like a
    // decline reason, and a mis-tap there is not a cosmetic problem.
    render(<ActionButton>Sign</ActionButton>);
    expect(screen.getByRole("button").style.minHeight).toBe("44px");
  });

  it("goes full width only when asked", () => {
    const { unmount } = render(<ActionButton full>Sign</ActionButton>);
    expect(screen.getByRole("button").style.width).toBe("100%");
    unmount();

    render(<ActionButton>Sign</ActionButton>);
    expect(screen.getByRole("button").style.width).toBe("");
  });

  it("renders with and without an icon", () => {
    const { container, unmount } = render(
      <ActionButton icon={ShieldCheck}>Consent</ActionButton>);
    expect(container.querySelector("svg")).toBeTruthy();
    unmount();

    const { container: bare } = render(<ActionButton>Consent</ActionButton>);
    expect(bare.querySelector("svg")).toBeNull();
  });
});

describe("ActionRow", () => {
  it("stacks on a phone and sits in a row on a desktop", () => {
    const { container, unmount } = atWidth(320,
      <ActionRow><ActionButton>A</ActionButton></ActionRow>);
    expect((container.firstChild as HTMLElement).style.flexDirection).toBe("column");
    unmount();

    const { container: wide } = atWidth(1024,
      <ActionRow><ActionButton>A</ActionButton></ActionRow>);
    expect((wide.firstChild as HTMLElement).style.flexDirection).toBe("row");
  });
});

describe("StepRail", () => {
  it("marks the current step for assistive technology", () => {
    render(<StepRail current="sign" />);
    expect(screen.getByText("Review & sign").getAttribute("aria-current"))
      .toBe("step");
  });

  it("ticks the steps already behind the signer", () => {
    render(<StepRail current="done" />);
    // Two completed steps before "Done".
    expect(screen.getAllByText("✓")).toHaveLength(2);
  });

  it("shows no tick on the first step", () => {
    render(<StepRail current="consent" />);
    expect(screen.queryByText("✓")).toBeNull();
  });

  it("drops non-current labels at Mobile S, keeping the numbered dots", () => {
    // Three labels would consume the row at 320px. The current step stays
    // named because that is the one the signer needs.
    atWidth(320, <StepRail current="sign" />);
    expect(screen.getByText("Review & sign")).toBeTruthy();
    expect(screen.queryByText("Consent")).toBeNull();
  });

  it("shows every label when there is room", () => {
    atWidth(1024, <StepRail current="sign" />);
    expect(screen.getByText("Consent")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
  });
});

describe("SignerCard", () => {
  it("is narrow for a single decision and wider for a document", () => {
    const { container, unmount } = render(<SignerCard>x</SignerCard>);
    expect((container.firstChild as HTMLElement).style.maxWidth).toBe("560px");
    unmount();

    const { container: wide } = render(<SignerCard wide>x</SignerCard>);
    expect((wide.firstChild as HTMLElement).style.maxWidth).toBe("860px");
  });
});

describe("IdentityStrip", () => {
  it("names who is signing, so a forwarded link is visible", () => {
    render(
      <IdentityStrip name="Maria Santos" role="signer" documentTitle="Lease" />);
    expect(screen.getByText(/Maria Santos/)).toBeTruthy();
    expect(screen.getByText("Lease")).toBeTruthy();
  });
});

describe("useViewport", () => {
  function Probe() {
    const { isMobileS, isCompact } = useViewport();
    return <span>{`${String(isMobileS)}:${String(isCompact)}`}</span>;
  }

  it("classifies Mobile S", () => {
    atWidth(320, <Probe />);
    expect(screen.getByText("true:true")).toBeTruthy();
  });

  it("classifies a large phone as compact but not Mobile S", () => {
    atWidth(430, <Probe />);
    expect(screen.getByText("false:true")).toBeTruthy();
  });

  it("classifies a desktop as neither", () => {
    atWidth(1280, <Probe />);
    expect(screen.getByText("false:false")).toBeTruthy();
  });
});

describe("tokens", () => {
  it("keeps one palette, so screens cannot drift apart", () => {
    expect(T.azure).toBe("#0078D4");
    expect(T.danger).toBe("#C0392B");
    expect(T.success).toBe("#1E7F4F");
  });
});
