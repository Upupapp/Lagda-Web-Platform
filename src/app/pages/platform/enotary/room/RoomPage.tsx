// /app/enotary/room/:invitationId — the room where the client and their notary
// meet: video between the two browsers, a chat, the document, the client's
// consent, and the notary's act.
//
// The server owns every fact. This page says "I am here" every 20 seconds,
// asks for the session every 4 seconds and the chat every 3, and shows only
// what the answer says. The video does not pass through LAGDA and is not
// recorded. LAGDA eNotary is a pilot and says so, on this page, in the words the
// server sends.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, FileUp, ShieldCheck, Stamp, XCircle } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice, T, TAP } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import {
  BLOCK_WORDS, describeSessionError, realEnotarySessionsService, type ActType, type RoomMessage, type Session,
} from "../../../../services/real/enotary-sessions.service";
import { E, EnotaryFrame, EnotaryHeading } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, PanelTitle, TextField, bodyText, fieldStyle, labelStyle, linkButton, markSessionsOffered } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { Chat, PdfView, VideoPane } from "./room-bits";
import { useRoomConnection } from "./useRoomConnection";

export const PING_MS = 20_000;
export const SESSION_MS = 4_000;
export const CHAT_MS = 3_000;

const ACTS: { value: ActType; label: string; hint: string }[] = [
  { value: "acknowledgment", label: "Acknowledgment", hint: "The client says the signature on the document is theirs, freely given." },
  { value: "jurat", label: "Jurat", hint: "The client swears to the contents and signs before the notary." },
  { value: "signature_witnessing", label: "Signature witnessing", hint: "The notary witnesses the client signing." },
];

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "none"; reason: string }
  | { kind: "ready"; session: Session };

