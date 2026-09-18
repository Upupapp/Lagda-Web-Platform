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
import { Outlet } from "react-router";
import { USE_REAL_BACKEND } from "../services/backend-flag";

const NAVY  = "#07111F";
const AZURE = "#0078D4";

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
          height:       52,
          display:      "flex",
          alignItems:   "center",
          padding:      "0 24px",
          flexShrink:   0,
          gap:          10,
        }}
        role="banner"
      >
        <div
          aria-label="LAGDA eSignature"
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        8,
          }}
        >
          {/* Azure square logo mark */}
          <div
            aria-hidden="true"
            style={{
              width:        28,
              height:       28,
              borderRadius: 6,
              background:   AZURE,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              color:        "#FFFFFF",
              fontWeight:   800,
              fontSize:     14,
              letterSpacing: "-0.5px",
            }}
          >
            L
          </div>
          <span
            style={{
              fontSize:   15,
              fontWeight: 700,
              color:      NAVY,
              letterSpacing: "-0.3px",
            }}
          >
            LAGDA
          </span>
          <span
            style={{
              fontSize:   12,
              color:      "#8A9BAE",
              marginLeft: 2,
            }}
          >
            eSignature
          </span>
        </div>
      </header>

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
            padding:    "10px 24px",
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
