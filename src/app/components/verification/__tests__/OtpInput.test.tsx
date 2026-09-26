import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OtpInput } from "../OtpInput";

function Harness() {
  const [value, setValue] = useState("");
  return (
    <>
      <OtpInput label="Access code" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const box = (n: number) => screen.getByLabelText<HTMLInputElement>(`Digit ${n} of 6`);

describe("OtpInput", () => {
  it("renders six numeric boxes in a labelled group", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Access code" })).toBeTruthy();
    for (let i = 1; i <= 6; i++) expect(box(i).inputMode).toBe("numeric");
    expect(box(1).autocomplete).toBe("one-time-code");
  });

  it("auto-advances while typing and ignores non-digits", async () => {
    render(<Harness />);
    await userEvent.click(box(1));
    await userEvent.keyboard("1a2");
    expect(screen.getByTestId("value").textContent).toBe("12");
    expect(document.activeElement).toBe(box(3));
  });

  it("fills every box from a paste", async () => {
    render(<Harness />);
    await userEvent.click(box(1));
    await userEvent.paste(" 98-76 54 ");
    expect(screen.getByTestId("value").textContent).toBe("987654");
    expect(box(6).value).toBe("4");
  });

  it("Backspace on an empty box steps back and clears", async () => {
    render(<Harness />);
    await userEvent.click(box(1));
    await userEvent.keyboard("12");
    await userEvent.keyboard("{Backspace}");
    expect(screen.getByTestId("value").textContent).toBe("1");
    expect(document.activeElement).toBe(box(2));
  });
});
