import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import workspaceImage from "../../../assets/auth-carousel/workspace.webp";
import uploadImage from "../../../assets/auth-carousel/upload.webp";
import signImage from "../../../assets/auth-carousel/sign.webp";
import sendImage from "../../../assets/auth-carousel/send.webp";

// Sign-in carousel shown beside the auth form on wide screens (>800px), and
// inside the "How LAGDA works" modal on phones (variant "modal").
// Images are web-optimised WebP copies of the brand SVGs in
// src/brand elements (the originals embed multi-megabyte bitmaps). The step
// images have their near-white backdrop matched to the page background and
// their edges feathered, so they sit directly on the page with no frame.

export const AUTH_STEPS = [
  {
    number: "01",
    title: "Upload Files",
    description:
      "Users securely upload contracts, forms, or official documents.",
  },
  {
    number: "02",
    title: "Digital Signing",
    description:
      "Apply legally recognized e-signatures with an intuitive interface.",
  },
  {
    number: "03",
    title: "Send for Signing",
    description:
      "Route documents to multiple signatories and track progress to completion.",
  },
] as const;

/** Short product context shown above the carousel. */
export const AUTH_CAROUSEL_LEAD = {
  kicker: "LAGDA eSIGNATURE",
  text: "Digital document signing designed for Philippine organizations and teams.",
} as const;

interface ImageSlide {
  kind: "image";
  /** "drop" = laptop that falls in; "step" = numbered how-it-works step. */
  variant: "drop" | "step";
  src: string;
  width: number;
  height: number;
  alt: string;
  number?: string;
  title: string;
  description?: string;
}

type Slide = { kind: "intro" } | ImageSlide;

export const AUTH_CAROUSEL_SLIDES: readonly Slide[] = [
  { kind: "intro" },
  {
    kind: "image",
    variant: "drop",
    src: workspaceImage,
    width: 1200,
    height: 968,
    alt: "A laptop showing the LAGDA workspace with documents ready to sign",
    title: "One clear, trusted workspace.",
  },
  {
    kind: "image",
    variant: "step",
    src: uploadImage,
    width: 1080,
    height: 725,
    alt: "Documents being uploaded securely into LAGDA",
    number: AUTH_STEPS[0].number,
    title: AUTH_STEPS[0].title,
    description: AUTH_STEPS[0].description,
  },
  {
    kind: "image",
    variant: "step",
    src: signImage,
    width: 1080,
    height: 764,
    alt: "A document with a handwritten signature and a pen, marked as signed",
    number: AUTH_STEPS[1].number,
    title: AUTH_STEPS[1].title,
    description: AUTH_STEPS[1].description,
  },
  {
    kind: "image",
    variant: "step",
    src: sendImage,
    width: 1080,
    height: 764,
    alt: "A document being sent to several signatories for signing",
    number: AUTH_STEPS[2].number,
    title: AUTH_STEPS[2].title,
    description: AUTH_STEPS[2].description,
  },
];

/** Length of the laptop's drop-in landing animation, in milliseconds. */
export const AUTH_CAROUSEL_DROP_MS = 1150;

/** How long the laptop, Upload and Signature slides each stay on screen
 *  (the laptop's counted from when its drop-in has landed). */
export const AUTH_CAROUSEL_STEP_DWELL_MS = 2000;

/**
 * Display time per slide, in milliseconds: intro 3s; laptop 2s after its
 * drop-in has fully landed; Upload 2s; Signature 2s; Send 3s; then loop.
 * The same timing drives the wide-screen carousel and the phone
 * "How LAGDA works" modal.
 */
export const AUTH_CAROUSEL_DURATIONS = [
  3000,
  AUTH_CAROUSEL_DROP_MS + AUTH_CAROUSEL_STEP_DWELL_MS,
  AUTH_CAROUSEL_STEP_DWELL_MS,
  AUTH_CAROUSEL_STEP_DWELL_MS,
  3000,
] as const;

/** How long a leaving slide stays visible while its exit animation plays. */
export const AUTH_CAROUSEL_EXIT_MS = 700;

const SLIDE_COUNT = AUTH_CAROUSEL_SLIDES.length;

