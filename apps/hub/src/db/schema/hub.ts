import { customType, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/** Raw bytes (an uploaded avatar). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * A hub profile: what onboarding asks after sign-up. One per account, keyed by the Better Auth
 * user; `handle` is the public name (`/<handle>`), unique across the hub and never a seeded
 * person's or a route's.
 */
export const hubProfile = pgTable("hub_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  company: text("company"),
  location: text("location"),
  website: text("website"),
  /** "contributor" (asks for changes) or "maintainer" (decides on them). */
  role: text("role").notNull().default("contributor"),
  /** What they build or run: a short free text ("a three-person studio on Cal.com"). */
  builds: text("builds"),
  /** The software factory they bring, if any (Shipyard, Devin, …). */
  factory: text("factory"),
  avatar: bytea("avatar"),
  avatarType: text("avatar_type"),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
