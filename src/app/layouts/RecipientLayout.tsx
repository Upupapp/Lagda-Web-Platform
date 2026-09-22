// Focused recipient-facing layout.
// No sender sidebar, no platform nav, no account controls.
// Burgundy (#67023B) is never used here — eNotary-only.
//
// ── This layout wraps BOTH signer paths ────────────────────────────────────
//
// `/sign/:token` renders `RecipientRoot`, which dispatches on
// `USE_REAL_BACKEND`: the real, backend-connected ceremony
// (`RealSigningPage`) or the mock demonstration flow (`RecipientFlowInner`
// and its sibling pages). This layout is the route element for both, so
// anything it states unconditionally is stated to real signers too — which
// is how the demonstration footer below came to appear beneath a live
// signing ceremony that does transmit, sign and store.

import React from "react";
import { Outlet, Link } from "react-router";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import lagdaHeaderLogo from "../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";

export function RecipientLayout() {
  return (
    <div
      style={{
        minHeight:   "100dvh",
        background:  "#F5F7FA",
        display:     "flex",
        flexDirection: "column",
        fontFamily:  "'Geist', sans-serif",
      }}
    >
      {/* Minimal header — brand only, no nav links */}
      <header
        style={{
          background:   "#FFFFFF",
          borderBottom: "1px solid #E3E8EF",
          height:       56,
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          // Fluid, so the brand is not jammed against the edge at 320px.
          padding:      "0 clamp(12px, 4vw, 24px)",
          flexShrink:   0,
          gap:          10,
          // Sticky: on a long contract the signer should always be able to
          // see whose product they are signing in.
          position:     "sticky",
          top:          0,
          zIndex:       5,
        }}
        role="banner"
      >
        {/* The brand SVG, cropped exactly as the onboarding header crops it:
            the file's canvas carries whitespace around the wordmark, and
            object-fit cover at this ratio frames just the wordmark. */}
        <div aria-label="LAGDA eSignature" style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <img
            src={lagdaHeaderLogo}
            alt="LAGDA"
            style={{
              display: "block",
              width: "clamp(118px, 30vw, 152px)",
              aspectRatio: "200 / 58",
              height: "auto",
              objectFit: "cover",
              objectPosition: "left center",
            }}
          />
        </div>

        {/* A quiet trust marker. A signer arriving from an email has no other
            signal that this page is the real thing and not a forwarded copy
            of something. It claims only what is true — the session is
            encrypted and scoped to their link — and nothing about the legal
            weight of signing, which the consent step owns. */}
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 600, color: "#1E7F4F",
            background: "#EAF7EF", border: "1px solid #B7E3CA",
            borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={13} aria-hidden />
          Secure session
        </span>
      </header>

      {/* A default way back to Documents, on its own row.
          Deliberately NOT squeezed into the header beside the logo and the
          secure-session badge: those two already use most of the width at
          320px, and a third element there would be exactly the crowding a
          narrow phone cannot afford. A full-width row never competes with a
          neighbor for space, so it never needs its own breakpoint.
          Shown on every /sign/* page, signed in or not — for an anonymous
          emailed-link recipient this simply leads to the sign-in wall, the
          same place any other authenticated-app link would. */}
      <div
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E3E8EF",
          padding: "8px clamp(12px, 4vw, 24px)",
          flexShrink: 0,
        }}
      >
        <Link
          to="/app/documents"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: 600,
            color: "#0078D4", textDecoration: "none",
            minHeight: 28,
          }}
        >
          <ArrowLeft size={15} aria-hidden />
          Back to Documents
        </Link>
      </div>

      {/* Page content */}
      <main
        id="main-content"
        style={{
          flex:     1,
          overflow: "auto",
        }}
        role="main"
      >
        <Outlet />
      </main>

      {/* Footer — the DEMONSTRATION disclaimer, and only on the demonstration.

          NOT rendered at all on the real path, rather than hidden: a
          `display: none` would leave the sentence in the served markup, where
          a crawler, a reader-mode view or a screen reader could still surface
          "no documents are transmitted, signed, or stored" to someone whose
          signature is, in fact, being stored. A claim this wrong about a
          legal act should not exist in the document at all.

          Nothing replaces it on the real path. A live signing ceremony needs
          accurate legal wording, and inventing that here would be a worse
          error than the one being fixed — the ESIGN consent step is where
          the product already makes its binding disclosure. */}
      {!USE_REAL_BACKEND && (
        <footer
          style={{
            borderTop:  "1px solid #E3E8EF",
            background: "#FFFFFF",
            padding:    "10px clamp(12px, 4vw, 24px)",
            fontSize:   11,
            color:      "#8A9BAE",
            textAlign:  "center",
            flexShrink: 0,
          }}
          role="contentinfo"
        >
          This is a frontend demonstration. No documents are transmitted, signed, or stored.
          eNotary services are a separate product and are not part of this demonstration.
        </footer>
      )}
    </div>
  );
}
