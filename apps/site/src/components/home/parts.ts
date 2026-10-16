/** The catalog's contents: coss.com's products. */

export type PartId = "email" | "sms" | "video" | "scheduling";

export interface Product {
  id: PartId;
  name: string;
  /** The SDK namespace. */
  call: string;
  summary: string;
  features: readonly string[];
}

export const PRODUCTS: readonly Product[] = [
  {
    id: "email",
    name: "Email",
    call: "coss.email",
    summary: "Transactional email from your own domains, tracked to every recipient.",
    features: [
      "Single, batch and scheduled sends",
      "Per-recipient delivery events",
      "Open and click tracking",
    ],
  },
  {
    id: "sms",
    name: "SMS",
    call: "coss.sms",
    summary: "Text messages worldwide, on the same key, events and logs as email.",
    features: [
      "Send and receive",
      "Delivery events on your webhooks",
      "Shared suppressions and logs",
    ],
  },
  {
    id: "video",
    name: "Video",
    call: "coss.video",
    summary: "Rooms and recordings for the calls inside your product.",
    features: ["Rooms on demand", "Recordings", "Call events on your webhooks"],
  },
  {
    id: "scheduling",
    name: "Scheduling",
    call: "coss.scheduling",
    summary: "Availability and bookings, from the team behind Cal.com.",
    features: [
      "Availability across calendars",
      "Bookings and reschedules",
      "Booking events on your webhooks",
    ],
  },
];
