import { CodeBlock } from "@coss/ui/components/code-block";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "open source is the foundation of all modern software",
  title: "coss.com scheduling",
};

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.scheduling.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const users = `// Create a user
await coss.scheduling.users.create({
  email: 'jane@example.com',
  name: 'Jane Doe',
});

// Retrieve a user
await coss.scheduling.users.retrieve('user_abc123');`;

  const schedules = `// Create a schedule
await coss.scheduling.schedules.create({
  userId: 'user_abc123',
  availability: [
    {
      day: 'Monday',
      start: '09:00',
      end: '17:00',
    },
    // ... other days
  ],
});

// Retrieve schedules
await coss.scheduling.schedules.list({ userId: 'user_abc123' });`;

  const eventTypes = `// Create an event type
await coss.scheduling.eventTypes.create({
  userId: 'user_abc123',
  name: 'Consultation',
  duration: 30,
  scheduleId: 'schedule_abc123',
});

// Retrieve event types
await coss.scheduling.eventTypes.list({ userId: 'user_abc123' });`;

  const bookings = `// Create a booking
await coss.scheduling.bookings.create({
  eventTypeId: 'eventType_abc123',
  attendee: {
    name: 'John Smith',
    email: 'john@example.com',
  },
  start: '2025-05-01T15:00:00Z',
});

// Retrieve bookings
await coss.scheduling.bookings.list({ userId: 'user_abc123' });`;

  const webhooks = `// Webhook events
coss.scheduling.webhooks.on('booking.created', (event) => {
  console.log('New booking:', event.data);
});

coss.scheduling.webhooks.on('booking.cancelled', (event) => {
  console.log('Booking cancelled:', event.data);
});`;

  const utilities = `// Validate webhook signature
const isValid = coss.scheduling.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-scheduling-signature'],
  secret: 'whsec_scheduling_123',
});`;

  return (
    <main className="container mb-16 w-full flex-1 lg:mb-20">
      <div className="mx-auto mt-12 max-w-2xl text-muted-foreground lg:mt-16 [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Initialization
        </h2>
        <CodeBlock code={initialization} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Users
        </h2>
        <CodeBlock code={users} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Schedules
        </h2>
        <CodeBlock code={schedules} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Event Types
        </h2>
        <CodeBlock code={eventTypes} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Bookings
        </h2>
        <CodeBlock code={bookings} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Webhooks
        </h2>
        <CodeBlock code={webhooks} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Utilities
        </h2>
        <CodeBlock code={utilities} copyButton={false} language="tsx" />
      </div>
    </main>
  );
}
