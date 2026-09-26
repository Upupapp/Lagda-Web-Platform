// The REAL in-app verification pages, inside the platform layout.
//
//   /app/verify                  ID entry → record summary + QR → open the record
//   /app/verify/:verificationId  record summary → member access (automatic) or
//                                email + code → signed document; "Check a file"
//
// When signed in, the record page first asks the backend whether the account's
// verified email is a participant (POST /verifications/:id/member-access) and
// unlocks immediately if so. Otherwise it falls back to the same emailed-code
// flow the public page uses.
//
// "Verify one of my documents" lists this workspace's sealed documents by
// their `verificationId`.

import { Navigate, Link, useParams, useSearchParams } from "react-router";
import { usePlatform } from "../../../context/PlatformContext";
import { PageHeader } from "../../../components/platform";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { VerificationSearch, VerificationRecordView } from "../../../components/verification/VerificationFlow";
import { MyVerifiableDocuments } from "./MyVerifiableDocuments";

const GF = { fontFamily: "'Geist', sans-serif" };

function NoPermission() {
  return (
    <div role="alert" style={{ margin: 24, padding: 16, border: "1px solid #E2E8F0", borderRadius: 10, background: "#FFFFFF", color: "#334155", ...GF, fontSize: 14 }}>
      Your role in this workspace does not include document verification. Ask a workspace administrator for access, or use the public page at <Link to="/verify" style={{ color: "#0078D4" }}>/verify</Link>.
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "20px clamp(12px, 3vw, 24px) 48px", maxWidth: 960, boxSizing: "border-box", minWidth: 0 }}>
      {children}
    </div>
  );
}

export function RealPlatformVerify() {
  const { hasPermission, currentWorkspace } = usePlatform();
  const [params] = useSearchParams();
  const initialId = params.get("verificationId") ?? params.get("id") ?? "";
  return (
    <div style={{ minWidth: 0, overflowX: "hidden" }}>
      <PageHeader title="Verify a Document" compact
        description="Look up a completed LAGDA record by Verification ID, view the signed document if you are a participant, or check a file against the sealed original." />
      {hasPermission("verify_documents")
        ? <Body>
            <VerificationSearch basePath="/app/verify" initialId={initialId} />
            {currentWorkspace && <MyVerifiableDocuments workspaceId={currentWorkspace.id} />}
          </Body>
        : <NoPermission />}
    </div>
  );
}

export function RealPlatformVerifyRecord() {
  const { hasPermission } = usePlatform();
  const { verificationId = "" } = useParams();
  return (
    <div style={{ minWidth: 0, overflowX: "hidden" }}>
      <PageHeader title="Verification record" compact
        breadcrumbs={[{ label: "Verify", to: "/app/verify" }, { label: verificationId }]}
        description="LAGDA’s completion record for this Verification ID." />
      {hasPermission("verify_documents")
        ? <Body><VerificationRecordView key={verificationId} verificationId={verificationId} basePath="/app/verify" memberAccess /></Body>
        : <NoPermission />}
    </div>
  );
}

/** /app/verify/:verificationId — demo mode has no per-record page; prefill the demo search instead. */
export function VerifyRecordPage() {
  const { verificationId = "" } = useParams();
  if (USE_REAL_BACKEND) return <RealPlatformVerifyRecord />;
  return <Navigate to={`/app/verify?verificationId=${encodeURIComponent(verificationId)}`} replace />;
}
