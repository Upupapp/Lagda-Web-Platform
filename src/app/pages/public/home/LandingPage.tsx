import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAccountCta } from "@/app/hooks/useSignedIn";
import { ENOTARY_DIRECTORY_PATH } from "@/app/config/enotary-directory";
import imgLagdaLogo from "@/assets/landing/lagda-logo.png";
import imgP01HeroContract from "@/assets/landing/p01-hero-contract.webp";
import imgP13Cityhall from "@/assets/landing/p13-cityhall.webp";
import imgP11Lawyer from "@/assets/landing/p11-lawyer.webp";
import imgP14Keys from "@/assets/landing/p14-keys.webp";
import imgP12Business from "@/assets/landing/p12-business.webp";
import imgP16Hr from "@/assets/landing/p16-hr.webp";
import imgP17Finance from "@/assets/landing/p17-finance.webp";
import imgP18Education from "@/assets/landing/p18-education.webp";
import imgP07TabletSign from "@/assets/landing/p07-tablet-sign.webp";
import imgShotDashboard from "@/assets/landing/shot-dashboard.webp";
import imgShotDoctable from "@/assets/landing/shot-doctable.webp";
import imgP10PhoneCheck from "@/assets/landing/p10-phone-check.webp";
import imgP19Colleagues from "@/assets/landing/p19-colleagues.webp";
import imgP20Handshake from "@/assets/landing/p20-handshake.webp";
import imgLagdaLogoNavy from "@/assets/landing/lagda-logo-navy.png";
import "./landing.css";

/**
 * The home page (`/`), ported value for value from the approved reference in
 * design-handoff/landing/reference/index.html. Inline styles, copy and markup
 * are copied as they are there; the reference's <style> block lives in
 * landing.css with every class prefixed `lgl-`. Rendered by LandingLayout,
 * which has no site header, footer or wave backdrop: this page brings its own.
 */
