// C13 — Onboarding completion screen.
// NEVER says "Account created", "Workspace created", or "Subscription active".
// Uses frontend-demo language for all success messaging.
// Redirects to /app/dashboard after a short celebration.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform } from "../../context/PlatformContext";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const CHECKLIST = [
  "Profile information saved",
  "Notification preferences applied",
  "Security preferences saved",
  "Workspace configuration recorded",
];

export function OnboardingComplete() {
  const navigate   = useNavigate();
  const { reset }  = useOnboarding();
  const platform   = usePlatform();
  const [visible, setVisible] = useState(0);
  const [ready,   setReady]   = useState(false);

  // Animate checklist items in
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CHECKLIST.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), 300 + i * 280));
    });
    timers.push(setTimeout(() => setReady(true), 300 + CHECKLIST.length * 280 + 200));
    return () => timers.forEach(clearTimeout);
  }, []);

  function goToDashboard() {
    reset(); // clear onboarding state
    navigate("/app/dashboard", { replace: true });
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#07111F",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "'Geist', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        {/* Logo mark */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", fontSize: 28,
        }} aria-hidden>✓</div>

        <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>
          Setup complete
        </p>
        <h1 style={{ color: "white", ...GF, fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 10px" }}>
          You are ready to go
        </h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 32px" }}>
          Your account setup is complete in this frontend demonstration. Start by preparing your first document.
        </p>

        {/* Animated checklist */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 24px", textAlign: "left", marginBottom: 28 }}>
          {CHECKLIST.map((item, i) => (
            <div
              key={item}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 0",
                borderBottom: i < CHECKLIST.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                opacity: visible > i ? 1 : 0,
                transform: visible > i ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#38BDF8", fontSize: 10, fontWeight: 700,
              }} aria-hidden>✓</div>
              <span style={{ color: "#64748B", ...GF, fontSize: 13 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA — only enabled after animation */}
        <button
          onClick={goToDashboard}
          disabled={!ready}
          style={{
            width: "100%",
            background: ready ? "#0078D4" : "rgba(0,120,212,0.3)",
            border: "none", borderRadius: 8, color: "white",
            ...GF, fontSize: 16, fontWeight: 700,
            padding: "16px", minHeight: 52,
            cursor: ready ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
          aria-label="Go to dashboard"
        >
          Go to your dashboard
        </button>

        {/* Skip wait link */}
        {!ready && (
          <button
            onClick={goToDashboard}
            style={{ background: "none", border: "none", color: "#334155", ...GF, fontSize: 12, cursor: "pointer", marginTop: 14 }}
          >
            Skip
          </button>
        )}
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
    </div>
  );
}