function wrap(i: number): number {
  return ((i % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Direction = "forward" | "back";

interface CarouselState {
  index: number;
  /** Slide playing its exit animation, if any. */
  leaving: number | null;
  direction: Direction;
}

interface AuthCarouselProps {
  /**
   * "page" sits beside the auth form on wide screens; "modal" is the compact
   * layout used inside the phone "How LAGDA works" modal.
   */
  variant?: "page" | "modal";
}

// Autoplay always runs: it never pauses for hover, focus or typing. It only
// stops while the tab is hidden (or the carousel is unmounted, e.g. the phone
// modal is closed), and never starts under prefers-reduced-motion.
export function AuthCarousel({ variant = "page" }: AuthCarouselProps) {
  const [state, setState] = useState<CarouselState>({
    index: 0,
    leaving: null,
    direction: "forward",
  });
  const { index, leaving, direction } = state;
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [announce, setAnnounce] = useState(false);
  // Which slide images may load. Slide 2 is queued right after first paint;
  // the remaining slides load in the background shortly after.
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set());
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const first = window.setTimeout(() => {
      setLoaded((prev) => new Set(prev).add(1));
    }, 0);
    const rest = window.setTimeout(() => {
      setLoaded(new Set([1, 2, 3, 4]));
    }, 1500);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(rest);
    };
  }, []);

  // Always load the current and next slide's image.
  useEffect(() => {
    setLoaded((prev) => {
      const next = (index + 1) % SLIDE_COUNT;
      if (prev.has(index) && prev.has(next)) return prev;
      return new Set(prev).add(index).add(next);
    });
  }, [index]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  // Moves to a slide. Under reduced motion there is no exit animation, so the
  // previous slide is hidden immediately (an instant swap).
  const move = useCallback(
    (target: number, dir: Direction) => {
      setState((s) => {
        const next = wrap(target);
        if (next === s.index) return s;
        return {
          index: next,
          leaving: reducedMotion ? null : s.index,
          direction: dir,
        };
      });
    },
    [reducedMotion],
  );

  // Retire the leaving slide once its exit animation has played.
  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => {
      setState((s) => (s.leaving === null ? s : { ...s, leaving: null }));
    }, AUTH_CAROUSEL_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, index]);

  const isPaused = hidden || reducedMotion;

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setTimeout(() => {
      setAnnounce(false);
      move(index + 1, "forward");
    }, AUTH_CAROUSEL_DURATIONS[index]);
    return () => window.clearTimeout(timer);
  }, [index, isPaused, move]);

  const goTo = useCallback(
    (next: number, dir?: Direction) => {
      setAnnounce(true);
      move(next, dir ?? (next >= index ? "forward" : "back"));
    },
    [index, move],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1, "forward");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1, "back");
    }
  };

  const onTouchStart = (event: ReactTouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: ReactTouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    const end = event.changedTouches[0]?.clientX;
    if (start === null || end === undefined) return;
    const delta = end - start;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goTo(index + 1, "forward");
    else goTo(index - 1, "back");
  };

  return (
    <section
      className={`auth-carousel auth-carousel--${variant}`}
      aria-roledescription="carousel"
      aria-label="How LAGDA works"
      data-paused={isPaused ? "true" : "false"}
      onKeyDown={onKeyDown}
    >
      {variant === "page" && (
        <div className="auth-carousel-lead" data-testid="auth-carousel-lead">
          <p className="auth-carousel-lead-kicker">{AUTH_CAROUSEL_LEAD.kicker}</p>
          <p className="auth-carousel-lead-text">{AUTH_CAROUSEL_LEAD.text}</p>
        </div>
      )}

      <div
        className="auth-carousel-viewport"
        data-testid="auth-carousel-viewport"
        data-direction={direction}
        data-motion={reducedMotion ? "reduced" : "full"}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="auth-carousel-track"
          data-testid="auth-carousel-track"
          aria-live={announce ? "polite" : "off"}
        >
          {AUTH_CAROUSEL_SLIDES.map((slide, i) => {
            const stateClass =
              i === index ? " is-active" : i === leaving ? " is-leaving" : "";
            const variant = slide.kind === "intro" ? "intro" : slide.variant;
            return (
              <div
                key={i}
                className={`auth-carousel-slide auth-carousel-slide--${variant}${stateClass}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${SLIDE_COUNT}`}
                aria-hidden={i === index ? undefined : true}
                data-state={
                  i === index ? "active" : i === leaving ? "leaving" : "idle"
                }
              >
                {slide.kind === "intro" ? (
                  <IntroSlide />
                ) : (
                  <ImageSlideView slide={slide} load={loaded.has(i)} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="auth-carousel-controls">
        <button
          type="button"
          className="auth-carousel-arrow"
          aria-label="Previous slide"
          onClick={() => goTo(index - 1, "back")}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="auth-carousel-dots">
          {AUTH_CAROUSEL_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className="auth-carousel-dot"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="auth-carousel-arrow"
          aria-label="Next slide"
          onClick={() => goTo(index + 1, "forward")}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <style>{AUTH_CAROUSEL_CSS}</style>
    </section>
  );
}

/** Stagger position for an entrance animation. */
function stagger(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

function IntroSlide() {
  return (
    <div className="auth-intro">
      <p className="auth-kicker auth-anim" style={stagger(0)}>
        DOCUMENTS, SIGNED WITH CONFIDENCE
      </p>
      <h1 className="auth-anim" style={stagger(1)}>
        Move important work forward.
      </h1>
      <p className="auth-intro-copy auth-anim" style={stagger(2)}>
        Upload, sign, and send documents from one clear, trusted workspace.
      </p>
      <div className="auth-proof-list">
        {AUTH_STEPS.map((step, i) => (
          <div
            className="auth-proof-item auth-anim"
            key={step.number}
            style={stagger(3 + i)}
          >
            <span>{step.number}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageSlideView({ slide, load }: { slide: ImageSlide; load: boolean }) {
  return (
    <figure className="auth-carousel-figure">
      <div className="auth-carousel-media">
        {load ? (
          <img
            src={slide.src}
            alt={slide.alt}
            width={slide.width}
            height={slide.height}
            decoding="async"
          />
        ) : (
          <span
            className="auth-carousel-placeholder"
            role="img"
            aria-label={slide.alt}
          />
        )}
      </div>
      <figcaption>
        {slide.number && (
          <span className="auth-carousel-number auth-anim" style={stagger(0)}>
            {slide.number}
          </span>
        )}
        <span className="auth-carousel-title auth-anim" style={stagger(1)}>
          {slide.title}
        </span>
        {slide.description && (
          <span className="auth-carousel-description auth-anim" style={stagger(2)}>
            {slide.description}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

// Motion design
// - Slides are stacked; only the active one (and, briefly, the leaving one)
//   is visible, so the area never changes size.
// - Intro: its lines rise in with a short stagger.
// - Laptop ("drop"): falls from above, overshoots the landing slightly,
//   settles with a small bounce and squash, then the caption fades up.
// - Steps: the image glides in from the travel direction with a gentle scale,
//   while the caption travels further and later (parallax), line by line.
// - Leaving slide: drifts the other way and fades, a little faster.
// - prefers-reduced-motion: no animation at all; swaps are instant.
const AUTH_CAROUSEL_CSS = `
.auth-carousel { container-type: inline-size; }
.auth-carousel-lead { height: 64px; margin-bottom: 12px; overflow: hidden; }
.auth-carousel-lead-kicker { margin: 0 0 6px; color: #0078d4; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: .14em; line-height: 1.4; }
.auth-carousel-lead-text { margin: 0; color: #334155; font-size: 14px; font-weight: 600; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.auth-carousel-viewport { --dir: 1; position: relative; height: 540px; overflow: hidden; touch-action: pan-y; }
.auth-carousel-viewport[data-direction="back"] { --dir: -1; }
.auth-carousel-track { position: relative; width: 100%; height: 100%; }
.auth-carousel-slide { position: absolute; inset: 0; box-sizing: border-box; display: flex; align-items: center; visibility: hidden; pointer-events: none; }
.auth-carousel-slide.is-active { visibility: visible; pointer-events: auto; z-index: 2; }
.auth-carousel-slide.is-leaving { visibility: visible; z-index: 1; }

.auth-carousel-slide .auth-intro { width: 100%; max-width: none; }
.auth-carousel-slide .auth-kicker { margin-bottom: 16px; }
.auth-carousel-slide .auth-intro h1 { font-size: clamp(28px, 9.4cqi, 52px); margin-bottom: 16px; }
.auth-carousel-slide .auth-intro-copy { font-size: clamp(14px, 3cqi, 16px); line-height: 1.6; }
.auth-carousel-slide .auth-proof-list { gap: 16px; margin-top: 28px; }
.auth-carousel-slide .auth-proof-item { padding: 0; background: none; border: 0; border-radius: 0; box-shadow: none; grid-template-columns: 34px 1fr; gap: 12px; }
.auth-carousel-slide .auth-proof-item h2 { margin-bottom: 2px; }

.auth-carousel-figure { margin: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 16px; }
.auth-carousel-media { flex: 0 0 auto; height: 380px; min-height: 0; display: flex; align-items: center; justify-content: center; background: none; border: 0; box-shadow: none; }
.auth-carousel-slide--drop .auth-carousel-media { height: 450px; }
.auth-carousel-media img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
.auth-carousel-placeholder { display: block; width: 100%; height: 100%; }
.auth-carousel-figure figcaption { display: flex; flex-direction: column; gap: 4px; }
.auth-carousel-slide--drop figcaption { align-items: center; text-align: center; }
.auth-carousel-number { color: #0078d4; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.auth-carousel-title { color: #07111f; font-size: 22px; font-weight: 800; letter-spacing: -.02em; line-height: 1.2; }
.auth-carousel-description { color: #475569; font-size: 14px; line-height: 1.55; }

@container (max-width: 340px) {
  .auth-carousel-slide .auth-kicker { font-size: 10px; margin-bottom: 12px; }
  .auth-carousel-slide .auth-intro h1 { margin-bottom: 12px; }
  .auth-carousel-slide .auth-proof-list { gap: 12px; margin-top: 20px; }
  .auth-carousel-slide .auth-proof-item { grid-template-columns: 28px 1fr; gap: 8px; }
  .auth-carousel-slide .auth-proof-item p { font-size: 11px; }
  .auth-carousel-title { font-size: 19px; }
  .auth-carousel-description { font-size: 13px; }
  .auth-carousel-lead { height: 80px; }
  .auth-carousel-lead-text { font-size: 13px; -webkit-line-clamp: 3; }
  .auth-carousel-viewport { height: 524px; }
}

.auth-carousel-controls { display: flex; align-items: center; gap: 12px; margin-top: 16px; }

/* ── Phone modal variant ───────────────────────────────────────────────── */
/* Fits a panel of at most 455px wide and 100dvh - 24px tall: the slide area
   takes what the modal header, padding and controls leave, and each image
   shrinks to the space its caption leaves. The intro drops its step
   descriptions so it fits the same height. */
.auth-carousel--modal { width: 100%; }
.auth-carousel--modal .auth-carousel-viewport { height: clamp(260px, calc(100dvh - 150px), 460px); }
.auth-carousel--modal .auth-carousel-figure { gap: 10px; }
.auth-carousel--modal .auth-carousel-media,
.auth-carousel--modal .auth-carousel-slide--drop .auth-carousel-media { flex: 1 1 auto; height: auto; min-height: 0; }
.auth-carousel--modal .auth-carousel-title { font-size: 18px; }
.auth-carousel--modal .auth-carousel-description { font-size: 13px; line-height: 1.45; }
.auth-carousel--modal .auth-kicker { font-size: 9px; margin-bottom: 10px; }
.auth-carousel--modal .auth-intro h1 { font-size: clamp(24px, 8.5cqi, 34px); margin-bottom: 10px; }
.auth-carousel--modal .auth-intro-copy { font-size: 13px; line-height: 1.5; }
.auth-carousel--modal .auth-proof-list { gap: 10px; margin-top: 16px; }
.auth-carousel--modal .auth-proof-item { grid-template-columns: 28px 1fr; gap: 8px; }
.auth-carousel--modal .auth-proof-item h2 { font-size: 13px; margin: 0; }
.auth-carousel--modal .auth-proof-item p { display: none; }
.auth-carousel--modal .auth-carousel-controls { justify-content: center; margin-top: 12px; }
.auth-carousel-dots { display: flex; align-items: center; gap: 6px; }
.auth-carousel-dot { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 999px; background: #bfd6ee; cursor: pointer; transition: width .3s cubic-bezier(.22,1,.36,1), background .3s ease; }
.auth-carousel-dot[aria-current="true"] { width: 22px; background: #0078d4; }
.auth-carousel-arrow { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1px solid #cfe3f7; border-radius: 8px; background: rgba(255,255,255,.9); color: #334155; font: 400 18px/1 'Geist', sans-serif; cursor: pointer; }
.auth-carousel-arrow:hover { border-color: #8fc2ed; color: #005ba9; }
.auth-carousel-dot:focus-visible, .auth-carousel-arrow:focus-visible { outline: 2px solid #0078d4; outline-offset: 3px; }

/* ── Entrances ─────────────────────────────────────────────────────────── */
.auth-carousel-slide.is-active .auth-anim { animation: auth-rise .7s cubic-bezier(.22,1,.36,1) both; animation-delay: calc(var(--i, 0) * 70ms + 120ms); }
.auth-carousel-slide--step.is-active .auth-carousel-media img { animation: auth-glide .85s cubic-bezier(.22,1,.36,1) both; }
.auth-carousel-slide--step.is-active figcaption .auth-anim { animation-name: auth-glide-caption; animation-duration: .75s; animation-delay: calc(var(--i, 0) * 80ms + 200ms); }
.auth-carousel-slide--drop.is-active .auth-carousel-media img { transform-origin: 50% 100%; animation: auth-drop ${AUTH_CAROUSEL_DROP_MS}ms cubic-bezier(.33,0,.2,1) both; }
.auth-carousel-slide--drop.is-active figcaption .auth-anim { animation-delay: 700ms; }

/* ── Exits ─────────────────────────────────────────────────────────────── */
.auth-carousel-slide.is-leaving > * { animation: auth-leave .5s cubic-bezier(.4,0,.7,.2) both; }
.auth-carousel-slide--intro.is-leaving > * { animation-duration: .38s; }
.auth-carousel-slide--step.is-leaving .auth-carousel-media img { animation: auth-leave-media .55s cubic-bezier(.4,0,.7,.2) both; }
.auth-carousel-slide--step.is-leaving > .auth-carousel-figure { animation: auth-fade-out .55s ease both; }
.auth-carousel-slide--step.is-leaving figcaption { animation: auth-leave .4s cubic-bezier(.4,0,.7,.2) both; }
.auth-carousel-slide--drop.is-leaving > .auth-carousel-figure { animation: auth-lift-out .55s cubic-bezier(.4,0,.7,.2) both; }

@keyframes auth-rise { from { opacity: 0; transform: translate3d(0, 14px, 0); } to { opacity: 1; transform: none; } }
@keyframes auth-glide { from { opacity: 0; transform: translate3d(calc(var(--dir) * 9%), 0, 0) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes auth-glide-caption { from { opacity: 0; transform: translate3d(calc(var(--dir) * 36px), 6px, 0); } to { opacity: 1; transform: none; } }
@keyframes auth-drop {
  0%   { opacity: 0; transform: translate3d(0, -60%, 0); }
  18%  { opacity: 1; }
  52%  { transform: translate3d(0, 2.5%, 0) scale(1.012, .985); }
  68%  { transform: translate3d(0, -2.2%, 0) scale(.998, 1.004); }
  82%  { transform: translate3d(0, .8%, 0); }
  92%  { transform: translate3d(0, -.3%, 0); }
  100% { opacity: 1; transform: none; }
}
@keyframes auth-leave { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate3d(calc(var(--dir) * -28px), 0, 0); } }
@keyframes auth-leave-media { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate3d(calc(var(--dir) * -6%), 0, 0) scale(.97); } }
@keyframes auth-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes auth-lift-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate3d(0, -4%, 0) scale(.98); } }

@media (prefers-reduced-motion: reduce) {
  .auth-carousel-slide, .auth-carousel-slide *, .auth-carousel-dot { animation: none !important; transition: none !important; }
  .auth-carousel-slide.is-leaving { visibility: hidden; }
}
.auth-carousel-viewport[data-motion="reduced"] .auth-carousel-slide,
.auth-carousel-viewport[data-motion="reduced"] .auth-carousel-slide * { animation: none !important; }
`;
