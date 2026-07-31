// Bulk Send batch-scoped routes — Command 33.
//   /app/bulk-send/new
//   /app/bulk-send/:batchId
//   /app/bulk-send/:batchId/recipients
//   /app/bulk-send/:batchId/mapping
//   /app/bulk-send/:batchId/review
//   /app/bulk-send/:batchId/results

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, FileText, Pencil, Upload, UserRound, Users, UsersRound, Wand2 } from "lucide-react";
import { ContactRecipientPicker } from "../../../components/contacts/ContactRecipientPicker";
import {
  DuplicateCheckNotice, RowField, RowProvenance, deriveEditableColumns,
  emailDuplicateCheckingUnavailable, overriddenColumnIds, useRowEditor,
} from "../../../components/bulk-send/RecipientRowEditor";
import { useIsMobile } from "../../../components/ui/use-mobile";
import { AppContent } from "../../../components/platform/AppContentLayout";
import { PageHeader } from "../../../components/platform/PageHeader";
import { CapabilityUnavailable } from "../../../components/platform/CapabilityUnavailable";
import {
  BULK_SEND_STYLES, BS, GF, TONES, BatchStatusPill, ConfidencePill, CountChip,
  EmptyState, IssueList, Notice, Pill, ResultStatusPill, RowStatusPill, SectionHeading,
  Sheet, Skeleton, SourcePill, useAnnouncer, useBulkSendConfirm,
} from "../../../components/bulk-send/BulkSendKit";
import { useBatch, useBulkSendContext } from "./useBulkSend";
import { bulkSendService } from "../../../services/mock/bulk-send.service";
import { listTemplates, getTemplateById } from "../../../services/mock/templates.service";
import type { DocumentTemplate } from "../../../models/templates";
import { DEFAULT_TEMPLATE_QUERY } from "../../../models/templates";
import type {
  BulkSendBatch, BulkSendImportPreview, BulkSendRecipientRowSource, BulkSendRoleField,
} from "../../../models/bulk-send";
import {
  BULK_SEND_ACTIVITY_NOTICE, BULK_SEND_CSV_NOTICE, BULK_SEND_DEMONSTRATION_NOTICE,
  BULK_SEND_LEGAL_NOTICE, BULK_SEND_RESULTS_NOTICE, BULK_SEND_REVIEW_NOTICE,
  BULK_SEND_ROLE_FIELD_LABELS, BULK_SEND_SOURCE_LABELS, BULK_SEND_SOURCE_PRIVACY,
} from "../../../models/bulk-send";
import { BULK_SEND_PASTE_EXAMPLE, BULK_SEND_DEMO_DATASETS } from "../../../data/mock/bulk-send";

// ── Shared guards ─────────────────────────────────────────────────────────────

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
  return { blocked, permissions, capability };
}

function NotFound({ what, to, label }: { what: string; to: string; label: string }) {
  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      <AppContent>
        <EmptyState title={`${what} Not Found`}
          body={`That ${what.toLowerCase()} is not available in this Workspace.`}
          actions={<Link to={to} className="bs-btn bs-btn-primary">{label}</Link>} />
      </AppContent>
    </div>
  );
}

