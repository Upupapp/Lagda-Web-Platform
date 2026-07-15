// Step 7 of 7: Place Fields — deliberate handoff placeholder for Command 19.
// This screen acknowledges arrival at the field-placement stage,
// explains what will be built, and provides navigation back to Review.
// Command 19 will replace this file with the actual field editor.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.

import React, { useEffect } from "react";
import { Link } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

export function FieldsHandoff() {
  const { setStep, draft } = usePrepare();

  useEffect(() => { setStep("fields"); }, [setStep]);

  const title      = draft?.details.title ?? "Untitled Document";
  const fileCount  = draft?.files.filter(f => f.fileState === "ready").length ?? 0;
  const paxCount   = draft?.participants.length ?? 0;

  return (
    <div style={{ ...GF, maxWidth: 560, textAlign: "center", padding: "60px 24px 40px" }}>
      {/* Icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: AZURE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          margin: "0 auto 24px",
        }}
        aria-hidden="true"
      >
        ✏️
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: "0 0 12px" }}>
        Place Fields
      </h1>

      <p style={{ fontSize: 14, color: SILVER, lineHeight: 1.7, margin: "0 0 8px" }}>
        <strong style={{ color: NAVY }}>{title}</strong>
      </p>

      <p style={{ fontSize: 13, color: SILVER, lineHeight: 1.7, margin: "0 0 32px" }}>
        {fileCount} file{fileCount !== 1 ? "s" : ""} · {paxCount} participant{paxCount !== 1 ? "s" : ""}
      </p>

      {/* Handoff notice */}
      <div
        style={{
          padding: "24px 28px",
          borderRadius: 12,
          background: "#F5F7FA",
          border: "1px solid #E3E8EF",
          textAlign: "left",
          marginBottom: 32,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
          Field placement — Command 19
        </div>
        <p style={{ fontSize: 13, color: "#4B5E70", lineHeight: 1.7, margin: "0 0 12px" }}>
          This screen will become the interactive field-placement canvas where signers, approvers,
          and other participants are assigned specific fields (signature, initials, date, text,
          checkbox) to complete on each page of each document.
        </p>
        <p style={{ fontSize: 13, color: "#4B5E70", lineHeight: 1.7, margin: 0 }}>
          Command 19 will build this experience. Your preparation draft — including files,
          participants, routing, and settings — has been marked ready and is available for
          the field editor.
        </p>
      </div>

      {/* Capability preview */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: 12,
          background: "#EBF4FC",
          border: `1px solid #C8E1F5`,
          textAlign: "left",
          marginBottom: 32,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: AZURE, marginBottom: 12 }}>
          What field placement will include
        </div>
        <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 13, color: "#4B5E70", lineHeight: 1.9 }}>
          <li>Document page viewer (PDF pages rendered as static images)</li>
          <li>Drag-and-drop field placement on any page</li>
          <li>Field types: signature, initials, date, full name, text, checkbox</li>
          <li>Participant assignment per field</li>
          <li>Required vs. optional field flags</li>
          <li>Field resize and alignment guides</li>
          <li>Multi-document navigation</li>
          <li>Field summary and Send Transaction CTA</li>
        </ul>
      </div>

      {/* Legal notice */}
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 8,
          background: "#F5F7FA",
          border: "1px solid #E3E8EF",
          textAlign: "left",
          marginBottom: 32,
          fontSize: 12,
          color: SILVER,
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: "#4B5E70" }}>Frontend demonstration</strong>
        <br />
        No documents have been uploaded. No invitations have been sent. No transaction records
        exist outside this browser session. This demonstration is not a legally operative
        eSignature transaction.
      </div>

      <Link
        to="/app/prepare/review"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 24px",
          borderRadius: 8,
          border: `1px solid ${AZURE}`,
          background: "#FFFFFF",
          color: AZURE,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        ← Back to Review
      </Link>
    </div>
  );
}
