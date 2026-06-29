import type { MetadataRoute } from "next";
import { getAtomTypes } from "@/lib/atoms";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();

  return [
    { url: "https://coss.com/ui" },
    { url: "https://coss.com/ui/particles" },
    { url: "https://coss.com/ui/atoms" },
    ...getAtomTypes().map((atom) => ({
      url: `https://coss.com/ui/atoms/${atom.slug}`,
    })),
    ...pages.map((page) => ({
      url: `https://coss.com/ui${page.url}`,
    })),
  ];
}