export function RoomPage() {
  const { invitationId = "" } = useParams();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const alive = useRef(true);
  const { confirm, confirmDialog } = useConfirm();

  const session = loaded.kind === "ready" ? loaded.session : null;
  const live = session !== null && session.status === "live";
  const connection = useRoomConnection(session?.id ?? null, session?.role ?? null, live);

  const load = useCallback(async () => {
    try {
      const found = await realEnotarySessionsService.lookup(invitationId);
      if (!alive.current) return;
      if (found !== null) markSessionsOffered();
      if (found === null) setLoaded({ kind: "off" });
      else if (found.session === null) {
        setLoaded({ kind: "none", reason: found.reason === "payment_pending" ? "The session opens once the notary's fee is settled." : found.canStart ? "The session has not been started yet." : "This request has no session." });
      } else setLoaded({ kind: "ready", session: found.session });
    } catch {
      if (alive.current) setLoaded({ kind: "error" });
    }
  }, [invitationId]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; };
  }, [load]);

  const sessionId = session?.id ?? null;
  const status = session?.status ?? null;
  // Presence and the session's state, while the room is not over.
  useEffect(() => {
    if (sessionId === null || (status !== "preparing" && status !== "live")) return;
    const ping = () => { realEnotarySessionsService.ping(sessionId).then(next => { if (alive.current) setLoaded({ kind: "ready", session: next }); }).catch(() => { /* next round */ }); };
    const read = () => { realEnotarySessionsService.get(sessionId).then(next => { if (alive.current) setLoaded({ kind: "ready", session: next }); }).catch(() => { /* next round */ }); };
    ping();
    const pingTimer = setInterval(ping, PING_MS);
    const readTimer = setInterval(read, SESSION_MS);
    return () => { clearInterval(pingTimer); clearInterval(readTimer); };
  }, [sessionId, status]);

  useEffect(() => {
    if (sessionId === null || status !== "live") return;
    const read = () => { realEnotarySessionsService.messages(sessionId).then(next => { if (alive.current) setMessages(next); }).catch(() => { /* next round */ }); };
    read();
    const timer = setInterval(read, CHAT_MS);
    return () => { clearInterval(timer); };
  }, [sessionId, status]);

  const act = async (name: string, work: () => Promise<Session>) => {
    setBusy(name);
    setProblem(null);
    try {
      const next = await work();
      if (alive.current) setLoaded({ kind: "ready", session: next });
    } catch (failure) {
      if (alive.current) setProblem(describeSessionError(failure));
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  if (loaded.kind === "loading") return <EnotaryLoading label="Opening the room…" />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); void load(); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;
  if (loaded.kind === "none") {
    return (
      <EnotaryFrame tone="neutral" description="Notary session">
        <EnotaryHeading>No session yet</EnotaryHeading>
        <p style={bodyText}>{loaded.reason}</p>
        <p><Link to={`/app/enotary/requests/${encodeURIComponent(invitationId)}`} style={linkButton("secondary")}>Back to the request</Link></p>
      </EnotaryFrame>
    );
  }

  const s = loaded.session;
  const isClient = s.role === "client";
  const partner = isClient ? s.notaryName : s.clientName;
  const back = isClient ? `/app/enotary/requests/${encodeURIComponent(invitationId)}` : "/app/enotary/desk";
  const over = s.status === "notarized" || s.status === "cancelled";

  const callOff = () => {
    confirm({
      title: "Call off this session?",
      body: "Nothing will be notarized. The other person is told. You can ask for a new session only by making a new request.",
      confirmLabel: "Call off the session", cancelLabel: "Keep it", destructive: true,
      onConfirm: () => act("cancel", () => realEnotarySessionsService.cancel(s.id)),
    });
  };

  return (
    <EnotaryFrame wide tone={isClient ? "client" : "attorney"} eyebrow="Notary session" badge={isClient ? "Client" : "Notary"} description={`With ${partner}`}>
      {confirmDialog}
      <p style={{ ...GF, margin: "0 0 14px" }}>
        <Link to={back} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: TAP, color: T.azureDeep, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={16} aria-hidden /> {isClient ? "Back to the request" : "Back to the desk"}
        </Link>
      </p>
      <EnotaryHeading>{s.status === "notarized" ? "Notarized" : s.status === "cancelled" ? "Session ended" : "Session with " + partner}</EnotaryHeading>
      <Notice icon={ShieldCheck} tone="info"><span data-testid="pilot-notice">{s.pilotNotice}</span></Notice>
      {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}

      {s.status === "cancelled" && (
        <Notice icon={XCircle} tone="warn">
          <span data-testid="cancelled-note">{s.cancelledBy === s.role ? "You called off" : `${partner} called off`} this session{s.endedAt !== null ? ` on ${stampLabel(s.endedAt)}` : ""}. Nothing was notarized.</span>
        </Notice>
      )}

      {s.status === "notarized" && <Result session={s} />}

      {!over && (
        <>
          <Panel testId="presence-panel" tone="sky">
            <p style={{ ...bodyText, margin: 0 }} data-testid="presence">
              {s.status === "preparing"
                ? isClient ? "Waiting for the notary to open the room." : s.document === null ? "Waiting for the client to add the document." : "The document is in. Open the room when you are ready."
                : <>In the room: {s.presence.client ? "the client" : "—"}, {s.presence.notary ? "the notary" : "—"}.</>}
            </p>
          </Panel>

          {s.status === "live" && (
            <Panel testId="video-panel">
              <PanelTitle>Video</PanelTitle>
              <VideoPane connection={connection} partnerLabel={partner} />
            </Panel>
          )}

          <Panel testId="document-panel">
            <PanelTitle>The document</PanelTitle>
            {s.document === null ? (
              isClient
                ? <ClientUpload onFile={file => act("upload", () => realEnotarySessionsService.addDocument(s.id, file))} busy={busy === "upload"} />
                : <p style={bodyText} data-testid="no-document">The client has not added the document yet.</p>
            ) : (
              <>
                <p style={{ ...bodyText, margin: "0 0 8px" }} data-testid="document-info">
                  <strong>{s.document.name}</strong> · {(s.document.size / 1024).toFixed(0)} KB · added {stampLabel(s.document.addedAt)}
                  <small style={{ display: "block", color: E.quiet, wordBreak: "break-all" }}>SHA-256 {s.document.sha256}</small>
                </p>
                <PdfView load={() => realEnotarySessionsService.document(s.id)} fileKey={s.document.sha256} name={s.document.name} />
                {isClient && s.status === "preparing" && (
                  <div style={{ marginTop: 12 }}>
                    <ClientUpload onFile={file => act("upload", () => realEnotarySessionsService.addDocument(s.id, file))} busy={busy === "upload"} replace />
                  </div>
                )}
              </>
            )}
          </Panel>

          {!isClient && s.status === "preparing" && (
            <ActionRow>
              <ActionButton icon={CheckCircle2} disabled={busy !== null || s.document === null} onClick={() => { void act("open", () => realEnotarySessionsService.open(s.id)); }}>
                {busy === "open" ? "Opening…" : "Open the room"}
              </ActionButton>
            </ActionRow>
          )}

          {isClient && s.status === "live" && (
            <Panel testId="consent-panel" tone={s.consent.at === null ? "maroon" : "plain"}>
              <PanelTitle>Your confirmation</PanelTitle>
              {s.consent.at === null ? (
                <>
                  <p style={bodyText} data-testid="consent-text">{s.consent.text}</p>
                  <ActionButton icon={CheckCircle2} disabled={busy !== null || s.document === null} onClick={() => { void act("consent", () => realEnotarySessionsService.consent(s.id)); }}>
                    {busy === "consent" ? "Saving…" : "I confirm"}
                  </ActionButton>
                </>
              ) : <p style={{ ...bodyText, margin: 0 }} data-testid="consent-done">You confirmed this on {stampLabel(s.consent.at)}.</p>}
            </Panel>
          )}

          {s.status === "live" && (
            <Panel testId="chat-panel">
              <PanelTitle>Chat</PanelTitle>
              <Chat
                messages={messages} me={s.role} disabled={false}
                onSend={async body => { const sent = await realEnotarySessionsService.say(s.id, body); setMessages(list => [...list, sent]); }}
              />
            </Panel>
          )}

          {!isClient && s.status === "live" && <NotarizePanel session={s} busy={busy === "notarize"} onRecord={input => act("notarize", () => realEnotarySessionsService.notarize(s.id, input))} />}

          <ActionRow>
            <ActionButton kind="danger" disabled={busy !== null} onClick={callOff}>{busy === "cancel" ? "Calling off…" : "Call off the session"}</ActionButton>
          </ActionRow>
        </>
      )}
      <OnrampNote />
    </EnotaryFrame>
  );
}

