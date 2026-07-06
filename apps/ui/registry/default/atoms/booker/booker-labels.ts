export type BookerLabels = {
  errorNotFound: string;
  errorUnpublished: string;
  errorNetwork: string;
  errorGeneric: string;
  retry: string;
  durationUnknown: string;
  durationMinutes: (minutes: number) => string;
  noAvailableTimes: string;
  noSlotsAvailable: string;
  noSlotsThisDay: string;
  noSlotsThisMonth: string;
  viewFirstAvailability: string;
  use24Hour: string;
  hour12Short: string;
  hour24Short: string;
  headerImageAlt: (hostName: string, eventTitle: string) => string;
  locationOptions: (count: number) => string;
  locationSelectOnNextStep: string;
  confirmYourName: string;
  confirmEmail: string;
  confirmNotes: string;
  confirmNotesPlaceholder: string;
  confirmAddGuests: string;
  confirmBack: string;
  confirmSubmit: string;
  confirmTermsPrefix: string;
  confirmTerms: string;
  confirmPrivacyPolicy: string;
};

const DEFAULT_BOOKER_LABELS: BookerLabels = {
  errorNotFound: "This event type could not be found.",
  errorUnpublished:
    "This event type is not currently published and is not accepting bookings.",
  errorNetwork: "Unable to connect. Please check your internet connection.",
  errorGeneric: "Something went wrong loading the booker.",
  retry: "Try again",
  durationUnknown: "Unknown",
  durationMinutes: (minutes) => `${minutes} min`,
  noAvailableTimes: "No available times",
  noSlotsAvailable: "There are no open slots.",
  noSlotsThisDay: "There are no open slots on this day.",
  noSlotsThisMonth: "There are no open slots this month.",
  viewFirstAvailability: "View first availability",
  use24Hour: "Use 24-hour time",
  hour12Short: "12h",
  hour24Short: "24h",
  headerImageAlt: (hostName, eventTitle) =>
    `Banner for ${eventTitle} with ${hostName}`,
  locationOptions: (count) => `${count} location options`,
  locationSelectOnNextStep: "Select on the next step",
  confirmYourName: "Your name",
  confirmEmail: "Email address",
  confirmNotes: "Additional notes",
  confirmNotesPlaceholder:
    "Please share anything that will help prepare for our meeting.",
  confirmAddGuests: "Add guests",
  confirmBack: "Back",
  confirmSubmit: "Confirm",
  confirmTermsPrefix: "By proceeding, you agree to Cal.com's",
  confirmTerms: "Terms",
  confirmPrivacyPolicy: "Privacy Policy",
};

export function getBookerLabels(labels?: Partial<BookerLabels>): BookerLabels {
  return { ...DEFAULT_BOOKER_LABELS, ...labels };
}
