// Saved Views — /app/reports/saved
// Command 29. In-memory saved views. No localStorage. No eNotary. No Burgundy.

import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import { BookMarked, PlusCircle } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { reportingService } from "../../../services/mock/reporting.service";
import type { ReportFamily } from "../../../models/reports";
import { REPORT_FAMILY_LABELS } from "../../../models/reports";
import {
  GF, NAVY, AZURE, SLATE, SILVER,
  ReportFamilyNav, ReportsRestricted, ReportPageHeader,
  SavedViewCard, AnnotationEditor, SectionDivider, SectionCard,
  availableReportFamilies,
} from "./ReportsShared";

// Built from the same availability-gated list the family nav and Overview use, so
// a family can never be saveable-but-unfilterable. A view saved from the Bulk
// Send Preparation report was previously reachable under "All Families" with no
// way to filter to it.
const ALL_FAMILIES: (ReportFamily | "all")[] = ["all", ...availableReportFamilies()];

export function ReportsSavedPage() {
  const { hasPermission, hasFlag } = usePlatform();
  const [params, setParams] = useSearchParams();
  const [views, setViews]   = useState(() => reportingService.getSavedViews());
  const [toast, setToast]   = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal,  setRenameVal]  = useState("");
  const [annotatingId, setAnnotatingId] = useState<string | null>(null);

  const canView = hasPermission("view_reports") && hasFlag("reportsEnabled");

  const familyFilter = (params.get("family") as ReportFamily | "all") ?? "all";

  function refresh() { setViews(reportingService.getSavedViews()); }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  function handleRename(id: string) {
    setRenamingId(id);
    setRenameVal(views.find(v => v.id === id)?.name ?? "");
  }
  function submitRename() {
    if (!renamingId) return;
    const res = reportingService.renameSavedView(renamingId as any, renameVal);
    if (res.ok) { showToast("View renamed."); refresh(); }
    setRenamingId(null);
  }

  function handleDuplicate(id: string) {
    const res = reportingService.duplicateSavedView(id as any);
    if (res.ok) { showToast("View duplicated."); refresh(); }
  }
  function handleSetDefault(id: string) {
    const res = reportingService.setDefaultSavedView(id as any);
    if (res.ok) { showToast("Default view updated."); refresh(); }
  }
  function handleArchive(id: string) {
    const res = reportingService.archiveSavedView(id as any);
    if (res.ok) { showToast("View archived."); refresh(); }
  }
  function handleRestore(id: string) {
    const res = reportingService.restoreSavedView(id as any);
    if (res.ok) { showToast("View restored."); refresh(); }
  }
  function handleRemove(id: string) {
    const res = reportingService.removeSavedViewDemonstration(id as any);
    if (res.ok) { showToast("View removed from demonstration."); refresh(); }
  }
  function handleAnnotate(id: string) {
    setAnnotatingId(id);
  }
  function saveAnnotation(text: string) {
    if (!annotatingId) return;
    reportingService.updateAnnotation(annotatingId as any, text);
    refresh();
    showToast("Annotation saved.");
  }

  const activeViews   = useMemo(() => views.filter(v => v.status === "active"  && (familyFilter === "all" || v.family === familyFilter)), [views, familyFilter]);
  const archivedViews = useMemo(() => views.filter(v => v.status === "archived" && (familyFilter === "all" || v.family === familyFilter)), [views, familyFilter]);

  if (!canView) return <ReportsRestricted />;

  const annotatingView = annotatingId ? views.find(v => v.id === annotatingId) : null;

  return (
    <main aria-label="Saved report views" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <ReportPageHeader
        title="Saved Views"
        description="Saved report configurations. Views are stored in memory for this demonstration — they reset on page reload."
      />

      <ReportFamilyNav current="saved" />

      {toast ? (
        <div role="status" aria-live="polite" style={{ ...GF, fontSize: 12, background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, padding: "7px 12px", marginBottom: 12 }}>
          {toast}
        </div>
      ) : null}

      {/* Annotation editor */}
      {annotatingView ? (
        <AnnotationEditor
          current={annotatingView.annotation ?? ""}
          onSave={saveAnnotation}
          onClose={() => setAnnotatingId(null)}
        />
      ) : null}

      {/* Rename inline */}
      {renamingId ? (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <label htmlFor="rename-input" style={{ ...GF, fontSize: 12, color: SLATE, fontWeight: 500, display: "block", marginBottom: 4 }}>Rename view</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="rename-input"
              type="text"
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              maxLength={120}
              style={{ ...GF, fontSize: 13, border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 10px", flex: 1, outline: "none" }}
              autoFocus
            />
            <button onClick={submitRename} style={{ ...GF, fontSize: 13, background: AZURE, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>Save</button>
            <button onClick={() => setRenamingId(null)} style={{ ...GF, fontSize: 13, background: "#F8FAFC", color: SLATE, border: "1px solid #E2E8F0", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : null}

      {/* Family filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }} role="group" aria-label="Filter by report family">
        {ALL_FAMILIES.map(f => (
          <button
            key={f}
            onClick={() => setParams(f === "all" ? {} : { family: f })}
            aria-pressed={familyFilter === f}
            style={{
              ...GF, fontSize: 12, border: "1px solid", borderRadius: 5,
              padding: "3px 10px", cursor: "pointer",
              background: familyFilter === f ? NAVY : "#F8FAFC",
              color:      familyFilter === f ? "#fff" : SLATE,
              borderColor:familyFilter === f ? NAVY : "#E2E8F0",
            }}
          >
            {f === "all" ? "All Families" : REPORT_FAMILY_LABELS[f as ReportFamily]}
          </button>
        ))}
      </div>

      {/* Create note */}
      <div style={{ ...GF, fontSize: 12, color: SLATE, background: "#F8FAFC", borderRadius: 6, padding: "8px 12px", marginBottom: 16, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 6 }}>
        <PlusCircle size={13} style={{ color: AZURE }} aria-hidden />
        Open a report family and use the Save View action to create a new saved view.
      </div>

      {/* Active views */}
      <SectionDivider label={`Active Views (${activeViews.length})`} />
      {activeViews.length === 0 ? (
        <div style={{ ...GF, fontSize: 13, color: SILVER, padding: "16px 0" }}>
          No active saved views for the selected family filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {activeViews.map(v => (
            <SavedViewCard
              key={v.id}
              view={v}
              onRename={handleRename}
              onDuplicate={handleDuplicate}
              onSetDefault={handleSetDefault}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onRemove={handleRemove}
              onAnnotate={handleAnnotate}
            />
          ))}
        </div>
      )}

      {/* Archived views */}
      {archivedViews.length > 0 ? (
        <>
          <SectionDivider label={`Archived Views (${archivedViews.length})`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {archivedViews.map(v => (
              <SavedViewCard
                key={v.id}
                view={v}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onSetDefault={handleSetDefault}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onRemove={handleRemove}
                onAnnotate={handleAnnotate}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Demo note */}
      <SectionCard>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <BookMarked size={14} style={{ color: SILVER, flexShrink: 0, marginTop: 1 }} aria-hidden />
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            Saved views in this demonstration are stored in module-level memory and reset on page reload.
            Production saved views would persist to the user's account via backend API.
          </p>
        </div>
      </SectionCard>
    </main>
  );
}
