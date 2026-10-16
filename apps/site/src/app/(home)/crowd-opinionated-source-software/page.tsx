import { Button } from "@coss/ui/components/button";
import {
  CheckIcon,
  FactoryIcon,
  GlobeIcon,
  MessageSquareTextIcon,
  MinusIcon,
  ScaleIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignUpButton } from "@/components/sign-up-button";
import { SHIPYARD } from "@/lib/shipyard";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const PATH = "/crowd-opinionated-source-software";
const TITLE = "Crowd opinionated source software";
const DESCRIPTION =
  "Open source is dead. Heck, source code is dead. On coss.com you contribute in English, not code: open a Prompt Request, the maintainers decide, their software factory builds it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: {
    title: `${TITLE} · ${SITE_NAME}`,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: `${SITE_URL}${PATH}`,
  },
};

export default function CrowdOpinionatedSourcePage() {
  return (
    // One ruled sheet between the shell's rails, like the landing page.
    <main className="mx-auto w-full max-w-[1440px] flex-1">
      <Hero />
      <Manifesto />
      <Flow />
      <Controls />
      <Opinionated />
      <Close />
    </main>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="grid grid-cols-1 border-b lg:grid-cols-12">
      <div className="flex flex-col gap-8 px-4 pt-12 pb-10 sm:px-8 sm:pt-16 lg:col-span-12 lg:grid lg:grid-cols-12 lg:items-end lg:gap-10 lg:pb-12">
        <h1
          className="text-balance font-semibold text-[clamp(2.75rem,6.5vw,5.25rem)] leading-[0.92] tracking-[-0.035em] lg:col-span-8"
          id="hero-title"
        >
          The next GitHub will not look like GitHub.
        </h1>
        <div className="flex flex-col gap-6 lg:col-span-4 lg:pb-2">
          <p className="max-w-md text-lg text-muted-foreground leading-snug">
            <strong className="font-semibold text-foreground">
              coss.com is crowd opinionated source software.
            </strong>{" "}
            Contribute in English, not code. The maintainers decide, their software factory builds,
            and everyone watches it ship.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <SignUpButton />
            <Button className="px-4" render={<Link href="#prompt-requests" />} variant="outline">
              How it works
            </Button>
          </div>
        </div>
      </div>
      <div className="drafting-grid flex items-center justify-center overflow-hidden border-t px-4 py-12 lg:col-span-12">
        <PromptRequestCard />
      </div>
    </section>
  );
}

const THREAD: { who: string; role: string; text: string }[] = [
  {
    who: "maintainer",
    role: "Approved",
    text: "Yes. Keep the existing range picker, add presets above it. Sent to the factory.",
  },
  {
    who: "factory",
    role: "Built",
    text: "Preview is up with screenshots of light and dark. All end-to-end tests pass.",
  },
];

/** An illustrative Prompt Request, drawn in the style of the landing page's agent session. */
function PromptRequestCard() {
  return (
    <figure className="flex w-full max-w-2xl flex-col gap-3">
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center gap-1.5 border-b px-3.5 py-2.5">
          <span className="size-2.5 rounded-full border" />
          <span className="size-2.5 rounded-full border" />
          <span className="size-2.5 rounded-full border" />
          <span className="ml-2 font-mono text-muted-foreground text-xs">prompt request #482</span>
        </div>
        <div className="flex flex-col gap-3 border-b px-5 py-5">
          <span className="font-mono text-muted-foreground text-xs">
            opened by a user · English
          </span>
          <p className="text-lg leading-snug">
            “Let me filter the bookings list by date. Quick presets like ‘this week’ and ‘last 30
            days’ would cover almost everything I do.”
          </p>
        </div>
        <ol className="flex flex-col">
          {THREAD.map((entry) => (
            <li className="flex gap-3 border-b px-5 py-4 last:border-b-0" key={entry.who}>
              <CheckIcon aria-hidden className="mt-1 size-3.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-mono text-muted-foreground text-xs">
                  {entry.who} · {entry.role}
                </span>
                <span className="leading-snug">{entry.text}</span>
              </div>
            </li>
          ))}
          <li className="flex items-center gap-3 px-5 py-4">
            <GlobeIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <code className="font-mono text-muted-foreground text-sm">
              preview-482.example.coss.app
            </code>
          </li>
        </ol>
      </div>
      <figcaption className="text-muted-foreground text-sm">
        An illustrative Prompt Request.
      </figcaption>
    </figure>
  );
}