function Restricted() {
  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      <AppContent>
        <EmptyState title="Batch Restricted"
          body="You do not have access to this batch. Its Template, Team, sender, and recipient details are not shown."
          actions={<Link to="/app/bulk-send" className="bs-btn bs-btn-primary">Return to Bulk Send</Link>} />
      </AppContent>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW BATCH  — /app/bulk-send/new
// ═══════════════════════════════════════════════════════════════════════════════

export function BulkSendNewPage() {
  const { blocked, permissions } = useGuards();
  const { ctx } = useBulkSendContext();
  const navigate = useNavigate();
  const { announce, announcerNode } = useAnnouncer();

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template list gives summaries; the full DocumentTemplate (placeholders, variables)
  // is read per candidate so role and variable counts come from the authoritative record.
  const available = useMemo(() => {
    const result = listTemplates(DEFAULT_TEMPLATE_QUERY);
    return result.items
      .filter(t => t.status === "available")
      .map(t => getTemplateById(t.id))
      .filter((t): t is DocumentTemplate => t !== null);
  }, []);
  const dirty = name.trim().length > 0 || templateId !== null;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (blocked) return blocked;
  if (!permissions.canCreateBatch) {
    return (
      <CapabilityUnavailable outcome="unavailable-permission"
        reasonLabel="You do not have permission to create Bulk Send batches."
        safeFallbackRoute="/app/bulk-send" title="Permission Required" />
    );
  }

  const create = async () => {
    setTouched(true);
    if (!name.trim() || !templateId) return;
    setBusy(true);
    setError(null);
    const result = await bulkSendService.createBatch({ name, templateId }, ctx);
    setBusy(false);
    if (result.ok) {
      announce("Batch created in frontend state.");
      navigate(`/app/bulk-send/${result.data.id}/recipients`);
    } else setError(result.message);
  };

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      {announcerNode}
      <PageHeader title="Create Bulk Send Batch" />
      <AppContent>
        <div className="bs-stack" style={{ maxWidth: 760 }}>
          <Link to="/app/bulk-send" className="bs-btn bs-btn-ghost bs-btn-sm" style={{ padding: 0, alignSelf: "flex-start" }}>
            <ArrowLeft size={15} aria-hidden /> Back to Bulk Send
          </Link>

          <SectionHeading level={1} title="Create Bulk Send Batch"
            description="Name the batch and choose the approved Template every recipient row will use." />

          <Notice text={BULK_SEND_DEMONSTRATION_NOTICE} />

          {error && (
            <div role="alert" className="bs-card" style={{ padding: 12, background: TONES.error.bg, borderColor: TONES.error.border }}>
              <p style={{ ...GF, margin: 0, fontSize: 13, color: TONES.error.text }}>{error}</p>
            </div>
          )}

          <div className="bs-panel bs-stack">
            <div>
              <label htmlFor="bs-name" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: BS.slate7, marginBottom: 6 }}>
                Batch name <span aria-hidden style={{ color: BS.errorText }}>*</span>
              </label>
              <input id="bs-name" className="bs-input" value={name} maxLength={120}
                onChange={e => setName(e.target.value)} onBlur={() => setTouched(true)}
                aria-invalid={touched && !name.trim()} />
              {touched && !name.trim() && (
                <p role="alert" style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: BS.errorText }}>
                  A batch name is required.
                </p>
              )}
            </div>

            <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
              <legend style={{ ...GF, fontSize: 13, fontWeight: 600, color: BS.slate7, marginBottom: 8 }}>
                Template <span aria-hidden style={{ color: BS.errorText }}>*</span>
              </legend>
              {available.length === 0 ? (
                <Notice text="No approved Templates are available in this Workspace. Archived Templates cannot be used for Bulk Send." tone={TONES.warning} />
              ) : (
                <div className="bs-stack" style={{ gap: 8 }}>
                  {available.map(t => (
                    <label key={t.id} style={{
                      display: "flex", gap: 10, alignItems: "flex-start", padding: 12, minHeight: 44,
                      border: `1.5px solid ${templateId === t.id ? BS.azure : BS.slate2}`,
                      background: templateId === t.id ? BS.azureSoft : BS.white,
                      borderRadius: 10, cursor: "pointer",
                    }}>
                      <input type="radio" name="bs-template" checked={templateId === t.id}
                        onChange={() => setTemplateId(t.id)} style={{ marginTop: 3, width: 18, height: 18 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ ...GF, display: "block", fontSize: 14, fontWeight: 700, color: BS.navy }}>{t.name}</span>
                        <span style={{ ...GF, display: "block", fontSize: 12, color: BS.slate5, marginTop: 2, lineHeight: 1.55 }}>
                          {t.description}
                        </span>
                        <span className="bs-row" style={{ gap: 6, marginTop: 8 }}>
                          <Pill label={`${t.placeholders.length} ${t.placeholders.length === 1 ? "role" : "roles"}`} tone={TONES.neutral} />
                          <Pill label={`${t.variables.length} variables`} tone={TONES.neutral} />
                          <Pill label={`${t.variables.filter(v => v.required).length} required`} tone={TONES.azure} />
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="bs-row" style={{ gap: 10 }}>
              <button type="button" className="bs-btn bs-btn-primary" disabled={busy || !name.trim() || !templateId} onClick={create}>
                {busy ? "Working…" : "Create Batch"}
              </button>
              <Link to="/app/bulk-send" className="bs-btn bs-btn-secondary">Cancel</Link>
            </div>
          </div>

          <Notice text={BULK_SEND_LEGAL_NOTICE} compact />
        </div>
      </AppContent>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH DETAIL  — /app/bulk-send/:batchId
// ═══════════════════════════════════════════════════════════════════════════════

function BatchTabs({ batchId, current }: { batchId: string; current: string }) {
  const tabs = [
    { id: "overview",   label: "Overview",   to: `/app/bulk-send/${batchId}` },
    { id: "recipients", label: "Recipients", to: `/app/bulk-send/${batchId}/recipients` },
    { id: "mapping",    label: "Mapping",    to: `/app/bulk-send/${batchId}/mapping` },
    { id: "review",     label: "Review",     to: `/app/bulk-send/${batchId}/review` },
    { id: "results",    label: "Results",    to: `/app/bulk-send/${batchId}/results` },
  ];
  return (
    <nav aria-label="Batch sections" className="bs-step-nav">
      {tabs.map(t => (
        <Link key={t.id} to={t.to}
          className={`bs-btn bs-btn-sm ${current === t.id ? "bs-btn-primary" : "bs-btn-secondary"}`}
          aria-current={current === t.id ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

function BatchShell({ batchId, current, batch, children }: {
  batchId: string; current: string; batch: BulkSendBatch; children: React.ReactNode;
}) {
  return (
    <div className="bs-stack">
      <Link to="/app/bulk-send" className="bs-btn bs-btn-ghost bs-btn-sm" style={{ padding: 0, alignSelf: "flex-start" }}>
        <ArrowLeft size={15} aria-hidden /> Back to Bulk Send
      </Link>
      <SectionHeading level={1} title={batch.name}
        description={`${batch.templateName ?? "No Template"} · ${batch.scope.teamName ?? "Workspace scope"} · Sender: ${batch.scope.senderName}`} />
      <div className="bs-row" style={{ gap: 6 }}>
        <BatchStatusPill status={batch.status} />
        <Pill label={`${batch.rows.length} rows`} tone={TONES.neutral} />
        {batch.schema && <Pill label={BULK_SEND_SOURCE_LABELS[batch.schema.source]} tone={TONES.neutral} />}
      </div>
      <BatchTabs batchId={batchId} current={current} />
      {children}
    </div>
  );
}

export function BulkSendBatchPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { blocked } = useGuards();
  const { batch, state, errorMessage, reload, permissions, ctx } = useBatch(batchId);
  const { confirm, confirmDialog } = useBulkSendConfirm();
  const navigate = useNavigate();

  if (blocked) return blocked;
  if (state === "loading") return <LoadingShell label="Loading batch" title="Bulk Send Batch Details" />;
  if (state === "restricted") return <Restricted />;
  if (state === "not-found" || !batch) return <NotFound what="Batch" to="/app/bulk-send" label="Return to Bulk Send" />;
  if (state === "error") {
    return (
      <div className="bs-root"><style>{BULK_SEND_STYLES}</style><AppContent>
        <EmptyState title="Batch Could Not Be Loaded" body={errorMessage ?? "Something went wrong."}
          actions={<>
            <button type="button" className="bs-btn bs-btn-secondary" onClick={reload}>Retry</button>
            <Link to="/app/bulk-send" className="bs-btn bs-btn-primary">Return to Bulk Send</Link>
          </>} />
      </AppContent></div>
    );
  }

  const v = batch.validation;

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      <PageHeader title="Bulk Send Batch Details" />
      <AppContent>
        <BatchShell batchId={batchId!} current="overview" batch={batch}>
          <Notice text={BULK_SEND_DEMONSTRATION_NOTICE} />

          <div className="bs-row" style={{ gap: 10 }}>
            <CountChip label="Total rows" value={v.totalRows} tone={TONES.neutral} />
            <CountChip label="Ready" value={v.ready} tone={TONES.success} />
            <CountChip label="Warnings" value={v.warning} tone={TONES.warning} />
            <CountChip label="Incomplete" value={v.incomplete} tone={TONES.error} />
            <CountChip label="Duplicates" value={v.duplicate} tone={TONES.warning} />
            <CountChip label="Excluded" value={v.excluded} tone={TONES.muted} />
            <CountChip label="Projected" value={v.projected} tone={TONES.azure} />
          </div>

          <div className="bs-panel bs-stack">
            <SectionHeading title="Configuration" />
            <dl style={{ ...GF, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <Row label="Template" value={batch.templateName ?? "Not selected"} />
              <Row label="Workspace" value={batch.scope.workspaceName} />
              <Row label="Team scope" value={batch.scope.teamName ?? "Whole Workspace"} />
              <Row label="Sender" value={batch.scope.senderName} />
              <Row label="Recipient source" value={batch.schema ? BULK_SEND_SOURCE_LABELS[batch.schema.source] : "None yet"} />
              <Row label="Mapped roles" value={`${batch.roleMappings.filter(m => Object.values(m.columnByField).some(Boolean)).length} of ${batch.roleMappings.length}`} />
              <Row label="Mapped variables" value={`${batch.variableMappings.filter(m => m.columnId || m.constantValue).length} of ${batch.variableMappings.length}`} />
              <Row label="Folder" value={batch.organization.folderName ?? "None"} />
              <Row label="Tags" value={batch.organization.tagNames.length ? batch.organization.tagNames.join(", ") : "None"} />
            </dl>
          </div>

          <div className="bs-panel bs-stack">
            <SectionHeading title="Validation" />
            <IssueList issues={[...v.blockingIssues, ...v.nonblockingIssues]} />
          </div>

          {permissions.canEditBatch && (
            <div className="bs-panel bs-stack">
              <SectionHeading title="Actions" />
              <div className="bs-row" style={{ gap: 10 }}>
                <Link to={`/app/bulk-send/${batchId}/recipients`} className="bs-btn bs-btn-primary bs-btn-sm">Continue Setup</Link>
                <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                  onClick={() => confirm({
                    title: "Duplicate this batch?",
                    body: "The Template, mappings, and defaults are copied. Recipient rows and projection results are NOT copied, and the new batch starts as a Draft.",
                    confirmLabel: "Duplicate configuration",
                    onConfirm: async () => {
                      const r = await bulkSendService.duplicateBatch(batchId!, false, ctx);
                      if (r.ok) navigate(`/app/bulk-send/${r.data.id}`);
                    },
                  })}>Duplicate</button>
                <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                  onClick={() => confirm({
                    title: "Archive this batch?",
                    body: "The batch is removed from the active list but its configuration and frontend results are kept.",
                    confirmLabel: "Archive batch",
                    onConfirm: async () => { await bulkSendService.archiveBatch(batchId!, ctx); reload(); },
                  })}>Archive</button>
                <button type="button" className="bs-btn bs-btn-danger bs-btn-sm"
                  onClick={() => confirm({
                    title: "Remove this batch from the demonstration?",
                    body: "Only mutable frontend state is removed. Draft Projections already created stay in Documents, and no Contact or Document is deleted. This is not secure deletion.",
                    confirmLabel: "Remove from demonstration",
                    destructive: true,
                    onConfirm: async () => {
                      const r = await bulkSendService.removeBatchDemonstration(batchId!, ctx);
                      if (r.ok) navigate("/app/bulk-send");
                    },
                  })}>Remove from Demonstration</button>
              </div>
            </div>
          )}

          <Notice text={BULK_SEND_ACTIVITY_NOTICE} compact />
        </BatchShell>
      </AppContent>
      {confirmDialog}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <dt style={{ color: BS.slate5, flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, color: BS.slate9, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>{value}</dd>
    </div>
  );
}

function LoadingShell({ label, title }: { label: string; title: string }) {
  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      <PageHeader title={title} />
      <AppContent><Skeleton label={label} /></AppContent>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECIPIENTS  — /app/bulk-send/:batchId/recipients
// ═══════════════════════════════════════════════════════════════════════════════

export function BulkSendRecipientsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { blocked } = useGuards();
  const { batch, setBatch, state, reload, permissions, ctx } = useBatch(batchId);
  const { announce, announcerNode } = useAnnouncer();
  const { confirm, confirmDialog } = useBulkSendConfirm();

  const [source, setSource] = useState<BulkSendRecipientRowSource | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [preview, setPreview] = useState<BulkSendImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  // NOTE: `selected` holds recipient ROW ids for the exclude/restore controls.
  // Contact selection deliberately lives inside ContactRecipientPicker so the two
  // cannot corrupt each other.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowFilter, setRowFilter] = useState<string>("all");
  const [commitError, setCommitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rowsPanelRef = useRef<HTMLDivElement>(null);

  // ── Row editing ────────────────────────────────────────────────────────────
  // Declared with the other hooks, BEFORE the early returns below — the editor
  // uses state and memos, so calling it after a conditional return would break
  // the Rules of Hooks. It tolerates a null batch during loading.
  const isMobile = useIsMobile();
  const editableColumns = useMemo(
    () => (batch ? deriveEditableColumns(batch) : []),
    [batch],
  );
  const editor = useRowEditor({
    batch,
    columns: editableColumns,
    announce,
    confirmDiscard: (onConfirm) => confirm({
      title: "Discard changes to this row?",
      body: "The values you entered for this row have not been saved and will be lost. Other rows are not affected.",
      confirmLabel: "Discard row changes",
      destructive: true,
      onConfirm,
    }),
    commit: async (rowId, values) => {
      const r = await bulkSendService.updateRecipientRow(batchId!, rowId, values, ctx);
      if (r.ok) { setBatch(r.data); return { ok: true }; }
      return { ok: false, message: r.message };
    },
  });

  // Workspace switch, sign-out and account change all replace the batch context.
  // Any open editor belongs to the previous one, so it is closed and its working
  // values dropped rather than being carried across.
  useEffect(() => { editor.reset(); }, [ctx.workspaceId]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (blocked) return blocked;
  if (state === "loading") return <LoadingShell label="Loading recipients" title="Bulk Send Recipients" />;
  if (state === "restricted") return <Restricted />;
  if (state === "not-found" || !batch) return <NotFound what="Batch" to="/app/bulk-send" label="Return to Bulk Send" />;

  const commit = async (headers: string[], cells: string[][], src: BulkSendRecipientRowSource, extra = {}) => {
    setBusy(true);
    setCommitError(null);
    const r = await bulkSendService.applyRecipientSource(batchId!, headers, cells, src, ctx, extra);
    setBusy(false);
    if (r.ok) {
      setBatch(r.data); setPreview(null); setSource(null); setPasteText("");
      const requested = cells.length;
      const created = r.data.rows.length;
      // buildRows silently truncates at BULK_SEND_MAX_ROWS. Say so rather than
      // letting the counts quietly disagree.
      const truncated = created < requested
        ? ` ${requested} were selected and ${created} were added; the rest exceed the row limit for one batch.`
        : "";
      announce(`${created} recipient rows added.${truncated} Mappings were suggested deterministically and need review.`);
      // The source selector this action came from has just been replaced by the
      // rows panel, so move focus there rather than letting it drop to <body>.
      window.setTimeout(() => rowsPanelRef.current?.focus(), 60);
    } else {
      // Previously there was no else branch at all: a denied or archived batch
      // produced no error, no announcement, and a silently unchanged screen.
      setCommitError(r.message ?? "Those recipients could not be added.");
      announce("Recipients could not be added.");
    }
  };

  const rows = batch.rows.filter(r => rowFilter === "all" || r.status === rowFilter);
  const canEditRows = permissions.canEditBatch;

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      {announcerNode}
      <PageHeader title="Bulk Send Recipients" />
      <AppContent>
        <BatchShell batchId={batchId!} current="recipients" batch={batch}>

          {batch.rows.length === 0 && !source && (
            <div className="bs-panel bs-stack">
              <SectionHeading title="Add recipients"
                description="Choose one source. Nothing is imported until you confirm, and nothing is uploaded to a server." />
              {commitError && (
                <div role="alert" className="bs-card" style={{ padding: 12, background: "#FEF2F2", borderColor: "#FECACA" }}>
                  <p style={{ ...GF, margin: 0, fontSize: 13, color: "#991B1B" }}>{commitError}</p>
                </div>
              )}
              <div className="bs-stack" style={{ gap: 8 }}>
                {/* Contacts and Contact Groups were declared in the source union and
                    in the label/privacy maps from the start but never surfaced.
                    They are gated on canAddRecipients (manage_contacts) because
                    reading Contacts is what they additionally require; the other
                    three sources keep their existing behaviour. */}
                {(["contact", "contact-group", "deterministic-fixture", "structured-paste", "local-csv-preview"] as BulkSendRecipientRowSource[])
                  .filter(s => (s !== "contact" && s !== "contact-group") || permissions.canAddRecipients)
                  .map(s => (
                  <button key={s} type="button" className="bs-card"
                    onClick={() => setSource(s)}
                    style={{ padding: 14, textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: BS.white }}>
                    <span className="bs-row" style={{ gap: 8 }}>
                      {s === "local-csv-preview" ? <Upload size={16} color={BS.azure} aria-hidden />
                        : s === "structured-paste" ? <FileText size={16} color={BS.azure} aria-hidden />
                        : s === "contact" ? <UserRound size={16} color={BS.azure} aria-hidden />
                        : s === "contact-group" ? <UsersRound size={16} color={BS.azure} aria-hidden />
                        : <Users size={16} color={BS.azure} aria-hidden />}
                      <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: BS.navy }}>
                        {BULK_SEND_SOURCE_LABELS[s]}
                      </span>
                    </span>
                    <span style={{ ...GF, display: "block", fontSize: 12, color: BS.slate5, marginTop: 6, lineHeight: 1.6 }}>
                      {BULK_SEND_SOURCE_PRIVACY[s]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Contacts / Contact Groups ─────────────────────────────── */}
          {(source === "contact" || source === "contact-group") && (
            <ContactRecipientPicker
              mode={source === "contact" ? "contacts" : "contact-groups"}
              workspaceId={ctx.workspaceId}
              canUseContacts={permissions.canAddRecipients}
              busy={busy}
              onCancel={() => { setSource(null); setCommitError(null); }}
              onAdd={(payload, sourceKind) => commit(
                payload.headers,
                payload.cells,
                sourceKind,
                {
                  contactIds:      payload.contactIds,
                  contactGroupIds: payload.contactGroupIds,
                  contactStatuses: payload.contactStatuses,
                },
              )}
            />
          )}

          {/* ── Demonstration dataset ─────────────────────────────────── */}
          {source === "deterministic-fixture" && (
            <div className="bs-panel bs-stack">
              <SectionHeading title="Demonstration Dataset"
                description="Fictional rows. No real person is represented." />
              {BULK_SEND_DEMO_DATASETS.map(d => (
                <div key={d.id} className="bs-card" style={{ padding: 14 }}>
                  <p style={{ ...GF, margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: BS.navy }}>{d.label}</p>
                  <p style={{ ...GF, margin: "0 0 10px", fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>{d.description}</p>
                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" disabled={busy}
                    onClick={() => commit(d.headers, d.rows, "deterministic-fixture")}>
                    Use this dataset ({d.rows.length} rows)
                  </button>
                </div>
              ))}
              <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" onClick={() => setSource(null)}>Cancel</button>
            </div>
          )}

          {/* ── Structured paste ──────────────────────────────────────── */}
          {source === "structured-paste" && (
            <div className="bs-panel bs-stack">
              <SectionHeading title="Paste Rows"
                description="Paste tabular text with a header row. Plain text only — HTML is never rendered and formulas are never evaluated." />
              <div className="bs-card" style={{ padding: 12, background: BS.slate0 }}>
                <p style={{ ...GF, margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: BS.slate6 }}>Expected shape</p>
                <pre style={{ ...GF, margin: 0, fontSize: 12, color: BS.slate6, whiteSpace: "pre-wrap", fontFamily: "'Geist Mono', monospace" }}>
                  {BULK_SEND_PASTE_EXAMPLE}
                </pre>
              </div>
              <label htmlFor="bs-paste" className="bs-visually-hidden">Paste recipient rows</label>
              <textarea id="bs-paste" className="bs-textarea" value={pasteText}
                onChange={e => setPasteText(e.target.value)} placeholder="Paste rows here" />
              <div className="bs-row" style={{ gap: 10 }}>
                <button type="button" className="bs-btn bs-btn-primary bs-btn-sm" disabled={busy || !pasteText.trim()}
                  onClick={async () => {
                    setBusy(true);
                    const r = await bulkSendService.parseStructuredPaste(pasteText, ctx);
                    setBusy(false);
                    if (r.ok) setPreview(r.data);
                  }}>Preview Rows</button>
                <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" onClick={() => { setPasteText(""); setPreview(null); }}>Clear</button>
                <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" onClick={() => { setSource(null); setPreview(null); }}>Cancel</button>
              </div>
              {preview && <ImportPreviewPanel preview={preview} busy={busy}
                onConfirm={() => commit(
                  preview.schema.columns.map(c => c.header),
                  preview.previewRows.map(r => preview.schema.columns.map(c => r[String(c.id)] ?? "")),
                  "structured-paste")} />}
            </div>
          )}

          {/* ── Local CSV preview ─────────────────────────────────────── */}
          {source === "local-csv-preview" && (
            <div className="bs-panel bs-stack">
              <SectionHeading title="Local CSV Preview" description={BULK_SEND_CSV_NOTICE} />
              <Notice text={BULK_SEND_CSV_NOTICE} tone={TONES.azure} />
              <div>
                <label htmlFor="bs-file" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: BS.slate7, marginBottom: 6 }}>
                  Choose a .csv, .tsv, or .txt file
                </label>
                <input ref={fileRef} id="bs-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain"
                  className="bs-input" style={{ paddingTop: 9 }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setBusy(true);
                    const r = await bulkSendService.previewLocalCsv(file, ctx);
                    setBusy(false);
                    if (r.ok) setPreview(r.data);
                  }} />
              </div>
              <div className="bs-row" style={{ gap: 10 }}>
                <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
                  onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Clear File</button>
                <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" onClick={() => { setSource(null); setPreview(null); }}>Cancel</button>
              </div>
              {preview && <ImportPreviewPanel preview={preview} busy={busy}
                onConfirm={() => commit(
                  preview.schema.columns.map(c => c.header),
                  preview.previewRows.map(r => preview.schema.columns.map(c => r[String(c.id)] ?? "")),
                  "local-csv-preview",
                  { fileNameDirection: preview.schema.fileNameDirection, fileSizeBytes: preview.schema.fileSizeBytes })} />}
            </div>
          )}

          {/* ── Recipient grid ────────────────────────────────────────── */}
          {batch.rows.length > 0 && (
            // tabIndex -1 so focus can be moved here after a source is applied.
            // Without it, adding recipients from the picker unmounts the source
            // selector and focus falls to <body>.
            <div className="bs-panel bs-stack" ref={rowsPanelRef} tabIndex={-1} style={{ outline: "none" }}>
              <SectionHeading title="Recipient rows"
                description="Row status is derived from the current mappings. Excluding a row is not deletion and never changes a Contact record."
                action={permissions.canEditBatch ? (
                  <div className="bs-row" style={{ gap: 8 }}>
                    <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" disabled={busy || selected.size === 0}
                      onClick={() => confirm({
                        title: `Exclude ${selected.size} ${selected.size === 1 ? "row" : "rows"}?`,
                        body: "Excluded rows stay in the batch for review but cannot create Draft Projections. This does not delete anything.",
                        confirmLabel: "Exclude rows",
                        onConfirm: async () => {
                          const affected = new Set(selected);
                          const r = await bulkSendService.excludeRows(batchId!, [...selected], "Excluded during review.", ctx);
                          if (r.ok) {
                            setBatch(r.data); setSelected(new Set()); announce("Rows excluded.");
                            // The row being edited may have just been excluded.
                            // Leaving the editor open on it would let the user keep
                            // typing into a row that no longer participates.
                            if (editor.state.rowId && affected.has(editor.state.rowId)) editor.close();
                          }
                        },
                      })}>Exclude selected</button>
                    <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" disabled={busy || selected.size === 0}
                      onClick={async () => {
                        const affected = new Set(selected);
                        const r = await bulkSendService.restoreRows(batchId!, [...selected], ctx);
                        if (r.ok) {
                          setBatch(r.data); setSelected(new Set()); announce("Rows restored and revalidated.");
                          if (editor.state.rowId && affected.has(editor.state.rowId)) editor.close();
                        }
                      }}>Restore selected</button>
                  </div>
                ) : undefined} />

              <div className="bs-row" style={{ gap: 10 }}>
                <label htmlFor="bs-rowfilter" style={{ ...GF, fontSize: 13, color: BS.slate6 }}>Show</label>
                <select id="bs-rowfilter" className="bs-select" value={rowFilter}
                  onChange={e => setRowFilter(e.target.value)} style={{ width: "auto", minWidth: 190 }}>
                  <option value="all">All rows ({batch.rows.length})</option>
                  <option value="ready-in-demonstration">Ready ({batch.validation.ready})</option>
                  <option value="warning">Warning ({batch.validation.warning})</option>
                  <option value="incomplete">Incomplete ({batch.validation.incomplete})</option>
                  <option value="duplicate">Duplicate ({batch.validation.duplicate})</option>
                  <option value="excluded">Excluded ({batch.validation.excluded})</option>
                </select>
                {permissions.canEditBatch && (
                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" disabled={busy}
                    onClick={async () => {
                      const r = await bulkSendService.applyBulkCorrection(batchId!,
                        { type: "trim-whitespace", targetRowIds: [] }, ctx);
                      if (r.ok) { setBatch(r.data); announce("Whitespace trimmed on affected rows."); }
                    }}>Trim whitespace</button>
                )}
              </div>

              {canEditRows && emailDuplicateCheckingUnavailable(batch) && (
                <DuplicateCheckNotice />
              )}

              <div className="bs-card bs-scroll-x">
                <table className="bs-table">
                  <caption className="bs-visually-hidden">Recipient rows with status and validation issues.</caption>
                  <thead>
                    <tr>
                      <th scope="col"><span className="bs-visually-hidden">Select</span></th>
                      <th scope="col">#</th>
                      <th scope="col">Status</th>
                      <th scope="col">Source</th>
                      {batch.schema?.columns.slice(0, 4).map(c => (
                        <th key={String(c.id)} scope="col">{c.header}</th>
                      ))}
                      <th scope="col">Issues</th>
                      {canEditRows && <th scope="col"><span className="bs-visually-hidden">Row actions</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const issues = batch.validation.issuesByRow[String(r.id)] ?? [];
                      const rowId = String(r.id);
                      const editingThis = !isMobile && editor.state.rowId === rowId;
                      const overrides = overriddenColumnIds(r, editableColumns);
                      // A projected row cannot be edited once it has produced a
                      // Draft Projection — it stays inspectable, with the reason.
                      const lockedReason = r.projectionId
                        ? "This row already produced a Draft Projection and can no longer be edited."
                        : null;

                      return (
                        <tr key={rowId} style={r.excluded ? { opacity: 0.6 } : undefined}>
                          <td>
                            <label className="bs-visually-hidden" htmlFor={`sel-${r.id}`}>Select row {r.rowNumber}</label>
                            <input id={`sel-${r.id}`} type="checkbox" style={{ width: 18, height: 18 }}
                              checked={selected.has(rowId)}
                              onChange={e => {
                                const next = new Set(selected);
                                if (e.target.checked) next.add(rowId); else next.delete(rowId);
                                setSelected(next);
                              }} />
                          </td>
                          <td>{r.rowNumber}</td>
                          <td>
                            <RowStatusPill status={r.status} />
                            {/* Text, never colour alone, and kept separate from status. */}
                            {overrides.length > 0 && (
                              <span style={{ ...GF, display: "block", fontSize: 11, color: BS.slate5, marginTop: 3 }}>
                                Draft override
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12 }}>{BULK_SEND_SOURCE_LABELS[r.source]}</td>

                          {batch.schema?.columns.slice(0, 4).map(c => {
                            const cid = String(c.id);
                            const col = editableColumns.find(ec => ec.id === cid);
                            if (editingThis && col) {
                              return (
                                <td key={cid} style={{ maxWidth: 220 }}>
                                  <RowField
                                    column={col}
                                    variant="inline"
                                    value={editor.state.values[cid] ?? ""}
                                    error={editor.state.errors[cid] || undefined}
                                    disabled={editor.state.saving}
                                    overridden={overrides.includes(cid)}
                                    onChange={(v) => editor.setField(cid, v)}
                                    onEnterSave={() => void editor.save()}
                                  />
                                </td>
                              );
                            }
                            return (
                              <td key={cid} style={{ overflowWrap: "anywhere", maxWidth: 220 }}>
                                {r.values[cid] || <span style={{ color: BS.slate4 }}>—</span>}
                              </td>
                            );
                          })}

                          <td style={{ maxWidth: 260 }}>
                            {editingThis && editor.state.saveError
                              ? <span role="alert" style={{ ...GF, fontSize: 12, color: BS.errorText, lineHeight: 1.5 }}>{editor.state.saveError}</span>
                              : issues.length === 0
                                ? <span style={{ color: BS.slate4 }}>None</span>
                                : <span style={{ ...GF, fontSize: 12, color: issues.some(i => i.severity === "blocking") ? BS.errorText : BS.warnText, lineHeight: 1.5 }}>
                                    {issues[0].message}{issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}
                                  </span>}
                          </td>

                          {canEditRows && (
                            <td style={{ whiteSpace: "nowrap" }}>
                              {editingThis ? (
                                <span className="bs-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                                  <button type="button" className="bs-btn bs-btn-primary bs-btn-sm"
                                    disabled={editor.state.saving}
                                    onClick={() => void editor.save()}>
                                    {editor.state.saving ? "Saving…" : "Save row"}
                                  </button>
                                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                                    disabled={editor.state.saving}
                                    onClick={editor.requestClose}>Cancel</button>
                                </span>
                              ) : (
                                <span className="bs-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                                    disabled={busy || !!lockedReason}
                                    aria-disabled={busy || !!lockedReason}
                                    title={lockedReason ?? undefined}
                                    aria-label={`Edit recipient row ${r.rowNumber}`}
                                    onClick={() => editor.requestOpen(r)}>
                                    <Pencil size={13} aria-hidden /> Edit
                                  </button>
                                  {overrides.length > 0 && !lockedReason && (
                                    <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
                                      disabled={busy}
                                      aria-label={`Revert row ${r.rowNumber} to its source values`}
                                      onClick={() => confirm({
                                        title: "Revert this row?",
                                        body: "The row returns to the values it was created with. Your edits to this row are discarded. The source record is not changed.",
                                        confirmLabel: "Revert row",
                                        onConfirm: () => void editor.revert(r),
                                      })}>Revert</button>
                                  )}
                                </span>
                              )}
                              {lockedReason && (
                                <span className="bs-visually-hidden">{lockedReason}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bs-row" style={{ gap: 10 }}>
                <Link to={`/app/bulk-send/${batchId}/mapping`} className="bs-btn bs-btn-primary bs-btn-sm">
                  Continue to Mapping <ArrowRight size={15} aria-hidden />
                </Link>
              </div>

              {/* Mobile editing. Only ONE editor variant is ever mounted, so the
                  inline table controls are not focusable behind this sheet. */}
              {isMobile && editor.editingRow && (
                <Sheet
                  title="Edit Recipient"
                  onClose={editor.requestClose}
                  footer={
                    <>
                      <button type="button" className="bs-btn bs-btn-secondary"
                        disabled={editor.state.saving} onClick={editor.requestClose}>Cancel</button>
                      <button type="button" className="bs-btn bs-btn-primary"
                        disabled={editor.state.saving} onClick={() => void editor.save()}>
                        {editor.state.saving ? "Saving…" : "Save row"}
                      </button>
                    </>
                  }
                >
                  <div className="bs-stack">
                    <RowProvenance row={editor.editingRow} />
                    {editor.state.saveError && (
                      <div role="alert" className="bs-card" style={{ padding: 12, background: BS.errorBg, borderColor: BS.errorBorder }}>
                        <p style={{ ...GF, margin: 0, fontSize: 13, color: BS.errorText }}>{editor.state.saveError}</p>
                      </div>
                    )}
                    {editableColumns.map(col => (
                      <RowField
                        key={col.id}
                        column={col}
                        variant="stacked"
                        value={editor.state.values[col.id] ?? ""}
                        error={editor.state.errors[col.id] || undefined}
                        disabled={editor.state.saving}
                        overridden={overriddenColumnIds(editor.editingRow!, editableColumns).includes(col.id)}
                        onChange={(v) => editor.setField(col.id, v)}
                      />
                    ))}
                    {emailDuplicateCheckingUnavailable(batch) && <DuplicateCheckNotice />}
                    <p style={{ ...GF, margin: 0, fontSize: 12, color: BS.slate5, lineHeight: 1.6 }}>
                      Saving updates this recipient row in the current preparation draft.
                      No request, invitation, email, or SMS message is created or sent.
                    </p>
                  </div>
                </Sheet>
              )}
            </div>
          )}
        </BatchShell>
      </AppContent>
      {confirmDialog}
    </div>
  );
}

function ImportPreviewPanel({ preview, busy, onConfirm }: {
  preview: BulkSendImportPreview; busy: boolean; onConfirm: () => void;
}) {
  if (preview.errors.length > 0) {
    return <IssueList issues={preview.errors.map(m => ({ severity: "blocking" as const, message: m }))} />;
  }
  return (
    <div className="bs-stack" style={{ gap: 10 }}>
      <div className="bs-row" style={{ gap: 6 }}>
        <Pill label={`${preview.totalRowsDetected} rows detected`} tone={TONES.neutral} />
        <Pill label={`${preview.schema.columns.length} columns`} tone={TONES.neutral} />
        {preview.schema.detectedDelimiter && (
          <Pill label={`Delimiter: ${preview.schema.detectedDelimiter === "\t" ? "Tab" : preview.schema.detectedDelimiter}`} tone={TONES.neutral} />
        )}
        {preview.schema.fileNameDirection && <Pill label={preview.schema.fileNameDirection} tone={TONES.neutral} />}
        {preview.truncated && <Pill label="Truncated" tone={TONES.warning} />}
        {preview.neutralizedCellCount > 0 && (
          <Pill label={`${preview.neutralizedCellCount} formula-like cells marked as text`} tone={TONES.warning} />
        )}
      </div>

      {preview.schema.parseWarnings.length > 0 && (
        <IssueList issues={preview.schema.parseWarnings.map(m => ({ severity: "warning" as const, message: m }))} />
      )}

      <div className="bs-card bs-scroll-x">
        <table className="bs-table">
          <caption className="bs-visually-hidden">Preview of the first rows. Values are shown as inert text.</caption>
          <thead>
            <tr>{preview.schema.columns.map(c => <th key={String(c.id)} scope="col">{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {preview.previewRows.slice(0, 8).map((r, i) => (
              <tr key={i}>
                {preview.schema.columns.map(c => (
                  <td key={String(c.id)} style={{ overflowWrap: "anywhere", maxWidth: 220 }}>{r[String(c.id)] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="bs-btn bs-btn-primary bs-btn-sm" disabled={busy} onClick={onConfirm}>
        Add {preview.previewRows.length} rows to batch
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING  — /app/bulk-send/:batchId/mapping
// ═══════════════════════════════════════════════════════════════════════════════

export function BulkSendMappingPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { blocked } = useGuards();
  const { batch, setBatch, state, permissions, ctx } = useBatch(batchId);
  const { announce, announcerNode } = useAnnouncer();
  const [busy, setBusy] = useState(false);

  if (blocked) return blocked;
  if (state === "loading") return <LoadingShell label="Loading mapping" title="Bulk Send Mapping" />;
  if (state === "restricted") return <Restricted />;
  if (state === "not-found" || !batch) return <NotFound what="Batch" to="/app/bulk-send" label="Return to Bulk Send" />;

  const columns = batch.schema?.columns ?? [];
  const editable = permissions.canMapFields;

  const setRole = async (mappingId: string, field: BulkSendRoleField, columnId: string) => {
    const next = batch.roleMappings.map(m => m.id !== mappingId ? m : {
      ...m,
      columnByField: { ...m.columnByField, [field]: columnId ? (columnId as never) : null },
      confidence: { ...m.confidence, [field]: null },
    });
    setBusy(true);
    const r = await bulkSendService.updateRoleMappings(batchId!, next, ctx);
    setBusy(false);
    if (r.ok) { setBatch(r.data); announce("Role mapping updated."); }
  };

  const setVariable = async (mappingId: string, columnId: string, constant: string | null) => {
    const next = batch.variableMappings.map(m => m.id !== mappingId ? m : {
      ...m,
      columnId: columnId ? (columnId as never) : null,
      constantValue: constant,
      confidence: null,
    });
    setBusy(true);
    const r = await bulkSendService.updateVariableMappings(batchId!, next, ctx);
    setBusy(false);
    if (r.ok) { setBatch(r.data); announce("Variable mapping updated."); }
  };

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      {announcerNode}
      <PageHeader title="Bulk Send Mapping" />
      <AppContent>
        <BatchShell batchId={batchId!} current="mapping" batch={batch}>
          {columns.length === 0 ? (
            <EmptyState title="No recipient source yet"
              body="Add recipient rows before mapping columns to Template roles and variables."
              actions={<Link to={`/app/bulk-send/${batchId}/recipients`} className="bs-btn bs-btn-primary">Add Recipients</Link>} />
          ) : (
            <>
              <div className="bs-row" style={{ gap: 10 }}>
                {editable && (
                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const r = await bulkSendService.autoSuggestMappings(batchId!, ctx);
                      setBusy(false);
                      if (r.ok) { setBatch(r.data); announce("Suggested mappings applied. Ambiguous matches are marked Requires Review."); }
                    }}>
                    <Wand2 size={15} aria-hidden /> Apply suggested mappings
                  </button>
                )}
                <span style={{ ...GF, fontSize: 12, color: BS.slate5 }}>
                  Suggestions come from a fixed header-alias table. They are deterministic, never automatic, and are not AI.
                </span>
              </div>

              {/* Role mapping */}
              <div className="bs-panel bs-stack">
                <SectionHeading title="Participant roles"
                  description="Every role comes from the Template. Bulk Send cannot invent, merge, or drop a participant role." />
                {batch.roleMappings.map(m => (
                  <div key={String(m.id)} className="bs-card" style={{ padding: 14 }}>
                    <div className="bs-row" style={{ gap: 8, marginBottom: 10 }}>
                      <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: BS.navy }}>{m.placeholderLabel}</span>
                      <Pill label={m.role.replace(/-/g, " ")} tone={TONES.neutral} />
                      {m.required && <Pill label="Required" tone={TONES.azure} />}
                    </div>
                    <div className="bs-stack" style={{ gap: 10 }}>
                      {(Object.keys(BULK_SEND_ROLE_FIELD_LABELS) as BulkSendRoleField[]).map(field => (
                        <div key={field} className="bs-row" style={{ gap: 10, justifyContent: "space-between" }}>
                          <label htmlFor={`rm-${m.id}-${field}`} style={{ ...GF, fontSize: 13, color: BS.slate6, flex: "0 0 190px" }}>
                            {BULK_SEND_ROLE_FIELD_LABELS[field]}
                            {(field === "displayName" || field === "email") && <span aria-hidden style={{ color: BS.errorText }}> *</span>}
                          </label>
                          <div className="bs-row" style={{ gap: 8, flex: 1, justifyContent: "flex-end" }}>
                            {m.confidence[field] && <ConfidencePill c={m.confidence[field]!} />}
                            <select id={`rm-${m.id}-${field}`} className="bs-select" disabled={!editable || busy}
                              value={String(m.columnByField[field] ?? "")}
                              onChange={e => setRole(String(m.id), field, e.target.value)}
                              style={{ width: "auto", minWidth: 200 }}>
                              <option value="">Not mapped</option>
                              {columns.map(c => <option key={String(c.id)} value={String(c.id)}>{c.header}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Variable mapping */}
              <div className="bs-panel bs-stack">
                <SectionHeading title="Template variables"
                  description="Only variables defined by the Template can be mapped. Signature, initials, passwords, tokens, HTML, and expressions are never mappable." />
                <div className="bs-card bs-scroll-x">
                  <table className="bs-table">
                    <caption className="bs-visually-hidden">Template variables and their bound source columns.</caption>
                    <thead>
                      <tr>
                        <th scope="col">Variable</th>
                        <th scope="col">Type</th>
                        <th scope="col">Required</th>
                        <th scope="col">Source column</th>
                        <th scope="col">Constant</th>
                        <th scope="col">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.variableMappings.map(m => (
                        <tr key={String(m.id)}>
                          <td style={{ fontWeight: 600, color: BS.navy }}>{m.label}</td>
                          <td>{m.type.replace(/-/g, " ")}</td>
                          <td>{m.required ? "Required" : "Optional"}</td>
                          <td>
                            <label className="bs-visually-hidden" htmlFor={`vm-${m.id}`}>Source column for {m.label}</label>
                            <select id={`vm-${m.id}`} className="bs-select" disabled={!editable || busy}
                              value={String(m.columnId ?? "")}
                              onChange={e => setVariable(String(m.id), e.target.value, null)}
                              style={{ minWidth: 170 }}>
                              <option value="">Not mapped</option>
                              {columns.map(c => <option key={String(c.id)} value={String(c.id)}>{c.header}</option>)}
                            </select>
                          </td>
                          <td>
                            <label className="bs-visually-hidden" htmlFor={`vc-${m.id}`}>Constant value for {m.label}</label>
                            <input id={`vc-${m.id}`} className="bs-input" disabled={!editable || busy || !!m.columnId}
                              defaultValue={m.constantValue ?? ""} placeholder="Optional constant"
                              onBlur={e => setVariable(String(m.id), "", e.target.value || null)}
                              style={{ minWidth: 150 }} />
                          </td>
                          <td>{m.confidence ? <ConfidencePill c={m.confidence} /> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bs-panel bs-stack">
                <SectionHeading title="Validation" />
                <IssueList issues={[...batch.validation.blockingIssues, ...batch.validation.nonblockingIssues]} />
                <div className="bs-row" style={{ gap: 10 }}>
                  <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const r = await bulkSendService.validateBatchNow(batchId!, ctx);
                      setBusy(false);
                      if (r.ok) { setBatch(r.data); announce("Validation complete."); }
                    }}>Revalidate</button>
                  <Link to={`/app/bulk-send/${batchId}/review`} className="bs-btn bs-btn-primary bs-btn-sm">
                    Continue to Review <ArrowRight size={15} aria-hidden />
                  </Link>
                </div>
              </div>
            </>
          )}
        </BatchShell>
      </AppContent>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW  — /app/bulk-send/:batchId/review
// ═══════════════════════════════════════════════════════════════════════════════

export function BulkSendReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { blocked } = useGuards();
  const { batch, state, permissions, ctx } = useBatch(batchId);
  const { announce, announcerNode } = useAnnouncer();
  const { confirm, confirmDialog } = useBulkSendConfirm();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (blocked) return blocked;
  if (state === "loading") return <LoadingShell label="Loading review" title="Review Bulk Send Batch" />;
  if (state === "restricted") return <Restricted />;
  if (state === "not-found" || !batch) return <NotFound what="Batch" to="/app/bulk-send" label="Return to Bulk Send" />;

  const eligibility = bulkSendService.getEligibility(batch, ctx);
  const previews = bulkSendService.getRepresentativePreviews(batch, null);
  const blockedByIssues = batch.validation.blockingIssues.length > 0;
  const eligibleCount = eligibility.summary.eligibleRowIds.length;

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      {announcerNode}
      <PageHeader title="Review Bulk Send Batch" />
      <AppContent>
        <BatchShell batchId={batchId!} current="review" batch={batch}>
          <Notice text={BULK_SEND_REVIEW_NOTICE} />

          {error && (
            <div role="alert" className="bs-card" style={{ padding: 12, background: TONES.error.bg, borderColor: TONES.error.border }}>
              <p style={{ ...GF, margin: 0, fontSize: 13, color: TONES.error.text }}>{error}</p>
            </div>
          )}

          <div className="bs-row" style={{ gap: 10 }}>
            <CountChip label="Eligible" value={eligibility.summary.eligible} tone={TONES.success} />
            <CountChip label="With warning" value={eligibility.summary.withWarning} tone={TONES.warning} />
            <CountChip label="Ineligible" value={eligibility.summary.ineligible} tone={TONES.error} />
            <CountChip label="Excluded" value={eligibility.summary.excluded} tone={TONES.muted} />
            <CountChip label="Restricted" value={eligibility.summary.restricted} tone={TONES.error} />
          </div>

          {/* Representative previews */}
          <div className="bs-panel bs-stack">
            <SectionHeading title="Representative previews"
              description="One row at a time. No other row's values are shown, and no signature, initials, or recipient field value ever appears." />
            {previews.filter(p => p.available).slice(0, 2).map(p => (
              <div key={p.kind} className="bs-card" style={{ padding: 14 }}>
                <div className="bs-row" style={{ gap: 6, marginBottom: 10 }}>
                  <Pill label={p.kind === "first-ready" ? "First ready row" : p.kind === "first-warning" ? "First warning row" : "Multi-participant row"} tone={TONES.azure} />
                </div>
                <p style={{ ...GF, margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: BS.navy, overflowWrap: "anywhere" }}>
                  {p.requestTitle}
                </p>
                <dl style={{ ...GF, margin: 0, fontSize: 12, color: BS.slate6, lineHeight: 1.8 }}>
                  <div><dt style={{ display: "inline" }}>Template: </dt><dd style={{ display: "inline", margin: 0 }}>{p.templateName}</dd></div>
                  <div><dt style={{ display: "inline" }}>Routing: </dt><dd style={{ display: "inline", margin: 0 }}>{p.routingSummary}</dd></div>
                  <div><dt style={{ display: "inline" }}>Authentication: </dt><dd style={{ display: "inline", margin: 0 }}>{p.authDirection}</dd></div>
                  <div><dt style={{ display: "inline" }}>Consent: </dt><dd style={{ display: "inline", margin: 0 }}>{p.consentDirection}</dd></div>
                </dl>
                <p style={{ ...GF, margin: "10px 0 4px", fontSize: 12, fontWeight: 700, color: BS.slate6 }}>Participants</p>
                <ul style={{ margin: 0, paddingLeft: 18, ...GF, fontSize: 12, color: BS.slate7, lineHeight: 1.7 }}>
                  {p.participants.map((pt, i) => (
                    <li key={i}>{pt.displayName} — {pt.placeholderLabel} ({pt.role.replace(/-/g, " ")})</li>
                  ))}
                </ul>
                {p.warnings.length > 0 && (
                  <p style={{ ...GF, margin: "10px 0 0", fontSize: 12, color: BS.warnText }}>{p.warnings[0]}</p>
                )}
                <div className="bs-row" style={{ gap: 6, marginTop: 10 }}>
                  {p.defaultSources.map(s => <SourcePill key={s.label} source={s.source} />)}
                </div>
              </div>
            ))}
          </div>

          <div className="bs-panel bs-stack">
            <SectionHeading title="Validation" />
            <IssueList issues={[...batch.validation.blockingIssues, ...batch.validation.nonblockingIssues]} />
          </div>

          <div className="bs-panel bs-stack">
            <SectionHeading title="Create Draft Projections"
              description="Only eligible rows are projected. Excluded and restricted rows stay untouched." />
            <p style={{ ...GF, margin: 0, fontSize: 14, color: BS.slate7 }}>
              <strong>{eligibleCount}</strong> {eligibleCount === 1 ? "row is" : "rows are"} eligible.
            </p>
            <button type="button" className="bs-btn bs-btn-primary"
              disabled={busy || blockedByIssues || eligibleCount === 0 || !permissions.canCreateDraftProjections}
              onClick={() => confirm({
                title: `Create ${eligibleCount} Draft ${eligibleCount === 1 ? "Projection" : "Projections"}?`,
                body: "This creates frontend Draft records in Documents only. No request, invitation, email, SMS message, reminder, or recipient session is created or delivered, and no signature is applied.",
                confirmLabel: "Create Draft Projections",
                onConfirm: async () => {
                  setBusy(true); setError(null);
                  const r = await bulkSendService.createDraftProjections(
                    batchId!, eligibility.summary.eligibleRowIds.map(String), ctx);
                  setBusy(false);
                  if (r.ok) { announce(`${r.data.draftProjectionsCreated} Draft Projections created.`); navigate(`/app/bulk-send/${batchId}/results`); }
                  else setError(r.code === "INCOMPATIBLE_CONFIGURATION"
                    ? "Resolve the blocking issues before creating Draft Projections." : r.message);
                },
              })}>
              {busy ? "Working…" : "Create Draft Projections"}
            </button>
            {blockedByIssues && (
              <p style={{ ...GF, margin: 0, fontSize: 12, color: BS.slate5 }}>
                Resolve the blocking issues above first.
              </p>
            )}
            <Notice text={BULK_SEND_LEGAL_NOTICE} compact />
          </div>
        </BatchShell>
      </AppContent>
      {confirmDialog}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS  — /app/bulk-send/:batchId/results
// ═══════════════════════════════════════════════════════════════════════════════

export function BulkSendResultsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { blocked } = useGuards();
  const { batch, state } = useBatch(batchId);

  if (blocked) return blocked;
  if (state === "loading") return <LoadingShell label="Loading results" title="Bulk Send Draft Projection Results" />;
  if (state === "restricted") return <Restricted />;
  if (state === "not-found" || !batch) return <NotFound what="Batch" to="/app/bulk-send" label="Return to Bulk Send" />;

  const results = batch.results;

  return (
    <div className="bs-root">
      <style>{BULK_SEND_STYLES}</style>
      <PageHeader title="Bulk Send Draft Projection Results" />
      <AppContent>
        <BatchShell batchId={batchId!} current="results" batch={batch}>
          {!results ? (
            <EmptyState title="No Draft Projections yet"
              body="Complete the mapping and review steps, then create Draft Projections for the eligible rows."
              actions={<Link to={`/app/bulk-send/${batchId}/review`} className="bs-btn bs-btn-primary">Continue Batch Setup</Link>} />
          ) : (
            <>
              <Notice text={BULK_SEND_RESULTS_NOTICE} />
              <div className="bs-row" style={{ gap: 10 }}>
                <CountChip label="Total rows" value={results.totalRows} tone={TONES.neutral} />
                <CountChip label="Draft Projections" value={results.draftProjectionsCreated} tone={TONES.success} />
                <CountChip label="Warnings" value={results.warningRows} tone={TONES.warning} />
                <CountChip label="Excluded" value={results.excludedRows} tone={TONES.muted} />
                <CountChip label="Restricted" value={results.restrictedRows} tone={TONES.error} />
                <CountChip label="Failed" value={results.failedProjections} tone={TONES.error} />
              </div>

              <div className="bs-card bs-scroll-x">
                <table className="bs-table">
                  <caption className="bs-visually-hidden">Row-by-row Draft Projection results.</caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Result</th>
                      <th scope="col">Recipient direction</th>
                      <th scope="col">Explanation</th>
                      <th scope="col"><span className="bs-visually-hidden">Open</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map(r => (
                      <tr key={String(r.rowId)}>
                        <td>{r.rowNumber}</td>
                        <td><ResultStatusPill status={r.status} /></td>
                        <td style={{ overflowWrap: "anywhere" }}>{r.recipientDirection}</td>
                        <td style={{ maxWidth: 320, ...GF, fontSize: 12, color: BS.slate6 }}>{r.explanation}</td>
                        <td>
                          {r.documentId
                            ? <Link to={`/app/documents/${r.documentId}`} className="bs-btn bs-btn-secondary bs-btn-sm">Open Draft</Link>
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bs-row" style={{ gap: 10 }}>
                <Link to="/app/documents" className="bs-btn bs-btn-secondary bs-btn-sm">Open Documents</Link>
                <Link to={`/app/bulk-send/${batchId}/recipients`} className="bs-btn bs-btn-secondary bs-btn-sm">Correct and Retry</Link>
                <Link to="/app/bulk-send" className="bs-btn bs-btn-secondary bs-btn-sm">Return to Batches</Link>
              </div>
            </>
          )}
        </BatchShell>
      </AppContent>
    </div>
  );
}
