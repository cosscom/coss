/**
 * Mock data for event types that matches Cal.com's data structure.
 * This enables easier integration with the actual Cal.com API later.
 *
 * Based on Cal.com's EventType model from packages/prisma/schema.prisma
 * and the data returned by viewer.eventTypes.getEventTypesFromGroup
 */

import type { SchedulingType } from "./event-types-types";

/**
 * User type matching Cal.com's user select in eventTypeRepository
 */
export interface EventTypeUser {
  id: number;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  timeZone: string;
}

/**
 * Host type for team event types
 */
export interface EventTypeHost {
  isFixed: boolean;
  userId: number;
  priority: number | null;
  weight: number | null;
  weightAdjustment: number | null;
  user: EventTypeUser;
}

/**
 * Hashed link for private event URLs
 */
export interface HashedLink {
  id: number;
  link: string;
  expiresAt: Date | null;
  maxUsageCount: number | null;
  usageCount: number;
}

/**
 * Child event type (for managed event types)
 */
export interface ChildEventType {
  id: number;
  slug: string;
  hidden: boolean;
  users: EventTypeUser[];
}

/**
 * Event type color configuration
 */
export interface EventTypeColor {
  lightEventTypeColor: string;
  darkEventTypeColor: string;
}

/**
 * Recurring event configuration
 */
export interface RecurringEvent {
  freq: number; // 0 = yearly, 1 = monthly, 2 = weekly, 3 = daily
  count: number;
  interval: number;
}

/**
 * Main EventType interface matching Cal.com's structure
 */
export interface EventType {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  length: number; // Duration in minutes
  hidden: boolean;
  position: number;

  // Scheduling
  schedulingType: SchedulingType | null;
  recurringEvent: RecurringEvent | null;

  // User/Team ownership
  userId: number | null;
  teamId: number | null;
  parentId: number | null;

  // Related data
  users: EventTypeUser[];
  hosts: EventTypeHost[];
  children: ChildEventType[];
  hashedLink: HashedLink[];

  // Visual
  eventTypeColor: EventTypeColor | null;

  // Computed/derived (added by mapEventType)
  safeDescription: string | null;

  // Additional fields from eventTypeSelect
  requiresConfirmation: boolean;
  metadata: Record<string, unknown> | null;
  profileId: number | null;
  offsetStart: number;
  timeZone: string | null;
  periodType: "UNLIMITED" | "ROLLING" | "RANGE";
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  periodDays: number | null;
  periodCountCalendarDays: boolean | null;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  seatsPerTimeSlot: number | null;
  price: number;
  currency: string;
  slotInterval: number | null;
  isInstantEvent: boolean;
  locations: unknown[] | null;
  bookingFields: unknown[] | null;
  bookingLimits: Record<string, number> | null;
  durationLimits: Record<string, number> | null;
}

/**
 * Profile information for URL construction
 */
export interface EventTypeProfile {
  slug: string | null;
  name: string | null;
  image: string | null;
  eventTypesLockedByOrg: boolean;
}

/**
 * Event type group (personal or team)
 */
export interface EventTypeGroup {
  teamId: number | null;
  parentId: number | null;
  bookerUrl: string;
  profile: EventTypeProfile;
  metadata: {
    readOnly: boolean;
  };
}

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Mock users for event types - defined as named constants for type safety
 */
const userPasquale: EventTypeUser = {
  avatarUrl: null,
  id: 1,
  name: "Pasquale Vitiello",
  timeZone: "Europe/Rome",
  username: "pasquale",
};

const userAlex: EventTypeUser = {
  avatarUrl: null,
  id: 2,
  name: "Alex Chen",
  timeZone: "America/Los_Angeles",
  username: "alex",
};

const userSarah: EventTypeUser = {
  avatarUrl: null,
  id: 3,
  name: "Sarah Johnson",
  timeZone: "America/New_York",
  username: "sarah",
};

const userMike: EventTypeUser = {
  avatarUrl: null,
  id: 4,
  name: "Mike Wilson",
  timeZone: "Europe/London",
  username: "mike",
};

const mockUsers: EventTypeUser[] = [
  userPasquale,
  userAlex,
  userSarah,
  userMike,
];

/**
 * Mock event types matching Cal.com's data structure
 * Includes various scenarios for UI stress testing:
 * - Different durations (15, 30, 45, 60 min)
 * - Hidden and visible events
 * - Personal and team events
 * - Events with and without descriptions
 * - Events with recurring settings
 * - Events with private links
 * - Events with multiple hosts (round robin, collective)
 * - Managed event types with children
 * - Events with custom colors
 * - Paid events
 * - Seated events
 */
