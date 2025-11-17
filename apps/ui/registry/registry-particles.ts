import { type Registry } from "shadcn/schema"

import type { RegistryCategory } from "./registry-categories"

// Type helper to enforce RegistryCategory[] for categories field
type ParticleItem = Omit<Registry["items"][number], "categories"> & {
  categories?: RegistryCategory[]
}

// Helper function to ensure categories are valid RegistryCategory values
function categories<T extends RegistryCategory[]>(...categories: T): T {
  return categories
}

export const particles: ParticleItem[] = [
  {
    name: "particle-bu-1",
    description: "Back link button with chevron",
    files: [{ path: "particles/particle-bu-1.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    categories: ["button"],
    description: "Card-style button with heading and description",
    files: [
      {
        path: "particles/particle-bu-2.tsx",
        type: "registry:block",
      },
    ],
    categories: categories("button"),
  },
  {
    categories: ["button"],
    description: "Directional pad control buttons",
    files: [{ path: "particles/particle-bu-3.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    categories: ["button"],
    description: "Outline like button with count",
    files: [
      {
        path: "particles/particle-bu-4.tsx",
        type: "registry:block",
      },
    ],
    categories: categories("button"),
  },
  {
    categories: ["button"],
    dependencies: ["@remixicon/react"],
    description: "Social login icon buttons",
    files: [
      {
        path: "particles/particle-bu-5.tsx",
        type: "registry:block",
      },
    ],
    categories: categories("button"),
  },
  {
    categories: ["button"],
    description: "Expandable show more/less toggle button",
    files: [{ path: "particles/particle-bu-6.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    categories: ["button"],
    description: "Star button with count badge",
    files: [{ path: "particles/particle-bu-7.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    categories: ["frame", "collapsible"],
    description: "Frame with collapsible content and delete button",
    files: [{ path: "particles/particle-fr-1.tsx", type: "registry:block" }],
    name: "particle-fr-1",
    registryDependencies: ["@coss/frame", "@coss/collapsible", "@coss/button"],
    files: [{ path: "particles/particle-fr-1.tsx", type: "registry:block" }],
    categories: categories("frame", "collapsible"),
    meta: {
      className: "**:data-[slot=particle-wrapper]:w-full",
    },
  },
  {
    categories: ["input", "input group", "button", "popover"],
    description: "Input with start text and end tooltip",
    files: [{ path: "particles/particle-in-1.tsx", type: "registry:block" }],
    name: "particle-in-1",
    registryDependencies: [
      "@coss/button",
      "@coss/input-group",
      "@coss/popover",
    ],
    files: [{ path: "particles/particle-in-1.tsx", type: "registry:block" }],
    categories: categories("input", "input group", "button", "popover"),
    meta: {
      className:
        "**:data-[slot=particle-wrapper]:w-full **:data-[slot=particle-wrapper]:max-w-64",
    },
  },
  {
    categories: ["input", "input group", "button", "tooltip"],
    description: "Password input with toggle visibility",
    files: [{ path: "particles/particle-in-2.tsx", type: "registry:block" }],
    name: "particle-in-2",
    registryDependencies: [
      "@coss/button",
      "@coss/input-group",
      "@coss/tooltip",
    ],
    files: [{ path: "particles/particle-in-2.tsx", type: "registry:block" }],
    categories: categories("input", "input group", "button", "tooltip"),
    meta: {
      className:
        "**:data-[slot=particle-wrapper]:w-full **:data-[slot=particle-wrapper]:max-w-64",
    },
  },
  {
    categories: ["input", "input group", "button", "popover"],
    description: "Input group mimicking a URL bar",
    files: [{ path: "particles/particle-in-3.tsx", type: "registry:block" }],
    name: "particle-in-3",
    registryDependencies: [
      "@coss/button",
      "@coss/input-group",
      "@coss/popover",
    ],
    files: [{ path: "particles/particle-in-3.tsx", type: "registry:block" }],
    categories: categories("input", "input group", "button", "popover"),
    meta: {
      className:
        "**:data-[slot=particle-wrapper]:w-full **:data-[slot=particle-wrapper]:max-w-64",
    },
  },
  {
    categories: ["input", "input group", "kbd", "search"],
    description: "Input group with keyboard shortcut",
    files: [{ path: "particles/particle-in-4.tsx", type: "registry:block" }],
    categories: categories("input", "input group", "kbd", "search"),
    meta: {
      className:
        "**:data-[slot=particle-wrapper]:w-full **:data-[slot=particle-wrapper]:max-w-64",
    },
  },
  {
    categories: ["input", "input group", "loading", "spinner"],
    description: "Input group with start loading spinner",
    files: [{ path: "particles/particle-in-5.tsx", type: "registry:block" }],
    categories: categories("input", "input group", "loading", "spinner"),
    meta: {
      className:
        "**:data-[slot=particle-wrapper]:w-full **:data-[slot=particle-wrapper]:max-w-64",
    },
  },
  {
    categories: ["pagination"],
    description: "Pagination with previous and next buttons only",
    files: [{ path: "particles/particle-pa-1.tsx", type: "registry:block" }],
    categories: categories("pagination"),
    meta: {
      className: "**:data-[slot=particle-wrapper]:w-full",
    },
  },
  {
    categories: ["pagination", "select"],
    description: "Pagination with select, and previous and next buttons",
    files: [{ path: "particles/particle-pa-2.tsx", type: "registry:block" }],
    categories: categories("pagination", "select"),
    meta: {
      className: "**:data-[slot=particle-wrapper]:w-full",
    },
  },
];
