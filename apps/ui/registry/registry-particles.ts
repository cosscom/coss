import { type Registry } from "shadcn/schema"

import type { RegistryCategory } from "./registry-categories"

// Type helper to enforce RegistryCategory[] for categories field
type ParticleItem = Omit<Registry["items"][number], "categories"> & {
  categories?: readonly RegistryCategory[]
}

// Helper function to ensure categories are valid RegistryCategory values
function categories<T extends readonly RegistryCategory[]>(
  ...categories: T
): T {
  return categories
}

export const particles: ParticleItem[] = [
  {
    name: "particle-bu-1",
    description: "Back link button with chevron",
    type: "registry:block",
    registryDependencies: ["@coss/button"],
    files: [{ path: "particles/particle-bu-1.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    name: "particle-bu-2",
    description: "Card-style button with heading and description",
    type: "registry:block",
    registryDependencies: ["@coss/button"],
    files: [
      {
        path: "particles/particle-bu-2.tsx",
        type: "registry:block",
      },
    ],
    categories: categories("button"),
  },
  {
    name: "particle-bu-3",
    description: "Directional pad control buttons",
    type: "registry:block",
    registryDependencies: ["@coss/button"],
    files: [{ path: "particles/particle-bu-3.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    name: "particle-bu-4",
    description: "Outline like button with count",
    type: "registry:block",
    registryDependencies: ["@coss/button"],
    files: [
      {
        path: "particles/particle-bu-4.tsx",
        type: "registry:block",
      },
    ],
    categories: categories("button"),
  },
  {
    name: "particle-bu-5",
    description: "Social login icon buttons",
    type: "registry:block",
    registryDependencies: ["@coss/button"],
    dependencies: ["@remixicon/react"],
    files: [
      {
        path: "particles/particle-bu-5.tsx",
        type: "registry:block",
      },
    ],
    categories: categories("button"),
  },
  {
    name: "particle-bu-6",
    description: "Expandable show more/less toggle button",
    type: "registry:block",
    registryDependencies: ["@coss/button"],
    files: [{ path: "particles/particle-bu-6.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    name: "particle-bu-7",
    description: "Star button with count badge",
    type: "registry:block",
    registryDependencies: ["@coss/button"],
    files: [{ path: "particles/particle-bu-7.tsx", type: "registry:block" }],
    categories: categories("button"),
  },
  {
    name: "particle-fr-1",
    description: "Frame with collapsible content and delete button",
    type: "registry:block",
    registryDependencies: ["@coss/frame", "@coss/collapsible", "@coss/button"],
    files: [{ path: "particles/particle-fr-1.tsx", type: "registry:block" }],
    categories: categories("frame", "collapsible"),
    meta: {
      className: "**:data-[slot=particle-wrapper]:w-full",
    },
  },
  {
    name: "particle-in-1",
    description: "Input with start text and end tooltip",
    type: "registry:block",
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
    name: "particle-in-2",
    description: "Password input with toggle visibility",
    type: "registry:block",
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
    name: "particle-in-3",
    description: "Input group mimicking a URL bar",
    type: "registry:block",
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
    name: "particle-in-4",
    description: "Input group with keyboard shortcut",
    type: "registry:block",
    registryDependencies: ["@coss/input-group", "@coss/kbd"],
    files: [{ path: "particles/particle-in-4.tsx", type: "registry:block" }],
    categories: categories("input", "input group", "kbd", "search"),
    meta: {
      className:
        "**:data-[slot=particle-wrapper]:w-full **:data-[slot=particle-wrapper]:max-w-64",
    },
  },
  {
    name: "particle-in-5",
    description: "Input group with start loading spinner",
    type: "registry:block",
    registryDependencies: ["@coss/input-group", "@coss/spinner"],
    files: [{ path: "particles/particle-in-5.tsx", type: "registry:block" }],
    categories: categories("input", "input group", "loading", "spinner"),
    meta: {
      className:
        "**:data-[slot=particle-wrapper]:w-full **:data-[slot=particle-wrapper]:max-w-64",
    },
  },
  {
    name: "particle-pa-1",
    description: "Pagination with previous and next buttons only",
    type: "registry:block",
    registryDependencies: ["@coss/pagination"],
    files: [{ path: "particles/particle-pa-1.tsx", type: "registry:block" }],
    categories: categories("pagination"),
    meta: {
      className: "**:data-[slot=particle-wrapper]:w-full",
    },
  },
  {
    name: "particle-pa-2",
    description: "Pagination with select, and previous and next buttons",
    type: "registry:block",
    registryDependencies: ["@coss/pagination", "@coss/select"],
    files: [{ path: "particles/particle-pa-2.tsx", type: "registry:block" }],
    categories: categories("pagination", "select"),
    meta: {
      className: "**:data-[slot=particle-wrapper]:w-full",
    },
  },
]
