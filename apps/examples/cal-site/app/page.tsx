import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetTitle,
  SheetTrigger,
} from "@coss/ui/components/sheet";
import { Tabs, TabsList, TabsTab } from "@coss/ui/components/tabs";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  GlobeIcon,
  MapPinIcon,
  MenuIcon,
  StarIcon,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "#product", label: "Product" },
  { href: "#solutions", label: "Solutions" },
  { href: "#enterprise", label: "Enterprise" },
  { href: "#pricing", label: "Pricing" },
  { href: "#docs", label: "Docs" },
];

const timeSlots = ["15m", "30m", "45m", "1h"];

const calendarDays = [
  ["", "", "", "", "1", "2", "3"],
  ["4", "5", "6", "7", "8", "9", "10"],
  ["11", "12", "13", "14", "15", "16", "17"],
  ["18", "19", "20", "21", "22", "23", "24"],
  ["25", "26", "27", "28", "29", "30", "31"],
];

const reviewItems = [
  {
    brand: "Trustpilot",
    icon: (
      <div className="flex items-center gap-0.5">
        {["tp-1", "tp-2", "tp-3", "tp-4", "tp-5"].map((id, index) => (
          <div
            key={id}
            className={[
              "flex size-6 items-center justify-center leading-none",
              index === 4
                ? "bg-linear-to-r from-50% from-emerald-500 to-50% to-zinc-200 text-white"
                : "bg-emerald-500 text-white",
            ].join(" ")}
          >
            ★
          </div>
        ))}
      </div>
    ),
    label: (
      <div className="mt-1.5 flex items-center gap-1 font-medium text-[14px]">
        <span className="text-lg">★</span>
        <span>Trustpilot</span>
      </div>
    ),
  },
  {
    brand: "Product Hunt",
    icon: (
      <div className="flex items-center gap-1 text-[#f5a623] text-[24px] leading-none">
        {["ph-1", "ph-2", "ph-3", "ph-4", "ph-5"].map((id) => (
          <StarIcon key={id} className="size-4.5 fill-current stroke-current" />
        ))}
      </div>
    ),
    label: (
      <div className="mt-2 flex items-center">
        <div className="flex size-7 items-center justify-center rounded-full bg-[#ff6154] font-semibold text-base text-white">
          P
        </div>
      </div>
    ),
  },
  {
    brand: "G2",
    icon: (
      <div className="flex items-center gap-1 text-[#ff4a3d] text-[24px] leading-none">
        {["g2-1", "g2-2", "g2-3", "g2-4", "g2-5"].map((id, index) => (
          <StarIcon
            key={id}
            className={
              index === 4
                ? "size-4.5 bg-linear-to-r from-50% from-[#ff4a3d] to-50% to-white bg-clip-text fill-current stroke-current text-transparent"
                : "size-4.5 fill-current stroke-current"
            }
          />
        ))}
      </div>
    ),
    label: (
      <div className="mt-2 flex items-center">
        <div className="flex size-7 items-center justify-center rounded-full bg-[#ff5a3c] font-bold text-white text-xs">
          G2
        </div>
      </div>
    ),
  },
];

function BrandLockup() {
  return (
    <div className="-mt-0.5 flex shrink-0 items-center gap-1.5 font-bold font-heading text-2xl tracking-tighter sm:text-[1.625em]">
      <Link aria-label="Home" href="/">
        Cal.com
      </Link>
    </div>
  );
}

function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="icon" className="md:hidden" />}
      >
        <MenuIcon className="opacity-80" />
      </SheetTrigger>
      <SheetContent side="right" className="md:hidden">
        <SheetHeader>
          <SheetTitle>cal.com</SheetTitle>
          <SheetDescription>
            A sharper marketing shell inspired by the COSS visual language.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel className="space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              className="w-full justify-start"
              size="lg"
              variant="ghost"
              render={<Link href={item.href} />}
            >
              {item.label}
            </Button>
          ))}
          <div className="space-y-3 pt-4">
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              render={<Link href="#signin" />}
            >
              Sign in
            </Button>
            <Button className="w-full" size="lg" render={<Link href="#cta" />}>
              Get started
              <ArrowRightIcon className="opacity-80" />
            </Button>
          </div>
        </SheetPanel>
      </SheetContent>
    </Sheet>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-sidebar/80 backdrop-blur-sm before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border/64">
      <div className="container relative mx-auto flex h-(--header-height) w-full items-center justify-between gap-2 px-4 sm:px-6">
        <BrandLockup />

        <nav className="ml-8 hidden flex-1 items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Button variant="ghost" render={<Link href="#signin" />}>
            Sign in
          </Button>
          <Button render={<Link href="#cta" />}>
            Start for free
            <ArrowRightIcon className="opacity-80" />
          </Button>
        </div>

        <div className="ml-auto md:hidden">
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}

