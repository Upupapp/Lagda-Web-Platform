// Saved Bulk Send configurations — Command 33.
//   /app/bulk-send/saved-configurations
//   /app/bulk-send/saved-configurations/:configurationId
//
// A saved configuration retains mapping RULES and defaults. It never retains
// recipient rows, imported file contents, or cell values.

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { AppContent } from "../../../components/platform/AppContentLayout";
import { PageHeader } from "../../../components/platform/PageHeader";
import { CapabilityUnavailable } from "../../../components/platform/CapabilityUnavailable";
import {
  BULK_SEND_STYLES, BS, GF, TONES, ConfigStatusPill, EmptyState, IssueList,
  Notice, Pill, SectionHeading, Skeleton, useAnnouncer, useBulkSendConfirm,
} from "../../../components/bulk-send/BulkSendKit";
import { useBulkSendContext } from "./useBulkSend";
import { bulkSendService } from "../../../services/mock/bulk-send.service";
import type { BulkSendSavedConfiguration } from "../../../models/bulk-send";
import {
  BULK_SEND_DEMONSTRATION_NOTICE, BULK_SEND_STALE_LABELS, isSafeBulkSendId,
} from "../../../models/bulk-send";

const CONFIG_STORAGE_NOTICE =
  "Saved configurations keep Template and mapping rules only. Recipient rows, pasted values, " +
  "and imported file contents are never saved, and nothing is stored on this device or " +
  "synchronized across devices.";

