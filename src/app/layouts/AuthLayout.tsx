import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { APP_CONFIG } from "../config/app.config";
import { usePageMeta } from "../hooks/usePageMeta";

import lagdaLogo from "../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor.svg";

// Minimal shell for authentication routes (/sign-in, /create-account, etc.)
// Uses the deep navy background with the white-horizontal logo variant.
// Deliberately separate from PublicLayout so the marketing nav is never
// shown on auth screens.

// Loaded only on wide screens, so phones never fetch the carousel or its images.
const AuthCarousel = lazy(() =>
  import("../components/auth/AuthCarousel").then((m) => ({ default: m.AuthCarousel })),
);

const WIDE_QUERY = "(min-width: 801px)";

function readWide(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(WIDE_QUERY).matches;
}

/** True above the 800px phone breakpoint, where the carousel is shown. */
function useIsWide(): boolean {
  const [wide, setWide] = useState(readWide);
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return wide;
}

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  usePageMeta();
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const isWide = useIsWide();
  // Pause the carousel while the user is working in the form.
  const [formActive, setFormActive] = useState(false);

  useEffect(() => {
    if (!mobileInfoOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileInfoOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileInfoOpen]);

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <div className="auth-brand-row">
          <Link
            to="/esignature"
            className="auth-back-button"
            aria-label="Back to LAGDA eSignature"
          >
            <span aria-hidden="true">←</span> Back to LAGDA eSignature
          </Link>
          <span className="auth-secure-mark">DIGITAL SIGNING PLATFORM</span>
        </div>

        <div className="auth-mobile-info-row">
          <button
            type="button"
            className="auth-mobile-info-button"
            aria-haspopup="dialog"
            aria-expanded={mobileInfoOpen}
            onClick={() => setMobileInfoOpen(true)}
          >
            How LAGDA works
          </button>
        </div>

        <div className="auth-grid">
          {/* Wide screens only: on phones the intro lives in the
              "How LAGDA works" modal, and the carousel (and its images)
              is never mounted. */}
          {isWide && (
            <Suspense fallback={<div className="auth-carousel" aria-hidden="true" style={{ minHeight: 612 }} />}>
              <AuthCarousel paused={formActive} />
            </Suspense>
          )}

          <div
            className="auth-card"
            onFocus={() => setFormActive(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setFormActive(false);
              }
            }}
            onInput={() => setFormActive(true)}
          >
            <span className="auth-form-label">Sign-in Page</span>
            <div className="auth-card-logo">
              <img src={lagdaLogo} alt="LAGDA" />
            </div>
            {children}
          </div>
        </div>

        <footer className="auth-footer">
          <div className="auth-footer-links">
            <Link to="/legal/privacy">Privacy Policy</Link>
            <Link to="/legal/terms">Terms of Service</Link>
            <Link to="/help">Help Center</Link>
          </div>
          <p>
            © {new Date().getFullYear()} {APP_CONFIG.company}
          </p>
        </footer>
      </div>

      {mobileInfoOpen && (
        <div className="auth-mobile-modal" role="presentation">
          <button
            type="button"
            className="auth-mobile-modal-backdrop"
            aria-label="Close LAGDA information"
            onClick={() => setMobileInfoOpen(false)}
          />
          <section
            className="auth-mobile-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-mobile-intro-title"
          >
            <div className="auth-mobile-modal-header">
              <p className="auth-kicker">DOCUMENTS, SIGNED WITH CONFIDENCE</p>
              <button
                type="button"
                className="auth-mobile-modal-close"
                aria-label="Close LAGDA information"
                onClick={() => setMobileInfoOpen(false)}
              >
                ×
              </button>
            </div>
            <h2 id="auth-mobile-intro-title">Move important work forward.</h2>
            <p className="auth-intro-copy">
              Upload, sign, and send documents from one clear, trusted
              workspace.
            </p>
            <div className="auth-proof-list">
              <div className="auth-proof-item">
                <span>01</span>
                <div>
                  <h3>Upload Files</h3>
                  <p>
                    Users securely upload contracts, forms, or official
                    documents.
                  </p>
                </div>
              </div>
              <div className="auth-proof-item">
                <span>02</span>
                <div>
                  <h3>Digital Signing</h3>
                  <p>
                    Apply legally recognized e-signatures with an intuitive
                    interface.
                  </p>
                </div>
              </div>
              <div className="auth-proof-item">
                <span>03</span>
                <div>
                  <h3>Send for Signing</h3>
                  <p>
                    Route documents to multiple signatories and track progress
                    to completion.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <style>{`
        .auth-shell { min-height: 100vh; background: #f5faff; color: #07111f; font-family: 'Geist', 'Inter', sans-serif; padding: 28px clamp(20px, 5vw, 72px); position: relative; overflow: hidden; }
        .auth-shell::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .65; background-image: linear-gradient(rgba(0,120,212,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,120,212,.07) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom right, black, transparent 64%); }
        .auth-frame { max-width: 1180px; min-height: calc(100vh - 56px); margin: 0 auto; position: relative; display: flex; flex-direction: column; }
        .auth-brand-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .auth-back-button { display: inline-flex; align-items: center; gap: 8px; color: #0078d4; font-size: 12px; font-weight: 700; text-decoration: none; transition: color .15s ease, transform .15s ease; }
        .auth-back-button span { font-size: 18px; line-height: 0; }
        .auth-back-button:hover { color: #005ba9; transform: translateX(-2px); }
        .auth-secure-mark { color: #64748b; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
        .auth-grid { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, 440px); align-items: center; gap: clamp(48px, 9vw, 140px); padding: 72px 0 56px; }
        .auth-intro { max-width: 520px; }
        .auth-kicker { color: #0078d4; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: .12em; margin: 0 0 22px; }
        .auth-intro h1 { color: #07111f; font-size: clamp(36px, 5vw, 64px); font-weight: 800; letter-spacing: -.045em; line-height: 1.02; margin: 0 0 24px; }
        .auth-intro-copy { color: #475569; font-size: 17px; line-height: 1.65; margin: 0; max-width: 460px; }
        .auth-proof-list { display: flex; flex-direction: column; gap: 14px; margin-top: 40px; max-width: 500px; }
        .auth-proof-item { display: grid; grid-template-columns: 38px 1fr; gap: 14px; align-items: start; padding: 14px 16px; background: rgba(255,255,255,.78); border: 1px solid #dbeafe; border-radius: 12px; box-shadow: 0 4px 14px rgba(7,17,31,.04); }
        .auth-proof-item > span { color: #0078d4; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; padding-top: 2px; }
        .auth-proof-item h2 { color: #07111f; font-size: 14px; font-weight: 800; margin: 0 0 3px; }
        .auth-proof-item p { color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; }
        .auth-card { width: 100%; box-sizing: border-box; position: relative; background: #fff; border: 1px solid #dbeafe; border-radius: 16px; padding: 116px 32px 32px; box-shadow: 0 24px 80px rgba(7,17,31,.12); }
        .auth-form-label { position: absolute; top: 26px; left: 28px; color: #334155; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: 600; letter-spacing: .02em; line-height: 1; }
        .auth-card-logo { position: absolute; top: 16px; right: 18px; display: flex; justify-content: flex-end; pointer-events: none; }
        .auth-card-logo img { display: block; width: 234px; height: 97px; object-fit: cover; object-position: right center; }
        .auth-footer { display: flex; align-items: center; justify-content: center; gap: 24px; padding-top: 20px; color: #64748b; font-family: 'Geist Mono', monospace; font-size: 11px; }
        .auth-footer p { margin: 0; }
        .auth-footer-links { display: flex; flex-wrap: wrap; gap: 20px; }
        .auth-footer a { color: #475569; text-decoration: none; }
        .auth-footer a:hover { color: #0078d4; }
        .auth-carousel { min-width: 0; max-width: 540px; width: 100%; }
        .auth-carousel-viewport { overflow: hidden; height: 560px; border-radius: 16px; touch-action: pan-y; }
        .auth-carousel-track { display: flex; height: 100%; transition: transform .45s ease; will-change: transform; }
        .auth-carousel-slide { flex: 0 0 100%; min-width: 0; height: 100%; box-sizing: border-box; display: flex; align-items: center; }
        .auth-carousel-slide .auth-intro { width: 100%; max-width: none; }
        .auth-carousel-slide .auth-kicker { margin-bottom: 18px; }
        .auth-carousel-slide .auth-intro h1 { font-size: clamp(34px, 4.2vw, 54px); margin-bottom: 18px; }
        .auth-carousel-slide .auth-intro-copy { font-size: 16px; line-height: 1.6; }
        .auth-carousel-slide .auth-proof-list { gap: 10px; margin-top: 26px; }
        .auth-carousel-slide .auth-proof-item { padding: 11px 14px; }
        .auth-carousel-figure { margin: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 18px; }
        .auth-carousel-media { flex: 0 1 auto; height: 400px; min-height: 0; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #dbeafe; border-radius: 16px; box-shadow: 0 16px 48px rgba(7,17,31,.08); overflow: hidden; }
        .auth-carousel-media--framed { padding: 18px; box-sizing: border-box; }
        .auth-carousel-media img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
        .auth-carousel-placeholder { display: block; width: 100%; height: 100%; background: linear-gradient(135deg, #f8fbff, #eef5fd); }
        .auth-carousel-figure figcaption { display: flex; flex-direction: column; gap: 4px; }
        .auth-carousel-number { color: #0078d4; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
        .auth-carousel-title { color: #07111f; font-size: 22px; font-weight: 800; letter-spacing: -.02em; line-height: 1.2; }
        .auth-carousel-description { color: #475569; font-size: 14px; line-height: 1.55; }
        .auth-carousel-controls { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
        .auth-carousel-dots { display: flex; align-items: center; gap: 6px; }
        .auth-carousel-dot { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 999px; background: #bfd6ee; cursor: pointer; transition: width .2s ease, background .2s ease; }
        .auth-carousel-dot[aria-current="true"] { width: 22px; background: #0078d4; }
        .auth-carousel-arrow { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1px solid #cfe3f7; border-radius: 8px; background: rgba(255,255,255,.9); color: #334155; font: 400 18px/1 'Geist', sans-serif; cursor: pointer; }
        .auth-carousel-arrow:hover { border-color: #8fc2ed; color: #005ba9; }
        .auth-carousel-dot:focus-visible, .auth-carousel-arrow:focus-visible { outline: 2px solid #0078d4; outline-offset: 3px; }
        .auth-mobile-info-row, .auth-mobile-modal { display: none; }
        .auth-back-button:focus-visible, .auth-footer a:focus-visible { outline: 2px solid #0078d4; outline-offset: 4px; border-radius: 4px; }
        @media (max-width: 800px) { .auth-carousel { display: none; } .auth-grid { grid-template-columns: 1fr; gap: 32px; padding: 52px 0 40px; } .auth-intro { display: none; } .auth-secure-mark { display: none; } .auth-mobile-info-row { display: flex; justify-content: flex-end; margin-top: 14px; } .auth-mobile-info-button { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; max-width: 100%; padding: 8px 14px; border: 1px solid #b9d8f5; border-radius: 999px; background: rgba(255,255,255,.9); color: #005ba9; font: 700 11px 'Geist', sans-serif; box-shadow: 0 6px 18px rgba(7,17,31,.08); cursor: pointer; } .auth-mobile-info-button:hover { background: #ffffff; border-color: #8fc2ed; } .auth-mobile-modal { display: flex; position: fixed; inset: 0; z-index: 30; align-items: center; justify-content: center; padding: 12px; } .auth-mobile-modal-backdrop { position: absolute; inset: 0; border: 0; background: rgba(7,17,31,.48); cursor: pointer; } .auth-mobile-modal-panel { position: relative; width: min(100%, 455px); max-height: calc(100dvh - 24px); overflow-y: auto; box-sizing: border-box; padding: 20px; border: 1px solid #dbeafe; border-radius: 16px; background: #f5faff; box-shadow: 0 20px 60px rgba(7,17,31,.25); } .auth-mobile-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; } .auth-mobile-modal-header .auth-kicker { margin: 2px 0 14px; font-size: 9px; line-height: 1.35; } .auth-mobile-modal-close { flex: 0 0 auto; width: 30px; height: 30px; border: 1px solid #cfe3f7; border-radius: 8px; background: #ffffff; color: #334155; font: 400 22px/1 'Geist', sans-serif; cursor: pointer; } .auth-mobile-modal-panel h2 { color: #07111f; font-size: clamp(28px, 8vw, 40px); font-weight: 800; letter-spacing: -.04em; line-height: 1.02; margin: 0 0 14px; } .auth-mobile-modal-panel .auth-intro-copy { font-size: clamp(14px, 4vw, 17px); line-height: 1.55; margin-bottom: 22px; } .auth-mobile-modal-panel .auth-proof-list { gap: 10px; margin-top: 0; } .auth-mobile-modal-panel .auth-proof-item { grid-template-columns: 34px 1fr; gap: 10px; padding: 12px; border-radius: 10px; } .auth-mobile-modal-panel .auth-proof-item h3 { color: #07111f; font-size: 13px; margin: 0 0 3px; } .auth-mobile-modal-panel .auth-proof-item p { font-size: 11px; line-height: 1.45; } }
        @media (max-width: 480px) { .auth-shell { padding: 20px 16px; } .auth-grid { padding-top: 42px; } .auth-card { max-width: 520px; padding: 136px 20px 30px; } .auth-form-label { top: 23px; left: 20px; font-size: 14px; } .auth-card-logo { top: 5px; right: 0px; } .auth-footer { align-items: center; flex-direction: column; text-align: center; gap: 12px; } .auth-footer-links { justify-content: center; } }
        @media (prefers-reduced-motion: reduce) { .auth-back-button, .auth-carousel-track, .auth-carousel-dot { transition: none; } }
      `}</style>
    </div>
  );
}
