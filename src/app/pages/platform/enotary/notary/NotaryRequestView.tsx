// One request on the notary's desk, as its own page: the client's card on the left, what this step of the request
// asks of the notary on the right, the audit trail under both. It follows the attorney-side eNotary pages of
// 13 October ("Angela Ramos asks you to notarize a document", "What happens when you accept").
//
// The actions themselves (take, accept with the fee choice, decline, confirm a payment, start the session) are the
// desk's, handed in as `renderRequest`: this view lays the page out around them.

import type { ReactNode } from "react";
import { Link } from "react-router";
import { ActionButton, GF, Notice } from "../../../../components/system/design-system";
import { E } from "../EnotaryChrome";
import { RequestTrail } from "../RequestTrail";
import { DetailNotes, detailRows } from "../request-details";
import { EnotaryCaseFrame, NOTARY_STEPS, PartyCard, type NotaryStepId, type PartyRow } from "../CaseFrame";
import { OnrampNote, Panel, PanelTitle, bodyText, linkButton } from "../onramp-ui";
import { ExpiryClock, countdownText, expiryLabel, stampLabel } from "../requests/expiry";
import { Clock } from "lucide-react";
import { DESK_CARD_STYLES } from "./DeskCard";
import type { DeskIncoming, DeskRequest } from "../../../../services/real/enotary-invitations.service";

type Banner = { tone: "info" | "warn"; text: string; link: string; label: string } | null;

function stepOf(request: DeskRequest | null): NotaryStepId {
  if (request === null) return "received";
  if (request.status === "accepted") {
    const payment = request.payment ?? null;
    return payment === null || payment.status === "confirmed" || payment.status === "waived" ? "call" : "accept";
  }
  return request.status === "claimed" ? "accept" : "accept";
}

function headingOf(request: DeskRequest | null, incoming: DeskIncoming | null): { title: string; lead: string } {
  if (incoming !== null) return { title: `${incoming.client.name} asks you to notarize a document`, lead: "Take this request to see it among your requests, then accept or decline it." };
  if (request === null) return { title: "This request is not on your desk", lead: "It may have been cancelled, or it belongs to another notary." };
  const client = request.client.name;
  switch (request.status) {
    case "claimed": return { title: `${client} asks you to notarize a document`, lead: "Accept to open a private room with the client. You meet on a video call, and they choose the document with you." };
    case "accepted": return { title: `Start the session with ${client}`, lead: "You and the client meet in a private room on a video call." };
    case "declined": return { title: "You declined this request", lead: "The client was told." };
    case "expired": return { title: "This request ran out of time", lead: "The client can send a new one." };
    case "revoked": return { title: "The client cancelled this request", lead: "Nothing more to do." };
    default: return { title: "This request", lead: "" };
  }
}

const NEXT_STEPS: readonly { title: string; text: string }[] = [
  { title: "A private room opens.", text: "You and the client join it for the video call." },
  { title: "You confirm who the client is,", text: "and they choose the document to be notarized." },
  { title: "You state the notarial act and your fee.", text: "Any fee is paid to you directly, and it does not hold up your seal." },
];

