import { UploadCloud } from "lucide-react";

// ── Product mockup: document in progress ─────────────────────────────────────
const PARTICIPANTS = [
  {
    name: "Ana Reyes",
    role: "Signer",
    status: "signed",
    auth: "Email OTP",
    color: "#16A34A",
  },
  {
    name: "Marco Santos",
    role: "Approver",
    status: "pending",
    auth: "Secure Link",
    color: "#D97706",
  },
  {
    name: "Lea Cruz",
    role: "CC",
    status: "awaiting",
    auth: "—",
    color: "#94A3B8",
  },
];

const STATUS_ICON: Record<string, string> = {
  signed: "✓",
  pending: "◐",
  awaiting: "·",
};

function DocumentMockup() {
  const GF = { fontFamily: "'Geist', sans-serif" };
  const GM = { fontFamily: "'Geist Mono', monospace" };

  return (
    <div
      aria-hidden="true"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(7,17,31,0.09)",
        borderRadius: 18,
        padding: "24px 24px 20px",
        boxShadow:
          "0 20px 48px rgba(7,17,31,0.14), 0 2px 8px rgba(7,17,31,0.06)",
        maxWidth: 420,
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid rgba(7,17,31,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#0078D4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            📄
          </div>
          <div>
            <p
              style={{
                color: "#07111F",
                ...GF,
                fontSize: 13,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Professional Services Agreement
            </p>
            <p style={{ color: "#64748B", ...GF, fontSize: 11, margin: 0 }}>
              Mabini Legal Solutions
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["ESIGNATURE", "ACTIVE"].map((tag) => (
            <span
              key={tag}
              style={{
                background:
                  tag === "ACTIVE"
                    ? "rgba(22,163,74,0.1)"
                    : "rgba(0,120,212,0.1)",
                color: tag === "ACTIVE" ? "#16A34A" : "#0078D4",
                border: `1px solid ${tag === "ACTIVE" ? "rgba(22,163,74,0.25)" : "rgba(0,120,212,0.22)"}`,
                borderRadius: 999,
                padding: "2px 8px",
                ...GM,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div style={{ marginBottom: 16 }}>
        <p
          style={{
            color: "#64748B",
            ...GM,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          PARTICIPANTS
        </p>
        {PARTICIPANTS.map((p) => (
          <div
            key={p.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 8,
              marginBottom: 3,
              background:
                p.status === "pending" ? "rgba(0,120,212,0.05)" : "transparent",
              border:
                p.status === "pending"
                  ? "1px solid rgba(0,120,212,0.16)"
                  : "1px solid transparent",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background:
                    p.status === "signed"
                      ? "#16A34A"
                      : p.status === "pending"
                        ? "#0078D4"
                        : "rgba(7,17,31,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "white",
                  fontWeight: 700,
                }}
              >
                {STATUS_ICON[p.status]}
              </span>
              <span
                style={{
                  ...GF,
                  fontSize: 12,
                  color: p.status === "awaiting" ? "#94A3B8" : "#07111F",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
              <span
                style={{ ...GF, fontSize: 10, color: "#94A3B8", flexShrink: 0 }}
              >
                · {p.role}
              </span>
            </div>
            <span
              style={{
                ...GM,
                fontSize: 10,
                color: p.color,
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              {p.auth}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ color: "#64748B", ...GF, fontSize: 11 }}>
            Step 2 of 3
          </span>
          <span
            style={{ color: "#0078D4", ...GF, fontSize: 11, fontWeight: 600 }}
          >
            Awaiting approval
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(7,17,31,0.08)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "33%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #07111F, #0078D4)",
            }}
          />
        </div>
      </div>

      {/* Verification ID */}
      <div
        style={{
          background: "rgba(201,150,12,0.08)",
          border: "1px solid rgba(201,150,12,0.22)",
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#64748B", ...GM, fontSize: 10 }}>
          VERIFICATION ID
        </span>
        <span
          style={{ color: "#C9960C", ...GM, fontSize: 11, fontWeight: 700 }}
        >
          LAGDA-VER-2026-004821
        </span>
      </div>
    </div>
  );
}

// ── Trust items ───────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: "🔒", text: "Secure browser-based signing" },
  { icon: "👤", text: "Identity-aware access" },
  { icon: "📋", text: "Audit-ready activity records" },
  { icon: "🔍", text: "QR-based Document Verification" },
];

// ── Hero section ──────────────────────────────────────────────────────────────
export function HeroSection({ onOpenUpload }: { onOpenUpload: () => void }) {
  const GF = { fontFamily: "'Geist', sans-serif" };
  const GM = { fontFamily: "'Geist Mono', monospace" };

  return (
    <section
      aria-labelledby="hero-heading"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      {/* Background gradient */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 60% 0%, rgba(0,120,212,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 24px 64px",
        }}
      >
        {/* Status badges */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              background: "rgba(0,120,212,0.08)",
              color: "#0078D4",
              border: "1px solid rgba(0,120,212,0.25)",
              borderRadius: 999,
              padding: "4px 12px",
              ...GM,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            eSignature — Available Now
          </span>
          <span
            style={{
              background: "rgba(103,2,59,0.06)",
              color: "#67023B",
              border: "1px solid rgba(176,18,98,0.22)",
              borderRadius: 999,
              padding: "4px 12px",
              ...GM,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            eNotary — Coming Soon
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gap: "48px 64px",
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left: copy */}
          <div>
            <p
              style={{
                color: "#0078D4",
                ...GM,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Philippine-first digital document execution
            </p>

            <h1
              id="hero-heading"
              style={{
                color: "#07111F",
                ...GF,
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 800,
                lineHeight: 1.1,
                margin: 0,
                marginBottom: 20,
                letterSpacing: "-0.02em",
              }}
            >
              Prepare, sign, track,{" "}
              <span style={{ color: "#0078D4" }}>and verify</span> documents
              with confidence.
            </h1>

            <p
              style={{
                color: "#334155",
                ...GF,
                fontSize: "clamp(15px, 2vw, 18px)",
                lineHeight: 1.65,
                margin: 0,
                marginBottom: 32,
                maxWidth: 520,
              }}
            >
              LAGDA eSignature helps Philippine professionals and organizations
              prepare, send, sign, track, verify, and securely manage documents
              online — with identity-aware authentication and audit-ready
              records on every transaction.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 28,
              }}
            >
              <button
                type="button"
                onClick={onOpenUpload}
                style={{
                  background: "#0078D4",
                  color: "white",
                  border: "none",
                  padding: "8px 8px 8px 24px",
                  borderRadius: 999,
                  ...GF,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 4px 16px rgba(0,120,212,0.28)",
                  transition:
                    "filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                  minHeight: 52,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,120,212,0.34)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "";
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0,120,212,0.28)";
                }}
              >
                Try The Document-Upload Now!
                <span
                  aria-hidden="true"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.22)",
                    flexShrink: 0,
                  }}
                >
                  <UploadCloud size={17} strokeWidth={2.25} />
                </span>
              </button>
            </div>

            {/* Legal note */}
            <p
              style={{
                color: "#64748B",
                ...GF,
                fontSize: 12,
                lineHeight: 1.5,
                maxWidth: 480,
              }}
            >
              Some documents may still require wet signatures, notarization, or
              other legal formalities. Users remain responsible for determining
              the requirements applicable to each transaction.
            </p>
          </div>

          {/* Right: mockup */}
          <div style={{ flexShrink: 0 }} className="hero-mockup">
            <DocumentMockup />
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div
        style={{
          borderTop: "1px solid rgba(7,17,31,0.07)",
          borderBottom: "1px solid rgba(7,17,31,0.07)",
          background: "#F8FAFB",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(16px, 4vw, 48px)",
            flexWrap: "wrap",
          }}
        >
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 16 }}>
                {item.icon}
              </span>
              <span style={{ color: "#334155", ...GF, fontSize: 13 }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive overrides */}
      <style>{`
        .hero-grid {
          grid-template-columns: 1fr auto;
        }
        .hero-mockup {
          display: block;
        }
        @media (max-width: 860px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }
          .hero-mockup {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
