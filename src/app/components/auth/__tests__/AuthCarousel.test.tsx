import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AuthCarousel, AUTH_CAROUSEL_DURATIONS } from "../AuthCarousel";
import { AuthLayout } from "../../../layouts/AuthLayout";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") ? matches : false,
    media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

function currentSlide(): number {
  const dots = screen.getAllByRole("button", { name: /Go to slide/ });
  return dots.findIndex(d => d.getAttribute("aria-current") === "true") + 1;
}

function user() {
  return userEvent.setup({ advanceTimers: (ms) => { vi.advanceTimersByTime(ms); } });
}

function advance(ms: number) {
  act(() => { vi.advanceTimersByTime(ms); });
}

describe("AuthCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is a labelled carousel of five slides", () => {
    render(<AuthCarousel />);
    const region = screen.getByRole("region", { name: "How LAGDA works" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    const slides = screen.getAllByRole("group", { hidden: true });
    expect(slides).toHaveLength(5);
    slides.forEach((s, i) => {
      expect(s).toHaveAttribute("aria-roledescription", "slide");
      expect(s).toHaveAttribute("aria-label", `${i + 1} of 5`);
    });
    expect(screen.getByText("Move important work forward.")).toBeInTheDocument();
  });

  it("shows the intro for 6s, then each image slide for 4s, and loops", () => {
    render(<AuthCarousel />);
    expect(currentSlide()).toBe(1);
    advance(AUTH_CAROUSEL_DURATIONS[0] - 200);
    expect(currentSlide()).toBe(1);
    advance(200);
    expect(currentSlide()).toBe(2);
    advance(3800);
    expect(currentSlide()).toBe(2);
    advance(200);
    expect(currentSlide()).toBe(3);
    advance(4000);
    advance(4000);
    advance(4000);
    expect(currentSlide()).toBe(1);
  });

  it("pauses on hover and resumes on leave", async () => {
    const u = user();
    render(<AuthCarousel />);
    const region = screen.getByRole("region", { name: "How LAGDA works" });
    await u.hover(region);
    advance(20_000);
    expect(currentSlide()).toBe(1);
    await u.unhover(region);
    advance(6000);
    expect(currentSlide()).toBe(2);
  });

  it("pauses while focus is inside and while the paused prop is set", () => {
    const { rerender } = render(<AuthCarousel paused />);
    advance(20_000);
    expect(currentSlide()).toBe(1);
    rerender(<AuthCarousel />);
    fireEvent.focus(screen.getByRole("button", { name: "Next slide" }));
    advance(20_000);
    expect(currentSlide()).toBe(1);
  });

  it("does not autoplay under prefers-reduced-motion", async () => {
    const u = user();
    mockReducedMotion(true);
    render(<AuthCarousel />);
    advance(30_000);
    expect(currentSlide()).toBe(1);
    await u.click(screen.getByRole("button", { name: "Next slide" }));
    expect(currentSlide()).toBe(2);
  });

  it("moves with dots, prev/next, arrow keys and swipe; announces only user moves", async () => {
    const u = user();
    render(<AuthCarousel />);
    const track = screen.getByTestId("auth-carousel-track");
    expect(track).toHaveAttribute("aria-live", "off");
    await u.click(screen.getByRole("button", { name: "Go to slide 4" }));
    expect(currentSlide()).toBe(4);
    expect(track).toHaveAttribute("aria-live", "polite");
    await u.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(currentSlide()).toBe(3);
    screen.getByRole("button", { name: "Next slide" }).focus();
    await u.keyboard("{ArrowRight}");
    expect(currentSlide()).toBe(4);
    await u.keyboard("{ArrowLeft}");
    expect(currentSlide()).toBe(3);
    await u.click(screen.getByRole("button", { name: "Previous slide" }));
    await u.click(screen.getByRole("button", { name: "Previous slide" }));
    await u.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(currentSlide()).toBe(5);
    const viewport = screen.getByTestId("auth-carousel-viewport");
    fireEvent.touchStart(viewport, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 100 }] });
    expect(currentSlide()).toBe(1);
  });

  it("gives every image slide descriptive alt text once loaded", () => {
    render(<AuthCarousel />);
    advance(1500);
    const imgs = screen.getAllByRole("img", { hidden: true });
    expect(imgs.length).toBe(4);
    imgs.forEach(img => expect((img.getAttribute("alt") ?? "").length).toBeGreaterThan(20));
  });
});

function mockViewport(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width: 801px") ? wide : false,
    media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

function renderLayout() {
  return render(
    <MemoryRouter>
      <AuthLayout><input aria-label="Email" /></AuthLayout>
    </MemoryRouter>,
  );
}

describe("AuthLayout", () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("on wide screens shows the carousel and pauses it while the form is in use", async () => {
    mockViewport(true);
    renderLayout();
    expect(await screen.findByRole("region", { name: "How LAGDA works" })).toHaveAttribute("aria-roledescription", "carousel");
    fireEvent.focus(screen.getByLabelText("Email"));
    advance(20_000);
    expect(currentSlide()).toBe(1);
    fireEvent.blur(screen.getByLabelText("Email"));
    advance(6000);
    expect(currentSlide()).toBe(2);
  });

  it("on phones keeps the info button and modal, and never mounts the carousel or its images", async () => {
    mockViewport(false);
    const u = user();
    renderLayout();
    advance(3000);
    expect(screen.queryByRole("region", { name: "How LAGDA works" })).toBeNull();
    expect(screen.queryAllByRole("img", { hidden: true }).filter(i => /auth-carousel|webp/.test(i.getAttribute("src") ?? ""))).toHaveLength(0);
    // Shown by the phone media query (jsdom does not apply it).
    await u.click(screen.getByRole("button", { name: "How LAGDA works", hidden: true }));
    expect(screen.getByRole("dialog", { hidden: true })).toHaveTextContent("Move important work forward.");
  });
});