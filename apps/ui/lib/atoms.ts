import { atoms } from "@/registry/registry-atoms";

export type AtomType = {
  slug: string;
  displayName: string;
  description?: string;
  variants: string[];
};

export function getAtomTypes(): AtomType[] {
  const bySlug = new Map<string, AtomType>();

  for (const atom of atoms) {
    const slug = atom.meta?.slug as string | undefined;
    const displayName = atom.meta?.displayName as string | undefined;

    if (!slug || !displayName) {
      continue;
    }

    const existing = bySlug.get(slug);

    if (existing) {
      existing.variants.push(atom.name);
      continue;
    }

    bySlug.set(slug, {
      description: atom.description,
      displayName,
      slug,
      variants: [atom.name],
    });
  }

  return Array.from(bySlug.values());
}

export function getAtomType(slug: string): AtomType | undefined {
  return getAtomTypes().find((atom) => atom.slug === slug);
}

export function getAtomRegistryItem(name: string) {
  return atoms.find((atom) => atom.name === name);
}
