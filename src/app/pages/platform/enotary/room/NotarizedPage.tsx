// What a notarized request shows, as the 13 October pages lay it out: the notarized document with its preview, how it
// was sealed (verification code and QR, fingerprint, timestamp, whether the seal still holds), a way to check a copy
// of the file, and the certified true copies.
//
// Everything here is the server's: the code, the fingerprint and the times. The seal's state is not assumed; it is the
// answer of the public check for this code, compared with the fingerprint of the file the server holds. A copy is
// compared in this browser: the file is not uploaded.

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Copy, ShieldAlert, ShieldCheck } from "lucide-react";
import { ActionButton, GF } from "../../../../components/system/design-system";
import { realEnotarySessionsService, sha256Hex, type CertifiedCopy, type Session } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { Panel, PanelTitle, bodyText, labelStyle } from "../onramp-ui";
import { qrDataUrl } from "../payments/payment-qr";
import { stampLabel } from "../requests/expiry";
import { CopiesPanel } from "./CopiesPanel";
import { PdfView } from "./room-bits";

type Seal = "checking" | "valid" | "invalid";

const row = (label: string, value: React.ReactNode, testId?: string) => (
  <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 170px) 1fr", gap: 12, padding: "9px 0", borderTop: `1px solid ${E.line}`, fontSize: 14.5 }}>
    <dt style={{ color: E.quiet, fontWeight: 700 }}>{label}</dt>
    <dd data-testid={testId} style={{ margin: 0, color: E.ink, overflowWrap: "anywhere" }}>{value}</dd>
  </div>
);

