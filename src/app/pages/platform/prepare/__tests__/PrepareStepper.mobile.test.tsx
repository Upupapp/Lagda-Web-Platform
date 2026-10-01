// Prepare on a phone: the same step cards as the wide screen, smaller, in a
// strip that scrolls sideways. Any step you can reach is a card you can tap
// at any time; a locked one is visible but disabled; arrows at the edges
// slide the strip, each shown only when there is more to see that way.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepperTopBar } from "../PrepareLayout";
import { PREPARATION_STEPS, type PreparationStepId, type PreparationStepState } from "../../../../models/prepare";

const states = (overrides: Partial<Record<PreparationStepId, PreparationStepState>>) =>
  Object.fromEntries(PREPARATION_STEPS.map(s => [s.id, overrides[s.id] ?? "available"])) as Record<PreparationStepId, PreparationStepState>;

function show(active: PreparationStepId, stepStates = states({ upload: "complete", participants: "complete", fields: "unavailable", authorization: "unavailable" })) {
  const onStepClick = vi.fn();
  render(<StepperTopBar activeStepId={active} stepStates={stepStates} onStepClick={onStepClick} />);
  return { onStepClick, strip: screen.getByTestId("prep-step-cards-compact") };
}

function setSize(el: HTMLElement, { clientWidth, scrollWidth, scrollLeft = 0 }: { clientWidth: number; scrollWidth: number; scrollLeft?: number }) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "scrollLeft", { configurable: true, writable: true, value: scrollLeft });
}

afterEach(() => { vi.restoreAllMocks(); });

describe("Prepare stepper on a phone", () => {
  it("shows every step as a card, with where you are above them", () => {
    const { strip } = show("routing");
    expect(screen.getByTestId("prep-step-caption")).toHaveTextContent("Step 3 of 8 · Order");
    const cards = within(strip).getAllByRole("button");
    expect(cards).toHaveLength(PREPARATION_STEPS.length);
    expect(cards[2]).toHaveAttribute("aria-current", "step");
  });

  it("any reachable step can be tapped at any time — back or forward", async () => {
    const user = userEvent.setup();
    const { strip, onStepClick } = show("routing");
    await user.click(within(strip).getByRole("button", { name: /1\. Documents/ }));
    await user.click(within(strip).getByRole("button", { name: /7\. Review/ }));
    expect(onStepClick.mock.calls.map(c => c[0])).toEqual(["upload", "review"]);
  });

  it("a locked step stays visible but cannot be tapped", async () => {
    const user = userEvent.setup();
    const { strip, onStepClick } = show("routing");
    const fields = within(strip).getByRole("button", { name: /5\. Place Fields/ });
    expect(fields).toBeDisabled();
    await user.click(fields);
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it("arrows slide the strip, each only when there is more that way", async () => {
    const user = userEvent.setup();
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", { configurable: true, value: scrollBy });
    const { strip } = show("upload");
    // Nothing overflows yet (jsdom has no layout): no arrows.
    expect(screen.queryByTestId("prep-steps-left")).toBeNull();
    expect(screen.queryByTestId("prep-steps-right")).toBeNull();

    setSize(strip, { clientWidth: 360, scrollWidth: 1300 });
    fireEvent.scroll(strip);
    expect(screen.queryByTestId("prep-steps-left")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Scroll steps right" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 270, behavior: "smooth" });

    setSize(strip, { clientWidth: 360, scrollWidth: 1300, scrollLeft: 940 });
    fireEvent.scroll(strip);
    expect(screen.queryByTestId("prep-steps-right")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Scroll steps left" }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -270, behavior: "smooth" });
  });
});
