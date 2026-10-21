// /app/enotary/seal — the notary's seal and signature.
//
// The seal is drawn on every document the notary notarizes. Its commission number, the date the commission ends and the
// roll number come only from the approved application, so a seal can never state a commission the application does not.
// How the seal reads (the name printed on it, a jurisdiction line and an office line) is the notary's to set (123).
//
// The signature is made the way a signer makes one in LAGDA: drawn, typed or uploaded. It is kept as a picture and drawn
// where the notary drops it on each document. Only its owner can see it.

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import {
  BadgeCheck, BookOpen, CalendarClock, CheckCircle2, Clock, Hash, IdCard, Lock, PenLine, Save, ShieldCheck, Stamp, Trash2, User,
  type LucideProps,
} from "lucide-react";
import { ActionButton, GF, Notice } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { realNotaryApplicationsService, type NotaryApplication } from "../../../../services/real/notary-applications.service";
import {
  describeSessionError, realEnotarySessionsService, type NotarySeal, type NotarySignature,
} from "../../../../services/real/enotary-sessions.service";
import { SignatureCapture, type SignatureValue } from "../../../../components/recipient/SignatureCapture";
import { withProcess } from "../../../../config/process-screens";
import { EnotaryCaseFrame } from "../CaseFrame";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, TextField, bodyText, hintStyle } from "../onramp-ui";
import { RecordCard } from "../RecordCard";

type Loaded =
  | { kind: "loading" } | { kind: "error" } | { kind: "off" }
  | { kind: "ready"; application: NotaryApplication | null; signature: NotarySignature | null; seal: NotarySeal | null };

export interface SealWording { readonly name: string; readonly jurisdictionLine: string | null; readonly officeLine: string | null }

const STYLES = `
  .ns-seal { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 28px; align-items: start; }
  .ns-specimen { position: relative; border: 1px solid ${E.line}; border-radius: 12px; padding: 22px 16px 14px; display: grid; justify-items: center; gap: 10px;
    background-color: #FFFFFF; background-image: linear-gradient(${E.wash} 1px, transparent 1px), linear-gradient(90deg, ${E.wash} 1px, transparent 1px); background-size: 16px 16px; }
  .ns-specimen::before, .ns-specimen::after { content: ""; position: absolute; width: 14px; height: 14px; border: 2px solid #B08A3E; }
  .ns-specimen::before { left: 8px; top: 8px; border-right: 0; border-bottom: 0; }
  .ns-specimen::after { right: 8px; bottom: 8px; border-left: 0; border-top: 0; }
  .ns-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 14px 0; }
  .ns-fact { display: flex; gap: 10px; align-items: flex-start; padding: 11px 12px; border: 1px solid ${E.line}; border-radius: 10px; background: #FCFDFE; min-width: 0; }
  .ns-fact.wide { grid-column: 1 / -1; }
  .ns-fact > span { flex: 0 0 auto; width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; background: #F6EFDF; color: #9A7A3A; }
  .ns-fact b { display: block; font-size: 13.5px; color: ${E.ink}; }
  .ns-fact small { display: block; font-size: 12px; color: ${E.quiet}; margin-top: 1px; overflow-wrap: anywhere; }
  .ns-callout { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; background: #EEF2F8; border: 1px solid ${E.line}; border-left: 4px solid ${E.navy}; font-size: 13.5px; color: ${E.text}; line-height: 1.5; }
  .ns-edit { margin-top: 20px; padding-top: 18px; border-top: 1px solid ${E.line}; }
  .ns-edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
  .ns-sign { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 22px; align-items: start; }
  .ns-label { display: block; margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${E.quiet}; }
  .ns-paper { border: 1px solid ${E.line}; border-radius: 12px; background: #FFFFFF; padding: 16px 18px 14px; box-shadow: inset 0 0 0 6px #FAFBFD; }
  .ns-foot { display: flex; align-items: center; gap: 12px; justify-content: space-between; flex-wrap: wrap; margin: 18px -20px -18px; padding: 14px 20px; background: #F7F9FC; border-top: 1px solid ${E.line}; }
  @media (max-width: 860px) { .ns-seal, .ns-sign { grid-template-columns: minmax(0, 1fr); } .ns-specimen { max-width: 320px; margin: 0 auto; width: 100%; box-sizing: border-box; } }
  @media (max-width: 560px) { .ns-facts, .ns-edit-grid { grid-template-columns: minmax(0, 1fr); } .ns-foot { margin: 16px -16px -16px; padding: 14px 16px; } .ns-foot > :last-child { width: 100%; } }
`;