function HeroReviewStrip() {
  return (
    <div className="flex gap-12 px-0 py-7">
      {reviewItems.map((item) => (
        <div key={item.brand}>
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>
  );
}

function SchedulingPreview() {
  return (
    <div>
      <div className="rounded-xl border bg-popover text-card-foreground">
        <div className="grid w-max grid-cols-[356px_max-content]">
          <div className="border-r p-5">
            <div className="flex items-center gap-3">
              <img
                alt="Cédric van Ravesteijn"
                className="size-8 rounded-full object-cover"
                src="https://framerusercontent.com/images/1bvk9THj74PqBkpBJDHFbQS9om4.png"
              />
              <p className="font-medium text-muted-foreground text-sm">
                Cédric van Ravesteijn
              </p>
            </div>

            <div className="mt-3">
              <h3 className="font-semibold text-foreground text-xl">
                Partnerships Meeting
              </h3>
              <p className="mt-1 text-muted-foreground text-sm">
                Are you an agency, influencer, SaaS founder, or business looking
                to collaborate with Cal.com? Let&apos;s chat!
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Clock3Icon className="size-4 opacity-80" />
              <Tabs className="gap-0" defaultValue="15m">
                <TabsList className="rounded-xl bg-muted p-1 *:data-[slot=tab-indicator]:rounded-lg *:data-[slot=tab-indicator]:bg-background *:data-[slot=tab-indicator]:shadow-xs">
                  {timeSlots.map((slot) => (
                    <TabsTab
                      className="h-auto min-w-[54px] rounded-lg px-3 py-1.5 font-medium text-[15px] text-muted-foreground shadow-none data-active:text-foreground"
                      key={slot}
                      value={slot}
                    >
                      {slot}
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="mt-5 flex flex-col gap-4 text-foreground text-sm">
              <div className="flex items-center gap-2">
                <MapPinIcon className="size-4 opacity-80" />
                <span className="font-medium">Cal Video</span>
              </div>
              <div className="flex items-center gap-2">
                <GlobeIcon className="size-4 opacity-80" />
                <span className="font-medium">Europe/Amsterdam</span>
                <ChevronDownIcon className="size-4 opacity-80" />
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">
                May{" "}
                <span className="font-normal text-muted-foreground">2025</span>
              </p>
              <div className="flex items-center gap-3">
                <ChevronLeftIcon className="size-4 opacity-80" />
                <ChevronRightIcon className="size-4 opacity-80" />
              </div>
            </div>

            <div className="mt-8 grid w-max grid-cols-[repeat(7,3.25rem)] gap-y-5 text-center font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-1">
              {calendarDays.map((week) => (
                <div
                  key={week.join("-")}
                  className="grid w-max grid-cols-[repeat(7,3.25rem)] gap-1"
                >
                  {week.map((day, dayIndex) => {
                    const isEmpty = day === "";
                    const isSelected = day === "24";
                    const isSoftSelected = [
                      "15",
                      "16",
                      "17",
                      "20",
                      "21",
                      "22",
                      "23",
                      "27",
                      "28",
                      "29",
                      "30",
                    ].includes(day);
                    const hasDot = day === "15" || day === "31";

                    return (
                      <div
                        key={day || `empty-${week.join("-")}-${dayIndex}`}
                        className={[
                          "relative flex size-13 items-center justify-center rounded-sm font-medium",
                          isEmpty && "opacity-0",
                          isSelected && "bg-foreground text-background",
                          isSoftSelected && "bg-muted text-foreground",
                          !isSelected &&
                            !isSoftSelected &&
                            !isEmpty &&
                            "text-muted-foreground",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {day || "0"}
                        {hasDot ? (
                          <span className="absolute bottom-[9px] left-1/2 size-[4px] -translate-x-1/2 rounded-full bg-foreground" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <HeroReviewStrip />
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <MarketingHeader />

      <main className="container relative mx-auto flex w-full flex-1 flex-col px-4 pt-12 pb-24 sm:px-6">
        <Card className="border-sidebar-border shadow-lg/5">
          <CardPanel className="p-0">
            <div className="flex flex-col gap-10 overflow-hidden px-10 py-20 lg:flex-row">
              <div className="px-1 py-4 sm:px-4 lg:w-[540px] lg:flex-none">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 font-medium text-muted-foreground text-xs shadow-xs">
                  <span>Cal.com launches v6.2</span>
                  <ChevronRightIcon className="size-4" />
                </div>

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
                    <svg
                      aria-hidden="true"
                      className="size-5 opacity-100"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M18.171 10.214c0-.639-.057-1.251-.163-1.837H10v3.476h4.582a3.918 3.918 0 0 1-1.7 2.571v2.134h2.752c1.61-1.483 2.537-3.669 2.537-6.344Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M10 18.5c2.295 0 4.22-.761 5.627-2.062l-2.752-2.134c-.761.511-1.736.813-2.875.813-2.209 0-4.08-1.492-4.749-3.497H2.406v2.204A8.498 8.498 0 0 0 10 18.5Z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.251 11.62A5.112 5.112 0 0 1 4.986 10c0-.563.097-1.109.265-1.62V6.176H2.406A8.498 8.498 0 0 0 1.5 10c0 1.373.328 2.673.906 3.824l2.845-2.204Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M10 4.883c1.248 0 2.367.429 3.249 1.271l2.438-2.438C14.212 2.343 12.287 1.5 10 1.5a8.498 8.498 0 0 0-7.594 4.676L5.25 8.38C5.92 6.375 7.791 4.883 10 4.883Z"
                        fill="#EA4335"
                      />
                    </svg>
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
          </CardPanel>
        </Card>
      </main>
    </div>
  );
}
