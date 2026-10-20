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
import { Link, useNavigate, useParams } from "react-router";
import { CheckCircle2, FileUp, ShieldCheck, Stamp, XCircle } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice, TAP } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import {
  BLOCK_WORDS, describeSessionError, realEnotarySessionsService, type ActType, type RoomMessage, type Session,
} from "../../../../services/real/enotary-sessions.service";
import { E, EnotaryFrame, EnotaryHeading } from "../EnotaryChrome";
import { CLIENT_STEPS, EnotaryCaseFrame, NOTARY_STEPS } from "../CaseFrame";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, PanelTitle, TextField, bodyText, fieldStyle, labelStyle, linkButton, markSessionsOffered } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { useOptionalPlatform } from "../../../../context/PlatformContext";
import { CompletedDocumentPicker, PickProblem, completedDocumentFile, type CompletedChoice } from "./CompletedDocumentPicker";
import { SharedDocumentPicker, sharedDocumentAsFile, type SharedChoice } from "./SharedDocumentPicker";
import { Chat, PdfView } from "./room-bits";
import { CallCard } from "./CallCard";
import { ClientFlow, NotaryFlow } from "./RoomFlow";
import { NotarizedPage } from "./NotarizedPage";
import { RequestTrail, useRequestTrail } from "../RequestTrail";
import { useRoomConnection } from "./useRoomConnection";
import { withProcess, type ProcessKind } from "../../../../config/process-screens";

/** The loading screen each room action runs behind (the chat is not one: it stays quiet). */
const ROOM_PROCESS: Record<string, ProcessKind | undefined> = {
  upload: "enotary-document-add", replace: "enotary-document-replace", open: "enotary-room-open",
  consent: "enotary-consent", notarize: "enotary-notarize", cancel: "enotary-session-cancel",
  finalize: "enotary-finalize", identity: "enotary-identity", act: "enotary-act", approve: "enotary-approve",
};

