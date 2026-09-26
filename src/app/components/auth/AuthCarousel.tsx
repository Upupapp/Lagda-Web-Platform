import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import workspaceImage from "../../../assets/auth-carousel/workspace.webp";
import uploadImage from "../../../assets/auth-carousel/upload.webp";
import signImage from "../../../assets/auth-carousel/sign.webp";
import sendImage from "../../../assets/auth-carousel/send.webp";

// Sign-in carousel shown beside the auth form on wide screens (>800px).
// Images are web-optimised WebP copies of the brand SVGs in
// src/brand elements (the originals embed multi-megabyte bitmaps).

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

interface ImageSlide {
  kind: "image";
  src: string;
  alt: string;
  number?: string;
  title: string;
  description?: string;
  framed?: boolean;
}

type Slide = { kind: "intro" } | ImageSlide;

export const AUTH_CAROUSEL_SLIDES: readonly Slide[] = [
  { kind: "intro" },
  {
    kind: "image",
    src: workspaceImage,
    alt: "A laptop showing the LAGDA workspace with documents ready to sign",
    title: "One clear, trusted workspace.",
    framed: true,
  },
  {
    kind: "image",
    src: uploadImage,
    alt: "Documents being uploaded securely into LAGDA",
    number: AUTH_STEPS[0].number,
    title: AUTH_STEPS[0].title,
    description: AUTH_STEPS[0].description,
  },
  {
    kind: "image",
    src: signImage,
    alt: "A document with a handwritten signature and a pen, marked as signed",
    number: AUTH_STEPS[1].number,
    title: AUTH_STEPS[1].title,
    description: AUTH_STEPS[1].description,
  },
  {
    kind: "image",
    src: sendImage,
    alt: "A document being sent to several signatories for signing",
    number: AUTH_STEPS[2].number,
    title: AUTH_STEPS[2].title,
    description: AUTH_STEPS[2].description,
  },
];

/** Display time per slide, in milliseconds. */
export const AUTH_CAROUSEL_DURATIONS = [6000, 4000, 4000, 4000, 4000] as const;

const SLIDE_COUNT = AUTH_CAROUSEL_SLIDES.length;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface AuthCarouselProps {
  /** Pause autoplay (e.g. while the user is typing in the auth form). */
  paused?: boolean;
}

export function AuthCarousel({ paused = false }: AuthCarouselProps) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
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

  const isPaused = paused || hovered || focusWithin || hidden || reducedMotion;

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setTimeout(() => {
      setAnnounce(false);
      setIndex((current) => (current + 1) % SLIDE_COUNT);
    }, AUTH_CAROUSEL_DURATIONS[index]);
    return () => window.clearTimeout(timer);
  }, [index, isPaused]);

  const goTo = useCallback((next: number) => {
    setAnnounce(true);
    setIndex(((next % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
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
    goTo(delta < 0 ? index + 1 : index - 1);
  };

  return (
    <section
      className="auth-carousel"
      aria-roledescription="carousel"
      aria-label="How LAGDA works"
      data-paused={isPaused ? "true" : "false"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="auth-carousel-viewport"
        data-testid="auth-carousel-viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="auth-carousel-track"
          data-testid="auth-carousel-track"
          aria-live={announce ? "polite" : "off"}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {AUTH_CAROUSEL_SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`auth-carousel-slide auth-carousel-slide--${slide.kind}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDE_COUNT}`}
              aria-hidden={i === index ? undefined : true}
            >
              {slide.kind === "intro" ? (
                <IntroSlide />
              ) : (
                <ImageSlideView slide={slide} load={loaded.has(i)} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-carousel-controls">
        <button
          type="button"
          className="auth-carousel-arrow"
          aria-label="Previous slide"
          onClick={() => goTo(index - 1)}
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
          onClick={() => goTo(index + 1)}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  );
}

function IntroSlide() {
  return (
    <div className="auth-intro">
      <p className="auth-kicker">DOCUMENTS, SIGNED WITH CONFIDENCE</p>
      <h1>Move important work forward.</h1>
      <p className="auth-intro-copy">
        Upload, sign, and send documents from one clear, trusted workspace.
      </p>
      <div className="auth-proof-list">
        {AUTH_STEPS.map((step) => (
          <div className="auth-proof-item" key={step.number}>
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
      <div
        className={`auth-carousel-media${slide.framed ? " auth-carousel-media--framed" : ""}`}
      >
        {load ? (
          <img src={slide.src} alt={slide.alt} decoding="async" />
        ) : (
          <span className="auth-carousel-placeholder" role="img" aria-label={slide.alt} />
        )}
      </div>
      <figcaption>
        {slide.number && (
          <span className="auth-carousel-number">{slide.number}</span>
        )}
        <span className="auth-carousel-title">{slide.title}</span>
        {slide.description && (
          <span className="auth-carousel-description">{slide.description}</span>
        )}
      </figcaption>
    </figure>
  );
}
