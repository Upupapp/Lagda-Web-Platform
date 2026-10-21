// Step 6 of the notary's room ("Act and fee"), once the client has finalized the document: one console with the strip
// (the time, the room, the video, both people and where step 6 stands), the call, the chat and the client's address, the
// document with the notary's own marks, and the card for what the notary does next (the room's own NotaryFlow).
//
// Three columns on a wide screen; two on a tablet, the next step first; one on a phone, where the call is followed by the
// next step and the document. Every line comes from the session, and every button is one the room already had.

import type { ReactNode } from "react";
import { GF } from "../../../../components/system/design-system";
import type { RoomMessage, Session } from "../../../../services/real/enotary-sessions.service";
import { CONSOLE_CSS, ChatCard, SessionStrip, useConsoleWidth } from "./ClientStepSix";
import { NotaryDocumentCard } from "./NotaryDocumentCard";
import type { RoomConnection } from "./useRoomConnection";

export function NotaryStepSix({ s, partner, connection, call, address, flow, messages, onSend }: {
  s: Session; partner: string; connection: RoomConnection; call: ReactNode; address: ReactNode; flow: ReactNode;
  messages: readonly RoomMessage[]; onSend: (body: string) => Promise<void>;
}) {
  const width = useConsoleWidth();
  const video = <div key="video" data-testid="video-panel">{call}</div>;
  const chat = <ChatCard key="chat" s={s} partner={partner} messages={messages} onSend={onSend} />;
  const doc = <NotaryDocumentCard key="doc" s={s} />;
  const where = <div key="address">{address}</div>;
  const next = <div key="flow" style={{ display: "grid", gap: 16, minWidth: 0 }}>{flow}</div>;
  const columns: ReactNode[][] = width === "wide" ? [[video, chat, where], [doc], [next]]
    : width === "medium" ? [[video, chat, where], [next, doc]]
      : [[video, next, doc, where, chat]];
  return (
    <div className="s6 notary" data-testid="notary-step-six" data-width={width} style={GF}>
      <style>{CONSOLE_CSS}</style>
      <SessionStrip s={s} connection={connection} partner={partner} />
      <div className={`s6-cols ${width}`}>
        {columns.map((column, i) => <div key={i} className="s6-col">{column}</div>)}
      </div>
    </div>
  );
}