export const mockEventTypes: EventType[] = [
  // Personal event types
  {
    afterEventBuffer: 0,
    beforeEventBuffer: 0,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "A quick 15 minute call to discuss anything.",
    durationLimits: null,
    eventTypeColor: null,
    hashedLink: [],
    hidden: false,
    hosts: [],
    id: 1,
    isInstantEvent: false,
    length: 15,
    locations: [{ type: "integrations:daily" }],
    metadata: null,
    minimumBookingNotice: 120,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 0,
    price: 0,
    profileId: 1,
    recurringEvent: null,
    requiresConfirmation: false,
    safeDescription: "A quick 15 minute call to discuss anything.",
    schedulingType: null,
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "15min",
    teamId: null,
    timeZone: null,
    title: "15 Min Meeting",
    userId: 1,
    users: [userPasquale],
  },
  {
    afterEventBuffer: 5,
    beforeEventBuffer: 5,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "A standard 30 minute meeting for detailed discussions.",
    durationLimits: null,
    eventTypeColor: {
      darkEventTypeColor: "#818CF8",
      lightEventTypeColor: "#4F46E5",
    },
    hashedLink: [],
    hidden: false,
    hosts: [],
    id: 2,
    isInstantEvent: false,
    length: 30,
    locations: [{ type: "integrations:zoom" }],
    metadata: null,
    minimumBookingNotice: 120,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 1,
    price: 0,
    profileId: 1,
    recurringEvent: null,
    requiresConfirmation: false,
    safeDescription: "A standard 30 minute meeting for detailed discussions.",
    schedulingType: null,
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "30min",
    teamId: null,
    timeZone: null,
    title: "30 Min Meeting",
    userId: 1,
    users: [userPasquale],
  },
  {
    afterEventBuffer: 15,
    beforeEventBuffer: 15,
    bookingFields: null,
    bookingLimits: { PER_DAY: 3 },
    children: [],
    currency: "usd",
    description:
      "An in-depth consultation session for complex topics requiring detailed discussion and planning.",
    durationLimits: null,
    eventTypeColor: {
      darkEventTypeColor: "#34D399",
      lightEventTypeColor: "#059669",
    },
    hashedLink: [],
    hidden: false,
    hosts: [],
    id: 3,
    isInstantEvent: false,
    length: 60,
    locations: [{ type: "integrations:google_meet" }],
    metadata: null,
    minimumBookingNotice: 1440, // 24 hours
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 2,
    price: 0,
    profileId: 1,
    recurringEvent: null,
    requiresConfirmation: true,
    safeDescription:
      "An in-depth consultation session for complex topics requiring detailed discussion and planning.",
    schedulingType: null,
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "consultation",
    teamId: null,
    timeZone: null,
    title: "60 Min Consultation",
    userId: 1,
    users: [userPasquale],
  },
  {
    afterEventBuffer: 0,
    beforeEventBuffer: 0,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "A private meeting only accessible via direct link.",
    durationLimits: null,
    eventTypeColor: null,
    hashedLink: [
      {
        expiresAt: null,
        id: 1,
        link: "abc123xyz",
        maxUsageCount: null,
        usageCount: 5,
      },
    ],
    hidden: true,
    hosts: [],
    id: 4,
    isInstantEvent: false,
    length: 30,
    locations: [{ type: "integrations:daily" }],
    metadata: null,
    minimumBookingNotice: 120,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 3,
    price: 0,
    profileId: 1,
    recurringEvent: null,
    requiresConfirmation: false,
    safeDescription: "A private meeting only accessible via direct link.",
    schedulingType: null,
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "secret",
    teamId: null,
    timeZone: null,
    title: "Secret Meeting",
    userId: 1,
    users: [userPasquale],
  },
  {
    afterEventBuffer: 10,
    beforeEventBuffer: 10,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "Premium consultation with payment required.",
    durationLimits: null,
    eventTypeColor: {
      darkEventTypeColor: "#F87171",
      lightEventTypeColor: "#DC2626",
    },
    hashedLink: [],
    hidden: false,
    hosts: [],
    id: 5,
    isInstantEvent: false,
    length: 45,
    locations: [{ type: "integrations:zoom" }],
    metadata: {
      apps: {
        stripe: {
          currency: "usd",
          enabled: true,
          price: 9900, // $99.00 in cents
        },
      },
    },
    minimumBookingNotice: 1440,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 4,
    price: 9900,
    profileId: 1,
    recurringEvent: null,
    requiresConfirmation: false,
    safeDescription: "Premium consultation with payment required.",
    schedulingType: null,
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "paid-consultation",
    teamId: null,
    timeZone: null,
    title: "Paid Consultation",
    userId: 1,
    users: [userPasquale],
  },
  {
    afterEventBuffer: 0,
    beforeEventBuffer: 0,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "Recurring weekly sync meeting.",
    durationLimits: null,
    eventTypeColor: null,
    hashedLink: [],
    hidden: false,
    hosts: [],
    id: 6,
    isInstantEvent: false,
    length: 30,
    locations: [{ type: "integrations:daily" }],
    metadata: null,
    minimumBookingNotice: 120,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 5,
    price: 0,
    profileId: 1,
    recurringEvent: {
      count: 12,
      freq: 2, // Weekly
      interval: 1,
    },
    requiresConfirmation: false,
    safeDescription: "Recurring weekly sync meeting.",
    schedulingType: null,
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "weekly-sync",
    teamId: null,
    timeZone: null,
    title: "Weekly Sync",
    userId: 1,
    users: [userPasquale],
  },
  {
    afterEventBuffer: 15,
    beforeEventBuffer: 30,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "Group webinar session with multiple attendees.",
    durationLimits: null,
    eventTypeColor: {
      darkEventTypeColor: "#A78BFA",
      lightEventTypeColor: "#7C3AED",
    },
    hashedLink: [],
    hidden: false,
    hosts: [],
    id: 7,
    isInstantEvent: false,
    length: 60,
    locations: [{ type: "integrations:zoom" }],
    metadata: null,
    minimumBookingNotice: 2880, // 48 hours
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 6,
    price: 0,
    profileId: 1,
    recurringEvent: null,
    requiresConfirmation: true,
    safeDescription: "Group webinar session with multiple attendees.",
    schedulingType: null,
    seatsPerTimeSlot: 50,
    slotInterval: null,
    slug: "webinar",
    teamId: null,
    timeZone: null,
    title: "Webinar",
    userId: 1,
    users: [userPasquale],
  },
  {
    afterEventBuffer: 0,
    beforeEventBuffer: 0,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "Start a meeting right now.",
    durationLimits: null,
    eventTypeColor: null,
    hashedLink: [],
    hidden: true,
    hosts: [],
    id: 8,
    isInstantEvent: true,
    length: 15,
    locations: [{ type: "integrations:daily" }],
    metadata: null,
    minimumBookingNotice: 0,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 7,
    price: 0,
    profileId: 1,
    recurringEvent: null,
    requiresConfirmation: false,
    safeDescription: "Start a meeting right now.",
    schedulingType: null,
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "instant",
    teamId: null,
    timeZone: null,
    title: "Instant Meeting",
    userId: 1,
    users: [userPasquale],
  },

  // Team event types
  {
    afterEventBuffer: 0,
    beforeEventBuffer: 0,
    bookingFields: null,
    bookingLimits: null,
    children: [],
    currency: "usd",
    description: "Daily team standup meeting.",
    durationLimits: null,
    eventTypeColor: null,
    hashedLink: [],
    hidden: false,
    hosts: [
      {
        isFixed: true,
        priority: null,
        user: userPasquale,
        userId: 1,
        weight: null,
        weightAdjustment: null,
      },
      {
        isFixed: true,
        priority: null,
        user: userAlex,
        userId: 2,
        weight: null,
        weightAdjustment: null,
      },
      {
        isFixed: true,
        priority: null,
        user: userSarah,
        userId: 3,
        weight: null,
        weightAdjustment: null,
      },
    ],
    id: 100,
    isInstantEvent: false,
    length: 15,
    locations: [{ type: "integrations:daily" }],
    metadata: null,
    minimumBookingNotice: 60,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 0,
    price: 0,
    profileId: null,
    recurringEvent: {
      count: 30,
      freq: 3, // Daily
      interval: 1,
    },
    requiresConfirmation: false,
    safeDescription: "Daily team standup meeting.",
    schedulingType: "COLLECTIVE",
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "standup",
    teamId: 1,
    timeZone: null,
    title: "Team Standup",
    userId: null,
    users: [],
  },
  {
    afterEventBuffer: 5,
    beforeEventBuffer: 5,
    bookingFields: null,
    bookingLimits: { PER_DAY: 10 },
    children: [],
    currency: "usd",
    description: "Connect with our sales team.",
    durationLimits: null,
    eventTypeColor: {
      darkEventTypeColor: "#22D3EE",
      lightEventTypeColor: "#0891B2",
    },
    hashedLink: [],
    hidden: false,
    hosts: [
      {
        isFixed: false,
        priority: 1,
        user: userAlex,
        userId: 2,
        weight: 100,
        weightAdjustment: 0,
      },
      {
        isFixed: false,
        priority: 2,
        user: userSarah,
        userId: 3,
        weight: 100,
        weightAdjustment: 0,
      },
      {
        isFixed: false,
        priority: 3,
        user: userMike,
        userId: 4,
        weight: 50,
        weightAdjustment: 0,
      },
    ],
    id: 101,
    isInstantEvent: false,
    length: 30,
    locations: [{ type: "integrations:zoom" }],
    metadata: null,
    minimumBookingNotice: 120,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 1,
    price: 0,
    profileId: null,
    recurringEvent: null,
    requiresConfirmation: false,
    safeDescription: "Connect with our sales team.",
    schedulingType: "ROUND_ROBIN",
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "sales",
    teamId: 1,
    timeZone: null,
    title: "Sales Call",
    userId: null,
    users: [],
  },
  {
    afterEventBuffer: 15,
    beforeEventBuffer: 15,
    bookingFields: null,
    bookingLimits: { PER_WEEK: 5 },
    children: [],
    currency: "usd",
    description: "Technical interview with our engineering team.",
    durationLimits: null,
    eventTypeColor: {
      darkEventTypeColor: "#FB923C",
      lightEventTypeColor: "#EA580C",
    },
    hashedLink: [],
    hidden: false,
    hosts: [
      {
        isFixed: true,
        priority: null,
        user: userPasquale,
        userId: 1,
        weight: null,
        weightAdjustment: null,
      },
      {
        isFixed: true,
        priority: null,
        user: userAlex,
        userId: 2,
        weight: null,
        weightAdjustment: null,
      },
    ],
    id: 102,
    isInstantEvent: false,
    length: 60,
    locations: [{ type: "integrations:google_meet" }],
    metadata: null,
    minimumBookingNotice: 2880, // 48 hours
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: true,
    periodDays: 30,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "ROLLING",
    position: 2,
    price: 0,
    profileId: null,
    recurringEvent: null,
    requiresConfirmation: true,
    safeDescription: "Technical interview with our engineering team.",
    schedulingType: "COLLECTIVE",
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "tech-interview",
    teamId: 1,
    timeZone: null,
    title: "Technical Interview",
    userId: null,
    users: [],
  },

  // Managed event type with children
  {
    afterEventBuffer: 5,
    beforeEventBuffer: 5,
    bookingFields: null,
    bookingLimits: null,
    children: [
      {
        hidden: false,
        id: 201,
        slug: "one-on-one",
        users: [userAlex],
      },
      {
        hidden: false,
        id: 202,
        slug: "one-on-one",
        users: [userSarah],
      },
      {
        hidden: true,
        id: 203,
        slug: "one-on-one",
        users: [userMike],
      },
    ],
    currency: "usd",
    description: "Personal one-on-one meeting with team members.",
    durationLimits: null,
    eventTypeColor: null,
    hashedLink: [],
    hidden: false,
    hosts: [],
    id: 200,
    isInstantEvent: false,
    length: 30,
    locations: [{ type: "integrations:daily" }],
    metadata: {
      managedEventConfig: {
        unlockedFields: ["locations", "description"],
      },
    },
    minimumBookingNotice: 120,
    offsetStart: 0,
    parentId: null,
    periodCountCalendarDays: null,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodType: "UNLIMITED",
    position: 0,
    price: 0,
    profileId: null,
    recurringEvent: null,
    requiresConfirmation: false,
    safeDescription: "Personal one-on-one meeting with team members.",
    schedulingType: "MANAGED",
    seatsPerTimeSlot: null,
    slotInterval: null,
    slug: "one-on-one",
    teamId: 1,
    timeZone: null,
    title: "One-on-One",
    userId: null,
    users: [],
  },
];

/**
 * Mock event type groups (personal + team)
 */
export const mockEventTypeGroups: EventTypeGroup[] = [
  {
    bookerUrl: "https://cal.com",
    metadata: {
      readOnly: false,
    },
    parentId: null,
    profile: {
      eventTypesLockedByOrg: false,
      image: null,
      name: "Pasquale Vitiello",
      slug: "pasquale",
    },
    teamId: null,
  },
  {
    bookerUrl: "https://cal.com",
    metadata: {
      readOnly: false,
    },
    parentId: null,
    profile: {
      eventTypesLockedByOrg: false,
      image: null,
      name: "Acme Team",
      slug: "acme-team",
    },
    teamId: 1,
  },
];

/**
 * Helper to get personal event types
 */
export function getPersonalEventTypes(): EventType[] {
  return mockEventTypes.filter((et) => et.teamId === null);
}

/**
 * Helper to get team event types
 */
export function getTeamEventTypes(teamId: number): EventType[] {
  return mockEventTypes.filter((et) => et.teamId === teamId);
}

/**
 * Helper to format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Helper to build event type URL path
 */
export function buildEventTypePath(
  eventType: EventType,
  profile: EventTypeProfile,
): string {
  return `/${profile.slug}/${eventType.slug}`;
}
