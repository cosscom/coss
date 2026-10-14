/**
 * The registry catalog — which items exist and which source files each
 * ships. `apps/site/scripts/build-calendar-registry.mjs` imports this (Node's native type
 * stripping), inlines the file contents, and writes
 * `src/lib/calendar/registry/generated.json`; the `/calendar/r/[name]` route serves that.
 *
 * The npm package `kloq` is the compiled build. The registry serves the
 * source: the `kloq` item IS the calendar — the whole library source,
 * copied into the consumer's repo — and the add-on items build on it.
 *
 * Items with `sourceRoot` have their source file list computed by the build
 * script (everything under the root except tests and benches), targeted to
 * `components/kloq/…` preserving structure. Explicit `files` are appended,
 * and their imports are rewritten from the workspace's `"kloq"` specifiers
 * to the copied-source paths — see IMPORT_REWRITES in the script.
 */

export interface RegistryItemDef {
  name: string;
  title: string;
  description: string;
  type: "registry:block" | "registry:component";
  /** npm deps the shadcn CLI should install alongside the files */
  dependencies: string[];
  /** other registry items (full URLs) the CLI must install first */
  registryDependencies?: string[];
  /** copy an entire tree (relative to the monorepo root) */
  sourceRoot?: string;
  files?: {
    /** path relative to the monorepo root */
    path: string;
    /** where the CLI drops it in the consumer's project */
    target: string;
  }[];
}

/** The registry dependency every add-on block declares on the core. */
export const CORE_ITEM_URL = "https://coss.com/calendar/r/kloq.json";

export const REGISTRY_ITEMS: RegistryItemDef[] = [
  {
    name: "kloq",
    title: "kloq",
    description:
      "The calendar itself — the full MIT-licensed source (drag engine, views, themes, ⌘K, design mode) copied into your repo.",
    type: "registry:component",
    dependencies: [
      "@base-ui/react",
      "class-variance-authority",
      "clsx",
      "lucide-react",
      "tailwind-merge",
    ],
    sourceRoot: "packages/kloq/src",
    files: [
      {
        path: "packages/kloq/LICENSE",
        target: "components/kloq/LICENSE",
      },
    ],
  },
  {
    name: "calendar",
    title: "Calendar starter",
    description:
      "A full-page coss calendar calendar with the stock toolbar — the quick start as a drop-in block.",
    type: "registry:block",
    dependencies: [],
    registryDependencies: [CORE_ITEM_URL],
    files: [
      {
        path: "apps/site/src/lib/calendar/registry/calendar/calendar.tsx",
        target: "components/kloq-blocks/calendar.tsx",
      },
    ],
  },
  {
    name: "timeline",
    title: "Resource timeline",
    description:
      "Rooms, staff or machines as rows along a horizontal time axis — drag to book, drag across rows to reassign.",
    type: "registry:block",
    dependencies: [],
    registryDependencies: [CORE_ITEM_URL],
    files: [
      {
        path: "apps/site/src/lib/calendar/registry/timeline/timeline.tsx",
        target: "components/kloq-blocks/timeline.tsx",
      },
    ],
  },
  {
    name: "utc-gutter",
    title: "UTC gutter",
    description:
      "A two-column time axis (UTC + local) for the TimeGutter slot — the slot contract in its simplest useful form.",
    type: "registry:component",
    dependencies: [],
    registryDependencies: [CORE_ITEM_URL],
    files: [
      {
        path: "apps/site/src/lib/calendar/registry/utc-gutter/utc-gutter.tsx",
        target: "components/kloq-blocks/utc-gutter.tsx",
      },
    ],
  },
  {
    name: "zone-gutter",
    title: "Zone gutter",
    description:
      "A time axis with extra columns for any IANA zones, DST-correct against the represented day.",
    type: "registry:component",
    dependencies: [],
    registryDependencies: [CORE_ITEM_URL],
    files: [
      {
        path: "apps/site/src/lib/calendar/registry/zone-gutter/zone-gutter.tsx",
        target: "components/kloq-blocks/zone-gutter.tsx",
      },
    ],
  },
];
