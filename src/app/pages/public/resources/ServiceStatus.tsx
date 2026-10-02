// /service-status — whether LAGDA is answering, checked from the visitor's
// own browser at the moment the page is opened.
//
// With a backend, two probes are asked directly: `/health` (the server is up)
// and `/ready` (it can reach its database and has the schema it expects).
// Everything the app does — sign-in, documents, signing, verification — goes
// through that one server, so those two answers are the honest status of all
// of it. There is no monitoring history and no incident feed, and the page
// says so rather than inventing either.
//
// The demo build has no server: it shows the same rows as "not checked".

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ResourcesPageShell, ResourcesSection,
} from "../../../components/resources/ResourceComponents";
import { API_BASE_URL, USE_REAL_BACKEND } from "../../../services/backend-flag";
import { ENOTARY_DISCLAIMER } from "../../../config/enotary-disclaimer";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

type ServiceStatusValue = "checking" | "operational" | "unavailable" | "not-checked" | "planned" | "future-product";

const STATUS_DISPLAY: Record<ServiceStatusValue, { label: string; color: string; bg: string; meaning: string }> = {
  "checking":       { label: "Checking…",      color: "#64748B", bg: "rgba(100,116,139,0.1)", meaning: "This page is asking the server now" },
  "operational":    { label: "Operational",    color: "#15803D", bg: "rgba(34,197,94,0.12)",  meaning: "The server answered and is ready" },
  "unavailable":    { label: "Not responding", color: "#B91C1C", bg: "rgba(239,68,68,0.1)",   meaning: "The server did not answer, or is not ready" },
  "not-checked":    { label: "Not checked",    color: "#64748B", bg: "rgba(100,116,139,0.1)", meaning: "This build has no server to ask" },
  "planned":        { label: "Planned",        color: "#B45309", bg: "rgba(201,150,12,0.12)", meaning: "Not built yet" },
  "future-product": { label: "Future Product", color: "#67023B", bg: "rgba(103,2,59,0.1)",    meaning: "Not available; depends on accreditation" },
};

type Probe = "checking" | "up" | "down";

/** One probe. Any failure to answer 200 is "down": this is a status page. */
async function probe(path: string, signal: AbortSignal): Promise<Probe> {
  if (API_BASE_URL === null) return "down";
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { method: "GET", cache: "no-store", signal });
    return response.ok ? "up" : "down";
  } catch {
    return "down";
  }
}

function StatusBadge({ status }: { status: ServiceStatusValue }) {
  const { label, color, bg } = STATUS_DISPLAY[status];
  return (
    <span style={{ background: bg, color, ...GM, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }} aria-label={`Status: ${label}`}>
      <span aria-hidden style={{ fontSize: 8 }}>●</span>
      {label}
    </span>
  );
}

