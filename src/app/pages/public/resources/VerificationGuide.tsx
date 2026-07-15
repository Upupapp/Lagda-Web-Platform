import { Link } from "react-router";
import {
  ResourcesPageShell, GuideLayout, GuideHero, GuideSection, GuidePara, GuideCallout, GuideList, EduDisclaimer,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const RESULT_STATES = [
  { state: "Verified",                     color: "#22C55E", desc: "LAGDA found a completed transaction record. Where file comparison was performed, the supplied file matched the recorded document." },
  { state: "Record found — file mismatch", color: "#ef4444", desc: "LAGDA found a transaction record, but the supplied file does not match the file recorded at completion. The document may have been altered." },
  { state: "Incomplete",                   color: "#C9960C", desc: "The transaction exists but has not been completed by all required participants. The document is not yet in a completed state." },
  { state: "Cancelled",                    color: "#475569", desc: "The sender cancelled the transaction before completion." },
  { state: "Voided",                       color: "#475569", desc: "The transaction was voided after completion under applicable terms." },
  { state: "No matching record",           color: "#ef4444", desc: "No LAGDA transaction record matches the supplied Verification ID. The document may not be from LAGDA, or the ID may be incorrect." },
  { state: "Service unavailable",          color: "#64748b", desc: "LAGDA verification is temporarily unavailable. Try again later." },
];

export function VerificationGuide() {
  return (
    <ResourcesPageShell>
      <GuideLayout
        hero={
          <GuideHero
            eyebrow="Document Verification Guide"
            title="How to verify a LAGDA document."
            sub="Document Verification lets anyone confirm the status of a completed LAGDA transaction using a Verification ID or QR code — no account required."
          />
        }
      >
        <GuideSection id="what-is" title="What is Document Verification?">
          <GuidePara>
            Document Verification is a publicly accessible feature that allows anyone — not just LAGDA account holders — to confirm the status of a completed LAGDA transaction. Verification uses a Verification ID or a QR code printed on or embedded in the completed document.
          </GuidePara>
          <GuidePara>
            Verification can tell you whether a transaction record exists, whether the transaction was completed, and — where file comparison is supported — whether the document presented matches the file recorded at completion.
          </GuidePara>
          <GuideCallout
            text="Verification confirms the LAGDA record status. It does not independently confirm every legal requirement for the underlying transaction."
          />
        </GuideSection>

        <GuideSection id="finding-vid" title="Finding the Verification ID and QR code">
          <GuidePara>
            The Verification ID is a unique reference assigned to each completed LAGDA transaction. It appears:
          </GuidePara>
          <GuideList items={[
            "In the completion notification sent to the sender",
            "In the LAGDA workspace under the completed transaction's detail view",
            "On the verification page linked from the completed document where configured",
            "As a QR code embedded in the completed document, if QR placement was configured",
          ]} />
          <GuidePara>
            A Verification ID follows the format: LAGDA-VER-YYYY-NNNNNN (example: LAGDA-VER-2026-004821).
          </GuidePara>
        </GuideSection>

        <GuideSection id="how-to-verify" title="How to verify a document">
          <GuidePara>
            There are three ways to verify a LAGDA document:
          </GuidePara>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "0 0 16px" }}>
            {[
              { num: "01", method: "Enter a Verification ID",  desc: "Go to lagda.io/verify, enter the Verification ID from the document or notification, and submit." },
              { num: "02", method: "Scan the QR code",         desc: "Use your device's camera or a QR code reader to scan the QR code on the completed document. You will be taken directly to the verification result." },
              { num: "03", method: "Use a verification link",  desc: "Follow a direct verification link shared by the sender or embedded in the document." },
            ].map(({ num, method, desc }) => (
              <div key={num} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 18px" }}>
                <span style={{ color: "#0078D4", fontFamily: "'Geist Mono', monospace", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{num}</span>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{method}</p>
                  <p style={{ color: "#64748b", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection id="reading-results" title="How to read the verification result">
          <GuidePara>
            The verification result page shows the transaction status and, where applicable, the file comparison result. The two are separate indicators.
          </GuidePara>
          <GuidePara>
            <strong style={{ color: "white" }}>Record status</strong> reflects the current state of the transaction in LAGDA (completed, cancelled, voided, and so on).
          </GuidePara>
          <GuidePara>
            <strong style={{ color: "white" }}>File-match status</strong> reflects whether a file you supplied for comparison matches the file recorded at completion. A valid record status does not automatically mean the file matches.
          </GuidePara>
          <GuideCallout
            label="IMPORTANT"
            text="A valid transaction record does not automatically mean every file presented by a third party matches the recorded completed document. Always check the file-match result when comparing a specific file."
            color="#C9960C"
          />
        </GuideSection>

        <GuideSection id="result-states" title="Possible result states">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RESULT_STATES.map(({ state, color, desc }) => (
              <div key={state} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "12px 16px" }}>
                <span style={{ color, fontFamily: "'Geist Mono', monospace", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>●</span>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 3px" }}>{state}</p>
                  <p style={{ color: "#64748b", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection id="privacy" title="Privacy protections">
          <GuidePara>
            Public verification shows transaction status and completion date. By default, it does not reveal participant names, document content, signing details, or authentication records. Organization settings may control what is publicly visible.
          </GuidePara>
        </GuideSection>

        <GuideSection id="suspicious" title="Suspicious or mismatched documents">
          <GuidePara>
            If a document verification shows a mismatch or no matching record, treat the document with caution. A mismatch may indicate the document was altered after completion. Contact the original sender or the LAGDA support team if you have concerns.
          </GuidePara>
        </GuideSection>

        <div style={{ marginTop: 40 }}>
          <Link to="/verify" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 8, textDecoration: "none", minHeight: 44 }}>
            Verify a Document →
          </Link>
        </div>

        <EduDisclaimer />
      </GuideLayout>
    </ResourcesPageShell>
  );
}
