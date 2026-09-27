// The LAGDA Chatbot's shared components: the bot avatar and the orbit loader.
// Tokens, timings and the stylesheet live in `chatbot-theme.ts`.

import { AZURE, BLUE_DEEP, BLUE_SKY, BLUE_SOFT, BOT_IMAGE, GF } from "./chatbot-theme";

export function BotAvatar({ size, className, label }: { size: number; className?: string; label?: string }) {
  return (
    <span
      className={className}
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: "50%", display: "inline-flex",
        alignItems: "center", justifyContent: "center", background: "#EAF4FF",
        boxShadow: "inset 0 0 0 1px rgba(0,120,212,0.18)", overflow: "hidden",
      }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <img src={BOT_IMAGE} alt="" width={size} height={size} draggable={false}
        style={{ width: "88%", height: "88%", objectFit: "contain", display: "block" }} />
    </span>
  );
}

const ORBITS = [
  { dur: "1.7s", size: 10, color: AZURE, offset: -2, rev: false },
  { dur: "2.6s", size: 7, color: BLUE_SKY, offset: 10, rev: true },
  { dur: "3.4s", size: 12, color: BLUE_DEEP, offset: 20, rev: false },
  { dur: "2.1s", size: 6, color: BLUE_SOFT, offset: 4, rev: true },
];

/**
 * The bot, centred, with dots in the brand blues orbiting it at different
 * speeds and sizes, a soft pulse, and a caption. Reduced motion: a plain
 * spinner ring. `morphing` plays the hand-off into the greeting avatar.
 */
export function OrbitLoader({
  caption, reduced, size = 96, morphing = false, testId,
}: { caption: string; reduced: boolean; size?: number; morphing?: boolean; testId?: string }) {
  const ring = size + 56;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 16 }}
    >
      <div className={morphing && !reduced ? "lagda-cb-morph" : undefined} style={{ position: "relative", width: ring, height: ring }}>
        {reduced ? (
          <span aria-hidden className="lagda-cb-spin" style={{
            position: "absolute", inset: 10, borderRadius: "50%",
            border: `3px solid ${BLUE_SOFT}66`, borderTopColor: AZURE,
          }} />
        ) : (
          <>
            <span aria-hidden className="lagda-cb-glow" style={{
              position: "absolute", inset: 18, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(0,120,212,0) 70%)",
            }} />
            {ORBITS.map((o, i) => (
              <span key={i} aria-hidden className={`lagda-cb-orbit${o.rev ? " rev" : ""}`}
                style={{ ["--lagda-cb-dur" as string]: o.dur, inset: o.offset }}>
                <span style={{
                  position: "absolute", top: 0, left: "50%", width: o.size, height: o.size, marginLeft: -o.size / 2,
                  borderRadius: "50%", background: o.color, boxShadow: `0 0 10px ${o.color}AA`,
                }} />
              </span>
            ))}
          </>
        )}
        <img
          src={BOT_IMAGE} alt="" aria-hidden width={size} height={size} draggable={false}
          className={reduced ? undefined : "lagda-cb-pulse"}
          style={{ position: "absolute", left: (ring - size) / 2, top: (ring - size) / 2, width: size, height: size, objectFit: "contain" }}
        />
      </div>
      <span style={{ ...GF, fontSize: 13.5, fontWeight: 600, color: BLUE_DEEP, textAlign: "center" }}>{caption}</span>
    </div>
  );
}
