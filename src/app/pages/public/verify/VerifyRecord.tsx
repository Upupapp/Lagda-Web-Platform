// /verify/:verificationId — the dedicated record page. With no backend
// configured, the demonstration page has no per-record view, so this hands the
// ID to /verify's own query-string prefill instead.

import { Navigate, useParams } from "react-router";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { RealVerifyRecord } from "./RealVerifyDocument";

export function VerifyRecord() {
  const { verificationId = "" } = useParams();
  if (USE_REAL_BACKEND) return <RealVerifyRecord />;
  return <Navigate to={`/verify?id=${encodeURIComponent(verificationId)}`} replace />;
}
