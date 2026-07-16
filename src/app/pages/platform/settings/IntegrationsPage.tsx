// /app/settings/integrations — Integration catalog.
// Frontend-only. No OAuth, no credential storage, no data synchronization.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { SettingsPage, SSection, StatusBadge, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockIntegrationService } from "../../../services/mock/settings.service";
import type {
  IntegrationDefinition,
  IntegrationCategory,
  IntegrationAvailability,
  IntegrationConnectionStatus,
} from "../../../models/settings";
import { INTEGRATION_CATEGORY_LABELS } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const GREEN = "#16A34A";
const AMBER = "#D97706";

function connectionBadge(status: IntegrationConnectionStatus): { label: string; color: string } | null {
  if (status === "configured-demonstration" || status === "connection-demonstration")
    return { label: "Connected (Demo)", color: GREEN };
  if (status === "attention-required")
    return { label: "Attention needed", color: AMBER };
  return null;
}

function availabilityBadge(a: IntegrationAvailability): { label: string; color: string } {
  if (a === "available")       return { label: "Available", color: AZURE };
  if (a === "plan-dependent")  return { label: "Upgrade required", color: AMBER };
  if (a === "enterprise")      return { label: "Enterprise", color: SLATE };
  if (a === "planned")         return { label: "Coming soon", color: SILVER };
  return { label: "Unavailable", color: SILVER };
}

function IntegrationCard({ integration }: { integration: IntegrationDefinition }) {
  const avail  = availabilityBadge(integration.availability);
  const connBadge = connectionBadge(integration.connectionStatus);

  return (
    <Link to={`/app/settings/integrations/${integration.id}`} style={{ textDecoration: "none" }}>
      <div style={{ border: "1.5px solid #E3E8EF", borderRadius: 10, padding: "16px 18px", background: "#FFFFFF", cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, height: "100%", boxSizing: "border-box" }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,120,212,0.10)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 2 }}>{integration.name}</div>
            <div style={{ ...GF, fontSize: 11, color: SLATE }}>{INTEGRATION_CATEGORY_LABELS[integration.category]}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            {connBadge
              ? <StatusBadge label={connBadge.label} color={connBadge.color} />
              : <StatusBadge label={avail.label} color={avail.color} />
            }
          </div>
        </div>
        <div style={{ ...GF, fontSize: 13, color: SLATE, lineHeight: 1.5, flex: 1 }}>{integration.description}</div>
        {integration.planNote && (
          <div style={{ ...GF, fontSize: 11, color: AMBER, fontStyle: "italic" }}>{integration.planNote}</div>
        )}
        <div style={{ ...GF, fontSize: 12, color: AZURE, fontWeight: 600 }}>View details →</div>
      </div>
    </Link>
  );
}

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationDefinition[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | "all">("all");
  const [availFilter, setAvailFilter]   = useState<IntegrationAvailability | "all">("all");

  useEffect(() => {
    mockIntegrationService.listIntegrations().then(list => { setIntegrations(list); setLoading(false); });
  }, []);

  const categories = Array.from(new Set(integrations.map(i => i.category)));

  const filtered = integrations.filter(i => {
    const matchSearch = !search
      || i.name.toLowerCase().includes(search.toLowerCase())
      || i.description.toLowerCase().includes(search.toLowerCase());
    const matchCat   = categoryFilter === "all" || i.category === categoryFilter;
    const matchAvail = availFilter === "all" || i.availability === availFilter;
    return matchSearch && matchCat && matchAvail;
  });

  return (
    <SettingsPage title="Integrations" breadcrumb="Integrations">
      {DEMO_NOTICE}

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input type="search" placeholder="Search integrations…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...GF, fontSize: 13, padding: "8px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, flex: "1 1 200px", minWidth: 180 }}
          aria-label="Search integrations" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as IntegrationCategory | "all")}
          aria-label="Filter by category"
          style={{ ...GF, fontSize: 13, padding: "8px 10px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{INTEGRATION_CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={availFilter} onChange={e => setAvailFilter(e.target.value as IntegrationAvailability | "all")}
          aria-label="Filter by availability"
          style={{ ...GF, fontSize: 13, padding: "8px 10px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}>
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="plan-dependent">Upgrade required</option>
          <option value="enterprise">Enterprise</option>
          <option value="planned">Coming soon</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={140} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", ...GF, fontSize: 14, color: SLATE }}>
          No integrations match your search.
        </div>
      ) : (
        <SSection title={`${filtered.length} integration${filtered.length !== 1 ? "s" : ""}`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {filtered.map(i => <IntegrationCard key={i.id} integration={i} />)}
          </div>
        </SSection>
      )}

      <div style={{ marginTop: 18, ...GF, fontSize: 12, color: SILVER, fontStyle: "italic" }}>
        All integrations are frontend demonstrations. No third-party authorization, OAuth exchange, or data synchronization occurs.
      </div>
    </SettingsPage>
  );
}
