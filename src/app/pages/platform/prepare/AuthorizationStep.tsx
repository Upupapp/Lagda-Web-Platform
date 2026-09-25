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

import { useNavigate } from "react-router";
import {
  BadgeCheck, Mail, Users, FileText, AlertTriangle, ArrowLeft,
} from "lucide-react";
import { usePrepare } from "../../../context/PrepareContext";
import { useProcessing } from "../../../services/processing.service";
import { StepBanner } from "../../../components/prepare/StepBanner";

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
  const navigate = useNavigate();
  const { draft } = usePrepare();
  const { run: runProcessing } = useProcessing();

  // Everyone who ACTS — approvers and reviewers are emailed a link too, and
  // listing only signers told the sender fewer people would be contacted
  // than actually are. Viewers and copy recipients do not act on it.
  const actors = draft?.participants.filter(p => ACTING_ROLES.has(p.role)) ?? [];
  const title = draft?.details.title?.trim();

  const authorize = () => {
    void (async () => {
      await runProcessing(
        {
          message: "Authorizing",
          detail: "Preparing your document for sending.",
          // Long enough to read. A confirmation that flickers past leaves
          // somebody unsure whether they pressed the button at all.
          minDuration: 1200,
        },
        // Nothing to await: the real send happens on the confirmation page,
        // which owns the idempotency keys and the failure handling. This
        // step's only job is the deliberate pause and the navigation.
        async () => Promise.resolve(true),
      );
      void navigate("/app/prepare/confirmation");
    })();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(14px, 3.5vw, 20px)" }}>
      <StepBanner
        icon={BadgeCheck}
        eyebrow="Step 8 of 8"
        title="Authorization"
        description="The last step before anyone is emailed. Check what is about to be sent, then authorize it."
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

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <button
          type="button"
          onClick={() => { void navigate("/app/prepare/review"); }}
          style={{
            ...GF, display: "inline-flex", alignItems: "center", gap: 7,
            minHeight: 42, padding: "0 16px", borderRadius: 9,
            border: "1px solid #D1D9E0", background: "#FFFFFF",
            color: NAVY, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
          }}
        >
          <ArrowLeft size={15} aria-hidden /> Back to Review
        </button>

        <button
          type="button"
          onClick={authorize}
          style={{
            ...GF, display: "inline-flex", alignItems: "center", gap: 8,
            minHeight: 46, padding: "0 22px", borderRadius: 9, border: "none",
            background: AZURE, color: "#FFFFFF",
            fontSize: 14.5, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,120,212,0.28)",
          }}
        >
          <BadgeCheck size={17} aria-hidden /> Authorize
        </button>
      </div>
    </div>
  );
}