function SectionHead({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 px-4 pt-16 pb-10 sm:px-8 sm:pt-24 lg:grid-cols-12 lg:gap-10">
      <h2 className="font-semibold text-4xl tracking-[-0.03em] sm:text-5xl lg:col-span-5" id={id}>
        {title}
      </h2>
      <div className="max-w-xl text-lg text-muted-foreground leading-snug lg:col-span-6 lg:col-start-7 lg:pt-2">
        {children}
      </div>
    </div>
  );
}

const DEATHS: { title: string; body: string }[] = [
  {
    title: "Nobody reads source code anymore",
    body: "Pull requests get auto-reviewed. Systems are self-healing. The code still exists; people just stopped reading it.",
  },
  {
    title: "Open source died of exposure",
    body: "Every public line is an attack surface. Potential security vulnerabilities made shipping your source in the open a liability, not a virtue.",
  },
  {
    title: "Reading code died of volume",
    body: "More code is pushed in a day than a team could review in a year, and AI systems now read it better than we do.",
  },
  {
    title: "Guardrails are what matter now",
    body: "End-to-end tests and AI-automated QA decide whether software works. Not a human squinting at a diff.",
  },
];

function Manifesto() {
  return (
    <section aria-labelledby="manifesto-title" className="border-b">
      <div className="px-4 pt-16 pb-10 sm:px-8 sm:pt-24">
        <h2
          className="max-w-5xl text-balance font-semibold text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.95] tracking-[-0.035em]"
          id="manifesto-title"
        >
          Open source is dead. Heck, source code is dead.
        </h2>
      </div>
      <div className="grid grid-cols-1 border-t md:grid-cols-2">
        {DEATHS.map((death, index) => (
          <article
            className="flex flex-col gap-3 border-b px-4 py-8 sm:px-8 md:odd:border-r md:[&:nth-last-child(-n+2)]:border-b-0"
            key={death.title}
          >
            <span className="font-mono text-muted-foreground text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-2xl tracking-[-0.02em]">{death.title}</h3>
            <p className="max-w-md text-muted-foreground leading-snug">{death.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: MessageSquareTextIcon,
    title: "Write a prompt",
    body: "Anyone opens a Prompt Request instead of a pull request: what should change, and why, in plain English.",
  },
  {
    icon: ScaleIcon,
    title: "Maintainers decide",
    body: "They read it and approve or decline, with a comment either way. Nobody is left wondering.",
  },
  {
    icon: FactoryIcon,
    title: "The factory builds",
    body: `Approved requests go straight to the maintainer's software factory, such as ${SHIPYARD.name}, which writes, tests and ships the change.`,
  },
  {
    icon: GlobeIcon,
    title: "Everyone sees it",
    body: "The factory notifies the author and can update everyone publicly with a preview URL and screenshots.",
  },
];

function Flow() {
  return (
    <section aria-labelledby="flow-title" className="scroll-mt-14 border-b" id="prompt-requests">
      <SectionHead id="flow-title" title="Open a Prompt Request, not a pull request">
        Contribute in English, not code. A Prompt Request is an idea with a decision attached, and a
        software factory waiting at the other end.
      </SectionHead>
      <ol className="grid border-t md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            className="flex flex-col gap-3 border-b px-4 py-8 sm:px-8 md:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0"
            key={step.title}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full border font-mono text-xs">
                {index + 1}
              </span>
              <step.icon aria-hidden className="size-4.5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-xl tracking-[-0.01em]">{step.title}</h3>
            <p className="text-muted-foreground leading-snug">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const CONTROLS = [
  {
    id: "auto",
    title: "Auto-allow",
    tag: "goes straight to the factory",
    items: [
      "Copy and translation fixes",
      "Dependency updates that pass every test",
      "Accessibility improvements",
      "Any kind of change you choose to trust",
    ],
  },
  {
    id: "approve",
    title: "Require approval",
    tag: "waits for a maintainer",
    items: [
      "New features and changed behaviour",
      "Anything touching auth, billing or data",
      "Design and product direction",
      "Every single change, if that's how you run it",
    ],
  },
] as const;

function Controls() {
  return (
    <section aria-labelledby="controls-title" className="border-b">
      <SectionHead id="controls-title" title="Maintainers set the rules">
        Let the routine through on its own and keep a hand on everything that matters. Auto-allow
        certain kinds of changes, or require approval for each one.
      </SectionHead>
      <div className="grid grid-cols-1 border-t md:grid-cols-2">
        {CONTROLS.map((control) => {
          const auto = control.id === "auto";
          return (
            <div
              className={
                auto ? "flex flex-col border-b md:border-r md:border-b-0" : "flex flex-col"
              }
              key={control.id}
            >
              <div className="flex items-baseline justify-between gap-4 border-b px-4 py-5 sm:px-8">
                <h3 className="font-semibold text-2xl tracking-[-0.02em]">{control.title}</h3>
                <span className="font-mono text-muted-foreground text-xs">{control.tag}</span>
              </div>
              <ul className="flex flex-col px-4 py-4 sm:px-8">
                {control.items.map((item) => (
                  <li
                    className="flex items-center gap-3 border-b py-3.5 last:border-b-0"
                    key={item}
                  >
                    {auto ? (
                      <CheckIcon aria-hidden className="size-4 shrink-0" />
                    ) : (
                      <MinusIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const PRINCIPLES: [string, string][] = [
  ["Who contributes", "Everyone, in English"],
  ["Who decides", "The maintainers"],
  ["Who writes the code", "The software factory"],
  ["Who checks it works", "End-to-end tests and AI QA"],
  ["Who sees the result", "Everyone, with a preview URL"],
  ["Whose software it is", "Still the maintainers'"],
];

function Opinionated() {
  return (
    <section aria-labelledby="opinionated-title" className="border-b">
      <SectionHead id="opinionated-title" title="Collaborative, but opinionated">
        Software is built by the crowd, but the source is opinionated by the maintainers. Ideas come
        from everywhere; taste stays where it belongs.
      </SectionHead>
      <dl className="grid gap-x-16 border-t px-4 py-10 sm:px-8 md:grid-cols-2">
        {PRINCIPLES.map(([label, value]) => (
          <div className="flex items-baseline gap-3 border-b py-3.5" key={label}>
            <dt>{label}</dt>
            <span aria-hidden className="leader" />
            <dd className="text-right font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Close() {
  return (
    <section aria-labelledby="close-title" className="drafting-grid px-4 py-20 sm:px-8 sm:py-28">
      <div className="flex flex-col items-start gap-8">
        <h2
          className="max-w-4xl text-balance font-semibold text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.95] tracking-[-0.035em]"
          id="close-title"
        >
          Launch your repository on coss.com.
        </h2>
        <p className="max-w-xl text-lg text-muted-foreground">
          Every repository, private or public, can launch on coss.com today. Bring your guardrails
          and your opinions; the crowd brings the prompts.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <SignUpButton size="lg" />
          <Button
            className="px-5"
            render={<Link href={SHIPYARD.path} />}
            size="lg"
            variant="outline"
          >
            Meet {SHIPYARD.name}
          </Button>
        </div>
      </div>
    </section>
  );
}
