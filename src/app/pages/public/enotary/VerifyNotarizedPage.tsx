// /verify-notarized?code=LAGDA-NOT-XXXX-XXXX — anyone may check a verification
// code from a LAGDA eNotary document or certified true copy.
//
// What the server says is small on purpose: the kind of act, the notary, the
// register entry, the time, and the fingerprints (SHA-256) of the files. It
// never says who the client was. A person who holds the file may compare its
// fingerprint here; the file is read in this browser and is not uploaded.

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, ShieldAlert, ShieldCheck, Search } from "lucide-react";
import { ActionButton, GF, Notice } from "../../../components/system/design-system";
import { realEnotarySessionsService, sha256Hex, type Verification } from "../../../services/real/enotary-sessions.service";
import { E, EnotaryFrame, EnotaryHeading } from "../../platform/enotary/EnotaryChrome";
import { Panel, PanelTitle, TextField, bodyText, fieldStyle, labelStyle } from "../../platform/enotary/onramp-ui";
import { stampLabel } from "../../platform/enotary/requests/expiry";

type Result = { kind: "idle" } | { kind: "loading" } | { kind: "error" } | { kind: "done"; answer: Verification };

export function VerifyNotarizedPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("code") ?? "";
  const [code, setCode] = useState(initial);
  const [result, setResult] = useState<Result>({ kind: "idle" });

  const check = async (value: string) => {
    if (value.trim() === "") return;
    setResult({ kind: "loading" });
    try {
      setResult({ kind: "done", answer: await realEnotarySessionsService.verify(value.trim()) });
    } catch {
      setResult({ kind: "error" });
    }
  };

  useEffect(() => {
    if (initial.trim() !== "") void check(initial);
    // Only the first load reads the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setParams(code.trim() === "" ? {} : { code: code.trim() }, { replace: true });
    void check(code);
  };

  return (
    <EnotaryFrame tone="neutral" eyebrow="LAGDA eNotary" description="Check a verification code from a notarized document or a certified true copy.">
      <EnotaryHeading>Check a notarization</EnotaryHeading>
      <form onSubmit={submit} style={{ margin: "0 0 18px" }}>
        <TextField label="Verification code" value={code} onChange={setCode} maxLength={40} autoComplete="off" placeholder="LAGDA-NOT-XXXX-XXXX" hint="Printed on the certificate page of the document." />
        <ActionButton type="submit" icon={Search} disabled={code.trim() === "" || result.kind === "loading"}>{result.kind === "loading" ? "Checking…" : "Check the code"}</ActionButton>
      </form>

      {result.kind === "error" && <Notice icon={ShieldAlert} tone="danger">The check could not be made right now. Try again in a minute.</Notice>}
      {result.kind === "done" && result.answer.state === "unknown" && (
        <Notice icon={ShieldAlert} tone="warn"><span data-testid="verify-unknown">No notarization or certified copy matches that code. Check the code for typing mistakes. If the code is right, treat the document as unverified.</span></Notice>
      )}
      {result.kind === "done" && result.answer.state === "notarization" && <Notarization answer={result.answer} />}
      {result.kind === "done" && result.answer.state === "ctc" && <CertifiedCopyResult answer={result.answer} />}

      <p style={{ ...bodyText, fontSize: 12.5, color: E.quiet, marginTop: 22 }}>
        LAGDA eNotary is a pilot and is subject to Supreme Court accreditation and applicable rules. This check confirms that LAGDA recorded the act below;
        it does not replace a notary&rsquo;s own register.
      </p>
    </EnotaryFrame>
  );
}

function Fingerprint({ label, value }: { label: string; value: string }) {
  return <p style={{ ...bodyText, fontSize: 13, margin: "0 0 6px", wordBreak: "break-all" }}><strong>{label}</strong><br />{value}</p>;
}

function Notarization({ answer }: { answer: Extract<Verification, { state: "notarization" }> }) {
  return (
    <Panel tone="sky" testId="verify-result">
      <PanelTitle>This code is genuine</PanelTitle>
      <p style={{ ...bodyText, display: "flex", gap: 8 }}><ShieldCheck size={18} aria-hidden style={{ color: E.ok, flex: "0 0 auto", marginTop: 3 }} />
        <span data-testid="verify-facts"><strong>{answer.actLabel}</strong> before Atty. {answer.notaryName}, {stampLabel(answer.performedAt)}. Register entry <strong>{answer.registerRef}</strong>.</span>
      </p>
      <Fingerprint label="SHA-256 of the notarized document" value={answer.notarizedSha256} />
      <Fingerprint label="SHA-256 of the document before notarization" value={answer.originalSha256} />
      <Compare candidates={[["the notarized document", answer.notarizedSha256], ["the original document", answer.originalSha256]]} />
    </Panel>
  );
}

function CertifiedCopyResult({ answer }: { answer: Extract<Verification, { state: "ctc" }> }) {
  const candidates: [string, string][] = [["the notarized document", answer.notarizedSha256]];
  if (answer.copySha256 !== null) candidates.unshift(["this certified copy", answer.copySha256]);
  return (
    <Panel tone="sky" testId="verify-result">
      <PanelTitle>This code is genuine</PanelTitle>
      <p style={{ ...bodyText, display: "flex", gap: 8 }}><ShieldCheck size={18} aria-hidden style={{ color: E.ok, flex: "0 0 auto", marginTop: 3 }} />
        <span data-testid="verify-facts">A {answer.mode === "digital" ? "digital" : "printed"} certified true copy issued by Atty. {answer.notaryName}, {stampLabel(answer.issuedAt)}, of register entry <strong>{answer.registerRef}</strong> (notarization code {answer.notarizationCode}).</span>
      </p>
      {answer.copySha256 !== null && <Fingerprint label="SHA-256 of this certified copy" value={answer.copySha256} />}
      <Fingerprint label="SHA-256 of the notarized document" value={answer.notarizedSha256} />
      <Compare candidates={candidates} />
    </Panel>
  );
}

/** Reads a file here and compares its fingerprint with the ones the server gave. Nothing is uploaded. */
function Compare({ candidates }: { candidates: readonly (readonly [string, string])[] }) {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const read = async (file: File | null) => {
    setOutcome(null);
    setMatch(null);
    if (file === null) return;
    const digest = await sha256Hex(file);
    const found = candidates.find(([, value]) => value === digest);
    setMatch(found !== undefined);
    setOutcome(found !== undefined ? `This file is exactly ${found[0]}.` : "This file does not match any of the documents this code covers.");
  };
  return (
    <div style={{ marginTop: 14 }}>
      <label htmlFor="verify-file" style={labelStyle}>Compare a file you hold (optional)</label>
      <input id="verify-file" type="file" accept="application/pdf,.pdf" onChange={event => { void read(event.target.files?.[0] ?? null); }} style={{ ...fieldStyle(), padding: 8 }} />
      <p style={{ ...GF, margin: "6px 0 0", fontSize: 12.5, color: E.quiet }}>The file is read in your browser and is not uploaded.</p>
      {outcome !== null && (
        <p role="status" data-testid="verify-compare" data-match={String(match)} style={{ ...GF, margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: match === true ? E.ok : "#B0182B", display: "flex", gap: 6, alignItems: "center" }}>
          {match === true ? <CheckCircle2 size={16} aria-hidden /> : <ShieldAlert size={16} aria-hidden />} {outcome}
        </p>
      )}
    </div>
  );
}
