// The shell of every page of a request to a notary: its own top bar (the LAGDA eNotary mark, the notary's name and
// badge, a Menu), the page, and a footer. No app sidebar: this is where a client and a notary meet, as in the
// eNotary pages of 13 October. The Menu leads back to the dashboard and to the other eNotary pages.
//
// The sign-in guard is the platform's: a signed-out visitor is sent to sign in and comes back to this address.

import { Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { usePlatform } from "../context/PlatformContext";
import { LagdaLoader } from "../components/brand/LagdaLoader";
import { buildSignInUrl } from "../utils/authReturnPath";
import { useAccountFeatures } from "../hooks/useAccountFeatures";
import { useNavCounts } from "../hooks/useNavCounts";
import { NavCountBubble } from "../components/platform/InvitationCountBubble";
import { E, SERIF } from "../pages/platform/enotary/EnotaryChrome";
import { Z } from "../utils/z-index";

const FOOTER = {
  client: "The Notary Directory: choose a notary public, meet online, and keep your notarized documents in one place.",
  notary: "The notary's desk: accept requests, meet clients online, and keep your notarial register in one place.",
} as const;

export function EnotaryLayout() {
  const { sessionStatus, user } = usePlatform();
  const features = useAccountFeatures();
  const counts = useNavCounts();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const onDesk = location.pathname.startsWith("/app/enotary/desk");

  // The menu closes on a page change, on Escape, and on a click outside it.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => { if (menuRef.current !== null && !menuRef.current.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key); };
  }, [open]);

  if (sessionStatus === "initializing") {
    return <LagdaLoader mode="fullscreen" theme="light" message="Preparing your secure workspace" showWordmark spinner />;
  }
  if (sessionStatus === "expired") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace state={{ reason: "expired" }} />;
  }
  if (sessionStatus !== "authenticated") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace />;
  }

  const links: { to: string; label: string; show: boolean; bubble?: number }[] = [
    { to: "/app/dashboard", label: "Back to LAGDA", show: true },
    { to: "/app/enotary/requests", label: "My notary requests", show: features.notaryRequests || !features.notaryDesk },
    { to: "/app/enotary/desk", label: "Notary desk", show: features.notaryDesk, bubble: counts.notaryDesk },
    { to: "/app/enotary/register", label: "Notarial register", show: features.notaryDesk },
    { to: "/app/enotary/payment", label: "My payment QR", show: features.notaryDesk },
    { to: "/app/enotary/apply", label: "My application", show: features.notaryDesk },
    { to: "/app/enotary", label: "Notary Directory", show: true },
  ];
  const menuDot = counts.notaryDesk;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: E.ground, fontFamily: "'Geist', sans-serif" }}>
      <style>{`@media (max-width: 560px) { .eno-shell-badge, .eno-shell-name { display: none !important; } }`}</style>
      <header style={{ background: "#FFFFFF", borderBottom: `1px solid ${E.line}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(12px, 3vw, 28px)", minHeight: 64, display: "flex", alignItems: "center", gap: 14 }}>
          <Link to={onDesk ? "/app/enotary/desk" : "/app/enotary/requests"} aria-label="LAGDA eNotary home"
            style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22, color: E.navy, textDecoration: "none", whiteSpace: "nowrap" }}>
            LAGDA <span style={{ color: E.maroon }}>eNotary</span>
          </Link>
          <span style={{ flex: 1 }} />
          {features.notaryDesk && (
            <span data-testid="shell-notary" style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span className="eno-shell-name" style={{ fontFamily: SERIF, fontWeight: 700, color: E.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{user?.fullName ?? user?.displayName ?? ""}</span>
              <span className="eno-shell-badge" style={{ background: E.maroon, color: "#FFFFFF", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Notary Public</span>
            </span>
          )}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button type="button" onClick={() => { setOpen(value => !value); }} aria-expanded={open} aria-haspopup="true" data-testid="shell-menu"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 10, border: `1.5px solid ${E.navy}`, background: "#FFFFFF", color: E.navy, fontWeight: 700, fontSize: 14, cursor: "pointer", position: "relative" }}>
              {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />} Menu
              {!open && menuDot > 0 && <span style={{ position: "absolute", top: -6, right: -6 }}><NavCountBubble kind="notaryDesk" count={menuDot} variant="dot" /></span>}
            </button>
            {open && (
              <nav aria-label="eNotary menu" data-testid="shell-menu-list"
                style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: Z.dropdown, minWidth: 230, background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 12, boxShadow: "0 18px 44px -14px rgba(10,26,43,0.35)", padding: 6 }}>
                {links.filter(link => link.show).map(link => (
                  <Link key={link.to} to={link.to}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 44, padding: "0 12px", borderRadius: 8, color: E.ink, textDecoration: "none", fontSize: 14.5, fontWeight: 600 }}>
                    {link.label}
                    {link.bubble !== undefined && link.bubble > 0 && <NavCountBubble kind="notaryDesk" count={link.bubble} />}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </header>
      <main id="enotary-main" style={{ flex: 1, minWidth: 0 }}>
        <Suspense fallback={<LagdaLoader mode="inline" theme="light" size={28} ariaLabel="Loading page" />}>
          <Outlet />
        </Suspense>
      </main>
      <footer style={{ background: "#FFFFFF", borderTop: `1px solid ${E.line}`, padding: "28px 16px 34px", textAlign: "center" }}>
        <p style={{ margin: 0, fontFamily: SERIF, fontWeight: 700, fontSize: 18, color: E.navy }}>LAGDA <span style={{ color: E.maroon }}>eNotary</span></p>
        <p style={{ margin: "6px auto 0", maxWidth: 640, fontSize: 13.5, color: E.quiet }}>{onDesk ? FOOTER.notary : FOOTER.client}</p>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: E.faint }}>&copy; {new Date().getFullYear()} LAGDA. All rights reserved.</p>
      </footer>
    </div>
  );
}
