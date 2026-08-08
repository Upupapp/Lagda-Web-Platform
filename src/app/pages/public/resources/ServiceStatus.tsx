import {
  ResourcesPageShell, ResourcesSection,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

type ServiceStatusValue = "operational" | "degraded" | "partial-outage" | "major-outage" | "maintenance" | "not-available" | "future-product";

interface ServiceItem {
  id: string;
  name: string;
  status: ServiceStatusValue;
  note?: string;
}

const STATUS_DISPLAY: Record<ServiceStatusValue, { label: string; color: string; bg: string }> = {
  "operational":     { label: "Operational",          color: "#22C55E", bg: "rgba(34,197,94,0.1)"   },
  "degraded":        { label: "Degraded Performance", color: "#C9960C", bg: "rgba(201,150,12,0.1)"  },
  "partial-outage":  { label: "Partial Outage",       color: "#F97316", bg: "rgba(249,115,22,0.1)"  },
  "major-outage":    { label: "Major Outage",         color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  "maintenance":     { label: "Maintenance",          color: "#38BDF8", bg: "rgba(0,120,212,0.1)"   },
  "not-available":   { label: "Not Available",        color: "#8A9BAE", bg: "rgba(71,85,105,0.1)"   },
  "future-product":  { label: "Future Product",       color: "#c084fc", bg: "rgba(103,2,59,0.1)"    },
};

const MOCK_SERVICES: ServiceItem[] = [
  { id: "public-website",      name: "Public Website",           status: "operational"   },
  { id: "account-access",      name: "Account Access",           status: "operational"   },
  { id: "doc-preparation",     name: "Document Preparation",     status: "operational"   },
  { id: "signing-requests",    name: "Signing Requests",         status: "operational"   },
  { id: "recipient-signing",   name: "Recipient Signing",        status: "operational"   },
  { id: "doc-verification",    name: "Document Verification",    status: "operational"   },
  { id: "notifications",       name: "Notifications",            status: "operational"   },
  { id: "file-storage",        name: "File Storage",             status: "operational"   },
  { id: "api-integrations",    name: "API and Integrations",     status: "not-available" },
  {
    id: "enotary",
    name: "LAGDA eNotary",
    status: "future-product",
    note: "Coming Soon — Subject to Supreme Court Accreditation and applicable rules.",
  },
];

const MOCK_INCIDENTS = [
  {
    id: "inc-001",
    date: "14 Jul 2026 09:00 PHT",
    title: "Scheduled maintenance — notification delivery",
    status: "resolved" as const,
    detail: "Scheduled maintenance on notification delivery service. Notifications may have been delayed during the maintenance window of 09:00–09:45 PHT.",
  },
];

const MOCK_LAST_UPDATED = "15 Jul 2026 08:00 PHT";

function StatusBadge({ status }: { status: ServiceStatusValue }) {
  const { label, color, bg } = STATUS_DISPLAY[status];
  return (
    <span style={{ background: bg, color, ...GM, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }} aria-label={`Status: ${label}`}>
      <span aria-hidden style={{ fontSize: 8 }}>●</span>
      {label}
    </span>
  );
}

export function ServiceStatus() {
  const allOperational = MOCK_SERVICES.filter(s => s.status !== "future-product" && s.status !== "not-available").every(s => s.status === "operational");

  return (
    <ResourcesPageShell>
      <section style={{ padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>SERVICE STATUS</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ color: "white", ...GF, fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 12px" }}>LAGDA Service Status</h1>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: allOperational ? "rgba(34,197,94,0.1)" : "rgba(201,150,12,0.1)", border: `1px solid ${allOperational ? "rgba(34,197,94,0.25)" : "rgba(201,150,12,0.25)"}`, borderRadius: 8, padding: "8px 14px" }}>
                <span style={{ color: allOperational ? "#22C55E" : "#C9960C", fontSize: 10 }}>●</span>
                <span style={{ color: allOperational ? "#22C55E" : "#C9960C", ...GF, fontSize: 13, fontWeight: 700 }}>
                  {allOperational ? "All eSignature services operational" : "Some services affected"}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ color: "#7C8DA4", ...GM, fontSize: 9, marginBottom: 2 }}>LAST UPDATED</p>
              <p style={{ color: "#8A9BAE", ...GM, fontSize: 11, margin: 0 }}>{MOCK_LAST_UPDATED}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo notice */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 24px" }}>
        <div style={{ background: "rgba(201,150,12,0.08)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>DEMONSTRATION DATA</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            This service status page currently uses demonstration data and is not connected to production monitoring.
          </p>
        </div>
      </div>

      <ResourcesSection id="services">
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>SERVICES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }} role="list" aria-label="Service status list">
            {MOCK_SERVICES.map(({ id, name, status, note }) => (
              <div key={id} role="listitem" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, flexWrap: "wrap" }}>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600, margin: 0 }}>{name}</p>
                  {note && <p style={{ color: "#8A9BAE", ...GF, fontSize: 12, margin: "3px 0 0" }}>{note}</p>}
                </div>
                <StatusBadge status={status} />
              </div>
            ))}
          </div>
        </div>
      </ResourcesSection>

      <ResourcesSection id="incidents" light bordered>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>RECENT INCIDENTS</p>
          {MOCK_INCIDENTS.map(({ id, date, title, status: incStatus, detail }) => (
            <div key={id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</p>
                <span style={{ color: "#22C55E", ...GM, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{incStatus.toUpperCase()}</span>
              </div>
              <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "0 0 8px" }}>{date}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{detail}</p>
            </div>
          ))}
        </div>
      </ResourcesSection>

      <ResourcesSection id="legend">
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>STATUS KEY</p>
          <div style={{ display: "grid", gap: 8 }} className="legend-grid">
            {(Object.entries(STATUS_DISPLAY) as [ServiceStatusValue, { label: string; color: string; bg: string }][]).map(([key, { label, color }]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color, fontSize: 10 }}>●</span>
                <span style={{ color: "#94A3B8", ...GF, fontSize: 13 }}><strong style={{ color: "white" }}>{label}</strong> — {key === "operational" ? "System is functioning normally" : key === "degraded" ? "System is slower or partially impaired" : key === "partial-outage" ? "Some features are unavailable" : key === "major-outage" ? "System is unavailable" : key === "maintenance" ? "Planned maintenance in progress" : key === "not-available" ? "Feature is not yet available" : "Future regulated product not yet launched"}</span>
              </div>
            ))}
          </div>
          <style>{`.legend-grid { grid-template-columns: 1fr; }`}</style>
        </div>
      </ResourcesSection>
    </ResourcesPageShell>
  );
}
