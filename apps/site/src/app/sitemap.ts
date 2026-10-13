import type { MetadataRoute } from "next";
import { legalSource } from "@/lib/legal";
import { SHIPYARD } from "@/lib/shipyard";
import { shipyardSource } from "@/lib/shipyard-docs";
import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/pricing` },
    { url: `${SITE_URL}${SHIPYARD.path}` },
    ...shipyardSource.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
    ...source.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
    { url: `${SITE_URL}/legal` },
    ...legalSource.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
  ];
}
