// 127. What the notarial block's preview prints, read once for a page: the notary's signature picture, the facts on their
// seal (the commission), and their office's name from their application. The server draws the real block from the same.

import { useEffect, useState } from "react";
import { realEnotarySessionsService, type NotarySeal, type NotarySignature, type Session } from "../../../../services/real/enotary-sessions.service";
import { realNotaryApplicationsService } from "../../../../services/real/notary-applications.service";
import type { BlockFacts } from "./NotarialBlockPreview";

/** A call that may throw before it returns its promise, as a promise. */
const ask = <T,>(work: () => Promise<T>): Promise<T> => new Promise<T>(resolve => { resolve(work()); });

const manilaDay = (date: Date | string): string => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" })
  .format(typeof date === "string" ? new Date(`${date}T12:00:00+08:00`) : date);

/** The preview's facts, from the session, the seal's facts, the signature picture and the office. */
export function blockFactsOf(session: Session, seal: NotarySeal | null, signature: NotarySignature | null, office: string | null, now = new Date()): BlockFacts {
  const commission = [
    seal?.commissionNo ? `Commission No. ${seal.commissionNo}` : null,
    seal?.commissionValidUntil ? `until ${manilaDay(seal.commissionValidUntil)}` : null,
    seal?.rollNo ? `Roll No. ${seal.rollNo}` : null,
  ].filter((part): part is string => part !== null).join(" · ");
  return {
    notaryName: session.notaryName, firm: office !== null && office.trim() !== "" ? office : session.notaryName,
    commissionLine: commission === "" ? null : commission,
    actLabel: (session.statement?.actTypeLabel ?? "Notarial act").toUpperCase(), dateLabel: manilaDay(now).toUpperCase(),
    sealName: seal?.sealName ?? session.notaryName,
    signature: signature === null ? null : { mediaType: signature.mediaType, image: signature.image },
  };
}

/** The preview's facts for `session` (null until it is known), and the signature picture (undefined until read). */
export function useBlockFacts(session: Session | null): { facts: BlockFacts | null; signature: NotarySignature | null | undefined } {
  const [signature, setSignature] = useState<NotarySignature | null | undefined>(undefined);
  const [seal, setSeal] = useState<NotarySeal | null>(null);
  const [office, setOffice] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void ask(() => realEnotarySessionsService.signature()).then(found => { if (alive) setSignature(found ?? null); }, () => { if (alive) setSignature(null); });
    void ask(() => realEnotarySessionsService.seal()).then(found => { if (alive) setSeal(found ?? null); }, () => undefined);
    void ask(() => realNotaryApplicationsService.read()).then(found => { if (alive) setOffice(found?.application?.office ?? null); }, () => undefined);
    return () => { alive = false; };
  }, []);
  return { facts: session === null ? null : blockFactsOf(session, seal, signature ?? null, office), signature };
}
