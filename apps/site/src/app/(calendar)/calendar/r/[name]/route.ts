/** The Calendar UI's public shadcn registry: `/calendar/r/{name}.json` (coss.com/calendar's `/r/`). */

import registry from "@/lib/calendar/registry/generated.json";
import { CORE_ITEM_URL, REGISTRY_ITEMS } from "@/lib/calendar/registry/manifest";
import { abs } from "@/lib/calendar/site";

type RegistryItem = (typeof registry.items)[number];

/** Registry dependencies use the deployed host and path, not the host used when the JSON was generated. */
function currentItem<T extends { name: string }>(item: T): T {
  const dependencies = REGISTRY_ITEMS.find(
    (entry) => entry.name === item.name,
  )?.registryDependencies;
  return dependencies
    ? {
        ...item,
        registryDependencies: dependencies.map((url) =>
          url === CORE_ITEM_URL ? abs("/calendar/r/kloq.json") : url,
        ),
      }
    : item;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "public, max-age=300" } });
}

export function generateStaticParams() {
  return ["registry", ...registry.items.map((item) => item.name)].map((name) => ({
    name: `${name}.json`,
  }));
}

// Every item is prerendered; anything else is a 404.
export const dynamicParams = false;

export async function GET(_request: Request, { params }: RouteContext<"/calendar/r/[name]">) {
  const { name } = await params;
  if (!name.endsWith(".json")) return json({ error: "Not found" }, 404);
  const slug = name.slice(0, -".json".length);

  if (slug === "registry") {
    const items = registry.items.map(({ files, ...item }) => ({
      ...currentItem(item),
      files: files.map((file) => ({ path: file.path, target: file.target, type: file.type })),
    }));
    return json({ name: "kloq", homepage: abs("/calendar"), items });
  }

  const item: RegistryItem | undefined = registry.items.find((i) => i.name === slug);
  if (!item) return json({ error: `Unknown registry item "${slug}"` }, 404);
  return json(currentItem(item));
}
