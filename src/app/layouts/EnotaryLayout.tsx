// The shell of every page of a request to a notary: its own top bar (the LAGDA eNotary mark and a Menu), the page, and
// a footer. No app sidebar: this is where a client and a notary meet, as in the eNotary pages of 13 October.
//
// A client keeps the Menu, which leads back to the dashboard and to the other eNotary pages. A notary's desk has more
// pages, so a notary gets instead a thin strip at the very top left with the way back to the E-signature dashboard,
// their name and badge, and a row of the desk's pages that stays under the top of the window while the page scrolls.
//
// The row of pages is one line at every width. Where it does not fit it scrolls sideways, with a button at each end
// that appears only when there is more to reach in that direction.
//
// The sign-in guard is the platform's: a signed-out visitor is sent to sign in and comes back to this address.

import { Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import {
  ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Compass, FileText, History, Inbox, Menu, QrCode, Stamp, X, type LucideProps,
} from "lucide-react";
import { usePlatform } from "../context/PlatformContext";
import { LagdaLoader } from "../components/brand/LagdaLoader";
import lagdaLogo from "../../brand elements/png/LagdaLogoPrimaryHorizontalFullColor.png";
import { buildSignInUrl } from "../utils/authReturnPath";
import { useAccountFeatures } from "../hooks/useAccountFeatures";
import { useNavCounts } from "../hooks/useNavCounts";
import { NavCountBubble } from "../components/platform/InvitationCountBubble";
import { E, SERIF } from "../pages/platform/enotary/EnotaryChrome";
import { Z } from "../utils/z-index";
import { useEnotaryCardSync } from "../hooks/useEnotaryCardSync";

const FOOTER = {
  client: "The Notary Directory: choose a notary public, meet online, and keep your notarized documents in one place.",
  notary: "The notary's desk: accept requests, meet clients online, and keep your notarial register in one place.",
} as const;

const STYLES = `
  .eno-strip { background: ${E.navy}; }
  .eno-strip a { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 clamp(12px, 3vw, 28px); color: #FFFFFF; font-size: 13.5px; font-weight: 700; text-decoration: none; letter-spacing: 0.01em; transition: background 140ms ease; }
  .eno-strip a:hover { background: rgba(255,255,255,0.12); }
  .eno-strip a:active { background: rgba(255,255,255,0.2); }
  .eno-strip a:focus-visible { outline: 3px solid #9FD0F5; outline-offset: -3px; }
  .eno-strip a svg { transition: transform 140ms ease; }
  .eno-strip a:hover svg { transform: translateX(-3px); }
  .eno-navbar { position: sticky; top: 0; z-index: ${Z.dropdown}; background: #FFFFFF; border-bottom: 1px solid ${E.line}; box-shadow: 0 6px 16px -14px rgba(10,26,43,0.5); }
  .eno-navbar-in { position: relative; max-width: 1180px; margin: 0 auto; display: flex; align-items: stretch; }
  .eno-navscroll { flex: 1 1 auto; min-width: 0; display: flex; gap: 6px; overflow-x: auto; scroll-behavior: smooth; padding: 8px clamp(12px, 3vw, 28px); scrollbar-width: none; -ms-overflow-style: none; }
  .eno-navscroll::-webkit-scrollbar { display: none; }
  .eno-nav { flex: 0 0 auto; position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid transparent; color: ${E.ink}; font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap;
    transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 100ms ease, box-shadow 140ms ease; }
  .eno-nav svg { color: ${E.quiet}; transition: color 140ms ease, transform 140ms ease; }
  .eno-nav:hover { background: ${E.skyWash}; border-color: ${E.skyLine}; color: ${E.navy}; transform: translateY(-1px); box-shadow: 0 4px 10px -6px rgba(10,26,43,0.35); }
  .eno-nav:hover svg { color: ${E.skyDeep}; transform: scale(1.08); }
  .eno-nav:active { transform: translateY(0) scale(0.97); background: #D6E9F9; box-shadow: none; }
  .eno-nav:focus-visible { outline: 3px solid rgba(10,132,214,0.45); outline-offset: 2px; }
  .eno-nav[aria-current="page"] { background: #FFF1F5; border-color: ${E.maroonLine}; color: ${E.maroon}; font-weight: 800; }
  .eno-nav[aria-current="page"] svg { color: ${E.maroon}; }
  .eno-nav[aria-current="page"]::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: -9px; height: 3px; border-radius: 3px 3px 0 0; background: ${E.maroon}; }
  .eno-arrow { flex: 0 0 auto; width: 40px; display: grid; place-items: center; border: 0; background: #FFFFFF; color: ${E.navy}; cursor: pointer; position: relative; z-index: 1; transition: background 140ms ease, color 140ms ease; }
  .eno-arrow:hover { background: ${E.skyWash}; color: ${E.skyDeep}; }
  .eno-arrow:active { background: #D6E9F9; }
  .eno-arrow:focus-visible { outline: 3px solid rgba(10,132,214,0.45); outline-offset: -3px; }
  .eno-arrow.left { box-shadow: 8px 0 10px -8px rgba(10,26,43,0.3); }
  .eno-arrow.right { box-shadow: -8px 0 10px -8px rgba(10,26,43,0.3); }
  .eno-bubble { margin-left: 2px; }
  @media (max-width: 560px) { .eno-shell-badge, .eno-shell-name { display: none !important; } }
  @media (prefers-reduced-motion: reduce) { .eno-nav, .eno-nav svg, .eno-strip a svg, .eno-navscroll { transition: none; scroll-behavior: auto; } .eno-nav:hover { transform: none; } }
`;

interface NavItem { to: string; label: string; icon: ComponentType<LucideProps>; show: boolean; bubble?: number; exact?: boolean }

/** The current page: its own path, or one of its sub-pages. The directory is only itself. */
const isCurrent = (item: NavItem, pathname: string): boolean =>
  item.exact === true ? pathname === item.to || pathname === `${item.to}/` : pathname === item.to || pathname.startsWith(`${item.to}/`);

export function EnotaryLayout() {
  const { sessionStatus, user } = usePlatform();
  const features = useAccountFeatures();
  const counts = useNavCounts();
  const location = useLocation();
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const onDesk = location.pathname.startsWith("/app/enotary/desk");
  // The Notarial Request History has its own way back to the dashboard in its hero, so the client's Menu is left out there.
  const onHistory = location.pathname === "/app/enotary/requests" || location.pathname === "/app/enotary/requests/";
  const notary = features.notaryDesk;
  useEnotaryCardSync(sessionStatus === "authenticated");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // The client's menu closes on a page change, on Escape, and on a click outside it.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => { if (menuRef.current !== null && !menuRef.current.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key); };
  }, [open]);

  const measure = useCallback(() => {
    const element = scroller.current;
    if (element === null) return;
    const next = { left: element.scrollLeft > 2, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 };
    setEdges(current => (current.left === next.left && current.right === next.right ? current : next));
  }, []);

  useEffect(() => {
    measure();
    const element = scroller.current;
    if (element === null) return;
    element.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => { element.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); observer?.disconnect(); };
  }, [measure, sessionStatus, notary]);

  // The page you are on is brought into view when the row is wider than the window.
  useEffect(() => {
    const element = scroller.current;
    const current = element?.querySelector('[aria-current="page"]');
    if (element !== null && current instanceof HTMLElement && typeof current.scrollIntoView === "function") current.scrollIntoView({ inline: "center", block: "nearest" });
  }, [location.pathname]);

  if (sessionStatus === "initializing") {
    return <LagdaLoader mode="fullscreen" theme="light" message="Preparing your secure workspace" showWordmark spinner />;
  }
  if (sessionStatus === "expired") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace state={{ reason: "expired" }} />;
  }
  if (sessionStatus !== "authenticated") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace />;
  }

  const items: NavItem[] = [
    { to: "/app/enotary/requests", label: features.notaryDesk ? "My notary requests" : "Notarial Request History", icon: History, show: features.notaryRequests || !features.notaryDesk },
    { to: "/app/enotary/desk", label: "Notary desk", icon: Inbox, show: features.notaryDesk, bubble: counts.notaryDesk },
    { to: "/app/enotary/register", label: "Notary Book", icon: BookOpen, show: features.notaryDesk },
    { to: "/app/enotary/seal", label: "Seal and signature", icon: Stamp, show: features.notaryDesk },
    { to: "/app/enotary/payment", label: "My payment QR", icon: QrCode, show: features.notaryDesk },
    { to: "/app/enotary/apply", label: "My application", icon: FileText, show: features.notaryDesk },
    { to: "/app/enotary", label: "Notary Directory", icon: Compass, show: true, exact: true },
  ];
  const clientLinks: { to: string; label: string; show: boolean }[] = [
    { to: "/app/dashboard", label: "Back to LAGDA", show: true },
    { to: "/app/enotary/requests", label: "My notary requests", show: features.notaryRequests || !notary },
    { to: "/app/enotary", label: "Notary Directory", show: true },
  ];
  const slide = (direction: -1 | 1) => {
    const element = scroller.current;
    if (element !== null) element.scrollBy({ left: direction * Math.max(160, Math.round(element.clientWidth * 0.6)), behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: E.ground, fontFamily: "'Geist', sans-serif" }}>
      <style>{STYLES}</style>
      {notary && (
        <div className="eno-strip">
          <Link to="/app/dashboard" data-testid="back-to-dashboard"><ArrowLeft size={16} aria-hidden /> Back to E-signature Dashboard</Link>
        </div>
      )}
      <header style={{ background: "#FFFFFF", borderBottom: `1px solid ${E.line}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(12px, 3vw, 28px)", minHeight: 60, display: "flex", alignItems: "center", gap: 14 }}>
          <Link to={onDesk ? "/app/enotary/desk" : "/app/enotary/requests"} aria-label="LAGDA eNotary home"
            style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22, color: E.navy, textDecoration: "none", whiteSpace: "nowrap" }}>
            LAGDA <span style={{ color: E.maroon }}>eNotary</span>
          </Link>
          <span style={{ flex: 1 }} />
          {notary && (
            <span data-testid="shell-notary" style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span className="eno-shell-name" style={{ fontFamily: SERIF, fontWeight: 700, color: E.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{user?.fullName ?? user?.displayName ?? ""}</span>
              <span className="eno-shell-badge" style={{ background: E.maroon, color: "#FFFFFF", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Notary Public</span>
            </span>
          )}
          {!notary && !onHistory && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button type="button" onClick={() => { setOpen(value => !value); }} aria-expanded={open} aria-haspopup="true" data-testid="shell-menu"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 10, border: `1.5px solid ${E.navy}`, background: "#FFFFFF", color: E.navy, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />} Menu
              </button>
              {open && (
                <nav aria-label="eNotary menu" data-testid="shell-menu-list"
                  style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: Z.dropdown, minWidth: 230, background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 12, boxShadow: "0 18px 44px -14px rgba(10,26,43,0.35)", padding: 6 }}>
                  {clientLinks.filter(link => link.show).map(link => (
                    <Link key={link.to} to={link.to}
                      style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "0 12px", borderRadius: 8, color: E.ink, textDecoration: "none", fontSize: 14.5, fontWeight: 600 }}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          )}
        </div>
      </header>
      {notary && <nav className="eno-navbar" aria-label="eNotary menu" data-testid="shell-nav">
        <div className="eno-navbar-in">
          {edges.left && <button type="button" className="eno-arrow left" aria-label="Show earlier pages" data-testid="nav-left" onClick={() => { slide(-1); }}><ChevronLeft size={20} aria-hidden /></button>}
          <div ref={scroller} className="eno-navscroll" data-testid="shell-nav-scroll">
            {items.filter(item => item.show).map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="eno-nav" aria-current={isCurrent(item, location.pathname) ? "page" : undefined}>
                  <Icon size={18} aria-hidden />
                  {item.label}
                  {item.bubble !== undefined && item.bubble > 0 && <span className="eno-bubble"><NavCountBubble kind="notaryDesk" count={item.bubble} /></span>}
                </Link>
              );
            })}
          </div>
          {edges.right && <button type="button" className="eno-arrow right" aria-label="Show more pages" data-testid="nav-right" onClick={() => { slide(1); }}><ChevronRight size={20} aria-hidden /></button>}
        </div>
      </nav>}
      <main id="enotary-main" style={{ flex: 1, minWidth: 0 }}>
        <Suspense fallback={<LagdaLoader mode="inline" theme="light" size={28} ariaLabel="Loading page" />}>
          <Outlet />
        </Suspense>
      </main>
      <footer data-testid="enotary-footer" style={{ background: "linear-gradient(180deg, #0B1F44 0%, #081833 100%)", borderTop: "3px solid #C9A24A", padding: "30px 16px 34px", textAlign: "center", color: "#FFFFFF" }}>
        <div data-testid="footer-logo" style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 16px 8px 10px", borderRadius: 12, background: "#FFFFFF", boxShadow: "0 8px 22px -12px rgba(0,0,0,0.6)", maxWidth: "100%", boxSizing: "border-box" }}>
          <img src={lagdaLogo} alt="LAGDA" style={{ display: "block", width: "clamp(118px, 34vw, 150px)", aspectRatio: "200 / 58", height: "auto", objectFit: "cover", objectPosition: "left center" }} />
          <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", background: E.line }} />
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(19px, 5vw, 23px)", color: E.maroon, letterSpacing: "0.01em" }}>eNotary</span>
        </div>
        <p style={{ margin: "14px auto 0", maxWidth: 640, fontSize: 13.5, color: "#FFFFFF", lineHeight: 1.6 }}>{onDesk ? FOOTER.notary : FOOTER.client}</p>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.78)" }}>&copy; {new Date().getFullYear()} LAGDA. All rights reserved.</p>
      </footer>
    </div>
  );
}
