import componentSlugs from "@/content/docs/components/meta.json";

export interface ComponentCategory {
  slug: string;
  name: string;
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const categories: ComponentCategory[] = (
  componentSlugs.pages as string[]
).map((slug) => ({
  name: slugToName(slug),
  slug,
}));

export function getCategory(slug: string): ComponentCategory | undefined {
  return categories.find((category) => category.slug === slug);
}