function ClientUpload({ onFile, busy, replace = false }: { onFile: (file: File) => Promise<void>; busy: boolean; replace?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const problem = file === null ? null
    : file.size > 20 * 1024 * 1024 ? "The file is larger than 20 MB."
      : file.size === 0 ? "The file is empty." : null;
  return (
    <div data-testid="upload">
      {!replace && <p style={bodyText}>Add the scanned document you want notarized, as a PDF of up to 20 MB. Only you and {"the notary"} can see it.</p>}
      <label htmlFor="room-file" style={labelStyle}>{replace ? "Replace the document" : "PDF of the document"}</label>
      <input
        id="room-file" type="file" accept="application/pdf,.pdf" onChange={event => { setFile(event.target.files?.[0] ?? null); }}
        aria-invalid={problem !== null ? true : undefined} style={{ ...fieldStyle(problem !== null), padding: 8 }}
      />
      {problem !== null && <p role="alert" style={{ ...GF, color: "#B0182B", fontSize: 13.5 }}>{problem}</p>}
      <div style={{ marginTop: 10 }}>
        <ActionButton icon={FileUp} disabled={busy || file === null || problem !== null} onClick={() => { if (file !== null) void onFile(file).then(() => { setFile(null); }); }}>
          {busy ? "Adding…" : replace ? "Replace" : "Add the document"}
        </ActionButton>
      </div>
    </div>
  );
}

export function NotarizePanel({
  session, busy, onRecord,
}: { session: Session; busy: boolean; onRecord: (input: { actType: ActType; description: string; place: string; attestations: Record<string, boolean> }) => Promise<void> }) {
  const [actType, setActType] = useState<ActType>("acknowledgment");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const allChecked = session.attestations.every(item => checks[item.key] === true);
  const block = session.notarizeBlock;
  const ready = block === null && allChecked && description.trim() !== "" && place.trim() !== "";
  return (
    <Panel testId="notarize-panel" tone="maroon">
      <PanelTitle>Record the notarial act</PanelTitle>
      {block !== null && <p data-testid="notarize-block" style={{ ...bodyText, color: "#8A3B12" }}>{BLOCK_WORDS[block]}</p>}
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
        <legend style={labelStyle}>Kind of act</legend>
        {ACTS.map(option => (
          <label key={option.value} style={{ ...GF, display: "flex", gap: 8, alignItems: "flex-start", minHeight: TAP, padding: "6px 0", fontSize: 14.5 }}>
            <input type="radio" name="act-type" value={option.value} checked={actType === option.value} onChange={() => { setActType(option.value); }} style={{ marginTop: 5 }} />
            <span><strong>{option.label}</strong><small style={{ display: "block", color: E.quiet }}>{option.hint}</small></span>
          </label>
        ))}
      </fieldset>
      <TextField label="Title or description of the document" value={description} onChange={setDescription} maxLength={600} required />
      <TextField label="Place of notarization" value={place} onChange={setPlace} maxLength={400} required hint="Where you are as the notary, for example the city and province of your commission." />
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
        <legend style={labelStyle}>What you attest</legend>
        {session.attestations.map(item => (
          <label key={item.key} style={{ ...GF, display: "flex", gap: 8, alignItems: "flex-start", minHeight: TAP, padding: "6px 0", fontSize: 14.5 }}>
            <input type="checkbox" checked={checks[item.key] === true} onChange={event => { setChecks(prev => ({ ...prev, [item.key]: event.target.checked })); }} style={{ marginTop: 5 }} />
            <span>{item.text}</span>
          </label>
        ))}
      </fieldset>
      <ActionButton icon={Stamp} disabled={busy || !ready} onClick={() => { void onRecord({ actType, description: description.trim(), place: place.trim(), attestations: checks }); }}>
        {busy ? "Recording…" : "Notarize the document"}
      </ActionButton>
      <p style={{ ...bodyText, fontSize: 12.5, color: E.quiet, margin: "10px 0 0" }}>
        This adds a certificate page to the document, seals it with its hash and a verification code, and enters it in your register. It cannot be undone.
      </p>
    </Panel>
  );
}

function Result({ session }: { session: Session }) {
  const done = session.notarized;
  const act = session.act;
  if (done === null || act === null) return null;
  return (
    <Panel tone="sky" testId="notarized-panel">
      <PanelTitle>{act.typeLabel} recorded</PanelTitle>
      <p style={bodyText} data-testid="notarized-facts">
        {act.notaryName} recorded this {act.typeLabel.toLowerCase()} on {stampLabel(act.at)} at {act.place}. Register entry <strong>{act.registerRef}</strong>.
      </p>
      <p style={{ ...bodyText, margin: "0 0 4px" }}>Verification code</p>
      <p data-testid="verify-code" style={{ ...GF, margin: "0 0 10px", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", color: E.navy }}>{done.code}</p>
      <p style={{ ...bodyText, fontSize: 13.5 }}>
        Anyone can check this code at <a href={done.verifyUrl} style={{ color: E.skyDeep, fontWeight: 700 }}>{done.verifyUrl}</a>.
        <small style={{ display: "block", color: E.quiet, wordBreak: "break-all" }}>SHA-256 of the notarized file {done.sha256}</small>
      </p>
      <PdfView load={() => realEnotarySessionsService.notarized(session.id)} fileKey={done.sha256} name={`${session.document?.name.replace(/\.pdf$/i, "") ?? "document"} (notarized).pdf`} />
    </Panel>
  );
}