export function ServiceStatus() {
  const [server, setServer] = useState<Probe>("checking");
  const [ready, setReady] = useState<Probe>("checking");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    let live = true;
    const controller = new AbortController();
    // No answer in ten seconds is "not responding", not "still checking".
    const timeout = setTimeout(() => { controller.abort(); }, 10_000);
    setServer("checking");
    setReady("checking");
    void Promise.all([probe("/health", controller.signal), probe("/ready", controller.signal)])
      .then(([health, readiness]) => {
        if (!live) return;
        setServer(health);
        setReady(readiness);
        setCheckedAt(new Date());
      })
      .finally(() => { clearTimeout(timeout); });
    return () => { live = false; clearTimeout(timeout); controller.abort(); };
  }, [round]);

  const recheck = useCallback(() => { setRound(n => n + 1); }, []);

  // One server does everything, so one answer covers every working feature.
  const app: ServiceStatusValue = !USE_REAL_BACKEND ? "not-checked"
    : server === "checking" || ready === "checking" ? "checking"
    : server === "up" && ready === "up" ? "operational" : "unavailable";

  const services: { id: string; name: string; status: ServiceStatusValue; note?: string }[] = [
    { id: "public-website", name: "Public website", status: "operational", note: "You are reading it." },
    { id: "account-access", name: "Sign-in and accounts", status: app },
    { id: "documents", name: "Preparing and sending documents", status: app },
    { id: "recipient-signing", name: "Signing a document sent to you", status: app },
    { id: "doc-verification", name: "Document Verification", status: app },
    { id: "api-integrations", name: "API and integrations", status: "planned", note: "Not built yet. There is no public API to be up or down." },
    { id: "enotary", name: "LAGDA eNotary", status: "future-product", note: ENOTARY_DISCLAIMER },
  ];

  const headline = app === "operational" ? "LAGDA is answering"
    : app === "checking" ? "Checking LAGDA now…"
    : app === "unavailable" ? "LAGDA is not responding"
    : "This build is not connected to a server";
  const good = app === "operational";
  const tone = good ? "#15803D" : app === "unavailable" ? "#B91C1C" : "#64748B";

  return (
    <ResourcesPageShell>
      <section style={{ padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>SERVICE STATUS</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ color: "#07111F", ...GF, fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 12px" }}>LAGDA Service Status</h1>
              <div role="status" aria-live="polite" data-testid="status-headline" data-status={app}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${tone}14`, border: `1px solid ${tone}40`, borderRadius: 8, padding: "8px 16px" }}>
                <span aria-hidden style={{ color: tone, fontSize: 10 }}>●</span>
                <span style={{ color: tone, ...GF, fontSize: 13, fontWeight: 700 }}>{headline}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ color: "#64748B", ...GM, fontSize: 9, marginBottom: 2 }}>CHECKED FROM YOUR BROWSER</p>
              <p data-testid="status-checked-at" style={{ color: "#475569", ...GM, fontSize: 11, margin: "0 0 8px" }}>
                {!USE_REAL_BACKEND ? "Not checked" : checkedAt === null ? "Checking…"
                  : checkedAt.toLocaleString("en-PH", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}
              </p>
              {USE_REAL_BACKEND && (
                <button type="button" onClick={recheck} disabled={app === "checking"} data-testid="status-recheck"
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.14)", borderRadius: 8, color: "#07111F", ...GF, fontSize: 13, fontWeight: 600, padding: "8px 14px", minHeight: 40, cursor: app === "checking" ? "default" : "pointer" }}>
                  Check again
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 24px" }}>
        <div style={{ background: "rgba(0,120,212,0.05)", border: "1px solid rgba(0,120,212,0.18)", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ color: "#005A9E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>WHAT THIS PAGE CHECKS</p>
          <p data-testid="status-explainer" style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {USE_REAL_BACKEND
              ? "When you open this page, your browser asks the LAGDA server whether it is up and whether it can reach its database. Every working feature runs on that one server, so they share one answer. It is a check at this moment, not a record: LAGDA does not publish uptime figures."
              : "This is a demonstration build with no server, so nothing can be checked. The live site asks the LAGDA server directly."}
          </p>
        </div>
      </div>

      <ResourcesSection id="services">
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#64748B", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>SERVICES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }} role="list" aria-label="Service status list">
            {services.map(({ id, name, status, note }) => (
              <div key={id} role="listitem" data-testid={`status-${id}`} data-status={status}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 18px", background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 9, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(7,17,31,0.07)" }}>
                <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                  <p style={{ color: "#07111F", ...GF, fontSize: 14, fontWeight: 600, margin: 0 }}>{name}</p>
                  {note && <p style={{ color: "#64748B", ...GF, fontSize: 12, margin: "3px 0 0", lineHeight: 1.5 }}>{note}</p>}
                </div>
                <StatusBadge status={status} />
              </div>
            ))}
          </div>
        </div>
      </ResourcesSection>

      <ResourcesSection id="incidents" light bordered>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#64748B", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>INCIDENT HISTORY</p>
          <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 4px rgba(7,17,31,0.07)" }}>
            <p data-testid="status-no-history" style={{ color: "#334155", ...GF, fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
              LAGDA does not publish an incident history yet. If something is not working for you,{" "}
              <Link to="/contact?category=account-support" style={{ color: "#005A9E", fontWeight: 600 }}>tell us</Link> and say what you were doing.
            </p>
          </div>
        </div>
      </ResourcesSection>

      <ResourcesSection id="legend">
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#64748B", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>STATUS KEY</p>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr" }}>
            {(Object.entries(STATUS_DISPLAY) as [ServiceStatusValue, typeof STATUS_DISPLAY[ServiceStatusValue]][])
              .filter(([key]) => key !== "checking")
              .map(([key, { label, color, meaning }]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden style={{ color, fontSize: 10 }}>●</span>
                  <span style={{ color: "#64748B", ...GF, fontSize: 13 }}><strong style={{ color: "#07111F" }}>{label}</strong> — {meaning}</span>
                </div>
              ))}
          </div>
        </div>
      </ResourcesSection>
    </ResourcesPageShell>
  );
}
