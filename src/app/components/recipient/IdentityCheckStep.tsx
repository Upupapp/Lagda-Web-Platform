// The identity check a sender may ask of a participant before they sign.
//
// Four stages, one at a time: Consent → Your ID → Your face → Result.
//
// ── What leaves this device ────────────────────────────────────────────────
//
// The kind of ID, whether the selfie came from the camera or a file, and that
// the participant agreed. Nothing else: the server accepts no image, no ID
// number and no name. The photos are held in memory for the previews on this
// screen and are released when they are replaced or the screen goes away.
//
// ── Test mode ──────────────────────────────────────────────────────────────
//
// No provider is connected. Where `mode` is `test` the check is SIMULATED and
// identifies nobody, so every stage carries an amber banner saying so, the
// result is headed "completed (test mode)" rather than "passed", and nothing
// on this screen calls it a verification. The "Simulated result" control
// exists only in that mode.
//
// ── The camera ─────────────────────────────────────────────────────────────
//
// Asked for only from the "Use my camera" click, never on arrival: a
// permission prompt nobody asked for is a reason to close the tab. Its tracks
// are stopped after the capture, on cancel, on leaving the stage, when the
// tab is hidden or the page is put away, and on unmount.
//
// ── Two places it runs ─────────────────────────────────────────────────────
//
// The stages are the same wherever the check is done; only what carries the
// attempt differs, and that is the TRANSPORT. On the signing page it is the
// participant's ceremony: an attempt, and a re-read of the ceremony that lets
// the page move on. On a phone that scanned the computer's QR code it is the
// hand-off link: an attempt, and nothing to move on to, so the phone says
// "done" and the computer continues by itself.
//
// `IdentityCheckStep` is the signing page's: the ceremony transport, built
// from its props. `IdentityCheckStages` takes the transport itself.

import {
  useCallback, useEffect, useId, useRef, useState,
  type CSSProperties, type DragEvent, type ReactNode, type Ref,
} from "react";
import {
  AlertTriangle, ArrowLeft, Ban, Camera, CheckCircle2, Clock, FlaskConical, IdCard, ImageUp, Loader2, Lock,
  RefreshCw, ScanFace, ShieldCheck, Smartphone, Trash2, Upload,
} from "lucide-react";
import {
  ActionButton, ActionRow, Notice, PhaseBanner, ProgressRail, GF, T, TAP, type RailStep,
} from "./signer-ui";
import { ApiError } from "../../services/api-client";
import type {
  CeremonyIdentityCheck, IdentityCheckResult, IdentityCheckSubmission,
} from "../../services/real/signing-access.service";
import {
  groupIdentityIdTypes, identityIdHasBack, IDENTITY_CHECK_VALID_NOTE, IDENTITY_CHECK_VALID_NOTE_TEST,
} from "../../models/identity-check";
import { IdentityHandoffPanel, type IdentityHandoffClient } from "./IdentityHandoffPanel";

export type { IdentityHandoffClient } from "./IdentityHandoffPanel";

export interface IdentityCheckStepProps {
  readonly identityCheck: CeremonyIdentityCheck;
  readonly documentTitle: string;
  /** Sends one attempt. Rejects with the API's error. */
  readonly submit: (input: IdentityCheckSubmission) => Promise<IdentityCheckResult>;
  /**
   * Re-reads the ceremony and lets the page move to whatever comes next.
   * Resolves to a message when the ceremony could not be read, else null.
   */
  readonly onReload: () => Promise<string | null>;
  /** Present when the page offers declining; opens the page's own decline form. */
  readonly onDecline?: () => void;
  /** How long each camera prompt stays up. */
  readonly promptMs?: number;
  /**
   * Present when the check can be continued on a phone. Offered only after
   * the participant has agreed, and never on a device that is itself a phone.
   */
  readonly handoff?: IdentityHandoffClient;
}

/** What carries the attempt, and what happens around it. */
export type IdentityCheckTransport =
  | {
      /** The participant's own signing session, on the signing page. */
      readonly kind: "ceremony";
      readonly submit: (input: IdentityCheckSubmission) => Promise<IdentityCheckResult>;
      /** Re-reads the ceremony. Resolves to a message when it could not be read, else null. */
      readonly reload: () => Promise<string | null>;
      readonly handoff?: IdentityHandoffClient;
    }
  | {
      /** A phone that opened the computer's hand-off link. */
      readonly kind: "handoff";
      readonly submit: (input: IdentityCheckSubmission) => Promise<IdentityCheckResult>;
      /** When the link runs out, by this device's clock. Null when that clock cannot be trusted. */
      readonly deadline: number | null;
      /** The link is over: expired, replaced, or no longer wanted. */
      readonly onEnded: () => void;
    };

export interface IdentityCheckStagesProps {
  readonly identityCheck: CeremonyIdentityCheck;
  readonly documentTitle: string;
  readonly transport: IdentityCheckTransport;
  readonly onDecline?: () => void;
  readonly promptMs?: number;
}

type Stage = "consent" | "id" | "face" | "result";
type Result =
  | { readonly kind: "checking" }
  | { readonly kind: "passed" }
  | { readonly kind: "failed"; readonly attemptsRemaining: number }
  | { readonly kind: "locked" };

interface Picked { readonly file: File; readonly url: string | null }
interface Selfie { readonly capture: "camera" | "upload"; readonly url: string | null; readonly name: string | null }

const STAGES: readonly RailStep[] = [
  { id: "consent", label: "Consent", short: "1" },
  { id: "id", label: "Your ID", short: "2" },
  { id: "face", label: "Your face", short: "3" },
  { id: "result", label: "Result", short: "4" },
];

const PROMPTS = [
  "Look straight at the camera",
  "Turn your head slowly to the left",
  "Blink twice",
] as const;