export function NotaryRequestView({ focus, request, incoming, banner, said, problem, confirmDialog, renderRequest, onTake, taking, receivedAt, now }: {
  focus: string; request: DeskRequest | null; incoming: DeskIncoming | null; banner: Banner; said: string | null; problem: string | null;
  confirmDialog: ReactNode; renderRequest: (request: DeskRequest) => ReactNode; onTake: (item: DeskIncoming) => void;
  taking: string | null; receivedAt: number; now: number;
}) {
  const client = request?.client ?? incoming?.client ?? null;
  const heading = headingOf(request, incoming);
  const received = request?.receivedAt ?? incoming?.receivedAt ?? null;
  const rows: PartyRow[] = [
    { label: "Identity", value: <>Verified by LAGDA.<br />You confirm it yourself on the call.</>, testId: "party-identity" },
    ...(received !== null ? [{ label: "Received", value: stampLabel(received) }] : []),
    ...(request?.reference !== undefined && request.reference !== null ? [{ label: "Reference", value: request.reference, mono: true, testId: "party-reference" }] : []),
    ...detailRows(request?.details ?? incoming?.details),
    ...(request?.payment !== null && request?.payment !== undefined
      ? [{ label: "Fee", value: request.payment.status === "waived" ? "No fee" : `PHP ${(request.payment.amountCentavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` }] : []),
  ];
  const status = incoming !== null ? { label: "New: take it to answer", tone: "wait" as const }
    : request === null ? { label: "Not found", tone: "end" as const }
      : request.status === "claimed" ? { label: "Waiting for you", tone: "wait" as const }
        : request.status === "accepted" ? { label: "Accepted", tone: "ok" as const } : { label: "Closed", tone: "end" as const };
  const clock = new ExpiryClock();
  const secondsLeft = request?.secondsLeft ?? incoming?.secondsLeft ?? 0;
  clock.sync(secondsLeft, receivedAt);
  const msLeft = clock.msLeft(now);
  const expiresAt = request?.expiresAt ?? incoming?.expiresAt ?? null;
  const asking = request?.status === "claimed" || incoming !== null;

  return (
    <EnotaryCaseFrame
      tone="attorney" eyebrow="eNotary request" title={heading.title} lead={heading.lead} steps={NOTARY_STEPS} current={stepOf(request)}
      back={{ to: "/app/enotary/desk", label: "All requests" }}
      party={client === null ? undefined : <PartyCard name={client.name} role="Client" tone="client" status={status} rows={rows} auditCount={null} invitationId={request?.id} />}
      trail={request === null ? undefined : <RequestTrail invitationId={request.id} tone="attorney" refreshKey={request.status} />}
    >
      {confirmDialog}
      <DetailNotes details={request?.details ?? incoming?.details} />
      {banner !== null && (
        <div data-testid="desk-banner">
          <Notice icon={Clock} tone={banner.tone}>
            {banner.text}{" "}
            <Link to={banner.link} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "inherit", fontWeight: 700, textDecoration: "underline" }}>{banner.label}</Link>
          </Notice>
        </div>
      )}
      {said !== null && <div role="status" style={{ ...GF, fontSize: 14, fontWeight: 600, color: E.ok }}>{said}</div>}
      {problem !== null && <Notice icon={Clock} tone="danger">{problem}</Notice>}

      {client === null && (
        <Panel testId="request-missing">
          <p style={{ ...bodyText, margin: 0 }}>This request is not on your desk. It may have been cancelled, or it was sent to another notary ({focus.slice(0, 8)}…).</p>
          <p style={{ margin: "12px 0 0" }}><Link to="/app/enotary/desk" style={linkButton("secondary")}>Back to the desk</Link></p>
        </Panel>
      )}

      {asking && client !== null && (
        <Panel testId="new-request">
          <PanelTitle>A new request</PanelTitle>
          <dl style={{ margin: 0 }}>
            {([
              { label: "Client", value: <>{client.name} <span style={{ background: E.okWash, color: E.ok, borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>Identity verified</span></> },
              { label: "Identity", value: "Verified by LAGDA. You confirm it yourself on the call." },
              { label: "Received", value: received === null ? "" : stampLabel(received) },
            ] as { label: string; value: ReactNode }[]).map(({ label, value }, i) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(90px, 140px) 1fr", gap: 12, padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${E.line}`, fontSize: 14.5 }}>
                <dt style={{ color: E.quiet, fontWeight: 700 }}>{label}</dt>
                <dd style={{ margin: 0, color: E.ink }}>{value}</dd>
              </div>
            ))}
          </dl>
          {expiresAt !== null && msLeft > 0 && (
            <p data-testid="request-countdown" style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 700, color: E.skyDeep, display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} aria-hidden /> {countdownText(msLeft)} left · until {expiryLabel(expiresAt)}
            </p>
          )}
          <h3 style={{ margin: "18px 0 6px", fontSize: 16, color: E.ink }}>What happens when you accept</h3>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {NEXT_STEPS.map((step, i) => (
              <li key={step.title} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: `1px solid ${E.line}`, fontSize: 14.5, color: E.text }}>
                <span aria-hidden="true" style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", background: E.maroonWash, color: E.maroon, fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                <span><strong style={{ color: E.ink }}>{step.title}</strong> {step.text}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {incoming !== null && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButton disabled={taking === incoming.id || msLeft <= 0} onClick={() => { onTake(incoming); }}>{taking === incoming.id ? "Taking…" : "Take this request"}</ActionButton>
        </div>
      )}

      {request !== null && <><style>{DESK_CARD_STYLES}</style><ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{renderRequest(request)}</ul></>}
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}
