import type { Registry } from "shadcn/schema";

type AtomMeta = {
  slug: string;
  displayName: string;
  className?: string;
  preview?: {
    username: string;
    eventSlug: string;
  };
};

type AtomItem = Omit<Registry["items"][number], "meta"> & {
  meta?: AtomMeta & Record<string, unknown>;
};

export const atoms: AtomItem[] = [
  {
    description: "A full scheduling flow powered by Cal.com API v2.",
    files: [
      {
        path: "atoms/booker-1.tsx",
        target: "components/atoms/booker-1.tsx",
        type: "registry:block",
      },
      {
        path: "atoms/booker/booker-header-placeholder.webp",
        target: "components/atoms/booker/booker-header-placeholder.webp",
        type: "registry:file",
      },
      {
        path: "atoms/booker/booker-calendar.tsx",
        target: "components/atoms/booker/booker-calendar.tsx",
        type: "registry:component",
      },
      {
        path: "atoms/booker/location.tsx",
        target: "components/atoms/booker/location.tsx",
        type: "registry:component",
      },
      {
        path: "atoms/booker/timezone-picker.tsx",
        target: "components/atoms/booker/timezone-picker.tsx",
        type: "registry:component",
      },
      {
        path: "atoms/lib/booker/actions.ts",
        target: "lib/booker/actions.ts",
        type: "registry:lib",
      },
      {
        path: "atoms/lib/booker/use-booker.ts",
        target: "lib/booker/use-booker.ts",
        type: "registry:lib",
      },
      {
        path: "atoms/lib/booker/utils.ts",
        target: "lib/booker/utils.ts",
        type: "registry:lib",
      },
    ],
    registryDependencies: [
      "@coss/avatar",
      "@coss/button",
      "@coss/cal-api",
      "@coss/card",
      "@coss/combobox",
      "@coss/empty",
      "@coss/label",
      "@coss/scroll-area",
      "@coss/skeleton",
      "@coss/switch",
      "@coss/tooltip",
    ],
    meta: {
      className: "**:data-[slot=preview]:w-full",
      displayName: "Booker",
      preview: {
        eventSlug: "15min",
        username: "rickastley",
      },
      slug: "booker",
    },
    name: "booker-1",
    type: "registry:block",
  },
];
