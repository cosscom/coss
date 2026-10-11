import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    ...source.getPages().map((page) => ({ url: `${SITE_URL}${page.url}` })),
  ];
}
