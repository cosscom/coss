import { PLANS, SELF_SERVE_PLANS } from "@coss/billing/catalog";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

/*
 * Metadata and schema.org payloads for coss.com's own pages. They serve two audiences: crawlers
 * building results, and the answer engines that read a page to cite it. kloq keeps its own
 * (`src/lib/calendar/structured-data.ts`).
 */

/** An absolute coss.com URL. */
export function abs(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * A page's metadata: an absolute title (pages here are written for their search query, so the
 * root layout's `· coss.com` template would only repeat it), the description, the canonical URL,
 * Open Graph and Twitter. The image comes from the nearest `opengraph-image` file, so it isn't set
 * here. `markdown` is the page's `.md` twin, for agents.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  markdown,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  markdown?: string;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      ...(markdown ? { types: { "text/markdown": markdown } } : {}),
    },
    openGraph: { type, url: path, siteName: SITE_NAME, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const ORGANIZATION = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: abs("/icon.svg"),
  description: SITE_DESCRIPTION,
  parentOrganization: { "@type": "Organization", name: "Cal.com, Inc.", url: "https://cal.com" },
  sameAs: ["https://github.com/cosscom/coss", "https://www.npmjs.com/package/coss"],
};

export function organizationSchema() {
  return { "@context": "https://schema.org", ...ORGANIZATION };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** The self-serve plans as schema.org offers (USD per month, the fee being usage credit). */
function offers() {
  return SELF_SERVE_PLANS.map((key) => ({
    "@type": "Offer",
    name: PLANS[key].name,
    description: PLANS[key].description,
    price: (Number(PLANS[key].feeCents) / 100).toFixed(2),
    priceCurrency: "USD",
    url: abs("/pricing"),
  }));
}

/** A product page: the product as a web API (a SoftwareApplication with the plans as offers). */
export function productSchema({
  name,
  description,
  path,
  features,
}: {
  name: string;
  description: string;
  path: string;
  features?: readonly string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} ${name}`,
    url: abs(path),
    description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any (HTTPS API)",
    ...(features?.length ? { featureList: [...features] } : {}),
    offers: offers(),
    provider: { "@id": ORGANIZATION_ID },
  };
}

export function faqSchema(faq: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

/** The trail from the home page to a page: `[["Products", "/products"], ["Inboxes", "/products/inboxes"]]`. */
export function breadcrumbSchema(trail: readonly (readonly [name: string, path: string])[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"] as const, ...trail].map(([name, path], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: abs(path),
    })),
  };
}

/** An article (a comparison, a docs page) by coss.com, dated when it was last checked. */
export function articleSchema({
  type = "Article",
  title,
  description,
  path,
  modified,
}: {
  type?: "Article" | "TechArticle";
  title: string;
  description?: string;
  path: string;
  /** YYYY-MM-DD. */
  modified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    headline: title,
    ...(description ? { description } : {}),
    url: abs(path),
    ...(modified ? { dateModified: modified } : {}),
    author: { "@id": ORGANIZATION_ID },
    publisher: ORGANIZATION,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
}
