import type { Competitor } from "@/lib/calendar/compare";
import { abs } from "@/lib/calendar/site";

/**
 * The schema.org payloads. They exist for two audiences now: crawlers building
 * rich results, and the answer engines that increasingly field "which React
 * calendar should I use" before anyone reaches a search page.
 */

const ORGANIZATION = {
  "@type": "Organization",
  name: "kloq",
  url: abs("/calendar"),
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "kloq",
  url: abs("/calendar"),
  description:
    "A React calendar component obsessed with micro-perfection — hand-tuned drag physics, a design mode that annotates its own craft, and a command palette that reaches everything.",
  publisher: ORGANIZATION,
};

export const softwareSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "kloq",
  url: abs("/calendar"),
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "React component library",
  operatingSystem: "Web browser",
  description:
    "A drag-and-drop React calendar and scheduler component: week, day and n-day views, RRULE recurrence, ICS import and export, time zones, a ⌘K command palette, nineteen themes, and a built-in design mode. Install the compiled build from npm, or take the whole library as source through the shadcn registry.",
  softwareRequirements: "React 19, Tailwind CSS v4",
  featureList: [
    "Drag to create, move and resize events",
    "Week, day and n-day views",
    "RRULE recurrence with this / following / all edit semantics",
    "ICS import and export (RFC 5545)",
    "Time zones with extra gutter columns",
    "⌘K command palette and natural-language quick add",
    "Nineteen themes, light and dark",
    "Design mode inspector",
  ],
  author: ORGANIZATION,
});

export const faqSchema = (faq: readonly (readonly [string, string])[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(([question, answer]) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
});

export const docsSchema = ({
  title,
  description,
  url,
}: {
  title: string;
  description?: string;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: title,
      description,
      url: abs(url),
      isPartOf: { "@type": "WebSite", name: "kloq", url: abs("/calendar") },
      about: { "@type": "SoftwareApplication", name: "kloq", url: abs("/calendar") },
      author: ORGANIZATION,
      publisher: ORGANIZATION,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "kloq", item: abs("/calendar") },
        { "@type": "ListItem", position: 2, name: "Docs", item: abs("/calendar/docs") },
        ...(url === "/calendar/docs"
          ? []
          : [{ "@type": "ListItem", position: 3, name: title, item: abs(url) }]),
      ],
    },
  ],
});

/** A comparison page: an article that names both things it compares. */
export const compareSchema = (c: Competitor) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: `kloq vs ${c.name}`,
      description: c.verdict,
      url: abs(`/calendar/compare/${c.slug}`),
      author: ORGANIZATION,
      publisher: ORGANIZATION,
      about: [
        { "@type": "SoftwareApplication", name: "kloq", url: abs("/calendar") },
        { "@type": "SoftwareApplication", name: c.name },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "kloq", item: abs("/calendar") },
        { "@type": "ListItem", position: 2, name: "Compare", item: abs("/calendar/compare") },
        {
          "@type": "ListItem",
          position: 3,
          name: `kloq vs ${c.name}`,
          item: abs(`/calendar/compare/${c.slug}`),
        },
      ],
    },
  ],
});

/** A tool page: a small free utility, named as software in its own right. */
export const toolSchema = ({
  name,
  description,
  slug,
}: {
  name: string;
  description: string;
  slug: string;
}) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name,
      description,
      url: abs(`/calendar/tools/${slug}`),
      applicationCategory: "DeveloperApplication",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
      isPartOf: { "@type": "WebSite", name: "kloq", url: abs("/calendar") },
      author: ORGANIZATION,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "kloq", item: abs("/calendar") },
        { "@type": "ListItem", position: 2, name: "Tools", item: abs("/calendar/tools") },
        { "@type": "ListItem", position: 3, name, item: abs(`/calendar/tools/${slug}`) },
      ],
    },
  ],
});