/** The seal as it will be drawn: the notary's wording, and the commission from the application. */
export function SealPreview({ wording, application }: { wording: SealWording; application: NotaryApplication | null }) {
  const facts = [
    application === null || application.commissionNo === "" ? null : `Commission No. ${application.commissionNo}`,
    application === null || application.commissionValidUntil === "" ? null : `Until ${application.commissionValidUntil}`,
    application === null || application.rollNo === "" ? null : `Roll No. ${application.rollNo}`,
  ].filter((line): line is string => line !== null);
  const name = wording.name.trim() === "" ? "Your name" : wording.name.trim();
  const label = ["Notary Public", name, wording.jurisdictionLine, ...facts, wording.officeLine].filter(part => part !== null && part !== "").join(", ");
  return (
    <svg data-testid="seal-preview" role="img" aria-label={`Your seal: ${label}`} viewBox="0 0 200 200" width="176" height="176" style={{ display: "block", filter: "drop-shadow(0 6px 14px rgba(140,29,63,0.18))" }}>
      <defs><path id="ns-arc" d="M 28 100 A 72 72 0 0 1 172 100" /></defs>
      <circle cx="100" cy="100" r="94" fill="#FFFFFF" stroke={E.maroon} strokeWidth="6" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={E.maroon} strokeWidth="1.4" />
      <text fill={E.maroon} style={{ fontFamily: SERIF, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.18em" }}><textPath href="#ns-arc" startOffset="50%" textAnchor="middle">NOTARY PUBLIC</textPath></text>
      <text x="100" y="108" textAnchor="middle" fill={E.maroon} style={{ fontFamily: SERIF, fontSize: name.length > 18 ? 14 : 17, fontWeight: 700 }}>{name}</text>
      {wording.jurisdictionLine !== null && wording.jurisdictionLine !== "" && (
        <text x="100" y="122" textAnchor="middle" fill={E.maroon} style={{ fontFamily: "'Geist', sans-serif", fontSize: 7.5 }}>{wording.jurisdictionLine.slice(0, 40)}</text>
      )}
      {facts.map((line, i) => (
        <text key={line} x="100" y={136 + i * 11} textAnchor="middle" fill={E.maroon} style={{ fontFamily: "'Geist', sans-serif", fontSize: 8.5 }}>{line}</text>
      ))}
      {wording.officeLine !== null && wording.officeLine !== "" && (
        <text x="100" y={136 + facts.length * 11} textAnchor="middle" fill={E.maroon} style={{ fontFamily: "'Geist', sans-serif", fontSize: 7.2 }}>{wording.officeLine.slice(0, 40)}</text>
      )}
    </svg>
  );
}

/** A typed signature as a picture, on a clear background, in the italic face a typed signature is shown in. */
export function typedSignaturePng(text: string): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Your typed signature could not be drawn here. Draw it or upload a picture instead.");
  const font = "italic 72px 'Noto Sans', Georgia, serif";
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + 40;
  canvas.width = Math.min(1400, Math.max(200, width));
  canvas.height = 140;
  const draw = canvas.getContext("2d");
  if (draw === null) throw new Error("Your typed signature could not be drawn here. Draw it or upload a picture instead.");
  draw.font = font;
  draw.fillStyle = "#0B1F44";
  draw.textBaseline = "middle";
  draw.fillText(text, 20, 72, canvas.width - 40);
  const url = canvas.toDataURL("image/png");
  return url.slice(url.indexOf(",") + 1);
}

/** What a captured signature saves as: a PNG, raw base64. */
export function signaturePngOf(value: SignatureValue): string | null {
  if (value.method === "drawn") return value.base64;
  if (value.method === "typed") return value.text.trim() === "" ? null : typedSignaturePng(value.text.trim());
  return null;
}

function Fact({ icon: Icon, title, text, wide = false }: { icon: ComponentType<LucideProps>; title: string; text: string; wide?: boolean }) {
  return (
    <div className={wide ? "ns-fact wide" : "ns-fact"}>
      <span aria-hidden="true"><Icon size={15} /></span>
      <div style={{ minWidth: 0 }}><b>{title}</b><small>{text}</small></div>
    </div>
  );
}

export function NotarySealPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [captured, setCaptured] = useState<SignatureValue | null>(null);
  const [wording, setWording] = useState<{ name: string; jurisdictionLine: string; officeLine: string } | null>(null);
  const [savingSeal, setSavingSeal] = useState(false);
  const alive = useRef(true);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    Promise.all([
      realNotaryApplicationsService.read(), realEnotarySessionsService.signature(),
      Promise.resolve(realEnotarySessionsService.seal()).catch(() => null),
    ]).then(
      ([view, signature, seal]) => {
        if (!alive.current) return;
        if (view === null) { setLoaded({ kind: "off" }); return; }
        setLoaded({ kind: "ready", application: view.application, signature, seal: seal ?? null });
        setWording({
          name: seal?.sealName ?? view.application?.legalName ?? "",
          jurisdictionLine: seal?.jurisdictionLine ?? view.application?.notarialJurisdiction ?? "",
          officeLine: seal?.officeLine ?? "",
        });
      },
      () => { if (alive.current) setLoaded({ kind: "error" }); },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); load(); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;
  const { application, signature, seal } = loaded;
  const words = wording ?? { name: application?.legalName ?? "", jurisdictionLine: application?.notarialJurisdiction ?? "", officeLine: "" };
  const preview: SealWording = { name: words.name, jurisdictionLine: words.jurisdictionLine.trim() === "" ? null : words.jurisdictionLine, officeLine: words.officeLine.trim() === "" ? null : words.officeLine };
  const sealChanged = seal === null || !seal.customised
    ? words.name.trim() !== (application?.legalName ?? "").trim() || words.officeLine.trim() !== "" || words.jurisdictionLine.trim() !== (application?.notarialJurisdiction ?? "").trim()
    : words.name.trim() !== seal.sealName || words.jurisdictionLine.trim() !== (seal.jurisdictionLine ?? "") || words.officeLine.trim() !== (seal.officeLine ?? "");
  const notaryName = (seal?.sealName ?? application?.legalName ?? "").trim();
  const newPng = (() => { try { return captured === null ? null : signaturePngOf(captured); } catch { return null; } })();
  const shown = newPng !== null ? `data:image/png;base64,${newPng}` : signature !== null ? `data:${signature.mediaType};base64,${signature.image}` : null;

  const saveSeal = async () => {
    setProblem(null); setSaid(null); setSavingSeal(true);
    try {
      const next = await withProcess("enotary-seal-save", "", () => realEnotarySessionsService.saveSeal({
        sealName: words.name, jurisdictionLine: words.jurisdictionLine.trim() === "" ? null : words.jurisdictionLine,
        officeLine: words.officeLine.trim() === "" ? null : words.officeLine,
      }));
      if (!alive.current) return;
      setLoaded({ kind: "ready", application, signature, seal: next });
      setWording({ name: next.sealName, jurisdictionLine: next.jurisdictionLine ?? "", officeLine: next.officeLine ?? "" });
      setSaid("Your seal is saved. Documents you notarize from now on carry it as shown.");
    } catch (error) {
      if (alive.current) setProblem(describeSessionError(error));
    } finally {
      if (alive.current) setSavingSeal(false);
    }
  };

  const saveSignature = async () => {
    if (captured === null) return;
    setProblem(null); setSaid(null);
    try {
      const png = signaturePngOf(captured);
      if (png === null) { setProblem("Draw, type or upload your signature first."); return; }
      const next = await withProcess("enotary-signature-save", "", () => realEnotarySessionsService.saveSignature("image/png", png));
      if (!alive.current) return;
      setLoaded({ kind: "ready", application, signature: next, seal });
      setCaptured(null);
      setSaid("Your signature is saved. It is drawn on each document you notarize, where you drop it.");
    } catch (error) {
      if (alive.current) setProblem(error instanceof Error && !("status" in error) ? error.message : describeSessionError(error));
    }
  };
  const remove = async () => {
    setProblem(null); setSaid(null);
    try {
      await withProcess("enotary-signature-remove", "", () => realEnotarySessionsService.removeSignature());
      if (!alive.current) return;
      setLoaded({ kind: "ready", application, signature: null, seal });
      setSaid("Your signature picture was removed. Documents you notarize from now on carry no signature picture.");
    } catch (error) {
      if (alive.current) setProblem(describeSessionError(error));
    }
  };

  return (
    <EnotaryCaseFrame
      tone="attorney" eyebrow="Notary desk" title="Seal and Signature"
      lead="Your seal is drawn from your commission. Your signature is a picture you save once. Both are placed where you drop them when you notarize a document."
      back={{ to: "/app/enotary/desk", label: "All requests" }}
    >
      <style>{STYLES}</style>
      {problem !== null && <Notice icon={Trash2} tone="danger">{problem}</Notice>}
      {said !== null && <div role="status" style={{ ...GF, margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: E.ok, display: "flex", gap: 8, alignItems: "center" }}><CheckCircle2 size={16} aria-hidden /> {said}</div>}

      <RecordCard icon={Stamp} title="Your Seal" testId="seal-panel"
        badge={seal?.customised === true ? { icon: BadgeCheck, label: "Set by you", tone: "info" } : { icon: CheckCircle2, label: "Generated from commission", tone: "ok" }}>
        <div className="ns-seal">
          <div className="ns-specimen">
            <SealPreview wording={preview} application={application} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: E.quiet }}>SEAL SPECIMEN</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0, fontFamily: SERIF, fontSize: 19, color: E.navy }}>How your seal appears on a notarized document</h4>
            <p style={{ ...bodyText, margin: "6px 0 0" }}>Your seal is drawn automatically from your approved application. These details are stamped on every document you notarize:</p>
            <div className="ns-facts">
              <Fact icon={User} title="Your name" text={words.name.trim() === "" ? "As on your commission" : words.name.trim()} />
              <Fact icon={IdCard} title="Commission number" text={application?.commissionNo !== undefined && application.commissionNo !== "" ? application.commissionNo : "Unique to you"} />
              <Fact icon={CalendarClock} title="Commission end date" text={application?.commissionValidUntil !== undefined && application.commissionValidUntil !== "" ? application.commissionValidUntil : "Expiry of your term"} />
              <Fact icon={Hash} title="Roll number" text={application?.rollNo !== undefined && application.rollNo !== "" ? application.rollNo : "Roll of Attorneys"} />
              <Fact icon={BookOpen} title="Register place of the entry" text="Where the notarial act is recorded: document, page, book and series" wide />
            </div>
            <div className="ns-callout">
              <ShieldCheck size={17} aria-hidden style={{ flex: "0 0 auto", marginTop: 1, color: E.navy }} />
              <span>Your seal is made only from your approved application, and it is yours. <strong style={{ color: E.ink }}>LAGDA&rsquo;s own mark never stands in for it.</strong></span>
            </div>
          </div>
        </div>

        <div className="ns-edit" data-testid="seal-edit">
          <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: E.navy, display: "flex", alignItems: "center", gap: 8 }}><PenLine size={16} aria-hidden /> How your seal reads</h4>
          <p style={{ ...hintStyle, margin: "0 0 14px" }}>
            You may set the name as it is printed on your seal and its two lines. Your commission number, its end and your roll number come from your approved
            application and cannot be changed here; to change them, update your application.
          </p>
          <TextField label="Name on the seal" value={words.name} required maxLength={80} placeholder="e.g. Atty. Juan M. Dela Cruz"
            onChange={value => { setWording({ ...words, name: value }); }} hint="As it appears on your notarial commission." />
          <div className="ns-edit-grid">
            <TextField label="Jurisdiction line (optional)" value={words.jurisdictionLine} maxLength={120} placeholder="e.g. For Naga City and Camarines Sur"
              onChange={value => { setWording({ ...words, jurisdictionLine: value }); }} />
            <TextField label="Office line (optional)" value={words.officeLine} maxLength={120} placeholder="e.g. Dela Cruz Law Office, Naga City"
              onChange={value => { setWording({ ...words, officeLine: value }); }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <ActionButton icon={Save} disabled={savingSeal || words.name.trim() === "" || !sealChanged} onClick={() => { void saveSeal(); }}>
              {savingSeal ? "Saving…" : "Save my seal"}
            </ActionButton>
          </div>
        </div>
      </RecordCard>

      <RecordCard icon={PenLine} title="Your Signature" testId="signature-panel"
        badge={signature !== null ? { icon: CheckCircle2, label: "Saved", tone: "ok" } : { icon: Clock, label: "Not yet saved", tone: "warn" }}>
        <div className="ns-sign">
          <div style={{ minWidth: 0 }}>
            <span className="ns-label">{signature === null ? "Make your signature" : "Replace your signature"}</span>
            <SignatureCapture label="Signature" purpose="signature" value={captured} onChange={setCaptured} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span className="ns-label">Preview on a document</span>
            <div className="ns-paper" data-testid="signature-preview">
              <div style={{ minHeight: 96, display: "grid", placeItems: "center" }}>
                {shown !== null
                  ? <img data-testid="signature-image" src={shown} alt={newPng !== null ? "Your new signature" : "Your saved signature"} style={{ maxWidth: "100%", maxHeight: 90, objectFit: "contain" }} />
                  : <span style={{ display: "grid", justifyItems: "center", gap: 6, color: E.faint, fontSize: 13 }}><PenLine size={22} aria-hidden /> Your signature will appear here</span>}
              </div>
              <div style={{ borderTop: `1.5px solid ${E.ink}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: E.text }}>
                <span>Notary Public</span><span style={{ textAlign: "right", overflowWrap: "anywhere" }}>{notaryName === "" ? "Your name" : notaryName}</span>
              </div>
            </div>
            {signature !== null && newPng === null && <p style={{ ...hintStyle, margin: "8px 0 0" }}>Saved. Only you can see this picture.</p>}
            {newPng !== null && <p style={{ ...hintStyle, margin: "8px 0 0" }}>Not saved yet. Save it to use it on the documents you notarize.</p>}
          </div>
        </div>
        <div className="ns-foot">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: E.quiet }}><Lock size={14} aria-hidden /> Saved once to your notary profile. You can replace it at any time.</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {signature !== null && <ActionButton kind="secondary" icon={Trash2} onClick={() => { void remove(); }}>Remove it</ActionButton>}
            <ActionButton icon={Save} disabled={newPng === null} onClick={() => { void saveSignature(); }}>Save my signature</ActionButton>
          </div>
        </div>
      </RecordCard>
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}
