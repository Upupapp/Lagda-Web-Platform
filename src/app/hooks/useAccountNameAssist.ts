// A participant's full name, filled in from their LAGDA account.
//
// The sender gives an email. If that exact address belongs to a LAGDA account,
// the name comes from the account and the field is locked; an Edit button
// unlocks it for this one document (it never changes the account). If there is
// no account, the sender types the name, as before.
//
// ── What the check is, and is not ──────────────────────────────────────────
//
// One complete address at a time, sent once the sender pauses typing. It is the
// same exact-match lookup Contacts › Find people uses: rate-limited per user on
// the server, and silent about anyone who chose not to be discoverable (they
// come back as "no account"). There is no search across accounts.
//
// A check that cannot be made (offline, limit reached, not allowed) is not an
// error: the name field just stays open. Adding a participant never waits on it.

import { useCallback, useEffect, useRef, useState } from "react";
import { contactConnectionsAvailable, contactConnectionsService } from "../services/real/contact-connections.service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAUSE_MS = 500;

type Answer = { state: "found"; accountName: string } | { state: "none" };
/** Answers already given this session, so the same address is asked once. */
const answers = new Map<string, Answer>();
/** Test seam: forget what was answered. */
export function forgetAccountNameAnswers(): void { answers.clear(); }

export type NameOrigin =
  /** Nothing known: the sender types the name. */
  | "manual"
  | "checking"
  /** Filled from the account, and locked. */
  | "account"
  /** An account exists, and the sender chose a different name for this document. */
  | "edited"
  /** Filled from one of the sender's own contacts, and locked. */
  | "contact"
  /** Checked: no account uses this address. */
  | "no-account";

export interface AccountNameAssist {
  origin: NameOrigin;
  /** The name field is read-only until Edit is pressed. */
  locked: boolean;
  /** The account's own name, when one is known. */
  accountName: string | null;
  /** Unlock the name for this document. */
  edit: () => void;
  /** Go back to the account's name, locked. */
  revertToAccountName: () => void;
  /** The sender typed in the email field. */
  noteEmailTyped: () => void;
  /** The sender chose a person from the picker. */
  notePicked: (person: { email: string; name: string; from: "account" | "contact" }) => void;
}

export function useAccountNameAssist({ workspaceId, email, name, onName }: {
  workspaceId: string | null | undefined;
  email: string;
  name: string;
  onName: (name: string) => void;
}): AccountNameAssist {
  const enabled = contactConnectionsAvailable(workspaceId);
  const key = email.trim().toLowerCase();
  const valid = EMAIL_RE.test(key);

  const [answer, setAnswer] = useState<{ key: string; value: Answer | "checking" } | null>(null);
  const [picked, setPicked] = useState<{ key: string; name: string; from: "account" | "contact" } | null>(null);
  const [unlockedKey, setUnlockedKey] = useState<string | null>(null);

  // Read inside the lookup's callback without re-running it on every keystroke.
  const nameRef = useRef(name); nameRef.current = name;
  const onNameRef = useRef(onName); onNameRef.current = onName;
  const emailTyped = useRef(false);

  const pickedHere = picked !== null && picked.key === key ? picked : null;

  useEffect(() => {
    if (!enabled || !valid || workspaceId == null) { setAnswer(null); return; }
    // Chosen from the picker: who they are is already known.
    if (pickedHere !== null) return;

    const apply = (value: Answer) => {
      setAnswer({ key, value });
      // Fill the name when the sender has just given this address, or has not
      // given a name at all. A saved participant opened for editing keeps the
      // name it was saved with: it shows as "edited" if it differs.
      if (value.state === "found" && (emailTyped.current || nameRef.current.trim() === "")) {
        onNameRef.current(value.accountName);
      }
    };

    const known = answers.get(`${workspaceId}|${key}`);
    if (known) { apply(known); return; }

    let cancelled = false;
    setAnswer({ key, value: "checking" });
    const timer = setTimeout(() => {
      contactConnectionsService.lookup(workspaceId, key)
        .then(result => {
          const value: Answer = result.person !== null && result.person.displayName.trim() !== ""
            ? { state: "found", accountName: result.person.displayName.trim() }
            : { state: "none" };
          answers.set(`${workspaceId}|${key}`, value);
          if (!cancelled) apply(value);
        })
        .catch(() => { if (!cancelled) setAnswer(null); });
    }, PAUSE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, valid, workspaceId, key, pickedHere]);

  const current = answer !== null && answer.key === key ? answer.value : null;
  const accountName = pickedHere?.from === "account" ? pickedHere.name
    : current !== null && current !== "checking" && current.state === "found" ? current.accountName
    : null;
  const unlocked = unlockedKey === key;

  let origin: NameOrigin = "manual";
  if (!enabled || !valid) origin = "manual";
  else if (accountName !== null) origin = !unlocked && name.trim() === accountName ? "account" : "edited";
  else if (pickedHere?.from === "contact") origin = !unlocked && name.trim() === pickedHere.name ? "contact" : "manual";
  else if (current === "checking") origin = "checking";
  else if (current !== null && current.state === "none") origin = "no-account";

  const edit = useCallback(() => { setUnlockedKey(key); }, [key]);
  const revertToAccountName = useCallback(() => {
    if (accountName === null) return;
    setUnlockedKey(null);
    onNameRef.current(accountName);
  }, [accountName]);
  const noteEmailTyped = useCallback(() => { emailTyped.current = true; setUnlockedKey(null); }, []);
  const notePicked = useCallback((person: { email: string; name: string; from: "account" | "contact" }) => {
    setPicked({ key: person.email.trim().toLowerCase(), name: person.name.trim(), from: person.from });
    setUnlockedKey(null);
  }, []);

  return {
    origin, locked: origin === "account" || origin === "contact",
    accountName, edit, revertToAccountName, noteEmailTyped, notePicked,
  };
}
