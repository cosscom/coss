import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: "/private/",
      userAgent: "*",
    },
    sitemap: [
      "https://coss.com/sitemap.xml",
      "https://coss.com/origin/sitemap.xml",
      "https://coss.com/ui/sitemap.xml",
    ],
  };
}
