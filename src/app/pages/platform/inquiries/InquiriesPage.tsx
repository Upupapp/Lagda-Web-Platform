// /app/inquiries and /app/inquiries/:inquiryId — messages from the public
// website (backend 095): demo requests, contact messages and the eNotary
// waitlist.
//
// Read by the LAGDA owner's account only. The notification email links here:
// reading needs that account's own session, so the email carries no message
// text and no credential. For anyone else the server answers "not found", and
// so does this page.

import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Inbox, Mail, CalendarClock, MessageSquare, ListChecks } from "lucide-react";
import {
  publicInquiriesService, type Inquiry, type InquiryInbox, type InquiryKind,
} from "../../../services/real/public-inquiries.service";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

const KINDS: { id: InquiryKind; label: string; icon: typeof Inbox }[] = [
  { id: "demo", label: "Demo requests", icon: CalendarClock },
  { id: "contact", label: "Contact messages", icon: MessageSquare },
  { id: "waitlist", label: "eNotary waitlist", icon: ListChecks },
];
const isKind = (value: string | null): value is InquiryKind =>
  value === "demo" || value === "contact" || value === "waitlist";

/** What `topic` means depends on the form it came from. */
const TOPIC_LABEL: Record<InquiryKind, string> = {
  demo: "Interested in",
  contact: "Category",
  waitlist: "Asking as",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="iq-page">
      <h1 className="iq-title">{title}</h1>
      {children}
      <style>{CSS}</style>
    </div>
  );
}

function NotFound() {
  return (
    <Shell title="Website messages">
      <div className="iq-card" role="alert" data-testid="inquiries-missing">
        This page does not exist, or this account does not read LAGDA's website messages.
      </div>
    </Shell>
  );
}

