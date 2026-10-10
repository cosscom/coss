import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The site owns coss.com's root files (ZONE_ROUTES in @coss/auth/slugs). Dashboard pages need a
// session, so crawlers only ever see their sign-in redirect.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
