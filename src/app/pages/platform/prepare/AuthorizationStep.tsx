// The last step before anyone is emailed.
//
// ── What this is, and what it is not ──────────────────────────────────────
//
// This is a FRONTEND confirmation. It does not authenticate anybody, it does
// not check a permission the server has not already checked, and it produces
// no credential. The send that follows is authorised exactly as it was
// before — by the session, by the workspace permission, and by the API.
//
// So the page must not imply otherwise. There is no "verifying…" state, no
// tick that suggests something was validated, and no language about identity
// or approval being confirmed. What it actually does is make the sender stop
// for one screen and read what is about to happen, because the next thing
// that happens is real email to real people and there is no recall.
//
// ── Why a whole step for a button ─────────────────────────────────────────
//
// Sending used to be one press at the end of Review, on the same screen as
// the thing being reviewed. A person who has just finished checking a
// document is in "yes, that's right" mode, and the most consequential,
// least reversible action in the product sat directly under that.
//
// A separate step changes the question from "is this correct?" to "do I want
// to send this now?" — which are different questions with different answers.
//
// ── Where the buttons are ─────────────────────────────────────────────────
//
// In the footer, with Previous, as on every other step. This step used to
// carry its own "Back to Review" (the footer's Previous already goes there)
// and its own Authorize. See use-authorize-send.ts.

import {
  BadgeCheck, Mail, Users, FileText, AlertTriangle,
} from "lucide-react";
import { usePrepare } from "../../../context/PrepareContext";
import { StepBanner } from "../../../components/prepare/StepBanner";
import { stepEyebrow } from "../../../models/prepare";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#4B5E70";
const SILVER = "#8A9BAE";
const AZURE = "#0078D4";

function Fact({ icon: Icon, label, value }: {
  icon: typeof Mail; label: string; value: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "12px 0", borderBottom: "1px solid #F0F2F5",
    }}>
      <Icon size={16} aria-hidden style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 11, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ ...GF, fontSize: 13.5, color: NAVY, fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

const ACTING_ROLES: ReadonlySet<string> = new Set([
  "signer", "approver", "reviewer", "acknowledgment-recipient",
]);

const ROLE_NAMES: Record<string, string> = {
  signer: "Signer", approver: "Approver", reviewer: "Reviewer",
  "acknowledgment-recipient": "Acknowledges",
};

export function AuthorizationStep() {
  const { draft } = usePrepare();

  // Everyone who ACTS — approvers and reviewers are emailed a link too, and
  // listing only signers told the sender fewer people would be contacted
  // than actually are. Viewers and copy recipients do not act on it.
  const actors = draft?.participants.filter(p => ACTING_ROLES.has(p.role)) ?? [];
  const title = draft?.details.title?.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(14px, 3.5vw, 20px)" }}>
      <StepBanner
        icon={BadgeCheck}
        eyebrow={stepEyebrow("authorization")}
        title="Authorization"
        description="The last step before anyone is emailed. Check what is about to be sent, then press Authorize below."
      />

      <div style={{
        background: "#FFFFFF", border: "1px solid #E3E8EF", borderRadius: 12,
        padding: "clamp(14px, 4vw, 22px)",
      }}>
        <h2 style={{ ...GF, margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: NAVY }}>
          What you are about to send
        </h2>
        <p style={{ ...GF, margin: "0 0 10px", fontSize: 12.5, color: SLATE, lineHeight: 1.6 }}>
          Read this back. Once you authorize, every participant below is
          emailed a link to sign, approve or review this document, in routing
          order, and it cannot be recalled.
        </p>

        <Fact icon={FileText} label="Document" value={title && title.length > 0 ? title : "Untitled document"} />
        <Fact
          icon={Users}
          label="Participants"
          value={actors.length === 0
            ? "No participants"
            : actors.map(p => `${p.name.trim().length > 0 ? p.name : p.email} (${ROLE_NAMES[p.role] ?? p.role})`).join(", ")}
        />
        <Fact
          icon={Mail}
          label="Will be emailed"
          value={actors.length === 1 ? "1 person" : `${actors.length} people`}
        />
      </div>

      {/* Says plainly that this is a confirmation, not a security check.
          Somebody who reads "Authorization" and assumes their identity is
          being verified has been misled by the word, not informed by it. */}
      <div style={{
        display: "flex", gap: 9, alignItems: "flex-start",
        padding: "12px 14px", borderRadius: 10,
        background: "#FFF8E6", border: "1px solid #EBD9A6",
      }}>
        <AlertTriangle size={15} aria-hidden style={{ color: "#9A6B00", flexShrink: 0, marginTop: 1 }} />
        <p style={{ ...GF, margin: 0, fontSize: 12, color: "#7A5B00", lineHeight: 1.6 }}>
          Authorizing confirms that <strong>you</strong> intend to send this on
          behalf of your organisation. It is a confirmation, not an identity
          check — your account and its permissions are what actually authorise
          the send.
        </p>
      </div>
    </div>
  );
}
