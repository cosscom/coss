import { Button } from "@coss/ui/components/button";
import {
  AnchorIcon,
  CheckIcon,
  FactoryIcon,
  GlobeIcon,
  MessageSquareTextIcon,
  MinusIcon,
  ScaleIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { AutoReview } from "@/components/coss-landing/auto-review";
import { ContributorProfile } from "@/components/coss-landing/contributor-profile";
import {
  ClaudeLogo,
  DevinLogo,
  FactoryLogo,
  T3Logo,
} from "@/components/coss-landing/factory-logos";
import { Decisions, Factory, Preview, PromptSwap } from "@/components/coss-landing/flow-steps";
import { Guardrails } from "@/components/coss-landing/guardrails";
import { LaunchRepos } from "@/components/coss-landing/launch-repos";
import { MaintainerRules } from "@/components/coss-landing/maintainer-rules";
import { NextGithub } from "@/components/coss-landing/next-github";
import { Opinionated as OpinionatedFunnel } from "@/components/coss-landing/opinionated";
import { PromptRequestChat } from "@/components/coss-landing/prompt-request-chat";
import { SelfHealing } from "@/components/coss-landing/self-healing";
import { UnreadDiff } from "@/components/coss-landing/unread-diff";
import { Exposure, Volume } from "@/components/coss-landing/why-oss-died";
import { SignUpButton } from "@/components/sign-up-button";
import { YouTubeEmbed } from "@/components/youtube-embed";
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
      <Video />
      <Manifesto />
      <Flow />
      <Controls />
      <Factories />
      <Opinionated />
      <Hiring />
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
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2.5">
              <SignUpButton label="Migrate from GitHub" />
              <Button className="px-4" render={<Link href="#prompt-requests" />} variant="outline">
                How it works
              </Button>
            </div>
            <p className="font-mono text-muted-foreground text-xs">
              We import stars and contributors, too!
            </p>
          </div>
        </div>
      </div>
      <div className="drafting-grid grid items-center justify-items-center gap-10 overflow-hidden border-t px-4 py-12 sm:px-8 lg:col-span-12 lg:grid-cols-2">
        <NextGithub />
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

function SectionHead({
  id,
  title,
  children,
}: {
  id: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 px-4 pt-16 pb-10 sm:px-8 sm:pt-24 lg:grid-cols-12 lg:gap-10">
      <h2 className="font-semibold text-4xl tracking-[-0.03em] sm:text-5xl lg:col-span-6" id={id}>
        {title}
      </h2>
      <div className="max-w-xl text-lg text-muted-foreground leading-snug lg:col-span-6 lg:col-start-7 lg:pt-2">
        {children}
      </div>
    </div>
  );
}

function Video() {
  return (
    <section aria-labelledby="video-title" className="border-b">
      <SectionHead id="video-title" title="Why open source is dead.">
        Why the next GitHub won't look like GitHub, and what contributing looks like when nobody
        writes the code by hand and when open source code is easier to hack than closed source.
      </SectionHead>
      <div className="drafting-grid border-t px-4 py-10 sm:px-8 sm:py-14">
        <figure className="mx-auto flex w-full max-w-5xl flex-col gap-3">
          <YouTubeEmbed id="JYEPLpgCRck" title="Crowd opinionated source software" />
          <figcaption className="font-mono text-muted-foreground text-xs">
            Plays from YouTube (privacy-enhanced mode) once you press play.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

const DEATHS: { title: string; body: string; visual: ComponentType }[] = [
  {
    title: "Nobody reads source code anymore",
    body: "The code still exists; people just stopped reading it. It scrolls past by the thousand lines, written and checked by machines.",
    visual: UnreadDiff,
  },
  {
    title: "Pull requests review themselves",
    body: "Types, tests, a security scan and a review agent sign off on a pull request before a person would have opened the tab.",
    visual: AutoReview,
  },
  {
    title: "Systems heal themselves",
    body: "When something breaks in production, the system rolls back, patches and recovers on its own. Nobody opens the source to find out why.",
    visual: SelfHealing,
  },
  {
    title: "Open source died of exposure",
    body: "Every public line is an attack surface. Potential security vulnerabilities made shipping your source in the open a liability, not a virtue.",
    visual: Exposure,
  },
  {
    title: "Reading code died of volume",
    body: "More code is pushed in a day than a team could review in a year, and AI systems now read it better than we do.",
    visual: Volume,
  },
  {
    title: "Guardrails are what matter now",
    body: "End-to-end tests and AI-automated QA decide whether software works. Not a human squinting at a diff.",
    visual: Guardrails,
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
            className="flex flex-col gap-3 border-b px-4 py-8 last:border-b-0 sm:px-8 md:odd:border-r md:[&:nth-last-child(-n+2)]:border-b-0"
            key={death.title}
          >
            <span className="font-mono text-muted-foreground text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-2xl tracking-[-0.02em]">{death.title}</h3>
            <p className="max-w-md text-muted-foreground leading-snug">{death.body}</p>
            <div className="mt-auto pt-4">
              <death.visual />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: MessageSquareTextIcon,
    visual: PromptSwap,
    title: "Write a prompt",
    body: "Anyone opens a Prompt Request instead of a pull request: what should change, and why, in plain English.",
  },
  {
    icon: ScaleIcon,
    visual: Decisions,
    title: "Maintainers decide",
    body: "They read it and approve or decline, with a comment either way. Nobody is left wondering.",
  },
  {
    icon: FactoryIcon,
    visual: Factory,
    title: "The factory builds",
    body: `Approved requests go straight to the maintainer's software factory, such as ${SHIPYARD.name}, which writes, tests and ships the change.`,
  },
  {
    icon: GlobeIcon,
    visual: Preview,
    title: "Everyone sees it",
    body: "The factory notifies the author and can update everyone publicly with a preview URL and screenshots.",
  },
];

function Flow() {
  return (
    <section aria-labelledby="flow-title" className="scroll-mt-14 border-b" id="prompt-requests">
      <SectionHead
        id="flow-title"
        title={
          <>
            Open a <span className="whitespace-nowrap">Prompt Request</span>, not a pull request
          </>
        }
      >
        Contribute in English, not code. A Prompt Request is an idea with a decision attached, and a
        software factory waiting at the other end.
      </SectionHead>
      <div className="drafting-grid flex justify-center border-t px-4 py-12 sm:px-8">
        <PromptRequestChat />
      </div>
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
            <div className="mt-auto pt-4">
              <step.visual />
            </div>
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
      <div className="drafting-grid flex justify-center border-t px-4 py-12 sm:px-8">
        <MaintainerRules />
      </div>
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

const FACTORIES: {
  name: string;
  site: string;
  href?: string;
  note: string;
  logo: ComponentType<{ className?: string }>;
}[] = [
  {
    logo: AnchorIcon,
    name: SHIPYARD.name,
    site: "coss.com/shipyard",
    href: SHIPYARD.path,
    note: "Coding agents on your own boxes",
  },
  {
    logo: DevinLogo,
    name: "Devin",
    site: "devin.ai",
    href: "https://devin.ai",
    note: "Cognition's autonomous engineer",
  },
  {
    logo: FactoryLogo,
    name: "Factory",
    site: "factory.com",
    href: "https://factory.com",
    note: "Droids for the whole lifecycle",
  },
  {
    logo: ClaudeLogo,
    name: "Claude Code",
    site: "claude.com/claude-code",
    href: "https://claude.com/claude-code",
    note: "Anthropic's agentic coding tool",
  },
  {
    logo: T3Logo,
    name: "T3 Code",
    site: "github.com/pingdotgg/t3code",
    href: "https://github.com/pingdotgg/t3code",
    note: "Open-source control plane for agents",
  },
  {
    logo: FactoryIcon,
    name: "Any factory",
    site: "yours",
    note: "If it takes a prompt and ships a change, it fits",
  },
];

function Factories() {
  return (
    <section aria-labelledby="factories-title" className="border-b">
      <SectionHead id="factories-title" title="You bring the factory">
        We provide the collaboration layer. Prompt Requests, decisions, guardrails and previews live
        on coss.com; the building happens wherever you already build. Compatible with any software
        factory.
      </SectionHead>
      <ul className="grid border-t sm:grid-cols-2 lg:grid-cols-3">
        {FACTORIES.map((factory) => {
          return (
            <li
              className="flex flex-col gap-4 border-b px-4 py-6 last:border-b-0 sm:px-8 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 lg:odd:border-r-0 lg:[&:not(:nth-child(3n))]:border-r lg:[&:nth-last-child(-n+3)]:border-b-0"
              key={factory.name}
            >
              <factory.logo className="size-7" />
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-semibold text-xl tracking-[-0.01em]">
                  {!factory.href ? (
                    factory.name
                  ) : factory.href.startsWith("https://") ? (
                    <a href={factory.href} rel="noreferrer" target="_blank">
                      {factory.name}
                    </a>
                  ) : (
                    <Link href={factory.href}>{factory.name}</Link>
                  )}
                </h3>
                <span className="font-mono text-muted-foreground text-xs">{factory.site}</span>
              </div>
              <p className="-mt-2.5 text-muted-foreground leading-snug">{factory.note}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const PRINCIPLES: [string, string][] = [
  ["Who contributes", "Everyone, in English"],
  ["Who decides", "The maintainers"],
  ["Who writes the code", "The software factory"],
  ["Which factory", "Any: you bring it"],
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
      <div className="drafting-grid flex justify-center border-t px-4 py-12 sm:px-8">
        <OpinionatedFunnel />
      </div>
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

const SHIFTS: { title: string; body: string }[] = [
  {
    title: "What, not how",
    body: "Software engineering is turning into product engineering: deciding what to build, for whom and why. State-of-the-art models take care of the how.",
  },
  {
    title: "The best ideas win",
    body: "A new era of hiring. It used to reward the best code; now it rewards the best ideas, and the taste to approve the right ones.",
  },
  {
    title: "GitHub for hiring is broken",
    body: "A contribution graph only shows the how: commits, lines, languages. Since AI, that is the part that tells you nothing. Prompt to Production shows what somebody decided, and what shipped.",
  },
];

function Hiring() {
  return (
    <section aria-labelledby="hiring-title" className="border-b">
      <SectionHead id="hiring-title" title="The best ideas win, not the best code">
        Your coss.com profile is a record of product decisions: the prompts you opened, the ones you
        approved, and what made it to production. The new résumé of a product engineer.
      </SectionHead>
      <div className="drafting-grid flex justify-center border-t px-4 py-12 sm:px-8">
        <ContributorProfile />
      </div>
      <div className="grid grid-cols-1 border-t md:grid-cols-3">
        {SHIFTS.map((shift, index) => (
          <article
            className="flex flex-col gap-3 border-b px-4 py-8 last:border-b-0 sm:px-8 md:border-r md:border-b-0 md:last:border-r-0"
            key={shift.title}
          >
            <span className="font-mono text-muted-foreground text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-2xl tracking-[-0.02em]">{shift.title}</h3>
            <p className="max-w-md text-muted-foreground leading-snug">{shift.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Close() {
  return (
    <section
      aria-labelledby="close-title"
      className="drafting-grid grid items-center gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-12"
    >
      <div className="flex flex-col items-start gap-8 lg:col-span-7">
        <h2
          className="max-w-4xl text-balance font-semibold text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.95] tracking-[-0.035em]"
          id="close-title"
        >
          Bring the recipe, we provide the oven.
        </h2>
        <p className="max-w-xl text-lg text-muted-foreground">
          An open, collaborative platform for both (previously) open source and closed source
          projects. Anyone can contribute, without your code or your security ever at risk. Launch
          your repository, private or public, on coss.com today.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <SignUpButton label="Migrate from GitHub" size="lg" />
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
      <div className="flex justify-center lg:col-span-5 lg:justify-end">
        <LaunchRepos />
      </div>
    </section>
  );
}
