// The places inside Contacts: the active address book ("All Contacts"),
// "Requests From Contacts", and the "Archived" contacts. They are separate
// routes, so this is navigation (links with aria-current), not an in-page
// tablist.

import { Link } from "react-router";
import { TabStrip } from "../../../components/platform/TabStrip";
import { CONTACT_REQUESTS_ROUTE } from "../../../models/contact-requests";

const GF = { fontFamily: "'Geist', sans-serif" } as const;

export type ContactsSection = "all" | "requests" | "archived";

export const ARCHIVED_CONTACTS_ROUTE = "/app/contacts/archived";

export function ContactsSectionNav({ current }: { current: ContactsSection }) {
  const items: { key: ContactsSection; label: string; to: string }[] = [
    { key: "all", label: "All Contacts", to: "/app/contacts" },
    { key: "requests", label: "Requests From Contacts", to: CONTACT_REQUESTS_ROUTE },
    { key: "archived", label: "Archived", to: ARCHIVED_CONTACTS_ROUTE },
  ];
  return (
    <TabStrip label="Contacts sections" activeKey={current} className="contacts-viewstrip">
      {items.map(item => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            to={item.to}
            aria-current={active ? "page" : undefined}
            style={{
              ...GF, fontSize: 13, fontWeight: active ? 700 : 500, textDecoration: "none",
              padding: "6px 12px", borderRadius: 8, whiteSpace: "nowrap",
              display: "inline-flex", alignItems: "center",
              background: active ? "#F0F7FF" : "transparent",
              // #005A9E on #F0F7FF is 6.6:1; #475569 on white is 7.6:1.
              color: active ? "#005A9E" : "#475569",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </TabStrip>
  );
}
