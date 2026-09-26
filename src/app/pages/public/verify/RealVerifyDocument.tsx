// The REAL public verification pages. Rendered instead of the demonstration
// body whenever `USE_REAL_BACKEND` is on — see VerifyDocument.tsx / VerifyRecord.tsx.
//
//   /verify                    ID entry → record summary + QR → "Open verification page"
//   /verify/:verificationId    record summary → email → 6-digit code → signed document,
//                              participants and details; plus "Check a file".
//
// Seeing that a transaction completed is not the same claim as being a
// participant on it; the document itself is only fetched after the emailed
// code is exchanged for a short-lived, in-memory access token.

import { Link, useParams, useSearchParams } from "react-router";
import { VerificationSearch, VerificationRecordView } from "../../../components/verification/VerificationFlow";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";
const NAVY = "#07111F";

function PublicVerifyShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#F8FAFB", minHeight: "100vh", color: NAVY, ...GF, overflowX: "hidden" }}>
      <section style={{ padding: "clamp(40px, 8vw, 64px) 16px clamp(28px, 5vw, 40px)", background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <p style={{ color: AZURE, ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", margin: "0 0 12px" }}>DOCUMENT VERIFICATION</p>
          <h1 style={{ color: NAVY, ...GF, fontSize: "clamp(26px, 4.5vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            {title}
          </h1>
          <p style={{ color: "#334155", ...GF, fontSize: 15, lineHeight: 1.7, maxWidth: 620, margin: 0 }}>{intro}</p>
        </div>
      </section>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 16px 64px", boxSizing: "border-box" }}>
        {children}
        <div style={{ marginTop: 28, display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Link to="/resources/document-verification-guide" style={{ color: AZURE, ...GF, fontSize: 13, textDecoration: "none" }}>Read the Verification Guide →</Link>
          <Link to="/contact?category=verification" style={{ color: "#64748B", ...GF, fontSize: 13, textDecoration: "none" }}>Contact Support</Link>
        </div>
      </div>
    </div>
  );
}

export function RealVerifyDocument() {
  const [params] = useSearchParams();
  return (
    <PublicVerifyShell title="Verify a LAGDA Document"
      intro="Enter the Verification ID printed on a completed LAGDA document, or scan its QR code. Participants can then open the signed document by confirming their email.">
      <VerificationSearch basePath="/verify" initialId={params.get("id") ?? ""} />
    </PublicVerifyShell>
  );
}

export function RealVerifyRecord() {
  const { verificationId = "" } = useParams();
  return (
    <PublicVerifyShell title="Verification record"
      intro="The record below is LAGDA’s completion record for this Verification ID. Participants can confirm their email to view and download the signed document.">
      <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
        <Link to="/verify" style={{ color: AZURE, ...GF, fontSize: 13, textDecoration: "none" }}>← Verify another document</Link>
      </nav>
      <VerificationRecordView key={verificationId} verificationId={verificationId} basePath="/verify" />
    </PublicVerifyShell>
  );
}
