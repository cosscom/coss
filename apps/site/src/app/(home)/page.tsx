import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@coss/ui/components/card";
import Link from "next/link";
import { ShipyardHarbour } from "@/components/shipyard/harbour";
import { SHIPYARD } from "@/lib/shipyard";
import { PRODUCTS, SITE_DESCRIPTION } from "@/lib/site";

// Placeholder landing page.
const SNIPPET = `import { Coss } from "coss";

const coss = new Coss({ apiKey: process.env.COSS_API_KEY });

await coss.email.send({
  from: "Acme <hello@acme.com>",
  to: "user@example.com",
  subject: "Welcome",
  html: "<p>Hi there</p>",
});`;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-16 sm:py-24">
      <section className="flex flex-col items-start gap-6">
        <h1 className="max-w-2xl font-semibold text-4xl tracking-tight sm:text-5xl">
          Every communication primitive. One API key.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{SITE_DESCRIPTION}</p>
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/docs/quickstart" />} size="lg">
            Get started
          </Button>
          <Button render={<Link href="/docs/api-reference" />} size="lg" variant="outline">
            API reference
          </Button>
        </div>
      </section>

      <pre className="overflow-x-auto rounded-xl border bg-card p-4 font-mono text-sm">
        <code>{SNIPPET}</code>
      </pre>

      <section className="grid gap-4 sm:grid-cols-2">
        {PRODUCTS.map((product) => (
          <Card key={product.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {product.name}
                {!product.available && <Badge variant="outline">Soon</Badge>}
              </CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="relative overflow-hidden rounded-2xl border bg-card">
        <ShipyardHarbour className="h-56 sm:h-80" />
        <div className="-mt-12 relative flex flex-col items-start gap-4 p-6 sm:-mt-16 sm:p-8">
          <h2 className="flex items-center gap-2 font-heading font-semibold text-2xl">
            {SHIPYARD.name}
            <Badge variant="info">New</Badge>
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            {SHIPYARD.description} Open source, from the team behind coss.com.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href={SHIPYARD.path} />}>About Shipyard</Button>
            <Button render={<Link href={SHIPYARD.docs} />} variant="outline">
              Shipyard docs
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
