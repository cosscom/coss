import { Button } from "@coss/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PRODUCTS } from "@/components/home/parts";
import { SignUpButton } from "@/components/sign-up-button";
import { CALENDAR } from "@/lib/calendar";
import { pageMetadata } from "@/lib/seo";
import { SHIPYARD } from "@/lib/shipyard";

/** Products of the platform beyond the catalog's four parts, in the same shape. */
const MORE_PRODUCTS = [
  {
    id: "hooks",
    name: "Hooks",
    call: "coss.hooks",
    summary:
      "Webhooks as a service: send a message once, coss.com delivers it to every endpoint your customers registered.",
  },
  {
    id: "risk",
    name: "Risk",
    call: "coss.risk",
    summary:
      "Whether a sign-up, login or other event looks like abuse, and why, with rate limiting for your own endpoints.",
  },
] as const;

const DESCRIPTION =
  "Supabase made the database something you get by signing up. coss.com does the same for the application layer: email, SMS, video, scheduling, behind one API key and one SDK.";

export const metadata: Metadata = pageMetadata({
  title: "About · coss.com",
  description: DESCRIPTION,
  path: "/about",
});

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t pt-10 lg:grid-cols-12 lg:gap-10">
      <h2 className="font-semibold text-2xl tracking-tight lg:col-span-4" id={id}>
        {title}
      </h2>
      <div className="flex max-w-2xl flex-col gap-4 text-pretty text-lg text-muted-foreground leading-snug lg:col-span-8">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-16 sm:py-24">
      <header className="flex max-w-3xl flex-col gap-5">
        <h1 className="text-balance font-semibold text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.035em]">
          Supabase but for non-db shit.
        </h1>
        <p className="text-pretty text-muted-foreground text-xl leading-snug">
          Supabase does God's work for developers: it took Postgres, the hardest part of every stack
          to run well, and turned it into something you get by signing up.{" "}
          <strong className="font-semibold text-foreground">
            coss.com does the same for everything that sits above the database.
          </strong>{" "}
          Email, SMS, video, scheduling: one API key, one SDK, one bill.
        </p>
      </header>

      <Section id="data-layer" title="What Supabase did for the data layer">
        <p>
          Before Supabase, a new product started with a week of plumbing: a database to host, back
          up and upgrade, auth to bolt on, files to put somewhere, a way to push changes to the
          browser. Supabase folded all of that into a project URL and an API key, kept Postgres at
          the centre, and open-sourced the lot. The data layer became a solved problem.
        </p>
        <p>
          We're fans. coss.com itself runs on Postgres, and we have no plans to host yours. Keep
          your database where it is: Supabase, Neon, RDS, a box under your desk.
        </p>
      </Section>

      <Section id="application-layer" title="What's left once the database is solved">
        <p>
          A working product still has to reach people. It sends a receipt, texts a verification
          code, puts two users on a call, books a meeting. Each of those has been a separate vendor:
          its own account, key, dashboard, webhook format, retry rules, rate limits, invoice and
          compliance paperwork. Four vendors to ship one product, and four places to look when
          something doesn't arrive.
        </p>
        <p>
          That is the application layer, and it is what coss.com is for. Not the data under your
          app, but everything your app does with it.
        </p>
      </Section>

      <Section id="one-vendor" title="One vendor for the application layer">
        <p>
          Every coss.com product is built the same way: one key, one SDK namespace, the same
          webhooks, logs, rate limits, idempotency and API versioning. Learn one and you know them
          all.
        </p>
        <ul className="flex flex-col divide-y border-y text-base">
          {[...PRODUCTS, ...MORE_PRODUCTS].map((product) => (
            <li className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4" key={product.id}>
              <span className="flex flex-col">
                <span className="font-medium text-foreground">{product.name}</span>
                <code className="font-mono text-muted-foreground text-xs">{product.call}</code>
              </span>
              <span>{product.summary}</span>
            </li>
          ))}
        </ul>
        <p>
          Behind the products sit the pieces every one of them needs: verified domains, receiving,
          suppressions, DMARC and reputation, delivery logs and drains, signed webhooks, audit log,
          metered billing. Those are built once and shared, not reinvented per product.
        </p>
      </Section>

      <Section id="open" title="Open source, built for agents">
        <p>
          The platform is open source under the AGPL, with an MIT SDK, MCP server and CLI, so what
          you build on stays inspectable and yours to run. The docs are written so a coding agent
          can wire a product in from one prompt, and so can you.
        </p>
        <p>
          coss.com is built by the team behind Cal.com. {SHIPYARD.name} and {CALENDAR.name} come
          from the same shop.
        </p>
        <div className="flex flex-wrap gap-2.5 pt-2">
          <SignUpButton />
          <Button className="px-4" render={<Link href="/docs/quickstart" />} variant="outline">
            Quickstart
          </Button>
          <Button render={<Link href="/pricing" />} variant="ghost">
            Pricing
          </Button>
        </div>
      </Section>
    </main>
  );
}
