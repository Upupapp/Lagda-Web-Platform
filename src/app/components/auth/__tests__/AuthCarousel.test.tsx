import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import {
  AuthCarousel,
  AUTH_CAROUSEL_DROP_MS,
  AUTH_CAROUSEL_DURATIONS,
  AUTH_CAROUSEL_EXIT_MS,
  AUTH_CAROUSEL_LEAD,
} from "../AuthCarousel";
import { AuthLayout } from "../../../layouts/AuthLayout";
import authLayoutSource from "../../../layouts/AuthLayout.tsx?raw";

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

  it("uses the timing intro 3s, laptop 1s after landing, Upload 1s, Signature 1s, Send 3s", () => {
    expect(AUTH_CAROUSEL_DURATIONS).toEqual([3000, AUTH_CAROUSEL_DROP_MS + 1000, 1000, 1000, 3000]);
    render(<AuthCarousel />);
    // The drop-in length in the CSS matches the constant, so the laptop
    // dwells a full second after it has landed.
    const css = Array.from(document.querySelectorAll("style")).map(s => s.textContent ?? "").join("\n");
    expect(css).toContain(`auth-drop ${AUTH_CAROUSEL_DROP_MS}ms`);
  });

  it("steps through every slide on its own timer and loops back to the intro", () => {
    render(<AuthCarousel />);
    expect(currentSlide()).toBe(1);
    advance(2800);
    expect(currentSlide()).toBe(1);
    advance(200);
    expect(currentSlide()).toBe(2);
    advance(AUTH_CAROUSEL_DROP_MS + 1000 - 200);
    expect(currentSlide()).toBe(2);
    advance(200);
    expect(currentSlide()).toBe(3);
    advance(1000);
    expect(currentSlide()).toBe(4);
    advance(1000);
    expect(currentSlide()).toBe(5);
    advance(2800);
    expect(currentSlide()).toBe(5);
    advance(200);
    expect(currentSlide()).toBe(1);
  });

  it("keeps sliding on hover and while focus is inside", async () => {
    const u = user();
    render(<AuthCarousel />);
    const region = screen.getByRole("region", { name: "How LAGDA works" });
    await u.hover(region);
    fireEvent.focus(screen.getByRole("button", { name: "Next slide" }));
    advance(3000);
    expect(currentSlide()).toBe(2);
    expect(region).toHaveAttribute("data-paused", "false");
  });

  it("stops while the tab is hidden and resumes when it is visible again", () => {
    render(<AuthCarousel />);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    advance(20_000);
    expect(currentSlide()).toBe(1);
    hidden.mockReturnValue(false);
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    advance(3000);
    expect(currentSlide()).toBe(2);
    hidden.mockRestore();
  });

  it("moves at once on prev/next/dot clicks and keeps looping from there", async () => {
    const u = user();
    render(<AuthCarousel />);
    await u.click(screen.getByRole("button", { name: "Next slide" }));
    expect(currentSlide()).toBe(2);
    // Laptop slide gets its full dwell, then autoplay carries on.
    advance(AUTH_CAROUSEL_DROP_MS + 1000);
    expect(currentSlide()).toBe(3);
    await u.click(screen.getByRole("button", { name: "Go to slide 5" }));
    expect(currentSlide()).toBe(5);
    advance(3000);
    expect(currentSlide()).toBe(1);
    await u.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(currentSlide()).toBe(5);
    advance(3000);
    expect(currentSlide()).toBe(1);
    advance(3000);
    expect(currentSlide()).toBe(2);
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
    mockReducedMotion(true); // no autoplay, so only user moves change slides
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
    await u.click(screen.getByRole("button", { name: "Next slide" }));
    await u.click(screen.getByRole("button", { name: "Next slide" }));
    expect(currentSlide()).toBe(5);
    const viewport = screen.getByTestId("auth-carousel-viewport");
    fireEvent.touchStart(viewport, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 100 }] });
    expect(currentSlide()).toBe(1);
  });

  it("shows short LAGDA context above the slides, outside the moving area", () => {
    render(<AuthCarousel />);
    const lead = screen.getByTestId("auth-carousel-lead");
    expect(lead).toHaveTextContent(AUTH_CAROUSEL_LEAD.kicker);
    expect(lead).toHaveTextContent(AUTH_CAROUSEL_LEAD.text);
    const viewport = screen.getByTestId("auth-carousel-viewport");
    expect(viewport.contains(lead)).toBe(false);
    // The lead precedes the viewport in document order.
    expect(lead.compareDocumentPosition(viewport) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    advance(20_000);
    expect(lead).toBeVisible();
  });

  it("keeps the lead copy factual: no absolute legal or security claim", () => {
    const copy = `${AUTH_CAROUSEL_LEAD.kicker} ${AUTH_CAROUSEL_LEAD.text}`;
    expect(copy).not.toMatch(/legally binding|legally valid|fully compliant|tamper-?proof|bank-grade|military-grade|100% secure|guaranteed|court-admissible/i);
  });

  it("renders the laptop as a drop-in slide and the three steps as step slides", () => {
    render(<AuthCarousel />);
    const slides = screen.getAllByRole("group", { hidden: true });
    expect(slides[0]).toHaveClass("auth-carousel-slide--intro");
    expect(slides[1]).toHaveClass("auth-carousel-slide--drop");
    slides.slice(2).forEach(s => expect(s).toHaveClass("auth-carousel-slide--step"));
    expect(slides[2]).toHaveTextContent("01");
    expect(slides[3]).toHaveTextContent("02");
    expect(slides[4]).toHaveTextContent("03");
  });

  it("marks only the current slide active and keeps the previous one for its exit animation", () => {
    render(<AuthCarousel />);
    const slides = () => screen.getAllByRole("group", { hidden: true });
    expect(slides()[0]).toHaveAttribute("data-state", "active");
    expect(slides()[0]).not.toHaveAttribute("aria-hidden");
    advance(AUTH_CAROUSEL_DURATIONS[0]);
    expect(slides()[1]).toHaveAttribute("data-state", "active");
    expect(slides()[0]).toHaveAttribute("data-state", "leaving");
    expect(slides()[0]).toHaveAttribute("aria-hidden", "true");
    advance(AUTH_CAROUSEL_EXIT_MS);
    expect(slides()[0]).toHaveAttribute("data-state", "idle");
    expect(slides().filter(s => s.getAttribute("data-state") !== "idle")).toHaveLength(1);
  });

  it("records the travel direction so transitions mirror going back", async () => {
    const u = user();
    render(<AuthCarousel />);
    const viewport = screen.getByTestId("auth-carousel-viewport");
    await u.click(screen.getByRole("button", { name: "Next slide" }));
    expect(viewport).toHaveAttribute("data-direction", "forward");
    await u.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(viewport).toHaveAttribute("data-direction", "back");
    await u.click(screen.getByRole("button", { name: "Go to slide 5" }));
    expect(viewport).toHaveAttribute("data-direction", "forward");
    await u.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(viewport).toHaveAttribute("data-direction", "back");
  });

  it("swaps instantly under prefers-reduced-motion (no leaving slide)", async () => {
    const u = user();
    mockReducedMotion(true);
    render(<AuthCarousel />);
    expect(screen.getByTestId("auth-carousel-viewport")).toHaveAttribute("data-motion", "reduced");
    await u.click(screen.getByRole("button", { name: "Next slide" }));
    const states = screen.getAllByRole("group", { hidden: true }).map(s => s.getAttribute("data-state"));
    expect(states).toEqual(["idle", "active", "idle", "idle", "idle"]);
  });

  it("puts no border, shadow or card background on the intro items or image holders", () => {
    render(<AuthCarousel />);
    const css = Array.from(document.querySelectorAll("style")).map(s => s.textContent ?? "").join("\n");
    // Body of the top-level rule whose selector is exactly `selector`.
    const rule = (selector: string) => {
      const start = css.indexOf(`\n${selector} {`);
      if (start === -1) return "";
      const open = css.indexOf("{", start);
      return css.slice(open + 1, css.indexOf("}", open));
    };
    expect(rule(".auth-carousel-media")).not.toBe("");
    const item = rule(".auth-carousel-slide .auth-proof-item");
    expect(item).toMatch(/border:\s*0/);
    expect(item).toMatch(/box-shadow:\s*none/);
    expect(item).toMatch(/background:\s*none/);
    const media = rule(".auth-carousel-media");
    expect(media).toMatch(/border:\s*0/);
    expect(media).toMatch(/box-shadow:\s*none/);
    expect(media).toMatch(/background:\s*none/);
    expect(rule(".auth-carousel-viewport")).not.toMatch(/border|box-shadow|background/);
  });

  it("gives every image slide descriptive alt text once loaded", () => {
    render(<AuthCarousel />);
    advance(1500);
    const imgs = screen.getAllByRole("img", { hidden: true });
    expect(imgs.length).toBe(4);
    imgs.forEach(img => {
      expect((img.getAttribute("alt") ?? "").length).toBeGreaterThan(20);
      // Intrinsic size reserves space, so a late image never shifts layout.
      expect(Number(img.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(img.getAttribute("height"))).toBeGreaterThan(0);
    });
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

  it("on wide screens shows the carousel and keeps it sliding while the form is in use", async () => {
    mockViewport(true);
    const u = user();
    renderLayout();
    expect(await screen.findByRole("region", { name: "How LAGDA works" })).toHaveAttribute("aria-roledescription", "carousel");
    // Focus and typing in the form take well under the intro's 3s.
    await u.click(screen.getByLabelText("Email"));
    await u.type(screen.getByLabelText("Email"), "a");
    expect(currentSlide()).toBe(1);
    advance(3000);
    expect(currentSlide()).toBe(2);
  });

  it("on phones loads nothing of the carousel until the info modal is opened", () => {
    mockViewport(false);
    renderLayout();
    advance(3000);
    expect(screen.queryByRole("region", { name: "How LAGDA works", hidden: true })).toBeNull();
    expect(screen.queryByTestId("auth-carousel-track")).toBeNull();
    expect(screen.queryAllByRole("img", { hidden: true }).filter(i => /auth-carousel|webp/.test(i.getAttribute("src") ?? ""))).toHaveLength(0);
    // The layout reaches the carousel only through a lazy dynamic import, so
    // its code and images are not part of the phone page load.
    expect(authLayoutSource).not.toMatch(/^import[^;]*AuthCarousel/m);
    expect(authLayoutSource).toMatch(/lazy\(\(\) =>\s*import\("\.\.\/components\/auth\/AuthCarousel"\)/);
  });

  it("on phones shows the sliding carousel inside the How LAGDA works modal, and stops it on close", async () => {
    mockViewport(false);
    const u = user();
    renderLayout();
    // Shown by the phone media query (jsdom does not apply it).
    await u.click(screen.getByRole("button", { name: "How LAGDA works", hidden: true }));
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const carousel = await within(dialog).findByRole("region", { name: "How LAGDA works", hidden: true });
    expect(carousel).toHaveClass("auth-carousel--modal");
    expect(within(carousel).getAllByRole("group", { hidden: true })).toHaveLength(5);
    expect(within(carousel).getByText("Move important work forward.")).toBeInTheDocument();
    expect(within(carousel).getByRole("button", { name: "Previous slide", hidden: true })).toBeInTheDocument();
    expect(within(carousel).getByRole("button", { name: "Next slide", hidden: true })).toBeInTheDocument();
    const slide = () => within(carousel).getAllByRole("button", { name: /Go to slide/, hidden: true })
      .findIndex(d => d.getAttribute("aria-current") === "true") + 1;
    expect(slide()).toBe(1);
    advance(AUTH_CAROUSEL_DURATIONS[0]);
    expect(slide()).toBe(2);
    await u.click(within(carousel).getByRole("button", { name: "Next slide", hidden: true }));
    expect(slide()).toBe(3);
    // Closing unmounts it, so autoplay stops with the modal.
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(screen.queryByRole("region", { name: "How LAGDA works", hidden: true })).toBeNull();
    // Reopening starts again from the intro.
    await u.click(screen.getByRole("button", { name: "How LAGDA works", hidden: true }));
    const again = await screen.findByRole("region", { name: "How LAGDA works", hidden: true });
    expect(within(again).getByRole("button", { name: "Go to slide 1", hidden: true })).toHaveAttribute("aria-current", "true");
    await u.click(within(screen.getByRole("dialog", { hidden: true })).getByRole("button", { name: "Close LAGDA information", hidden: true }));
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("does not autoplay the phone modal carousel under prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    const u = user();
    renderLayout();
    await u.click(screen.getByRole("button", { name: "How LAGDA works", hidden: true }));
    const carousel = await screen.findByRole("region", { name: "How LAGDA works", hidden: true });
    advance(20_000);
    expect(within(carousel).getByRole("button", { name: "Go to slide 1", hidden: true })).toHaveAttribute("aria-current", "true");
  });

  it("gives the phone modal carousel no borders or shadows on image holders", () => {
    render(<AuthCarousel variant="modal" />);
    const css = Array.from(document.querySelectorAll("style")).map(s => s.textContent ?? "").join("\n");
    const modalMedia = css.match(/\.auth-carousel--modal \.auth-carousel-media[^{]*\{([^}]*)\}/);
    expect(modalMedia).not.toBeNull();
    expect(modalMedia![1]).not.toMatch(/border|box-shadow|background/);
    expect(screen.queryByTestId("auth-carousel-lead")).toBeNull();
  });
});