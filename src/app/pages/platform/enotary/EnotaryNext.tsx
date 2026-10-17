// Where a verified person goes next: LAGDA eNotary's own site.
//
// A client goes to the Notary Directory, to browse notaries public and
// register their interest. The directory is a static site published on this
// same domain at /enotary-directory/; it is not a route of this app, so the
// link is a plain anchor (a full page load).
//
// The notary's side (their desk) is not published, so nothing is drawn for a
// notary public: no button leads nowhere. Nothing about the person is put in
// the address.

import { ArrowRight, Search } from "lucide-react";
import { GF, TAP } from "../../../components/system/design-system";
import type { EnotaryRole } from "../../../models/identity-check";
import { ENOTARY_DIRECTORY_PATH } from "../../../config/enotary-directory";
import { E, SERIF } from "./EnotaryChrome";

/** The address to open for this role, or null where there is none to go to. */
export function enotaryNextUrl(role: EnotaryRole): string | null {
  return role === "attorney" ? null : ENOTARY_DIRECTORY_PATH;
}

export function EnotaryNext({ role }: { role: EnotaryRole }) {
  const href = enotaryNextUrl(role);
  if (href === null) return null;
  return (
    <div
      data-testid="enotary-next"
      style={{
        ...GF, marginTop: 18, padding: "16px 18px", borderRadius: 12,
        background: E.skyWash, border: `1px solid ${E.skyLine}`,
      }}
    >
      <p style={{ margin: "0 0 4px", fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: E.navy, lineHeight: 1.3 }}>
        Find a notary public
      </p>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: E.text, lineHeight: 1.55 }}>
        Browse notaries public in the Notary Directory, read what each one offers, and register your
        interest. eNotary sessions are not open yet.
      </p>
      <a
        href={href} className="eno-next" data-testid="enotary-next-link"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: TAP, padding: "0 22px",
          borderRadius: 10, textDecoration: "none", boxSizing: "border-box", color: "#FFFFFF",
          fontSize: "clamp(13px, 3.4vw, 14.5px)", fontWeight: 700,
          background: E.sky,
        }}
      >
        <Search size={16} aria-hidden />
        Go to the Notary Directory
        <ArrowRight size={16} aria-hidden />
      </a>
      <style>{`.eno-next:focus-visible { outline: 2px solid ${E.navy}; outline-offset: 2px; }`}</style>
    </div>
  );
}