function useGuards() {
  const { capability, permissions } = useBulkSendContext();
  const blocked =
    !capability.available ? (
      <CapabilityUnavailable outcome={capability.outcome} reasonLabel={capability.reasonLabel}
        safeFallbackRoute={capability.safeFallbackRoute} title="Bulk Send Not Available" />
    ) : !permissions.canViewBulkSend ? (
      <CapabilityUnavailable outcome="unavailable-permission"
        reasonLabel="You do not have permission to view Bulk Send."
        safeFallbackRoute="/app/documents" title="Permission Required" />
    ) : null;
  return { blocked, permissions };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════════════════

export function BulkSendConfigurationsPage() {
  const { blocked, permissions } = useGuards();
  const { ctx } = useBulkSendContext();
  const { announce, announcerNode } = useAnnouncer();
  const { confirm, confirmDialog } = useBulkSendConfirm();

  const [configs, setConfigs] = useState<BulkSendSavedConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  const reload = useCallback(() => setKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    bulkSendService.listSavedConfigurations(ctx).then(r => {
      if (cancelled) return;
      if (r.ok) setConfigs(r.data);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ctx, key]);

  if (blocked) return blocked;

  const active = configs.filter(c => c.status === "active" || c.status === "stale");
  const archived = configs.filter(c => c.status === "archived");
  const restricted = configs.filter(c => c.status === "restricted");

  const card = (c: BulkSendSavedConfiguration) => (
    <li key={String(c.id)} className="bs-card" style={{ padding: 14 }}>
      <div className="bs-row" style={{ gap: 8, marginBottom: 8, justifyContent: "space-between" }}>
        <span style={{ ...GF, fontSize: 15, fontWeight: 700, color: BS.navy, overflowWrap: "anywhere" }}>
          {c.status === "restricted" ? "Restricted configuration" : c.name}
        </span>
        <ConfigStatusPill status={c.status} />
      </div>
      {c.status !== "restricted" && (
        <p style={{ ...GF, margin: "0 0 10px", fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>
          {c.templateName} · {c.teamName ?? "Workspace scope"}
        </p>
      )}
      {c.staleReferences.length > 0 && c.status !== "restricted" && (
        <div style={{ marginBottom: 10 }}>
          <IssueList issues={c.staleReferences.map(r => ({
            severity: "warning" as const,
            message: BULK_SEND_STALE_LABELS[r.kind],
          }))} />
        </div>
      )}
      {c.status !== "restricted" && (
        <div className="bs-row" style={{ gap: 8 }}>
          <Link to={`/app/bulk-send/saved-configurations/${c.id}`} className="bs-btn bs-btn-secondary bs-btn-sm">Open</Link>
          {permissions.canManageSavedConfigurations && c.status !== "archived" && (
            <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
              onClick={() => confirm({
                title: "Archive this configuration?",
                body: "It is removed from the active list but kept for reference and can be restored.",
                confirmLabel: "Archive",
                onConfirm: async () => { await bulkSendService.archiveSavedConfiguration(String(c.id), ctx); reload(); announce("Configuration archived."); },
              })}>Archive</button>
          )}
          {permissions.canManageSavedConfigurations && c.status === "archived" && (
            <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
              onClick={async () => { await bulkSendService.restoreSavedConfiguration(String(c.id), ctx); reload(); announce("Configuration restored and revalidated."); }}>
              Restore
            </button>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      {announcerNode}
      <PageHeader title="Saved Bulk Send Configurations" />
      <AppContent>
        <div className="bs-stack" style={{ maxWidth: 900 }}>
          <Link to="/app/bulk-send" className="bs-btn bs-btn-ghost bs-btn-sm" style={{ padding: 0, alignSelf: "flex-start" }}>
            <ArrowLeft size={15} aria-hidden /> Back to Bulk Send
          </Link>

          <SectionHeading level={1} title="Saved Bulk Send Configurations"
            description="Reusable Template, mapping, and default rules you can apply to a new batch." />

          <Notice text={CONFIG_STORAGE_NOTICE} />

          {loading && <Skeleton label="Loading saved configurations" />}

          {!loading && configs.length === 0 && (
            <EmptyState title="No saved configurations"
              body="Build a batch, then save its Template and mapping rules so the next batch starts already configured."
              actions={<Link to="/app/bulk-send/new" className="bs-btn bs-btn-primary">Create a Batch</Link>} />
          )}

          {!loading && active.length > 0 && (
            <section className="bs-stack" style={{ gap: 10 }}>
              <SectionHeading title="Active" />
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {active.map(card)}
              </ul>
            </section>
          )}

          {!loading && archived.length > 0 && (
            <section className="bs-stack" style={{ gap: 10 }}>
              <SectionHeading title="Archived" />
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {archived.map(card)}
              </ul>
            </section>
          )}

          {!loading && restricted.length > 0 && (
            <section className="bs-stack" style={{ gap: 10 }}>
              <SectionHeading title="Restricted"
                description="These belong to a Team you cannot access. Their Template, mapping, and recipient details are not shown." />
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {restricted.map(card)}
              </ul>
            </section>
          )}

          <Notice text={BULK_SEND_DEMONSTRATION_NOTICE} compact />
        </div>
      </AppContent>
      {confirmDialog}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL
// ═══════════════════════════════════════════════════════════════════════════════

export function BulkSendConfigurationDetailPage() {
  const { configurationId } = useParams<{ configurationId: string }>();
  const { blocked, permissions } = useGuards();
  const { ctx } = useBulkSendContext();
  const navigate = useNavigate();
  const { announce, announcerNode } = useAnnouncer();
  const { confirm, confirmDialog } = useBulkSendConfirm();

  const [config, setConfig] = useState<BulkSendSavedConfiguration | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "restricted">("loading");

  useEffect(() => {
    if (!configurationId || !isSafeBulkSendId(configurationId)) { setState("not-found"); return; }
    let cancelled = false;
    setState("loading");
    bulkSendService.getSavedConfiguration(configurationId, ctx).then(r => {
      if (cancelled) return;
      if (r.ok) { setConfig(r.data); setState("ready"); }
      else if (r.code === "PERMISSION_DENIED") setState("restricted");
      else setState("not-found");
    }).catch(() => { if (!cancelled) setState("not-found"); });
    return () => { cancelled = true; };
  }, [configurationId, ctx]);

  if (blocked) return blocked;

  if (state === "loading") {
    return (
      <div className="bs-root"><style>{BULK_SEND_STYLES}</style>
        <PageHeader title="Bulk Send Configuration Details" />
        <AppContent><Skeleton label="Loading configuration" /></AppContent>
      </div>
    );
  }

  if (state === "restricted") {
    return (
      <div className="bs-root"><style>{BULK_SEND_STYLES}</style><AppContent>
        <EmptyState title="Configuration Restricted"
          body="You do not have access to this configuration. Its Template, mapping, and Team details are not shown."
          actions={<Link to="/app/bulk-send/saved-configurations" className="bs-btn bs-btn-primary">Return to Saved Configurations</Link>} />
      </AppContent></div>
    );
  }

  if (state === "not-found" || !config) {
    return (
      <div className="bs-root"><style>{BULK_SEND_STYLES}</style><AppContent>
        <EmptyState title="Configuration Not Found"
          body="That configuration is not available in this Workspace."
          actions={<Link to="/app/bulk-send/saved-configurations" className="bs-btn bs-btn-primary">Return to Saved Configurations</Link>} />
      </AppContent></div>
    );
  }

  const mappedRoles = config.roleMappings.filter(m => Object.values(m.columnByField).some(Boolean)).length;
  const mappedVars = config.variableMappings.filter(m => m.columnId || m.constantValue).length;

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      {announcerNode}
      <PageHeader title="Bulk Send Configuration Details" />
      <AppContent>
        <div className="bs-stack" style={{ maxWidth: 820 }}>
          <Link to="/app/bulk-send/saved-configurations" className="bs-btn bs-btn-ghost bs-btn-sm" style={{ padding: 0, alignSelf: "flex-start" }}>
            <ArrowLeft size={15} aria-hidden /> Back to Saved Configurations
          </Link>

          <SectionHeading level={1} title={config.name}
            description={`${config.templateName} · ${config.teamName ?? "Workspace scope"}`} />
          <div className="bs-row" style={{ gap: 6 }}>
            <ConfigStatusPill status={config.status} />
            <Pill label={`${mappedRoles} of ${config.roleMappings.length} roles mapped`} tone={TONES.neutral} />
            <Pill label={`${mappedVars} of ${config.variableMappings.length} variables mapped`} tone={TONES.neutral} />
          </div>

          <Notice text={CONFIG_STORAGE_NOTICE} />

          {config.staleReferences.length > 0 && (
            <div className="bs-panel bs-stack">
              <SectionHeading title="References needing attention"
                description="Categories are shown without naming a restricted resource. Nothing is silently substituted or broadened." />
              <IssueList issues={config.staleReferences.map(r => ({
                severity: "warning" as const, message: BULK_SEND_STALE_LABELS[r.kind],
              }))} />
              {permissions.canManageSavedConfigurations && (
                <div className="bs-row" style={{ gap: 10 }}>
                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                    onClick={async () => {
                      const r = await bulkSendService.duplicateSavedConfiguration(String(config.id), ctx);
                      if (r.ok) { announce("Duplicated as a new configuration."); navigate(`/app/bulk-send/saved-configurations/${r.data.id}`); }
                    }}>Duplicate as New Configuration</button>
                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                    onClick={() => confirm({
                      title: "Archive this configuration?",
                      body: "It is kept for reference and can be restored later.",
                      confirmLabel: "Archive",
                      onConfirm: async () => { await bulkSendService.archiveSavedConfiguration(String(config.id), ctx); navigate("/app/bulk-send/saved-configurations"); },
                    })}>Archive</button>
                </div>
              )}
            </div>
          )}

          <div className="bs-panel bs-stack">
            <SectionHeading title="Mapping rules" />
            <div className="bs-card bs-scroll-x">
              <table className="bs-table">
                <caption className="bs-visually-hidden">Participant roles retained by this configuration.</caption>
                <thead>
                  <tr><th scope="col">Role</th><th scope="col">Type</th><th scope="col">Required</th><th scope="col">Authentication</th></tr>
                </thead>
                <tbody>
                  {config.roleMappings.map(m => (
                    <tr key={String(m.id)}>
                      <td style={{ fontWeight: 600, color: BS.navy }}>{m.placeholderLabel}</td>
                      <td>{m.role.replace(/-/g, " ")}</td>
                      <td>{m.required ? "Required" : "Optional"}</td>
                      <td>{m.authMethod.replace(/-/g, " ")}</td>
                    </tr>
                  ))}
                  {config.roleMappings.length === 0 && (
                    <tr><td colSpan={4} style={{ color: BS.slate5 }}>No role rules stored.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bs-panel bs-stack">
            <SectionHeading title="Organization defaults" />
            <dl style={{ ...GF, margin: 0, fontSize: 13, color: BS.slate6, lineHeight: 1.9 }}>
              <div><dt style={{ display: "inline" }}>Folder: </dt>
                <dd style={{ display: "inline", margin: 0, color: BS.slate9 }}>{config.organization.folderName ?? "None"}</dd></div>
              <div><dt style={{ display: "inline" }}>Tags: </dt>
                <dd style={{ display: "inline", margin: 0, color: BS.slate9 }}>
                  {config.organization.tagNames.length ? config.organization.tagNames.join(", ") : "None"}
                </dd></div>
            </dl>
            <p style={{ ...GF, margin: 0, fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>
              Folder and Tag assignment organize projected Drafts. They never grant document access.
            </p>
          </div>

          {permissions.canManageSavedConfigurations && (
            <div className="bs-panel bs-stack">
              <SectionHeading title="Actions" />
              <div className="bs-row" style={{ gap: 10 }}>
                <Link to="/app/bulk-send/new" className="bs-btn bs-btn-primary bs-btn-sm">Apply to New Batch</Link>
                <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                  onClick={async () => {
                    const r = await bulkSendService.duplicateSavedConfiguration(String(config.id), ctx);
                    if (r.ok) navigate(`/app/bulk-send/saved-configurations/${r.data.id}`);
                  }}>Duplicate</button>
                <button type="button" className="bs-btn bs-btn-danger bs-btn-sm"
                  onClick={() => confirm({
                    title: "Remove this configuration from the demonstration?",
                    body: "Only mutable frontend state is removed. No batch, Document, Template, or Contact is deleted. This is not secure deletion.",
                    confirmLabel: "Remove from demonstration",
                    destructive: true,
                    onConfirm: async () => {
                      await bulkSendService.removeSavedConfigurationDemonstration(String(config.id), ctx);
                      navigate("/app/bulk-send/saved-configurations");
                    },
                  })}>Remove from Demonstration</button>
              </div>
            </div>
          )}
        </div>
      </AppContent>
      {confirmDialog}
    </div>
  );
}
