// Shared Documents (backend 087).
//
//   /app/shared-documents                 → /app/shared-documents/by-me
//   /app/shared-documents/by-me?section=  approved | pending | rejected
//   /app/shared-documents/with-me?section= accepted | pending | rejected
//
// The backend's notices link to /app/documents/shared-by-me and
// /app/documents/shared-with-me; the router sends both here.

import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { Send, Inbox, Share2 } from "lucide-react";
import { AppContent, EmptyStateLayout, PageHeader } from "../../../components/platform";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { sharingAvailable, SHARED_DOCUMENTS_PATH } from "../../../services/real/document-sharing.service";
import { SharingTabs, SHARING_STYLES, panelId, tabId } from "./SharingTabs";
import { SharedByMeSection, type ByMeSection } from "./SharedByMeSection";
import { SharedWithMeSection, type WithMeSection } from "./SharedWithMeSection";

type Tab = "by-me" | "with-me";
const PREFIX = "shared-documents";

const BY_ME: readonly ByMeSection[] = ["approved", "pending", "rejected"];
const WITH_ME: readonly WithMeSection[] = ["accepted", "pending", "rejected"];

export function SharedDocumentsPage() {
  const { tab } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  usePageMeta();

  if (tab !== "by-me" && tab !== "with-me") return <Navigate to={`${SHARED_DOCUMENTS_PATH}/by-me`} replace />;
  const active: Tab = tab;

  const raw = params.get("section") ?? "";
  const byMeSection: ByMeSection = (BY_ME as readonly string[]).includes(raw) ? raw as ByMeSection : "approved";
  const withMeSection: WithMeSection = (WITH_ME as readonly string[]).includes(raw) ? raw as WithMeSection : "accepted";

  const setSection = (section: string) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("section", section);
      return next;
    }, { replace: true });
  };

  return (
    <div style={{ minWidth: 0, overflowX: "hidden" }}>
      <PageHeader title="Shared Documents"
        description="Completed documents you have shared, the requests to see them, and the documents other people have shared with you." />
      <AppContent style={{ padding: "16px clamp(12px, 3vw, 24px) 40px", boxSizing: "border-box", minWidth: 0 }}>
        <style>{SHARING_STYLES}</style>
        <SharingTabs label="Shared documents" idPrefix={PREFIX} active={active}
          tabs={[
            { id: "by-me", label: "Shared By Me", icon: Send },
            { id: "with-me", label: "Shared With Me", icon: Inbox },
          ]}
          onChange={next => { void navigate(`${SHARED_DOCUMENTS_PATH}/${next}`, { replace: true }); }} />
        <div role="tabpanel" id={panelId(PREFIX, active)} aria-labelledby={tabId(PREFIX, active)} style={{ minWidth: 0 }}>
          {!sharingAvailable() ? (
            <EmptyStateLayout icon={<Share2 size={26} />} title="Sharing needs a connected LAGDA account"
              description="Document sharing works with real completed documents. It is not available in this demonstration." />
          ) : active === "by-me" ? (
            <SharedByMeSection section={byMeSection} onSection={setSection} />
          ) : (
            <SharedWithMeSection section={withMeSection} onSection={setSection} />
          )}
        </div>
      </AppContent>
    </div>
  );
}

/** The backend's notice links (`/app/documents/shared-by-me`, `…/shared-with-me`). */
export function LegacySharedRedirect({ to }: { to: Tab }) {
  const [params] = useSearchParams();
  const section = params.get("section");
  return <Navigate to={`${SHARED_DOCUMENTS_PATH}/${to}${section ? `?section=${encodeURIComponent(section)}` : ""}`} replace />;
}
