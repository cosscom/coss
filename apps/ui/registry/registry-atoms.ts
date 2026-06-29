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
        path: "atoms/lib/booker/calendar.tsx",
        target: "lib/booker/calendar.tsx",
        type: "registry:lib",
      },
      {
        path: "atoms/lib/booker/location.tsx",
        target: "lib/booker/location.tsx",
        type: "registry:lib",
      },
      {
        path: "atoms/lib/booker/timezone-picker.tsx",
        target: "lib/booker/timezone-picker.tsx",
        type: "registry:lib",
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
