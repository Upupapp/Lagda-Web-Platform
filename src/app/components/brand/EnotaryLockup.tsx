// LAGDA.io | eNotary: the co-branded lockup the notarial screens carry in their loading and result panels. The LAGDA
// wordmark as the brand guide ships it, a gold hairline, and "eNotary" set in the notarial serif in maroon, with the
// small gold diamond of LAGDA's authenticity mark. It scales down on a narrow phone and never wraps.

const SERIF = "Tinos, 'Times New Roman', Times, serif";
const MAROON = "#8C1D3F";
const GOLD = "#C9960C";

export function EnotaryLockup({ size = "md" }: { size?: "sm" | "md" }) {
  const logo = size === "sm" ? 18 : 22;
  return (
    <div
      data-testid="enotary-lockup"
      aria-label="LAGDA eNotary"
      role="img"
      style={{
        display: "inline-flex", alignItems: "center", gap: "clamp(8px, 2.6vw, 12px)", maxWidth: "100%", boxSizing: "border-box",
        padding: size === "sm" ? "6px 12px" : "8px 16px", borderRadius: 999,
        background: "linear-gradient(180deg, #FFFFFF 0%, #FBF6EC 100%)",
        border: "1px solid #EADBBE", boxShadow: "0 8px 20px -14px rgba(122,21,53,0.55), inset 0 1px 0 #FFFFFF",
      }}
    >
      <img
        src="/brand/LagdaLogoHorizontalCropped.png" alt="" draggable={false}
        style={{ display: "block", height: `clamp(15px, 4.4vw, ${String(logo)}px)`, width: "auto", flexShrink: 1, minWidth: 0 }}
      />
      <span aria-hidden="true" style={{ flex: "0 0 auto", width: 1, alignSelf: "stretch", margin: "2px 0", background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)` }} />
      <span aria-hidden="true" style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: `clamp(15px, 4.6vw, ${size === "sm" ? "17px" : "20px"})`, color: MAROON, letterSpacing: "0.01em", lineHeight: 1 }}>
          eNotary
        </span>
        <span style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)", borderRadius: 1 }} />
      </span>
    </div>
  );
}
