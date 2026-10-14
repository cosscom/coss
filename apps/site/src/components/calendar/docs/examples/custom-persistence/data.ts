import {
  buildSeedEvents,
  type CalEvent,
  dateOnlyAfter,
  dateOnlyAt,
  instantAt,
  PAYLOAD_VERSION,
  type PayloadV2,
  type PersistenceAdapter,
  readPayload,
  resolveView,
} from "kloq";

export const TENANTS = ["acme", "globex"] as const;
export type Tenant = (typeof TENANTS)[number];

export const storageKey = (tenant: Tenant) => `kloq-example:${tenant}:events`;

export interface TenantAdapter extends PersistenceAdapter {
  clear(): void;
}

/**
 * sessionStorage, one key per tenant. The payload is kloq's own versioned envelope
 * (`{ v: 2, events }`), so `readPayload` does the checking: an unknown version or a
 * corrupt copy reads as null — "nothing stored" — and the seeds stay.
 */
export function sessionAdapter(tenant: Tenant): TenantAdapter {
  const key = storageKey(tenant);
  return {
    load() {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? (readPayload(JSON.parse(raw))?.events ?? null) : null;
      } catch {
        return null;
      }
    },
    save(events) {
      const payload: PayloadV2 = { v: PAYLOAD_VERSION, events };
      try {
        sessionStorage.setItem(key, JSON.stringify(payload));
      } catch {
        // quota / private mode — the change still applies in memory
      }
    },
    clear() {
      sessionStorage.removeItem(key);
    },
  };
}

/** Each tenant starts from its own week, so a switch is visibly a different calendar. */
export function seedsFor(tenant: Tenant, now = new Date()): CalEvent[] {
  if (tenant === "acme") return buildSeedEvents(now);
  const week = resolveView("week", 1, now);
  const at = (day: number, hour: number, minute = 0) => instantAt(week, day, hour * 60 + minute);
  return [
    {
      id: "globex-allhands",
      title: "Globex all-hands",
      start: at(0, 10),
      end: at(0, 11),
      color: "emerald",
    },
    {
      id: "globex-inspection",
      title: "Cooling tower inspection",
      start: at(1, 14),
      end: at(1, 16),
      color: "amber",
      location: "Plant 3",
    },
    {
      id: "globex-hank",
      title: "1:1 with Hank",
      start: at(2, 9, 30),
      end: at(2, 10),
      color: "violet",
    },
    {
      id: "globex-supplier",
      title: "Supplier review",
      start: at(3, 13),
      end: at(3, 14, 30),
      color: "blue",
    },
    {
      id: "globex-offsite",
      title: "Offsite",
      allDay: true,
      start: dateOnlyAt(week, 4),
      end: dateOnlyAfter(week, 4),
      color: "rose",
    },
  ];
}
