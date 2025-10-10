import { Metadata } from "next";
import { CodeBlock } from "@workspace/ui/components/code-block";

export const metadata: Metadata = {
  title: "coss.com notifications",
  description: "open source is the foundation of all modern software",
} 

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.notifications.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const subscribers = `// Create a subscriber
await coss.notifications.subscribers.create({
  subscriberId: 'user_abc123',
  email: 'jane@example.com',
  phone: '+15551234567',
  firstName: 'Jane',
  lastName: 'Doe',
});

// Retrieve a subscriber
await coss.notifications.subscribers.retrieve('user_abc123');`;

  const workflows = `// Trigger a notification workflow
await coss.notifications.workflows.trigger({
  name: 'welcome_message',
  to: {
    subscriberId: 'user_abc123',
  },
  payload: {
    customMessage: 'Welcome to our service!',
  },
});`;

  const webhookVerification = `// Validate webhook signature
const isValid = coss.notifications.utils.verifySignature({
  payload: req.body,
  signature: req.headers['x-coss-signature'],
  secret: 'whsec_notifications_123',
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
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Subscribers</h2>
        <CodeBlock
          code={subscribers}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Workflows</h2>
        <CodeBlock
          code={workflows}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Webhook Verification</h2>
        <CodeBlock
          code={webhookVerification}
          language="tsx"
          copyButton={false}
        />                
      </div>
    </main>
  );
}
