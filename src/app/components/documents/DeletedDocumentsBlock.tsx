// The "Deleted Document" notices for one of a person's lists.
//
// When an owner permanently deletes a document, each person who had access
// keeps a notice where the document used to be: under Shared with me, Signed
// by me, the list it was waiting in, or Sent. This block shows the notices
// that belong to the list it is placed in, opens the owner's notice, and lets
// the person remove one from their own list.

import { useCallback, useEffect, useState } from "react";
import { DeletedDocumentCard, DeletionDetailsPanel, type DeletedDocumentInfo } from "./DeletedDocument";
import { useDocumentLifecycle } from "./useDocumentLifecycle";
import {
  apiAssetUrl, documentLifecycleService, type DeletedDocumentRecord, type DeletedOrigin,
} from "../../services/real/document-lifecycle.service";
import { USE_REAL_BACKEND } from "../../services/backend-flag";

const DEFAULT_COLOR = "#0078D4";

export function toDeletedInfo(record: DeletedDocumentRecord): DeletedDocumentInfo {
  return {
    id: record.id,
    title: record.documentTitle,
    deletedAt: record.deletedAt,
    reason: record.reason,
    owner: { name: record.deletedBy.displayName, avatarUrl: apiAssetUrl(record.deletedBy.avatarUrl) },
    workspace: {
      name: record.workspace.name,
      primaryColor: record.workspace.primaryColor ?? DEFAULT_COLOR,
      logoUrl: apiAssetUrl(record.workspace.logo?.url) ?? null,
    },
  };
}

export function DeletedDocumentsBlock({ origins, heading, openId, onOpened }: {
  origins: readonly DeletedOrigin[];
  /** Shown above the notices when there are any. */
  heading?: string;
  /** A notice to open at once (from a notification's link). */
  openId?: string | null;
  onOpened?: () => void;
}) {
  const [records, setRecords] = useState<DeletedDocumentRecord[]>([]);
  const [details, setDetails] = useState<DeletedDocumentInfo | null>(null);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    void documentLifecycleService.deletedDocuments()
      .then(setRecords)
      // The notices are an addition to the list: a failure here must not
      // replace the list with an error.
      .catch(() => { setRecords([]); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const lifecycle = useDocumentLifecycle({ freePlan: false, onDone: load });
  const mine = records.filter(r => origins.includes(r.origin));

  useEffect(() => {
    if (openId == null) return;
    const found = records.find(r => r.id === openId);
    if (found) { setDetails(toDeletedInfo(found)); onOpened?.(); }
  }, [openId, records, onOpened]);

  if (mine.length === 0) return <>{lifecycle.element}</>;
  return (
    <section aria-label={heading ?? "Deleted documents"} data-testid="deleted-documents" style={{ marginTop: 20 }}>
      {heading !== undefined && (
        <h3 style={{ fontFamily: "'Geist', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748B", margin: "0 0 10px" }}>
          {heading}
        </h3>
      )}
      <ul className="doc-deleted-grid" style={{ margin: 0, padding: 0 }}>
        {mine.map(record => {
          const info = toDeletedInfo(record);
          return (
            <DeletedDocumentCard key={record.id} info={info}
              onViewDetails={() => { setDetails(info); }}
              onRemove={() => { lifecycle.ask({ kind: "remove-notice", id: record.id, title: record.documentTitle }); }} />
          );
        })}
      </ul>
      <style>{`
        .doc-deleted-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 600px) { .doc-deleted-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 1100px) { .doc-deleted-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 1500px) { .doc-deleted-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        .deleted-doc-remove:hover { background: #F8FAFC !important; }
      `}</style>
      {details !== null && <DeletionDetailsPanel info={details} onClose={() => { setDetails(null); }} />}
      {lifecycle.element}
    </section>
  );
}

/**
 * One notice, opened from a link (the bell's "View details"), whichever of
 * the person's lists the document used to be in.
 */
export function DeletedNoticeFromLink({ id, onClose }: { id: string; onClose: () => void }) {
  const [info, setInfo] = useState<DeletedDocumentInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    void documentLifecycleService.deletedDocuments()
      .then(records => {
        if (cancelled) return;
        const found = records.find(r => r.id === id);
        // Already removed from their list: nothing to show.
        if (found) setInfo(toDeletedInfo(found)); else onClose();
      })
      .catch(() => { if (!cancelled) onClose(); });
    return () => { cancelled = true; };
  }, [id, onClose]);
  return info === null ? null : <DeletionDetailsPanel info={info} onClose={onClose} />;
}
