// The journey of a printed certified copy, as the 13 October pages show it: asked, prepared, handed to the courier,
// in transit, out for delivery, delivered, received. The notary moves it forward, step by step; the client watches.
// LAGDA has no link to a courier: the stage is what the notary says, and the tracking number is what they typed.

import { Check } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import type { CertifiedCopy, ShipmentStage } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { stampLabel } from "../requests/expiry";

export const JOURNEY: readonly { id: string; label: string }[] = [
  { id: "requested", label: "Requested" }, { id: "prepared", label: "Prepared" }, { id: "handed", label: "With the courier" },
  { id: "in_transit", label: "In transit" }, { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" }, { id: "received", label: "Received" },
];

/** How many steps are done: 1 once it is asked for, up to 7 once the client has it. */
export function journeyDone(copy: Pick<CertifiedCopy, "status" | "stage">): number {
  if (copy.status === "received") return 7;
  const stage = copy.stage ?? null;
  if (stage === "delivered") return 6;
  if (stage === "out_for_delivery") return 5;
  if (stage === "in_transit") return 4;
  if (copy.status === "fulfilled") return 3;
  if (stage === "prepared") return 2;
  return 1;
}

/** What the notary can do next, as a button: null when there is nothing more for them to say. */
export function nextStage(copy: Pick<CertifiedCopy, "status" | "stage">): { stage: Exclude<ShipmentStage, "handed">; action: string } | null {
  if (copy.status === "paid") return copy.stage === "prepared" ? null : { stage: "prepared", action: "Mark as prepared" };
  if (copy.status !== "fulfilled") return null;
  switch (copy.stage ?? "handed") {
    case "handed": return { stage: "in_transit", action: "Mark as in transit" };
    case "in_transit": return { stage: "out_for_delivery", action: "Mark as out for delivery" };
    case "out_for_delivery": return { stage: "delivered", action: "Mark as delivered" };
    default: return null;
  }
}

export function CopyJourney({ copy }: { copy: CertifiedCopy }) {
  const done = journeyDone(copy);
  return (
    <div data-testid="copy-journey" data-done={done} style={{ margin: "0 0 12px" }}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {JOURNEY.map((step, index) => {
          const reached = index < done;
          const current = index === done - 1;
          return (
            <li key={step.id} data-step={step.id} data-state={reached ? (current ? "current" : "done") : "todo"} aria-current={current ? "step" : undefined}
              style={{ ...GF, display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: reached ? E.ink : E.quiet, fontWeight: current ? 800 : 500 }}>
              <span aria-hidden="true" style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center",
                background: reached ? E.ok : "#FFFFFF", border: `2px solid ${reached ? E.ok : E.line}`, color: "#FFFFFF" }}>
                {reached && <Check size={13} />}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
      {copy.shipment !== null && (
        <p data-testid="copy-tracking" style={{ ...GF, margin: "10px 0 0", fontSize: 13.5, color: E.text }}>
          {copy.shipment.courier} · tracking number <strong style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", letterSpacing: "0.04em" }}>{copy.shipment.trackingNo}</strong>
          {copy.stageAt !== null && copy.stageAt !== undefined && <> · updated {stampLabel(copy.stageAt)}</>}
        </p>
      )}
      <p style={{ ...GF, margin: "4px 0 0", fontSize: 12, color: E.quiet }}>The courier&rsquo;s steps are what the notary reports. LAGDA does not track the parcel itself.</p>
    </div>
  );
}
