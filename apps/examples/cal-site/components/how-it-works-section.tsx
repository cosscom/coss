import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { ChevronRightIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

type Step = {
  description: string;
  illustration: ReactNode;
  step: string;
  title: string;
};

const steps: Step[] = [
  {
    step: "01",
    title: "Connect your calendar",
    description:
      "We'll handle all the cross-referencing, so you don't have to worry about double bookings.",
    illustration: <MinimalPlaceholderPreview />,
  },
  {
    step: "02",
    title: "Set your availability",
    description:
      "Want to block off weekends? Set up any buffers? We make that easy.",
    illustration: <MinimalPlaceholderPreview />,
  },
  {
    step: "03",
    title: "Choose how to meet",
    description: "It could be a video chat, phone call, or a walk in the park!",
    illustration: <MinimalPlaceholderPreview />,
  },
];

export function HowItWorksSection(): ReactElement {
  return (
    <>
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 font-medium text-sm">
          How it works
        </div>
        <h2 className="mt-6 text-balance font-bold text-4xl tracking-tight sm:text-5xl">
          With us, appointment scheduling is easy
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
          Effortless scheduling for business and individuals, powerful solutions
          for fast-growing modern companies.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg">Get started</Button>
          <Button size="lg" variant="outline">
            Book a demo
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {steps.map((step) => (
          <Card key={step.step} render={<article />}>
            <CardPanel className="flex flex-col gap-5">
              <div className="flex-1">
                <Badge variant="secondary" size="lg">
                  {step.step}
                </Badge>
                <h3 className="mt-3 font-heading font-semibold text-lg">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              <div>{step.illustration}</div>
            </CardPanel>
          </Card>
        ))}
      </div>
    </>
  );
}

function MinimalPlaceholderPreview(): ReactElement {
  return (
    <div className="flex h-52 items-center justify-center bg-background">
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-border border-dashed bg-muted/30">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-3 w-20 rounded-full bg-border/70" />
          <div className="mx-auto h-3 w-28 rounded-full bg-border/50" />
          <div className="mx-auto h-24 w-40 rounded-lg border border-border/70 bg-card/80" />
        </div>
      </div>
    </div>
  );
}
