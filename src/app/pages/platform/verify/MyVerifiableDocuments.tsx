// "Verify one of my documents": this workspace's completed documents that have
// a Verification ID (the backend's `verificationId`, set by sealing), each a
// link to its in-app verification page. Hidden entirely when there are none.

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { realDocumentService, type RealDocument } from "../../../services/real/document.service";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function MyVerifiableDocuments({ workspaceId }: { workspaceId: string }) {
  const [docs, setDocs] = useState<RealDocument[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    realDocumentService.list(workspaceId, { page: 1, perPage: 50 })
      .then(r => { if (!cancelled) setDocs(r.items.filter(d => typeof d.verificationId === "string" && d.verificationId !== "")); })
      .catch(() => { if (!cancelled) setDocs([]); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  if (docs === null || docs.length === 0) return null;
  return (
    <section aria-labelledby="my-verifiable" style={{ marginTop: 24 }}>
      <h2 id="my-verifiable" style={{ ...GF, fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 10px" }}>
        Verify one of my documents
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, border: "1px solid #E2E8F0", borderRadius: 10, background: "#FFFFFF", overflow: "hidden" }}>
        {docs.map((d, i) => (
          <li key={d.documentId} style={{ borderTop: i === 0 ? "none" : "1px solid #F1F5F9" }}>
            <Link to={`/app/verify/${encodeURIComponent(d.verificationId ?? "")}`}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", textDecoration: "none", minWidth: 0 }}>
              <ShieldCheck size={16} color="#0078D4" aria-hidden style={{ flexShrink: 0 }} />
              <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#0F172A", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.title}
              </span>
              <span style={{ ...GM, fontSize: 11, color: "#64748B", flexShrink: 0 }}>{d.verificationId}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
