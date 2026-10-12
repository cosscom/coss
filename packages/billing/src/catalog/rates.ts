/** List prices. A price change is a new dated card: periods before it keep the old prices. */
import type { MeterKey } from "./meters.ts";

/** Units up to and including `upTo` (cumulative; `null` = no limit) cost `unitNanos` each. */
export type Tier = { upTo: number | null; unitNanos: bigint };

export type Rate = {
  /**
   * `graduated`: each unit is priced by the tier its position falls in (no price cliffs).
   * `volume`: every unit is priced by the tier the window's total falls in.
   */
  mode: "graduated" | "volume";
  tiers: readonly Tier[];
  /**
   * Where tier positions are counted from: the billing period (default) or the contract's term
   * (annual volume deals: the 2nd million of the year is cheaper, whichever month it falls in).
   */
  tierWindow?: "period" | "term";
};

/** A meter's rates: one for every dimension value, overridable per value (`country=US`). */
export type MeterRates = {
  default?: Rate;
  byDimension?: Readonly<Record<string, Rate>>;
};

export type RateCard = {
  effectiveFrom: Date;
  rates: Readonly<Partial<Record<MeterKey, MeterRates>>>;
};

export function flatRate(unitNanos: bigint): Rate {
  return { mode: "graduated", tiers: [{ upTo: null, unitNanos }] };
}

/** In ascending `effectiveFrom` order. */
export const RATE_CARDS: readonly RateCard[] = [
  {
    effectiveFrom: new Date("2026-01-01T00:00:00Z"),
    rates: {
      // $0.40 per 1,000 recipients; $0.30 from the 1,000,001st; $0.22 from the 10,000,001st.
      "email.recipients": {
        default: {
          mode: "graduated",
          tiers: [
            { upTo: 1_000_000, unitNanos: 400_000n },
            { upTo: 10_000_000, unitNanos: 300_000n },
            { upTo: null, unitNanos: 220_000n },
          ],
        },
      },
      // US only; other countries are priced per contract.
      "sms.segments": { byDimension: { "country=US": flatRate(13_500_000n) } },
      // $1.50 per 1,000 participant-minutes.
      "video.participant_minutes": { default: flatRate(1_500_000n) },
      // $0.10 per booking.
      "scheduling.bookings": { default: flatRate(100_000_000n) },
    },
  },
];

/** The list prices in effect at `at` (the first card for earlier dates). */
export function rateCardAt(at: Date, cards: readonly RateCard[] = RATE_CARDS): RateCard {
  let current = cards[0];
  if (!current) throw new Error("No rate card is defined.");
  for (const card of cards) if (card.effectiveFrom <= at) current = card;
  return current;
}

/** The rate for one dimension value: its own, else the meter's default. */
export function rateFor(rates: MeterRates | undefined, dimension: string): Rate | null {
  return rates?.byDimension?.[dimension] ?? rates?.default ?? null;
}
