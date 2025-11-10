import { Metadata } from "next";
import { CodeBlock } from "@coss/ui/components/code-block";

export const metadata: Metadata = {
  title: "coss.com calendar",
  description: "open source is the foundation of all modern software",
} 

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
    <main className="container w-full flex-1 mb-16 lg:mb-20">   
      <div className="mt-12 lg:mt-16 max-w-2xl mx-auto text-muted-foreground [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Initialization</h2>
        <CodeBlock
          code={initialization}
          language="tsx"
          copyButton={false}
        />   
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Authorization</h2>
        <CodeBlock
          code={authorization}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Calendars</h2>
        <CodeBlock
          code={calendars}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Events</h2>
        <CodeBlock
          code={events}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Webhooks</h2>
        <CodeBlock
          code={webhooks}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Utilities</h2>
        <CodeBlock
          code={utilities}
          language="tsx"
          copyButton={false}
        />                
      </div>
    </main>
  );
}
