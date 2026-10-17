// Hands the browser over to an address this app does not route, such as the
// static Notary Directory at /enotary-directory/: a FULL page load, replacing
// the current entry in the history so Back does not bounce the person here
// again. A client-side navigation would land on the app's own "not found".

import { useEffect } from "react";

export function FullPageRedirect({ to, label }: { to: string; label: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  // Shown only for the moment before the page loads: a plain way there.
  return (
    <main style={{ padding: "48px 24px", textAlign: "center", fontFamily: "'Geist', sans-serif" }}>
      <a href={to} style={{ color: "#67023B", fontWeight: 600 }}>{label}</a>
    </main>
  );
}
