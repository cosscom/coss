import type { MetadataRoute } from "next"

import { categories } from "@/config/components"

export default function sitemap(): MetadataRoute.Sitemap {
  const home = {
    url: "https://coss.com/origin",
  }
  const search = {
    url: "https://coss.com/origin/search",
  }
  const easings = {
    url: "https://coss.com/origin/easings",
  }
  const categoryPages = categories.map((category) => ({
    url: `https://coss.com/origin/${category.slug}`,
  }))

  return [home, ...categoryPages, search, easings]
}
