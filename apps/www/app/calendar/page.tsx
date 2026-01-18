import { CodeBlock } from "@coss/ui/shared/code-block";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "open source is the foundation of all modern software",
  title: "coss.com calendar",
};

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.calendar.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const authorization = `// Generate an OAuth link for Google Calendar
const authUrl = coss.calendar.auth.getAuthUrl({
  provider: 'google',
  redirectUri: 'https://yourapp.com/callback',
});

// Exchange authorization code for access tokens
await coss.calendar.auth.exchangeCode({
  provider: 'google',
  code: 'authorization_code_here',
  redirectUri: 'https://yourapp.com/callback',
});`;

  const calendars = `// List calendars
await coss.calendar.calendars.list({
  provider: 'google',
});

// Retrieve a calendar
await coss.calendar.calendars.retrieve({
  provider: 'google',
  calendarId: 'primary',
});`;

  const events = `// Create an event
await coss.calendar.events.create({
  provider: 'google',
  calendarId: 'primary',
  event: {
    summary: 'Meeting with Jane',
    description: 'Discuss project updates',
    start: { dateTime: '2025-05-01T10:00:00Z' },
    end: { dateTime: '2025-05-01T11:00:00Z' },
  },
});

// List events
await coss.calendar.events.list({
  provider: 'google',
  calendarId: 'primary',
});

// Update an event
await coss.calendar.events.update({
  provider: 'google',
  calendarId: 'primary',
  eventId: 'event_abc123',
  updates: {
    description: 'Updated project discussion details',
  },
});

// Delete an event
await coss.calendar.events.delete({
  provider: 'google',
  calendarId: 'primary',
  eventId: 'event_abc123',
});`;

  const webhooks = `// Webhook events
coss.calendar.webhooks.on('event.created', (event) => {
  console.log('Event created:', event.data);
});

coss.calendar.webhooks.on('event.updated', (event) => {
  console.log('Event updated:', event.data);
});

coss.calendar.webhooks.on('event.deleted', (event) => {
  console.log('Event deleted:', event.data);
});`;

  const utilities = `// Validate webhook signature
const isValid = coss.calendar.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-calendar-signature'],
  secret: 'whsec_calendar_123',
});`;

  return (
    <main className="container mb-16 w-full flex-1 lg:mb-20">
      <div className="mx-auto mt-12 max-w-2xl text-muted-foreground lg:mt-16 [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="mt-12 scroll-m-20 font-heading font-semibold text-2xl text-foreground first:mt-0 [&+p]:mt-4! *:[code]:text-2xl">
          Initialization
        </h2>
        <CodeBlock code={initialization} copyButton={false} language="tsx" />
        <h2 className="mt-12 scroll-m-20 font-heading font-semibold text-2xl text-foreground first:mt-0 [&+p]:mt-4! *:[code]:text-2xl">
          Authorization
        </h2>
        <CodeBlock code={authorization} copyButton={false} language="tsx" />
        <h2 className="mt-12 scroll-m-20 font-heading font-semibold text-2xl text-foreground first:mt-0 [&+p]:mt-4! *:[code]:text-2xl">
          Calendars
        </h2>
        <CodeBlock code={calendars} copyButton={false} language="tsx" />
        <h2 className="mt-12 scroll-m-20 font-heading font-semibold text-2xl text-foreground first:mt-0 [&+p]:mt-4! *:[code]:text-2xl">
          Events
        </h2>
        <CodeBlock code={events} copyButton={false} language="tsx" />
        <h2 className="mt-12 scroll-m-20 font-heading font-semibold text-2xl text-foreground first:mt-0 [&+p]:mt-4! *:[code]:text-2xl">
          Webhooks
        </h2>
        <CodeBlock code={webhooks} copyButton={false} language="tsx" />
        <h2 className="mt-12 scroll-m-20 font-heading font-semibold text-2xl text-foreground first:mt-0 [&+p]:mt-4! *:[code]:text-2xl">
          Utilities
        </h2>
        <CodeBlock code={utilities} copyButton={false} language="tsx" />
      </div>
    </main>
  );
}
