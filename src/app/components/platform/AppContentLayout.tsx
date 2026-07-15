// Reusable content layout primitives for authenticated platform screens.
// Use these instead of inventing per-page layout constants.

const GF = { fontFamily: "'Geist', sans-serif" };

// Standard padded content container
export function AppContent({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: "24px", maxWidth: "100%", ...style }}>
      {children}
    </div>
  );
}

// Full-width workspace (no horizontal padding constraint)
export function AppContentFull({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "24px 0" }}>
      {children}
    </div>
  );
}

// Reading-width settings layout (centers content to ~640px)
export function SettingsContent({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "24px", maxWidth: 640, ...GF }}>
      {children}
    </div>
  );
}

// Two-column layout: content (flex: 1) and detail panel (fixed width)
export function TwoColumnLayout({
  main,
  side,
  sideWidth = 320,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
  sideWidth?: number;
}) {
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        {main}
      </div>
      <div style={{ width: sideWidth, flexShrink: 0, borderLeft: "1px solid #E2E8F0", overflowY: "auto" }}>
        {side}
      </div>
    </div>
  );
}

// Dashboard grid — responsive card grid
export function DashboardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: 16,
    }}>
      {children}
    </div>
  );
}

// Stat card
export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{
      background: "white",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      padding: "18px 20px",
    }}>
      <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </p>
      <p style={{ color: accent ?? "#0F172A", ...GF, fontSize: 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
        {value}
      </p>
      {sub && <p style={{ color: "#94A3B8", ...GF, fontSize: 12, margin: 0 }}>{sub}</p>}
    </div>
  );
}

// Empty state container
export function EmptyStateLayout({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#94A3B8" }}>
        {icon}
      </div>
      <h2 style={{ color: "#0F172A", ...GF, fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{title}</h2>
      <p style={{ color: "#64748B", ...GF, fontSize: 14, margin: "0 0 24px", maxWidth: 400, lineHeight: 1.6 }}>{description}</p>
      {action}
    </div>
  );
}

// Skeleton loader block
export function SkeletonBlock({ width = "100%", height = 16, radius = 6 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        background: "#F1F5F9",
        borderRadius: radius,
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

export const SKELETON_STYLE = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes skeleton-pulse { 0%, 100% { opacity: 0.7; } }
  }
`;
