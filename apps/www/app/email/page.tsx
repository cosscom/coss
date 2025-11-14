import { CodeBlock } from "@coss/ui/components/code-block";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "coss.com email",
  description: "open source is the foundation of all modern software",
};

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.email.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const sendingEmails = `// Send a transactional email
await coss.email.send({
  from: 'noreply@yourapp.com',
  to: 'user@example.com',
  subject: 'Welcome to Our App!',
  text: 'Thanks for signing up.',
  html: '<p>Thanks for signing up.</p>',
});`;

  const domains = `// Create and verify a sending domain
await coss.email.domains.create({
  domain: 'yourapp.com',
});

// List verified domains
await coss.email.domains.list();

// Delete a domain
await coss.email.domains.delete('domain_abc123');`;

  const templates = `// Create an email template
await coss.email.templates.create({
  name: 'Welcome Template',
  subject: 'Welcome!',
  html: '<h1>Welcome {{name}}</h1>',
});

// Retrieve a template
await coss.email.templates.retrieve('tmpl_abc123');

// Update a template
await coss.email.templates.update('tmpl_abc123', {
  html: '<h1>Hello {{name}}!</h1>',
});

// Delete a template
await coss.email.templates.delete('tmpl_abc123');`;

  const webhooks = `// Webhook events
coss.email.webhooks.on('email.delivered', (event) => {
  console.log('Email delivered:', event.data);
});

coss.email.webhooks.on('email.bounced', (event) => {
  console.log('Email bounced:', event.data);
});`;

  const utilities = `// Validate webhook signature
const isValid = coss.email.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-email-infra-signature'],
  secret: 'whsec_email_123',
});`;

  return (
    <main className="container mb-16 w-full flex-1 lg:mb-20">
      <div className="mx-auto mt-12 max-w-2xl text-muted-foreground lg:mt-16 [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Initialization
        </h2>
        <CodeBlock code={initialization} language="tsx" copyButton={false} />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Sending Emails
        </h2>
        <CodeBlock code={sendingEmails} language="tsx" copyButton={false} />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Domains
        </h2>
        <CodeBlock code={domains} language="tsx" copyButton={false} />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Templates
        </h2>
        <CodeBlock code={templates} language="tsx" copyButton={false} />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Webhooks
        </h2>
        <CodeBlock code={webhooks} language="tsx" copyButton={false} />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Utilities
        </h2>
        <CodeBlock code={utilities} language="tsx" copyButton={false} />
      </div>
    </main>
  );
}