const ACCEPTED_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const CAMERA_REFUSED = "Camera access was not allowed. You can upload a selfie instead.";
const TEST_BANNER = "Test mode: this identity check is simulated.";

function checkImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Use a JPEG, PNG or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "This image is larger than 8 MB. Choose a smaller one.";
  if (file.size === 0) return "This file is empty. Choose another image.";
  return null;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTouchDevice(): boolean {
  try {
    if (navigator.maxTouchPoints > 0) return true;
    return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function cameraSupported(): boolean {
  try {
    const devices = navigator.mediaDevices as MediaDevices | undefined;
    return typeof devices?.getUserMedia === "function";
  } catch {
    return false;
  }
}

function describeAttemptError(error: unknown, onPhone: boolean): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  if (error.status === 0) return "Could not reach the server. Check your connection and try again.";
  // A phone has no signing session to end, and reloading there loses the link.
  if (error.status === 401 && !onPhone) return "Your signing session has ended. Open your signing link again to continue.";
  if (error.status === 403 && !onPhone) return "This action could not be verified. Reload the page and try again.";
  if (error.status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
  if (error.body?.code === "identity_check_invalid") {
    return error.body.details?.some(detail => detail.field === "idType") === true
      ? "That type of ID cannot be used here. Go back and choose another."
      : "The identity check could not be started. Check your ID and selfie, then try again.";
  }
  return "The identity check could not be completed right now. Please try again.";
}

const HIDDEN_INPUT: CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden",
  clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0, opacity: 0,
};

const SR_ONLY: CSSProperties = HIDDEN_INPUT;

const SMALL_BUTTON: CSSProperties = {
  ...GF, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  minHeight: TAP, padding: "0 14px", borderRadius: 10, background: T.surface, color: T.ink,
  border: `1px solid ${T.borderStrong}`, fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const STYLES = `
  .idc-stage { animation: idc-in 180ms ease both; }
  @keyframes idc-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .idc-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
  @media (min-width: 600px) { .idc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .idc-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .idc-drop { transition: border-color 120ms ease, background 120ms ease; }
  .idc-ring { animation-name: idc-ring; animation-timing-function: linear; animation-fill-mode: both; }
  @keyframes idc-ring { from { stroke-dashoffset: 113.1; } to { stroke-dashoffset: 0; } }
  .idc-spin { animation: idc-spin 900ms linear infinite; }
  @keyframes idc-spin { to { transform: rotate(360deg); } }
  .idc-heading:focus { outline: none; }
  .idc-heading:focus-visible { outline: 2px solid ${T.azure}; outline-offset: 4px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) {
    .idc-stage, .idc-ring, .idc-spin { animation: none; }
    .idc-ring { stroke-dashoffset: 0; }
    .idc-drop { transition: none; }
  }
`;

// ── A photo box ─────────────────────────────────────────────────────────────

function ImagePicker({
  label, optional = false, hint, picked, error, touch, capture, disabled = false, onPick, onRemove,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  picked: Picked | null;
  error: string | null;
  touch: boolean;
  capture: "environment" | "user";
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const labelId = useId(), errorId = useId(), hintId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file !== undefined) onPick(file);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    if (!disabled) take(event.dataTransfer.files);
  };
  const describedBy = [hint !== undefined ? hintId : null, error !== null ? errorId : null]
    .filter(Boolean).join(" ") || undefined;

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={describedBy} style={{ minWidth: 0 }}>
      <div id={labelId} style={{ ...GF, fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
        {label}{" "}
        {optional && <span style={{ fontWeight: 500, color: T.silver }}>(optional)</span>}
      </div>

      <input
        ref={fileRef} type="file" accept={ACCEPT_ATTRIBUTE} tabIndex={-1} disabled={disabled}
        aria-label={`${label}: choose a file`} aria-invalid={error !== null}
        aria-describedby={error !== null ? errorId : undefined}
        style={HIDDEN_INPUT}
        onChange={event => { take(event.target.files); event.target.value = ""; }}
      />
      {touch && (
        <input
          ref={cameraRef} type="file" accept={ACCEPT_ATTRIBUTE} capture={capture} tabIndex={-1} disabled={disabled}
          aria-label={`${label}: take a photo`}
          style={HIDDEN_INPUT}
          onChange={event => { take(event.target.files); event.target.value = ""; }}
        />
      )}

      {picked === null ? (
        <div
          className="idc-drop"
          onDragOver={event => { event.preventDefault(); setOver(true); }}
          onDragLeave={() => { setOver(false); }}
          onDrop={onDrop}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            minHeight: 148, padding: 14, borderRadius: 12, textAlign: "center", boxSizing: "border-box",
            border: `1.5px dashed ${error !== null ? T.danger : over ? T.azure : T.borderStrong}`,
            background: over ? T.azureWash : T.canvas,
          }}
        >
          <ImageUp size={22} aria-hidden style={{ color: T.silver }} />
          {!touch && (
            <span style={{ ...GF, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.45 }}>
              Drag a photo here, or
            </span>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}>
            {touch && (
              <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()}
                style={{ ...SMALL_BUTTON, flex: "1 1 130px" }}>
                <Camera size={15} aria-hidden /> Take a photo
              </button>
            )}
            <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()}
              style={{ ...SMALL_BUTTON, flex: touch ? "1 1 130px" : "0 1 auto" }}>
              <Upload size={15} aria-hidden /> Choose a file
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, padding: 10,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{
            borderRadius: 8, background: T.canvas, aspectRatio: "16 / 10", overflow: "hidden",
            display: "grid", placeItems: "center",
          }}>
            {picked.url !== null
              ? <img src={picked.url} alt={`${label} preview`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <IdCard size={28} aria-hidden style={{ color: T.silver }} />}
          </div>
          <div style={{ ...GF, fontSize: 12, color: T.inkSoft, overflowWrap: "anywhere", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>{picked.file.name}</span>
            {" · "}{humanSize(picked.file.size)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()}
              aria-label={`Replace ${label.toLowerCase()}`} style={{ ...SMALL_BUTTON, flex: "1 1 100px" }}>
              <RefreshCw size={14} aria-hidden /> Replace
            </button>
            <button type="button" disabled={disabled} onClick={onRemove}
              aria-label={`Remove ${label.toLowerCase()}`} style={{ ...SMALL_BUTTON, flex: "1 1 100px" }}>
              <Trash2 size={14} aria-hidden /> Remove
            </button>
          </div>
        </div>
      )}

      {hint !== undefined && (
        <p id={hintId} style={{ ...GF, margin: "6px 0 0", fontSize: 11.5, color: T.silver, lineHeight: 1.45 }}>{hint}</p>
      )}
      {error !== null && (
        <p id={errorId} role="alert" style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: T.danger, lineHeight: 1.45 }}>
          {error}
        </p>
      )}
    </div>
  );
}

