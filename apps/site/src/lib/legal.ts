import "server-only";
import { loader } from "fumadocs-core/source";
import { legal } from "./collections";

export const LEGAL_ROUTE = "/legal";

/**
 * The legal pages (content/legal). Their own source, so they stay out of the docs' sidebar, search
 * and /llms.txt.
 */
export const legalSource = loader({ source: legal.toFumadocsSource(), baseUrl: LEGAL_ROUTE });

export type LegalPage = NonNullable<ReturnType<typeof legalSource.getPage>>;

/** Every legal page, in content/legal/meta.json order. */
export function legalPages(): LegalPage[] {
  return legalSource
    .getPageTree()
    .children.flatMap((node) =>
      node.type === "page" ? legalSource.getPages().filter((page) => page.url === node.url) : [],
    );
}

/** "2026-10-11" → "October 11, 2026" (UTC: the date is a calendar day, not an instant). */
export function formatLegalDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
