// /app/settings/integrations/:integrationId — Integration detail and demonstration actions.
// No OAuth, no credential storage, no data synchronization, no real connections.

import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { SettingsPage, SSection, SField, INPUT_STYLE, StatusBadge, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockIntegrationService } from "../../../services/mock/settings.service";
import type { IntegrationDefinition, IntegrationId } from "../../../models/settings";
import { INTEGRATION_CATEGORY_LABELS } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const SILVER= "#8A9BAE";

function isConnected(i: IntegrationDefinition): boolean {
  return i.connectionStatus === "configured-demonstration" || i.connectionStatus === "connection-demonstration";
}

function canConnect(i: IntegrationDefinition): boolean {
  return i.availability === "available" || i.availability === "plan-dependent";
}

type ActionState = "idle" | "loading" | "done";

export function IntegrationDetailPage() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const [integration, setIntegration] = useState<IntegrationDefinition | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [connecting, setConnecting]   = useState<ActionState>("idle");
  const [connectResult, setConnectResult] = useState<string | null>(null);
  const [testing, setTesting]         = useState<ActionState>("idle");
  const [testResult, setTestResult]   = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<ActionState>("idle");
  const [disconnectResult, setDisconnectResult] = useState<string | null>(null);

  const refresh = async (id: IntegrationId) => {
    const updated = await mockIntegrationService.getIntegration(id);
    if (updated) setIntegration(updated);
  };

  useEffect(() => {
    if (!integrationId) { setNotFound(true); setLoading(false); return; }
    mockIntegrationService.getIntegration(integrationId as IntegrationId).then(i => {
      if (!i) { setNotFound(true); } else { setIntegration(i); }
      setLoading(false);
    });
  }, [integrationId]);

  const handleConnect = async () => {
    if (!integration) return;
    setConnecting("loading");
    const res = await mockIntegrationService.updateIntegrationConfiguration(integration.id, configValues);
    await refresh(integration.id);
    setConnecting("done");
    setConnectResult(res.message);
    setTimeout(() => setConnectResult(null), 5000);
  };

  const handleTest = async () => {
    if (!integration) return;
    setTesting("loading");
    const res = await mockIntegrationService.testConnectionDemonstration(integration.id);
    setTesting("done");
    setTestResult(res.message);
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleDisconnect = async () => {
    if (!integration) return;
    if (!confirm(`Disconnect ${integration.name}? This is a frontend demonstration only.`)) return;
    setDisconnecting("loading");
    await mockIntegrationService.disconnectIntegrationDemonstration(integration.id);
    await refresh(integration.id);
    setDisconnecting("done");
    setDisconnectResult("Disconnection simulated in frontend state. No real integration was disconnected.");
    setTimeout(() => setDisconnectResult(null), 5000);
  };

  if (loading) return (
    <SettingsPage title="Integration" breadcrumb="Integrations › …">
      <Skeleton h={120} mb={16} /><Skeleton h={160} mb={16} /><Skeleton h={80} />
    </SettingsPage>
  );

  if (notFound || !integration) return (
    <SettingsPage title="Integration not found" breadcrumb="Integrations › Not found">
      <div style={{ padding: "40px 0", textAlign: "center", ...GF, fontSize: 14, color: SLATE }}>
        Integration not found.{" "}<Link to="/app/settings/integrations" style={{ color: AZURE }}>Back to Integrations</Link>
      </div>
    </SettingsPage>
  );

  const connected  = isConnected(integration);
  const connectable = canConnect(integration);
  const isPlanned   = integration.availability === "planned" || integration.connectionStatus === "planned";
  const isPlanGated = integration.availability === "plan-dependent";
  const isEnterprise = integration.availability === "enterprise";
  const canAct = connectable || connected;

  return (
    <SettingsPage title={integration.name} breadcrumb={`Integrations › ${integration.name}`}>
      {DEMO_NOTICE}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>{integration.name}</h2>
          <div style={{ ...GF, fontSize: 13, color: SLATE, marginTop: 4 }}>
            {INTEGRATION_CATEGORY_LABELS[integration.category]} · {integration.description}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "flex-end" }}>
          {connected && <StatusBadge label="Connected (Demo)" color={GREEN} />}
          {!connected && integration.availability === "available" && <StatusBadge label="Available" color={AZURE} />}
          {!connected && isPlanGated  && <StatusBadge label="Upgrade required" color={AMBER} />}
          {!connected && isEnterprise && <StatusBadge label="Enterprise" color={SLATE} />}
          {!connected && isPlanned    && <StatusBadge label="Coming soon" color={SILVER} />}
        </div>
      </div>

      {/* Plan / enterprise notice */}
      {isPlanGated && (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "12px 16px", marginBottom: 16, ...GF, fontSize: 13, color: "#92400E" }}>
          This integration requires a Business plan or higher. {integration.planNote}
        </div>
      )}
      {isEnterprise && (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "12px 16px", marginBottom: 16, ...GF, fontSize: 13, color: "#92400E" }}>
          This integration is available on Enterprise plans. {integration.planNote}
        </div>
      )}
      {isPlanned && !isPlanGated && !isEnterprise && (
        <div style={{ background: "#F8FAFC", border: "1.5px solid #E3E8EF", borderRadius: 8, padding: "12px 16px", marginBottom: 16, ...GF, fontSize: 13, color: SLATE }}>
          This integration is planned for a future release.
        </div>
      )}

      {/* Capabilities */}
      {integration.capabilities.length > 0 && (
        <SSection title="Capabilities">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {integration.capabilities.map((c, i) => (
              <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", ...GF, fontSize: 13, color: NAVY }}>
                <span aria-hidden style={{ color: GREEN, flexShrink: 0, marginTop: 1 }}>✓</span>
                {c}
              </li>
            ))}
          </ul>
        </SSection>
      )}

      {/* Data access */}
      {integration.dataAccess.length > 0 && (
        <SSection title="Data Access">
          <div role="note" style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 10, fontStyle: "italic" }}>
            Data access listed below is for demonstration purposes only. No real data is accessed.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {integration.dataAccess.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ ...GF, fontSize: 11, padding: "2px 8px", background: "#F1F5F9", borderRadius: 999, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
                  {d.direction}
                </span>
                <span style={{ ...GF, fontSize: 13, color: NAVY }}>{d.label}</span>
              </div>
            ))}
          </div>
        </SSection>
      )}

      {/* Config fields */}
      {canAct && integration.configFields.length > 0 && (
        <SSection title="Configuration">
          <div role="note" style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 12, fontStyle: "italic" }}>
            Do not enter real credentials. These fields are part of a frontend demonstration only.
          </div>
          {integration.configFields.map(f => (
            <SField key={f.id} label={f.label} help={f.placeholder}>
              {f.type === "select" ? (
                <select value={configValues[f.id] ?? ""}
                  onChange={e => setConfigValues(p => ({ ...p, [f.id]: e.target.value }))}
                  style={{ ...GF, fontSize: 13, padding: "8px 10px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}>
                  {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type === "url" ? "url" : "text"}
                  value={configValues[f.id] ?? ""}
                  onChange={e => setConfigValues(p => ({ ...p, [f.id]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={INPUT_STYLE}
                  aria-label={f.label}
                />
              )}
            </SField>
          ))}
        </SSection>
      )}

      {/* Actions */}
      {canAct && (
        <SSection title="Connection">
          <div role="note" style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 14, fontStyle: "italic" }}>
            All actions below are frontend demonstrations. No third-party authorization, OAuth exchange, credential storage, or data synchronization occurs.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {!connected && (
              <button onClick={handleConnect} disabled={connecting === "loading"}
                style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: connecting === "loading" ? "not-allowed" : "pointer", opacity: connecting === "loading" ? 0.7 : 1 }}>
                {connecting === "loading" ? "Connecting…" : "Connect (Demonstration)"}
              </button>
            )}
            {connected && (
              <>
                <button onClick={handleTest} disabled={testing === "loading"}
                  style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: `1.5px solid ${AZURE}`, borderRadius: 8, background: "#FFFFFF", color: AZURE, cursor: testing === "loading" ? "not-allowed" : "pointer" }}>
                  {testing === "loading" ? "Testing…" : "Test connection (Demo)"}
                </button>
                <button onClick={handleDisconnect} disabled={disconnecting === "loading"}
                  style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", cursor: disconnecting === "loading" ? "not-allowed" : "pointer" }}>
                  {disconnecting === "loading" ? "Disconnecting…" : "Disconnect (Demo)"}
                </button>
              </>
            )}
          </div>

          {connectResult && (
            <div role="status" style={{ marginTop: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "9px 14px", ...GF, fontSize: 13, color: "#166534" }}>
              {connectResult}
            </div>
          )}
          {testResult && (
            <div role="status" style={{ marginTop: 12, background: "#EBF5FB", border: "1px solid #BFDBFE", borderRadius: 6, padding: "9px 14px", ...GF, fontSize: 13, color: "#1E40AF" }}>
              {testResult}
            </div>
          )}
          {disconnectResult && (
            <div role="status" style={{ marginTop: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "9px 14px", ...GF, fontSize: 13, color: "#166534" }}>
              {disconnectResult}
            </div>
          )}
        </SSection>
      )}

      <div style={{ marginTop: 14 }}>
        <Link to="/app/settings/integrations" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>← Back to Integrations</Link>
      </div>
    </SettingsPage>
  );
}
