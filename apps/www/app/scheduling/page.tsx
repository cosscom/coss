import { CodeBlock } from "@coss/ui/components/code-block"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "coss.com scheduling",
  description: "open source is the foundation of all modern software",
}

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.scheduling.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`

  const users = `// Create a user
await coss.scheduling.users.create({
  email: 'jane@example.com',
  name: 'Jane Doe',
});

// Retrieve a user
await coss.scheduling.users.retrieve('user_abc123');`

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
await coss.scheduling.schedules.list({ userId: 'user_abc123' });`

  const eventTypes = `// Create an event type
await coss.scheduling.eventTypes.create({
  userId: 'user_abc123',
  name: 'Consultation',
  duration: 30,
  scheduleId: 'schedule_abc123',
});

// Retrieve event types
await coss.scheduling.eventTypes.list({ userId: 'user_abc123' });`

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
await coss.scheduling.bookings.list({ userId: 'user_abc123' });`

  const webhooks = `// Webhook events
coss.scheduling.webhooks.on('booking.created', (event) => {
  console.log('New booking:', event.data);
});

coss.scheduling.webhooks.on('booking.cancelled', (event) => {
  console.log('Booking cancelled:', event.data);
});`

  const utilities = `// Validate webhook signature
const isValid = coss.scheduling.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-scheduling-signature'],
  secret: 'whsec_scheduling_123',
});`

  return (
    <main className="container w-full flex-1 mb-16 lg:mb-20">
      <div className="mt-12 lg:mt-16 max-w-2xl mx-auto text-muted-foreground [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">
          Initialization
        </h2>
        <CodeBlock code={initialization} language="tsx" copyButton={false} />
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">
          Users
        </h2>
        <CodeBlock code={users} language="tsx" copyButton={false} />
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">
          Schedules
        </h2>
        <CodeBlock code={schedules} language="tsx" copyButton={false} />
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">
          Event Types
        </h2>
        <CodeBlock code={eventTypes} language="tsx" copyButton={false} />
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">
          Bookings
        </h2>
        <CodeBlock code={bookings} language="tsx" copyButton={false} />
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">
          Webhooks
        </h2>
        <CodeBlock code={webhooks} language="tsx" copyButton={false} />
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">
          Utilities
        </h2>
        <CodeBlock code={utilities} language="tsx" copyButton={false} />
      </div>
    </main>
  )
}
