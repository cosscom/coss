import { type Registry } from "shadcn/schema"

export const particles: Registry["items"] = [
  {
    name: "comp-bu-1",
    description: "Back link button with chevron",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/button.json"],
    dependencies: ["lucide-react"],
    files: [{ path: "particles/comp-bu-1.tsx", type: "registry:block" }],
    categories: ["button"],
  },
  {
    name: "comp-bu-2",
    description: "Card-style button with heading and description",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/button.json"],
    dependencies: ["lucide-react"],
    files: [
      {
        path: "particles/comp-bu-2.tsx",
        type: "registry:block",
      },
    ],
    categories: ["button"],
  },
  {
    name: "comp-bu-3",
    description: "Directional pad control buttons",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/button.json"],
    dependencies: ["lucide-react"],
    files: [{ path: "particles/comp-bu-3.tsx", type: "registry:block" }],
    categories: ["button"],
  },
  {
    name: "comp-bu-4",
    description: "Outline like button with count",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/button.json"],
    dependencies: ["lucide-react"],
    files: [
      {
        path: "particles/comp-bu-4.tsx",
        type: "registry:block",
      },
    ],
    categories: ["button"],
  },
  {
    name: "comp-bu-5",
    description: "Social login icon buttons",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/button.json"],
    dependencies: ["@remixicon/react"],
    files: [
      {
        path: "particles/comp-bu-5.tsx",
        type: "registry:block",
      },
    ],
    categories: ["button"],
  },
  {
    name: "comp-bu-6",
    description: "Expandable show more/less toggle button",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/button.json"],
    dependencies: ["lucide-react"],
    files: [{ path: "particles/comp-bu-6.tsx", type: "registry:block" }],
    categories: ["button"],
  },
  {
    name: "comp-bu-7",
    description: "Star button with count badge",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/button.json"],
    dependencies: ["lucide-react"],
    files: [{ path: "particles/comp-bu-7.tsx", type: "registry:block" }],
    categories: ["button"],
  },
  {
    name: "comp-fr-1",
    description: "Frame with collapsible content and delete button",
    type: "registry:example",
    registryDependencies: [
      "https://coss.com/ui/r/frame.json",
      "https://coss.com/ui/r/collapsible.json",
      "https://coss.com/ui/r/button.json",
    ],
    dependencies: ["lucide-react"],
    files: [{ path: "particles/comp-fr-1.tsx", type: "registry:block" }],
    categories: ["frame", "collapsible"],
  },
  {
    name: "comp-pa-1",
    description: "Pagination with previous and next buttons only",
    type: "registry:block",
    registryDependencies: ["https://coss.com/ui/r/pagination.json"],
    files: [{ path: "particles/comp-pa-1.tsx", type: "registry:block" }],
    categories: ["pagination"],
  },
  {
    name: "comp-pa-2",
    description: "Pagination with select, and previous and next buttons",
    type: "registry:block",
    registryDependencies: [
      "https://coss.com/ui/r/pagination.json",
      "https://coss.com/ui/r/select.json",
    ],
    files: [{ path: "particles/comp-pa-2.tsx", type: "registry:block" }],
    categories: ["pagination", "select"],
  },
]
