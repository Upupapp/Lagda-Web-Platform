// Minimal authenticated dashboard landing state.
// Shows welcome, workspace context, stat cards, and quick-action grid.
// No real data — all values are mock/demo.

import { Link } from "react-router";
import { FilePlus, FileText, LayoutTemplate, ShieldCheck, Clock, ChevronRight } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import { AppContent, StatCard, DashboardGrid, EmptyStateLayout, SKELETON_STYLE } from "../../components/platform";
import { PageHeader } from "../../components/platform";

const GF  = { fontFamily: "'Geist', sans-serif" };
const GM  = { fontFamily: "'Geist Mono', monospace" };

const QUICK_ACTIONS = [
  {
    icon: <FilePlus size={22} aria-hidden />,
    label: "Prepare a Document",
    sub: "Upload and request signatures",
    to: "/app/documents/new",
    accent: "#0078D4",
    bg: "rgba(0,120,212,0.08)",
  },
  {
    icon: <FileText size={22} aria-hidden />,
    label: "My Documents",
    sub: "View and manage documents",
    to: "/app/documents",
    accent: "#0F172A",
    bg: "#F8FAFC",
  },
  {
    icon: <LayoutTemplate size={22} aria-hidden />,
    label: "Templates",
    sub: "Start from a reusable template",
    to: "/app/templates",
    accent: "#0F172A",
    bg: "#F8FAFC",
  },
  {
    icon: <ShieldCheck size={22} aria-hidden />,
    label: "Verify a Document",
    sub: "Check a document's authenticity",
    to: "/app/verify",
    accent: "#0F172A",
    bg: "#F8FAFC",
  },
];

function RecentActivityEmpty() {
  return (
    <EmptyStateLayout
      icon={<Clock size={24} aria-hidden />}
      title="No recent activity"
      description="Documents you prepare and sign will appear here."
    />
  );
}

export function PlatformDashboard() {
  const { currentWorkspace, user } = usePlatform();

  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={currentWorkspace ? `${currentWorkspace.name} — ${currentWorkspace.plan.charAt(0).toUpperCase() + currentWorkspace.plan.slice(1)} Plan` : undefined}
      />

      <AppContent style={{ maxWidth: 1200 }}>
        {/* Stats row */}
        <section aria-label="Account overview" style={{ marginBottom: 28 }}>
          <DashboardGrid>
            <StatCard label="Documents" value="0" sub="No documents yet" />
            <StatCard label="Awaiting Signature" value="0" sub="Nothing pending" />
            <StatCard label="Completed" value="0" sub="This month" accent="#0078D4" />
            <StatCard label="Team Members" value={String(currentWorkspace?.memberCount ?? 1)} sub={currentWorkspace?.name ?? "Workspace"} />
          </DashboardGrid>
        </section>

        {/* Quick actions */}
        <section aria-label="Quick actions" style={{ marginBottom: 32 }}>
          <h2 style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", margin: "0 0 12px", textTransform: "uppercase" }}>
            Quick Actions
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "16px", background: "white",
                  border: "1px solid #E2E8F0", borderRadius: 12,
                  textDecoration: "none",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                }}
                className="quick-action-card"
                aria-label={a.label}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.accent, flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: "#0F172A", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{a.label}</p>
                  <p style={{ color: "#64748B", ...GF, fontSize: 12, margin: 0 }}>{a.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section aria-label="Recent activity">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Recent Activity
            </h2>
            <Link to="/app/documents" style={{ color: "#0078D4", ...GF, fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
              View all <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <RecentActivityEmpty />
          </div>
        </section>

        {/* Demo notice */}
        <div role="note" aria-label="Frontend demonstration notice" style={{ marginTop: 32, padding: "12px 16px", background: "rgba(0,120,212,0.06)", borderRadius: 10, border: "1px solid rgba(0,120,212,0.15)" }}>
          <p style={{ color: "#1E40AF", ...GF, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            <strong>Frontend demonstration.</strong> This dashboard uses mock data. Document management, signature workflows, and team features will be connected during backend integration.
          </p>
        </div>
      </AppContent>

      <style>{`
        .quick-action-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; border-color: #CBD5E1 !important; }
        .quick-action-card:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        ${SKELETON_STYLE}
      `}</style>
    </>
  );
}
