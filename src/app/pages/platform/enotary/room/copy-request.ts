// The request for certified true copies, apart from the panel that asks it: any part of the room (the step-7 prompt,
// step 8 on the rail) opens the request's dialog, which the copies panel keeps.

/** Sent to open the copies panel's request dialog. */
export const OPEN_COPY_REQUEST_EVENT = "enotary:open-copy-request";
export const openCopyRequest = (): void => { window.dispatchEvent(new Event(OPEN_COPY_REQUEST_EVENT)); };

/** Where this tab remembers that the client hid the step-7 prompt of one session. */
export const copyPromptKey = (sessionId: string): string => `lagda:enotary:copy-prompt-hidden:${sessionId}`;