export function LandingPage() {
  const cta = useAccountCta();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [verifyId, setVerifyId] = useState("");

  function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = verifyId.trim();
    void navigate(id ? `/verify/${encodeURIComponent(id)}` : "/verify");
  }

  return (
    <div className="lgl-root" style={{ fontFamily: "'Geist', sans-serif", color: "#0B1730", background: "#ffffff", minWidth: "0" }}>
      {/* First screen: announcement + header + hero + fact strip fill exactly one viewport */}
      <div className="lgl-first-screen">
        {/* Announcement bar */}
        <div style={{ background: "#5B2A86", color: "#ffffff", borderBottom: "1px solid #3E1C5E" }}>
          <div className="lgl-wide" style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "9px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "8px 16px", fontSize: "14px" }}>
            <span>
              <strong style={{ fontWeight: "700" }}>
                LAGDA eNotary is coming soon.
              </strong>
              {" "}Notarize documents electronically, subject to Supreme Court accreditation.
            </span>
            {" "}
            <Link style={{ display: "inline-flex", alignItems: "center", minHeight: "32px", padding: "0 14px", borderRadius: "8px", background: "#ffffff", color: "#5B2A86", fontSize: "13px", fontWeight: "600" }} to="/enotary/waitlist">
              Join the waitlist
            </Link>
          </div>
        </div>
        {/* Header */}
        <header id="site-header" className={menuOpen ? "lgl-hdr-open" : undefined} style={{ position: "relative", zIndex: "5", background: "#ffffff", borderBottom: "1px solid #EEF1F5" }}>
          <div className="lgl-wide" style={{ boxSizing: "border-box", padding: "0 32px", minHeight: "72px", display: "flex", alignItems: "center", gap: "12px 32px" }}>
            <div className="lgl-hdr-left">
              <Link aria-label="LAGDA home" style={{ display: "flex", flex: "none" }} to="/">
                <img src={imgLagdaLogo} alt="LAGDA.io" style={{ width: "140px", height: "auto", display: "block" }} />
              </Link>
              <nav id="main-nav" className="lgl-hdr-nav" aria-label="Main">
                <Link to="/esignature">
                  eSignature
                </Link>
                {" "}
                <Link to="/solutions">
                  Solutions
                </Link>
                {" "}
                <Link to="/pricing">
                  Pricing
                </Link>
                {" "}
                <Link to="/security">
                  Security
                </Link>
                {" "}
                <Link to="/resources">
                  Resources
                </Link>
                {" "}
                <Link to="/enotary">
                  eNotary
                </Link>
              </nav>
            </div>
            <div className="lgl-hdr-actions">
              {!cta.signedIn && (
                <Link className="lgl-hdr-signin" style={{ display: "inline-flex", alignItems: "center", minHeight: "40px", padding: "0 14px", color: "#0B1730", fontSize: "14px", fontWeight: "600" }} to="/sign-in">
                  Sign in
                </Link>
              )}
              {" "}
              <Link className="lgl-hdr-cta lgl-btn-primary" style={{ display: "inline-flex", alignItems: "center", minHeight: "40px", padding: "0 18px", borderRadius: "10px", background: "#0B3981", color: "#ffffff", fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }} to={cta.path}>
                {cta.signedIn ? cta.label : "Get started free"}
              </Link>
              {" "}
              <button type="button" className="lgl-hdr-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-controls="main-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 6h14M3 10h14M3 14h14" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        {/* Hero (background photo, dark gradient from below) */}
        <section aria-labelledby="hero-h" className="lgl-hero" style={{ position: "relative", overflow: "hidden", background: "#ffffff", color: "#0B1730", flex: "1 0 auto", display: "flex", flexDirection: "column" }}>
          <img className="lgl-hero-bg" src={imgP01HeroContract} alt="" aria-hidden="true" />
          <div className="lgl-hero-fade" aria-hidden="true" />
          <div className="lgl-wide lgl-hero-inner" style={{ position: "relative", boxSizing: "border-box", flex: "1 0 auto", display: "flex", alignItems: "flex-end" }}>
            <div style={{ flex: "0 1 640px", minWidth: "0" }}>
              <p style={{ display: "inline-flex", alignItems: "center", gap: "10px", margin: "0 0 24px", padding: "6px 14px", borderRadius: "999px", background: "#F3EDFA", border: "1px solid #E2D6F3", color: "#5B2A86", fontSize: "14px", fontWeight: "600" }}>
                Built for Philippine workflows
              </p>
              <h1 id="hero-h" className="lgl-hero-h1" style={{ margin: "0 0 24px", fontWeight: "700", lineHeight: "0.98", letterSpacing: "-0.045em", color: "#0B1730" }}>
                Get it{" "}
                <span style={{ color: "#0B3981" }}>
                  signed.
                </span>
                <br />
                Keep the proof.
              </h1>
              <p className="lgl-hero-lede" style={{ margin: "0 0 36px", maxWidth: "520px", color: "#3D4A63", lineHeight: "1.55" }}>
                Prepare documents, confirm who's signing, collect signatures, and keep a record anyone can verify.
              </p>
              <div className="lgl-hero-ctas" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                <Link className="lgl-btn-light" style={{ display: "inline-flex", alignItems: "center", minHeight: "54px", padding: "0 28px", borderRadius: "12px", background: "#0B3981", color: "#ffffff", fontSize: "16px", fontWeight: "700" }} to={cta.path}>
                  {cta.signedIn ? cta.label : "Create a free account"}
                </Link>
                {" "}
                <Link className="lgl-btn-ghost" style={{ display: "inline-flex", alignItems: "center", minHeight: "54px", padding: "0 24px", border: "1px solid #B9C3D3", borderRadius: "12px", background: "#ffffff", color: "#0B1730", fontSize: "16px", fontWeight: "600" }} to="/book-a-demo">
                  Book a demo
                </Link>
              </div>
            </div>
          </div>
          {/* Fact strip */}
          <div className="lgl-hero-strip">
            <dl className="lgl-wide" style={{ margin: "0 auto", boxSizing: "border-box", padding: "24px 32px 26px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px 32px" }}>
              <div>
                <dt style={{ margin: "0 0 4px", color: "#5B2A86", fontSize: "15px", fontWeight: "700" }}>
                  Free for recipients
                </dt>
                <dd style={{ margin: "0", color: "#4A5772", fontSize: "14px" }}>
                  Signers use a free LAGDA account
                </dd>
              </div>
              <div>
                <dt style={{ margin: "0 0 4px", color: "#5B2A86", fontSize: "15px", fontWeight: "700" }}>
                  Signer checks
                </dt>
                <dd style={{ margin: "0", color: "#4A5772", fontSize: "14px" }}>
                  Secure links and email codes
                </dd>
              </div>
              <div>
                <dt style={{ margin: "0 0 4px", color: "#5B2A86", fontSize: "15px", fontWeight: "700" }}>
                  Signing order
                </dt>
                <dd style={{ margin: "0", color: "#4A5772", fontSize: "14px" }}>
                  Parallel, sequential, or mixed
                </dd>
              </div>
              <div>
                <dt style={{ margin: "0 0 4px", color: "#5B2A86", fontSize: "15px", fontWeight: "700" }}>
                  Verification ID
                </dt>
                <dd style={{ margin: "0", color: "#4A5772", fontSize: "14px" }}>
                  QR code on every completed document
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
      {/* /first-screen */}
      {/* Live signing */}
      <section aria-labelledby="live-h" style={{ background: "#F7F9FC", color: "#0B1730" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "112px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "64px 56px" }}>
          <div style={{ flex: "999 1 420px", minWidth: "0", maxWidth: "520px" }}>
            <h2 id="live-h" style={{ margin: "0 0 20px", fontSize: "52px", fontWeight: "700", lineHeight: "1.02", letterSpacing: "-0.035em" }}>
              Signed, stamped, and on record.
            </h2>
            <p style={{ margin: "0 0 32px", color: "#3F4A5E", fontSize: "18px", lineHeight: "1.6" }}>
              Every signer adds their signature where you placed the field. When the last one finishes, the document is marked complete and gets a Verification ID anyone can check.
            </p>
            <p style={{ margin: "0", color: "#5A6680", fontSize: "15px" }}>
              No printing, no scanning, no courier.
            </p>
          </div>
          {/* Live signing document */}
          <div aria-hidden="true" style={{ flex: "1 1 460px", maxWidth: "520px", position: "relative", padding: "24px 12px 24px 0", boxSizing: "border-box" }}>
            <div style={{ position: "absolute", inset: "40px 0 8px 30px", borderRadius: "6px", background: "#F9FAFC", transform: "rotate(4deg)", boxShadow: "0 2px 4px rgba(11,23,48,0.06), 0 30px 60px -24px rgba(11,23,48,0.35)" }} />
            <div className="lgl-lg-sheet" style={{ position: "relative", padding: "40px 40px 32px", borderRadius: "6px", background: "#ffffff", transform: "rotate(-2deg)", boxShadow: "0 1px 2px rgba(11,23,48,0.08), 0 40px 80px -28px rgba(11,23,48,0.35)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: "14px", borderBottom: "2px solid #0B1730" }}>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "11px", letterSpacing: "0.12em" }}>
                  ENGAGEMENT LETTER
                </span>
                {" "}
                <span style={{ color: "#6B7385", fontFamily: "'Geist Mono', monospace", fontSize: "11px" }}>
                  Page 3 of 3
                </span>
              </div>
              <p style={{ margin: "18px 0 14px", fontSize: "17px", fontWeight: "600" }}>
                Reyes Family — Professional Services
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "34px" }}>
                <span style={{ height: "7px", borderRadius: "4px", background: "#ECEEF2" }} />
                {" "}
                <span style={{ height: "7px", width: "94%", borderRadius: "4px", background: "#ECEEF2" }} />
                {" "}
                <span style={{ height: "7px", width: "97%", borderRadius: "4px", background: "#ECEEF2" }} />
                {" "}
                <span style={{ height: "7px", width: "58%", borderRadius: "4px", background: "#ECEEF2" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "28px" }}>
                <div>
                  <div style={{ height: "64px", display: "flex", alignItems: "flex-end" }}>
                    <svg width="180" height="62" viewBox="0 0 170 56" fill="none" stroke="#1D3E8A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path className="lgl-lg-draw lgl-lg-d2" pathLength="1" d="M6 40 C 14 12, 28 6, 26 28 S 18 52, 34 36 S 52 10, 58 28 S 66 44, 78 26 C 86 16, 96 20, 92 32 S 100 42, 114 28 S 134 18, 146 34" />
                      <path className="lgl-lg-draw lgl-lg-d3" pathLength="1" d="M30 46 C 70 42, 120 38, 164 40" />
                    </svg>
                  </div>
                  <div style={{ paddingTop: "8px", borderTop: "1px solid #0B1730" }}>
                    <p style={{ margin: "0", fontSize: "13px", fontWeight: "600" }}>
                      Ana Reyes
                    </p>
                    <p style={{ margin: "3px 0 0", color: "#6B7385", fontSize: "11px" }}>
                      Client
                    </p>
                  </div>
                </div>
                <div>
                  <div style={{ height: "64px", display: "flex", alignItems: "flex-end" }}>
                    <svg width="160" height="62" viewBox="0 0 160 56" fill="none" stroke="#1D3E8A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path className="lgl-lg-draw lgl-lg-d4" pathLength="1" d="M8 36 C 12 14, 22 10, 20 30 C 19 44, 30 40, 36 22 C 40 12, 46 14, 44 30 S 56 44, 66 24 S 80 12, 84 30 C 86 40, 96 36, 104 24 S 122 16, 128 30" />
                      <path className="lgl-lg-draw lgl-lg-d5" pathLength="1" d="M60 42 C 90 40, 120 40, 150 36" />
                    </svg>
                  </div>
                  <div style={{ paddingTop: "8px", borderTop: "1px solid #0B1730" }}>
                    <p style={{ margin: "0", fontSize: "13px", fontWeight: "600" }}>
                      Marco Santos
                    </p>
                    <p style={{ margin: "3px 0 0", color: "#6B7385", fontSize: "11px" }}>
                      Approver
                    </p>
                  </div>
                </div>
              </div>
              <div className="lgl-lg-fade lgl-lg-f1" style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "30px", paddingTop: "18px", borderTop: "1px dashed #CBD2DC" }}>
                <svg width="46" height="46" viewBox="0 0 21 21" shapeRendering="crispEdges">
                  <rect width="21" height="21" fill="#ffffff" />
                  <g fill="#0B1730">
                    <rect x="0" y="0" width="7" height="7" />
                    <rect x="14" y="0" width="7" height="7" />
                    <rect x="0" y="14" width="7" height="7" />
                  </g>
                  <g fill="#ffffff">
                    <rect x="1" y="1" width="5" height="5" />
                    <rect x="15" y="1" width="5" height="5" />
                    <rect x="1" y="15" width="5" height="5" />
                  </g>
                  <g fill="#0B1730">
                    <rect x="2" y="2" width="3" height="3" />
                    <rect x="16" y="2" width="3" height="3" />
                    <rect x="2" y="16" width="3" height="3" />
                    <rect x="8" y="1" width="2" height="1" />
                    <rect x="11" y="2" width="1" height="3" />
                    <rect x="9" y="4" width="2" height="2" />
                    <rect x="8" y="8" width="3" height="1" />
                    <rect x="12" y="8" width="2" height="2" />
                    <rect x="4" y="8" width="2" height="2" />
                    <rect x="16" y="9" width="3" height="1" />
                    <rect x="9" y="11" width="2" height="2" />
                    <rect x="14" y="12" width="2" height="1" />
                    <rect x="10" y="15" width="3" height="1" />
                    <rect x="15" y="15" width="2" height="2" />
                    <rect x="11" y="18" width="2" height="2" />
                    <rect x="18" y="16" width="2" height="1" />
                  </g>
                </svg>
                <div style={{ flex: "1", minWidth: "0" }}>
                  <p style={{ margin: "0 0 3px", color: "#6B7385", fontSize: "10px", fontWeight: "600", letterSpacing: "0.08em" }}>
                    VERIFICATION ID
                  </p>
                  <p style={{ margin: "0", fontFamily: "'Geist Mono', monospace", fontSize: "13px", fontWeight: "600" }}>
                    LAGDA-VER-2026-Xs8kQ2mPz4
                  </p>
                </div>
              </div>
              <div className="lgl-lg-stamp" style={{ position: "absolute", right: "30px", top: "96px", width: "112px", height: "112px", border: "3px solid #5B2A86", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "94px", height: "94px", border: "1px solid #5B2A86", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#5B2A86", fontFamily: "'Geist Mono', monospace", textAlign: "center" }}>
                  <span style={{ fontSize: "9px", letterSpacing: "0.14em" }}>
                    LAGDA
                  </span>
                  {" "}
                  <span style={{ margin: "4px 0", fontSize: "13px", fontWeight: "700", letterSpacing: "0.06em" }}>
                    COMPLETED
                  </span>
                  {" "}
                  <span style={{ fontSize: "9px" }}>
                    14 · 07 · 26
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Built for (photo tiles) */}
      <section aria-labelledby="for-h" style={{ background: "#F7F9FC" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "104px 32px 104px" }}>
          <div style={{ maxWidth: "640px", marginBottom: "40px" }}>
            <h2 id="for-h" style={{ margin: "0 0 14px", fontSize: "48px", fontWeight: "700", lineHeight: "1.05", letterSpacing: "-0.035em" }}>
              Built for the people who live on signed paperwork.
            </h2>
            <p style={{ margin: "0", color: "#4A5772", fontSize: "17px", lineHeight: "1.6" }}>
              From law offices and city halls to HR teams and classrooms.
            </p>
          </div>
          <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <li style={{ flex: "1 1 340px" }}>
              <Link style={{ display: "block", position: "relative", height: "420px", borderRadius: "22px", overflow: "hidden", background: "#0B1730", color: "#ffffff" }} to="/solutions/government-and-lgu">
                <img src={imgP13Cityhall} alt="Manila City Hall clock tower against a blue sky" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 35%" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "55%", background: "linear-gradient(180deg, rgba(0,14,46,0) 0%, rgba(0,14,46,0.85) 100%)" }} />
                <span style={{ position: "absolute", left: "24px", right: "24px", bottom: "22px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
                  <span>
                    <span style={{ display: "block", fontSize: "22px", fontWeight: "600" }}>
                      Government &amp; LGUs
                    </span>
                    <span style={{ display: "block", marginTop: "4px", color: "#DCE5F2", fontSize: "14px" }}>
                      Permits, resolutions, and approvals
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ flex: "none", width: "40px", height: "40px", borderRadius: "50%", background: "#ffffff", color: "#0B1730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    →
                  </span>
                </span>
              </Link>
            </li>
            <li style={{ flex: "1 1 340px" }}>
              <Link style={{ display: "block", position: "relative", height: "420px", borderRadius: "22px", overflow: "hidden", background: "#0B1730", color: "#ffffff" }} to="/solutions/law-firms">
                <img src={imgP11Lawyer} alt="A lawyer smiling on a call at his desk" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "55%", background: "linear-gradient(180deg, rgba(0,14,46,0) 0%, rgba(0,14,46,0.85) 100%)" }} />
                <span style={{ position: "absolute", left: "24px", right: "24px", bottom: "22px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
                  <span>
                    <span style={{ display: "block", fontSize: "22px", fontWeight: "600" }}>
                      Law firms
                    </span>
                    <span style={{ display: "block", marginTop: "4px", color: "#DCE5F2", fontSize: "14px" }}>
                      Engagement letters, NDAs, retainers
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ flex: "none", width: "40px", height: "40px", borderRadius: "50%", background: "#ffffff", color: "#0B1730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    →
                  </span>
                </span>
              </Link>
            </li>
            <li style={{ flex: "1 1 340px" }}>
              <Link style={{ display: "block", position: "relative", height: "420px", borderRadius: "22px", overflow: "hidden", background: "#0B1730", color: "#ffffff" }} to="/solutions/real-estate">
                <img src={imgP14Keys} alt="House keys being handed over" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "55%", background: "linear-gradient(180deg, rgba(0,14,46,0) 0%, rgba(0,14,46,0.85) 100%)" }} />
                <span style={{ position: "absolute", left: "24px", right: "24px", bottom: "22px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
                  <span>
                    <span style={{ display: "block", fontSize: "22px", fontWeight: "600" }}>
                      Real estate
                    </span>
                    <span style={{ display: "block", marginTop: "4px", color: "#DCE5F2", fontSize: "14px" }}>
                      Deeds of sale and lease agreements
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ flex: "none", width: "40px", height: "40px", borderRadius: "50%", background: "#ffffff", color: "#0B1730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    →
                  </span>
                </span>
              </Link>
            </li>
            <li style={{ flex: "1 1 240px" }}>
              <Link style={{ display: "block", position: "relative", height: "300px", borderRadius: "22px", overflow: "hidden", background: "#0B1730", color: "#ffffff" }} to="/solutions/business-teams">
                <img src={imgP12Business} alt="A team reviewing documents together" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "60% 50%" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "55%", background: "linear-gradient(180deg, rgba(0,14,46,0) 0%, rgba(0,14,46,0.85) 100%)" }} />
                <span style={{ position: "absolute", left: "20px", right: "20px", bottom: "18px", fontSize: "18px", fontWeight: "600" }}>
                  Business teams
                </span>
              </Link>
            </li>
            <li style={{ flex: "1 1 240px" }}>
              <Link style={{ display: "block", position: "relative", height: "300px", borderRadius: "22px", overflow: "hidden", background: "#0B1730", color: "#ffffff" }} to="/solutions/hr-and-recruitment">
                <img src={imgP16Hr} alt="A job interview ending with a handshake" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "40% 35%" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "55%", background: "linear-gradient(180deg, rgba(0,14,46,0) 0%, rgba(0,14,46,0.85) 100%)" }} />
                <span style={{ position: "absolute", left: "20px", right: "20px", bottom: "18px", fontSize: "18px", fontWeight: "600" }}>
                  HR &amp; recruitment
                </span>
              </Link>
            </li>
            <li style={{ flex: "1 1 240px" }}>
              <Link style={{ display: "block", position: "relative", height: "300px", borderRadius: "22px", overflow: "hidden", background: "#0B1730", color: "#ffffff" }} to="/solutions/finance">
                <img src={imgP17Finance} alt="An accountant working through figures by a window" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "40% 50%" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "55%", background: "linear-gradient(180deg, rgba(0,14,46,0) 0%, rgba(0,14,46,0.85) 100%)" }} />
                <span style={{ position: "absolute", left: "20px", right: "20px", bottom: "18px", fontSize: "18px", fontWeight: "600" }}>
                  Finance
                </span>
              </Link>
            </li>
            <li style={{ flex: "1 1 240px" }}>
              <Link style={{ display: "block", position: "relative", height: "300px", borderRadius: "22px", overflow: "hidden", background: "#0B1730", color: "#ffffff" }} to="/solutions/education">
                <img src={imgP18Education} alt="A teacher and students working with a tablet" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 55%" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "55%", background: "linear-gradient(180deg, rgba(0,14,46,0) 0%, rgba(0,14,46,0.85) 100%)" }} />
                <span style={{ position: "absolute", left: "20px", right: "20px", bottom: "18px", fontSize: "18px", fontWeight: "600" }}>
                  Education
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
      {/* How it works (photos) */}
      <section aria-labelledby="how-h" style={{ background: "#ffffff" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "120px 32px 112px" }}>
          <h2 id="how-h" style={{ margin: "0 0 48px", maxWidth: "760px", fontSize: "52px", fontWeight: "700", lineHeight: "1.04", letterSpacing: "-0.035em" }}>
            Three steps from upload to a record anyone can check.
          </h2>
          <div style={{ height: "520px", borderRadius: "20px", overflow: "hidden", background: "#E3E8EF" }}>
            <img src={imgP07TabletSign} alt="A man in a suit signing a document on a tablet with a stylus" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 55%" }} />
          </div>
          <ol style={{ margin: "56px 0 0", padding: "0", listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "40px 48px" }}>
            <li style={{ paddingTop: "24px", borderTop: "2px solid #0B1730" }}>
              <p style={{ margin: "0 0 20px", color: "#5B2A86", fontSize: "40px", fontWeight: "700", lineHeight: "1", letterSpacing: "-0.03em" }}>
                1
              </p>
              <h3 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: "600", letterSpacing: "-0.01em" }}>
                Prepare and send
              </h3>
              <p style={{ margin: "0", color: "#4A5772", fontSize: "16px", lineHeight: "1.6" }}>
                Upload a PDF, add signers and approvers, set the signing order, and place fields where each person signs.
              </p>
            </li>
            <li style={{ paddingTop: "24px", borderTop: "2px solid #0B1730" }}>
              <p style={{ margin: "0 0 20px", color: "#5B2A86", fontSize: "40px", fontWeight: "700", lineHeight: "1", letterSpacing: "-0.03em" }}>
                2
              </p>
              <h3 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: "600", letterSpacing: "-0.01em" }}>
                They confirm and sign
              </h3>
              <p style={{ margin: "0", color: "#4A5772", fontSize: "16px", lineHeight: "1.6" }}>
                Each recipient confirms who they are with an email code, reviews the document, and signs on any device.
              </p>
            </li>
            <li style={{ paddingTop: "24px", borderTop: "2px solid #0B1730" }}>
              <p style={{ margin: "0 0 20px", color: "#5B2A86", fontSize: "40px", fontWeight: "700", lineHeight: "1", letterSpacing: "-0.03em" }}>
                3
              </p>
              <h3 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: "600", letterSpacing: "-0.01em" }}>
                Anyone can verify it
              </h3>
              <p style={{ margin: "0", color: "#4A5772", fontSize: "16px", lineHeight: "1.6" }}>
                The finished document carries a Verification ID and QR code. Anyone can check it — no account needed.
              </p>
            </li>
          </ol>
        </div>
      </section>
      {/* Product showcase */}
      <section aria-labelledby="show-h" style={{ position: "relative", background: "#ffffff" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", top: "260px", bottom: "0", background: "#0B3981" }} />
        <div style={{ position: "relative", maxWidth: "1140px", margin: "0 auto", padding: "24px 32px 72px", boxSizing: "border-box" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ margin: "0 0 12px", color: "#5B2A86", fontSize: "14px", fontWeight: "600" }}>
              Your workspace
            </p>
            <h2 id="show-h" style={{ margin: "0 auto", maxWidth: "640px", fontSize: "36px", fontWeight: "700", lineHeight: "1.12", letterSpacing: "-0.03em" }}>
              Everything waiting on you, in one view.
            </h2>
          </div>
          <div style={{ borderRadius: "18px", padding: "10px", background: "rgba(255,255,255,0.7)", border: "1px solid #DCE4EF", boxShadow: "0 30px 80px rgba(11,23,48,0.22)" }}>
            <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #E3E8EF", background: "#ffffff" }}>
              <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: "6px", height: "34px", padding: "0 14px", background: "#F6F8FB", borderBottom: "1px solid #E8ECF2" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E2E6EC" }} />
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E2E6EC" }} />
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E2E6EC" }} />
                <span style={{ marginLeft: "16px", padding: "3px 12px", borderRadius: "6px", background: "#ffffff", border: "1px solid #E8ECF2", color: "#5A6680", fontSize: "11px" }}>
                  lagda.io/app/dashboard
                </span>
              </div>
              <img src={imgShotDashboard} alt="The LAGDA dashboard, showing quick actions, documents waiting on you, templates, and plan usage" style={{ display: "block", width: "100%", height: "auto" }} />
            </div>
          </div>
        </div>
      </section>
      {/* Feature row 1: documents */}
      <section aria-labelledby="f1-h" style={{ background: "#F7F9FC", borderTop: "1px solid #EEF1F5" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "112px 32px 104px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "20px 64px", marginBottom: "56px" }}>
            <h2 id="f1-h" style={{ margin: "0", maxWidth: "560px", fontSize: "48px", fontWeight: "700", lineHeight: "1.05", letterSpacing: "-0.035em" }}>
              Know where every document stands.
            </h2>
            <div style={{ flex: "0 1 420px" }}>
              <p style={{ margin: "0 0 14px", color: "#4A5772", fontSize: "17px", lineHeight: "1.6" }}>
                What's waiting on whom, what's about to expire, and what's done — without chasing anyone by email.
              </p>
              <Link style={{ color: "#0B3981", fontSize: "15px", fontWeight: "600" }} to="/esignature/core-workflow">
                See how tracking works →
              </Link>
            </div>
          </div>
          <div style={{ position: "relative", padding: "64px 56px 0", borderRadius: "28px", background: "#DCEAF9", overflow: "hidden" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: "0", backgroundImage: "radial-gradient(rgba(11,42,91,0.10) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div style={{ position: "relative", maxWidth: "1000px", margin: "0 auto" }}>
              <div style={{ position: "relative", borderRadius: "14px 14px 0 0", background: "#ffffff", border: "1px solid #C9D9EE", borderBottom: "none", boxShadow: "0 30px 70px rgba(11,42,91,0.18)" }}>
                <div style={{ height: "520px", overflow: "hidden", borderRadius: "14px 14px 0 0" }}>
                  <img src={imgShotDoctable} alt="Seven documents in LAGDA with statuses from Draft to Completed and Expired, a Verification ID on the completed one, and signer progress for each" style={{ display: "block", width: "100%", height: "auto" }} />
                </div>
                <div aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "140px", background: "linear-gradient(180deg, rgba(220,234,249,0) 0%, #DCEAF9 92%)" }} />
                <span aria-hidden="true" style={{ position: "absolute", top: "-16px", left: "35.6%", transform: "translateX(-50%)", width: "32px", height: "32px", borderRadius: "50%", background: "#5B2A86", color: "#ffffff", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 4px #DCEAF9" }}>
                  1
                </span>
                {" "}
                <span aria-hidden="true" style={{ position: "absolute", top: "-16px", left: "55.6%", transform: "translateX(-50%)", width: "32px", height: "32px", borderRadius: "50%", background: "#5B2A86", color: "#ffffff", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 4px #DCEAF9" }}>
                  2
                </span>
                {" "}
                <span aria-hidden="true" style={{ position: "absolute", top: "-16px", left: "72.2%", transform: "translateX(-50%)", width: "32px", height: "32px", borderRadius: "50%", background: "#5B2A86", color: "#ffffff", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 4px #DCEAF9" }}>
                  3
                </span>
              </div>
            </div>
          </div>
          <ol style={{ margin: "40px 0 0", padding: "0", listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "32px 40px" }}>
            <li style={{ display: "flex", gap: "16px" }}>
              <span aria-hidden="true" style={{ flex: "none", width: "32px", height: "32px", borderRadius: "50%", background: "#5B2A86", color: "#ffffff", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                1
              </span>
              <div>
                <h3 style={{ margin: "4px 0 6px", fontSize: "17px", fontWeight: "600" }}>
                  Status at a glance
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.6" }}>
                  Draft, sent, awaiting signature, completed, expired — every document says exactly where it is.
                </p>
              </div>
            </li>
            <li style={{ display: "flex", gap: "16px" }}>
              <span aria-hidden="true" style={{ flex: "none", width: "32px", height: "32px", borderRadius: "50%", background: "#5B2A86", color: "#ffffff", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                2
              </span>
              <div>
                <h3 style={{ margin: "4px 0 6px", fontSize: "17px", fontWeight: "600" }}>
                  Verification ID, built in
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.6" }}>
                  Completed documents carry an ID anyone can check. Copy it, or open the record in one click.
                </p>
              </div>
            </li>
            <li style={{ display: "flex", gap: "16px" }}>
              <span aria-hidden="true" style={{ flex: "none", width: "32px", height: "32px", borderRadius: "50%", background: "#5B2A86", color: "#ffffff", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                3
              </span>
              <div>
                <h3 style={{ margin: "4px 0 6px", fontSize: "17px", fontWeight: "600" }}>
                  Progress per signer
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.6" }}>
                  See how many people have finished, and remind anyone still pending.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>
      {/* Proof (photo) */}
      <section aria-labelledby="proof-h" style={{ background: "#ffffff" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "112px 32px", display: "flex", flexWrap: "wrap-reverse", alignItems: "center", gap: "56px 80px" }}>
          <div style={{ flex: "999 1 520px", minWidth: "0", position: "relative", padding: "0 0 40px 0" }}>
            <div style={{ position: "relative", height: "560px", borderRadius: "28px", overflow: "hidden", background: "#E3E8EF" }}>
              <img src={imgP10PhoneCheck} alt="A professional smiling as she checks her phone at her desk" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "55% 40%" }} />
            </div>
            <div aria-hidden="true" style={{ position: "absolute", right: "28px", bottom: "0", width: "300px", padding: "18px 20px", borderRadius: "16px", background: "#ffffff", border: "1px solid #E3E8EF", boxShadow: "0 20px 50px rgba(11,23,48,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <p style={{ margin: "0", fontSize: "13px", fontWeight: "600" }}>
                  Audit trail
                </p>
                <span style={{ padding: "3px 9px", borderRadius: "999px", background: "#E7F6EC", color: "#166534", fontSize: "11px", fontWeight: "600" }}>
                  Completed
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", rowGap: "9px", fontSize: "13px" }}>
                <span style={{ color: "#5A6680", fontFamily: "'Geist Mono', monospace", fontSize: "11px" }}>
                  2:14 PM
                </span>
                <span>
                  Document viewed
                </span>
                {" "}
                <span style={{ color: "#5A6680", fontFamily: "'Geist Mono', monospace", fontSize: "11px" }}>
                  2:15 PM
                </span>
                <span>
                  Email code verified
                </span>
                {" "}
                <span style={{ color: "#5A6680", fontFamily: "'Geist Mono', monospace", fontSize: "11px" }}>
                  2:16 PM
                </span>
                <span>
                  Signed by Ana Reyes
                </span>
                {" "}
                <span style={{ color: "#5A6680", fontFamily: "'Geist Mono', monospace", fontSize: "11px" }}>
                  4:01 PM
                </span>
                <span style={{ fontWeight: "600" }}>
                  Transaction completed
                </span>
              </div>
            </div>
          </div>
          <div style={{ flex: "1 1 340px", maxWidth: "440px" }}>
            <h2 id="proof-h" style={{ margin: "0 0 18px", fontSize: "48px", fontWeight: "700", lineHeight: "1.05", letterSpacing: "-0.035em" }}>
              Every signer, every step, on record.
            </h2>
            <p style={{ margin: "0 0 36px", color: "#4A5772", fontSize: "17px", lineHeight: "1.6" }}>
              Each invitation, view, identity check, and signature is logged with a timestamp and evidence — ready whenever someone asks.
            </p>
            <dl style={{ margin: "0", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "18px 0", borderTop: "1px solid #E3E8EF" }}>
                <dt style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "600" }}>
                  Signing order your way
                </dt>
                <dd style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.55" }}>
                  Parallel, sequential, or groups that sign together.
                </dd>
              </div>
              <div style={{ padding: "18px 0", borderTop: "1px solid #E3E8EF" }}>
                <dt style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "600" }}>
                  Know who signed
                </dt>
                <dd style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.55" }}>
                  Secure invitation links and email codes, or a LAGDA account.
                </dd>
              </div>
              <div style={{ padding: "18px 0", borderTop: "1px solid #E3E8EF", borderBottom: "1px solid #E3E8EF" }}>
                <dt style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "600" }}>
                  A record that holds up
                </dt>
                <dd style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.55" }}>
                  A complete audit trail for every transaction.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      {/* Capabilities bento */}
      <section aria-labelledby="cap-h" style={{ background: "#ffffff", borderTop: "1px solid #EEF1F5" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "112px 32px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "20px 64px", marginBottom: "48px" }}>
            <h2 id="cap-h" style={{ margin: "0", maxWidth: "600px", fontSize: "48px", fontWeight: "700", lineHeight: "1.05", letterSpacing: "-0.035em" }}>
              The small things that keep paperwork moving.
            </h2>
            <Link style={{ color: "#0B3981", fontSize: "15px", fontWeight: "600" }} to="/pricing/compare">
              Compare plans →
            </Link>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            {/* Templates (wide) */}
            <div style={{ flex: "2 1 520px", display: "flex", flexDirection: "column", borderRadius: "22px", background: "#0B3981", color: "#ffffff", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", padding: "32px 32px 0", display: "flex", flexDirection: "column", gap: "10px", minHeight: "210px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: "12px", background: "#ffffff", color: "#0B1730", boxShadow: "0 8px 20px rgba(0,0,0,0.18)" }}>
                  <div>
                    <p style={{ margin: "0", fontSize: "14px", fontWeight: "600" }}>
                      Non-Disclosure Agreement
                    </p>
                    <p style={{ margin: "3px 0 0", color: "#5A6680", fontSize: "12px" }}>
                      Used 34 times
                    </p>
                  </div>
                  <span style={{ padding: "6px 12px", borderRadius: "8px", background: "#0078D4", color: "#ffffff", fontSize: "12px", fontWeight: "600" }}>
                    Use template
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 14px", padding: "12px 18px", borderRadius: "12px", background: "rgba(255,255,255,0.92)", color: "#0B1730" }}>
                  <div>
                    <p style={{ margin: "0", fontSize: "13px", fontWeight: "600" }}>
                      Standard Retainer Agreement
                    </p>
                    <p style={{ margin: "3px 0 0", color: "#5A6680", fontSize: "11px" }}>
                      Used 18 times
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 28px", padding: "10px 18px", borderRadius: "12px 12px 0 0", background: "rgba(255,255,255,0.75)", color: "#0B1730" }}>
                  <p style={{ margin: "0", fontSize: "12px", fontWeight: "600" }}>
                    Deed of Absolute Sale (Real Property)
                  </p>
                </div>
              </div>
              <div style={{ padding: "24px 32px 30px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: "600" }}>
                  Templates
                </h3>
                <p style={{ margin: "0", color: "#C7D3E6", fontSize: "15px", lineHeight: "1.55" }}>
                  Save fields, routing, and signer checks once. Reuse them for every client.
                </p>
              </div>
            </div>
            {/* Roles */}
            <div style={{ flex: "1 1 250px", display: "flex", flexDirection: "column", border: "1px solid #E3E8EF", borderRadius: "22px", background: "#F7F9FC", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", padding: "28px 24px 0", display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: "8px", minHeight: "150px" }}>
                <span style={{ padding: "7px 12px", borderRadius: "999px", background: "#ffffff", border: "1px solid #CFE0F4", color: "#0067B8", fontSize: "13px", fontWeight: "600" }}>
                  Signer
                </span>
                {" "}
                <span style={{ padding: "7px 12px", borderRadius: "999px", background: "#ffffff", border: "1px solid #DCCDF1", color: "#5B2A86", fontSize: "13px", fontWeight: "600" }}>
                  Approver
                </span>
                {" "}
                <span style={{ padding: "7px 12px", borderRadius: "999px", background: "#ffffff", border: "1px solid #D3DAE4", color: "#44516B", fontSize: "13px", fontWeight: "600" }}>
                  Reviewer
                </span>
                {" "}
                <span style={{ padding: "7px 12px", borderRadius: "999px", background: "#ffffff", border: "1px solid #E3E8EF", color: "#33405A", fontSize: "13px", fontWeight: "600" }}>
                  Viewer
                </span>
                {" "}
                <span style={{ padding: "7px 12px", borderRadius: "999px", background: "#ffffff", border: "1px solid #CFE8D7", color: "#166534", fontSize: "13px", fontWeight: "600" }}>
                  Copy recipient
                </span>
              </div>
              <div style={{ padding: "20px 24px 26px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "600" }}>
                  Recipient roles
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "14px", lineHeight: "1.55" }}>
                  Everyone gets exactly the access their part needs.
                </p>
              </div>
            </div>
            {/* Authentication */}
            <div style={{ flex: "1 1 250px", display: "flex", flexDirection: "column", border: "1px solid #E3E8EF", borderRadius: "22px", background: "#F7F9FC", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", padding: "28px 24px 0", minHeight: "150px" }}>
                <p style={{ margin: "0 0 10px", color: "#5A6680", fontSize: "12px" }}>
                  Code sent to marco@example.ph
                </p>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ flex: "1", height: "46px", borderRadius: "10px", background: "#ffffff", border: "1px solid #C9D9EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Mono', monospace", fontSize: "18px", fontWeight: "600" }}>
                    4
                  </span>
                  {" "}
                  <span style={{ flex: "1", height: "46px", borderRadius: "10px", background: "#ffffff", border: "1px solid #C9D9EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Mono', monospace", fontSize: "18px", fontWeight: "600" }}>
                    8
                  </span>
                  {" "}
                  <span style={{ flex: "1", height: "46px", borderRadius: "10px", background: "#ffffff", border: "1px solid #C9D9EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Mono', monospace", fontSize: "18px", fontWeight: "600" }}>
                    2
                  </span>
                  {" "}
                  <span style={{ flex: "1", height: "46px", borderRadius: "10px", background: "#ffffff", border: "2px solid #0078D4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: "2px", height: "20px", background: "#0078D4" }} />
                  </span>
                  {" "}
                  <span style={{ flex: "1", height: "46px", borderRadius: "10px", background: "#ffffff", border: "1px solid #E3E8EF" }} />
                  {" "}
                  <span style={{ flex: "1", height: "46px", borderRadius: "10px", background: "#ffffff", border: "1px solid #E3E8EF" }} />
                </div>
              </div>
              <div style={{ padding: "20px 24px 26px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "600" }}>
                  Signer checks
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "14px", lineHeight: "1.55" }}>
                  Email codes, secure links, or a LAGDA account.
                </p>
              </div>
            </div>
            {/* Branding */}
            <div style={{ flex: "1 1 250px", display: "flex", flexDirection: "column", border: "1px solid #E3E8EF", borderRadius: "22px", background: "#F7F9FC", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", padding: "28px 24px 0", minHeight: "150px" }}>
                <div style={{ borderRadius: "12px 12px 0 0", overflow: "hidden", border: "1px solid #E3E8EF", borderBottom: "none", background: "#ffffff" }}>
                  <div style={{ height: "34px", padding: "0 12px", background: "#7A1E3A", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "18px", height: "18px", borderRadius: "5px", background: "#F2C9A0" }} />
                    <span style={{ color: "#ffffff", fontSize: "11px", fontWeight: "600" }}>
                      Mabini Legal Solutions
                    </span>
                  </div>
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ height: "6px", borderRadius: "3px", background: "#EDF1F6" }} />
                    <span style={{ height: "6px", width: "70%", borderRadius: "3px", background: "#EDF1F6" }} />
                    <span style={{ marginTop: "6px", width: "90px", height: "24px", borderRadius: "6px", background: "#7A1E3A" }} />
                  </div>
                </div>
              </div>
              <div style={{ padding: "20px 24px 26px", borderTop: "1px solid #E3E8EF" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "600" }}>
                  Your branding
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "14px", lineHeight: "1.55" }}>
                  Your logo and colours on what recipients see.
                </p>
              </div>
            </div>
            {/* Reminders (wide) */}
            <div style={{ flex: "2 1 520px", display: "flex", flexDirection: "column", border: "1px solid #E3E8EF", borderRadius: "22px", background: "#F7F9FC", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", padding: "30px 32px 0", minHeight: "150px", display: "flex", flexWrap: "wrap", gap: "16px 28px", alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 240px", padding: "14px 16px", borderRadius: "14px", background: "#ffffff", boxShadow: "0 8px 22px rgba(11,23,48,0.08)" }}>
                  <p style={{ margin: "0 0 4px", color: "#5A6680", fontSize: "11px" }}>
                    LAGDA · to Maria Santos
                  </p>
                  <p style={{ margin: "0", fontSize: "14px", fontWeight: "600" }}>
                    Reminder: Service Engagement Agreement is waiting for your signature
                  </p>
                </div>
                <div style={{ flex: "1 1 180px", paddingTop: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#0B3981" }} />
                    <span style={{ flex: "1", height: "2px", background: "#0B3981" }} />
                    {" "}
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#0B3981" }} />
                    <span style={{ flex: "1", height: "2px", background: "#C9D6EA" }} />
                    {" "}
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffffff", border: "2px solid #0B3981", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", color: "#0B3981", fontSize: "12px", fontWeight: "600" }}>
                    <span>
                      Day 3
                    </span>
                    <span>
                      Day 6
                    </span>
                    <span>
                      Day 9
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding: "22px 32px 30px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: "600" }}>
                  Automatic reminders
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.55" }}>
                  Pending signers are reminded every 3 days, up to 3 times. Change it per document, or send one yourself.
                </p>
              </div>
            </div>
            {/* Contacts */}
            <div style={{ flex: "1 1 250px", display: "flex", flexDirection: "column", border: "1px solid #E3E8EF", borderRadius: "22px", background: "#F7F9FC", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", padding: "24px 24px 0", minHeight: "150px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: "#ffffff", border: "1px solid #E3E8EF" }}>
                  <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#E6F1FC", color: "#0067B8", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    JV
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>
                    James Villanueva
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: "#ffffff", border: "1px solid #E3E8EF" }}>
                  <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#F3EEFA", color: "#5B2A86", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    MS
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>
                    Maria Santos
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: "#ffffff", border: "1px solid #E3E8EF" }}>
                  <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#EEF8F1", color: "#166534", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    CD
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>
                    Carmen Dela Cruz
                  </span>
                </div>
              </div>
              <div style={{ padding: "20px 24px 26px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "600" }}>
                  Contacts
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "14px", lineHeight: "1.55" }}>
                  The people you send to often, a click away.
                </p>
              </div>
            </div>
            {/* Workspaces (wide) */}
            <div style={{ flex: "2 1 520px", display: "flex", flexDirection: "column", border: "1px solid #E3E8EF", borderRadius: "22px", background: "#F7F9FC", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", position: "relative", minHeight: "240px", overflow: "hidden" }}>
                <img src={imgP19Colleagues} alt="" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 35%" }} />
                <div style={{ position: "absolute", left: "24px", right: "24px", bottom: "20px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px 18px", borderRadius: "14px", background: "#ffffff", border: "1px solid #E3E8EF" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#0078D4", color: "#ffffff", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ML
                      </span>
                      <div>
                        <p style={{ margin: "0", fontSize: "14px", fontWeight: "600" }}>
                          Mabini Legal Solutions
                        </p>
                        <p style={{ margin: "2px 0 0", color: "#5A6680", fontSize: "12px" }}>
                          Professional plan
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex" }}>
                      <span style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #ffffff", background: "#0B3981", color: "#ffffff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        AR
                      </span>
                      {" "}
                      <span style={{ width: "32px", height: "32px", marginLeft: "-8px", borderRadius: "50%", border: "2px solid #ffffff", background: "#5B2A86", color: "#ffffff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        MS
                      </span>
                      {" "}
                      <span style={{ width: "32px", height: "32px", marginLeft: "-8px", borderRadius: "50%", border: "2px solid #ffffff", background: "#166534", color: "#ffffff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        JV
                      </span>
                      {" "}
                      <span style={{ width: "32px", height: "32px", marginLeft: "-8px", borderRadius: "50%", border: "2px solid #ffffff", background: "#E3E8EF", color: "#33405A", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        +4
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "22px 32px 30px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: "600" }}>
                  Team workspaces
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.55" }}>
                  Several senders, shared templates, role-based access, and one set of organization settings.
                </p>
              </div>
            </div>
            {/* Storage (wide) */}
            <div style={{ flex: "2 1 520px", display: "flex", flexDirection: "column", border: "1px solid #E3E8EF", borderRadius: "22px", background: "#F7F9FC", overflow: "hidden" }}>
              <div aria-hidden="true" style={{ flex: "1", padding: "28px 32px 0", minHeight: "150px" }}>
                <div style={{ padding: "18px", borderRadius: "14px", background: "#ffffff", border: "1px solid #E3E8EF" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px" }}>
                    <span style={{ fontWeight: "600" }}>
                      Storage
                    </span>
                    <span style={{ color: "#5A6680", fontFamily: "'Geist Mono', monospace", fontSize: "12px" }}>
                      1.0 GB / 5.0 GB
                    </span>
                  </div>
                  <div style={{ height: "8px", borderRadius: "4px", background: "#EDF1F6" }}>
                    <div style={{ width: "20%", height: "8px", borderRadius: "4px", background: "#0078D4" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 10px", fontSize: "13px" }}>
                    <span style={{ fontWeight: "600" }}>
                      Sending requests
                    </span>
                    <span style={{ color: "#5A6680", fontFamily: "'Geist Mono', monospace", fontSize: "12px" }}>
                      31 / 200
                    </span>
                  </div>
                  <div style={{ height: "8px", borderRadius: "4px", background: "#EDF1F6" }}>
                    <div style={{ width: "16%", height: "8px", borderRadius: "4px", background: "#0078D4" }} />
                  </div>
                </div>
              </div>
              <div style={{ padding: "22px 32px 30px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: "600" }}>
                  Secure storage
                </h3>
                <p style={{ margin: "0", color: "#4A5772", fontSize: "15px", lineHeight: "1.55" }}>
                  Completed records stay in your workspace, with clear limits for each plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Verify band (photo) */}
      <section id="verify" aria-labelledby="verify-h" style={{ background: "#F7F9FC", borderTop: "1px solid #E3E8EF", borderBottom: "1px solid #E3E8EF" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "96px 32px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "40px 80px" }}>
          <div style={{ flex: "1 1 420px", maxWidth: "520px" }}>
            <h2 id="verify-h" style={{ margin: "0 0 16px", fontSize: "44px", fontWeight: "700", lineHeight: "1.05", letterSpacing: "-0.03em" }}>
              Got a signed document? Check it here.
            </h2>
            <p style={{ margin: "0", color: "#4A5772", fontSize: "17px", lineHeight: "1.6" }}>
              Type the Verification ID printed on the document, or scan its QR code with your phone camera. You don't need an account.
            </p>
          </div>
          <form style={{ flex: "1 1 460px", maxWidth: "560px" }} onSubmit={onVerify}>
            <label htmlFor="vr-id" style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: "600" }}>
              Verification ID
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <input id="vr-id" type="text" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="e.g. LAGDA-VER-2026-Xs8kQ2mPz4" style={{ flex: "1 1 260px", boxSizing: "border-box", height: "56px", padding: "0 18px", border: "1px solid #C3CCD8", borderRadius: "12px", background: "#ffffff", color: "#0B1730", font: "16px 'Geist Mono', monospace", outline: "none" }} />
              {" "}
              <button type="submit" style={{ display: "inline-flex", alignItems: "center", height: "56px", padding: "0 28px", borderRadius: "12px", background: "#0B3981", color: "#ffffff", fontSize: "16px", fontWeight: "600", border: "none", margin: "0", fontFamily: "inherit", lineHeight: "inherit", cursor: "pointer" }}>
                Verify
              </button>
            </div>
          </form>
        </div>
      </section>
      {/* Final CTA (photo) */}
      <section aria-labelledby="cta-h" style={{ position: "relative", overflow: "hidden", background: "#0B3981", color: "#ffffff" }}>
        <img src={imgP20Handshake} alt="" aria-hidden="true" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 45%" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "linear-gradient(90deg, rgba(8,40,92,0.95) 0%, rgba(8,40,92,0.82) 45%, rgba(8,40,92,0.4) 100%)" }} />
        <div className="lgl-wide" style={{ position: "relative", boxSizing: "border-box", padding: "clamp(80px,9vw,128px) 32px" }}>
          <h2 id="cta-h" style={{ margin: "0 0 18px", maxWidth: "620px", fontSize: "clamp(36px,4.6vw,56px)", fontWeight: "700", lineHeight: "1.02", letterSpacing: "-0.035em" }}>
            Send your first document today.
          </h2>
          <p style={{ margin: "0 0 36px", maxWidth: "480px", color: "#DCE5F2", fontSize: "18px", lineHeight: "1.6" }}>
            It's free to start — and always free for the people you send to.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Link style={{ display: "inline-flex", alignItems: "center", minHeight: "54px", padding: "0 28px", borderRadius: "12px", background: "#ffffff", color: "#0B3981", fontSize: "16px", fontWeight: "600" }} to={cta.path}>
              {cta.signedIn ? cta.label : "Create a free account"}
            </Link>
            {" "}
            <Link style={{ display: "inline-flex", alignItems: "center", minHeight: "54px", padding: "0 24px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "12px", color: "#ffffff", fontSize: "16px", fontWeight: "600" }} to="/book-a-demo">
              Book a demo
            </Link>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer style={{ background: "#082A60", color: "#C7D3E6", borderTop: "4px solid #5B2A86" }}>
        <div className="lgl-wide" style={{ maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box", padding: "40px 32px 0" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "28px 96px", paddingBottom: "32px" }}>
            <div style={{ flex: "1 1 340px", maxWidth: "360px" }}>
              <img src={imgLagdaLogoNavy} alt="LAGDA.io" style={{ width: "120px", height: "auto", display: "block", marginBottom: "12px", mixBlendMode: "lighten" }} />
              <p style={{ margin: "0 0 10px", color: "#C7D3E6", fontSize: "13px", lineHeight: "1.5", textWrap: "pretty" }}>
                The Philippine-first electronic signature and document verification platform for legal, business, and institutional work.
              </p>
              <a href="#verify" style={{ color: "#C9B2EC", fontSize: "13px", fontWeight: "600" }}>
                Verify a document →
              </a>
            </div>
            <nav aria-label="Footer" className="lgl-ftr-nav" style={{ flex: "999 1 600px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "28px 24px" }}>
              <div>
                <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                  PRODUCT
                </p>
                <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/esignature">
                      eSignature
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/esignature/core-workflow">
                      Core workflow
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/esignature/templates-and-branding">
                      Templates &amp; branding
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/esignature/team-and-enterprise">
                      Team &amp; enterprise
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/pricing">
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                  SOLUTIONS
                </p>
                <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/solutions/law-firms">
                      Lawyers &amp; law firms
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/solutions/business-teams">
                      Business teams
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/solutions/government-and-lgu">
                      Government &amp; LGUs
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/solutions/real-estate">
                      Real estate
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/solutions/hr-and-recruitment">
                      HR &amp; finance
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                  TRUST
                </p>
                <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/security">
                      Security overview
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/security/trust-center">
                      Trust center
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/security/identity-verification">
                      Identity verification
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/security/audit-trail">
                      Audit trail
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/security/privacy-and-data-protection">
                      Privacy &amp; data
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                  HELP
                </p>
                <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/help">
                      Help center
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/resources/guides">
                      Guides
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/resources/faq">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/contact">
                      Contact us
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/service-status">
                      Service status
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p style={{ margin: "0 0 10px", color: "#C9B2EC", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em" }}>
                  ENOTARY
                </p>
                <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <li>
                    <a style={{ color: "#E2E9F3" }} href={ENOTARY_DIRECTORY_PATH}>
                      Notary directory
                    </a>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/enotary/accreditation-roadmap">
                      Roadmap
                    </Link>
                  </li>
                  <li>
                    <Link style={{ color: "#E2E9F3" }} to="/enotary/waitlist">
                      Join the waitlist
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <div style={{ padding: "16px 0 28px", borderTop: "1px solid #24508F" }}>
            <p style={{ margin: "0 0 10px", maxWidth: "900px", color: "#B3C3DC", fontSize: "12px", lineHeight: "1.5" }}>
              Some documents may still require wet signatures, notarization, personal appearance, or other formalities. Users remain responsible for the requirements that apply to each transaction. LAGDA eNotary is coming soon, subject to Supreme Court accreditation and applicable rules.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 24px", color: "#B3C3DC", fontSize: "12px" }}>
              <p style={{ margin: "0" }}>
                © 2026 UpUp Technologies. LAGDA and the LAGDA shield mark are trademarks of UpUp Technologies.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
                <Link style={{ color: "#E2E9F3" }} to="/legal/privacy">
                  Privacy Policy
                </Link>
                <Link style={{ color: "#E2E9F3" }} to="/legal/terms">
                  Terms of Service
                </Link>
                <Link style={{ color: "#E2E9F3" }} to="/legal/accessibility">
                  Accessibility
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
