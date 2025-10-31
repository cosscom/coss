import { Metadata } from "next";
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FramePanel,
} from "@workspace/ui/ui/frame";
import { Check } from "lucide-react";
import { Button } from "@workspace/ui/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";

export const metadata: Metadata = {
  title: "coss.com pricing",
  description: "open source is the foundation of all modern software",
};

const pricingPlans = [
  {
    title: "Starter",
    description:
      "Get started with our coss.com APIs. Add scheduling to your app or marketplace.",
    featureHeadline: "Free for all developers",
    price: "Free",
    features: [
      "Up to 25 bookings a month",
      "$0.99 overage beyond",
      "Community Support",
      "Cal Atoms (React Library)",
      "Platform APIs",
    ],
    ctaName: "Get Started",
    ctaLink: "https://app.cal.com/settings/platform/new",
  },
  {
    title: "Essentials",
    description:
      "Advanced features included. Dedicated support team. Scale your app or marketplace.",
    featureHeadline: "Everything in starter, plus:",
    price: "$299",
    highlight: true,
    features: [
      "Up to 500 bookings a month",
      "$0.60 overage beyond",
      "API for Round-Robin and Team Events",
      "User Management and Analytics",
      "Technical Account Manager and Onboarding Support",
    ],
    ctaName: "Get Started",
    ctaLink: "https://app.cal.com/settings/platform/new",
  },
  {
    title: "Scale",
    description:
      "High-volume enterprise features. Premium support included. Enterprise-grade security.",
    featureHeadline: "Everything in essentials, plus:",
    price: "$2499",
    features: [
      "Up to 5000 bookings a month",
      "$0.50 overage beyond",
      "Credential import from other platforms",
      "Compliance Check SOC2, HIPAA",
      "One-on-one developer calls",
      "Help with Credentials Verification (Zoom, Google App Store)",
      "Expedited features and integrations",
      "SLA (99.999% uptime)",
    ],
    ctaName: "Get Started",
    ctaLink: "https://app.cal.com/settings/platform/new",
  },
  {
    title: "Enterprise",
    description:
      "Custom-tailored solution. Unlimited booking volume. Dedicated enterprise support.",
    featureHeadline: "Everything in scale, plus:",
    price: "Contact us",
    features: [
      "No overages",
      "Credential import from other platforms",
      "Compliance Check SOC2, HIPAA",
      "One-on-one developer calls",
      "Help with Credentials Verification (Zoom, Google App Store)",
      "Expedited features and integrations",
      "SLA (99.999% uptime)",
      "Volume Discounts",
    ],
    ctaName: "Book a call",
    ctaLink: "https://i.cal.com/sales/platform",
  },
];

export default function Page() {
  return (
    <main className="container w-full flex-1 mb-16 lg:mb-20">
      <div className="mt-12 lg:mt-16 mx-auto text-muted-foreground [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="my-12 text-center scroll-m-20 font-heading text-3xl first:mt-0 *:[code]:text-2xl text-foreground">
          Pricing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {pricingPlans.map((plan) => (
            <div key={plan.title}>
              <Frame
                className={cn(
                  "w-full",
                  plan.highlight && "bg-primary text-primary-foreground"
                )}
                key={plan.title}
              >
                <FrameHeader>
                  <FrameTitle>{plan.title}</FrameTitle>
                  <FrameDescription>
                    <h2
                      className={cn(
                        "text-primary",
                        plan.highlight && "text-primary-foreground"
                      )}
                    >
                      <span className="font-semibold text-4xl">
                        {plan.price}
                      </span>{" "}
                      {plan.price === "FREE" ? "" : "/ month"}
                    </h2>
                    <p
                      className={cn(
                        "mt-4 text-muted-foreground",
                        plan.highlight && "text-primary-foreground"
                      )}
                    >
                      {plan.description}
                    </p>

                    <Button
                      className={cn(
                        "w-full mt-6 mb-3",
                        plan.highlight && "invert"
                      )}
                      render={<Link href={plan.ctaLink} />}
                    >
                      {plan.ctaName}
                    </Button>
                    <h3
                      className={cn(
                        "text-sm font-semibold mt-2 -mb-2",
                        plan.highlight && "text-primary-foreground"
                      )}
                    >
                      {plan.featureHeadline}
                    </h3>
                  </FrameDescription>
                </FrameHeader>
                <FramePanel
                  className={cn(
                    plan.highlight &&
                      "bg-transparent! border-background/10 shadow-3xl"
                  )}
                >
                  <div className="text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <div
                        className={cn(
                          plan.highlight && "text-primary-foreground!",
                          "flex items-center gap-3 mb-3 text-sm text-muted-foreground"
                        )}
                        key={feature}
                      >
                        <Check
                          className="w-4 h-4 text-green-500 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </FramePanel>
              </Frame>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