export function NotarizedPage({ session, onCopies }: { session: Session; onCopies?: (copies: readonly CertifiedCopy[]) => void }) {
  const done = session.notarized;
  const act = session.act;
  const [seal, setSeal] = useState<Seal>("checking");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [compared, setCompared] = useState<{ name: string; match: boolean } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const code = done?.code ?? null;
  const fingerprint = done?.sha256 ?? null;
  const verifyUrl = done?.verifyUrl ?? null;

  useEffect(() => {
    if (code === null || fingerprint === null) return;
    let alive = true;
    setSeal("checking");
    Promise.resolve(realEnotarySessionsService.verify(code)).then(
      answer => { if (alive) setSeal(answer !== undefined && answer.state === "notarization" && answer.notarizedSha256 === fingerprint ? "valid" : "invalid"); },
      () => { if (alive) setSeal("invalid"); },
    );
    return () => { alive = false; };
  }, [code, fingerprint]);

  useEffect(() => {
    if (verifyUrl === null) return;
    let alive = true;
    qrDataUrl(verifyUrl).then(url => { if (alive) setQr(url); }, () => undefined);
    return () => { alive = false; };
  }, [verifyUrl]);

  if (done === null || act === null) return null;
  const fileName = session.document?.name.replace(/\.pdf$/i, "") ?? "document";
  const register = `Doc. No. ${String(act.docNo ?? "")}; Page No. ${String(act.pageNo ?? "")}; Book No. ${act.bookNo ?? ""}; Series of ${String(act.series ?? "")}.`;
  const hasPlace = act.docNo !== undefined;

  const copy = () => {
    void navigator.clipboard.writeText(done.sha256).then(() => { setCopied(true); setTimeout(() => { setCopied(false); }, 2000); }, () => undefined);
  };
  const compare = async (file: File | undefined) => {
    if (file === undefined) return;
    setCompared({ name: file.name, match: (await sha256Hex(file)) === done.sha256 });
  };

  return (
    <>
      <Panel tone="sky" testId="notarized-panel">
        <PanelTitle>Notarized document</PanelTitle>
        <dl style={{ margin: "0 0 12px" }}>
          {row("Document", session.document?.name ?? "Document")}
          {row("Notarial act", act.typeLabel)}
          {row("Notary", act.notaryName)}
          {row("Notarized on", stampLabel(act.at))}
          {row("Place", act.place)}
          {row("Notarial register", hasPlace ? register : `Entry ${act.registerRef}`, "notarized-facts")}
          {row("Verification ID", <strong data-testid="verify-code" style={{ letterSpacing: "0.04em", color: E.navy }}>{done.code}</strong>)}
        </dl>
        <PdfView load={() => realEnotarySessionsService.notarized(session.id)} fileKey={done.sha256} name={`${fileName} (notarized).pdf`} height={520} />
      </Panel>

      <Panel testId="seal-panel">
        <PanelTitle>Digitally sealed</PanelTitle>
        <p style={{ ...bodyText, fontSize: 13.5 }}>This document was sealed when it was notarized. Any change to the file after that will be detected.</p>
        <div className="eno-seal-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", alignItems: "start" }}>
          <dl style={{ margin: 0, minWidth: 0 }}>
            {row("Sealed on", stampLabel(act.at))}
            {row("Sealed by", `${act.notaryName}, Notary Public. LAGDA eNotary`)}
            {row("Document fingerprint (SHA-256)", (
              <span style={{ display: "block" }}>
                <span data-testid="fingerprint" style={{ display: "block", fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 12.5, wordBreak: "break-all" }}>{done.sha256}</span>
                <button type="button" onClick={copy} style={{ ...GF, marginTop: 6, minHeight: 36, padding: "0 12px", borderRadius: 8, border: `1px solid ${E.line}`, background: "#FFFFFF", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Copy size={14} aria-hidden /> {copied ? "Copied" : "Copy"}
                </button>
              </span>
            ))}
            {row("Timestamp", `Recorded by LAGDA eNotary, ${stampLabel(act.at)}`)}
            {row("Status", (
              <span data-testid="seal-status" data-state={seal} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700,
                color: seal === "valid" ? E.ok : seal === "invalid" ? "#B0182B" : E.quiet }}>
                {seal === "valid" ? <><ShieldCheck size={16} aria-hidden /> Seal valid</>
                  : seal === "invalid" ? <><ShieldAlert size={16} aria-hidden /> The seal could not be confirmed</> : "Checking the seal…"}
              </span>
            ))}
          </dl>
          <div style={{ textAlign: "center", padding: 12, border: `1px solid ${E.line}`, borderRadius: 12, background: "#FFFFFF" }}>
            {qr !== null
              ? <img data-testid="verify-qr" src={qr} alt={`QR code that opens the check of ${done.code}`} width={150} height={150} style={{ display: "block", margin: "0 auto", maxWidth: "100%", height: "auto" }} />
              : <div role="status" style={{ ...GF, height: 150, display: "grid", placeItems: "center", color: E.quiet, fontSize: 13 }}>Drawing the QR…</div>}
            <p style={{ ...GF, margin: "8px 0 4px", fontSize: 12.5, color: E.quiet }}>Verification code of this document</p>
            <a href={done.verifyUrl} style={{ ...GF, fontWeight: 700, fontSize: 13.5, color: E.skyDeep }}>Verify this document</a>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, border: `1px dashed ${E.line}`, background: E.wash }}>
          <p style={{ ...GF, margin: "0 0 4px", fontWeight: 800, color: E.navy, fontSize: 14.5 }}>Check a copy of this document</p>
          <p style={{ ...bodyText, fontSize: 13.5, margin: "0 0 10px" }}>
            Choose the PDF you downloaded or were sent. It is compared with the sealed original on this device. The file is not uploaded.
          </p>
          <label htmlFor="check-copy" style={labelStyle}>PDF to check</label>
          <input id="check-copy" ref={picker} type="file" accept="application/pdf,.pdf" onChange={event => { void compare(event.target.files?.[0]); }} style={{ display: "block", maxWidth: "100%" }} />
          {compared !== null && (
            <p role="status" data-testid="check-result" data-match={String(compared.match)} style={{ ...GF, margin: "10px 0 0", fontWeight: 700, fontSize: 14, display: "flex", gap: 6, alignItems: "center", color: compared.match ? E.ok : "#B0182B" }}>
              {compared.match ? <><BadgeCheck size={16} aria-hidden /> {compared.name} is the same file as the sealed original.</>
                : <><ShieldAlert size={16} aria-hidden /> {compared.name} is not the same file as the sealed original.</>}
            </p>
          )}
          {compared !== null && (
            <div style={{ marginTop: 8 }}><ActionButton kind="secondary" onClick={() => { setCompared(null); if (picker.current !== null) picker.current.value = ""; }}>Check another file</ActionButton></div>
          )}
        </div>
      </Panel>

      <CopiesPanel sessionId={session.id} role={session.role} onCopies={onCopies} />
    </>
  );
}
