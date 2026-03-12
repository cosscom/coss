import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();

  return [
    { url: "https://coss.com/ui" },
    { url: "https://coss.com/ui/particles" },
    ...pages.map((page) => ({
      url: `https://coss.com/ui${page.url}`,
    })),
  ];
}
