import { Metadata } from "next";
import { CodeBlock } from "@coss/ui/components/code-block";

export const metadata: Metadata = {
  title: "coss.com sms",
  description: "open source is the foundation of all modern software",
} 

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
    <main className="container w-full flex-1 mb-16 lg:mb-20">   
      <div className="mt-12 lg:mt-16 max-w-2xl mx-auto text-muted-foreground [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Initialization</h2>
        <CodeBlock
          code={initialization}
          language="tsx"
          copyButton={false}
        />   
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Sending Messages</h2>
        <CodeBlock
          code={sendingMessages}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Messages</h2>
        <CodeBlock
          code={messages}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Phone Numbers</h2>
        <CodeBlock
          code={phoneNumbers}
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
