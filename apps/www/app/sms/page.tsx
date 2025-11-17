import { CodeBlock } from "@coss/ui/components/code-block";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "open source is the foundation of all modern software",
  title: "coss.com sms",
};

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.sms.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const sendingMessages = `// Send an SMS message
await coss.sms.messages.send({
  to: '+15551234567',
  from: '+15559876543',
  body: 'Your verification code is 123456',
});`;

  const messages = `// Retrieve a message
await coss.sms.messages.retrieve('msg_abc123');

// List sent messages
await coss.sms.messages.list({
  to: '+15551234567',
});`;

  const phoneNumbers = `// Buy a new phone number
await coss.sms.numbers.purchase({
  country: 'US',
  areaCode: '415',
});

// List owned numbers
await coss.sms.numbers.list();

// Release a phone number
await coss.sms.numbers.release('+15559876543');`;

  const webhooks = `// Webhook events
coss.sms.webhooks.on('message.delivered', (event) => {
  console.log('Message delivered:', event.data);
});

coss.sms.webhooks.on('message.failed', (event) => {
  console.log('Message failed:', event.data);
});`;

  const utilities = `// Validate webhook signature
const isValid = coss.sms.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-sms-signature'],
  secret: 'whsec_sms_123',
});`;

  return (
    <main className="container mb-16 w-full flex-1 lg:mb-20">
      <div className="mx-auto mt-12 max-w-2xl text-muted-foreground lg:mt-16 [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Initialization
        </h2>
        <CodeBlock code={initialization} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Sending Messages
        </h2>
        <CodeBlock code={sendingMessages} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Messages
        </h2>
        <CodeBlock code={messages} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Phone Numbers
        </h2>
        <CodeBlock code={phoneNumbers} copyButton={false} language="tsx" />
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
