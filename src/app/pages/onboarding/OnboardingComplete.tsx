// C13 — Onboarding completion screen.
// NEVER says "Account created", "Workspace created", or "Subscription active".
// Uses frontend-demo language for all success messaging.
// Redirects to /app/dashboard after a short celebration.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform } from "../../context/PlatformContext";
import lagdaHeaderLogo from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const CHECKLIST = [
  "Profile information saved",
  "Notification preferences applied",
  "Security preferences saved",
  "Workspace configuration recorded",
];

export function OnboardingComplete() {
  const navigate = useNavigate();
  const { reset, returnTo } = useOnboarding();
  const platform = usePlatform();
  const [visible, setVisible] = useState(0);
  const [ready, setReady] = useState(false);

  // Animate checklist items in
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CHECKLIST.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), 300 + i * 280));
    });
    timers.push(
      setTimeout(() => setReady(true), 300 + CHECKLIST.length * 280 + 200),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  function goToDashboard() {
    // Capture before reset() clears it — a visitor who started this account
    // from an expired /app link (or a pre-auth document upload) lands back
    // there, not the generic dashboard.
    const destination = returnTo ?? "/app/dashboard";
    reset(); // clear onboarding state
    navigate(destination, { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5FAFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          textAlign: "center",
          background: "#FFFFFF",
          border: "1px solid #DBEAFE",
          borderRadius: 18,
          padding: "36px 32px 32px",
          boxShadow: "0 18px 50px rgba(7,17,31,0.08)",
        }}
      >
        <img
          src={lagdaHeaderLogo}
          alt="LAGDA"
          style={{
            display: "block",
            width: 190,
            height: 58,
            objectFit: "contain",
            margin: "0 auto 24px",
          }}
        />
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#EAF6FF",
            border: "1px solid #BAE0FA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 24,
            color: "#0078D4",
            fontWeight: 800,
          }}
          aria-hidden
        >
          ✓
        </div>

        <p
          style={{
            color: "#0078D4",
            ...GM,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "0 0 12px",
          }}
        >
          Setup complete
        </p>
        <h1
          style={{
            color: "#07111F",
            ...GF,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "0 0 10px",
          }}
        >
          You are ready to go
        </h1>
        <p
          style={{
            color: "#475569",
            ...GF,
            fontSize: 14,
            lineHeight: 1.7,
            margin: "0 0 28px",
          }}
        >
          Your setup preferences are saved. Continue to your workspace when you
          are ready.
        </p>

        {/* Animated checklist */}
        <div
          style={{
            background: "#F8FBFF",
            border: "1px solid #DBEAFE",
            borderRadius: 12,
            padding: "16px 20px",
            textAlign: "left",
            marginBottom: 28,
          }}
        >
          {CHECKLIST.map((item, i) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 0",
                borderBottom:
                  i < CHECKLIST.length - 1 ? "1px solid #E2E8F0" : "none",
                opacity: visible > i ? 1 : 0,
                transform: visible > i ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "#EAF6FF",
                  border: "1px solid #BAE0FA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0078D4",
                  fontSize: 10,
                  fontWeight: 700,
                }}
                aria-hidden
              >
                ✓
              </div>
              <span style={{ color: "#334155", ...GF, fontSize: 13 }}>
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* CTA — only enabled after animation */}
        <button
          onClick={goToDashboard}
          disabled={!ready}
          style={{
            width: "100%",
            background: ready ? "#0078D4" : "#B9D8F5",
            border: "none",
            borderRadius: 8,
            color: "white",
            ...GF,
            fontSize: 16,
            fontWeight: 700,
            padding: "16px",
            minHeight: 52,
            cursor: ready ? "pointer" : "not-allowed",
            boxShadow: ready ? "0 5px 14px rgba(0,120,212,0.20)" : "none",
            transition: "background 0.2s, box-shadow 0.2s, transform 0.2s",
          }}
          aria-label="Go to dashboard"
        >
          Go to your dashboard
        </button>

        {/* Skip wait link */}
        {!ready && (
          <button
            onClick={goToDashboard}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              ...GF,
              fontSize: 12,
              cursor: "pointer",
              marginTop: 14,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Skip
          </button>
        )}
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
    </div>
  );
}
