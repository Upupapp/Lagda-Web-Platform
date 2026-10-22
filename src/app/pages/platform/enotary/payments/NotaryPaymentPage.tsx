// /app/enotary/payment — the notary's own payment QR.
//
// The notary uploads the QR their bank or e-wallet app shows for receiving money
// (a standing QR Ph code). The page reads the text out of the picture and sends
// that text; the server checks it is a payment code and reads the payee from it.
// The picture is never uploaded. A client who owes the notary's fee sees this QR,
// drawn afresh, and pays the notary directly. LAGDA never touches the money.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, ArrowLeft, QrCode, Trash2, Upload } from "lucide-react";
import { ActionButton, GF, Notice, T } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  describePaymentError, errorStatus, realEnotaryInvitationsService, type PaymentProfile,
} from "../../../../services/real/enotary-invitations.service";
import { E, EnotaryFrame } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { Panel, PanelTitle, bodyText, labelStyle, hintStyle } from "../onramp-ui";
import { PaymentQr } from "./PaymentQr";
import { QR_PICTURE_TYPES, QrPictureError, decodeQrPicture, qrPictureProblemText } from "./payment-qr";
import { withProcess } from "../../../../config/process-screens";

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "ready"; profile: PaymentProfile | null };

export function NotaryPaymentPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const alive = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    realEnotaryInvitationsService.paymentProfile().then(
      profile => { if (alive.current) setLoaded({ kind: "ready", profile }); },
      error => { if (alive.current) setLoaded(errorStatus(error) === 404 ? { kind: "off" } : { kind: "error" }); },
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

  const { profile } = loaded;

  const pick = async (file: File | undefined) => {
    if (file === undefined) return;
    setWorking(true);
    setProblem(null);
    setSaid(null);
    try {
      const payload = await decodeQrPicture(file);
      const saved = await withProcess("enotary-qr-save", "", () => realEnotaryInvitationsService.savePaymentProfile(payload), describePaymentError);
      if (!alive.current) return;
      setLoaded({ kind: "ready", profile: saved });
      setSaid(`Saved. Clients will be asked to pay ${saved.payeeName}.`);
    } catch (error) {
      if (alive.current) setProblem(error instanceof QrPictureError ? qrPictureProblemText(error.problem) : describePaymentError(error));
    } finally {
      if (alive.current) setWorking(false);
      if (input.current !== null) input.current.value = "";
    }
  };

  const remove = () => {
    confirm({
      title: "Remove your payment QR?",
      body: "Requests you already accepted keep the QR they were accepted with. You will need to upload a QR again before you can ask for a fee on a new request.",
      confirmLabel: "Remove the QR",
      cancelLabel: "Keep it",
      onConfirm: async () => {
        setWorking(true);
        setProblem(null);
        try {
          await withProcess("enotary-qr-remove", "", () => realEnotaryInvitationsService.removePaymentProfile(), describePaymentError);
          if (!alive.current) return;
          setLoaded({ kind: "ready", profile: null });
          setSaid("Your payment QR was removed.");
        } catch (error) {
          if (alive.current) setProblem(describePaymentError(error));
        } finally {
          if (alive.current) setWorking(false);
        }
      },
    });
  };

  return (
    <EnotaryFrame tone="attorney" badge="Notary" eyebrow="Notary desk" description="The QR clients scan to pay your fee.">
      {confirmDialog}
      <p style={{ ...GF, margin: "0 0 14px" }}>
        <Link to="/app/enotary/desk" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, color: T.ink, fontWeight: 700, fontSize: 14 }}>
          <ArrowLeft size={16} aria-hidden /> Back to the desk
        </Link>
      </p>
      {said !== null && <div role="status" style={{ ...GF, margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: E.ok }}>{said}</div>}
      {problem !== null && <Notice icon={AlertTriangle} tone="danger">{problem}</Notice>}

      <Panel tone="maroon" testId="payment-how">
        <PanelTitle>How you are paid</PanelTitle>
        <p style={{ ...bodyText, margin: 0 }}>
          You name a fee when you accept a request. The client scans your QR with their bank or e-wallet app and pays you directly.
          They then send LAGDA the transfer&rsquo;s reference number, you check your own bank or e-wallet app, and you confirm.
          LAGDA never holds or moves the money.
        </p>
      </Panel>

      {profile !== null ? (
        <Panel testId="payment-profile">
          <PanelTitle>Your payment QR</PanelTitle>
          <p style={{ ...bodyText, margin: "0 0 14px" }}>
            Clients are asked to pay <strong data-testid="payee-name">{profile.payeeName}</strong>
            {profile.payeeCity !== null && <> · {profile.payeeCity}</>}. Check that this is you: it is read out of your QR, not typed.
          </p>
          <PaymentQr payload={profile.qrPayload} payeeName={profile.payeeName} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
            <ActionButton icon={Upload} kind="secondary" disabled={working} onClick={() => { input.current?.click(); }}>Replace the QR</ActionButton>
            <ActionButton icon={Trash2} kind="danger" disabled={working} onClick={remove}>Remove</ActionButton>
          </div>
        </Panel>
      ) : (
        <Panel testId="payment-empty">
          <PanelTitle>Upload your payment QR</PanelTitle>
          <p style={{ ...bodyText, margin: "0 0 12px" }}>
            Open your bank or e-wallet app, find the QR for receiving money, and upload a picture or screenshot of it. Use your
            standing QR (the one that lets the payer type any amount), not a QR for one fixed amount.
          </p>
          <ActionButton icon={QrCode} disabled={working} onClick={() => { input.current?.click(); }}>{working ? "Reading the QR…" : "Choose a picture"}</ActionButton>
        </Panel>
      )}

      <label htmlFor="payment-qr-file" style={{ ...labelStyle, position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        Picture of your payment QR
      </label>
      <input
        id="payment-qr-file" ref={input} data-testid="payment-qr-file" type="file" accept={QR_PICTURE_TYPES.join(",")}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} tabIndex={-1}
        onChange={event => { void pick(event.target.files?.[0]); }}
      />
      <p style={hintStyle}>
        The picture is read in your browser and is not uploaded; only the code&rsquo;s text is sent. Keep your QR to yourself: anyone
        can pay to it, but only you can see your account.
      </p>
    </EnotaryFrame>
  );
}
