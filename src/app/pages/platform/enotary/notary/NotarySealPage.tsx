// /app/enotary/seal — the notary's seal and signature.
//
// The seal is not uploaded: it is drawn from the commission on the notary's approved application, so it cannot say
// anything the application does not, and a new commission makes a new seal. The signature is a small picture the notary
// saves once; it is drawn on each document they notarize, where they drop it. Only its owner can see the picture.

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { ActionButton, GF, Notice } from "../../../../components/system/design-system";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { realNotaryApplicationsService, type NotaryApplication } from "../../../../services/real/notary-applications.service";
import { describeSessionError, realEnotarySessionsService, type NotarySignature } from "../../../../services/real/enotary-sessions.service";
import { withProcess } from "../../../../config/process-screens";
import { EnotaryCaseFrame } from "../CaseFrame";
import { E, SERIF } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, PanelTitle, bodyText, hintStyle, labelStyle } from "../onramp-ui";

export const SIGNATURE_MAX_BYTES = 300_000;

type Loaded = { kind: "loading" } | { kind: "error" } | { kind: "off" } | { kind: "ready"; application: NotaryApplication | null; signature: NotarySignature | null };

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve((typeof reader.result === "string" ? reader.result : "").replace(/^data:[^,]*,/, "")); };
    reader.onerror = () => { reject(new Error("The file could not be read.")); };
    reader.readAsDataURL(file);
  });
}

/** The seal as it will be drawn: from the commission, and nothing else. */
export function SealPreview({ application }: { application: NotaryApplication | null }) {
  const lines = [
    application?.legalName ?? "Your name",
    application === null || application.commissionNo === "" ? null : `Commission No. ${application.commissionNo}`,
    application === null || application.commissionValidUntil === "" ? null : `Until ${application.commissionValidUntil}`,
    application === null || application.rollNo === "" ? null : `Roll No. ${application.rollNo}`,
  ].filter((line): line is string => line !== null);
  return (
    <div data-testid="seal-preview" role="img" aria-label={`Your seal: Notary Public, ${lines.join(", ")}`}
      style={{ width: 168, height: 168, borderRadius: "50%", border: `3px solid ${E.maroon}`, outline: `1px solid ${E.maroon}`, outlineOffset: -9, display: "grid", placeItems: "center", textAlign: "center", color: E.maroon, background: "#FFFFFF", padding: 18, boxSizing: "border-box" }}>
      <div style={{ fontFamily: SERIF, lineHeight: 1.25 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em" }}>NOTARY PUBLIC</div>
        <div style={{ fontSize: 13, fontWeight: 700, margin: "3px 0" }}>{lines[0]}</div>
        {lines.slice(1).map(line => <div key={line} style={{ fontSize: 10 }}>{line}</div>)}
      </div>
    </div>
  );
}

export function NotarySealPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const alive = useRef(true);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    Promise.all([realNotaryApplicationsService.read(), realEnotarySessionsService.signature()]).then(
      ([view, signature]) => { if (alive.current) setLoaded(view === null ? { kind: "off" } : { kind: "ready", application: view.application, signature }); },
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
  const { application, signature } = loaded;

  const fileProblem = picked === null ? null
    : picked.type !== "image/png" && picked.type !== "image/jpeg" ? "Choose a PNG or JPEG picture."
      : picked.size > SIGNATURE_MAX_BYTES ? `The picture is at most ${String(SIGNATURE_MAX_BYTES / 1000)} KB.`
        : picked.size === 0 ? "The file is empty." : null;

  const save = async () => {
    if (picked === null || fileProblem !== null) return;
    setProblem(null); setSaid(null);
    try {
      const image = await readBase64(picked);
      const next = await withProcess("enotary-signature-save", "", () => realEnotarySessionsService.saveSignature(picked.type as NotarySignature["mediaType"], image));
      if (!alive.current) return;
      setLoaded({ kind: "ready", application, signature: next });
      setPicked(null);
      if (input.current !== null) input.current.value = "";
      setSaid("Your signature is saved. It is drawn on each document you notarize, where you drop it.");
    } catch (error) {
      if (alive.current) setProblem(describeSessionError(error));
    }
  };
  const remove = async () => {
    setProblem(null); setSaid(null);
    try {
      await withProcess("enotary-signature-remove", "", () => realEnotarySessionsService.removeSignature());
      if (!alive.current) return;
      setLoaded({ kind: "ready", application, signature: null });
      setSaid("Your signature picture was removed. Documents you notarize from now on carry no signature picture.");
    } catch (error) {
      if (alive.current) setProblem(describeSessionError(error));
    }
  };

  return (
    <EnotaryCaseFrame
      tone="attorney" eyebrow="Notary desk" title="Seal and signature"
      lead="Your seal is drawn from your commission. Your signature is a picture you save once. Both are placed where you drop them when you notarize a document."
      back={{ to: "/app/enotary/desk", label: "All requests" }}
    >
      {problem !== null && <Notice icon={Trash2} tone="danger">{problem}</Notice>}
      {said !== null && <div role="status" style={{ ...GF, fontSize: 14, fontWeight: 600, color: E.ok }}>{said}</div>}
      <Panel testId="seal-panel" tone="plain">
        <PanelTitle>Your seal</PanelTitle>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <SealPreview application={application} />
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <p style={bodyText}>
              This is how your seal is drawn on a notarized document: your name, your commission number and the date it ends, your roll number, and the register
              place of the entry. It is made only from your approved application, and it is yours. LAGDA&rsquo;s own mark never stands in for it.
            </p>
            {application === null || application.commissionNo === "" ? <p style={hintStyle}>Finish your application to see your commission on it.</p> : null}
          </div>
        </div>
      </Panel>
      <Panel testId="signature-panel" tone="plain">
        <PanelTitle>Your signature</PanelTitle>
        {signature !== null && (
          <div style={{ margin: "0 0 12px" }}>
            <img data-testid="signature-image" src={`data:${signature.mediaType};base64,${signature.image}`} alt="Your saved signature"
              style={{ display: "block", maxWidth: 240, maxHeight: 100, background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 8, padding: 8 }} />
            <p style={{ ...hintStyle, margin: "6px 0 0" }}>Saved. Only you can see this picture.</p>
          </div>
        )}
        <label htmlFor="signature-file" style={labelStyle}>{signature === null ? "Picture of your signature" : "Replace your signature"}</label>
        <input id="signature-file" ref={input} type="file" accept="image/png,image/jpeg" onChange={event => { setPicked(event.target.files?.[0] ?? null); }}
          aria-invalid={fileProblem !== null ? true : undefined} style={{ display: "block", maxWidth: "100%", margin: "0 0 6px" }} />
        <p style={hintStyle}>A PNG or JPEG of up to 300 KB, ideally your signature in dark ink on a white or clear background.</p>
        {fileProblem !== null && <p role="alert" style={{ ...GF, color: "#B0182B", fontSize: 13.5 }}>{fileProblem}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <ActionButton icon={Upload} disabled={picked === null || fileProblem !== null} onClick={() => { void save(); }}>Save my signature</ActionButton>
          {signature !== null && <ActionButton kind="secondary" icon={Trash2} onClick={() => { void remove(); }}>Remove it</ActionButton>}
        </div>
      </Panel>
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}
