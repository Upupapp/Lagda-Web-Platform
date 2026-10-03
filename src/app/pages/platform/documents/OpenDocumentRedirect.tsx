// /app/documents/<signing request id>, on the live site.
//
// The demo build's transaction-detail pages live at this address and know
// only fixture data. A real link here — the "View document" of a signed-
// document notice, or an address someone kept — opens the Documents page
// with that request's viewer instead.

import { Navigate, useParams } from "react-router";

export function OpenDocumentRedirect() {
  const { transactionId = "" } = useParams<{ transactionId: string }>();
  const open = transactionId.trim();
  return <Navigate to={open === "" ? "/app/documents" : `/app/documents?open=${encodeURIComponent(open)}`} replace />;
}
