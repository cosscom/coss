import { CodeBlock } from "@coss/ui/components/code-block";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "coss.com payments",
  description: "open source is the foundation of all modern software",
};

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.payments.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const products = `// Create a product
await coss.payments.products.create({
  name: 'Pro Plan',
  description: 'Access to premium features',
});

// List products
await coss.payments.products.list();

// Retrieve a product
await coss.payments.products.retrieve('prod_abc123');

// Update a product
await coss.payments.products.update('prod_abc123', {
  description: 'Updated description',
});

// Delete a product
await coss.payments.products.delete('prod_abc123');`;

  const prices = `// Create a price for a product
await coss.payments.prices.create({
  productId: 'prod_abc123',
  unitAmount: 2000, // in cents
  currency: 'usd',
  recurring: { interval: 'month' },
});

// List prices
await coss.payments.prices.list();`;

  const customers = `// Create a customer
await coss.payments.customers.create({
  email: 'jane@example.com',
  name: 'Jane Doe',
});

// Retrieve a customer
await coss.payments.customers.retrieve('cus_abc123');`;

  const subscriptions = `// Create a subscription
await coss.payments.subscriptions.create({
  customerId: 'cus_abc123',
  priceId: 'price_abc123',
});

// Retrieve a subscription
await coss.payments.subscriptions.retrieve('sub_abc123');

// Update a subscription (e.g., upgrade plan)
await coss.payments.subscriptions.update('sub_abc123', {
  priceId: 'price_def456',
});

// Cancel a subscription
await coss.payments.subscriptions.cancel('sub_abc123');`;

  const invoices = `// Create an invoice manually
await coss.payments.invoices.create({
  customerId: 'cus_abc123',
  items: [
    { priceId: 'price_abc123', quantity: 1 },
  ],
});

// Finalize and send the invoice
await coss.payments.invoices.finalize('inv_abc123');

// Pay an invoice
await coss.payments.invoices.pay('inv_abc123');`;

  const webhooks = `// Webhook events
coss.payments.webhooks.on('invoice.paid', (event) => {
  console.log('Invoice paid:', event.data);
});

coss.payments.webhooks.on('subscription.created', (event) => {
  console.log('Subscription created:', event.data);
});`;

  const utilities = `// Validate webhook signature
const isValid = coss.payments.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-payments-signature'],
  secret: 'whsec_payments_123',
});`;

  return (
    <main className="container mb-16 w-full flex-1 lg:mb-20">
      <div className="mx-auto mt-12 max-w-2xl text-muted-foreground lg:mt-16 [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Initialization
        </h2>
        <CodeBlock code={initialization} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Products
        </h2>
        <CodeBlock code={products} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Prices
        </h2>
        <CodeBlock code={prices} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Customers
        </h2>
        <CodeBlock code={customers} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Subscriptions
        </h2>
        <CodeBlock code={subscriptions} copyButton={false} language="tsx" />
        <h2 className="[&+p]:!mt-4 mt-12 scroll-m-20 font-heading text-2xl text-foreground first:mt-0 *:[code]:text-2xl">
          Invoices
        </h2>
        <CodeBlock code={invoices} copyButton={false} language="tsx" />
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
