import { Button } from "@coss/ui/components/button";
import { ArrowRightIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { GoogleLogo } from "@/components/google-logo";
import { SchedulingPreview } from "@/components/scheduling-preview";
import { MarketingHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="relative z-50 flex flex-1 flex-col">
      <MarketingHeader />

      <main className="relative">
        <section className="mx-auto w-full max-w-6xl px-4 py-12 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/64 sm:px-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-45 mx-auto max-w-6xl before:absolute before:top-[-4.5px] before:-left-[11.5px] before:z-1 before:-ml-1 before:size-2 before:rounded-[2px] before:border before:border-border before:bg-popover before:bg-clip-padding before:shadow-xs after:absolute after:top-[-4.5px] after:-right-[11.5px] after:z-1 after:-mr-1 after:size-2 after:rounded-[2px] after:border after:border-border after:bg-background after:bg-clip-padding after:shadow-xs dark:after:bg-clip-border dark:before:bg-clip-border"
          />
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center">
            <div className="lg:w-[500px] lg:flex-none">
              <Button variant="outline" size="xs" className="rounded-full">
                Cal.com launches v6.2
                <ChevronRightIcon aria-hidden="true" />
              </Button>

              <h1 className="mt-6 max-w-xl text-balance font-bold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
                The better way to schedule your meetings
              </h1>

              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                A fully customizable scheduling software for individuals,
                businesses taking calls and developers building scheduling
                platforms where users meet users.
              </p>

              <div className="mt-8 flex max-w-md flex-col gap-3">
                <Button size="lg" render={<Link href="#signup-google" />}>
                  <GoogleLogo />
                  Sign up with Google
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="#signup-email" />}
                >
                  Sign up with email
                  <ArrowRightIcon />
                </Button>
              </div>

              <p className="mt-4 text-muted-foreground text-sm">
                No credit card required
              </p>
            </div>

            <SchedulingPreview />
          </div>
        </section>
      </main>
    </div>
  );
}
