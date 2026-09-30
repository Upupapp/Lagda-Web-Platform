// /app/contacts/new — Find people (091).
//
// Type someone's exact email and press Find. LAGDA shows that one person —
// their photo, name and title — if they have an account and allow being found,
// and "Add to contacts" sends them a request they accept or decline. When
// nobody matches, the same screen offers to add them as an external contact
// (name and email only, the rest optional), because most people a document
// goes to are not on LAGDA.
//
// Deliberately NO suggestions, partial matches or "people you may know":
// those would let anyone fish for who uses LAGDA. The backend enforces the
// same: exact address, verified accounts, a per-account rate limit.

import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  UserSearch, Search, UserPlus, Check, X, ArrowLeft, Mail, Globe, ShieldCheck, Loader2, Inbox, BadgeCheck, UserRound,
} from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import {
  contactConnectionsService, contactConnectionsAvailable, connectionErrorMessage, personAvatarUrl,
  type LookupResult,
} from "../../../services/real/contact-connections.service";
import {
  C, PersonAvatar, EXTERNAL_CONTACT_ROUTE, PENDING_CONTACTS_ROUTE,
} from "./contacts-ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Phase =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "done"; email: string; result: LookupResult }
  | { kind: "error"; message: string };

export function FindPeoplePage() {
  const platform = usePlatform();
  const access = useWorkspaceAccess();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workspaceId = platform.currentWorkspace?.id ?? null;
  const available = contactConnectionsAvailable(workspaceId);
  const canAdd = !access.confirmed || access.can("contact.create");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const find = async (value = email) => {
    const trimmed = value.trim();
    setActionError(null);
    if (!EMAIL.test(trimmed)) { setPhase({ kind: "error", message: "Enter a complete email address, like maria@example.com." }); return; }
    if (!available || workspaceId === null) return;
    setPhase({ kind: "searching" });
    try {
      const result = await contactConnectionsService.lookup(workspaceId, trimmed);
      setPhase({ kind: "done", email: trimmed, result });
    } catch (error) {
      setPhase({ kind: "error", message: connectionErrorMessage(error, "The search could not be completed. Please try again.") });
    }
  };

  const send = async () => {
    if (phase.kind !== "done" || workspaceId === null) return;
    setSending(true); setActionError(null);
    try {
      const sent = await contactConnectionsService.send(workspaceId, phase.email);
      setPhase({ ...phase, result: { ...phase.result, person: phase.result.person && { ...phase.result.person, relationship: "requested", connectionId: sent.connectionId } } });
    } catch (error) {
      setActionError(connectionErrorMessage(error, "The request could not be sent. Please try again."));
    }
    setSending(false);
  };

  const cancel = async () => {
    if (phase.kind !== "done" || !phase.result.person?.connectionId) return;
    setSending(true); setActionError(null);
    try {
      await contactConnectionsService.cancel(phase.result.person.connectionId);
      setPhase({ ...phase, result: { ...phase.result, person: { ...phase.result.person, relationship: "none", connectionId: null } } });
    } catch (error) {
      setActionError(connectionErrorMessage(error, "The request could not be cancelled. Please try again."));
    }
    setSending(false);
  };

  const externalLink = (value: string) => `${EXTERNAL_CONTACT_ROUTE}${value.trim() ? `?email=${encodeURIComponent(value.trim())}` : ""}`;

  return (
    <div className="fp-page">
      <div className="fp-inner">
        <Link to="/app/contacts" className="fp-back"><ArrowLeft size={15} aria-hidden /> Contacts</Link>

        <section className="fp-hero" aria-labelledby="fp-title">
          <span aria-hidden className="fp-hero-icon"><UserSearch size={26} strokeWidth={1.8} /></span>
          <h1 id="fp-title" className="fp-title">Find people on LAGDA</h1>
          <p className="fp-sub">
            Enter someone's exact email address. If they're on LAGDA and allow being found, you'll see them here and can ask to add each other as contacts.
          </p>

          {available ? (
            <form className="fp-search" role="search" noValidate onSubmit={e => { e.preventDefault(); void find(); }}>
              <label htmlFor={inputId} className="fp-visually-hidden">Email address</label>
              {/* The field and its icon are one holder, so the icon stays attached
                  to the field whether the button sits beside it or below it. */}
              <div className="fp-field" data-testid="find-field">
                <span aria-hidden className="fp-search-icon"><Mail size={18} /></span>
                <input ref={inputRef} id={inputId} type="email" inputMode="email" autoComplete="off" spellCheck={false}
                  value={email} onChange={e => { setEmail(e.target.value); if (phase.kind !== "idle") setPhase({ kind: "idle" }); }}
                  placeholder="name@example.com" className="fp-input" data-testid="find-email" />
              </div>
              <button type="submit" className="fp-find" disabled={phase.kind === "searching"} data-testid="find-button">
                {phase.kind === "searching" ? <Loader2 size={16} className="fp-spin" aria-hidden /> : <Search size={16} aria-hidden />}
                <span>Find</span>
              </button>
            </form>
          ) : (
            <p className="fp-note"><Globe size={15} aria-hidden /> Finding people works in a connected LAGDA workspace. You can still add a contact yourself.</p>
          )}
          <p className="fp-privacy"><ShieldCheck size={13} aria-hidden /> Only an exact, verified email finds anyone. No one is told you searched.</p>
        </section>

        <div aria-live="polite" className="fp-results">
          {phase.kind === "error" && <p role="alert" className="fp-alert">{phase.message}</p>}

          {phase.kind === "done" && phase.result.existingContactId !== null && (
            <div className="fp-result" data-testid="find-existing">
              <span aria-hidden className="fp-result-icon" data-tone="success"><Check size={18} /></span>
              <div className="fp-result-text">
                <strong>Already in your contacts</strong>
                <span>{phase.email} is in this workspace's address book.</span>
              </div>
              <Link to={`/app/contacts/${phase.result.existingContactId}`} className="fp-btn">View contact</Link>
            </div>
          )}

          {phase.kind === "done" && phase.result.existingContactId === null && phase.result.person !== null && (
            <article className="fp-person" data-testid="find-person" aria-label={`Found: ${phase.result.person.displayName}`}>
              <PersonAvatar name={phase.result.person.displayName} avatarUrl={personAvatarUrl(phase.result.person)} size={72} />
              <div className="fp-person-text">
                <h2 className="fp-person-name">{phase.result.person.displayName}</h2>
                {(phase.result.person.jobTitle || phase.result.person.organization) && (
                  <p className="fp-person-role">{[phase.result.person.jobTitle, phase.result.person.organization].filter(Boolean).join(" · ")}</p>
                )}
                <span className="fp-verified"><BadgeCheck size={13} aria-hidden /> On LAGDA</span>
              </div>
              <div className="fp-person-actions">
                {phase.result.person.relationship === "none" && canAdd && (
                  <button type="button" className="fp-btn" data-variant="primary" disabled={sending} onClick={() => { void send(); }} data-testid="send-request">
                    <UserPlus size={16} aria-hidden /> {sending ? "Sending…" : "Add to contacts"}
                  </button>
                )}
                {phase.result.person.relationship === "none" && !canAdd && (
                  <span className="fp-muted">Your role can't add contacts in this workspace.</span>
                )}
                {phase.result.person.relationship === "requested" && (
                  <>
                    <span className="fp-requested" data-testid="request-sent"><Check size={15} aria-hidden /> Requested</span>
                    <button type="button" className="fp-btn" data-variant="quiet" disabled={sending} onClick={() => { void cancel(); }}>
                      <X size={15} aria-hidden /> Cancel request
                    </button>
                  </>
                )}
                {phase.result.person.relationship === "incoming" && (
                  <button type="button" className="fp-btn" data-variant="primary" onClick={() => { void navigate(PENDING_CONTACTS_ROUTE); }}>
                    <Inbox size={16} aria-hidden /> They asked to add you — review
                  </button>
                )}
                {phase.result.person.relationship === "self" && (
                  <span className="fp-muted"><UserRound size={14} aria-hidden /> That's you.</span>
                )}
              </div>
              {actionError && <p role="alert" className="fp-alert" style={{ flexBasis: "100%", margin: 0 }}>{actionError}</p>}
              {phase.result.person.relationship === "requested" && (
                <p className="fp-person-note">
                  They'll see your request in their Contacts and notifications. When they accept, you're added to each other's contacts.
                </p>
              )}
            </article>
          )}

          {phase.kind === "done" && phase.result.existingContactId === null && phase.result.person === null && (
            <div className="fp-result" data-testid="find-none">
              <span aria-hidden className="fp-result-icon"><Search size={18} /></span>
              <div className="fp-result-text">
                <strong>No LAGDA account found for {phase.email}</strong>
                <span>They may not be on LAGDA yet, or they've chosen not to be found. You can still add them yourself.</span>
              </div>
              {canAdd && <Link to={externalLink(phase.email)} className="fp-btn" data-variant="primary" data-testid="add-external">Add as external contact</Link>}
            </div>
          )}
        </div>

        {canAdd && (
          <div className="fp-external">
            <Globe size={16} aria-hidden />
            <span>Adding someone who isn't on LAGDA, like a client or the other side's counsel?</span>
            <Link to={externalLink(email)}>Add an external contact</Link>
          </div>
        )}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.fp-page { min-height: 100%; background:
  radial-gradient(900px 320px at 50% -80px, rgba(0,120,212,0.10), rgba(0,120,212,0) 70%), ${C.CANVAS}; padding: 20px 24px 56px; box-sizing: border-box; }
.fp-inner { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
.fp-back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 600;
  color: ${C.AZURE_TEXT}; text-decoration: none; min-height: 32px; }
.fp-hero { background: #FFFFFF; border: 1.5px solid ${C.BORDER}; border-radius: 18px; padding: 28px 28px 20px; text-align: center;
  box-shadow: 0 12px 32px -24px rgba(7,17,31,0.45); }
.fp-hero-icon { width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;
  color: #FFFFFF; background: linear-gradient(135deg, #0B3A66 0%, ${C.AZURE} 100%); box-shadow: 0 10px 22px -12px rgba(0,120,212,0.8); }
.fp-title { font-family: 'Geist', sans-serif; font-size: 24px; font-weight: 800; color: ${C.NAVY}; margin: 0; }
.fp-sub { font-family: 'Geist', sans-serif; font-size: 14px; color: ${C.SLATE}; margin: 6px auto 18px; max-width: 52ch; line-height: 1.55; }
.fp-search { display: flex; gap: 8px; max-width: 560px; margin: 0 auto; }
.fp-field { flex: 1 1 auto; min-width: 0; display: flex; align-items: stretch; height: 50px; box-sizing: border-box; border: 1.5px solid #CBD5E1;
  border-radius: 12px; background: #FFFFFF; overflow: hidden; transition: border-color 140ms ease, box-shadow 140ms ease; }
.fp-field:focus-within { border-color: ${C.AZURE}; box-shadow: 0 0 0 4px rgba(0,120,212,0.14); }
.fp-search-icon { flex: 0 0 46px; display: flex; align-items: center; justify-content: center; color: #64748B; background: #F5F8FC;
  border-right: 1.5px solid #E2E8F0; pointer-events: none; }
.fp-field:focus-within .fp-search-icon { color: ${C.AZURE}; background: #EEF5FD; }
.fp-input { flex: 1 1 auto; min-width: 0; height: 100%; box-sizing: border-box; padding: 0 14px; border: none;
  font-family: 'Geist', sans-serif; font-size: 16px; color: ${C.NAVY}; background: transparent; outline: none; }
.fp-find { flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px; height: 50px; padding: 0 22px; border: none; border-radius: 12px; cursor: pointer;
  background: ${C.AZURE}; color: #FFFFFF; font-family: 'Geist', sans-serif; font-size: 15px; font-weight: 700; }
.fp-find:disabled { opacity: 0.7; cursor: progress; }
.fp-find:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 2px; }
.fp-spin { animation: fp-spin 900ms linear infinite; }
@keyframes fp-spin { to { transform: rotate(360deg); } }
.fp-privacy { display: flex; align-items: center; justify-content: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 12px; color: ${C.MUTED}; margin: 12px 0 0; }
.fp-note { display: flex; gap: 8px; align-items: flex-start; justify-content: center; font-family: 'Geist', sans-serif; font-size: 13px; color: #1E3A8A;
  background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 12px; margin: 0 auto; max-width: 520px; text-align: left; }
.fp-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.fp-results { display: flex; flex-direction: column; gap: 12px; }
.fp-alert { font-family: 'Geist', sans-serif; font-size: 13.5px; color: #991B1B; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 10px 14px; margin: 0; }
.fp-result { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; background: #FFFFFF; border: 1.5px solid ${C.BORDER}; border-radius: 14px; padding: 14px 16px; }
.fp-result-icon { width: 40px; height: 40px; border-radius: 12px; background: #F1F5F9; color: ${C.SLATE}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fp-result-icon[data-tone="success"] { background: #ECFDF3; color: #166534; }
.fp-result-text { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-family: 'Geist', sans-serif; }
.fp-result-text strong { font-size: 14.5px; color: ${C.NAVY}; overflow-wrap: anywhere; }
.fp-result-text span { font-size: 13px; color: ${C.SLATE}; line-height: 1.5; }
.fp-person { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; background: #FFFFFF; border: 1.5px solid #BAD7F5; border-radius: 16px; padding: 18px 20px;
  box-shadow: 0 0 0 4px rgba(0,120,212,0.08), 0 14px 30px -22px rgba(0,120,212,0.6); animation: fp-in 200ms cubic-bezier(0.2,0.7,0.2,1); }
@keyframes fp-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.fp-person-text { flex: 1 1 200px; min-width: 0; }
.fp-person-name { font-family: 'Geist', sans-serif; font-size: 18px; font-weight: 800; color: ${C.NAVY}; margin: 0; overflow-wrap: anywhere; }
.fp-person-role { font-family: 'Geist', sans-serif; font-size: 13.5px; color: ${C.SLATE}; margin: 2px 0 0; }
.fp-verified { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-family: 'Geist', sans-serif; font-size: 11px; font-weight: 700;
  color: #166534; background: #ECFDF3; border: 1px solid #BBF7D0; border-radius: 999px; padding: 2px 8px; }
.fp-person-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.fp-person-note { flex-basis: 100%; margin: 0; font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${C.MUTED}; line-height: 1.5; }
.fp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 16px; border-radius: 10px; border: 1.5px solid #CBD5E1;
  background: #FFFFFF; color: ${C.INK}; font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 700; text-decoration: none; cursor: pointer; white-space: nowrap; }
.fp-btn:hover:not(:disabled) { border-color: ${C.AZURE}; color: ${C.AZURE_TEXT}; }
.fp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.fp-btn:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 1px; }
.fp-btn[data-variant="primary"] { background: ${C.AZURE}; border-color: ${C.AZURE}; color: #FFFFFF; }
.fp-btn[data-variant="primary"]:hover:not(:disabled) { background: #006CBE; color: #FFFFFF; }
.fp-btn[data-variant="quiet"] { color: ${C.SLATE}; }
.fp-requested { display: inline-flex; align-items: center; gap: 6px; min-height: 42px; padding: 0 14px; border-radius: 10px; background: #ECFDF3; color: #166534;
  font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 700; }
.fp-muted { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 13px; color: ${C.MUTED}; }
.fp-external { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; font-family: 'Geist', sans-serif; font-size: 13px; color: ${C.SLATE};
  border: 1.5px dashed #CBD5E1; border-radius: 12px; padding: 12px 16px; background: rgba(255,255,255,0.6); }
.fp-external svg { color: #94A3B8; flex-shrink: 0; }
.fp-external a { color: ${C.AZURE_TEXT}; font-weight: 700; text-decoration: none; }
.fp-external a:hover { text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 600px) {
  .fp-page { padding: 14px 16px 40px; }
  .fp-hero { padding: 22px 16px 16px; border-radius: 16px; }
  .fp-title { font-size: 21px; }
  .fp-search { flex-direction: column; }
  .fp-field { flex: 0 0 auto; width: 100%; }
  .fp-find { width: 100%; justify-content: center; }
  .fp-person { flex-direction: column; align-items: flex-start; }
  .fp-person-actions, .fp-person-actions .fp-btn, .fp-result .fp-btn { width: 100%; }
}
@media (prefers-reduced-motion: reduce) { .fp-person { animation: none; } .fp-spin { animation: none; } }
`;
