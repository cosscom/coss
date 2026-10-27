export type Category = { key: string; label: string; types: string[] };

/** Groups event types by the part before their first dot (`email.sent` → `email`), in list order. */
export function groupEventTypes(
  types: readonly string[],
  labels: Readonly<Record<string, string>> = {},
): Category[] {
  const categories = new Map<string, Category>();
  for (const type of types) {
    const dot = type.indexOf(".");
    const key = dot > 0 ? type.slice(0, dot) : "";
    let category = categories.get(key);
    if (!category) {
      category = { key, label: labels[key] ?? (key || "Other"), types: [] };
      categories.set(key, category);
    }
    category.types.push(type);
  }
  return [...categories.values()];
}

/** Types whose name or category matches the query (case-insensitive substring). */
export function filterCategories(categories: Category[], query: string): Category[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return categories;
  return categories.flatMap((category) => {
    if (category.label.toLowerCase().includes(needle)) return [category];
    const types = category.types.filter((type) => type.toLowerCase().includes(needle));
    return types.length > 0 ? [{ ...category, types }] : [];
  });
}