export const PING_MS = 20_000;
export const SESSION_MS = 4_000;
export const CHAT_MS = 3_000;

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
  const navigate = useNavigate();

  const workspaceId = useOptionalPlatform()?.currentWorkspace?.id ?? null;
  const session = loaded.kind === "ready" ? loaded.session : null;
  const live = session !== null && session.status === "live";
  const connection = useRoomConnection(session?.id ?? null, session?.role ?? null, live);
  const requestTrail = useRequestTrail(session?.invitationId ?? null, `${session?.status ?? ""}${session?.statement?.approvedAt ?? ""}${session?.finalizedAt ?? ""}`);

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
      const kind = ROOM_PROCESS[name];
      const next = kind === undefined ? await work() : await withProcess(kind, "", work);
      if (alive.current) setLoaded({ kind: "ready", session: next });
    } catch (failure) {
      if (alive.current) setProblem(failure instanceof PickProblem ? failure.message : describeSessionError(failure));
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

  // A file from the person's own disk, or a signed document of the workspace: the same call, behind the same loading screen.
  const addFile = (name: string) => (file: File) => act(name, () => realEnotarySessionsService.addDocument(s.id, file));
  const addShared = (name: string) => (choice: SharedChoice) => act(name, async () => realEnotarySessionsService.addDocument(s.id, await sharedDocumentAsFile(choice)));
  const addCompleted = (name: string) => (choice: CompletedChoice) => act(name, async () => {
    if (workspaceId === null) throw new PickProblem("Open a workspace first.");
    return realEnotarySessionsService.addDocument(s.id, await completedDocumentFile(workspaceId, choice));
  });

  const callOff = () => {
    confirm({
      title: "Call off this session?",
      body: "Nothing will be notarized. The other person is told. You can ask for a new session only by making a new request.",
      confirmLabel: "Call off the session", cancelLabel: "Keep it", destructive: true,
      onConfirm: () => act("cancel", () => realEnotarySessionsService.cancel(s.id)),
    });
  };

  const step = roomStep(s, isClient);
  const heading = roomHeading(s, isClient, partner);

  return (
    <EnotaryCaseFrame
      tone={isClient ? "client" : "attorney"} eyebrow={isClient ? `eNotary request \u2022 ${partnerTitle(partner, true)}` : `Notary desk \u2022 ${partner}`}
      title={heading.title} lead={heading.lead} steps={isClient ? CLIENT_STEPS : NOTARY_STEPS} current={step}
      back={{ to: back, label: isClient ? "Back to the request" : "All requests" }}
      reference={s.reference ?? requestTrail?.reference ?? null}
      trail={<RequestTrail invitationId={s.invitationId} tone={isClient ? "client" : "attorney"} trail={requestTrail} />}
    >
      {confirmDialog}
      <Notice icon={ShieldCheck} tone="info"><span data-testid="pilot-notice">{s.pilotNotice}</span></Notice>
      {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}

      {s.status === "cancelled" && (
        <Notice icon={XCircle} tone="warn">
          <span data-testid="cancelled-note">{s.cancelledBy === s.role ? "You called off" : `${partner} called off`} this session{s.endedAt !== null ? ` on ${stampLabel(s.endedAt)}` : ""}. Nothing was notarized.</span>
        </Notice>
      )}

      {s.status === "notarized" && <NotarizedPage session={s} />}

      {!over && (
        <div className="eno-split">
          <div style={{ minWidth: 0, display: "grid", gap: 16 }}>
            {s.status !== "live" && <Panel testId="presence-panel" tone="sky">
              <p style={{ ...bodyText, margin: 0 }} data-testid="presence">
                {s.status === "preparing"
                  ? isClient ? "Waiting for the notary to open the room." : s.document === null ? "Waiting for the client to add the document." : "The document is in. Open the room when you are ready."
                  : <>In the room: {s.presence.client ? "the client" : "—"}, {s.presence.notary ? "the notary" : "—"}.</>}
              </p>
            </Panel>}

            {s.status === "live" && (
              <div data-testid="video-panel">
                <CallCard
                  session={s} connection={connection} partnerName={partnerTitle(partner, isClient)} partnerRole={isClient ? "Notary public" : "Client"}
                  selfIdentityVerified={isClient} partnerPresent={isClient ? s.presence.notary : s.presence.client} messages={messages}
                  onSend={async body => { const sent = await realEnotarySessionsService.say(s.id, body); setMessages(list => [...list, sent]); }}
                  onLeave={() => { void navigate(back); }}
                  document={s.document === null ? <p style={bodyText}>The client has not chosen the document yet.</p>
                    : <PdfView load={() => realEnotarySessionsService.document(s.id)} fileKey={s.document.sha256} name={s.document.name} height={420} />}
                />
              </div>
            )}

            {s.status === "live" && (
              <Panel testId="chat-panel">
                <PanelTitle>{`Chat with ${partnerTitle(partner, isClient)}`}</PanelTitle>
                <Chat
                  messages={messages} me={s.role} disabled={false}
                  onSend={async body => { const sent = await realEnotarySessionsService.say(s.id, body); setMessages(list => [...list, sent]); }}
                />
              </Panel>
            )}
          </div>

          <div style={{ minWidth: 0, display: "grid", gap: 16 }}>
            <Panel testId="document-panel">
              <PanelTitle>Document for notarization</PanelTitle>
              {s.document === null ? (
                isClient
                  ? <ClientUpload workspaceId={workspaceId} onFile={addFile("upload")} onPick={addCompleted("upload")} onShared={addShared("upload")} busy={busy === "upload"} />
                  : <p style={bodyText} data-testid="no-document">The client has not added the document yet.</p>
              ) : (
                <>
                  <p style={{ ...bodyText, margin: "0 0 8px" }} data-testid="document-info">
                    <strong>{s.document.name}</strong> · {(s.document.size / 1024).toFixed(0)} KB · added {stampLabel(s.document.addedAt)}
                    <small style={{ display: "block", color: E.quiet, wordBreak: "break-all" }}>SHA-256 {s.document.sha256}</small>
                  </p>
                  <PdfView load={() => realEnotarySessionsService.document(s.id)} fileKey={s.document.sha256} name={s.document.name} />
                  {isClient && (s.finalizedAt ?? null) === null && (
                    <div style={{ marginTop: 12 }}>
                      <ClientUpload workspaceId={workspaceId} onFile={addFile("replace")} onPick={addCompleted("replace")} onShared={addShared("replace")} busy={busy === "replace"} replace />
                    </div>
                  )}
                </>
              )}
            </Panel>

            {!isClient && s.status === "preparing" && (
              <ActionRow align="end">
                <ActionButton icon={CheckCircle2} disabled={busy !== null} onClick={() => { void act("open", () => realEnotarySessionsService.open(s.id)); }}>
                  {busy === "open" ? "Opening…" : "Open the room"}
                </ActionButton>
              </ActionRow>
            )}

            {isClient && <ClientFlow s={s} busy={busy} act={act} onChanged={() => { void load(); }} />}

            {!isClient && (
              <NotaryFlow
                s={s} busy={busy} act={act} onChanged={() => { void load(); }}
                notarizePanel={<NotarizePanel session={s} busy={busy === "notarize"} onRecord={input => act("notarize", () => realEnotarySessionsService.notarize(s.id, input))} />}
              />
            )}
          </div>
        </div>
      )}
      {!over && (
        <ActionRow align="end">
          <ActionButton kind="danger" disabled={busy !== null} onClick={callOff}>{busy === "cancel" ? "Calling off…" : "Call off the session"}</ActionButton>
        </ActionRow>
      )}
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}

const partnerTitle = (name: string, isNotary: boolean) => (isNotary && !/^atty\.?\s/i.test(name) ? `Atty. ${name}` : name);

/** Where the room is among the eight steps. */
function roomStep(s: Session, isClient: boolean): string {
  if (s.status === "notarized") return "notarized";
  if (s.status === "preparing") return isClient ? "joins" : "accept";
  if ((s.finalizedAt ?? null) === null) return s.document === null ? "call" : "document";
  return isClient ? "finalized" : "fee";
}

function roomHeading(s: Session, isClient: boolean, partner: string): { title: string; lead: string } {
  if (s.status === "notarized") {
    return { title: isClient ? "Your document is notarized" : "Notarized",
      lead: isClient ? `${partnerTitle(partner, true)} performed the notarial act. Preview the document below, or download it.` : "The notarial act is recorded and entered in your register." };
  }
  if (s.status === "cancelled") return { title: "Session ended", lead: "Nothing was notarized in this session." };
  if (s.status === "preparing") {
    return isClient
      ? { title: `Waiting for ${partnerTitle(partner, true)} to open the room`, lead: "Add the document you want notarized while you wait. Only you and the notary can see it." }
      : { title: s.document === null ? `Waiting for ${partner} to add the document` : `Open the room for ${partner}`, lead: "Open the room when you are ready. You meet on a video call, and the client chooses the document with you." };
  }
  return isClient
    ? { title: `On a call with ${partnerTitle(partner, true)}`, lead: "Talk it through, then choose the document to be notarized. Confirm it when you both agree." }
    : { title: `On a call with ${partner}`, lead: "Confirm who the client is on the call, read the document with them, then record the notarial act." };
}

function ClientUpload({ onFile, onPick, onShared, workspaceId, busy, replace = false }: {
  onFile: (file: File) => Promise<void>; onPick: (choice: CompletedChoice) => Promise<void>; onShared: (choice: SharedChoice) => Promise<void>;
  workspaceId: string | null; busy: boolean; replace?: boolean;
}) {
  const [mode, setMode] = useState<"upload" | "completed" | "shared">("upload");
  const [file, setFile] = useState<File | null>(null);
  const problem = file === null ? null
    : file.size > 20 * 1024 * 1024 ? "The file is larger than 20 MB."
      : file.size === 0 ? "The file is empty." : null;
  return (
    <div data-testid="upload">
      {(
        <div role="tablist" aria-label="Where the document comes from" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 12px" }}>
          {([
            ...(workspaceId !== null ? [["completed", "Completed"] as const] : []),
            ["shared", "Shared documents"] as const, ["upload", "Upload a PDF"] as const,
          ]).map(([value, label]) => (
            <button
              key={value} type="button" role="tab" aria-selected={mode === value} data-testid={`source-${value}`} disabled={busy}
              onClick={() => { setMode(value); }}
              style={{ ...GF, minHeight: TAP, padding: "0 14px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                border: `2px solid ${mode === value ? E.maroon : E.maroonLine}`, background: mode === value ? "#FFF7F8" : "#FFFFFF", color: E.ink }}
            >{label}</button>
          ))}
        </div>
      )}
      {mode === "completed" && workspaceId !== null ? (
        <CompletedDocumentPicker workspaceId={workspaceId} onPick={onPick} busy={busy} replace={replace} />
      ) : mode === "shared" ? (
        <SharedDocumentPicker onPick={onShared} busy={busy} replace={replace} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

export function NotarizePanel({
  session, busy, onRecord,
}: { session: Session; busy: boolean; onRecord: (input: { actType: ActType; description: string; place: string; attestations: Record<string, boolean> }) => Promise<void> }) {
  // The act and what it is about were stated, and the client approved them: the seal records exactly those.
  const stated = session.statement ?? null;
  const actType: ActType = stated?.actType ?? "acknowledgment";
  const description = stated?.note ?? "";
  const [place, setPlace] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const allChecked = session.attestations.every(item => checks[item.key] === true);
  const block = session.notarizeBlock;
  const ready = block === null && allChecked && description.trim() !== "" && place.trim() !== "";
  return (
    <Panel testId="notarize-panel" tone="maroon">
      <PanelTitle>{stated !== null ? `Apply your seal: ${stated.actTypeLabel}` : "Record the notarial act"}</PanelTitle>
      {block !== null && <p data-testid="notarize-block" style={{ ...bodyText, color: "#8A3B12" }}>{BLOCK_WORDS[block]}</p>}
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
