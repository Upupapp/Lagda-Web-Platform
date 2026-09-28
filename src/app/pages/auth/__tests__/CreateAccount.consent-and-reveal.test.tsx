// Create Account: nothing is submitted until the Terms of Service and
// Privacy Policy box is ticked (button or Enter), and each password field
// has its own show/hide toggle.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "https://example.test/api" }));
vi.mock("../../../context/OnboardingContext", () => ({
  useOnboarding: () => ({ setReturnTo: vi.fn(), setPendingUser: vi.fn() }),
}));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ sessionStatus: "anonymous" }),
}));
const register = vi.fn();
vi.mock("../../../services/real/auth.service", () => ({
  realAuthService: { register: (...args: unknown[]) => register(...args) as unknown },
}));

import { CreateAccount } from "../CreateAccount";

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/create-account"]}>
      <Routes>
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValid() {
  await userEvent.type(screen.getByLabelText(/^Full name/), "Alex Morgan");
  await userEvent.type(screen.getByLabelText(/^Email address/), "alex@example.com");
  await userEvent.type(screen.getByLabelText(/^Password/), "Secure123");
  await userEvent.type(screen.getByLabelText(/^Confirm password/), "Secure123");
}

const submitButton = () => screen.getByRole("button", { name: /Create account/ });

beforeEach(() => {
  register.mockReset();
  register.mockResolvedValue({});
});

describe("Create account — consent gate", () => {
  it("keeps Create account unavailable, with an explained reason, until the terms are accepted", async () => {
    renderPage();
    const button = submitButton();
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const hintId = button.getAttribute("aria-describedby");
    expect(hintId).toBe("ca-submit-hint");
    expect(document.getElementById(hintId!)?.textContent)
      .toBe("Agree to the Terms of Service and Privacy Policy to create your account.");

    await fillValid();
    // Neither a click nor Enter in a field submits.
    await userEvent.click(button);
    await userEvent.type(screen.getByLabelText(/^Email address/), "{Enter}");
    expect(register).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert", { name: "Form errors" })).toBeNull();

    await userEvent.click(screen.getByRole("checkbox"));
    expect(button.getAttribute("aria-disabled")).toBe("false");
    expect(button.hasAttribute("aria-describedby")).toBe(false);
    expect(screen.queryByText(/Agree to the Terms of Service and Privacy Policy to create/)).toBeNull();

    await userEvent.click(button);
    expect(register).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("where")).toHaveTextContent("/verify-email");
  });

  it("still shows the existing validation messages once the terms are accepted", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(submitButton());
    const summary = await screen.findByRole("alert", { name: "Form errors" });
    expect(summary).toHaveTextContent("Full name is required");
    expect(summary).toHaveTextContent("Email address is required");
    expect(summary).toHaveTextContent("Password must be at least 8 characters");
    expect(summary).toHaveTextContent("Please confirm your password");
    expect(register).not.toHaveBeenCalled();
  });

  it("submits with Enter once the terms are accepted", async () => {
    renderPage();
    await fillValid();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByLabelText(/^Confirm password/), "{Enter}");
    expect(register).toHaveBeenCalledTimes(1);
  });
});

describe("Create account — show / hide", () => {
  it("gives Password and Confirm password their own, independent toggles", async () => {
    renderPage();
    const password = screen.getByLabelText<HTMLInputElement>(/^Password/);
    const confirm = screen.getByLabelText<HTMLInputElement>(/^Confirm password/);
    const showPassword = screen.getByRole("button", { name: "Show password" });
    const showConfirm = screen.getByRole("button", { name: "Show confirm password" });
    expect(password.type).toBe("password");
    expect(confirm.type).toBe("password");
    expect(showPassword.getAttribute("aria-pressed")).toBe("false");
    expect(showConfirm.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(showPassword);
    expect(password.type).toBe("text");
    expect(confirm.type).toBe("password");
    const hidePassword = screen.getByRole("button", { name: "Hide password" });
    expect(hidePassword.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Show confirm password" }).getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(screen.getByRole("button", { name: "Show confirm password" }));
    expect(confirm.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide confirm password" }).getAttribute("aria-pressed")).toBe("true");

    await userEvent.click(hidePassword);
    expect(password.type).toBe("password");
    expect(confirm.type).toBe("text");
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
    // The toggles never submit the form.
    expect(register).not.toHaveBeenCalled();
  });
});