function StageHeading({ headingRef, children }: {
  headingRef: Ref<HTMLHeadingElement>; children: ReactNode;
}) {
  return (
    <h2
      ref={headingRef} tabIndex={-1} className="idc-heading"
      style={{ ...GF, margin: "0 0 8px", fontSize: "clamp(16px, 4.2vw, 18px)", fontWeight: 800, color: T.ink, lineHeight: 1.3 }}
    >
      {children}
    </h2>
  );
}

const BODY: CSSProperties = {
  ...GF, margin: "0 0 12px", fontSize: "clamp(13px, 3.4vw, 14px)", color: T.inkSoft, lineHeight: 1.6,
};

// ── The step ────────────────────────────────────────────────────────────────

export function IdentityCheckStep({
  identityCheck, documentTitle, submit, onReload, onDecline, promptMs, handoff,
}: IdentityCheckStepProps) {
  return (
    <IdentityCheckStages
      identityCheck={identityCheck} documentTitle={documentTitle}
      transport={{ kind: "ceremony", submit, reload: onReload, ...(handoff !== undefined ? { handoff } : {}) }}
      {...(onDecline !== undefined ? { onDecline } : {})}
      {...(promptMs !== undefined ? { promptMs } : {})}
    />
  );
}

export function IdentityCheckStages({
  identityCheck, documentTitle, transport, onDecline, promptMs = 2000,
}: IdentityCheckStagesProps) {
  const testMode = identityCheck.mode === "test";
  const onPhone = transport.kind === "handoff";
  // Read when something happens, never as a reason to start over: the page
  // hands a new transport over on every render.
  const transportRef = useRef(transport);
  transportRef.current = transport;
  const [stage, setStage] = useState<Stage>("consent");
  const [agreed, setAgreed] = useState(false);
  const [idType, setIdType] = useState("");
  const [front, setFront] = useState<Picked | null>(null);
  const [back, setBack] = useState<Picked | null>(null);
  const [selfie, setSelfie] = useState<Selfie | null>(null);
  const [errors, setErrors] = useState<{ idType?: string; front?: string; back?: string; selfie?: string }>({});
  const [camera, setCamera] = useState<"idle" | "starting" | "live">("idle");
  const [promptIndex, setPromptIndex] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [testOutcome, setTestOutcome] = useState<"pass" | "fail">("pass");
  const [result, setResult] = useState<Result | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recheckCount, setRecheckCount] = useState(0);
  const [recheckNote, setRecheckNote] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [handingOff, setHandingOff] = useState(false);

  const [touch] = useState(isTouchDevice);
  const [canUseCamera] = useState(cameraSupported);

  const consentId = useId(), idTypeId = useId(), idTypeErrorId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** Bumped whenever the camera is stopped, so a late answer knows it is stale. */
  const cameraRunRef = useRef(0);
  const submittingRef = useRef(false);
  const urlsRef = useRef(new Set<string>());

  const locked = identityCheck.status === "locked" || result?.kind === "locked";
  // Someone already holding a phone is not sent to find one.
  const phone = transport.kind === "ceremony" && !touch ? transport.handoff : undefined;
  const groups = groupIdentityIdTypes(identityCheck.idTypes);
  const hasBack = idType === "" || identityIdHasBack(idType);

  // ── Photos held in memory ────────────────────────────────────────────────

  const hold = useCallback((file: File): Picked => {
    let url: string | null = null;
    try {
      if (typeof URL.createObjectURL === "function") {
        url = URL.createObjectURL(file);
        urlsRef.current.add(url);
      }
    } catch { url = null; }
    return { file, url };
  }, []);

  const release = useCallback((url: string | null | undefined) => {
    if (url === null || url === undefined || !urlsRef.current.has(url)) return;
    urlsRef.current.delete(url);
    try { URL.revokeObjectURL(url); } catch { /* nothing left to release */ }
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) { try { URL.revokeObjectURL(url); } catch { /* already gone */ } }
      urls.clear();
    };
  }, []);

  // ── The camera ───────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    cameraRunRef.current += 1;
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream !== null) for (const track of stream.getTracks()) track.stop();
    if (videoRef.current !== null) videoRef.current.srcObject = null;
  }, []);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setCamera("idle");
  }, [stopCamera]);

  // Leaving the stage, or the screen, always releases the camera.
  useEffect(() => () => { stopCamera(); }, [stage, stopCamera]);
  useEffect(() => { setCamera("idle"); }, [stage]);

  useEffect(() => {
    // Also while the permission prompt is still up: the answer is then stale.
    const onHide = () => { cancelCamera(); };
    const onVisibility = () => { if (document.hidden) onHide(); };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cancelCamera]);

  /** The click handler of "Use my camera": the only place the camera is asked for. */
  const startCamera = () => {
    if (camera !== "idle") return;
    setCameraError(null);
    setErrors(current => ({ ...current, selfie: undefined }));
    setCamera("starting");
    cameraRunRef.current += 1;
    const run = cameraRunRef.current;
    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      } catch {
        if (run !== cameraRunRef.current) return;
        setCamera("idle");
        setCameraError(CAMERA_REFUSED);
        setAnnouncement(CAMERA_REFUSED);
        return;
      }
      // Cancelled, hidden or gone while the permission prompt was up.
      if (run !== cameraRunRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      streamRef.current = stream;
      setPromptIndex(0);
      setCamera("live");
    })();
  };

  useEffect(() => {
    if (camera !== "live") return;
    const video = videoRef.current;
    if (video === null || streamRef.current === null) return;
    video.srcObject = streamRef.current;
    try {
      const playing = video.play() as Promise<void> | undefined;
      if (playing !== undefined) playing.catch(() => { /* autoplay refused: the frame is still captured */ });
    } catch { /* not playable here */ }
  }, [camera]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    let url: string | null = null;
    try {
      const width = video !== null && video.videoWidth > 0 ? video.videoWidth : 640;
      const height = video !== null && video.videoHeight > 0 ? video.videoHeight : 480;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D | null | undefined;
      if (context !== null && context !== undefined && video !== null) {
        context.drawImage(video, 0, 0, width, height);
        const data = canvas.toDataURL("image/jpeg", 0.85) as string | undefined;
        url = typeof data === "string" && data.startsWith("data:image/") ? data : null;
      }
    } catch { url = null; }
    stopCamera();
    setCamera("idle");
    setSelfie({ capture: "camera", url, name: null });
    setAnnouncement("Selfie taken.");
  }, [stopCamera]);

  // One prompt at a time, then the frame.
  useEffect(() => {
    if (camera !== "live") return;
    const timer = window.setTimeout(() => {
      if (promptIndex < PROMPTS.length - 1) setPromptIndex(promptIndex + 1);
      else captureFrame();
    }, promptMs);
    return () => { window.clearTimeout(timer); };
  }, [camera, promptIndex, promptMs, captureFrame]);

  // ── Focus and announcements ──────────────────────────────────────────────

  const resultKind = result?.kind ?? null;
  useEffect(() => {
    headingRef.current?.focus();
  }, [stage, resultKind, locked, handingOff]);

  // ── A link that runs out (on a phone) ────────────────────────────────────

  const deadline = transport.kind === "handoff" ? transport.deadline : null;
  useEffect(() => {
    // Not while an answer is on its way, and not once there is nothing left
    // to send: "done" must not turn into "this link has ended".
    if (deadline === null || locked) return;
    if (resultKind === "checking" || resultKind === "passed") return;
    const timer = window.setTimeout(() => {
      const current = transportRef.current;
      if (current.kind === "handoff") current.onEnded();
    }, Math.max(0, deadline - Date.now()));
    return () => { window.clearTimeout(timer); };
  }, [deadline, resultKind, locked]);

  // ── Stage 2: the ID ──────────────────────────────────────────────────────

  const pick = (side: "front" | "back", file: File) => {
    const problem = checkImage(file);
    if (problem !== null) {
      setErrors(current => ({ ...current, [side]: problem }));
      return;
    }
    const next = hold(file);
    if (side === "front") { release(front?.url); setFront(next); }
    else { release(back?.url); setBack(next); }
    setErrors(current => ({ ...current, [side]: undefined }));
  };

  const remove = (side: "front" | "back") => {
    if (side === "front") { release(front?.url); setFront(null); }
    else { release(back?.url); setBack(null); }
    setErrors(current => ({ ...current, [side]: undefined }));
  };

  const chooseIdType = (value: string) => {
    setIdType(value);
    setErrors(current => ({ ...current, idType: undefined }));
    // A passport has no back to show; one chosen for another ID is let go.
    if (value !== "" && !identityIdHasBack(value) && back !== null) {
      release(back.url);
      setBack(null);
    }
  };

  const continueFromId = () => {
    const next: typeof errors = {};
    if (idType === "") next.idType = "Choose the type of ID.";
    // The photo boxes are not on the screen until a type is chosen, so a
    // message about them would point at nothing.
    else if (front === null) next.front = "Add a photo of the front of your ID.";
    setErrors(current => ({ ...current, ...next }));
    if (next.idType !== undefined || next.front !== undefined) {
      setAnnouncement([next.idType, next.front].filter(Boolean).join(" "));
      return;
    }
    setStage("face");
  };

  // ── Stage 3: the face ────────────────────────────────────────────────────

  const pickSelfie = (file: File) => {
    const problem = checkImage(file);
    if (problem !== null) {
      setErrors(current => ({ ...current, selfie: problem }));
      return;
    }
    cancelCamera();
    if (selfie?.capture === "upload") release(selfie.url);
    const held = hold(file);
    setSelfie({ capture: "upload", url: held.url, name: file.name });
    setCameraError(null);
    setErrors(current => ({ ...current, selfie: undefined }));
  };

  const retake = () => {
    if (selfie?.capture === "upload") release(selfie.url);
    setSelfie(null);
    setSubmitError(null);
  };

  // ── Stage 4: the attempt ─────────────────────────────────────────────────

  const backToFace = (message: string | null) => {
    setResult(null);
    setStage("face");
    setSubmitError(message);
    if (message !== null) setAnnouncement(message);
  };

  const reload = async (): Promise<void> => {
    const current = transportRef.current;
    // A phone has no ceremony to read: the link is simply over.
    if (current.kind === "handoff") { current.onEnded(); return; }
    const message = await current.reload();
    // Null means the page has read the ceremony and is moving on; if it has
    // not moved, the attempt screen is the right place to be.
    backToFace(message);
  };

  const check = async () => {
    if (submittingRef.current || selfie === null) return;
    submittingRef.current = true;
    stopCamera();
    setSubmitError(null);
    setStage("result");
    setResult({ kind: "checking" });
    setAnnouncement("Checking…");
    try {
      const answer = await transportRef.current.submit({
        idType, capture: selfie.capture, consent: true,
        // Only ever sent in test mode: the server refuses it otherwise.
        ...(testMode ? { testOutcome } : {}),
      });
      if (answer.status === "locked") {
        setResult({ kind: "locked" });
        setAnnouncement("The identity check could not be completed.");
      } else if (answer.outcome === "passed") {
        setResult({ kind: "passed" });
        setAnnouncement(onPhone
          ? "Done. You can return to your computer."
          : testMode ? "Identity check completed in test mode." : "Identity check passed.");
      } else if (answer.status === "not-required") {
        // The sender allowed another way while this attempt was being made.
        await reload();
      } else {
        setResult({ kind: "failed", attemptsRemaining: answer.attemptsRemaining });
        setAnnouncement("We could not complete the identity check.");
      }
    } catch (error) {
      const code = error instanceof ApiError ? error.body?.code : undefined;
      if (code === "identity_check_locked") {
        setResult({ kind: "locked" });
        setAnnouncement("The identity check could not be completed.");
      } else if (
        code === "identity_check_not_required" || code === "identity_check_unavailable"
        || code === "signing_ceremony_unavailable" || (error instanceof ApiError && error.status === 404)
        || (onPhone && error instanceof ApiError && error.status === 401)
      ) {
        // Something changed on the sender's side. The ceremony says what.
        await reload();
      } else {
        backToFace(describeAttemptError(error, onPhone));
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const continueAfterPass = async () => {
    const current = transportRef.current;
    if (busy || current.kind !== "ceremony") return;
    setBusy(true);
    try {
      const message = await current.reload();
      if (message !== null) { setSubmitError(message); setAnnouncement(message); }
    } finally {
      setBusy(false);
    }
  };

  const tryAgain = () => {
    retake();
    setResult(null);
    setStage("face");
  };

  const checkAgain = async () => {
    const current = transportRef.current;
    if (busy || current.kind !== "ceremony") return;
    setBusy(true);
    setRecheckNote(null);
    try {
      const message = await current.reload();
      if (message !== null) { setRecheckNote(message); setAnnouncement(message); }
      else setRecheckCount(count => count + 1);
    } finally {
      setBusy(false);
    }
  };

  // After "Check again", with whatever the ceremony now says. Still here means
  // the page did not move on: either nothing changed, or the allowance is back.
  const standingRef = useRef(identityCheck);
  standingRef.current = identityCheck;
  useEffect(() => {
    if (recheckCount === 0) return;
    const now = standingRef.current;
    if (now.status === "pending" && now.attemptsRemaining > 0) {
      setResult(null);
      setRecheckNote(null);
      setStage("consent");
      return;
    }
    const note = "Nothing has changed yet. You can try again later.";
    setRecheckNote(note);
    setAnnouncement(note);
  }, [recheckCount]);

  // ── Continuing on a phone ────────────────────────────────────────────────

  /** The click handler of "Use my phone instead": the only place a code is asked for. */
  const continueOnPhone = () => {
    cancelCamera();
    setSubmitError(null);
    setHandingOff(true);
  };

  const phonePassed = () => {
    setHandingOff(false);
    setStage("result");
    setResult({ kind: "passed" });
    setAnnouncement(testMode ? "Identity check completed in test mode." : "Identity check passed.");
    // Nothing more to ask here: on to whatever the ceremony says comes next.
    void continueAfterPass();
  };

  const phoneLocked = () => {
    setHandingOff(false);
    setResult({ kind: "locked" });
    setAnnouncement("The identity check could not be completed.");
  };

  const phoneGone = async (): Promise<string | null> => {
    const current = transportRef.current;
    return current.kind === "ceremony" ? current.reload() : null;
  };

  // ── Shared pieces ────────────────────────────────────────────────────────

  const declineLink = onDecline !== undefined && (
    <div style={{ marginTop: 16, textAlign: "center" }}>
      <button
        type="button" onClick={onDecline}
        style={{
          ...GF, minHeight: TAP, padding: "0 12px", background: "transparent", border: "none",
          color: T.inkSoft, fontSize: 13, textDecoration: "underline", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        <Ban size={14} aria-hidden /> Decline to sign
      </button>
    </div>
  );

  const testPanel = testMode && (
    <fieldset data-testid="identity-check-test-panel" style={{
      margin: "16px 0 0", padding: "10px 12px 12px", borderRadius: 10,
      border: "1.5px dashed #E0B84C", background: "#FFFBEB",
    }}>
      <legend style={{
        ...GF, padding: "0 6px", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
        textTransform: "uppercase", color: "#92400E", display: "inline-flex", alignItems: "center", gap: 5,
      }}>
        <FlaskConical size={12} aria-hidden /> Test mode
      </legend>
      <div style={{ ...GF, fontSize: 12.5, color: "#92400E", marginBottom: 6, lineHeight: 1.45 }}>
        Simulated result. Nothing is compared: choose what this test should answer.
      </div>
      <div role="radiogroup" aria-label="Simulated result" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["pass", "fail"] as const).map(option => {
          const selected = testOutcome === option;
          return (
            <label key={option} style={{
              ...GF, flex: "1 1 110px", display: "flex", alignItems: "center", gap: 8, minHeight: TAP,
              padding: "0 12px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.ink,
              background: T.surface, border: `1px solid ${selected ? "#C9960C" : "#EBD9A6"}`, boxSizing: "border-box",
            }}>
              <input
                type="radio" name="identity-check-test-outcome" checked={selected}
                onChange={() => { setTestOutcome(option); }}
                style={{ width: 18, height: 18, flexShrink: 0, accentColor: "#B45309" }}
              />
              {option === "pass" ? "Pass" : "Fail"}
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  const frame = (children: ReactNode, rail: Stage | null, panel = false) => (
    <div data-testid="identity-check-step">
      <style>{STYLES}</style>
      <PhaseBanner
        icon={ShieldCheck} tone="info" badge="Required"
        title="Identity check"
        description={`The sender asked for this before you open "${documentTitle}".`}
      />
      {testMode && (
        <div data-testid="identity-check-test-banner" role="note" style={{
          ...GF, display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10,
          marginBottom: 16, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E",
          fontSize: "clamp(12px, 3.2vw, 13px)", fontWeight: 600, lineHeight: 1.45,
        }}>
          <FlaskConical size={15} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ minWidth: 0 }}>{TEST_BANNER}</span>
        </div>
      )}
      {rail !== null && <ProgressRail steps={STAGES} current={rail} label="Identity check progress" scrollOnMobile />}
      <div role="status" aria-live="polite" style={SR_ONLY}>{announcement}</div>
      <div key={panel ? "phone" : rail ?? "locked"} className="idc-stage">{children}</div>
    </div>
  );

  // ── Locked ───────────────────────────────────────────────────────────────

  if (locked) {
    return frame(
      <>
        <StageHeading headingRef={headingRef}>The identity check is closed for now</StageHeading>
        {onPhone ? (
          // The hand-off link will not last, so nothing here says to come back to it.
          <Notice icon={Lock} tone="neutral">
            The identity check could not be completed. The sender has been told and can let you
            continue another way. You can return to your computer.
          </Notice>
        ) : (
          <>
            <Notice icon={Lock} tone="neutral">
              The identity check could not be completed. The sender has been told and can let you
              continue another way. You can come back to this link later.
            </Notice>
            {recheckNote !== null && (
              <p data-testid="identity-check-recheck-note" style={{ ...BODY, color: T.inkSoft }}>{recheckNote}</p>
            )}
            <ActionRow>
              <ActionButton
                icon={busy ? Loader2 : RefreshCw} kind="secondary"
                onClick={() => void checkAgain()} disabled={busy} full
              >
                {busy ? "Checking…" : "Check again"}
              </ActionButton>
            </ActionRow>
          </>
        )}
        {declineLink}
      </>,
      null,
    );
  }

  // ── On a phone instead ───────────────────────────────────────────────────

  // Only ever from the ID or the face stage, so never before the agreement.
  if (handingOff && phone !== undefined && agreed && (stage === "id" || stage === "face")) {
    return frame(
      <IdentityHandoffPanel
        client={phone} headingRef={headingRef} announce={setAnnouncement}
        onBack={() => { setHandingOff(false); }}
        onCompleted={phonePassed} onLocked={phoneLocked} onGone={phoneGone}
      />,
      stage,
      true,
    );
  }

  // ── Consent ──────────────────────────────────────────────────────────────

  if (stage === "consent") {
    return frame(
      <>
        <StageHeading headingRef={headingRef}>Before you start</StageHeading>
        <p style={BODY}>
          The sender asked that you confirm who you are before you sign this document.
          It takes about two minutes.
        </p>
        <ul style={{ ...BODY, paddingLeft: 20, listStyle: "disc" }}>
          <li style={{ display: "list-item", marginBottom: 4 }}>A photo of your ID</li>
          <li style={{ display: "list-item", marginBottom: 4 }}>A selfie</li>
          <li style={{ display: "list-item" }}>The result of the check, which is recorded in the document&rsquo;s history</li>
        </ul>
        {testMode && (
          <p style={BODY}>
            In test mode nothing leaves this device: your ID and selfie are not uploaded,
            and nobody&rsquo;s identity is checked.
          </p>
        )}
        <label
          htmlFor={consentId}
          style={{
            ...GF, display: "flex", alignItems: "flex-start", gap: 10, minHeight: TAP, padding: "10px 12px",
            borderRadius: 10, cursor: "pointer", boxSizing: "border-box",
            fontSize: "clamp(13px, 3.4vw, 14px)", color: T.ink, lineHeight: 1.5,
            background: agreed ? T.azureWash : T.surface, border: `1px solid ${agreed ? "#B7DAF5" : T.border}`,
          }}
        >
          <input
            id={consentId} type="checkbox" checked={agreed}
            onChange={event => { setAgreed(event.target.checked); }}
            style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1, accentColor: T.azure }}
          />
          <span style={{ minWidth: 0 }}>
            I agree to the use of my ID and selfie to verify my identity for this document.
          </span>
        </label>
        <ActionRow>
          <ActionButton icon={ShieldCheck} onClick={() => { setStage("id"); }} disabled={!agreed} full>
            Continue
          </ActionButton>
        </ActionRow>
        {declineLink}
      </>,
      "consent",
    );
  }

  // ── Your ID ──────────────────────────────────────────────────────────────

  if (stage === "id") {
    return frame(
      <>
        <StageHeading headingRef={headingRef}>Your ID</StageHeading>
        <p style={BODY}>Choose an ID you have with you, then add a clear photo of it.</p>

        <label htmlFor={idTypeId} style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
          Type of ID
        </label>
        <select
          id={idTypeId} value={idType}
          onChange={event => { chooseIdType(event.target.value); }}
          aria-invalid={errors.idType !== undefined}
          aria-describedby={errors.idType !== undefined ? idTypeErrorId : undefined}
          style={{
            ...GF, width: "100%", minHeight: TAP, padding: "0 12px", borderRadius: 10, boxSizing: "border-box",
            border: `1px solid ${errors.idType !== undefined ? T.danger : T.borderStrong}`,
            background: T.surface, color: T.ink, fontSize: 16,
          }}
        >
          <option value="">Choose one</option>
          {groups.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </optgroup>
          ))}
        </select>
        {errors.idType !== undefined && (
          <p id={idTypeErrorId} role="alert" style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: T.danger }}>
            {errors.idType}
          </p>
        )}

        {/* The photo boxes wait for the type: which sides are asked for
            depends on it (a passport has no back), and two empty boxes under
            an unanswered question read as the first thing to do. */}
        {idType !== "" && (
          <div className="idc-grid" style={{ marginTop: 16 }}>
            <ImagePicker
              label="Front of the ID" picked={front} error={errors.front ?? null} touch={touch} capture="environment"
              hint="JPEG, PNG or WebP, up to 8 MB."
              onPick={file => { pick("front", file); }} onRemove={() => { remove("front"); }}
            />
            {hasBack && (
              <ImagePicker
                label="Back of the ID" optional picked={back} error={errors.back ?? null} touch={touch} capture="environment"
                onPick={file => { pick("back", file); }} onRemove={() => { remove("back"); }}
              />
            )}
          </div>
        )}

        {phone !== undefined && (
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 16, padding: 12,
            borderRadius: 12, background: T.canvas, border: `1px solid ${T.border}`,
          }}>
            <span style={{ ...GF, flex: "1 1 180px", minWidth: 0, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.45 }}>
              Easier with a phone camera? Continue this check on your phone.
            </span>
            <button type="button" onClick={continueOnPhone} style={{ ...SMALL_BUTTON, flex: "1 1 180px" }}>
              <Smartphone size={15} aria-hidden /> Use my phone instead
            </button>
          </div>
        )}

        <ActionRow>
          <ActionButton icon={ScanFace} onClick={continueFromId} full>Continue</ActionButton>
          <ActionButton kind="secondary" icon={ArrowLeft} onClick={() => { setStage("consent"); }} full>Back</ActionButton>
        </ActionRow>
        {declineLink}
      </>,
      "id",
    );
  }

  // ── Your face ────────────────────────────────────────────────────────────

  if (stage === "face") {
    return frame(
      <>
        <StageHeading headingRef={headingRef}>Your face</StageHeading>

        {submitError !== null && <Notice icon={AlertTriangle} tone="danger">{submitError}</Notice>}

        {selfie === null && camera !== "live" && (
          <>
            <p style={BODY}>
              Take a selfie so it can be compared with the photo on your ID. Face the light and
              remove anything covering your face.
            </p>
            {cameraError !== null && <Notice icon={AlertTriangle} tone="warn">{cameraError}</Notice>}
            <SelfieChoices
              canUseCamera={canUseCamera} starting={camera === "starting"} touch={touch}
              error={errors.selfie ?? null} onCamera={startCamera} onFile={pickSelfie}
              {...(phone !== undefined ? { onPhone: continueOnPhone } : {})}
            />
          </>
        )}

        {selfie === null && camera === "live" && (
          <div>
            <div style={{
              position: "relative", width: "min(100%, 360px, 48vh)", aspectRatio: "3 / 4", margin: "0 auto",
              borderRadius: 16, overflow: "hidden", background: "#0B1622",
            }}>
              <video
                ref={videoRef} muted playsInline autoPlay aria-label="Camera preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }}
              />
              {/* The oval the face goes in; everything outside it is dimmed. */}
              <div aria-hidden style={{
                position: "absolute", top: "9%", bottom: "13%", left: "15%", right: "15%", borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.92)", boxShadow: "0 0 0 2000px rgba(7,17,31,0.45)",
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px auto 0", maxWidth: 360 }}>
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke={T.border} strokeWidth="4" />
                <circle
                  key={promptIndex} className="idc-ring" cx="22" cy="22" r="18" fill="none" stroke={T.azure}
                  strokeWidth="4" strokeLinecap="round" strokeDasharray="113.1"
                  style={{ animationDuration: `${String(promptMs)}ms` }}
                />
              </svg>
              <div style={{ minWidth: 0 }}>
                <div role="status" aria-live="polite" data-testid="identity-check-prompt"
                  style={{ ...GF, fontSize: "clamp(14px, 3.8vw, 16px)", fontWeight: 700, color: T.ink, lineHeight: 1.35 }}>
                  {PROMPTS[promptIndex]}
                </div>
                <div style={{ ...GF, fontSize: 12, color: T.silver, marginTop: 2 }}>
                  Step {promptIndex + 1} of {PROMPTS.length}
                </div>
              </div>
            </div>
            <ActionRow>
              <ActionButton kind="secondary" onClick={cancelCamera} full>Cancel</ActionButton>
            </ActionRow>
          </div>
        )}

        {selfie !== null && (
          <>
            <p style={BODY}>Check that both photos are clear, then continue.</p>
            <div className="idc-pair">
              <Thumb label="Your ID" url={front?.url ?? null} icon={IdCard} />
              <Thumb label="Your selfie" url={selfie.url} icon={ScanFace} />
            </div>
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={retake} style={{ ...SMALL_BUTTON, width: "100%" }}>
                <RefreshCw size={14} aria-hidden /> Retake
              </button>
            </div>
          </>
        )}

        {testPanel}

        <ActionRow>
          <ActionButton icon={ShieldCheck} onClick={() => void check()} disabled={selfie === null} full>
            Check my identity
          </ActionButton>
          <ActionButton kind="secondary" icon={ArrowLeft} onClick={() => { setStage("id"); }} full>Back</ActionButton>
        </ActionRow>
        {declineLink}
      </>,
      "face",
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────

  if (result?.kind === "passed" && onPhone) {
    return frame(
      <>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <CheckCircle2 size={22} aria-hidden style={{ color: testMode ? "#B45309" : T.success, flexShrink: 0, marginTop: 1 }} />
          <StageHeading headingRef={headingRef}>Done</StageHeading>
        </div>
        <p style={BODY}>You can return to your computer. It will continue by itself.</p>
        {testMode && <p style={BODY}>This was a simulated check. No identity was verified.</p>}
      </>,
      "result",
    );
  }

  if (result?.kind === "passed") {
    return frame(
      <>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <CheckCircle2 size={22} aria-hidden style={{ color: testMode ? "#B45309" : T.success, flexShrink: 0, marginTop: 1 }} />
          <StageHeading headingRef={headingRef}>
            {testMode ? "Identity check completed (test mode)" : "Identity check passed"}
          </StageHeading>
        </div>
        <p style={BODY}>
          {testMode
            ? "This was a simulated check. No identity was verified."
            : "Thank you. You can now continue to the document."}
        </p>
        {/* How long this counts. In test mode nothing was verified, and the
            note does not say it was. */}
        <div data-testid="identity-check-valid-note">
          <Notice icon={Clock} tone="info">
            {testMode ? IDENTITY_CHECK_VALID_NOTE_TEST : IDENTITY_CHECK_VALID_NOTE}
          </Notice>
        </div>
        {submitError !== null && <Notice icon={AlertTriangle} tone="danger">{submitError}</Notice>}
        <ActionRow>
          <ActionButton icon={busy ? Loader2 : undefined} onClick={() => void continueAfterPass()} disabled={busy} full>
            {busy ? "Opening…" : "Continue"}
          </ActionButton>
        </ActionRow>
      </>,
      "result",
    );
  }

  if (result?.kind === "failed") {
    const left = result.attemptsRemaining;
    return frame(
      <>
        <StageHeading headingRef={headingRef}>We could not complete the identity check</StageHeading>
        {testMode && <p style={BODY}>This was a simulated result. Nothing was compared.</p>}
        <p style={{ ...BODY, marginBottom: 6 }}>This usually happens when:</p>
        <ul style={{ ...BODY, paddingLeft: 20, listStyle: "disc" }}>
          <li style={{ display: "list-item", marginBottom: 4 }}>the photo of the ID is blurry, dark or cut off</li>
          <li style={{ display: "list-item", marginBottom: 4 }}>your face is not clearly lit, or something covers it</li>
          <li style={{ display: "list-item" }}>the ID belongs to someone else, or has expired</li>
        </ul>
        <p data-testid="identity-check-attempts-left" style={{ ...BODY, fontWeight: 700, color: T.ink }}>
          {left === 1 ? "1 attempt left" : `${String(left)} attempts left`}
        </p>
        {testPanel}
        <ActionRow>
          <ActionButton icon={RefreshCw} onClick={tryAgain} full>Try again</ActionButton>
        </ActionRow>
        {declineLink}
      </>,
      "result",
    );
  }

  return frame(
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <Loader2 size={28} aria-hidden className="idc-spin" style={{ color: T.azure }} />
      <StageHeading headingRef={headingRef}>Checking…</StageHeading>
      <p style={{ ...BODY, marginBottom: 0 }}>This takes a moment. Keep this page open.</p>
    </div>,
    "result",
  );
}

function SelfieChoices({ canUseCamera, starting, touch, error, onCamera, onFile, onPhone }: {
  canUseCamera: boolean; starting: boolean; touch: boolean; error: string | null;
  onCamera: () => void; onFile: (file: File) => void;
  /** Present when the check can be continued on a phone. */
  onPhone?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  return (
    <div>
      <input
        ref={fileRef} type="file" accept={ACCEPT_ATTRIBUTE} tabIndex={-1}
        {...(touch ? { capture: "user" as const } : {})}
        aria-label="Selfie: choose a file" aria-invalid={error !== null}
        aria-describedby={error !== null ? errorId : undefined}
        style={HIDDEN_INPUT}
        onChange={event => {
          const file = event.target.files?.[0];
          if (file !== undefined) onFile(file);
          event.target.value = "";
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {canUseCamera && (
          <ActionButton icon={starting ? Loader2 : Camera} onClick={onCamera} disabled={starting} full>
            {starting ? "Starting the camera…" : "Use my camera"}
          </ActionButton>
        )}
        {/* No camera here: the phone in their pocket is the first thing to offer. */}
        {!canUseCamera && onPhone !== undefined && (
          <ActionButton icon={Smartphone} onClick={onPhone} full>Use my phone instead</ActionButton>
        )}
        <ActionButton kind="secondary" icon={Upload} onClick={() => fileRef.current?.click()} full>
          {canUseCamera ? "Upload a selfie instead" : "Upload a selfie"}
        </ActionButton>
        {canUseCamera && onPhone !== undefined && (
          <ActionButton kind="secondary" icon={Smartphone} onClick={onPhone} full>Use my phone instead</ActionButton>
        )}
      </div>
      <p style={{ ...GF, margin: "8px 0 0", fontSize: 11.5, color: T.silver, lineHeight: 1.45 }}>
        JPEG, PNG or WebP, up to 8 MB.
      </p>
      {error !== null && (
        <p id={errorId} role="alert" style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: T.danger, lineHeight: 1.45 }}>
          {error}
        </p>
      )}
    </div>
  );
}

function Thumb({ label, url, icon: Icon }: { label: string; url: string | null; icon: typeof IdCard }) {
  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <div style={{
        borderRadius: 10, border: `1px solid ${T.border}`, background: T.canvas, aspectRatio: "4 / 3",
        overflow: "hidden", display: "grid", placeItems: "center",
      }}>
        {url !== null
          ? <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Icon size={28} aria-hidden style={{ color: T.silver }} />}
      </div>
      <figcaption style={{ ...GF, marginTop: 6, fontSize: 12, fontWeight: 600, color: T.inkSoft, textAlign: "center" }}>
        {label}
      </figcaption>
    </figure>
  );
}
