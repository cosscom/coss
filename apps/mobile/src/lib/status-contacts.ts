import type { ContactPropertyType, ContactStatus } from "@coss/companion";
import type { Tone } from "./theme";

// apps/web/src/components/marketing.tsx (ContactStatusBadge).
export const CONTACT_STATUS: Record<ContactStatus, [Tone, string]> = {
  subscribed: ["success", "Subscribed"],
  unsubscribed: ["neutral", "Unsubscribed"],
  pending: ["warning", "Pending"],
};

// The dashboard's contacts/properties/page.tsx (TYPE_LABELS).
export const PROPERTY_TYPE_LABELS: Record<ContactPropertyType, string> = {
  string: "Text",
  number: "Number",
  boolean: "True / false",
  date: "Date",
};
