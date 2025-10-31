import { type Registry } from "shadcn/schema"

export const hooks: Registry["items"] = [
  {
    name: "use-mobile",
    type: "registry:hook",
    files: [
      {
        path: "hooks/use-mobile.tsx",
        type: "registry:hook",
      },
    ],
  },
  {
    name: "use-copy-to-clipboard",
    type: "registry:hook",
    files: [
      {
        path: "hooks/use-copy-to-clipboard.tsx",
        type: "registry:hook",
      },
    ],
  },
]
