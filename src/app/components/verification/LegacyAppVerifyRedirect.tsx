import { Navigate, useLocation, useParams } from "react-router";

/**
 * /app/verify and /app/verify/:verificationId used to be an in-app
 * "Check a Document" page. That page is gone; verification lives only on the
 * public /verify page, so old links (bookmarks, emails) are sent there.
 *
 *   /app/verify                      → /verify
 *   /app/verify?verificationId=X     → /verify?id=X
 *   /app/verify/:verificationId      → /verify/:verificationId
 */
export function LegacyAppVerifyRedirect() {
  const { verificationId } = useParams();
  const { search } = useLocation();

  if (verificationId) {
    return <Navigate to={`/verify/${encodeURIComponent(verificationId)}`} replace />;
  }

  const query = new URLSearchParams(search);
  const legacyId = query.get("verificationId") ?? query.get("id");
  const to = legacyId ? `/verify?id=${encodeURIComponent(legacyId)}` : "/verify";
  return <Navigate to={to} replace />;
}