export function InquiriesPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("kind");
  const kind = isKind(raw) ? raw : undefined;
  const [inbox, setInbox] = useState<InquiryInbox | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    setInbox(null);
    publicInquiriesService.inbox(kind)
      .then(result => { if (live) setInbox(result); })
      .catch(() => { if (live) setMissing(true); });
    return () => { live = false; };
  }, [kind]);

  if (missing) return <NotFound />;
  const total = inbox === null ? null : inbox.counts.demo + inbox.counts.contact + inbox.counts.waitlist;

  return (
    <Shell title="Website messages">
      <p className="iq-lead">
        What visitors sent from the public site. Reply to them from your own email; nothing here is sent for you.
      </p>
      <div className="iq-tabs" role="group" aria-label="Filter by kind">
        <button type="button" className="iq-tab" aria-pressed={kind === undefined} onClick={() => { setParams({}, { replace: true }); }}>
          All{total === null ? "" : ` (${String(total)})`}
        </button>
        {KINDS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className="iq-tab" aria-pressed={kind === id} data-testid={`inquiries-tab-${id}`}
            onClick={() => { setParams({ kind: id }, { replace: true }); }}>
            <Icon size={14} aria-hidden /> {label}{inbox === null ? "" : ` (${String(inbox.counts[id])})`}
          </button>
        ))}
      </div>
      {inbox === null ? <div className="iq-card">Loading…</div>
        : inbox.inquiries.length === 0 ? (
          <div className="iq-card iq-empty" data-testid="inquiries-empty"><Inbox size={20} aria-hidden /> No messages here yet.</div>
        ) : (
          <ul className="iq-list" data-testid="inquiry-list">
            {inbox.inquiries.map(i => (
              <li key={i.inquiryId}>
                <Link to={`/app/inquiries/${encodeURIComponent(i.inquiryId)}`} className="iq-row" data-testid={`inquiry-${i.inquiryId}`}>
                  <span className="iq-row-main">
                    <strong>{i.name}</strong>
                    <span>{i.email}{i.organization === null ? "" : ` · ${i.organization}`}</span>
                    {i.subject !== null && <span className="iq-row-subject">{i.subject}</span>}
                  </span>
                  <span className="iq-row-side">
                    <span className={`iq-kind iq-kind-${i.kind}`}>{i.kindLabel}</span>
                    <span className="iq-when">{when(i.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Shell>
  );
}

export function InquiryPage() {
  const { inquiryId = "" } = useParams();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    publicInquiriesService.one(inquiryId)
      .then(result => { if (live) setInquiry(result); })
      .catch(() => { if (live) setMissing(true); });
    return () => { live = false; };
  }, [inquiryId]);

  if (missing) return <NotFound />;
  if (inquiry === null) return <Shell title="Website message"><div className="iq-card">Loading…</div></Shell>;

  const facts: [string, string | null][] = [
    ["Organization", inquiry.organization],
    ["Role", inquiry.role],
    ["Organization size", inquiry.organizationSize],
    ["Industry", inquiry.industry],
    ["Phone", inquiry.phone],
    [TOPIC_LABEL[inquiry.kind], inquiry.topic],
    ["Subject", inquiry.subject],
  ];
  const replySubject = inquiry.subject ?? `Your ${inquiry.kindLabel.toLowerCase()} to LAGDA`;

  return (
    <Shell title="Website message">
      <Link to="/app/inquiries" className="iq-back"><ArrowLeft size={15} aria-hidden /> All messages</Link>
      <div className="iq-card" data-testid="inquiry">
        <div className="iq-head">
          <span className={`iq-kind iq-kind-${inquiry.kind}`}>{inquiry.kindLabel}</span>
          <span className="iq-when">{when(inquiry.createdAt)}</span>
        </div>
        <h2 className="iq-name">{inquiry.name}</h2>
        <a className="iq-email" href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
        <dl className="iq-facts">
          {facts.filter(([, value]) => value !== null).map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        {inquiry.message !== null && (
          <>
            <h3 className="iq-sub">Message</h3>
            <p className="iq-message" data-testid="inquiry-message">{inquiry.message}</p>
          </>
        )}
        {inquiry.kind === "waitlist" && (
          <p className="iq-note">
            A waitlist sign-up is a request to be told about LAGDA eNotary. It is not an account, an appointment or a decision on eligibility.
          </p>
        )}
        <div className="iq-actions">
          <a className="iq-btn" data-testid="inquiry-reply"
            href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${replySubject}`)}`}>
            <Mail size={15} aria-hidden /> Reply by email
          </a>
        </div>
      </div>
    </Shell>
  );
}

const CSS = `
.iq-page { max-width: 820px; margin: 0 auto; padding: 24px 16px 64px; font-family: 'Geist', sans-serif; }
.iq-title { font-size: 24px; font-weight: 800; color: #0B1F4B; margin: 0 0 6px; }
.iq-lead { font-size: 14px; color: #64748B; margin: 0 0 16px; line-height: 1.55; }
.iq-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: #005A9E; text-decoration: none; margin: 6px 0 14px; }
.iq-card { background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(7,17,31,0.04); font-size: 14px; color: #334155; }
.iq-empty { display: flex; align-items: center; gap: 8px; color: #64748B; }
.iq-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 14px; }
.iq-tab { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid #D5DEEA; background: #FFFFFF; color: #334155; font: 600 13px 'Geist', sans-serif; cursor: pointer; }
.iq-tab[aria-pressed="true"] { background: #0B1F4B; border-color: #0B1F4B; color: #FFFFFF; }
.iq-tab:focus-visible, .iq-row:focus-visible, .iq-btn:focus-visible, .iq-back:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
.iq-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.iq-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 14px; padding: 14px 16px; text-decoration: none; color: #0B1F4B; }
.iq-row:hover { border-color: #B9CBE4; }
.iq-row-main { display: grid; gap: 2px; min-width: 0; flex: 1 1 240px; }
.iq-row-main strong { font-size: 14.5px; }
.iq-row-main span { font-size: 13px; color: #64748B; overflow-wrap: anywhere; }
.iq-row-main .iq-row-subject { color: #334155; }
.iq-row-side { display: grid; gap: 4px; justify-items: end; }
.iq-kind { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.iq-kind-demo { background: #E0F0FF; color: #0B4A82; }
.iq-kind-contact { background: #E8F7EE; color: #166534; }
.iq-kind-waitlist { background: #F8E7F0; color: #67023B; }
.iq-when { font-size: 12px; color: #64748B; }
.iq-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.iq-name { font-size: 19px; font-weight: 800; color: #0B1F4B; margin: 0 0 2px; overflow-wrap: anywhere; }
.iq-email { font-size: 14px; color: #005A9E; overflow-wrap: anywhere; }
.iq-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 18px; margin: 16px 0 0; }
.iq-facts dt { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748B; }
.iq-facts dd { margin: 2px 0 0; font-size: 14px; color: #0B1F4B; overflow-wrap: anywhere; }
.iq-sub { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748B; margin: 18px 0 6px; }
.iq-message { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; color: #1E293B; background: #F8FAFC; border: 1px solid #E6EBF2; border-radius: 12px; padding: 14px; }
.iq-note { margin: 14px 0 0; font-size: 13px; color: #67023B; background: #FBF1F6; border: 1px solid #EBCFDD; border-radius: 10px; padding: 10px 12px; line-height: 1.5; }
.iq-actions { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
.iq-btn { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 18px; border-radius: 10px; background: #0078D4; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; }
@media (max-width: 520px) {
  .iq-row-side { justify-items: start; }
  .iq-btn { width: 100%; justify-content: center; }
}
`;
