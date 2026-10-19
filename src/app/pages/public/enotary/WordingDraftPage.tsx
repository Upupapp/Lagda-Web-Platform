// /enotary/wording-draft — the draft wording about WHERE each person was during a notarization,
// laid out so a lawyer can judge it on the live site.
//
// Honest by design: it says in plain words that this is a draft, that it is not yet recorded or printed
// on any certificate, and what is still undecided. The text itself lives in config/enotary-wording.ts.

import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { GF, Notice } from "../../../components/system/design-system";
import {
  CERTIFICATE_LOCATION_SENTENCE, CERTIFICATE_LOCATION_UNCONFIRMED, LOCATION_CONSENT_CHECKBOX, LOCATION_CONSENT_TEXT,
  WORDING_REVIEW_QUESTIONS, WORDING_STATUS,
} from "../../../config/enotary-wording";
import { E, EnotaryFrame, EnotaryHeading } from "../../platform/enotary/EnotaryChrome";
import { Panel, PanelTitle, bodyText } from "../../platform/enotary/onramp-ui";

const quote = {
  ...GF, margin: "0 0 10px", padding: "14px 16px", borderLeft: `4px solid ${E.sky}`, background: "#FFFFFF",
  border: `1px solid ${E.line}`, borderRadius: 10, fontSize: 15, lineHeight: 1.65, color: E.ink,
} as const;

export function WordingDraftPage() {
  return (
    <EnotaryFrame tone="neutral" eyebrow="LAGDA eNotary" description="Wording about where each person was during a notarization.">
      <EnotaryHeading>Wording for review</EnotaryHeading>
      <div data-testid="wording-status">
        <Notice icon={AlertTriangle} tone="warn">
          <strong>{WORDING_STATUS}.</strong> None of this wording is recorded, shown to clients or printed on a certificate yet.
          It is displayed here so it can be judged, and it can be changed at any time. Words in [square brackets] are filled in by the system or are still to be decided.
        </Notice>
      </div>

      <Panel tone="sky" testId="wording-certificate">
        <PanelTitle><FileText size={16} aria-hidden style={{ verticalAlign: "-2px" }} /> 1. The sentence on the notarization certificate</PanelTitle>
        <p style={{ ...bodyText, fontSize: 13.5 }}>This line would appear on the certificate page and in the audit trail.</p>
        <p data-testid="wording-sentence" style={quote}>{CERTIFICATE_LOCATION_SENTENCE}</p>
        <p style={{ ...bodyText, fontSize: 13.5, margin: "8px 0 6px" }}>If a person is outside the Philippines, or the location cannot be found, it would say instead:</p>
        <p data-testid="wording-unconfirmed" style={quote}>{CERTIFICATE_LOCATION_UNCONFIRMED}</p>
        <p style={{ ...bodyText, fontSize: 13, color: E.quiet, margin: 0 }}>
          How it would read, for example: &ldquo;connected from Naga City, Camarines Sur, Philippines&rdquo;. The city comes from the network (IP) address, so it is approximate, and a VPN can change it.
        </p>
      </Panel>

      <Panel tone="sky" testId="wording-consent">
        <PanelTitle><ShieldCheck size={16} aria-hidden style={{ verticalAlign: "-2px" }} /> 2. What each person reads and agrees to before a session</PanelTitle>
        <p style={{ ...bodyText, fontSize: 13.5 }}>Shown to the client and the notary before the room opens.</p>
        <p data-testid="wording-consent-text" style={quote}>{LOCATION_CONSENT_TEXT}</p>
        <label style={{ ...GF, display: "flex", gap: 10, alignItems: "center", minHeight: 44, fontSize: 15, color: E.ink }}>
          <input type="checkbox" disabled aria-label="Example only: not active" style={{ width: 18, height: 18 }} /> {LOCATION_CONSENT_CHECKBOX}
        </label>
        <p style={{ ...bodyText, fontSize: 12.5, color: E.quiet, margin: "6px 0 0" }}>The tick box above is an example and does nothing.</p>
      </Panel>

      <Panel testId="wording-questions">
        <PanelTitle>3. What we ask the reviewer to settle</PanelTitle>
        <ol style={{ ...bodyText, paddingLeft: 20, margin: 0 }}>
          {WORDING_REVIEW_QUESTIONS.map(item => (
            <li key={item.id} style={{ margin: "0 0 12px" }}>
              <strong>{item.question}</strong>
              <span style={{ display: "block", color: E.quiet, fontSize: 13.5 }}>{item.note}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <p style={{ ...bodyText, fontSize: 12.5, color: E.quiet, marginTop: 18 }}>
        LAGDA eNotary is a pilot and is subject to Supreme Court accreditation and applicable rules. This page is not legal advice and does not describe a feature that is switched on.
      </p>
    </EnotaryFrame>
  );
}
