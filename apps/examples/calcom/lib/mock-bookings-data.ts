/**
 * Mock data for bookings that matches Cal.com's data structure.
 * This enables easier integration with the actual Cal.com API later.
 *
 * Based on Cal.com's Booking model from packages/trpc/server/routers/viewer/bookings/get.handler.ts
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type BookingStatus =
  | "ACCEPTED"
  | "PENDING"
  | "CANCELLED"
  | "REJECTED"
  | "AWAITING_HOST";

export type SchedulingType = "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null;

export interface BookingUser {
  id: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  timeZone: string;
}

export interface BookingAttendee {
  id: number;
  email: string;
  name: string;
  timeZone: string;
  locale: string | null;
  bookingId: number;
  noShow: boolean | null;
}

export interface BookingEventType {
  id: number;
  slug: string;
  title: string;
  eventName: string | null;
  price: number;
  recurringEvent: {
    freq: number;
    count: number;
    interval: number;
  } | null;
  currency: string;
  metadata: Record<string, unknown> | null;
  disableGuests: boolean;
  bookingFields: unknown[] | null;
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean;
  seatsShowAvailabilityCount: boolean;
  eventTypeColor: {
    lightEventTypeColor: string;
    darkEventTypeColor: string;
  } | null;
  customReplyToEmail: string | null;
  allowReschedulingPastBookings: boolean;
  hideOrganizerEmail: boolean;
  disableCancelling: boolean;
  disableRescheduling: boolean;
  minimumRescheduleNotice: number;
  teamId: number | null;
  parentId: number | null;
  schedulingType: SchedulingType;
  hosts: {
    userId: number;
    user: {
      id: number;
      email: string;
    };
  }[];
  length: number;
  team: {
    id: number;
    name: string;
    slug: string;
  } | null;
  hostGroups: {
    id: number;
    name: string;
  }[];
}

export interface BookingReference {
  id: number;
  type: string;
  uid: string;
  meetingId: string | null;
  meetingPassword: string | null;
  meetingUrl: string | null;
  bookingId: number;
  externalCalendarId: string | null;
  deleted: boolean | null;
  credentialId: number | null;
}

export interface BookingPayment {
  paymentOption: string | null;
  amount: number;
  currency: string;
  success: boolean;
  appId: string | null;
  refunded: boolean;
}

export interface BookingSeat {
  referenceUid: string;
  attendee: {
    email: string;
  };
}

export interface AssignmentReason {
  id: number;
  reasonString: string;
  bookingId: number;
  createdAt: Date;
}

export interface BookingReport {
  id: number;
  reportedById: number;
  reason: string;
  description: string | null;
  createdAt: Date;
}

export interface Booking {
  id: number;
  title: string;
  userPrimaryEmail: string | null;
  description: string | null;
  customInputs: Record<string, unknown> | null;
  startTime: Date;
  createdAt: Date;
  updatedAt: Date;
  endTime: Date;
  metadata: Record<string, unknown> | null;
  uid: string;
  responses: Record<string, unknown> | null;
  recurringEventId: string | null;
  location: string | null;
  status: BookingStatus;
  paid: boolean;
  fromReschedule: string | null;
  rescheduled: boolean;
  rescheduledBy: string | null;
  cancelledBy: string | null;
  isRecorded: boolean;
  cancellationReason: string | null;
  rejectionReason: string | null;
  routedFromRoutingFormReponse: { id: number } | null;
  eventType: BookingEventType | null;
  references: BookingReference[];
  payment: BookingPayment[];
  user: BookingUser | null;
  attendees: BookingAttendee[];
  seatsReferences: BookingSeat[];
  assignmentReason: AssignmentReason[];
  report: BookingReport | null;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const userPasquale: BookingUser = {
  avatarUrl: null,
  email: "pasquale@cal.com",
  id: 1,
  name: "Pasquale Vitiello",
  timeZone: "Europe/Rome",
  username: "pasquale",
};

const _userKeith: BookingUser = {
  avatarUrl: null,
  email: "keith@cal.com",
  id: 2,
  name: "Keith Williams",
  timeZone: "America/Los_Angeles",
  username: "keith",
};

const _userPeer: BookingUser = {
  avatarUrl: null,
  email: "peer@cal.com",
  id: 3,
  name: "Peer Richelsen",
  timeZone: "Europe/London",
  username: "peer",
};

const _userCarina: BookingUser = {
  avatarUrl: null,
  email: "carina@cal.com",
  id: 4,
  name: "Carina Wollheim",
  timeZone: "Europe/Berlin",
  username: "carina",
};

const _userJonathan: BookingUser = {
  avatarUrl: null,
  email: "jonathan@cal.com",
  id: 5,
  name: "Jonathan Djalo",
  timeZone: "Europe/London",
  username: "jonathan",
};

const _userSusan: BookingUser = {
  avatarUrl: null,
  email: "susan@example.com",
  id: 6,
  name: "Susan Moeller",
  timeZone: "America/New_York",
  username: "susan",
};

const _userDavid: BookingUser = {
  avatarUrl: null,
  email: "david@example.com",
  id: 7,
  name: "David Borenius",
  timeZone: "Europe/Stockholm",
  username: "david",
};

const defaultEventType: BookingEventType = {
  allowReschedulingPastBookings: false,
  bookingFields: null,
  currency: "usd",
  customReplyToEmail: null,
  disableCancelling: false,
  disableGuests: false,
  disableRescheduling: false,
  eventName: null,
  eventTypeColor: null,
  hideOrganizerEmail: false,
  hostGroups: [],
  hosts: [],
  id: 1,
  length: 30,
  metadata: null,
  minimumRescheduleNotice: 0,
  parentId: null,
  price: 0,
  recurringEvent: null,
  schedulingType: null,
  seatsPerTimeSlot: null,
  seatsShowAttendees: false,
  seatsShowAvailabilityCount: false,
  slug: "30min",
  team: null,
  teamId: null,
  title: "30 Min Meeting",
};

const defaultBookingFields = {
  assignmentReason: [],
  cancellationReason: null,
  cancelledBy: null,
  customInputs: null,
  fromReschedule: null,
  isRecorded: false,
  metadata: null,
  paid: false,
  payment: [],
  recurringEventId: null,
  references: [],
  rejectionReason: null,
  report: null,
  rescheduledBy: null,
  responses: null,
  routedFromRoutingFormReponse: null,
  seatsReferences: [],
};

export const mockPastBookings: Booking[] = [
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 1,
        email: "keith@cal.com",
        id: 1,
        locale: "en",
        name: "Keith Williams",
        noShow: false,
        timeZone: "America/Los_Angeles",
      },
      {
        bookingId: 1,
        email: "pasquale@cal.com",
        id: 2,
        locale: "en",
        name: "Pasquale Vitiello",
        noShow: false,
        timeZone: "Europe/Rome",
      },
    ],
    createdAt: new Date("2025-11-20T10:00:00"),
    description:
      "Weekly engineering sync to discuss ongoing projects and blockers.",
    endTime: new Date("2025-11-25T15:00:00"),
    eventType: {
      ...defaultEventType,
      id: 10,
      length: 20,
      slug: "engineering-chat",
      title: "Engineering Chat",
    },
    id: 1,
    location: "integrations:daily",
    rescheduled: true,
    startTime: new Date("2025-11-25T14:40:00"),
    status: "ACCEPTED",
    title: "Engineering Chat between Keith Williams and Pasquale Vitiello",
    uid: "abc123-booking-1",
    updatedAt: new Date("2025-11-24T09:30:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 2,
        email: "carina@cal.com",
        id: 3,
        locale: "en",
        name: "Carina Wollheim",
        noShow: false,
        timeZone: "Europe/Berlin",
      },
      {
        bookingId: 2,
        email: "jonathan@cal.com",
        id: 4,
        locale: "en",
        name: "Jonathan Djalo",
        noShow: false,
        timeZone: "Europe/London",
      },
      {
        bookingId: 2,
        email: "pasquale@cal.com",
        id: 5,
        locale: "en",
        name: "Pasquale Vitiello",
        noShow: false,
        timeZone: "Europe/Rome",
      },
    ],
    createdAt: new Date("2025-11-01T14:00:00"),
    description:
      "Discussion about the platform onboarding flow and upcoming improvements.",
    endTime: new Date("2025-11-07T12:00:00"),
    eventType: {
      ...defaultEventType,
      eventTypeColor: {
        darkEventTypeColor: "#f53468",
        lightEventTypeColor: "#f53468",
      },
      id: 11,
      slug: "platform-meeting",
      title: "Platform Meeting",
    },
    id: 2,
    location: "integrations:daily",
    rescheduled: false,
    startTime: new Date("2025-11-07T11:30:00"),
    status: "ACCEPTED",
    title: "Platform onboarding roadmap",
    uid: "abc123-booking-2",
    updatedAt: new Date("2025-11-01T14:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 3,
        email: "keith@cal.com",
        id: 6,
        locale: "en",
        name: "Keith Williams",
        noShow: false,
        timeZone: "America/Los_Angeles",
      },
      {
        bookingId: 3,
        email: "pasquale@cal.com",
        id: 7,
        locale: "en",
        name: "Pasquale Vitiello",
        noShow: false,
        timeZone: "Europe/Rome",
      },
    ],
    createdAt: new Date("2025-11-01T09:00:00"),
    description: null,
    endTime: new Date("2025-11-06T15:20:00"),
    eventType: {
      ...defaultEventType,
      id: 10,
      length: 20,
      slug: "engineering-chat",
      title: "Engineering Chat",
    },
    id: 3,
    location: "integrations:daily",
    rescheduled: false,
    startTime: new Date("2025-11-06T15:00:00"),
    status: "ACCEPTED",
    title: "Engineering Chat between Keith Williams and Pasquale Vitiello",
    uid: "abc123-booking-3",
    updatedAt: new Date("2025-11-01T09:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 4,
        email: "susan@example.com",
        id: 8,
        locale: "en",
        name: "Susan Moeller",
        noShow: false,
        timeZone: "America/New_York",
      },
      {
        bookingId: 4,
        email: "pasquale@cal.com",
        id: 9,
        locale: "en",
        name: "Pasquale Vitiello",
        noShow: false,
        timeZone: "Europe/Rome",
      },
    ],
    createdAt: new Date("2025-10-28T11:00:00"),
    description: "Quick sync about the new feature requirements.",
    endTime: new Date("2025-11-03T15:30:00"),
    eventType: defaultEventType,
    id: 4,
    location: "integrations:google_meet",
    rescheduled: false,
    startTime: new Date("2025-11-03T15:00:00"),
    status: "ACCEPTED",
    title: "30 Min Meeting between Susan Moeller and Pasquale Vitiello",
    uid: "abc123-booking-4",
    updatedAt: new Date("2025-10-28T11:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 5,
        email: "pasquale@cal.com",
        id: 10,
        locale: "en",
        name: "Pasquale Vitiello",
        noShow: false,
        timeZone: "Europe/Rome",
      },
      {
        bookingId: 5,
        email: "david@example.com",
        id: 11,
        locale: "en",
        name: "David Borenius",
        noShow: false,
        timeZone: "Europe/Stockholm",
      },
    ],
    createdAt: new Date("2025-10-01T08:00:00"),
    description: "Follow-up discussion on partnership opportunities.",
    endTime: new Date("2025-10-13T16:00:00"),
    eventType: defaultEventType,
    id: 5,
    location: "integrations:google_meet",
    rescheduled: true,
    startTime: new Date("2025-10-13T15:30:00"),
    status: "ACCEPTED",
    title: "30 Min Meeting between Pasquale Vitiello and David Borenius",
    uid: "abc123-booking-5",
    updatedAt: new Date("2025-10-12T14:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 6,
        email: "peer@cal.com",
        id: 12,
        locale: "en",
        name: "Peer Richelsen",
        noShow: false,
        timeZone: "Europe/London",
      },
      {
        bookingId: 6,
        email: "keith@cal.com",
        id: 13,
        locale: "en",
        name: "Keith Williams",
        noShow: false,
        timeZone: "America/Los_Angeles",
      },
      {
        bookingId: 6,
        email: "pasquale@cal.com",
        id: 14,
        locale: "en",
        name: "Pasquale Vitiello",
        noShow: false,
        timeZone: "Europe/Rome",
      },
    ],
    createdAt: new Date("2025-10-05T10:00:00"),
    description:
      "Planning session for the @coss/ui component library migration.",
    endTime: new Date("2025-10-10T17:30:00"),
    eventType: {
      ...defaultEventType,
      id: 12,
      schedulingType: "COLLECTIVE",
      slug: "team-meeting",
      team: {
        id: 1,
        name: "Cal.com",
        slug: "cal",
      },
      teamId: 1,
      title: "Team Meeting",
    },
    id: 6,
    location: "integrations:google_meet",
    rescheduled: false,
    startTime: new Date("2025-10-10T17:00:00"),
    status: "ACCEPTED",
    title: "@coss/ui migration",
    uid: "abc123-booking-6",
    updatedAt: new Date("2025-10-05T10:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 7,
        email: "alex@example.com",
        id: 15,
        locale: "en",
        name: "Alex Chen",
        noShow: false,
        timeZone: "America/Los_Angeles",
      },
    ],
    createdAt: new Date("2025-10-01T09:00:00"),
    description: "Premium consultation session.",
    endTime: new Date("2025-10-08T14:45:00"),
    eventType: {
      ...defaultEventType,
      eventTypeColor: {
        darkEventTypeColor: "#fd6d06",
        lightEventTypeColor: "#fd6d06",
      },
      id: 5,
      length: 45,
      price: 9900,
      slug: "paid-consultation",
      title: "Paid Consultation",
    },
    id: 7,
    location: "integrations:zoom",
    paid: true,
    payment: [
      {
        amount: 9900,
        appId: "stripe",
        currency: "usd",
        paymentOption: "ON_BOOKING",
        refunded: false,
        success: true,
      },
    ],
    rescheduled: false,
    startTime: new Date("2025-10-08T14:00:00"),
    status: "ACCEPTED",
    title: "Paid Consultation with Alex Chen",
    uid: "abc123-booking-7",
    updatedAt: new Date("2025-10-01T09:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 8,
        email: "designer@example.com",
        id: 16,
        locale: "en",
        name: "Jane Designer",
        noShow: null,
        timeZone: "America/New_York",
      },
    ],
    cancellationReason: "Schedule conflict - will reschedule for next week.",
    cancelledBy: "user",
    createdAt: new Date("2025-09-28T15:00:00"),
    description: "Review of the new design mockups.",
    endTime: new Date("2025-10-05T10:30:00"),
    eventType: {
      ...defaultEventType,
      id: 13,
      slug: "design-review",
      title: "Design Review",
    },
    id: 8,
    location: "integrations:daily",
    rescheduled: false,
    startTime: new Date("2025-10-05T10:00:00"),
    status: "CANCELLED",
    title: "Cancelled: Design Review",
    uid: "abc123-booking-8",
    updatedAt: new Date("2025-10-04T08:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 9,
        email: "team@cal.com",
        id: 17,
        locale: "en",
        name: "Team Member",
        noShow: false,
        timeZone: "Europe/London",
      },
    ],
    createdAt: new Date("2025-09-01T10:00:00"),
    description: "Weekly team sync - recurring meeting.",
    endTime: new Date("2025-10-02T09:30:00"),
    eventType: {
      ...defaultEventType,
      id: 6,
      recurringEvent: {
        count: 12,
        freq: 2,
        interval: 1,
      },
      slug: "weekly-sync",
      title: "Weekly Sync",
    },
    id: 9,
    location: "integrations:daily",
    recurringEventId: "recurring-abc123",
    rescheduled: false,
    startTime: new Date("2025-10-02T09:00:00"),
    status: "ACCEPTED",
    title: "Weekly Sync (Recurring)",
    uid: "abc123-booking-9",
    updatedAt: new Date("2025-09-01T10:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    assignmentReason: [
      {
        bookingId: 10,
        createdAt: new Date("2025-09-20T11:00:00"),
        id: 1,
        reasonString:
          "Round Robin: Assigned based on availability and equal distribution",
      },
    ],
    attendees: [
      {
        bookingId: 10,
        email: "prospect@company.com",
        id: 18,
        locale: "en",
        name: "John Prospect",
        noShow: false,
        timeZone: "America/Chicago",
      },
    ],
    createdAt: new Date("2025-09-20T11:00:00"),
    description: "Sales call assigned via round robin.",
    endTime: new Date("2025-09-28T16:30:00"),
    eventType: {
      ...defaultEventType,
      eventTypeColor: {
        darkEventTypeColor: "#0dbf82",
        lightEventTypeColor: "#0dbf82",
      },
      hosts: [
        {
          user: { email: "pasquale@cal.com", id: 1 },
          userId: 1,
        },
        {
          user: { email: "keith@cal.com", id: 2 },
          userId: 2,
        },
      ],
      id: 101,
      schedulingType: "ROUND_ROBIN",
      slug: "sales-call",
      team: {
        id: 1,
        name: "Cal.com",
        slug: "cal",
      },
      teamId: 1,
      title: "Sales Call",
    },
    id: 10,
    location: "integrations:zoom",
    rescheduled: false,
    startTime: new Date("2025-09-28T16:00:00"),
    status: "ACCEPTED",
    title: "Round Robin Sales Call",
    uid: "abc123-booking-10",
    updatedAt: new Date("2025-09-20T11:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 11,
        email: "attendee1@example.com",
        id: 19,
        locale: "en",
        name: "Attendee One",
        noShow: false,
        timeZone: "America/New_York",
      },
      {
        bookingId: 11,
        email: "attendee2@example.com",
        id: 20,
        locale: "fr",
        name: "Attendee Two",
        noShow: false,
        timeZone: "Europe/Paris",
      },
    ],
    createdAt: new Date("2025-09-10T10:00:00"),
    description: "Public webinar introducing Cal.com features.",
    endTime: new Date("2025-09-25T19:00:00"),
    eventType: {
      ...defaultEventType,
      eventTypeColor: null,
      id: 7,
      length: 60,
      seatsPerTimeSlot: 50,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: true,
      slug: "webinar",
      title: "Webinar",
    },
    id: 11,
    isRecorded: true,
    location: "integrations:zoom",
    rescheduled: false,
    seatsReferences: [
      { attendee: { email: "attendee1@example.com" }, referenceUid: "seat-1" },
      { attendee: { email: "attendee2@example.com" }, referenceUid: "seat-2" },
    ],
    startTime: new Date("2025-09-25T18:00:00"),
    status: "ACCEPTED",
    title: "Webinar: Introduction to Cal.com",
    uid: "abc123-booking-11",
    updatedAt: new Date("2025-09-10T10:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 12,
        email: "noshow@example.com",
        id: 21,
        locale: "en",
        name: "No Show Person",
        noShow: true,
        timeZone: "America/Los_Angeles",
      },
    ],
    createdAt: new Date("2025-09-15T09:00:00"),
    description: "Quick chat that was marked as no-show.",
    endTime: new Date("2025-09-20T11:15:00"),
    eventType: {
      ...defaultEventType,
      id: 1,
      length: 15,
      slug: "15min",
      title: "15 Min Meeting",
    },
    id: 12,
    location: "integrations:daily",
    rescheduled: false,
    startTime: new Date("2025-09-20T11:00:00"),
    status: "ACCEPTED",
    title: "No-show: Quick Chat",
    uid: "abc123-booking-12",
    updatedAt: new Date("2025-09-20T11:30:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 13,
        email: "enterprise@example.com",
        id: 22,
        locale: "en",
        name: "Enterprise Client",
        noShow: false,
        timeZone: "America/New_York",
      },
      {
        bookingId: 13,
        email: "sales@cal.com",
        id: 23,
        locale: "en",
        name: "Sales Team Member",
        noShow: false,
        timeZone: "America/Los_Angeles",
      },
    ],
    createdAt: new Date("2025-09-01T10:00:00"),
    description:
      "Enterprise onboarding session - rescheduled, paid, recurring team event.",
    endTime: new Date("2025-09-10T16:00:00"),
    eventType: {
      ...defaultEventType,
      eventTypeColor: {
        darkEventTypeColor: "#0dbf82",
        lightEventTypeColor: "#0dbf82",
      },
      id: 20,
      length: 60,
      price: 29900,
      recurringEvent: {
        count: 4,
        freq: 2,
        interval: 1,
      },
      schedulingType: "ROUND_ROBIN",
      slug: "enterprise-onboarding",
      team: {
        id: 2,
        name: "Sales Team",
        slug: "sales",
      },
      teamId: 2,
      title: "Enterprise Onboarding",
    },
    id: 13,
    location: "integrations:zoom",
    paid: true,
    payment: [
      {
        amount: 29900,
        appId: "stripe",
        currency: "usd",
        paymentOption: "ON_BOOKING",
        refunded: false,
        success: true,
      },
    ],
    recurringEventId: "recurring-stress-test",
    rescheduled: false,
    startTime: new Date("2025-09-10T15:00:00"),
    status: "PENDING",
    title: "Enterprise Onboarding: Stress Test with Multiple Badges",
    uid: "abc123-booking-13",
    updatedAt: new Date("2025-09-05T14:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
];

export const mockUpcomingBookings: Booking[] = [
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 100,
        email: "peer@cal.com",
        id: 100,
        locale: "en",
        name: "Peer Richelsen",
        noShow: null,
        timeZone: "Europe/London",
      },
      {
        bookingId: 100,
        email: "keith@cal.com",
        id: 101,
        locale: "en",
        name: "Keith Williams",
        noShow: null,
        timeZone: "America/Los_Angeles",
      },
    ],
    createdAt: new Date("2026-01-10T10:00:00"),
    description: "Quarterly product planning and roadmap discussion.",
    endTime: new Date("2026-01-15T15:00:00"),
    eventType: {
      ...defaultEventType,
      id: 14,
      length: 60,
      schedulingType: "COLLECTIVE",
      slug: "product-planning",
      team: {
        id: 1,
        name: "Cal.com",
        slug: "cal",
      },
      teamId: 1,
      title: "Product Planning",
    },
    id: 100,
    location: "integrations:google_meet",
    rescheduled: false,
    startTime: new Date("2026-01-15T14:00:00"),
    status: "ACCEPTED",
    title: "Product Planning Session",
    uid: "upcoming-booking-1",
    updatedAt: new Date("2026-01-10T10:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
  {
    ...defaultBookingFields,
    attendees: [
      {
        bookingId: 101,
        email: "candidate@example.com",
        id: 102,
        locale: "en",
        name: "Jane Candidate",
        noShow: null,
        timeZone: "America/New_York",
      },
    ],
    createdAt: new Date("2026-01-12T09:00:00"),
    description: "Technical interview - awaiting confirmation.",
    endTime: new Date("2026-01-20T11:00:00"),
    eventType: {
      ...defaultEventType,
      eventTypeColor: null,
      id: 102,
      length: 60,
      schedulingType: "COLLECTIVE",
      slug: "technical-interview",
      team: {
        id: 1,
        name: "Cal.com",
        slug: "cal",
      },
      teamId: 1,
      title: "Technical Interview",
    },
    id: 101,
    location: "integrations:zoom",
    rescheduled: false,
    startTime: new Date("2026-01-20T10:00:00"),
    status: "PENDING",
    title: "Pending: Interview with Candidate",
    uid: "upcoming-booking-2",
    updatedAt: new Date("2026-01-12T09:00:00"),
    user: userPasquale,
    userPrimaryEmail: "pasquale@cal.com",
  },
];

export const mockCancelledBookings: Booking[] = mockPastBookings.filter(
  (b) => b.status === "CANCELLED",
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatBookingDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatBookingTime(startTime: Date, endTime: Date): string {
  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
      minute: "2-digit",
    });
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function getBookingParticipants(booking: Booking): string {
  const names = booking.attendees.map((a) => a.name);
  if (names.length === 0) return "";
  const firstName = names[0] ?? "";
  if (names.length === 1) return firstName;
  const secondName = names[1] ?? "";
  if (names.length === 2) return `${firstName} and ${secondName}`;
  const lastName = names[names.length - 1] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${lastName}`;
}

export function getLocationLabel(location: string | null): string {
  if (!location) return "";
  const locationMap: Record<string, string> = {
    "integrations:daily": "Join Cal Video",
    "integrations:google_meet": "Join Google Meet",
    "integrations:teams": "Join Microsoft Teams",
    "integrations:zoom": "Join Zoom",
  };
  return locationMap[location] || location;
}

export function getLocationIcon(
  location: string | null,
): "video" | "phone" | "location" | null {
  if (!location) return null;
  if (location.startsWith("integrations:")) return "video";
  if (location.includes("phone")) return "phone";
  return "location";
}

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================

export interface BookingFilter {
  categoryId: string;
  selectedOptionIds: string[];
}

export function filterBookings(
  bookings: Booking[],
  filters: BookingFilter[],
): Booking[] {
  if (filters.length === 0) return bookings;

  return bookings.filter((booking) => {
    return filters.every((filter) => {
      const { categoryId, selectedOptionIds } = filter;
      if (selectedOptionIds.length === 0) return true;

      switch (categoryId) {
        case "event-type": {
          const eventTypeTitle = booking.eventType?.title?.toLowerCase() ?? "";
          const eventTypeSlug = booking.eventType?.slug?.toLowerCase() ?? "";
          return selectedOptionIds.some((optionId) => {
            const optionLabel = getEventTypeLabel(optionId).toLowerCase();
            return (
              eventTypeTitle.includes(optionLabel) ||
              eventTypeSlug.includes(optionId.replace(/-/g, ""))
            );
          });
        }
        case "member": {
          const hostName = booking.user?.name?.toLowerCase() ?? "";
          const hostEmail = booking.user?.email?.toLowerCase() ?? "";
          return selectedOptionIds.some((optionId) => {
            const memberName = optionId.replace(/-/g, " ").toLowerCase();
            return (
              hostName.includes(memberName) ||
              hostEmail.includes(optionId.replace(/-/g, ""))
            );
          });
        }
        case "attendees-name": {
          return selectedOptionIds.some((optionId) => {
            const searchName = optionId.replace(/-/g, " ").toLowerCase();
            return booking.attendees.some((attendee) =>
              attendee.name.toLowerCase().includes(searchName),
            );
          });
        }
        case "attendee-email": {
          return selectedOptionIds.some((optionId) => {
            return booking.attendees.some((attendee) =>
              attendee.email
                .toLowerCase()
                .includes(optionId.split("-")[0] ?? ""),
            );
          });
        }
        case "date-range": {
          const now = new Date();
          const bookingDate = new Date(booking.startTime);
          return selectedOptionIds.some((optionId) => {
            switch (optionId) {
              case "today":
                return isSameDay(bookingDate, now);
              case "yesterday":
                return isSameDay(bookingDate, addDays(now, -1));
              case "this-week":
                return isWithinWeek(bookingDate, now);
              case "last-week":
                return isWithinLastWeek(bookingDate, now);
              case "this-month":
                return isSameMonth(bookingDate, now);
              case "last-month":
                return isLastMonth(bookingDate, now);
              default:
                return true;
            }
          });
        }
        case "booking-uid": {
          return selectedOptionIds.some((optionId) =>
            booking.uid.toLowerCase().includes(optionId.toLowerCase()),
          );
        }
        default:
          return true;
      }
    });
  });
}

function getEventTypeLabel(optionId: string): string {
  const labels: Record<string, string> = {
    "15-min": "15 Min Meeting",
    "30-min": "30 Min Meeting",
    "60-min": "60 Min Meeting",
    consultation: "Consultation",
    interview: "Interview",
    onboarding: "Onboarding Call",
  };
  return labels[optionId] ?? optionId;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isWithinWeek(date: Date, referenceDate: Date): boolean {
  const startOfWeek = new Date(referenceDate);
  startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

function isWithinLastWeek(date: Date, referenceDate: Date): boolean {
  const startOfLastWeek = new Date(referenceDate);
  startOfLastWeek.setDate(referenceDate.getDate() - referenceDate.getDay() - 7);
  startOfLastWeek.setHours(0, 0, 0, 0);
  const endOfLastWeek = new Date(startOfLastWeek);
  endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
  return date >= startOfLastWeek && date < endOfLastWeek;
}

function isSameMonth(date: Date, referenceDate: Date): boolean {
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  );
}

function isLastMonth(date: Date, referenceDate: Date): boolean {
  const lastMonth = new Date(referenceDate);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  return (
    date.getFullYear() === lastMonth.getFullYear() &&
    date.getMonth() === lastMonth.getMonth()
  );
}
