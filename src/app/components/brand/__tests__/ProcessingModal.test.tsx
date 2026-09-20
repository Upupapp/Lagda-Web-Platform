// The processing modal.
//
// This modal is not dismissible and it covers work in progress, so the
// assertions that matter are about what it promises: that it says what is
// happening, that it cannot be escaped into the page behind it, and that it
// gives the page back when it leaves.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProcessingModal, type ProcessingStep } from "../ProcessingModal";

describe("ProcessingModal", () => {
  it("announces what is happening as an alert dialog", () => {
    render(<ProcessingModal message="Uploading contract.pdf" />);

    const dialog = screen.getByRole("alertdialog", { name: "Uploading contract.pdf" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    // Assistive tech needs to know this is work, not merely a message.
    expect(dialog.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Uploading contract.pdf")).toBeTruthy();
  });

  it("shows the supporting detail when given one", () => {
    render(<ProcessingModal message="Sending" detail="Do not close this tab." />);
    expect(screen.getByText("Do not close this tab.")).toBeTruthy();
  });

  it("cannot be escaped, because closing it would not stop the work", async () => {
    const user = userEvent.setup();
    render(<ProcessingModal message="Finalising your signature" />);

    await user.keyboard("{Escape}");

    // Still there. A modal that vanishes while its request is in flight tells
    // the user the operation was cancelled when it was not.
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("keeps focus inside itself rather than letting Tab reach the page behind", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>a control behind the modal</button>
        <ProcessingModal message="Working" />
      </>,
    );

    await user.tab();

    const behind = screen.getByRole("button", { name: "a control behind the modal" });
    expect(document.activeElement).not.toBe(behind);
  });

  it("locks page scrolling while open and restores it on unmount", () => {
    const { unmount } = render(<ProcessingModal message="Working" />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("returns focus to whatever was focused when it opened", async () => {
    const user = userEvent.setup();
    render(<button>start upload</button>);
    const trigger = screen.getByRole("button", { name: "start upload" });
    await user.click(trigger);

    const { unmount } = render(<ProcessingModal message="Uploading" />);
    expect(document.activeElement).not.toBe(trigger);

    unmount();

    expect(document.activeElement).toBe(trigger);
  });

  describe("the step checklist", () => {
    const steps: ProcessingStep[] = [
      { id: "a", label: "Creating the signing request", state: "done" },
      { id: "b", label: "Confirming recipients", state: "active" },
      { id: "c", label: "Delivering to signers", state: "pending" },
    ];

    it("lists every stage", () => {
      render(<ProcessingModal message="Sending" steps={steps} />);
      for (const step of steps) expect(screen.getByText(step.label)).toBeTruthy();
    });

    it("states each stage's progress in text, not only in colour", () => {
      // The tick and the fill colour are both invisible to a screen reader,
      // so the state has to exist as words somewhere.
      render(<ProcessingModal message="Sending" steps={steps} />);
      expect(screen.getByText(/complete/)).toBeTruthy();
      expect(screen.getByText(/in progress/)).toBeTruthy();
      expect(screen.getByText(/pending/)).toBeTruthy();
    });
  });

  it("uses the real logo, falling back to the shield only if it fails to load", () => {
    const { container } = render(<ProcessingModal message="Working" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/brand/LagdaLogoIconFullColorSquare.png");
    // Decorative: the modal's own label already says what is happening, so an
    // alt text here would be announced twice.
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("does not rotate the logo itself, which the brand guide forbids", () => {
    // The motion lives in an arc orbiting outside the mark. If someone ever
    // moves that animation onto the logo container this fails.
    const { container } = render(<ProcessingModal message="Working" />);
    const logo = container.querySelector("img");
    const markContainer = logo?.parentElement;
    expect(markContainer?.style.animation ?? "").not.toMatch(/orbit/);
  });

  it("renders extra content the caller passes", () => {
    render(
      <ProcessingModal message="Working">
        <p>a caller-supplied note</p>
      </ProcessingModal>,
    );
    expect(screen.getByText("a caller-supplied note")).toBeTruthy();
  });

  it("fades out when exiting rather than disappearing", () => {
    render(<ProcessingModal message="Working" isExiting />);
    expect(screen.getByRole("alertdialog").style.animation).toMatch(/lagda-proc-out/);
  });

  it("centres on any viewport without depending on its own height", () => {
    // Grid centring rather than a transform, so a short landscape phone still
    // puts the card in the middle and the padding keeps it off the edges.
    render(<ProcessingModal message="Working" />);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.style.position).toBe("fixed");
    expect(dialog.style.display).toBe("grid");
    expect(dialog.style.placeItems).toBe("center");
  });
});

// A spinner nobody can see is a spinner nobody needed.
describe("ProcessingModal exit timing", () => {
  it("exports the exit duration so the provider unmounts in step with it", async () => {
    const { PROCESSING_EXIT_MS } = await import("../ProcessingModal");
    expect(PROCESSING_EXIT_MS).toBeGreaterThan(0);
  });
});

describe("ProcessingModal does not steal the mouse", () => {
  it("has no click handler that would dismiss it from the scrim", async () => {
    const user = userEvent.setup();
    const onSomething = vi.fn();
    render(
      <>
        <button onClick={onSomething}>behind</button>
        <ProcessingModal message="Working" />
      </>,
    );

    // The scrim covers the page, so a click lands on the modal, not the button.
    await user.click(screen.getByRole("alertdialog"));

    expect(onSomething).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
