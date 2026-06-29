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
        path: "atoms/lib/booker/actions.ts",
        target: "lib/booker/actions.ts",
        type: "registry:lib",
      },
    ],
    registryDependencies: ["@coss/cal-api"],
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
