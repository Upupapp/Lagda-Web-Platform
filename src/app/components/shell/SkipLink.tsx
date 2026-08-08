import { Z } from "../../utils/z-index";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      style={{
        position: "fixed",
        top: -56,
        left: 16,
        zIndex: Z.skipLink,
        background: "#0078D4",
        color: "#ffffff",
        padding: "10px 20px",
        borderRadius: "0 0 10px 10px",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "'Geist', sans-serif",
        textDecoration: "none",
        transition: "top 0.15s ease",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        outline: "none",
        whiteSpace: "nowrap",
      }}
      onFocus={(e) => { e.currentTarget.style.top = "0"; }}
      onBlur={(e) => { e.currentTarget.style.top = "-56px"; }}
    >
      Skip to main content
    </a>
  );
}
