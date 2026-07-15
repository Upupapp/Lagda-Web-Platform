// Focused recipient-facing layout.
// No sender sidebar, no platform nav, no account controls.
// Burgundy (#67023B) is never used here — eNotary-only.

import React from "react";
import { Outlet } from "react-router";

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

      {/* Footer */}
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
    </div>
  );
}
