import { REGISTRY_ITEMS } from "@/lib/calendar/registry/manifest";

export const SOURCE_HREF = "/kloq/docs/registry";
export const INSTALL_HREF = "/kloq/docs/installation";

const core = REGISTRY_ITEMS.find((item) => item.name === "kloq");

/** What the registry ships, read from its manifest. */
export const SOURCE_FACTS = {
  dependencies: core?.dependencies ?? [],
  blocks: REGISTRY_ITEMS.filter((item) => item.name !== "kloq").map((item) => item.name),
};

export const CTA = {
  href: SOURCE_HREF,
  label: "Explore the source",
  link: "browse the source →",
  upsell: "see the source →",
  nav: "Source",
  eyebrow: "available on npm",
  heroTail: "available on npm and as source files",
  heroLine: "install from npm or add the source through the registry ·",
  heroCta: "Install it",
  heroHref: "#install",
  installTitle: "Install the package. Or bring in the source.",
  installLede:
    "npm gives you the compiled, typed build with every feature and theme. The shadcn registry copies the calendar into your repo as files you can edit. Same component and API; choose where the code lives.",
  outro:
    "Install from npm in about a minute, or add the source when you want to shape every detail.",
  toolsLede: "available on npm and as source files",
  docsHome: "Install from npm, or add the source through the shadcn registry.",
  installCta: "Read the install guide",
  installHref: INSTALL_HREF,
  headerCta: "Install",
  siteDescription: "available on npm and as source files",
} as const;

export type Cta = typeof CTA;

export const TIERS = {
  npm: {
    name: "npm",
    blurb:
      "The compiled, typed build in node_modules. Every feature, every theme, design mode included.",
    points: [
      "npm install kloq",
      "All six views, nineteen themes, ⌘K, design mode",
      "Updates with npm update",
    ],
    cta: "Install from npm",
  },
  source: {
    name: "Source",
    blurb:
      "The whole calendar as files in your repo through the shadcn registry. Edit anything from the moment it lands.",
    points: [
      "Engine, views, themes, ⌘K and design mode as source",
      "A spring tweak is a line; a custom slot is a file",
      `Add-on blocks: ${SOURCE_FACTS.blocks.join(", ")}`,
      "Update when you choose to re-run the CLI",
    ],
    cta: "Read the registry guide",
  },
} as const;
